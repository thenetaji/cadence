# Finance

A local-first expense tracker for iPhone. It has Dime's calm interface plus the depth Dime lacks: title and memo, split transactions, charts and breakdowns, budgets, recurring payments, multiple accounts and currencies.

"Finance" is a working name. The shortlist and how each name was checked are in `docs/SPEC.md` §Name. Renaming means changing `app.json` → `expo.name` and `APP_NAME` in `src/constants/app.ts`.

## Run it on your iPhone

1. Install **Expo Go** from the App Store.
2. On this machine:
   ```sh
   pnpm install
   pnpm start            # same Wi-Fi as the phone
   pnpm start --tunnel   # from anywhere
   ```
3. Scan the QR code with the iPhone Camera.

No Mac and no Apple Developer account are needed for this. Your data stays on the phone, in SQLite.

**Demo data**: in a dev build, open Settings → About → Load demo data to load six months of realistic entries.

## What's in v1

| Area | Features |
|---|---|
| Entry | Custom keypad with + and −, title memory (fills category and account), recent categories, title + memo, splits across categories, transfers including cross-currency, repeat rules |
| Activity | Day-grouped ledger, month picker, filters, search by text or amount, swipe to delete (with undo) or duplicate |
| Insights | Category donut, daily/monthly bars with scrubbing, week/month/year/custom periods, category drill-down |
| Budgets | Overall and per-category budgets, weekly/monthly/yearly, with a pace chart |
| Recurring | Rules with an upcoming list, auto-post, post now, skip |
| Accounts | Cash/bank/card, per-account currency, manual exchange rates, reorder, archive |
| Data | CSV export, import from Dime, Cashew or our own CSV |
| Privacy | Face ID lock, app-switcher privacy cover |

## Project

- `docs/SPEC.md`: the product and design contract (screens, data model, tokens, copy).
- `docs/RESEARCH.md`: what users praise and hate in Dime, Cashew and the best trackers.
- `docs/CONVENTIONS.md`: engineering rules.
- `docs/DEV.md`: commands.
- `docs/QA.md`: the screen-by-screen checklist.
- Stack: Expo SDK 57, expo-router with native tabs, TypeScript strict, Uniwind + React Native Reusables, expo-sqlite + Drizzle, Skia charts, Reanimated, FlashList.
- `pnpm verify` runs typecheck, lint, tests and the iOS bundle. `pnpm screenshots` renders every screen in light and dark for review.

## Before the App Store

- A real support address in `FEEDBACK_EMAIL` (`src/constants/app.ts`).
- The final name and app icon.
- The Apple Developer account, then `eas build -p ios` and `eas submit`.

Dime and Cashew are GPL-3.0. They're cloned to `.reference/` (gitignored) for studying UX only; no code from them is used.
