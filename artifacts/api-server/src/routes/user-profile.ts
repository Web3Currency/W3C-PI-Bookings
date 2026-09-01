import { Router, type IRouter } from "express";

const router: IRouter = Router();
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const config = getConfig();
  if (!config) throw new Error("Supabase server configuration is missing.");
  const headers = new Headers(init.headers);
  headers.set("apikey", config.key);
  headers.set("Authorization", `Bearer ${config.key}`);
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");
  return fetch(`${config.url}${path}`, { ...init, headers });
}

async function verifyPiToken(accessToken: string) {
  const response = await fetch("https://api.minepi.com/v2/me", {
    headers: { Authorization: `Bearer ${accessToken.trim()}` },
  });
  if (!response.ok) return null;
  const user = await response.json() as { uid?: string; username?: string };
  return user.uid ? user : null;
}

async function getProfile(uid: string) {
  const response = await supabaseRequest(`/rest/v1/user_profiles?pi_uid=eq.${encodeURIComponent(uid)}&select=pi_uid,username,photo_url&limit=1`);
  if (!response.ok) throw new Error(`Profile lookup failed (${response.status}).`);
  const rows = await response.json() as Array<{ pi_uid: string; username: string; photo_url?: string | null }>;
  return rows[0] || null;
}

router.get("/pi/user-profile", async (req, res) => {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return void res.status(401).json({ error: "Pi access token is required." });
  try {
    const piUser = await verifyPiToken(token);
    if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const profile = await getProfile(piUser.uid);
    return void res.json(profile || { piUid: piUser.uid, username: piUser.username, photoUrl: null });
  } catch (err: any) {
    req.log.error({ err }, "Global profile lookup failed");
    return void res.status(500).json({ error: err?.message || "Unable to load profile." });
  }
});

router.put("/pi/user-profile", async (req, res) => {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return void res.status(401).json({ error: "Pi access token is required." });
  const requestedUsername = String(req.body?.username || "").trim().replace(/^@+/, "");
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(requestedUsername)) return void res.status(400).json({ error: "Username must be 3-32 characters and use only letters, numbers, dots, underscores, or hyphens." });
  try {
    const piUser = await verifyPiToken(token);
    if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const existing = await getProfile(piUser.uid);
    const duplicate = await supabaseRequest(`/rest/v1/user_profiles?username=ilike.${encodeURIComponent(requestedUsername)}&pi_uid=neq.${encodeURIComponent(piUser.uid)}&select=pi_uid&limit=1`);
    if (!duplicate.ok) throw new Error(`Username availability check failed (${duplicate.status}).`);
    if ((await duplicate.json() as unknown[]).length) return void res.status(409).json({ error: "That username is already in use. Choose another one." });
    const payload = { pi_uid: piUser.uid, username: requestedUsername, photo_url: req.body?.photoUrl ?? existing?.photo_url ?? null, updated_at: new Date().toISOString() };
    const response = await supabaseRequest("/rest/v1/user_profiles?on_conflict=pi_uid", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.text().catch(() => "")) || `Profile update failed (${response.status}).`);
    const rows = await response.json() as Array<{ pi_uid: string; username: string; photo_url?: string | null }>;
    return void res.json({ piUid: rows[0]?.pi_uid || piUser.uid, username: rows[0]?.username || requestedUsername, photoUrl: rows[0]?.photo_url ?? null });
  } catch (err: any) {
    req.log.error({ err }, "Global profile update failed");
    return void res.status(500).json({ error: err?.message || "Unable to update profile." });
  }
});

router.post("/pi/user-profile/photo", async (req, res) => {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return void res.status(401).json({ error: "Pi access token is required." });
  const { data, contentType } = req.body || {};
  if (typeof data !== "string" || !data) return void res.status(400).json({ error: "Profile image data is required." });
  if (!ALLOWED_TYPES.has(String(contentType))) return void res.status(400).json({ error: "Use a JPG, PNG, or WebP image." });
  try {
    const piUser = await verifyPiToken(token);
    if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const base64 = data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length || buffer.length > MAX_PHOTO_BYTES) return void res.status(400).json({ error: "Profile picture must be 2 MB or smaller." });
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const path = `users/${piUser.uid}/profile.${extension}`;
    const upload = await supabaseRequest(`/storage/v1/object/w3c-assets/${path}`, { method: "POST", headers: { "Content-Type": String(contentType), "x-upsert": "true" }, body: buffer });
    if (!upload.ok) throw new Error((await upload.text().catch(() => "")) || `Image upload failed (${upload.status}).`);
    const config = getConfig()!;
    const publicUrl = `${config.url}/storage/v1/object/public/w3c-assets/${path}`;
    const update = await supabaseRequest(`/rest/v1/user_profiles?pi_uid=eq.${encodeURIComponent(piUser.uid)}`, { method: "PATCH", body: JSON.stringify({ photo_url: publicUrl, updated_at: new Date().toISOString() }) });
    if (!update.ok) throw new Error((await update.text().catch(() => "")) || `Profile photo record update failed (${update.status}).`);
    return void res.json({ photoUrl: publicUrl });
  } catch (err: any) {
    req.log.error({ err }, "Global profile photo upload failed");
    return void res.status(500).json({ error: err?.message || "Unable to upload profile picture." });
  }
});

export default router;
