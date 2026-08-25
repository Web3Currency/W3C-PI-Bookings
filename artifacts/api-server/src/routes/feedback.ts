import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const FEEDBACK_TYPES = ["bug", "suggestion", "general"] as const;
type FeedbackType = (typeof FEEDBACK_TYPES)[number];

const MAX_MESSAGE_LENGTH = 4000;
const MAX_PAGE_LENGTH = 500;
const MAX_UA_LENGTH = 400;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 5;

/** Lightweight in-memory rate limit (per serverless instance). */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ||
    req.socket?.remoteAddress ||
    "unknown";
  return ip;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_MAX_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

function typeLabel(type: FeedbackType): string {
  if (type === "bug") return "🐛 Bug / Problem";
  if (type === "suggestion") return "💡 Suggestion";
  return "💬 General Feedback";
}

async function verifyPiAccessToken(accessToken?: string): Promise<{ uid: string; username: string } | null> {
  if (!accessToken || typeof accessToken !== "string" || !accessToken.trim()) return null;
  try {
    const response = await fetch("https://api.minepi.com/v2/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken.trim()}` },
    });
    if (!response.ok) return null;
    const user = (await response.json()) as { uid?: string; username?: string };
    if (!user.uid || !user.username) return null;
    return { uid: user.uid, username: user.username };
  } catch {
    return null;
  }
}

router.post("/feedback", async (req: Request, res: Response) => {
  try {
    if (!checkRateLimit(clientKey(req))) {
      return void res.status(429).json({ error: "Too many feedback submissions. Please wait a minute and try again." });
    }

    const body = (req.body || {}) as {
      type?: string;
      message?: string;
      page?: string;
      userAgent?: string;
      accessToken?: string;
      contact?: string;
    };

    const rawType = String(body.type || "").trim().toLowerCase();
    if (!FEEDBACK_TYPES.includes(rawType as FeedbackType)) {
      return void res.status(400).json({ error: "Invalid feedback type." });
    }
    const type = rawType as FeedbackType;

    const message = String(body.message || "").trim();
    if (!message) {
      return void res.status(400).json({ error: "Feedback message is required." });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return void res.status(400).json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` });
    }

    const page = String(body.page || "").trim().slice(0, MAX_PAGE_LENGTH) || "unknown";
    const userAgent = String(body.userAgent || "").trim().slice(0, MAX_UA_LENGTH) || "unknown";
    const optionalContact = String(body.contact || "").trim().slice(0, 120);

    let piUser: { uid: string; username: string } | null = null;
    if (body.accessToken) {
      piUser = await verifyPiAccessToken(body.accessToken);
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
    if (!botToken || !chatId) {
      req.log?.warn?.("Feedback Telegram is not configured");
      return void res.status(503).json({
        error: "Feedback delivery is temporarily unavailable. Please try again later.",
      });
    }

    const serverTime = new Date().toISOString();
    const userLine = piUser
      ? `@${piUser.username.replace(/^@+/, "")}`
      : optionalContact
        ? optionalContact
        : "Guest Tester";
    const uidLine = piUser ? piUser.uid : "Not authenticated";

    const text = [
      "🛠 <b>W3C PI BOOKINGS \u2014 TESTER FEEDBACK</b>",
      "",
      `<b>Type:</b> ${escapeTelegramHtml(typeLabel(type))}`,
      `<b>User:</b> ${escapeTelegramHtml(userLine)}`,
      `<b>Pi UID:</b> <code>${escapeTelegramHtml(uidLine)}</code>`,
      `<b>Page:</b> ${escapeTelegramHtml(page)}`,
      `<b>Time:</b> ${escapeTelegramHtml(serverTime)}`,
      `<b>UA:</b> ${escapeTelegramHtml(userAgent)}`,
      "",
      "<b>Message:</b>",
      escapeTelegramHtml(message),
    ].join("\n");

    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!tgResponse.ok) {
      const errBody = await tgResponse.text().catch(() => "");
      req.log?.error?.({ status: tgResponse.status, body: errBody.slice(0, 200) }, "Telegram feedback send failed");
      return void res.status(502).json({
        error: "Could not deliver feedback right now. Please try again.",
      });
    }

    return void res.json({ success: true });
  } catch (err: any) {
    req.log?.error?.({ err }, "Feedback endpoint failed");
    return void res.status(500).json({ error: "Unable to submit feedback right now. Please try again." });
  }
});

export default router;
