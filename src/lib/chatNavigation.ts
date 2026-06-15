import type { ChatSession } from "../types";

export function pickFallbackSessionId(
  sessions: ChatSession[],
  excludeId?: string | null,
): string | null {
  const others = sessions.filter((session) => session.id !== excludeId);
  if (others.length === 0) return null;

  const withMessages = others.find((session) => session.messages.length > 0);
  return (withMessages ?? others[0]).id;
}

export function sessionHasMessages(
  sessions: ChatSession[],
  sessionId: string | null,
): boolean {
  if (!sessionId) return false;
  return (sessions.find((session) => session.id === sessionId)?.messages.length ?? 0) > 0;
}

export interface ChatBackNavigationContext {
  sessions: ChatSession[];
  activeSessionId: string | null;
  sidebarOpen: boolean;
  renameOpen: boolean;
  deleteOpen: boolean;
  showHomeScreen: boolean;
}

export interface ChatBackNavigationActions {
  openSidebar: () => void;
  closeSidebar: () => void;
  closeRename: () => void;
  closeDelete: () => void;
  selectSession: (id: string) => void;
  goHome: () => void;
}

export function handleChatBackPress(
  ctx: ChatBackNavigationContext,
  actions: ChatBackNavigationActions,
): boolean {
  if (ctx.deleteOpen) {
    actions.closeDelete();
    return true;
  }
  if (ctx.renameOpen) {
    actions.closeRename();
    return true;
  }
  if (ctx.sidebarOpen) {
    actions.closeSidebar();
    return true;
  }

  if (!ctx.showHomeScreen) {
    actions.goHome();
    return true;
  }

  if (ctx.sessions.length > 0) {
    actions.openSidebar();
    return true;
  }

  return false;
}
