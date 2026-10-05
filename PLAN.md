# Cadence: plan

A personal finance tracker that looks as good as Dime and does what Cashew does, without the clutter.
Rule for every feature: if it can't be done well, it doesn't ship.

## Stack decision

**Expo (React Native) + TypeScript, iOS first, Android from the same code later.**

No Mac is required at any stage:

| Step | How, from Linux |
|---|---|
| Write code | Any editor, `pnpm start` runs Metro locally |
| Run on iPhone, free | **Expo Go** (App Store) loads the app from your machine over Wi-Fi or `--tunnel` |
| Run on Android, free | Fully local: `expo run:android` or `eas build --local -p android` gives an APK |
| Standalone iPhone app | Needs the $99/yr Apple Developer account, then `eas build -p ios` on Expo's cloud Macs |
| Ship to the App Store | `eas build -p ios`, then `eas submit` |

**Constraint until the $99 account exists: stay Expo Go compatible.** Use only modules bundled in Expo Go (sqlite, Skia, Reanimated, haptics, symbols, local-authentication, etc.) and no custom native modules or widgets. Expo Go also only supports the latest SDK, so upgrade the SDK when it moves.

iOS can never be compiled locally on Linux, since Xcode only runs on macOS. A free workaround if needed: build an unsigned `.ipa` on a GitHub Actions macOS runner and sideload it with SideStore/AltStore using a free Apple ID (it must be re-signed every 7 days).

Why not the others:
- **Swift/SwiftUI**: needs Xcode, which only runs on a Mac. iOS only.
- **Flutter**: draws its own widgets instead of using iOS ones, which is part of why Cashew feels off. iOS builds still need a Mac or a cloud CI.
- **Kotlin/Compose Multiplatform**: the iOS side still needs Xcode.

The old React Native limits are mostly gone. The bridge is gone (New Architecture/JSI), and **Expo Modules** let you write a Swift/Kotlin module whenever something truly needs native code, with EAS compiling it. `@expo/ui` renders real SwiftUI and Jetpack Compose controls, and expo-router's native tabs use the real `UITabBar` with Liquid Glass.

## UI system ("shadcn for native")

- **React Native Reusables**: a shadcn/ui port. You copy components into `src/components/ui` and own them, the same as shadcn.
- **Tailwind styling** through Uniwind/NativeWind, which is what Reusables uses.
- **Native where it matters**: `@expo/ui` (SwiftUI pickers, menus, toggles, sheets), `NativeTabs`, `expo-symbols` (SF Symbols), `expo-glass-effect`.
- **Motion and feel**: Reanimated 4, `expo-haptics` on every commit action, Gesture Handler for swipe actions.
- **Charts**: Victory Native (Skia), which is smooth and fully themeable.
- **Lists**: FlashList / Legend List for long transaction histories.
- **Design tokens first**: one type scale, a 4pt spacing grid, a small color palette with real dark mode. Numbers use tabular figures. Design it in Figma before building it.

## Data

- Local-first: `expo-sqlite` + Drizzle ORM, with typed schema and migrations. No account and no server in v1.
- Money is stored as integer minor units plus a currency code. Floats are never used for money.
- Later: iCloud backup / encrypted sync. RevenueCat for the paywall.

## v1 scope (fixing what Dime and Cashew get wrong)

| Feature | Note |
|---|---|
| Transaction = **title + memo** + amount, category, account, date, tags | Dime has only a note field |
| **Split / breakdown**: one transaction across several categories | e.g. a supermarket bill split into food + household |
| **Insights**: category donut, monthly bars, trend line, tap to drill down | Dime has no charts |
| Budgets: overall + per category, with a calm progress UI | |
| Recurring & subscriptions, with an "upcoming" list | |
| Multiple accounts, transfers, multi-currency | Cashew-level depth with a cleaner UI |
| 3-second entry: custom keypad, smart category suggestions | The core loop |
| **Import from Dime and Cashew**, CSV export | Easy switching is a selling point |
| Face ID lock, privacy blur in the app switcher | |

Not doing: bank linking, gamification, a settings screen with 40 toggles (Cashew's trap).

## Navigation

Native tab bar: **Home**, **Activity**, **Insights**, **Budgets**, with a persistent **+** to add. Settings opens from the Home header. Add and edit are native sheets.

## Phases

0. **Setup**: Reusables + Tailwind, design tokens, fonts, SQLite/Drizzle, EAS dev build on your iPhone
1. **Ledger**: accounts, categories, add/edit/delete transactions, title+memo, splits
2. **Insights**: charts and breakdowns
3. **Budgets & recurring**
4. **Polish & ship**: onboarding, import, Face ID, paywall, TestFlight, then the App Store
5. **Android** pass, plus iOS widgets (`expo-apple-targets`, built on EAS)

## Licensing

Dime and Cashew are both **GPL-3.0**. They are cloned to `.reference/` (gitignored) for studying UX and features only. **Do not copy their code** into a paid closed-source app. The old Cadence web app was AGPL; this app starts as proprietary.

## Commands

```sh
pnpm install
pnpm start                 # Metro dev server
pnpm dlx eas-cli build --profile development -p ios   # one-time dev build for your iPhone
```
