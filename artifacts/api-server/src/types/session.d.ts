export {};

declare module "express-session" {
  interface SessionData {
    user?: {
      discordId: string;
      username: string;
      avatar: string | null;
      role: string;
    };
  }
}
