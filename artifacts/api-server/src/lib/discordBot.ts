import { Client, GatewayIntentBits } from "discord.js";
import { addKey } from "./keyStore.js";
import { logger } from "./logger.js";

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

    if (message.content === "!genkey") {
      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newKey = `KIIBOO-${randomString}`;
      addKey(newKey);
      message.reply(
        `✅ Key baru berhasil dibuat: \`${newKey}\`\nKey ini sekarang bisa digunakan di dalam game!`,
      );
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Discord bot failed to login");
  });
}
