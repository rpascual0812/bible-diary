const { cpSync, existsSync, mkdirSync, rmSync } = require("fs");
const { join } = require("path");

const distDir = join(__dirname, "..", "dist");
const assetsDir = join(__dirname, "..", "assets", "web");

if (!existsSync(distDir)) {
  console.error("Missing dist/. Run `npm run build` first.");
  process.exit(1);
}

if (existsSync(assetsDir)) {
  rmSync(assetsDir, { recursive: true, force: true });
}

mkdirSync(assetsDir, { recursive: true });
cpSync(distDir, assetsDir, { recursive: true });
console.log(`Copied web build to ${assetsDir}`);
