// Regenerates an app's typed routes: Expo only writes them while the dev server runs, so start it briefly.
// Usage: pnpm typegen --app finance
import { spawnSync } from "node:child_process";

import { resolveApp } from "./web-server.mjs";

const { root } = resolveApp();
spawnSync("pnpm", ["exec", "expo", "start", "--port", "8097"], {
  cwd: root,
  env: { ...process.env, CI: "1" },
  stdio: "ignore",
  timeout: 75000,
});
