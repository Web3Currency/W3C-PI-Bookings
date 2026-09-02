import { Router, type IRouter } from "express";

const router: IRouter = Router();

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
  return fetch(`${config.url}/rest/v1/${path}`, { ...init, headers });
}

async function verifyPiToken(accessToken: string) {
  const response = await fetch("https://api.minepi.com/v2/me", { headers: { Authorization: `Bearer ${accessToken.trim()}` } });
  if (!response.ok) return null;
  const user = await response.json() as { uid?: string; username?: string };
  return user.uid ? user : null;
}

async function getProviderByPiUid(piUid: string) {
  const response = await supabaseRequest(`providers?select=id,pi_uid,status&pi_uid=eq.${encodeURIComponent(piUid)}&limit=1`);
  if (!response.ok) throw new Error(`Provider lookup failed (${response.status}).`);
  const rows = await response.json() as any[];
  return rows[0] || null;
}

function categoryIdsFromBody(body: any): string[] {
  const raw = Array.isArray(body?.categoryIds) ? body.categoryIds : [];
  return Array.from(new Set(raw.map((value: unknown) => String(value).trim()).filter(Boolean)));
}

router.get("/pi/categories", async (_req, res) => {
  try {
    const response = await supabaseRequest("service_categories?select=id,name,slug,description,icon,display_order,is_featured,is_active&is_active=eq.true&order=display_order.asc");
    if (!response.ok) throw new Error((await response.text().catch(() => "")) || `Category lookup failed (${response.status}).`);
    return void res.json({ categories: await response.json() });
  } catch (error: any) {
    return void res.status(500).json({ error: error?.message || "Unable to load categories." });
  }
});

router.get("/pi/provider-categories", async (req, res) => {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return void res.status(401).json({ error: "Pi access token is required." });
  try {
    const piUser = await verifyPiToken(token);
    if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const provider = await getProviderByPiUid(piUser.uid);
    if (!provider) return void res.status(404).json({ error: "No provider profile is linked to this Pi account." });
    const response = await supabaseRequest(`provider_categories?select=category_id&provider_id=eq.${encodeURIComponent(provider.id)}&order=created_at.asc`);
    if (!response.ok) throw new Error((await response.text().catch(() => "")) || `Provider categories lookup failed (${response.status}).`);
    const rows = await response.json() as Array<{ category_id: string }>;
    return void res.json({ categoryIds: rows.map((row) => row.category_id) });
  } catch (error: any) {
    req.log.error({ err: error }, "Provider categories lookup failed");
    return void res.status(500).json({ error: error?.message || "Unable to load provider categories." });
  }
});

router.put("/pi/provider-categories", async (req, res) => {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return void res.status(401).json({ error: "Pi access token is required." });
  try {
    const piUser = await verifyPiToken(token);
    if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." });
    const provider = await getProviderByPiUid(piUser.uid);
    if (!provider) return void res.status(404).json({ error: "No provider profile is linked to this Pi account." });
    const categoryIds = categoryIdsFromBody(req.body);
    if (categoryIds.length < 1) return void res.status(400).json({ error: "Select at least one marketplace category." });
    if (categoryIds.length > 8) return void res.status(400).json({ error: "Select no more than 8 marketplace categories." });
    const categoriesResponse = await supabaseRequest(`service_categories?select=id&is_active=eq.true&id=in.(${categoryIds.map(encodeURIComponent).join(",")})`);
    if (!categoriesResponse.ok) throw new Error((await categoriesResponse.text().catch(() => "")) || `Category validation failed (${categoriesResponse.status}).`);
    const validRows = await categoriesResponse.json() as Array<{ id: string }>;
    const validIds = new Set(validRows.map((row) => row.id));
    if (validIds.size !== categoryIds.length) return void res.status(400).json({ error: "One or more selected categories are invalid or inactive." });

    const deleted = await supabaseRequest(`provider_categories?provider_id=eq.${encodeURIComponent(provider.id)}`, { method: "DELETE" });
    if (!deleted.ok) throw new Error((await deleted.text().catch(() => "")) || `Existing category links could not be replaced (${deleted.status}).`);
    const insert = await supabaseRequest("provider_categories", {
      method: "POST",
      body: JSON.stringify(categoryIds.map((categoryId) => ({ provider_id: provider.id, category_id: categoryId }))),
    });
    if (!insert.ok) throw new Error((await insert.text().catch(() => "")) || `Provider category save failed (${insert.status}).`);
    return void res.json({ categoryIds });
  } catch (error: any) {
    req.log.error({ err: error }, "Provider categories update failed");
    return void res.status(400).json({ error: error?.message || "Unable to save provider categories." });
  }
});

export default router;
