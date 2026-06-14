const { execSync } = require("child_process");

if (process.env.EAS_BUILD !== "true") {
  process.exit(0);
}

console.log("EAS build detected: normalizing PNG assets and Expo icons...");
execSync("node scripts/generate-expo-icons.cjs", { stdio: "inherit" });
