const DISCORD_API = "https://discord.com/api/v10";

export function getDiscordAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env["DISCORD_CLIENT_ID"] ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env["DISCORD_CLIENT_ID"] ?? "",
    client_secret: process.env["DISCORD_CLIENT_SECRET"] ?? "",
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error("Failed to exchange Discord code");
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  global_name: string | null;
}

export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Discord user");
  return res.json() as Promise<DiscordUser>;
}

export function getAvatarUrl(user: DiscordUser): string | null {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}
