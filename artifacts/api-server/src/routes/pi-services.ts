import { Router, type IRouter } from "express";

const router: IRouter = Router();

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const config = getSupabaseConfig();
  if (!config) return null;
  const headers = new Headers(init.headers);
  headers.set("apikey", config.key);
  headers.set("Content-Type", "application/json");
  headers.set("Prefer", headers.get("Prefer") || "return=representation");
  if (config.key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${config.key}`);
  return fetch(`${config.url}/rest/v1/${path}`, { ...init, headers });
}

async function verifyPiAccessToken(accessToken: string) {
  const response = await fetch("https://api.minepi.com/v2/me", {
    headers: { Authorization: `Bearer ${accessToken.trim()}` },
  });
  if (!response.ok) return null;
  const user = await response.json() as { uid?: string; username?: string };
  return user.uid ? user : null;
}

async function getProviderByPiUid(piUid: string) {
  const response = await supabaseRequest(
    `providers?select=id,pi_uid,full_name,role_title,status&pi_uid=eq.${encodeURIComponent(piUid)}&limit=1`,
  );
  if (!response) return null;
  if (!response.ok) throw new Error(`Supabase provider lookup failed (${response.status}).`);
  const rows = await response.json() as Array<{
    id: string;
    pi_uid: string;
    full_name: string;
    role_title: string | null;
    status: string;
  }>;
  return rows[0] || null;
}

async function getExchangeRate() {
  const response = await supabaseRequest("settings?select=exchange_rate_ngn&id=eq.global_settings&limit=1");
  if (!response?.ok) return 3500;
  const rows = await response.json() as Array<{ exchange_rate_ngn?: number }>;
  return Number(rows[0]?.exchange_rate_ngn) || 3500;
}

function validateServiceInput(body: Record<string, any>) {
  const title = String(body.title || "").trim();
  const shortDescription = String(body.shortDescription || "").trim();
  const fullDescription = String(body.fullDescription || "").trim();
  const coverImage = String(body.coverImage || "").trim();
  const category = String(body.category || "").trim() || "web_dev";
  const locationType = String(body.locationType || "").trim() || "Online / Remote";
  const status = body.status === "Draft" || body.status === "Archived" ? body.status : "Published";
  const deliverables = Array.isArray(body.deliverables)
    ? body.deliverables.map((item: unknown) => String(item).trim()).filter(Boolean)
    : [];
  const duration = Number(body.duration);
  const basePriceNgn = Number(body.basePriceNgn);

  if (!title) throw new Error("Service title is required.");
  if (!shortDescription) throw new Error("Short description is required.");
  if (!duration || duration <= 0) throw new Error("Duration must be greater than 0 minutes.");
  if (!basePriceNgn || basePriceNgn <= 0) throw new Error("Base price must be greater than 0.");

  return {
    title,
    shortDescription,
    fullDescription,
    coverImage,
    deliverables,
    duration: Math.round(duration),
    basePriceNgn,
    category,
    locationType,
    status,
  };
}

router.get("/api/pi/services", async (req, res) => {
  const accessToken = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return void res.status(401).json({ error: "Pi access token is required." });

  try {
    const piUser = await verifyPiAccessToken(accessToken);
    if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." });

    const provider = await getProviderByPiUid(piUser.uid);
    if (!provider) return void res.status(403).json({ error: "No provider profile is linked to this Pi account." });

    const response = await supabaseRequest(
      `services?select=*,providers(*)&provider_id=eq.${encodeURIComponent(provider.id)}&order=created_at.desc`,
    );
    if (!response) return void res.status(500).json({ error: "Supabase connection is not configured on the API server." });
    if (!response.ok) throw new Error((await response.text().catch(() => "")) || `Failed to load provider services (${response.status}).`);
    return void res.json({ services: await response.json() });
  } catch (error: any) {
    req.log.error({ err: error }, "Provider service list failed");
    return void res.status(500).json({ error: error?.message || "Failed to load provider services." });
  }
});

router.post("/api/pi/services", async (req, res) => {
  const accessToken = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return void res.status(401).json({ error: "Pi access token is required." });

  try {
    const piUser = await verifyPiAccessToken(accessToken);
    if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." });

    const provider = await getProviderByPiUid(piUser.uid);
    if (!provider) return void res.status(403).json({ error: "No provider profile is linked to this Pi account." });
    if (provider.status !== "Approved") return void res.status(403).json({ error: "Only approved providers can create services." });

    const service = validateServiceInput(req.body || {});
    const exchangeRate = await getExchangeRate();
    const calculatedPiPrice = Number((service.basePriceNgn / exchangeRate).toFixed(2));

    const response = await supabaseRequest("services", {
      method: "POST",
      body: JSON.stringify({
        title: service.title,
        short_description: service.shortDescription,
        full_description: service.fullDescription,
        cover_image: service.coverImage,
        deliverables: service.deliverables,
        duration: service.duration,
        base_price_ngn: service.basePriceNgn,
        calculated_pi_price: calculatedPiPrice,
        status: service.status,
        category: service.category,
        provider_name: provider.full_name,
        provider_role: provider.role_title || "Specialist",
        provider_id: provider.id,
        location_type: service.locationType,
        featured: false,
      }),
    });

    if (!response) return void res.status(500).json({ error: "Supabase connection is not configured on the API server." });
    if (!response.ok) throw new Error((await response.text().catch(() => "")) || `Service creation failed (${response.status}).`);
    const rows = await response.json() as any[];
    return void res.status(201).json({ service: rows[0] });
  } catch (error: any) {
    req.log.error({ err: error }, "Provider service creation failed");
    return void res.status(400).json({ error: error?.message || "Failed to create service." });
  }
});

router.patch("/api/pi/services/:serviceId", async (req, res) => {
  const serviceId = req.params.serviceId;
  const accessToken = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return void res.status(401).json({ error: "Pi access token is required." });
  if (!/^[0-9a-f-]{36}$/i.test(serviceId)) return void res.status(400).json({ error: "A valid serviceId is required." });

  try {
    const piUser = await verifyPiAccessToken(accessToken);
    if (!piUser) return void res.status(401).json({ error: "Invalid or expired Pi access token." });

    const provider = await getProviderByPiUid(piUser.uid);
    if (!provider) return void res.status(403).json({ error: "No provider profile is linked to this Pi account." });
    if (provider.status !== "Approved") return void res.status(403).json({ error: "Only approved providers can edit services." });

    const service = validateServiceInput(req.body || {});
    const exchangeRate = await getExchangeRate();
    const calculatedPiPrice = Number((service.basePriceNgn / exchangeRate).toFixed(2));

    const response = await supabaseRequest(
      `services?id=eq.${encodeURIComponent(serviceId)}&provider_id=eq.${encodeURIComponent(provider.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          title: service.title,
          short_description: service.shortDescription,
          full_description: service.fullDescription,
          cover_image: service.coverImage,
          deliverables: service.deliverables,
          duration: service.duration,
          base_price_ngn: service.basePriceNgn,
          calculated_pi_price: calculatedPiPrice,
          status: service.status,
          category: service.category,
          provider_name: provider.full_name,
          provider_role: provider.role_title || "Specialist",
          location_type: service.locationType,
          updated_at: new Date().toISOString(),
        }),
      },
    );

    if (!response) return void res.status(500).json({ error: "Supabase connection is not configured on the API server." });
    if (!response.ok) throw new Error((await response.text().catch(() => "")) || `Service update failed (${response.status}).`);
    const rows = await response.json() as any[];
    if (!rows.length) return void res.status(409).json({ error: "Service was not found or does not belong to this provider." });
    return void res.json({ service: rows[0] });
  } catch (error: any) {
    req.log.error({ err: error, serviceId }, "Provider service update failed");
    return void res.status(400).json({ error: error?.message || "Failed to update service." });
  }
});

export default router;
