// Shared by the screenshot and e2e harnesses: web export, canvaskit wasm and a static server with COOP/COEP headers.
// Every harness takes `--app <name>` (default `finance`) and works inside apps/<name>.
import { execFileSync } from 'node:child_process';
import { copyFileSync, createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** Reads `--app <name>` from argv (also `--app=<name>`); returns `{ app, root }` where root is apps/<app>. */
export function resolveApp(argv = process.argv.slice(2)) {
  let app = 'finance';
  const i = argv.findIndex((a) => a === '--app' || a.startsWith('--app='));
  if (i !== -1) app = argv[i].includes('=') ? argv[i].split('=')[1] : argv[i + 1];
  const root = join(repoRoot, 'apps', app);
  if (!app || !existsSync(join(root, 'app.json'))) throw new Error(`unknown app "${app}" (no apps/${app}/app.json)`);
  return { app, root };
}

export const { app, root } = resolveApp();

/** Skia on web needs canvaskit.wasm in public/ (gitignored; same file `setup-skia-web` copies). */
export function ensureCanvaskit() {
  const wasmTarget = join(root, 'public/canvaskit.wasm');
  if (existsSync(wasmTarget)) return;
  mkdirSync(join(root, 'public'), { recursive: true });
  copyFileSync(createRequire(import.meta.url).resolve('canvaskit-wasm/bin/full/canvaskit.wasm'), wasmTarget);
}

export function exportWeb(exportDir) {
  ensureCanvaskit();
  execFileSync('pnpm', ['exec', 'expo', 'export', '--platform', 'web', '--output-dir', exportDir], { cwd: root, stdio: 'inherit' });
}

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.map': 'application/json',
};

/** Serves `exportDir` on a random local port; resolves `{ base, close }`. */
export async function serveWeb(exportDir) {
  const dist = join(root, exportDir);
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
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}
