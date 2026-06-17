import { RequestHandler } from "express";

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session.user) return next();
  res.redirect("/auth/discord");
};

export const isAdmin: RequestHandler = (req, res, next) => {
  const adminId = process.env["ADMIN_DISCORD_ID"];
  if (req.session.user && adminId && req.session.user.discordId === adminId) {
    return next();
  }
  res.status(403).send(`<!DOCTYPE html><html><head><style>
    body{background:#0F0F0F;color:#E0E0E0;font-family:sans-serif;display:flex;align-items:center;
    justify-content:center;min-height:100vh;margin:0}
    .card{background:#1A1A1A;border:1px solid #3A1A1A;border-radius:16px;padding:48px;text-align:center}
    h1{color:#FF4C4C}p{color:#888}a{color:#00C3FF}
  </style></head><body><div class="card"><h1>403 – Forbidden</h1>
  <p>Halaman ini hanya untuk Admin.</p><a href="/dashboard">← Kembali</a></div></body></html>`);
};
