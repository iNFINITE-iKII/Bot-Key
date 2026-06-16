import { Client, GatewayIntentBits } from "discord.js";
import { addKey } from "./keyStore.js";
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
    // !genkey 1h       → expires in 1 hour
    // !genkey 7d       → expires in 7 days
    // !genkey 2w       → expires in 2 weeks
    if (command === "!genkey") {
      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newKey = `KIIBOO-${randomString}`;

      let expiresAt: Date | null = null;
      let expiryText = "**Permanen** (tidak pernah expired)";

      if (args[1]) {
        const durationMs = parseDuration(args[1]);
        if (!durationMs) {
          message.reply(
            "❌ Format waktu tidak valid!\n" +
            "Contoh: `!genkey 1h` (1 jam) | `!genkey 7d` (7 hari) | `!genkey 2w` (2 minggu)\n" +
            "Atau `!genkey` tanpa waktu untuk key permanen."
          ).catch(() => {});
          return;
        }
        expiresAt = new Date(Date.now() + durationMs);
        expiryText = `⏰ Expired dalam **${formatExpiry(durationMs)}** (${expiresAt.toLocaleString("id-ID")})`;
      }

      addKey(newKey, expiresAt)
        .then(() => {
          return message.reply(
            `✅ Key baru berhasil dibuat!\n` +
            `🔑 \`${newKey}\`\n` +
            `${expiryText}`
          );
        })
        .catch((err) => {
          logger.error({ err }, "Failed to save key");
          message.reply("❌ Gagal menyimpan key, coba lagi.").catch(() => {});
        });
    }

    // !help
    if (command === "!help") {
      message.reply(
        "📋 **Daftar Command:**\n" +
        "`!genkey` → Generate key **permanen**\n" +
        "`!genkey 1h` → Key expired dalam 1 jam\n" +
        "`!genkey 7d` → Key expired dalam 7 hari\n" +
        "`!genkey 2w` → Key expired dalam 2 minggu"
      ).catch(() => {});
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Discord bot failed to login");
  });
}
