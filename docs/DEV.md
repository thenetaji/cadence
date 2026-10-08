# Dev notes

## Layout
```
apps/finance/        the Finance app: app.json, src/ (alias @/), assets/, drizzle/, public/, qa/, docs/
packages/config      @studio/config  tsconfig.base.json, babel, metro helper, eslint, jest helpers
packages/dates       @studio/dates   date keys, periods, labels
packages/money       @studio/money   minor-unit money, currencies, parsing, amount keypad reducer
packages/theme       @studio/theme   tokens, useTokens, theme preference, haptics, configureTheme()
packages/icons       @studio/icons   icon registry, tile styles, AppIcon, generator (scripts/build-icons.mjs)
packages/motion      @studio/motion  Reanimated primitives
packages/ui          @studio/ui      primitives + generic app components, toasts, cn()
packages/charts      @studio/charts  withSkia + pure maths; /components = Skia charts, load them
                                     lazily via withSkia (on web Skia must evaluate after CanvasKit loads)
packages/data        @studio/data    change tracking, useLiveData/useDb, DatabaseProvider, ids,
                                     /files (attachments, backups), /sync (Drive, iCloud stub)
tooling/qa           screenshot + e2e harness, compare-shots; apps keep routes/flows in apps/<app>/qa/
services/            reserved
```
Dependency direction (no cycles): config, then dates and money, then theme, then icons and motion, then ui and charts, then data. Apps depend on any of them; packages never import app code.

## Commands (pnpm only; there is no npm/npx, use `pnpm exec` / `pnpm dlx`)
From the repository root:
- `pnpm dev:finance` / `pnpm dev:flow` run the Expo dev server for Finance / Flow (`pnpm --filter finance exec expo start --tunnel` off the Wi-Fi)
- `pnpm verify` Turborepo: typecheck, lint, test and `bundle:ios` in every package and app
- `pnpm typecheck` | `pnpm lint` | `pnpm test` | `pnpm bundle:ios` each one on its own
- `pnpm e2e --app finance` web export to `apps/finance/.export-web-e2e`, then Playwright flows (`apps/finance/qa/e2e-flows.mjs`) at iPhone size, one fresh in-memory db per flow; failures save `apps/finance/.e2e/<n>-<flow>.png`. `E2E_SKIP_EXPORT=1` reuses the export, `E2E_ONLY=2,Budget` filters flows
- `pnpm screenshots --app finance` web export, then `apps/finance/.screenshots/<name>-<light|dark>.png` (393x852 @3x) for each route in `apps/finance/qa/screenshot-routes.json`; errors go to `console.log` there. `SHOTS_ONLY=home` filters, `SKIP_EXPORT=1` reuses the export
- `node tooling/qa/compare-shots.mjs <baselineDir> <newDir>` pixelmatch diff of two screenshot folders; reports any file over 0.5% of pixels
- `pnpm icons` regenerates `packages/icons/src/generated` and Finance's tab-bar PNGs/map (`--out`, `--tab-icons <app>`, `--tabs` options; `TAB_ICONS=0` skips the PNGs)
- `pnpm typegen --app finance` regenerates typed routes after adding a route file (only `expo start` writes them)

From `apps/finance`: `pnpm exec expo start`, `pnpm exec expo export --platform ios`, `pnpm db:generate` (drizzle-kit writes migrations into `apps/finance/drizzle/`), `pnpm run doctor` (expo-doctor; plain `pnpm doctor` is a pnpm builtin).

## Run an app on an iPhone
- Expo Go: run `pnpm dev:finance`, scan the QR code with the Camera app (same Wi-Fi), or use `--tunnel`. Works only while every native module the app uses is bundled in Expo Go.
- Own build: run the **Apps** workflow (`.github/workflows/apps.yml`, about 7 minutes per platform; a `<app>-v1.2.3` tag also publishes a Release and the SideStore source), install the IPA with SideStore (`apps/finance/docs/SIDELOAD.md`, `apps/flow/docs/INSTALL.md`). Apps with `expo-dev-client` then load JS changes from Metro; rebuild only when native modules change.

## How the monorepo is wired
- **Packages are TypeScript source** (`"main": "src/index.ts"` plus `exports`). Nothing is built; Metro, jest and tsc read the source.
- **Metro**: `@studio/config/metro` wraps `expo/metro-config` (Expo detects the pnpm monorepo: watch folders and node_modules lookup) and adds wasm/sql extensions, the COOP/COEP dev headers and Uniwind's wrapper. An app's `metro.config.js` is a call to `createMetroConfig(__dirname, { cssEntryFile, dtsFile })`.
- **Babel**: `@studio/config/babel` is the only config (babel-preset-expo: React Compiler from `experiments.reactCompiler`, Reanimated/worklets plugin; inline-import for `.sql`). Babel only reads a root config from the directory it starts in, so each app and each package with tests has a one-line `babel.config.js` that re-exports it. Package files are compiled by the app's Babel run because their real paths are outside node_modules.
- **Uniwind / Tailwind 4**: Uniwind compiles the app's CSS entry with Tailwind's scanner. `apps/*/src/global.css` has `@source '../../../packages/*/src/**/*.{ts,tsx}';` (a bare directory glob like `packages/*/src` matches nothing) so classes used inside packages are generated. Theme variables (`--bg`, `--tint`, `--cat-*`) stay in the app's `global.css`; `configureTheme()` mirrors an accent override on the JS side.
- **Jest**: each project has a `jest.config.js` from `createJestConfig`, which makes jest-expo transform `@studio/*` and `uniwind` (symlinked into node_modules). Tests live with their code. Keep Skia out of pure tests: import chart maths from `@studio/charts/lib`.
- **TypeScript**: every package's `tsconfig.json` extends `@studio/config/tsconfig.base.json` and includes `uniwind-env.d.ts` for `className` typings. Typed routes (`.expo/types`) and the generated `src/uniwind-types.d.ts` stay in the app.
- **pnpm**: `.npmrc` keeps `node-linker=hoisted`; `patchedDependencies` (expo-sqlite) is in the root `pnpm-workspace.yaml`. Packages list the libraries they import as `peerDependencies`; the app owns the versions.

## Adding things
- **A package**: copy an existing one's `package.json`, `tsconfig.json`, `babel.config.js`, `jest.config.js`, `eslint.config.js`; add `"@studio/<name>": "workspace:*"` to the consuming app; `pnpm install`.
- **An app**: `apps/<name>` with its own `app.json`, config re-exports, `qa/screenshot-routes.json` and `qa/e2e-flows.mjs`; the harness takes `--app <name>`. Add it to the `app` input options and tag patterns in `.github/workflows/apps.yml` if it should build.

## Styling
Uniwind 1.x + Tailwind 4 + React Native Reusables (`components.json`, `cn()` from `@studio/ui`): chosen over NativeWind (v4 is Tailwind 3 and stale; v5 still pre-release) because Uniwind is pure JS/Metro with no native module, so it runs in Expo Go and tracks the system scheme. `src/uniwind-types.d.ts` is generated by Metro; commit it.

## Native modules
Add native dependencies with `pnpm exec expo install` inside the app so versions match the SDK. Any native module is allowed; one outside `node_modules/expo/bundledNativeModules.json` means the app no longer runs in Expo Go and needs its own build.

## expo-sqlite on web
Needs wasm in Metro `assetExts` and COOP/COEP headers; set in `@studio/config/metro` and the screenshot server. Skia on web needs `public/canvaskit.wasm` and the chart fonts in the app's `public/` (gitignored wasm is copied by the harness).
