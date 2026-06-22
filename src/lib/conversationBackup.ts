import type { ChatSession } from "../types";
import { APP_NAME, APP_NAME_LEGACY } from "./appIdentity";

export const BACKUP_VERSION = 1;

export interface ConversationBackup {
  version: number;
  app: typeof APP_NAME | typeof APP_NAME_LEGACY;
  exportedAt: string;
  activeSessionId: string | null;
  sessions: ChatSession[];
}

function isValidMessage(
  value: unknown,
): value is ChatSession["messages"][number] {
  if (!value || typeof value !== "object") return false;
  const msg = value as Record<string, unknown>;
  return (
    (msg.role === "user" || msg.role === "model") &&
    typeof msg.text === "string" &&
    typeof msg.timestamp === "number"
  );
}

export function isValidSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.id === "string" &&
    typeof session.title === "string" &&
    typeof session.created_at === "number" &&
    Array.isArray(session.messages) &&
    session.messages.every(isValidMessage)
  );
}

export function getBackupFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${APP_NAME}-${y}-${m}-${d}.json`;
}

export function buildBackupPayload(
  sessions: ChatSession[],
  activeSessionId: string | null,
): ConversationBackup {
  return {
    version: BACKUP_VERSION,
    app: APP_NAME,
    exportedAt: new Date().toISOString(),
    activeSessionId,
    sessions,
  };
}

export function serializeBackup(payload: ConversationBackup): string {
  return JSON.stringify(payload, null, 2);
}

export function parseBackupJson(raw: string): ConversationBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("invalid_json");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid_format");
  }

  const backup = parsed as Partial<ConversationBackup>;
  const sessions = Array.isArray(backup.sessions)
    ? backup.sessions.filter(isValidSession)
    : [];

  if (sessions.length === 0) {
    throw new Error("no_sessions");
  }

  const appName =
    backup.app === APP_NAME || backup.app === APP_NAME_LEGACY
      ? APP_NAME
      : APP_NAME;

  return {
    version:
      typeof backup.version === "number" ? backup.version : BACKUP_VERSION,
    app: appName,
    exportedAt:
      typeof backup.exportedAt === "string"
        ? backup.exportedAt
        : new Date().toISOString(),
    activeSessionId:
      typeof backup.activeSessionId === "string"
        ? backup.activeSessionId
        : null,
    sessions,
  };
}

export function mergeImportedSessions(
  existing: ChatSession[],
  imported: ChatSession[],
): {
  sessions: ChatSession[];
  activeSessionId: string | null;
  importedCount: number;
} {
  const existingIds = new Set(existing.map((session) => session.id));
  const merged = [...existing];
  let importedCount = 0;

  for (const session of imported) {
    let nextSession = session;
    if (existingIds.has(session.id)) {
      nextSession = {
        ...session,
        id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      };
    }
    existingIds.add(nextSession.id);
    merged.unshift(nextSession);
    importedCount += 1;
  }

  merged.sort((a, b) => b.created_at - a.created_at);

  return {
    sessions: merged,
    activeSessionId: merged[0]?.id ?? null,
    importedCount,
  };
}
