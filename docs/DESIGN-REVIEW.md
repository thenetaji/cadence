# Design review: Phases 1–5

Scope: every route in `scripts/screenshot-routes.json`, light and dark, from `.review/sheets/*` and `.screenshots/*`. Web-only artefacts (JS header/tab bar, Material glyphs, 1 px hairlines, non-shrinking heroes) are ignored. Items are tagged **P0** (broken or confusing), **P1** (below the premium bar), **P2** (refinement). "Spec" = `docs/SPEC.md`; where a fix amends the spec it says so.

## 1. Verdict

The bones are right: one type scale, one row anatomy, calm colour, real charts, and dark mode that is genuinely designed rather than inverted. It already beats Cashew on clarity and Dime on depth. What separates it from Copilot-level polish is discipline, not features: signs and decimals differ between heroes, two period-navigation idioms, chips doing the job of segmented controls, "Edit" living in three different places, and a few screens (Insights, Add) where the thing the user came for sits below the fold or off the right edge. Fix the cross-cutting rules in §2 first; most per-screen items fall out of them.

## 2. Cross-cutting issues

| # | Issue | Seen in | Rule to apply everywhere |
|---|---|---|---|
| C1 | **Signs on labelled figures.** Home and Activity strips show `−₹47,804` / `+₹1,45,000`; Insights hero, Budgets card and Activity-filtered `₹0` show none. | `home`, `activity`, `activity-filtered`, `insights`, `budgets` | A sign appears only where the label does not already give direction: transaction rows, day totals, net balances (`−` when negative). Labelled figures (Spent, Earned, Total, Balance, "₹x of ₹y") carry no sign; income keeps the `income` tone. Amends spec §3.2/§3.3 (`sign: 'none'` in `MonthCard` and `SummaryStrip`). |
| C2 | **Decimals.** Home balance `₹8,07,855`, Accounts total `₹8,07,855`, but Account detail hero `₹6,50,587.00` with "Show decimals" off. | `account-detail` vs `home`, `accounts` | Lists and heroes follow `show_decimals`. Only the transaction detail amount, split lines on detail, and entry readouts always show minor units. Pass `decimals` to `formatMoney` in `accounts/detail-screen.tsx:65`. |
| C3 | **Card vs plain list.** Full-bleed rows: Activity, Search, Account detail, Category, Budget detail. Inset cards: Home, Recurring, Accounts, Budgets, Insights list. | all list screens | Keep, but make it a rule: unbounded ledgers (day-grouped, FlashList) are full-bleed with `bg` day headers; bounded summaries (≤ 30 rows, no day headers) are inset cards. Never mix on one screen. |
| C4 | **Row trailing meta.** Day-grouped lists show the date in the trailing slot (`4 Oct`, `Yesterday`) under a day header that already says it. | `account-detail`, `budget-detail`, `budget-detail-overall` | Day-grouped list → time (`09:00`). Ungrouped list (Home Recent, Upcoming) → relative date (`Yesterday`, `Mon 12 Oct`). `TransactionRow` takes `meta: 'time' \| 'date'`; day lists always pass `'time'`. `category-top` already does this. |
| C5 | **Section header styles.** Two legitimate styles exist (headline 17/600 for content sections; footnote secondary for grouped-form labels) but Export puts "Range" inside the card as a row label while "Accounts" is a footnote header outside. | `settings-export`, `detail-split` ("Split"), `recurring` | Content sections on tab/push screens: `SectionHeader` (headline, optional accent action). Grouped forms and settings: footnote secondary label 8 pt above the card, never inside it. Rhythm: 24 pt from previous card to header, 8 pt from header to card. |
| C6 | **Two-option pickers rendered as chips.** Scope `All spending \| Categories` and Kind `Expense \| Income` are chips; Period, Type, Ends, Repeat are segmented. | `budget-new`, `budget-edit`, `settings-category-new` | Any mutually exclusive 2–4 option choice is `SegmentedControl`. Chips are reserved for scrollable, open-ended sets (categories, accounts, suggestions, filters). |
| C7 | **Edit placement.** Header text "Edit" (detail, budget detail), header pencil icon (category drill-down), in-content secondary button (account detail). | `category-top`, `account-detail` | "Edit" is always a header trailing text button. Icons in headers are reserved for `plus`, `magnifyingglass`, `gearshape`, `line.3.horizontal.decrease`. |
| C8 | **Destructive actions.** Centred bare red text (transaction detail), left-aligned red row in its own card (rule, budget), left-aligned row among others (settings). | `detail-split`, `recurring-rule`, `budget-edit`, `settings` | A destructive action that stands alone is a red, centred, body-weight row inside its own card (`ListGroup` + `ListRow destructive centered`). Among other rows it stays left-aligned (Settings is fine). Apply to transaction detail, rule sheet, budget edit. |
| C9 | **Empty-state placement.** Activity's sits at the top (`py-12`), Budgets and Recurring are vertically centred. | `activity-empty` vs `budgets-empty`, `recurring-empty` | `EmptyState` is centred in the space below the last fixed element (`flex-1 justify-center`), offset −10% so it sits slightly above optical centre. Button is always `secondary`, label a verb + object. |
| C10 | **Hero gutter.** Accounts and Account detail heroes start at 20 pt; every other hero and card starts at 16 pt. Account detail month pill starts at 32 pt. | `accounts`, `account-detail` | Heroes and their footnote labels sit on the 16 pt gutter. Pills sit on the gutter too. |
| C11 | **Period navigation idioms.** Month pill with menu (Activity, Account detail) and chevron stepper (Insights, Budget detail). | ledgers vs analytics | Keep both but make it a rule: ledgers use the pill (jump anywhere, "All time"); analytics use the stepper (adjacent periods, swipe). Labels: pill `Oct 2026`, stepper `October 2026`. |
| C12 | **Chart average labels.** The bars card shows `Avg ₹1,542/day` in the header and `₹1.5K` as a tick on the dotted line. | `insights*`, `category-top` | One label per fact. Keep the header text; the dotted line has no tick label. Axis ticks are only round gridline values. |
| C13 | **Copy.** `Taken`, `Add`, `Month starts on 1` vs `Starts 1st`, row "Display currency" under header "Display currency". | see per-screen | Buttons: verb + object (`Add rule`). Ordinals everywhere a day-of-month is shown (`1st`). A screen's first row never repeats the screen title. No status words inside chips. |
| C14 | **Colour discipline** is good: green only on income and "spending fell", red only on over-budget / negative balance / destructive, amber only on ≥ 90% and non-zero remainder, accent for interactive and neutral progress. Keep it. The only leak: the keypad `Save` key is full accent even when nothing can be saved (see A3). | | |

