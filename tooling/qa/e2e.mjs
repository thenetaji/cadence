// End-to-end functional tests against the web export (the only way to exercise real flows without a device).
// Usage: pnpm e2e --app finance            export + serve + run every flow
//        E2E_SKIP_EXPORT=1 pnpm e2e         reuse .export-web-e2e
//        E2E_ONLY=2,5 pnpm e2e              run only flows whose number or name matches
// Every flow gets a fresh browser context, so a fresh in-memory database.
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

import { pathToFileURL } from "node:url";

import { exportWeb, root, serveWeb } from "./web-server.mjs";

// Each app keeps its own flows in apps/<app>/qa/e2e-flows.mjs.
const { flows } = await import(
  pathToFileURL(join(root, "qa/e2e-flows.mjs")).href
);

const exportDir = process.env.E2E_EXPORT_DIR ?? ".export-web-e2e";
const outDir = join(root, ".e2e");
const only = process.env.E2E_ONLY?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const started = Date.now();

if (!process.env.E2E_SKIP_EXPORT) exportWeb(exportDir);
const { base, close } = await serveWeb(exportDir);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const results = [];
try {
  for (const [index, flow] of flows.entries()) {
    const id = String(index + 1);
    if (
      only &&
      !only.some(
        (o) => o === id || flow.name.toLowerCase().includes(o.toLowerCase()),
      )
    )
      continue;
    const t0 = Date.now();
    const extra = [];
    const newContext = async () => {
      const created = await browser.newContext({
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        acceptDownloads: true,
      });
      created.setDefaultTimeout(30000);
      return created;
    };
    const context = await newContext();
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    /** A second fresh database (new context + page) for flows that move data between two installs. */
    const freshPage = async () => {
      const created = await newContext();
      extra.push(created);
      const second = await created.newPage();
      second.on("pageerror", (e) => pageErrors.push(e.message));
      return second;
    };
    let status = "pass";
    let reason = "";
    try {
      if (flow.skip) {
        status = "skip";
        reason = flow.skip;
      } else {
        await flow.run({ page, base, context, freshPage });
        if (pageErrors.length)
          throw new Error(`uncaught page error: ${pageErrors[0]}`);
      }
    } catch (error) {
      status = "fail";
      reason = String(error?.message ?? error)
        .split("\n")
        .slice(0, 4)
        .join(" | ");
      await page
        .screenshot({
          path: join(outDir, `${id}-${flow.name.replace(/\W+/g, "-")}.png`),
        })
        .catch(() => undefined);
    }
    await context.close();
    for (const c of extra) await c.close();
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    results.push({ id, name: flow.name, status });
    console.log(
      `${status.toUpperCase().padEnd(4)} ${id.padStart(2)} ${flow.name} (${secs}s)${reason ? `: ${reason}` : ""}`,
    );
  }
} finally {
  await browser.close();
  close();
}
const count = (s) => results.filter((r) => r.status === s).length;
console.log(
  `\n${count("pass")} passed, ${count("fail")} failed, ${count("skip")} skipped in ${((Date.now() - started) / 1000).toFixed(0)}s`,
);
process.exit(count("fail") ? 1 : 0);
