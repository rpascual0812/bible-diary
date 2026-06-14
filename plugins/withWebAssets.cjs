const { cpSync, existsSync, mkdirSync, rmSync } = require("fs");
const { join } = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

const WEB_SRC = "assets/web";
const ANDROID_ASSET_DIR = join("app", "src", "main", "assets", "web");

function copyWebAssets(projectRoot, destinationRoot) {
  const source = join(projectRoot, WEB_SRC);
  const destination = join(destinationRoot, "web");

  if (!existsSync(source)) {
    throw new Error(
      `Missing ${WEB_SRC}. Run "npm run build:mobile" before prebuild.`
    );
  }

  if (existsSync(destination)) {
    rmSync(destination, { recursive: true, force: true });
  }

  mkdirSync(join(destinationRoot), { recursive: true });
  cpSync(source, destination, { recursive: true });
  console.log(`Copied ${WEB_SRC} to ${destination}`);
}

function withWebAssets(config) {
  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const { projectRoot, platformProjectRoot } = modConfig.modRequest;
      copyWebAssets(projectRoot, join(platformProjectRoot, "app", "src", "main", "assets"));
      return modConfig;
    },
  ]);

  config = withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const { projectRoot, platformProjectRoot, projectName } = modConfig.modRequest;
      copyWebAssets(projectRoot, join(platformProjectRoot, projectName));
      return modConfig;
    },
  ]);

  return config;
}

module.exports = withWebAssets;