## 3. Per-screen issues

### Onboarding (`onboarding-*`)
- **P2** Dead zone of ~300 pt between the `$0` readout and `Start`. Reorder: title → readout (label + amount, 24 pt under title) → card → flexible space → `Start` → keypad. Mirrors the add sheet and account form; the gap then reads as breathing room, not a hole.
- **P2** Account row looks like a static value, not a field. Give it the `Input` placeholder style when empty and a `tertiary` caret colour; keep "Cash" prefilled.

### Home (`home-*`, `home-empty-*`)
- **P1** C1: drop the `−`/`+` on Spent/Earned in `MonthCard`.
- **P2** Balance and This month cards navigate but have no affordance. Add a 13 pt `chevron.right` in `text-tertiary` after the footnote label ("Balance ›", "Spent / Earned" row gets it at the trailing edge of the card header line), as Apple Health does.
- **P2** Section headers (`min-h-11`) give ~28 pt above and 16 pt below. Set the rhythm per C5: 24 above, 8 below.
- **P2** `home-empty`: three `$0`s (balance, chip, Spent/Earned). Hide the account chip row when there is a single account with a zero balance.

### Activity (`activity-*`, `activity-filters-sheet-*`, `search-*`)
- **P1** C1 in `SummaryStrip`; this also fixes the green `₹0` with no `+` in `activity-filtered`.
- **P1** C9: centre `Nothing in October` + `Add transaction` in the list area.
- **P2** Filters sheet: no visible selected state on Type/Category rows at rest and no way to reset from the sheet. Trailing accent `checkmark` on selected rows; leading header text button `Reset` (disabled when nothing is set).
- **P2** `search-recents`: a fully blank sheet. Show the five recent searches when any exist (spec) and, when none, nothing but the focused field, which is correct; just confirm the keyboard is up so the blank is not perceived.

### Add / Edit transaction (`add-*`)
- **A1 · P1** `All` (category grid) and `Split` are the last chips in a horizontal scroller and are off-screen on first render (`add-expense`: "Hous…" is the last visible chip). Pin them: render `All` as a fixed 32 pt icon-only pill (`square.grid.2x2`) at the trailing edge outside the `ScrollView`, with the `EdgeFade` behind it, and `Split` as a text button on the detail row after `Never`. The ≤ 4-tap target depends on this.
- **A2 · P1** Toolbar `Save` renders at full accent at `₹0` (`add-expense-light`, `add-transfer-light`); `isSaveDisabled` should yield `opacity-40` here. Verify the `amount` block reaches `Button disabled`.
- **A3 · P1** The keypad `Save` key is full accent regardless of validity (`keypad.tsx:73`). When the block is `amount`, render it at 40% opacity; keep full accent when only the category is missing so the shake can do its job.
- **P2** Detail row: Account and Repeat chips have icons, Date (`Today`) has none. Add `calendar`.
- **P2** `add-split`: the suggestion chip `Reliance Smart ₹3,240` repeats the title already typed and applied. Hide the suggestion row once a suggestion has been applied or when the only match equals the title.
- **P2** `add-split`: nothing shows which split line the keypad is editing. Render the focused line's amount in `accent` and the others in `text`.
- **P2** Readout floats in ~260 pt of empty space on 852 pt phones. Cap the readout zone at 160 pt and let `keyHeight` grow to 60 on tall screens instead.

