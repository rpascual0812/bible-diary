const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Match app.config.js so Metro can inline EXPO_PUBLIC_GEMINI_API_KEY in the bundle.
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({
  path: path.join(__dirname, ".env.local"),
  override: true,
});

const geminiApiKey =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
if (geminiApiKey && !process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
  process.env.EXPO_PUBLIC_GEMINI_API_KEY = geminiApiKey;
}

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  punycode: path.resolve(__dirname, "node_modules/punycode"),
};

module.exports = config;
