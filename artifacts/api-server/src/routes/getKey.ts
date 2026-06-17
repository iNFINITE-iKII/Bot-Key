import { Router } from "express";
import { addKey, findValidKeyByIp } from "../lib/keyStore.js";

const getKeyRouter = Router();

function formatTimeLeft(ms: number): string {
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / 60000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh > 0 ? `${d} hari ${rh} jam` : `${d} hari`;
  }
  if (h > 0) return `${h} jam ${m} menit`;
  return `${m} menit`;
}

function renderPage(key: string, timeLeft: string, isExisting: boolean): string {
  const icon = isExisting ? "🔄" : "🎉";
  const title = isExisting ? "Key Kamu Masih Aktif!" : "Key Generated!";
  const subtitle = isExisting
    ? "Kamu sudah punya key yang masih berlaku."
    : "Thank you for supporting XiFil Hub!";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>XiFil Hub – Key</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0F0F0F;
      color: #E0E0E0;
      font-family: 'Segoe UI', system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #1A1A1A;
      border: 1px solid #2A2A2A;
      border-radius: 16px;
      padding: 48px 40px;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: 0 0 40px rgba(0, 195, 255, 0.08);
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 {
      font-size: 1.6rem;
      font-weight: 700;
      color: #00C3FF;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .subtitle { color: #888; font-size: 0.95rem; margin-bottom: 32px; }
    .key-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #555;
      margin-bottom: 8px;
    }
    .key-box {
      background: #0F0F0F;
      border: 1.5px solid #00C3FF;
      border-radius: 10px;
      padding: 16px 20px;
      font-family: 'Courier New', monospace;
      font-size: 1.2rem;
      font-weight: 700;
      color: #00C3FF;
      letter-spacing: 0.05em;
      word-break: break-all;
      cursor: pointer;
      transition: background 0.15s;
      user-select: all;
    }
    .key-box:hover { background: #131313; }
    .copy-btn {
      margin-top: 14px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #00C3FF;
      color: #0F0F0F;
      border: none;
      border-radius: 8px;
      padding: 10px 24px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .copy-btn:hover { opacity: 0.85; }
    .copy-btn:active { opacity: 0.7; }
    .expiry {
      margin-top: 20px;
      font-size: 0.85rem;
      color: #555;
    }
    .expiry span { color: #00C3FF; font-weight: 600; }
    .badge {
      display: inline-block;
      margin-bottom: 20px;
      background: #1E2A2A;
      border: 1px solid #00C3FF33;
      color: #00C3FF;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 99px;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    ${isExisting ? `<div class="badge">KEY AKTIF</div>` : ""}
    <p class="subtitle">${subtitle}</p>
    <p class="key-label">Your Free Key</p>
    <div class="key-box" id="key">${key}</div>
    <button class="copy-btn" onclick="copyKey()">
      <span id="copy-label">📋 Copy Key</span>
    </button>
    <p class="expiry">Sisa waktu: <span>${timeLeft}</span></p>
  </div>
  <script>
    function copyKey() {
      const key = document.getElementById('key').innerText;
      navigator.clipboard.writeText(key).then(() => {
        const label = document.getElementById('copy-label');
        label.textContent = '✅ Copied!';
        setTimeout(() => { label.textContent = '📋 Copy Key'; }, 2000);
      });
    }
  </script>
</body>
</html>`;
}

getKeyRouter.get("/get-key", async (req, res) => {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const existing = await findValidKeyByIp(ip);
  if (existing && existing.expiresAt) {
    const msLeft = existing.expiresAt.getTime() - Date.now();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderPage(existing.key, formatTimeLeft(msLeft), true));
    return;
  }

  const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
  const newKey = `XiFil-FREE-${randomString}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await addKey(newKey, expiresAt, ip);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(renderPage(newKey, "24 jam", false));
});

export default getKeyRouter;
