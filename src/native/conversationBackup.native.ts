import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  buildBackupPayload,
  getBackupFilename,
  parseBackupJson,
  serializeBackup,
} from "../lib/conversationBackup";
import type { ChatSession } from "../types";

export async function exportConversationsNative(
  sessions: ChatSession[],
  activeSessionId: string | null
): Promise<{ cancelled?: boolean; error?: string }> {
  if (sessions.length === 0) {
    return { error: "empty" };
  }

  const content = serializeBackup(buildBackupPayload(sessions, activeSessionId));
  const filename = getBackupFilename();

  if (Platform.OS === "android") {
    try {
      const downloadsUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("Download");
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
        downloadsUri
      );
      if (!permissions.granted) {
        return { cancelled: true };
      }

      const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        filename,
        "application/json"
      );
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return {};
    } catch {
      return { error: "export_failed" };
    }
  }

  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  try {
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (!(await Sharing.isAvailableAsync())) {
      return { error: "export_failed" };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: "application/json",
      UTI: "public.json",
      dialogTitle: filename,
    });
    return {};
  } catch {
    return { error: "export_failed" };
  }
}

export async function importConversationsNative(): Promise<
  { cancelled: true } | { backup: ReturnType<typeof parseBackupJson> }
> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return { cancelled: true };
  }

  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { backup: parseBackupJson(raw) };
}
