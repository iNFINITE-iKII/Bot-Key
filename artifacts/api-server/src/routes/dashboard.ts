import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { findValidKeyByDiscordId, resetKeyHwid } from "../lib/keyStore.js";
import { createSession } from "../lib/sessionStore.js";

const dashboardRouter = Router();

dashboardRouter.use(isAuthenticated);

dashboardRouter.get("/", async (req, res) => {
  const user = req.session.user!;
  const activeKey = await findValidKeyByDiscordId(user.discordId);

  const msLeft = activeKey?.expiresAt
    ? activeKey.expiresAt.getTime() - Date.now()
    : 0;
  const timeLeft = formatTimeLeft(msLeft);
  const isExpired = msLeft <= 0;

  res.render("dashboard", {
    user,
    activeKey: isExpired ? null : activeKey,
    timeLeft: isExpired ? null : timeLeft,
    error: req.query["error"] ?? null,
    success: req.query["success"] ?? null,
  });
});

dashboardRouter.post("/reset-hwid", async (req, res) => {
  const user = req.session.user!;
  const key = await findValidKeyByDiscordId(user.discordId);
  if (!key) {
    res.redirect("/dashboard?error=no_key");
    return;
  }
  await resetKeyHwid(key.key);
  res.redirect("/dashboard?success=hwid_reset");
});

dashboardRouter.get("/get-free-key", (req, res) => {
  const user = req.session.user!;
  const hwid = req.query["hwid"];

  if (typeof hwid !== "string" || !hwid.trim()) {
    res.redirect("/dashboard?error=hwid_required");
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const session = createSession(hwid.trim(), ip, user.discordId);

  const adLinkBase = process.env["AD_LINK_URL"];
  if (!adLinkBase) {
    res.redirect("/dashboard?error=config_error");
    return;
  }

  const domain = process.env["RAILWAY_PUBLIC_DOMAIN"]
    ? `https://${process.env["RAILWAY_PUBLIC_DOMAIN"]}`
    : `${req.protocol}://${req.get("host")}`;

  const callbackUrl = encodeURIComponent(
    `${domain}/api/verify-checkpoint?session_id=${session.sessionId}`
  );

  res.redirect(`${adLinkBase}${callbackUrl}`);
});

function formatTimeLeft(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh > 0 ? `${d} hari ${rh} jam` : `${d} hari`;
  }
  if (h > 0) return `${h} jam ${m} menit`;
  return `${m} menit`;
}

export default dashboardRouter;
