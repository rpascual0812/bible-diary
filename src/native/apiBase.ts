import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  VITE_PAYMONGO_DEV_SERVER_URL,
  VITE_PAYMONGO_PROD_SERVER_URL,
} from "../config/apiKey";

function getDebuggerHost(): string | null {
  const expoGoConfig = Constants.expoGoConfig as { debuggerHost?: string } | undefined;
  if (expoGoConfig?.debuggerHost) {
    return expoGoConfig.debuggerHost;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return hostUri.split("/")[0] ?? null;
  }

  const manifestHost = (Constants.manifest2 as { extra?: { expoClient?: { hostUri?: string } } } | null)
    ?.extra?.expoClient?.hostUri;
  if (manifestHost) {
    return manifestHost.split("/")[0] ?? null;
  }

  return null;
}

function resolveDevApiBase(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const debuggerHost = getDebuggerHost();
  if (debuggerHost) {
    const host = debuggerHost.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:3000`;
    }
  }

  if (Platform.OS === "android") {
    return VITE_PAYMONGO_DEV_SERVER_URL.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export function getNativeApiBaseUrl(): string {
  if (typeof __DEV__ !== "undefined" && !__DEV__) {
    return VITE_PAYMONGO_PROD_SERVER_URL.replace(/\/$/, "");
  }
  return resolveDevApiBase();
}

export function getNativeApiUrl(endpoint: string): string {
  return `${getNativeApiBaseUrl()}${endpoint}`;
}

export function getNativePaymentSetupHint(): string {
  if (typeof __DEV__ !== "undefined" && !__DEV__) {
    return "Payment server is unavailable. Please try again later.";
  }
  return `Start the backend with "npm run dev" on your computer (${getNativeApiBaseUrl()}), and use the same Wi‑Fi network as your phone.`;
}
