// Compares two screenshot folders pixel by pixel.
// Usage: node tooling/qa/compare-shots.mjs <baselineDir> <newDir> [--threshold 0.5] [--diff <outDir>]
// Reports every PNG whose differing pixels exceed the threshold (percent of all pixels); exits 1 if any does.
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  return args.splice(i, 2)[1];
};
const threshold = Number(flag("--threshold", "0.5"));
const diffDir = flag("--diff", null);
const [baseDir, newDir] = args;
if (!baseDir || !newDir) {
  console.error(
    "usage: compare-shots.mjs <baselineDir> <newDir> [--threshold 0.5] [--diff <outDir>]",
  );
  process.exit(2);
}
if (diffDir) mkdirSync(diffDir, { recursive: true });

const names = readdirSync(baseDir)
  .filter((f) => f.endsWith(".png"))
  .sort();
const extra = readdirSync(newDir).filter(
  (f) => f.endsWith(".png") && !names.includes(f),
);
let over = 0;
let identical = 0;
const rows = [];
for (const name of names) {
  if (!existsSync(join(newDir, name))) {
    rows.push({ name, pct: 100, note: "missing in new set" });
    over++;
    continue;
  }
  const a = PNG.sync.read(readFileSync(join(baseDir, name)));
  const b = PNG.sync.read(readFileSync(join(newDir, name)));
  if (a.width !== b.width || a.height !== b.height) {
    rows.push({
      name,
      pct: 100,
      note: `size ${a.width}x${a.height} vs ${b.width}x${b.height}`,
    });
    over++;
    continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const count = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold: 0.1,
  });
  const pct = (count / (a.width * a.height)) * 100;
  if (count === 0) identical++;
  else if (diffDir) writeFileSync(join(diffDir, name), PNG.sync.write(diff));
  if (pct > threshold) over++;
  if (count > 0) rows.push({ name, pct, note: `${count} px` });
}
for (const r of rows.sort((x, y) => y.pct - x.pct)) {
  console.log(
    `${r.pct > threshold ? "OVER" : "ok  "} ${r.pct.toFixed(3).padStart(7)}%  ${r.name}  ${r.note}`,
  );
}
for (const f of extra) console.log(`EXTRA ${f}`);
console.log(
  `\n${names.length} baseline shots: ${identical} pixel-identical, ${rows.length - over} within ${threshold}%, ${over} over`,
);
process.exit(over || extra.length ? 1 : 0);
