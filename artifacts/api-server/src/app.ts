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
