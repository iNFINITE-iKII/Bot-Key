import { Router } from "express";
import { isAdmin } from "../middleware/auth.js";
import {
  getAllKeys,
  getAllUsers,
  getAllBans,
  deleteKey,
  deleteUser,
  addBan,
  removeBan,
  updateUserRole,
  searchKeys,
  searchUsers,
} from "../lib/userStore.js";
import { addKey } from "../lib/keyStore.js";

const adminRouter = Router();

adminRouter.use(isAdmin);

adminRouter.get("/", async (req, res) => {
  const page = parseInt(req.query["page"] as string) || 1;
  const [keys, users, bans] = await Promise.all([
    getAllKeys(page),
    getAllUsers(page),
    getAllBans(),
  ]);
  res.render("admin", { user: req.session.user!, keys, users, bans, page, error: null, success: null });
});

adminRouter.get("/api/search", async (req, res) => {
  const q = req.query["q"];
  const type = req.query["type"];
  if (typeof q !== "string" || !q.trim()) {
    res.json({ keys: [], users: [] });
    return;
  }
  const [keys, users] = await Promise.all([
    type === "users" ? [] : searchKeys(q.trim()),
    type === "keys" ? [] : searchUsers(q.trim()),
  ]);
  res.json({ keys, users });
});

adminRouter.post("/api/genkey", async (req, res) => {
  const { duration, type, discord_id } = req.body as {
    duration: string;
    type: string;
    discord_id?: string;
  };

  const durationMap: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    lifetime: 0,
  };

  const ms = durationMap[duration];
  const expiresAt = ms ? new Date(Date.now() + ms) : null;

  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  const prefix = type === "premium" ? "XiFil-PREM" : "XiFil";
  const newKey = `${prefix}-${rand}`;

  await addKey(
    newKey,
    expiresAt,
    null,
    null,
    discord_id?.trim() || null,
    type || "free"
  );

  res.json({ success: true, key: newKey });
});

adminRouter.post("/api/delete-key", async (req, res) => {
  const { key } = req.body as { key: string };
  await deleteKey(key);
  res.json({ success: true });
});

adminRouter.post("/api/delete-user", async (req, res) => {
  const { discord_id } = req.body as { discord_id: string };
  await deleteUser(discord_id);
  res.json({ success: true });
});

adminRouter.post("/api/ban", async (req, res) => {
  const { discord_id, hwid, reason } = req.body as {
    discord_id?: string;
    hwid?: string;
    reason?: string;
  };
  await addBan({ discordId: discord_id, hwid, reason });
  res.json({ success: true });
});

adminRouter.post("/api/unban", async (req, res) => {
  const { id } = req.body as { id: number };
  await removeBan(id);
  res.json({ success: true });
});

adminRouter.post("/api/change-role", async (req, res) => {
  const { discord_id, role } = req.body as { discord_id: string; role: string };
  if (!["member", "admin"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  await updateUserRole(discord_id, role);
  res.json({ success: true });
});

export default adminRouter;
