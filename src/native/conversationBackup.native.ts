import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import {
  buildBackupPayload,
  getBackupFilename,
  parseBackupJson,
  serializeBackup,
} from "../lib/conversationBackup";
import type { ChatSession } from "../types";

function isNativeModuleError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /native module|ExpoDocumentPicker|ExpoSharing/i.test(message);
}

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

    const Sharing = await import("expo-sharing");
    if (!(await Sharing.isAvailableAsync())) {
      return { error: "export_failed" };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: "application/json",
      UTI: "public.json",
      dialogTitle: filename,
    });
    return {};
  } catch (error) {
    if (isNativeModuleError(error)) {
      return { error: "native_module_unavailable" };
    }
    return { error: "export_failed" };
  }
}

export async function importConversationsNative(): Promise<
  { cancelled: true } | { backup: ReturnType<typeof parseBackupJson> }
> {
  try {
    const DocumentPicker = await import("expo-document-picker");
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
  } catch (error) {
    if (isNativeModuleError(error)) {
      throw new Error("native_module_unavailable");
    }
    throw error;
  }
}
