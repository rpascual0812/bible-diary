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

// Standalone Google Play APK - Baked API Key Configuration
//
// If you are compiling this application as an offline Android APK for personal use
// or release on Google Play, paste your Gemini API Key in the constant below.
// This will package the key directly into the application's built asset package
// so that your app's end-users do not have to copy-paste or configure any API keys.
//
// To obtain a free API key, visit: https://aistudio.google.com/
export const BAKED_GEMINI_API_KEY = getEnv("GEMINI_API_KEY", "");

// PayMongo Secret Key Configuration
//
// If you want to accept digital offerings, paste your PayMongo Secret Key below.
// This is used for server-side checkout session creation on the server.
// You can get this from your PayMongo Dashboard -> Developers -> API Keys.
export const BAKED_PAYMONGO_SECRET_KEY = getEnv("PAYMONGO_SECRET_KEY", "");

// PayMongo Public Key Configuration (Optional)
//
// If you want to register or pack your Public API Key as well, you may paste it below.
// For Checkout Session creation, only secret key authentication is strictly required.
export const BAKED_PAYMONGO_PUBLIC_KEY = getEnv("PAYMONGO_PUBLIC_KEY", "");

// PayMongo Sandbox/Test Key Configuration for Debugging and local testing (Optional)
//
// Use these test keys during development/debugging or if compiling a Debug APK
// to avoid sending real money transactions. Standard sandbox test card figures can be used.
export const BAKED_PAYMONGO_TEST_SECRET_KEY = getEnv(
  "PAYMONGO_TEST_SECRET_KEY",
  "",
); // Fallback Sandbox Developer Key
export const BAKED_PAYMONGO_TEST_PUBLIC_KEY = getEnv(
  "PAYMONGO_TEST_PUBLIC_KEY",
  "",
);

// APK API Access configurations
//
// In standard web environments, relative paths like /api/... work perfectly.
// However, when compiled as an Android APK (running via localized file:// or capacitor:// origins),
// relative routes cannot resolve. We dynamically direct them to the appropriate endpoint.
export const VITE_PAYMONGO_DEV_SERVER_URL = getEnv(
  "VITE_PAYMONGO_DEV_SERVER_URL",
  "http://10.0.2.2:3000",
); // 10.0.2.2 points to local machine host from Android Emulator
export const VITE_PAYMONGO_PROD_SERVER_URL = getEnv(
  "VITE_PAYMONGO_PROD_SERVER_URL",
  "https://ais-pre-vjag2towx5cl3hqsbscjzz-453758756696.asia-southeast1.run.app",
);

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
      return `${VITE_PAYMONGO_DEV_SERVER_URL.replace(/\/$/, "")}${endpoint}`;
    } else {
      return `${VITE_PAYMONGO_PROD_SERVER_URL.replace(/\/$/, "")}${endpoint}`;
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
    ? VITE_PAYMONGO_DEV_SERVER_URL
    : VITE_PAYMONGO_PROD_SERVER_URL;
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
