import { Client, GatewayIntentBits } from "discord.js";
import { addKey, getKeyInfo } from "./keyStore.js";
import { logger } from "./logger.js";

function parseDuration(input: string): number | null {
  const match = input.match(/^(\d+)(h|d|w)$/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === "h") return value * 60 * 60 * 1000;
  if (unit === "d") return value * 24 * 60 * 60 * 1000;
  if (unit === "w") return value * 7 * 24 * 60 * 60 * 1000;
  return null;
}

function formatDuration(ms: number): string {
  const h = ms / (60 * 60 * 1000);
  if (h < 1) return `${Math.round(ms / 60000)} menit`;
  if (h < 24) return `${Math.round(h)} jam`;
  const d = h / 24;
  if (d < 7) return `${Math.round(d)} hari`;
  return `${Math.round(d / 7)} minggu`;
}

function formatExpiry(ms: number): string {
  const h = ms / (60 * 60 * 1000);
  if (h < 24) return `${Math.round(h)} jam`;
  const d = h / 24;
  if (d < 7) return `${Math.round(d)} hari`;
  return `${Math.round(d / 7)} minggu`;
}

export function startDiscordBot(): void {
  const token = process.env["TOKEN"];

  if (!token) {
    logger.warn("TOKEN env var not set — Discord bot will not start.");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on("ready", () => {
    logger.info({ tag: client.user?.tag }, "Discord bot online");
  });

  client.on("messageCreate", (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/\s+/);
    const command = args[0];

    // !genkey          → permanent key
    // !genkey 1h/7d/2w → timed key
    if (command === "!genkey") {
      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newKey = `XiFil-${randomString}`;

      let expiresAt: Date | null = null;
      let expiryText = "🔒 **Permanen** — tidak pernah expired";

      if (args[1]) {
        const durationMs = parseDuration(args[1]);
        if (!durationMs) {
          message.reply(
            "❌ Format waktu tidak valid!\n" +
            "Contoh: `!genkey 1h` | `!genkey 7d` | `!genkey 2w`\n" +
            "Atau `!genkey` untuk key permanen."
          ).catch(() => {});
          return;
        }
        expiresAt = new Date(Date.now() + durationMs);
        expiryText = `⏰ Expired dalam **${formatExpiry(durationMs)}** (${expiresAt.toLocaleString("id-ID")})`;
      }

      addKey(newKey, expiresAt)
        .then(() => {
          return message.reply(
            `✅ Key berhasil dibuat!\n` +
            `🔑 \`${newKey}\`\n` +
            `${expiryText}`
          );
        })
        .catch((err) => {
          logger.error({ err }, "Failed to save key");
          message.reply("❌ Gagal menyimpan key, coba lagi.").catch(() => {});
        });
    }

    // !keyinfo <key> → cek sisa waktu key
    if (command === "!keyinfo") {
      const targetKey = args[1];
      if (!targetKey) {
        message.reply("❌ Masukkan key!\nContoh: `!keyinfo XiFil-ABC123`").catch(() => {});
        return;
      }

      getKeyInfo(targetKey)
        .then((info) => {
          if (!info) {
            return message.reply(`❌ Key \`${targetKey}\` tidak ditemukan di database.`);
          }

          const now = new Date();

          if (info.expiresAt === null) {
            return message.reply(
              `🔑 **Info Key:** \`${info.key}\`\n` +
              `🔒 Status: **Permanen** — tidak pernah expired\n` +
              `📅 Dibuat: ${info.createdAt.toLocaleString("id-ID")}`
            );
          }

          if (info.expiresAt < now) {
            return message.reply(
              `🔑 **Info Key:** \`${info.key}\`\n` +
              `❌ Status: **Sudah expired**\n` +
              `📅 Expired pada: ${info.expiresAt.toLocaleString("id-ID")}`
            );
          }

          const sisaMs = info.expiresAt.getTime() - now.getTime();
          return message.reply(
            `🔑 **Info Key:** \`${info.key}\`\n` +
            `✅ Status: **Aktif**\n` +
            `⏰ Sisa waktu: **${formatDuration(sisaMs)}**\n` +
            `📅 Expired: ${info.expiresAt.toLocaleString("id-ID")}`
          );
        })
        .catch((err) => {
          logger.error({ err }, "Failed to get key info");
          message.reply("❌ Gagal mengecek key.").catch(() => {});
        });
    }

    // !help
    if (command === "!help") {
      message.reply(
        "📋 **Daftar Command XiFil Bot:**\n\n" +
        "`!genkey` → Generate key **permanen**\n" +
        "`!genkey 1h` → Key expired dalam 1 jam\n" +
        "`!genkey 7d` → Key expired dalam 7 hari\n" +
        "`!genkey 2w` → Key expired dalam 2 minggu\n" +
        "`!keyinfo <key>` → Cek sisa waktu key\n" +
        "`!help` → Tampilkan daftar command"
      ).catch(() => {});
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Discord bot failed to login");
  });
}
