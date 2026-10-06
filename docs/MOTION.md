# Motion

All primitives live in `src/motion/` (import from `@/motion/...`). Everything runs on the UI thread (shared values, animated styles, Skia derived values) and honours Reduce Motion (instant, no choreography). Rules: no JS-thread loops, no per-frame renders; entrances play on first mount only.

## Primitives
| Primitive | Use |
|---|---|
| `enteringFor(index)` / `<Stagger index>` | Cards and sections: fade + 12 pt rise on `motion.springs.enter`, 35 ms apart, first 10 only (later siblings appear instantly). |
| `AnimatedNumber` (`CountUp` = `intro`) | Odometer: each digit column springs (`roll`, clamped) to its digit; symbol, separators and sign stay put. `align="right"` for values that change period, `align="left"` + `dropNew` for typing. `fit` shrinks to width. Via `<Amount animate | animate="intro">`. Web renders plain text. Not for long lists. |
| `usePopValue` / `<Pop>` / `Pressable popWhen` | Selection bounce 1 to 1.08 to 1. |
| `Pressable holdScale` | Press-and-hold expands (Add pill before its menu). |
| `<Shimmer active>` | One brass sweep over the parent (inserted row). Parent needs `overflow: hidden`. |
| `EntryTracker` | Decides which list rows animate: first screenful staggers, a single later id springs in + shimmers, bulk changes and recycling animate nothing. |
| `registerCollapse` / `collapseThen` | Delete collapses the row (height + fade) before the real delete; undo re-inserts via the tracker. |
| `<FocusFx>` | Tab content crossfade/rise each time a kept-mounted screen regains focus. |
| `<Float>` | 3 s loop, 3 pt drift (empty-state icon). |
| `useScrollY` + `useScrollFx` | `headerStyle` fades in, `heroStyle` scales/fades, `parallaxStyle` trails. |
| `useAnimatedTextColor` | Colour crossfade (Remaining to warning). |
| `buildPolyPath` / `pointAt` | Position along a line by fraction (comet). |

## Timing and springs (`motion` in `tokens.ts`)
Durations: press 120, chip/progress 200, fade/row 250, count-up/chart grow 400, line draw 700, shimmer 700, float 3000.
Springs: `enter` 18/210/0.9, `roll` 18/130 (clamped), `drop` 14/320/0.7, `pop` 10/420/0.6, `chart` 17/150, `toast` 12/190/0.9, `morph` 11/260/0.7, `fill` 20/120, plus theme `press`, `layout`, `sheetChip`.

## Where it is applied
Charts: bars stagger-grow and spring to new heights; donut sweeps on mount and re-sweeps when data changes; pace line draws in over 700 ms with a glowing comet and one end-dot pulse; scrub label springs between bars (haptic tick per bar). Rows: swipe icons scale in with a tick at the reveal threshold. Keypad Save morphs to a check with a success haptic. Toasts spring in and swipe down to dismiss.

## Home (rebuild) cheat sheet
- Hero: `<Amount variant="hero" animate="intro" value=... />` (rolls on mount and on every change).
- Spend curve: `PaceChart` already draws in (700 ms) with comet and pulse; nothing to add.
- Cards: wrap each in `<Stagger index={n}>`; do not wrap FlashList rows, use `TransactionDayList` or `EntryTracker`.
- Tab focus: root `<FocusFx className="flex-1 bg-bg">`. Progress bars (`ProgressBar`) spring and slide the pace marker on their own. Stat figures: `<AnimatedNumber variant="headline" fit />`.
