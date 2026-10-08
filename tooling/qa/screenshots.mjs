// Web screenshot harness: export web, serve with COOP/COEP, shoot each route in light + dark.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

import { ensureCanvaskit, exportWeb, root, serveWeb } from "./web-server.mjs";

// SHOTS_EXPORT_DIR / SHOTS_OUT let parallel runs use separate folders; SHOTS_ONLY filters routes by name prefix.
const exportDir = process.env.SHOTS_EXPORT_DIR ?? ".export-web";
const outDir = join(root, process.env.SHOTS_OUT ?? ".screenshots");
const only = process.env.SHOTS_ONLY?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const routes = JSON.parse(
  readFileSync(join(root, "qa/screenshot-routes.json"), "utf8"),
).filter((r) => !only || only.some((prefix) => r.name.startsWith(prefix)));

if (!process.env.SKIP_EXPORT) exportWeb(exportDir);
else ensureCanvaskit();

const { base, close: closeServer } = await serveWeb(exportDir);

if (!only) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const log = [];
let failed = false;
const browser = await chromium.launch();
try {
  for (const scheme of ["light", "dark"]) {
    for (const route of routes) {
      const context = await browser.newContext({
        viewport: { width: 393, height: route.height ?? 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        colorScheme: scheme,
      });
      const page = await context.newPage();
      const tag = `${route.name}-${scheme}`;
      page.on("console", (m) => {
        if (m.type() === "error")
          log.push(`[${tag}] console.error: ${m.text()}`);
      });
      page.on("pageerror", (e) => {
        failed = true;
        log.push(`[${tag}] PAGEERROR: ${e.stack ?? e.message}`);
      });
      await page.goto(base + route.path, { waitUntil: "networkidle" });
      // Optional per-route text to wait for (slow Skia/CanvasKit screens).
      if (route.waitFor)
        await page
          .waitForFunction(
            (t) => document.body.innerText.includes(t),
            route.waitFor,
            { timeout: 30000 },
          )
          .catch(() => undefined);
      // Demo seeding blocks the main thread for a while on slow machines; wait until the app has rendered text.
      await page
        .waitForFunction(
          () => document.body.innerText.trim().length > 10,
          null,
          { timeout: 180000 },
        )
        .catch(() => undefined);
      await page.waitForTimeout(Number(process.env.SHOT_DELAY ?? 2500));
      if (route.fullPage === true) {
        const height = await page.evaluate(() =>
          Math.max(
            ...Array.from(
              document.querySelectorAll("*"),
              (el) => el.scrollHeight,
            ),
          ),
        );
        await page.setViewportSize({
          width: 393,
          height: Math.min(Math.max(height, 852), 16000),
        });
        await page.waitForTimeout(300);
      }
      await page.screenshot({
        path: join(outDir, `${tag}.png`),
        timeout: 180000,
      });
      console.log(`shot ${tag}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  closeServer();
  writeFileSync(
    join(outDir, "console.log"),
    log.join("\n") + (log.length ? "\n" : ""),
  );
}
if (log.length)
  console.log(
    `console output (${log.length} lines) in .screenshots/console.log`,
  );
if (failed) {
  console.error("Uncaught page errors detected");
  process.exit(1);
}
