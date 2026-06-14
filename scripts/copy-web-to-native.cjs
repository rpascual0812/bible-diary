const { cpSync, existsSync, mkdirSync, rmSync } = require("fs");
const { join } = require("path");

const root = join(__dirname, "..");
const webSrc = join(root, "assets", "web");

if (!existsSync(webSrc)) {
  console.error("Missing assets/web. Run npm run build:mobile first.");
  process.exit(1);
}

function copyTo(destinationRoot) {
  const destination = join(destinationRoot, "web");

  if (existsSync(destination)) {
    rmSync(destination, { recursive: true, force: true });
  }

  mkdirSync(destinationRoot, { recursive: true });
  cpSync(webSrc, destination, { recursive: true });
  console.log(`Copied web bundle to ${destination}`);
}

const androidAssetsRoot = join(root, "android", "app", "src", "main", "assets");
if (existsSync(join(root, "android"))) {
  copyTo(androidAssetsRoot);
}

const iosRoot = join(root, "ios");
if (existsSync(iosRoot)) {
  const iosProjects = require("fs")
    .readdirSync(iosRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."));

  for (const project of iosProjects) {
    const candidate = join(iosRoot, project.name);
    if (existsSync(join(candidate, `${project.name}.xcodeproj`))) {
      copyTo(candidate);
      break;
    }
  }
}