### Transaction detail (`detail-*`)
- **P1** C8: `Delete` becomes a centred red row in its own card under `Duplicate`.
- **P2** `detail-transfer`: the hero shows `$200.00` only; add a footnote `≈ ₹16,900` under the date line so the display-currency value is visible without reading the To row.
- **P2** Label column (`Account`, `Memo`, `Category`) is `text-secondary` while values are primary; good. Make the split rows match: `Split` header footnote outside the card (C5) is right; keep.

### Insights (`insights-*`)
- **I1 · P1** The answer to "where did it go" (the category list) is entirely below the fold in `insights-light`; the donut centre `Total ₹47,804` repeats the hero 120 pt above it. Fix: (a) donut 180 pt, card padding 12; (b) default centre label = largest category name + share (`Housing 57%`), selected segment overrides, total never repeated; (c) reorder to hero → donut → category list → bars. Amends spec §3.7 order.
- **I2 · P1** Bar scale is inconsistent: September clips the `₹32.8K` rent bar with a hatched top and a 6K axis; October lets the same rent set a 40K axis so every other day is flat. One rule in `insights/model.ts`: axis max = max(4 × average, 90th percentile); any bar above it gets the broken-bar treatment and its value label. Apply to Category drill-down too.
- **I3 · P1** Expense/Income toggle is an unlabeled `arrow.left.arrow.right` icon. Make the hero label a menu chip (`Spent ▾` → Spent / Earned, `callout`, `accent-soft`), remove the header icon.
- **P1** C12: remove the `₹1.5K` tick on the average line.
- **P2** `insights-selected`: the only way back is to re-tap the segment. When filtered, the `Categories` header gets a trailing accent action `Show all`.
- **P2** `insights-empty`: the bars card shows "Daily spending" plus three gridlines and nothing else. Keep the frame but drop the title and gridlines when total is 0; the hairline donut ring is enough.
- **P2** Stepper title is centred while the hero below is left-aligned. Acceptable (Apple Health does this); leave unless the hero moves.

### Category drill-down (`category-top-*`)
- **P1** C7: pencil icon → header text `Edit`.
- **P2** The floating `₹34,400` value pill sits directly under the "Average per month" block and crowds it. The headline already shows the selected period total; drop the pill, keep the highlighted bar.
- **P2** Row subtitle `Housing · Cash` repeats the screen's category. Pass `subtitle: account` only on this screen.

### Budgets (`budgets-*`)
- **B1 · P0** Two `+` buttons on one screen with different meanings: header `plus` adds a budget, FAB adds a transaction. Hide the FAB on Budgets (as on Insights); the header `plus` and the empty state cover budget creation. Amends spec §2 "Add entry point".
- **P2** Overall card: `This month` footnote → `October` when the period is not the current month (verify on the detail stepper too).

### Budget detail (`budget-detail-*`)
- **P1** C4: trailing meta → time.
- **P2** `13 transactions` headline + day headers is heavy. Keep the headline, but make the first day header start 8 pt below it, not 24.

### Budget add / edit (`budget-new-*`, `budget-edit-*`)
- **B2 · P1** `All spending  Taken` puts a status word inside a chip. Render the option disabled (`text-tertiary`, no hint) and show a footnote under the row: `An all-spending monthly budget already exists`. Tapping it navigates to that budget.
- **B3 · P1** New and Edit differ: New has a `Categories  Choose ›` row; Edit embeds the full category grid in a 350 pt card. Use the row in both; its value is the chosen names (`Shopping, Personal`, truncated) and it opens the grid sheet.
- **P1** C6: Scope → `SegmentedControl`.
- **P2** C8: `Delete budget` centred.

### Recurring (`recurring-*`, `recurring-rule-*`)
- **P1** Empty state button `Add` → `Add rule` (C13).
- **P2** C8: `Delete rule` centred.
- **P2** Rule sheet: `Every month  − 1 +` when interval is 1. Show the stepper only after the user taps a small `Every 1 month ›` row; or keep the stepper and change the label to `Every` with the unit after the number (`− 1 + month`). Pick the second; it is one line.

