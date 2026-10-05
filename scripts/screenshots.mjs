// Web screenshot harness: export web, serve with COOP/COEP, shoot each route in light + dark.
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
// SHOTS_EXPORT_DIR / SHOTS_OUT let parallel runs use separate folders; SHOTS_ONLY filters routes by name prefix.
const exportDir = process.env.SHOTS_EXPORT_DIR ?? '.export-web';
const dist = join(root, exportDir);
const outDir = join(root, process.env.SHOTS_OUT ?? '.screenshots');
const only = process.env.SHOTS_ONLY?.split(',').map((s) => s.trim()).filter(Boolean);
const routes = JSON.parse(readFileSync(join(root, 'scripts/screenshot-routes.json'), 'utf8')).filter(
  (r) => !only || only.some((prefix) => r.name.startsWith(prefix)),
);

if (!process.env.SKIP_EXPORT) {
  execFileSync('pnpm', ['exec', 'expo', 'export', '--platform', 'web', '--output-dir', exportDir], {
    cwd: root,
    stdio: 'inherit',
  });
}

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.map': 'application/json',
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const candidates = [join(dist, rel), join(dist, rel + '.html'), join(dist, rel, 'index.html')];
  let file = candidates.find((f) => existsSync(f) && statSync(f).isFile());
  if (!file) file = join(dist, 'index.html'); // SPA fallback
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

if (!only) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const log = [];
let failed = false;
const browser = await chromium.launch();
try {
  for (const scheme of ['light', 'dark']) {
    for (const route of routes) {
      const context = await browser.newContext({
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        colorScheme: scheme,
      });
      const page = await context.newPage();
      const tag = `${route.name}-${scheme}`;
      page.on('console', (m) => {
        if (m.type() === 'error') log.push(`[${tag}] console.error: ${m.text()}`);
      });
      page.on('pageerror', (e) => {
        failed = true;
        log.push(`[${tag}] PAGEERROR: ${e.stack ?? e.message}`);
      });
      await page.goto(base + route.path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(Number(process.env.SHOT_DELAY ?? 2500));
      if (route.fullPage === true) {
        const height = await page.evaluate(() =>
          Math.max(...Array.from(document.querySelectorAll('*'), (el) => el.scrollHeight)),
        );
        await page.setViewportSize({ width: 393, height: Math.min(Math.max(height, 852), 16000) });
        await page.waitForTimeout(300);
      }
      await page.screenshot({ path: join(outDir, `${tag}.png`) });
      console.log(`shot ${tag}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
  writeFileSync(join(outDir, 'console.log'), log.join('\n') + (log.length ? '\n' : ''));
}
if (log.length) console.log(`console output (${log.length} lines) in .screenshots/console.log`);
if (failed) {
  console.error('Uncaught page errors detected');
  process.exit(1);
}
