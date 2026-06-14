import {
  buildBackupPayload,
  getBackupFilename,
  parseBackupJson,
  serializeBackup,
  type ConversationBackup,
} from "./conversationBackup";
import type { ChatSession } from "../types";

export async function exportConversationsWeb(
  sessions: ChatSession[],
  activeSessionId: string | null
): Promise<{ cancelled?: boolean; error?: string }> {
  if (sessions.length === 0) {
    return { error: "empty" };
  }

  const payload = buildBackupPayload(sessions, activeSessionId);
  const content = serializeBackup(payload);
  const filename = getBackupFilename();

  const pickerWindow = window as Window & {
    showSaveFilePicker?: (options: {
      suggestedName?: string;
      startIn?: "downloads" | "documents" | "desktop";
      types?: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
  };

  if (pickerWindow.showSaveFilePicker) {
    try {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName: filename,
        startIn: "downloads",
        types: [
          {
            description: "JSON",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return {};
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { cancelled: true };
      }
      return { error: "export_failed" };
    }
  }

  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return {};
}

export function readImportFileWeb(file: File): Promise<ConversationBackup> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parseBackupJson(String(reader.result ?? "")));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsText(file);
  });
}