### Accounts (`accounts-*`, `account-detail-*`, `account-new-*`, `account-edit-*`)
- **P1** C2: detail hero decimals follow the setting.
- **P2** C10: heroes and the month pill to the 16 pt gutter.
- **P2** C7: `Edit` moves to the header; `Transfer` stays as one full-width `secondary` button, 44 pt.
- **P2** `account-new`: `⊖ Negative` chip is shown for every type. Show it only for `card` and `other`; cash and bank accounts do not open negative.
- **P2** `accounts-edit`: fine. Confirm the trailing balance returns the instant Done is tapped (no reflow flash).

### Settings and sub-screens (`settings-*`, `currency-*`)
- **S1 · P0** There is no path to Recurring except Home → Upcoming → All, and that section is hidden unless something is due within 7 days. Add a `Recurring` row (icon `repeat`, indigo) to the Data group between Accounts and Export.
- **P2** `Month starts on  1` → `1st`.
- **P2** `currency`: first row label `Display currency` repeats the title → `Currency`.
- **P2** `settings-export`: `Range` becomes a footnote header outside the card (C5).
- **P2** `settings-category-new`: Kind chips → `SegmentedControl` (C6); on edit, show the locked kind as a disabled segment rather than plain text so new and edit match.
- **P2** `settings-about`: spec'd `Rate` and `Send feedback` rows are missing; `Victory Native` is still listed under Licences although it was removed.
- **P2** `settings-import-preview`: the summary wraps to two lines at title2. Use `headline` for the count and put the breakdown on a footnote line beneath (`8 categories (3 new) · 1 account`).

### Lock overlay (`lock-overlay-*`)
- **P2** The mark is a 40 pt accent square with a lock glyph. Use the app icon asset at 48 pt, radius 11, so the lock screen is recognisably Farthing; keep the single `Unlock` button.

### Dark mode (all `*-dark`)
- No structural issues. Two refinements: **P2** keypad operator keys and digit keys read as the same fill on black; give operators `elevated` (#2C2C2E) and digits `surface` (#1C1C1E) so the column reads. **P2** `insights-selected-dark` dims unselected segments to ~25%; use 35% so the ring does not vanish on OLED.

## 4. Flow and IA

| # | Issue | Fix |
|---|---|---|
| F1 | **Recurring is unreachable most days** (S1). | Settings row. Also make Home `Upcoming` render with its `All` action whenever any active rule exists, with rows only when something is due in 7 days; the header alone is enough as a doorway. Amends spec §3.2 (4). |
| F2 | **Budgets tab `+` ambiguity** (B1). | Hide FAB on Budgets. |
| F3 | **Add in ≤ 3 s / ≤ 4 taps** holds only when the right category is among the six recents; otherwise `All` needs a horizontal scroll first (A1). With A1: amount → chip → keypad `Save` = 3 taps. | A1. |
| F4 | **Home answers "where am I this month"**: yes (Spent, Earned, budget line with days left). The one missing beat is trend; the Insights delta is one tap away, acceptable. | None. |
| F5 | **Accounts** are reached by tapping the Balance card (no affordance) or via Settings. | Chevron affordance (Home P2). |
| F6 | **Categories** are reached via Settings and the grid's `Manage` link. Adequate. | None. |
| F7 | **Edit lives in three places** (C7); users learn one. | C7. |
| F8 | **Period idioms** differ between ledgers and analytics (C11). Acceptable once consistent within each family; account detail's pill at 32 pt indent currently looks like a different control. | C10/C11. |
| F9 | **Insights kind toggle** is invisible to most users (I3). | I3. |
| F10 | **Settings is a modal stack** that also pushes Accounts; Home pushes Accounts on the root stack. Two stacks for one screen is fine in v1, but the modal's `Done` must dismiss the whole stack from any depth. | Verify. |

## 5. Delight shortlist

1. **Pace tick on budget bars.** A 1 pt `text-tertiary` tick on every progress track at today's position in the period. Instantly shows "ahead or behind" without a chart. `ProgressBar` gets an optional `marker: 0–1`.
2. **Delta toggles units.** Tap `−20% vs September` to flip to `−₹12,196 vs September` (and back). Local state, 200 ms crossfade.
3. **Donut centre defaults to the top category** (`Housing 57%`) rather than repeating the total; tapping a segment swaps it. Part of I1, listed here because it is the moment the chart starts talking.
4. **Show decimals row previews itself.** The settings row's value shows `₹1,240.00` / `₹1,240` live as the switch flips.
5. **Stepper title tap → today.** On Insights and Budget detail, tapping the period title jumps back to the current period (selection haptic). Long-press on the Activity month pill does the same.

## Counts

P0: 2 · P1: 18 · P2: 36 (per-screen items; the §2 rules are counted through the screens that cite them)

Order of work: S1, B1 → C1/C2/C4 (formatting rules) → A1/A2/A3 → I1/I2/I3 → C6/C7/C8 → B2/B3 → remaining P2s.
