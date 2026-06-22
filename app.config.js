const path = require("path");
const fs = require("fs");

// Load .env then .env.local (same order as Vite / dotenv conventions)
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({
  path: path.join(__dirname, ".env.local"),
  override: true,
});

function stripQuotes(value) {
  if (!value) return "";
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

const geminiApiKey = stripQuotes(
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "",
);

// Metro inlines EXPO_PUBLIC_* at bundle time — mirror GEMINI_API_KEY when unset
if (geminiApiKey && !process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
  process.env.EXPO_PUBLIC_GEMINI_API_KEY = geminiApiKey;
}

if (process.env.EAS_BUILD === "true" && !geminiApiKey) {
  console.warn(
    "[app.config] GEMINI_API_KEY is missing for this EAS build. Cloud AI will not work in the APK until you set it with: eas env:create --name GEMINI_API_KEY --value <key> --environment preview --environment production",
  );
}

const appJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "app.json"), "utf8"),
);

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    geminiApiKey,
  },
};
