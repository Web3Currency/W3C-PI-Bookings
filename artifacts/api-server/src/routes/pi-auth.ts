import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * POST /api/pi/auth
 *
 * Validates a Pi Network access token by forwarding it to
 * GET https://api.minepi.com/v2/me with Authorization: Bearer <token>.
 * No Pi API key is required for this endpoint.
 *
 * Body:  { accessToken: string }
 * 200:   { uid: string, username: string }
 * 400:   missing / malformed token
 * 401:   Pi API rejected the token
 * 500:   network / unexpected error
 */
router.post("/pi/auth", async (req, res) => {
  const { accessToken } = req.body as { accessToken?: string };

  if (!accessToken || typeof accessToken !== "string" || accessToken.trim() === "") {
    res.status(400).json({ error: "accessToken is required." });
    return;
  }

  let piResponse: Response;
  try {
    piResponse = await fetch("https://api.minepi.com/v2/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
      },
    });
  } catch (err: any) {
    req.log.error({ err }, "Network error reaching Pi API");
    res.status(500).json({ error: "Could not reach Pi Network API." });
    return;
  }

  if (!piResponse.ok) {
    const body = await piResponse.text().catch(() => "");
    req.log.warn(
      { status: piResponse.status, body },
      "Pi API rejected access token"
    );
    res.status(401).json({ error: "Invalid or expired Pi access token." });
    return;
  }

  let piUser: { uid: string; username: string } & Record<string, unknown>;
  try {
    piUser = await piResponse.json();
  } catch (err: any) {
    req.log.error({ err }, "Failed to parse Pi API response");
    res.status(500).json({ error: "Unexpected response from Pi Network API." });
    return;
  }

  if (!piUser.uid || !piUser.username) {
    req.log.warn({ piUser }, "Pi API response missing uid or username");
    res.status(502).json({ error: "Incomplete user data from Pi Network." });
    return;
  }

  req.log.info({ uid: piUser.uid, username: piUser.username }, "Pi user validated");
  res.json({ uid: piUser.uid, username: piUser.username });
});

export default router;
