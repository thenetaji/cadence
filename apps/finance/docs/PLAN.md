# Plan

A personal finance tracker that looks as good as Dime and does what Cashew does, without the clutter. One of each concept, each done well. If a feature can't be done well, it doesn't ship.

The build contract is **`SPEC.md`** (scope, navigation, every screen, data model, design tokens, copy, charts, accessibility, phases). The reasoning behind it is in **`RESEARCH.md`**. The working name "Cadence" is taken; the spec's §Name shortlists replacements, with **Finance** as the pick.

## Stack (fixed)

- Expo SDK 57, React Native 0.86, TypeScript strict, expo-router (file routes in `src/app`, native tabs).
- Runs in **Expo Go** today (no custom native modules yet). Native modules are allowed; the IPA comes from the iOS workflow and SideStore. Expo Go supports only the latest SDK, so upgrade when it moves.
- UI: Tailwind 4 via Uniwind + React Native Reusables (components owned in `src/components/ui`). SF Symbols via expo-symbols with a MaterialIcons fallback on Android.
- Data: local-first, expo-sqlite + Drizzle ORM. Money is integer minor units + ISO currency code. No server, no accounts, no bank linking.
- Charts: hand-built on @shopify/react-native-skia (donut, bars with scrub and outlier clipping, pace line). Motion: Reanimated 4 + Gesture Handler. Haptics: expo-haptics. Lock: expo-local-authentication. Lists: FlashList.
- iOS first; Android must render sensibly.

No Mac is needed: Metro runs on Linux, Expo Go loads the app on the iPhone over Wi-Fi or `--tunnel`. A standalone iOS build comes from the GitHub iOS workflow (unsigned IPA, signed on the phone by SideStore).

## v1 in one line each

Title + memo · splits · custom keypad with title memory · accounts and transfers · per-account currency with manual rates · activity with search and filters · insights (donut, bars, drill-down) · budgets with pace · one recurring rule type with upcoming/skip · CSV export and Dime/Cashew import · Face ID + privacy blur · light/dark.

Not in v1: bank linking, sync, widgets, goals, loans, shared budgets, notifications, a settings page with more than 14 rows.

## Navigation

Native tabs **Home · Activity · Insights · Budgets**, a floating **+** that opens the add sheet, Settings as a modal stack from the Home header. Add/edit are form sheets. Each tab root has its own small stack for the native large-title header; details push on the root stack, so the tab bar hides on push.

## Phases (details and acceptance criteria in SPEC §8)

1. Foundation: tokens, theme, schema + seed + repositories, money formatting, route skeleton.
2. Ledger: add/edit sheet (keypad, title memory, splits, transfers), Activity, detail, search, Home.
3. Insights: donut, bars, scrub, period stepper, category drill-down.
4. Budgets, recurring engine, accounts, transfers, display currency.
5. Settings, categories manager, CSV export/import, Face ID lock, privacy blur.
6. Polish: haptics, motion, Dynamic Type, VoiceOver, large amounts, empty states, Android pass, QA checklist.

## Licensing

Dime and Cashew are **GPL-3.0**, cloned to `.reference/` (gitignored) for studying UX and features only. **Never copy their code.** This app is proprietary.

## Commands

See `../../docs/DEV.md`. The short version: `pnpm dev:finance` (repo root) to run in Expo Go, `pnpm verify` before committing.
