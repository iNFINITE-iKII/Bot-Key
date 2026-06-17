import { Router } from "express";
import rateLimit from "express-rate-limit";
import { createSession, getSession, deleteSession, isSessionValid } from "../lib/sessionStore.js";
import { addKey, findValidKeyByHwid } from "../lib/keyStore.js";

const checkpointRouter = Router();

const startLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(errorPage("Terlalu banyak permintaan. Tunggu 1 menit sebelum mencoba lagi."));
  },
});

function getClientIp(req: Parameters<typeof checkpointRouter.get>[1] extends (req: infer R, ...args: any[]) => any ? R : never): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>XiFil Hub – Akses Ditolak</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#0F0F0F;color:#E0E0E0;font-family:'Segoe UI',system-ui,sans-serif;
      min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#1A1A1A;border:1px solid #3A1A1A;border-radius:16px;padding:48px 40px;
      max-width:480px;width:100%;text-align:center;box-shadow:0 0 40px rgba(255,60,60,0.08)}
    .icon{font-size:52px;margin-bottom:16px}
    h1{font-size:1.5rem;font-weight:700;color:#FF4C4C;margin-bottom:12px}
    p{color:#888;font-size:0.95rem;line-height:1.6;margin-bottom:28px}
    a{display:inline-block;background:#FF4C4C;color:#fff;text-decoration:none;
      border-radius:8px;padding:10px 28px;font-weight:700;font-size:0.9rem;transition:opacity .15s}
    a:hover{opacity:.85}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🚫</div>
    <h1>Akses Ditolak</h1>
    <p>${message}</p>
    <a href="javascript:history.back()">← Coba Lagi</a>
  </div>
</body>
</html>`;
}

function successPage(key: string, expiresAt: Date): string {
  const timeLeft = "24 jam";
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>XiFil Hub – Key Berhasil</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#0F0F0F;color:#E0E0E0;font-family:'Segoe UI',system-ui,sans-serif;
      min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#1A1A1A;border:1px solid #2A2A2A;border-radius:16px;padding:48px 40px;
      max-width:520px;width:100%;text-align:center;box-shadow:0 0 40px rgba(0,195,255,0.08)}
    .icon{font-size:52px;margin-bottom:16px}
    h1{font-size:1.6rem;font-weight:700;color:#00C3FF;margin-bottom:8px;letter-spacing:-.02em}
    .subtitle{color:#888;font-size:.95rem;margin-bottom:12px}
    .badge{display:inline-block;margin-bottom:24px;background:#1E2A2A;border:1px solid #00C3FF33;
      color:#00C3FF;font-size:.72rem;font-weight:600;padding:4px 14px;border-radius:99px}
    .key-label{font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:#555;margin-bottom:8px}
    .key-box{background:#0F0F0F;border:1.5px solid #00C3FF;border-radius:10px;padding:16px 20px;
      font-family:'Courier New',monospace;font-size:1.2rem;font-weight:700;color:#00C3FF;
      letter-spacing:.05em;word-break:break-all;cursor:pointer;transition:background .15s;user-select:all}
    .key-box:hover{background:#131313}
    .copy-btn{margin-top:14px;display:inline-flex;align-items:center;gap:8px;background:#00C3FF;
      color:#0F0F0F;border:none;border-radius:8px;padding:10px 28px;font-size:.9rem;
      font-weight:700;cursor:pointer;transition:opacity .15s}
    .copy-btn:hover{opacity:.85}
    .expiry{margin-top:20px;font-size:.82rem;color:#555}
    .expiry span{color:#00C3FF;font-weight:600}
    .warning{margin-top:16px;font-size:.78rem;color:#555;background:#181818;
      border-radius:8px;padding:10px 14px;border:1px solid #222}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎉</div>
    <h1>Verifikasi Berhasil!</h1>
    <p class="subtitle">Terima kasih telah mendukung XiFil Hub!</p>
    <div class="badge">✅ CHECKPOINT PASSED</div>
    <p class="key-label">Free Key Kamu</p>
    <div class="key-box" id="key">${key}</div>
    <button class="copy-btn" onclick="copyKey()">
      <span id="copy-label">📋 Copy Key</span>
    </button>
    <p class="expiry">Aktif selama <span>${timeLeft}</span> — expired ${expiresAt.toLocaleString("id-ID")}</p>
    <p class="warning">⚠️ Jangan bagikan key ini. Key diikat ke device kamu (HWID).</p>
  </div>
  <script>
    function copyKey(){
      navigator.clipboard.writeText(document.getElementById('key').innerText).then(()=>{
        const l=document.getElementById('copy-label');
        l.textContent='✅ Copied!';
        setTimeout(()=>{l.textContent='📋 Copy Key'},2000);
      });
    }
  </script>
</body>
</html>`;
}

function existingKeyPage(key: string, expiresAt: Date): string {
  const msLeft = expiresAt.getTime() - Date.now();
  const h = Math.floor(msLeft / 3600000);
  const m = Math.floor((msLeft % 3600000) / 60000);
  const timeLeft = h > 0 ? `${h} jam ${m} menit` : `${m} menit`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>XiFil Hub – Key Aktif</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#0F0F0F;color:#E0E0E0;font-family:'Segoe UI',system-ui,sans-serif;
      min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#1A1A1A;border:1px solid #2A2A2A;border-radius:16px;padding:48px 40px;
      max-width:520px;width:100%;text-align:center;box-shadow:0 0 40px rgba(0,195,255,0.08)}
    .icon{font-size:52px;margin-bottom:16px}
    h1{font-size:1.5rem;font-weight:700;color:#00C3FF;margin-bottom:8px}
    .subtitle{color:#888;font-size:.95rem;margin-bottom:12px}
    .badge{display:inline-block;margin-bottom:24px;background:#1E2A2A;border:1px solid #00C3FF33;
      color:#00C3FF;font-size:.72rem;font-weight:600;padding:4px 14px;border-radius:99px}
    .key-label{font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:#555;margin-bottom:8px}
    .key-box{background:#0F0F0F;border:1.5px solid #00C3FF;border-radius:10px;padding:16px 20px;
      font-family:'Courier New',monospace;font-size:1.2rem;font-weight:700;color:#00C3FF;
      letter-spacing:.05em;word-break:break-all;cursor:pointer;transition:background .15s;user-select:all}
    .key-box:hover{background:#131313}
    .copy-btn{margin-top:14px;display:inline-flex;align-items:center;gap:8px;background:#00C3FF;
      color:#0F0F0F;border:none;border-radius:8px;padding:10px 28px;font-size:.9rem;
      font-weight:700;cursor:pointer;transition:opacity .15s}
    .copy-btn:hover{opacity:.85}
    .expiry{margin-top:20px;font-size:.82rem;color:#555}
    .expiry span{color:#00C3FF;font-weight:600}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔄</div>
    <h1>Key Kamu Masih Aktif</h1>
    <p class="subtitle">Device ini sudah punya key yang belum expired.</p>
    <div class="badge">KEY AKTIF</div>
    <p class="key-label">Key Kamu</p>
    <div class="key-box" id="key">${key}</div>
    <button class="copy-btn" onclick="copyKey()">
      <span id="copy-label">📋 Copy Key</span>
    </button>
    <p class="expiry">Sisa waktu: <span>${timeLeft}</span></p>
  </div>
  <script>
    function copyKey(){
      navigator.clipboard.writeText(document.getElementById('key').innerText).then(()=>{
        const l=document.getElementById('copy-label');
        l.textContent='✅ Copied!';
        setTimeout(()=>{l.textContent='📋 Copy Key'},2000);
      });
    }
  </script>
</body>
</html>`;
}

checkpointRouter.get("/start-checkpoint", startLimiter, (req, res) => {
  const hwid = req.query["hwid"];
  if (typeof hwid !== "string" || !hwid.trim()) {
    res.status(400).setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(errorPage("Parameter <code>hwid</code> wajib diisi."));
    return;
  }

  const ip = getClientIp(req as any);
  const session = createSession(hwid.trim(), ip);

  const adLinkBase = process.env["AD_LINK_URL"];
  if (!adLinkBase) {
    res.status(500).setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(errorPage("Konfigurasi server belum lengkap. Hubungi admin."));
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

checkpointRouter.get("/verify-checkpoint", async (req, res) => {
  const sessionId = req.query["session_id"];

  if (typeof sessionId !== "string" || !sessionId) {
    res.status(400).setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(errorPage("Sesi tidak valid atau kedaluwarsa, atau terdeteksi penggunaan bypasser. Silakan ulangi dari awal."));
    return;
  }

  const session = getSession(sessionId);

  if (!session || !isSessionValid(session)) {
    deleteSession(sessionId);
    res.status(403).setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(errorPage("Sesi tidak valid, kedaluwarsa, atau terdeteksi penggunaan bypasser. Silakan ulangi dari awal."));
    return;
  }

  deleteSession(sessionId);

  const existing = await findValidKeyByHwid(session.hwid);
  if (existing && existing.expiresAt) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(existingKeyPage(existing.key, existing.expiresAt));
    return;
  }

  const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
  const newKey = `XiFil-FREE-${randomString}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await addKey(newKey, expiresAt, null, session.hwid);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(successPage(newKey, expiresAt));
});

export default checkpointRouter;
