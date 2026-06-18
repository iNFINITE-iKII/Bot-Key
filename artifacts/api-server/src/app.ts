import path from "path";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes/index.js";
import authRouter from "./routes/auth.js";
import dashboardRouter from "./routes/dashboard.js";
import adminRouter from "./routes/admin.js";
import { logger } from "./lib/logger.js";

const PgSession = connectPg(session);
const app: Express = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

app.use(
  session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: process.env["SESSION_SECRET"] ?? "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true },
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/debug-uri", (req, res) => {
  const domain = process.env["RAILWAY_PUBLIC_DOMAIN"]
    ? `https://${process.env["RAILWAY_PUBLIC_DOMAIN"]}`
    : `${req.protocol}://${req.get("host")}`;
  const autoUri = `${domain}/auth/discord/callback`;
  const manualUri = process.env["DISCORD_REDIRECT_URI"] ?? null;
  const activeUri = manualUri ?? autoUri;
  res.send(`<!DOCTYPE html><html><head><style>
    body{background:#0A0A0F;color:#E0E0E0;font-family:monospace;padding:40px;max-width:700px;margin:0 auto}
    h2{color:#00C3FF;margin-bottom:24px}
    .box{background:#141420;border:1px solid #1E1E30;border-radius:12px;padding:20px;margin-bottom:16px}
    .label{color:#555;font-size:.8rem;margin-bottom:6px}
    .uri{color:#00FF99;font-size:1rem;word-break:break-all}
    .warn{color:#FFB800}
    .ok{color:#00FF99}
  </style></head><body>
    <h2>🔍 Discord Redirect URI Debug</h2>
    <div class="box">
      <div class="label">✅ URI AKTIF (yang dipakai server saat ini):</div>
      <div class="uri">${activeUri}</div>
    </div>
    <div class="box">
      <div class="label">Auto-generated dari domain:</div>
      <div class="uri ${manualUri ? 'warn' : 'ok'}">${autoUri}</div>
    </div>
    <div class="box">
      <div class="label">DISCORD_REDIRECT_URI (manual override):</div>
      <div class="uri">${manualUri ?? '<span style="color:#555">— tidak di-set —</span>'}</div>
    </div>
    <div class="box">
      <div class="label">RAILWAY_PUBLIC_DOMAIN:</div>
      <div class="uri">${process.env["RAILWAY_PUBLIC_DOMAIN"] ?? '<span style="color:#555">— tidak di-set —</span>'}</div>
    </div>
    <div class="box" style="border-color:#3A2A00">
      <div class="label warn">⚠️ Pastikan URI AKTIF di atas SAMA PERSIS dengan yang ada di:</div>
      <div style="color:#FFB800;margin-top:6px">Discord Developer Portal → OAuth2 → Redirects</div>
    </div>
  </body></html>`);
});

app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/dashboard");
    return;
  }
  res.render("login", {
    error: req.query["error"] ?? null,
    detail: req.query["detail"] ?? null,
  });
});

app.use("/auth", authRouter);
app.use("/dashboard", dashboardRouter);
app.use("/xifil-admin", adminRouter);
app.use("/api", router);

export default app;
