// Helper to resolve environment variables safely for both client (Vite/SPA) and server (Node/Express)
const getEnv = (key: string, defaultValue: string): string => {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[key]) {
      return metaEnv[key];
    }
  } catch {}
  return defaultValue;
};

const PLACEHOLDER_KEYS = new Set(["MY_GEMINI_API_KEY", ""]);

function stripEnvQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function acceptGeminiKey(value: string): string {
  const normalized = stripEnvQuotes(value);
  if (normalized && !PLACEHOLDER_KEYS.has(normalized)) {
    return normalized;
  }
  return "";
}

/** Static env reads so Metro can inline EXPO_PUBLIC_* at bundle time. */
function readGeminiKeyFromProcessEnv(): string {
  if (typeof process === "undefined" || !process.env) {
    return "";
  }

  // Literal property access is required — dynamic process.env[key] is not inlined.
  return (
    acceptGeminiKey(process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "") ||
    acceptGeminiKey(process.env.GEMINI_API_KEY ?? "")
  );
}

function readGeminiKeyFromImportMeta(): string {
  try {
    const metaEnv = (import.meta as ImportMeta & { env?: Record<string, string> })
      .env;
    if (!metaEnv) return "";

    return (
      acceptGeminiKey(metaEnv.EXPO_PUBLIC_GEMINI_API_KEY ?? "") ||
      acceptGeminiKey(metaEnv.GEMINI_API_KEY ?? "") ||
      acceptGeminiKey(metaEnv.VITE_GEMINI_API_KEY ?? "")
    );
  } catch {
    return "";
  }
}

function getExpoGeminiKeyFromExtra(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expoConstants = require("expo-constants");
    const Constants = (expoConstants.default ?? expoConstants) as {
      expoConfig?: { extra?: { geminiApiKey?: string } };
      manifest?: { extra?: { geminiApiKey?: string } } | null;
      manifest2?: {
        extra?: { expoClient?: { extra?: { geminiApiKey?: string } } };
      } | null;
    };

    const candidates = [
      Constants.expoConfig?.extra?.geminiApiKey,
      Constants.manifest?.extra?.geminiApiKey,
      Constants.manifest2?.extra?.expoClient?.extra?.geminiApiKey,
    ];

    for (const candidate of candidates) {
      const accepted = acceptGeminiKey(
        typeof candidate === "string" ? candidate : "",
      );
      if (accepted) {
        return accepted;
      }
    }
  } catch {
    // Web / non-Expo
  }
  return "";
}

/** Resolve Gemini API key from Vite, Expo, or Node env. */
export function resolveGeminiApiKey(): string {
  return (
    readGeminiKeyFromProcessEnv() ||
    getExpoGeminiKeyFromExtra() ||
    readGeminiKeyFromImportMeta()
  );
}

// Standalone Google Play APK - Baked API Key Configuration
//
// If you are compiling this application as an offline Android APK for personal use
// or release on Google Play, paste your Gemini API Key in the constant below.
// This will package the key directly into the application's built asset package
// so that your app's end-users do not have to copy-paste or configure any API keys.
//
// To obtain a free API key, visit: https://aistudio.google.com/
export const BAKED_GEMINI_API_KEY = resolveGeminiApiKey();

// Xendit Secret Key Configuration
//
// If you want to accept digital offerings, paste your Xendit Secret Key below.
// This is used for server-side payment session creation on the server.
// You can get this from your Xendit Dashboard -> Settings -> Developers -> API Keys.
export const BAKED_XENDIT_SECRET_KEY = getEnv("XENDIT_SECRET_KEY", "");

// Xendit Test/Development Key Configuration for local testing (Optional)
//
// Use a development key (starts with xnd_development_) during debugging to avoid
// sending real money transactions.
export const BAKED_XENDIT_TEST_SECRET_KEY = getEnv(
  "XENDIT_TEST_SECRET_KEY",
  "",
);

/** Set to true when Xendit backend checkout is ready for production. */
export const ENABLE_XENDIT_CHECKOUT = false;

