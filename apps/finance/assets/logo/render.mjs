// Renders the logo SVGs from mark.mjs to the PNGs in assets/images. Run from the repo root:
//   node apps/finance/assets/logo/render.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import {
  androidBackground,
  androidForeground,
  androidMonochrome,
  appIcon,
} from "./mark.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const images = join(here, "..", "images");

const outputs = [
  { file: "icon.png", svg: appIcon(), size: 1024, opaque: true },
  { file: "favicon.png", svg: appIcon(), size: 196, opaque: true },
  { file: "android-icon-foreground.png", svg: androidForeground(), size: 1024 },
  { file: "android-icon-monochrome.png", svg: androidMonochrome(), size: 1024 },
  {
    file: "android-icon-background.png",
    svg: androidBackground(),
    size: 1024,
    opaque: true,
  },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const out of outputs) {
    writeFileSync(join(here, out.file.replace(".png", ".svg")), out.svg);
    await page.setViewportSize({ width: out.size, height: out.size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${out.svg.replace('width="1024" height="1024"', `width="${out.size}" height="${out.size}"`)}</body></html>`,
    );
    await page.screenshot({
      path: join(images, out.file),
      omitBackground: !out.opaque,
      clip: { x: 0, y: 0, width: out.size, height: out.size },
    });
    console.log(`wrote ${out.file}`);
  }
} finally {
  await browser.close();
}
