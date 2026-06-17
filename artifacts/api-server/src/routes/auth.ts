import { Router } from "express";
import {
  getDiscordAuthUrl,
  exchangeCode,
  getDiscordUser,
  getAvatarUrl,
} from "../lib/discordAuth.js";
import { upsertUser } from "../lib/userStore.js";
import { isDiscordIdBlacklisted } from "../lib/userStore.js";

const authRouter = Router();

function getRedirectUri(req: Parameters<typeof authRouter.get>[1] extends (req: infer R, ...args: any[]) => any ? R : never): string {
  const domain = process.env["RAILWAY_PUBLIC_DOMAIN"]
    ? `https://${process.env["RAILWAY_PUBLIC_DOMAIN"]}`
    : `${req.protocol}://${req.get("host")}`;
  return `${domain}/auth/discord/callback`;
}

authRouter.get("/discord", (req, res) => {
  res.redirect(getDiscordAuthUrl(getRedirectUri(req)));
});

authRouter.get("/discord/callback", async (req, res) => {
  const code = req.query["code"];
  if (typeof code !== "string") {
    res.redirect("/");
    return;
  }

  try {
    const token = await exchangeCode(code, getRedirectUri(req));
    const discordUser = await getDiscordUser(token);
    const avatarUrl = getAvatarUrl(discordUser);

    const banned = await isDiscordIdBlacklisted(discordUser.id);
    if (banned) {
      res.status(403).send(bannedPage());
      return;
    }

    const dbUser = await upsertUser({
      discordId: discordUser.id,
      username: discordUser.global_name ?? discordUser.username,
      avatar: avatarUrl,
    });

    req.session.user = {
      discordId: dbUser.discordId,
      username: dbUser.username,
      avatar: dbUser.avatar,
      role: dbUser.role,
    };

    res.redirect("/dashboard");
  } catch {
    res.redirect("/?error=auth_failed");
  }
});

authRouter.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

function bannedPage(): string {
  return `<!DOCTYPE html><html><head><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0F0F0F;color:#E0E0E0;font-family:sans-serif;
      display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#1A1A1A;border:1px solid #3A1A1A;border-radius:16px;
      padding:48px;text-align:center;max-width:400px}
    h1{color:#FF4C4C;margin-bottom:12px}p{color:#888}
  </style></head><body>
  <div class="card">
    <div style="font-size:48px;margin-bottom:16px">🚫</div>
    <h1>Akun Dibanned</h1>
    <p>Akun Discord kamu telah diblokir oleh admin. Hubungi admin jika ada kesalahan.</p>
  </div></body></html>`;
}

export default authRouter;
