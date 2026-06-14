const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const { join } = require("path");
const Jimp = require("jimp-compact");

const imagesDir = join(__dirname, "..", "src", "assets", "images");
const legacyLogo = join(imagesDir, "living_word_logo_1780587127782.png");
const legacyJpeg = join(imagesDir, "brand-logo.jpg");
const brandLogo = join(imagesDir, "brand-logo.png");
const assetsDir = join(__dirname, "..", "assets");
const iconPath = join(assetsDir, "icon.png");
const adaptiveIconPath = join(assetsDir, "adaptive-icon.png");

function resolveSourceLogo() {
  if (existsSync(legacyJpeg)) return legacyJpeg;
  if (existsSync(legacyLogo)) return legacyLogo;
  if (existsSync(brandLogo)) return brandLogo;
  return null;
}

async function createSquareIcon(image, size) {
  const side = Math.min(image.bitmap.width, image.bitmap.height);
  const x = Math.floor((image.bitmap.width - side) / 2);
  const y = Math.floor((image.bitmap.height - side) / 2);

  return image
    .clone()
    .crop(x, y, side, side)
    .resize(size, size, Jimp.RESIZE_BICUBIC);
}

async function writeCleanPng(image, outputPath) {
  await image.writeAsync(outputPath);
}

async function readSourceImage(sourcePath) {
  // Source may be JPEG data saved with a .png extension; read bytes directly.
  return Jimp.read(readFileSync(sourcePath));
}

async function main() {
  mkdirSync(assetsDir, { recursive: true });
  mkdirSync(imagesDir, { recursive: true });

  const sourcePath = resolveSourceLogo();
  if (!sourcePath) {
    if (existsSync(iconPath) && existsSync(adaptiveIconPath) && existsSync(brandLogo)) {
      console.log("Source logo missing; reusing existing generated assets.");
      return;
    }

    throw new Error(
      `Missing source logo. Add ${legacyJpeg}, ${legacyLogo}, or ${brandLogo} before building.`
    );
  }

  const source = await readSourceImage(sourcePath);

  const appLogo = await createSquareIcon(source, 512);
  await writeCleanPng(appLogo, brandLogo);
  console.log(`Wrote ${brandLogo}`);

  const icon = await createSquareIcon(source, 1024);
  await writeCleanPng(icon, iconPath);
  console.log(`Wrote ${iconPath}`);

  const adaptiveIcon = await createSquareIcon(source, 1024);
  await writeCleanPng(adaptiveIcon, adaptiveIconPath);
  console.log(`Wrote ${adaptiveIconPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
