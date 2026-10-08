# studio

A monorepo for consumer apps (iOS and Android through Expo) that share code. Each app is a thin product layer over shared packages for UI, theme, motion, charts, money, dates and data plumbing.

```
apps/        the apps (finance)
packages/    TypeScript-source workspace packages (@studio/*), no build step
services/    backend services shared by the apps (empty for now)
tooling/     the screenshot and end-to-end harness
docs/        studio-wide conventions, dev notes, motion and art direction
```

## Quick start

```sh
pnpm install              # pnpm 10 only; node-linker=hoisted (see .npmrc)
pnpm dev:finance          # Expo dev server for apps/finance; scan the QR code with Expo Go
pnpm verify               # typecheck + lint + test + iOS bundle, all packages and apps (Turborepo)
pnpm e2e --app finance    # Playwright flows against the web export
pnpm screenshots --app finance
```

Start with `docs/DEV.md` (commands, layout, where code goes) and `docs/CONVENTIONS.md` (binding rules). Finance's own docs are in `apps/finance/docs/`.