// Backend API access for native/APK builds
//
// In standard web environments, relative paths like /api/... work perfectly.
// However, when compiled as an Android APK (running via localized file:// or capacitor:// origins),
// relative routes cannot resolve. We dynamically direct them to the appropriate endpoint.
export const VITE_PAYMENT_DEV_SERVER_URL = getEnv(
  "VITE_PAYMENT_DEV_SERVER_URL",
  getEnv("VITE_PAYMONGO_DEV_SERVER_URL", "http://10.0.2.2:3000"),
);
export const VITE_PAYMENT_PROD_SERVER_URL = getEnv(
  "VITE_PAYMENT_PROD_SERVER_URL",
  getEnv(
    "VITE_PAYMONGO_PROD_SERVER_URL",
    "https://ais-pre-vjag2towx5cl3hqsbscjzz-453758756696.asia-southeast1.run.app",
  ),
);

/** @deprecated Use VITE_PAYMENT_DEV_SERVER_URL */
export const VITE_PAYMONGO_DEV_SERVER_URL = VITE_PAYMENT_DEV_SERVER_URL;
/** @deprecated Use VITE_PAYMENT_PROD_SERVER_URL */
export const VITE_PAYMONGO_PROD_SERVER_URL = VITE_PAYMENT_PROD_SERVER_URL;

// Utility to determine if the deployment or compiled build is in Test / Sandbox mode
export const isSandboxMode = (): boolean => {
  if (typeof window !== "undefined") {
    // Force sandbox mode if the page URL includes ?sandbox=true or ?debug=true
    if (
      window.location.search.includes("sandbox=true") ||
      window.location.search.includes("debug=true")
    ) {
      return true;
    }
    // Automatically use sandbox if running on developer environments
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "10.0.2.2"
    ) {
      return true;
    }
  }
  // Try to read environment mode
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv.DEV) {
      return true;
    }
  } catch {}
  return false;
};

// Routing helper: formats local relative endpoint paths to fully resolved absolute routes on native APK wrappers
export const getApiUrl = (endpoint: string): string => {
  if (typeof window === "undefined") {
    return endpoint;
  }

  const isApkWebView =
    window.location.protocol.startsWith("file") ||
    window.location.protocol.startsWith("capacitor") ||
    window.location.protocol.startsWith("ionic") ||
    window.location.hostname === "";

  if (isApkWebView) {
    // If running in a webview context, check if we are debugging on device or emulator
    const sandbox = isSandboxMode();
    if (sandbox) {
      return `${VITE_PAYMENT_DEV_SERVER_URL.replace(/\/$/, "")}${endpoint}`;
    } else {
      return `${VITE_PAYMENT_PROD_SERVER_URL.replace(/\/$/, "")}${endpoint}`;
    }
  }

  // Otherwise, standard relative web routes work beautifully
  return endpoint;
};

export const isNativeSandboxMode = (): boolean => {
  return typeof __DEV__ !== "undefined" && __DEV__;
};

export const getNativeApiUrl = (endpoint: string): string => {
  // Deprecated: use src/native/apiBase.ts in React Native apps.
  const base = isNativeSandboxMode()
    ? VITE_PAYMENT_DEV_SERVER_URL
    : VITE_PAYMENT_PROD_SERVER_URL;
  return `${base.replace(/\/$/, "")}${endpoint}`;
};

// Client-side Fallback Bank & GCash Details
//
// If you want to accept direct local transfers in the compiled version,
// customize your bank account details and GCash number below.
export const BAKED_BANK_NAME = getEnv("VITE_BANK_NAME", "Security Bank");
export const BAKED_BANK_ACCOUNT_NAME = getEnv(
  "VITE_BANK_ACCOUNT_NAME",
  "Rafael Pascual",
);
export const BAKED_BANK_ACCOUNT_NUMBER = getEnv(
  "VITE_BANK_ACCOUNT_NUMBER",
  "0000030331538",
);
export const BAKED_GCASH_NUMBER = getEnv("VITE_GCASH_NUMBER", "09162052424");
export const BAKED_GCASH_NAME = getEnv("VITE_GCASH_NAME", "Rafael Pascual");
