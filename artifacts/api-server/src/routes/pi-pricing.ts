import { Router, type IRouter } from "express";
import { getPiFiatRates, quoteFiatToPi } from "../services/piPricingService";

const router: IRouter = Router();

router.get("/pi/pricing/rates", async (req, res) => {
  try {
    const raw = String(req.query.currencies || "USD,EUR,GBP,NGN");
    const currencies = raw.split(",").map((v) => v.trim()).filter(Boolean);
    const result = await getPiFiatRates(currencies);
    return void res.json(result);
  } catch (error: any) {
    req.log.error({ err: error }, "PI fiat rates lookup failed");
    return void res.status(502).json({ error: error?.message || "Unable to fetch PI market rates." });
  }
});

router.get("/pi/pricing/quote", async (req, res) => {
  try {
    const amount = Number(req.query.amount);
    const currency = String(req.query.currency || "").trim();
    const result = await quoteFiatToPi(amount, currency);
    return void res.json(result);
  } catch (error: any) {
    req.log.error({ err: error }, "PI fiat quote failed");
    return void res.status(400).json({ error: error?.message || "Unable to calculate PI quote." });
  }
});

export default router;
