import { randomUUID } from "crypto";

export interface CheckpointSession {
  sessionId: string;
  hwid: string;
  ip: string;
  createdAt: Date;
  expiresAt: Date;
}

const SESSION_TTL_MS = 15 * 60 * 1000;

const sessions = new Map<string, CheckpointSession>();

export function createSession(hwid: string, ip: string): CheckpointSession {
  const sessionId = randomUUID();
  const now = new Date();
  const session: CheckpointSession = {
    sessionId,
    hwid,
    ip,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): CheckpointSession | null {
  return sessions.get(sessionId) ?? null;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function isSessionValid(session: CheckpointSession): boolean {
  return session.expiresAt > new Date();
}

setInterval(() => {
  const now = new Date();
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt < now) sessions.delete(id);
  }
}, 5 * 60 * 1000);
