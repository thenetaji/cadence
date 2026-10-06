# Build spec

The build contract for the app. Engineers implement exactly this; anything not listed is out of scope. Companion: `docs/RESEARCH.md` (why), `PLAN.md` (stack and phases).

## Name

"Cadence" is taken. Shortlist, checked against the App Store and well-known finance brands (Oct 2026):

| # | Name | Why | Conflicts |
|---|---|---|---|
| 1 | **Farthing** | A small coin; "every farthing counted". Two syllables, concrete, warm, professional. Natural icon (a coin). | None found on the App Store or among finance brands. |
| 2 | Bursar | "The person who keeps the money." Short, serious, memorable. | None found. Slightly institutional (university bursar). |
| 3 | Guilder | A coin name with a premium ring. | None found. Pronunciation ("gil-der") is not obvious to every market. |
| 4 | Slate | "Clean slate", "put it on the slate" (a running tab). Simplest, most modern. | No finance app found, but Slate magazine dominates search; weak App Store discoverability. |
| 5 | Shilling | Coin name, easy to say and spell. | None found, but "shilling" also means hawking a product. |

Cut after checks: Tally (defunct $172M fintech, and TallyPrime dominates "Tally" in India), Till (Till Financial), Coffer, Kept, Ducat, Florin, Outlay, Margin, Groat, Quid, Spent, Tabs, Kitty, Tender, Abacus, Moneta, Mint, Pocket, Stash, Penny, Ledger (all live finance apps or brands).

**Pick: Farthing.** Bundle id and scheme can stay as they are until the owner confirms; the name appears only on the About row and the launch screen, nowhere in copy.

## 1. Product

A local-first expense and income tracker for daily manual entry. Dime's calm, native UI with the depth that Dime lacks: title + memo, splits, accounts, currencies, charts, budgets, recurring. One of each concept, nothing configurable that can be designed instead.

### Scope

**v1 (tonight)**

- Transactions: expense, income, transfer. Title, memo, amount, category, account, date/time, recurring rule link.
- Splits: one transaction across 2–8 categories.
- Fast entry: custom keypad with + and −, title memory that fills category and account, recent categories row, smart defaults.
- Activity: day-grouped list, search (title, memo, amount), filters (type, category, account, date range).
- Insights: period switcher (week, month, year, custom range), donut by category, bars over time, category drill-down.
- Budgets: overall and per-category, weekly/monthly/yearly, progress + pace.
- Recurring: one rule type (daily/weekly/monthly/yearly × interval, optional end), upcoming list, auto-post with skip.
- Accounts: cash/bank/card/other, opening balance, per-account currency, archive, transfers (same or cross currency).
- Multi-currency display: display currency in settings, manual exchange rates, per-row original + converted.
- CSV export (date range, account) and CSV import with Dime and Cashew presets.
- Face ID / passcode lock, privacy blur in the app switcher.
- Light and dark mode, system default.
- Onboarding: one screen (currency + first account).

**Later**

- iCloud/encrypted backup, live exchange rates, budget rollover, tags, receipts/attachments, widgets and Shortcuts (need a dev build), per-tab navigation stacks, generic CSV column mapping, bulk edit, notifications/reminders, Android visual pass beyond "renders correctly", paywall.

**Never**

- Bank linking, shared/family budgets, loans/debt tracking as a separate system, goals, gamification, mascots, AI categorisation, home-screen layout editor, a "More options" settings page, confetti.

### Non-negotiables

- Money is `integer minor units` + ISO 4217 code. No floats touch money. Conversion for display only.
- Nothing is destroyed silently: delete has undo; category delete reassigns; account delete requires zero transactions or an explicit "move to".
- Zero instructional copy in the UI. Empty state = one line + one button.
- Every amount uses tabular numerals. Every chart element is tappable.

## 2. Information architecture and navigation

### Tabs (native, `expo-router/unstable-native-tabs`)

| Tab | SF Symbol | Purpose |
|---|---|---|
| Home | `house.fill` | Today at a glance: balance, this month, upcoming, recent |
| Activity | `list.bullet.rectangle.fill` | The ledger: all transactions, search, filters |
| Insights | `chart.pie.fill` | Breakdown and trends |
| Budgets | `gauge.with.dots.needle.33percent` | Budgets and progress |

Android fallback icons: `home`, `receipt-long`, `pie-chart`, `speed` (MaterialIcons).

### Add entry point

A floating **+** button, 56×56 pt, accent fill, white `plus` symbol (20 pt, semibold), bottom-right, 16 pt from the trailing edge and 16 pt above the tab bar safe area. Present on Home, Activity, Budgets. On Insights it is hidden (the tab is read-only). It opens `/transaction/new` as a form sheet. Light impact haptic on press. Long-press shows a context menu: "Expense", "Income", "Transfer" (each pre-selects the kind).

### Presentation rules

- **Sheets** (`presentation: "formSheet"`, grabber visible, `sheetAllowedDetents: [1]` on iOS): add/edit transaction, add/edit budget, add/edit account, add/edit category, export, import, settings stack (Settings is a modal stack over the tabs, like Apple Podcasts), search.
- **Pushes**: transaction detail, category drill-down, budget detail, account detail, recurring list, accounts list.
- **Alerts** (native `Alert`): only for destructive actions without undo (erase all data, delete account with transactions).
- v1 pushes details on the root Stack above the tabs, so a push hides the tab bar. Each tab root sits in its own small Stack only for the native large-title header.

### Route map (`src/app`)

```
_layout.tsx                      root Stack; lock overlay; theme provider; db provider
onboarding.tsx                   first launch only (fullScreenModal)
(tabs)/_layout.tsx               NativeTabs
(tabs)/index.tsx                 Home
(tabs)/activity.tsx              Activity
(tabs)/insights.tsx              Insights
(tabs)/budgets.tsx               Budgets
transaction/new.tsx              sheet   ?kind=expense|income|transfer&accountId&categoryId&duplicateOf&ruleId
transaction/[id]/index.tsx       push    detail
transaction/[id]/edit.tsx        sheet
category/[id].tsx                push    drill-down ?from&to
budget/new.tsx                   sheet
budget/[id]/index.tsx            push
budget/[id]/edit.tsx             sheet
recurring/index.tsx              push    upcoming + rules
recurring/[id].tsx               sheet   edit rule
accounts/index.tsx               push
accounts/new.tsx                 sheet
accounts/[id]/index.tsx          push
accounts/[id]/edit.tsx           sheet
search.tsx                       sheet   (from Activity)
settings/_layout.tsx             modal Stack (sheet)
settings/index.tsx
settings/categories/index.tsx
settings/categories/[id].tsx     edit; id = "new" for create
settings/currency.tsx            display currency + rates
settings/appearance.tsx
settings/lock.tsx
settings/export.tsx
settings/import.tsx
settings/about.tsx
```

Transitions: pushes use the default iOS slide. Sheets slide up (350 ms, system). The + button scales to 0.92 on press-in (spring below) and back on release. Tab switches have no custom animation.

## 3. Screens

Conventions used below: "row" = a 52 pt list row (anatomy in §5); "chip" = a 32 pt pill; all lists are `FlashList` with section headers that stick; pull-to-refresh is not used (no network).

### 3.1 Onboarding (`/onboarding`)

Purpose: get a currency and an account in under 10 seconds.

Top to bottom: large title "Set up", currency row (prefilled from `expo-localization` region: INR for IN, EUR for EU regions, USD otherwise; tapping opens a searchable list of ISO codes with symbol and name), account name field (prefilled "Cash"), opening balance field (uses the custom keypad, default 0), primary button "Start". Creates account + settings, seeds categories, sets `onboarding_done`. No carousel, no explanation. If `onboarding_done` is already true the route is unreachable.

### 3.2 Home (`/(tabs)/index`)

Purpose: answer "where am I this month" in one glance.

Top to bottom:

1. Header: title "Home" (large title, collapses on scroll), trailing `gearshape` icon button → `/settings`.
2. **Balance card** (surface, radius 14): label "Balance", hero amount (net of all non-archived accounts in display currency), below it a horizontal scroll of account chips (`name · amount`, max 6, then "All accounts"). Tap card → `/accounts`.
3. **This month** block: two columns, "Spent" and "Earned", each amount in title2; under them a 1-line hairline progress of overall budget if one exists ("₹12,400 of ₹30,000 · 18 days left"). Tap → Insights tab with month period.
4. **Upcoming** (only if any recurring is due within 7 days): section header "Upcoming" with trailing "All" → `/recurring`. Up to 3 rows; row trailing shows the due date instead of time. Swipe right → "Post now"; swipe left → "Skip".
5. **Recent**: section header "Recent" with trailing "All" → Activity tab. Last 8 transactions, standard rows.

States: empty (no transactions): balance card shows the opening balance; "This month" shows ₹0 both; Recent shows one line "No transactions yet" + button "Add transaction". Long lists: fixed to 8 rows. Very large amounts: hero amount scales down to 28 pt via `adjustsFontSizeToFit` with `numberOfLines=1`; above 7 integer digits it abbreviates (§5.9).

Interactions: tapping a row pushes detail. Hero amount animates with a count-up (400 ms) on first appear only. Haptics: none on this screen except the + button.

### 3.3 Activity (`/(tabs)/activity`)

Purpose: the full ledger.

1. Header: large title "Activity"; trailing `magnifyingglass` → `/search`; leading month pill ("Oct 2026", `chevron.down`) → opens a native month picker menu (previous 24 months + "All time").
2. Filter chips row (horizontal scroll, hidden when no filters): "Expense", "Income", "Transfer", category chip, account chip, "Clear". Chips toggle; active chips use accent tint background at 12% with accent text.
3. Summary strip (surface, radius 14): "Spent −₹…" and "Earned +₹…" for the visible period and filters. Hidden when a transfer-only filter is active.
4. List grouped by day. Section header: left "Today" / "Yesterday" / "Mon 3 Oct" (footnote, secondary, uppercase off), right day total (footnote, tabular, secondary). Rows per §5.7.

States: empty month: one line "Nothing in October" + button "Add transaction". No results after filtering: "No matches" + "Clear filters". Long lists: `FlashList`, `estimatedItemSize=52`, sections virtualised, month-at-a-time query (no infinite scroll across months; the month pill changes period).

Gestures: swipe left on a row → red "Delete" (full swipe deletes); swipe right → "Duplicate" (opens `/transaction/new?duplicateOf=id`). Long-press → context menu: Edit, Duplicate, Delete. Delete shows a bottom toast "Deleted · Undo" for 5 s (success haptic on delete, light on undo).

### 3.4 Search (`/search`, sheet)

Purpose: find anything by text or amount.

Search field autofocused (system keyboard, `returnKeyType="search"`), placeholder "Title, memo or amount". Below: when empty, "Recent searches" (last 5, tappable) and nothing else. Results use the Activity row and day headers, across all time, limited to 200 with "Showing first 200". Typing a number matches amounts within ±0.5% of the parsed value and any title/memo containing the digits. Tap → push detail inside the sheet's own stack. Cancel button dismisses.

### 3.5 Add / Edit transaction (`/transaction/new`, `/transaction/[id]/edit`)

Purpose: the core loop. Target: expense with amount + category in ≤ 3 s and ≤ 4 taps. Every control is visible without scrolling on an iPhone 13 mini (375×812); nothing opens a second screen except the full category grid and date picker.

Layout, top to bottom (form sheet, full detent):

1. **Toolbar**: leading "Cancel" (text), centre segmented control `Expense | Income | Transfer` (native style, 3 segments), trailing "Save" (semibold, accent, disabled until amount > 0 and, for expense/income, a category is chosen or splits are valid; for transfer, two different accounts).
2. **Amount readout** (centred, 64 pt tall): currency symbol in title2 secondary + amount in 44 pt semibold tabular. Shows the live keypad input with locale grouping as you type ("1,23,456" in en-IN). Shows `0` dimmed when empty. When an expression is pending (after + or −), the readout shows the expression in footnote secondary above the running total. Overflow: shrinks to 32 pt; input stops at 12 integer digits.
3. **Title field** (one line, body, placeholder "Title"): optional. Uses the system keyboard; while it is focused the custom keypad hides and a "Done" accessory returns to the keypad. As the user types, a **suggestion row** of up to 4 chips appears under the field (title memory, ranked by use count × recency; prefix matches first). Tapping a chip sets title, category (unless a split is in progress) and account, and shows the last amount as a secondary hint on the chip ("Swiggy · ₹340"). Empty title saves as the category name.
4. **Category row** (hidden for Transfer): horizontal chips. First chip is the selected category (if any, filled with its colour at 15% and its icon); then up to 6 recent categories of the current kind (icon + name); last chip "All" (`square.grid.2x2`) → opens the **category grid sheet** (half-detent sheet listing all categories of the kind in a 4-column grid: 44 pt coloured circle icon + name below; a "Manage" link to settings; selecting dismisses with a selection haptic). Trailing on the row, a small text button "Split" (see 3.5.1).
   For Transfer this row becomes **From → To**: two account chips with an `arrow.right` between; tapping either opens a native menu of accounts; if currencies differ, a second amount readout "Receives" appears under the main one (editable with the keypad after tapping it; prefilled from the manual rate).
5. **Detail row**: three chips. Account chip (`creditcard`, name; menu of accounts; default = last used account, else default account), Date chip ("Today 14:32"; opens an inline `DateTimePicker` in a half sheet, `display="inline"`; date defaults to now; quick buttons "Today", "Yesterday"), Repeat chip (`repeat`, "Never"; menu: Never, Daily, Weekly, Monthly, Yearly, Custom…; Custom opens a small sheet: every N [days|weeks|months|years], ends [Never | On date]).
6. **Memo field** (one line that grows to 3, placeholder "Memo"): optional, system keyboard, same keypad-hide behaviour as title.
7. **Keypad** (custom, pinned to the bottom, 4 rows × 4 columns, each key ≥ 64×48 pt):
   ```
   7  8  9  ⌫
   4  5  6  −
   1  2  3  +
   .  0  00 =
   ```
   Keys use the surface colour with hairline separators; operators are tinted accent; `=` becomes "Save" (accent fill) when no operation is pending so the thumb never leaves the pad for the common case. `.` is hidden for 0-decimal currencies. Decimal input stops at the currency's minor digits. Long-press `⌫` clears. Each key gives a light impact haptic (respects the Haptics setting). Precision: operations are evaluated in minor units (integers), no floats.

Smart defaults: kind = last used (or the one from the + long-press); account = last used; date = now; category = none (but the recents row is right there); currency = account currency. In edit mode: toolbar leading is "Cancel", trailing "Save"; a `trash` icon button sits left of Save; the keypad starts hidden behind the amount (tap the amount to show it) so the fields are visible first.

Validation: tapping Save with no category shakes the category row (3 × 6 pt, 300 ms) and fires an error haptic. No toasts, no text.

Commit: success haptic, sheet dismisses, the new row appears in Activity/Home with a 250 ms fade-in; title memory is updated; recurring rule is created if Repeat ≠ Never (the first occurrence is this transaction).

#### 3.5.1 Splits

Tapping "Split" turns the category row into a **split list**: each line = category chip + amount (tabular, tappable; the keypad edits the focused line) + `minus.circle` to remove. Starts with two lines: the current category (if any) with the full amount, and an empty line. "Add line" at the bottom (max 8). The last edited line is never auto-adjusted; the remainder (total − other lines) is shown under the list as "Remaining ₹…" in secondary (warning colour if ≠ 0). Save is disabled until Remaining = 0. A "Remove split" text button restores a single category (keeps the first line's category). Split rows in lists show the first category's icon with a small `square.split.2x1` badge and the subtitle "3 categories".

### 3.6 Transaction detail (`/transaction/[id]`)

Purpose: see everything about one entry and act on it.

Header: back; trailing "Edit" → edit sheet. Content: 64 pt category icon circle (colour) centred, title (title2), amount (34 pt tabular, income green with +), date line (footnote secondary, "Mon 3 Oct 2026 · 14:32"). Then a grouped list: Category (or the split lines with amounts), Account (and for transfers From/To with both amounts), Memo (multi-line, only if present), Repeats ("Monthly · next 3 Nov", tapping → `/recurring/[ruleId]`; only if linked), Original amount ("$12.00 · rate 83.2", only if currency ≠ display currency). Bottom: "Duplicate" (secondary button) and "Delete" (destructive text button → undo toast and pop).

### 3.7 Insights (`/(tabs)/insights`)

Purpose: where the money went, and whether that is changing.

1. Header: large title "Insights"; trailing `arrow.left.arrow.right` toggles Expense/Income (default Expense).
2. **Period control**: segmented `Week | Month | Year | Custom`; beneath it a period stepper row: `chevron.left` "October 2026" `chevron.right` (swipe left/right anywhere on the chart area also steps). Custom opens a two-date sheet.
3. **Total**: hero amount for the period, with a delta line "−12% vs September" (secondary; green when spending fell, plain when rose; no red).
4. **Donut** (Skia, 220 pt): up to 8 segments + "Other"; stroke width 22 pt, gap 2°; centre shows the selected segment's name + amount, else the total. Tap a segment to select it (selection haptic; segment grows 4 pt; the list below filters to it). Tap again to clear.
5. **Bars**: daily bars for Week/Month, monthly for Year, auto for Custom. Height 160 pt, 4 pt radius tops, bars in accent at 70%, selected bar 100%; a dotted average line with a right-aligned label. Scrub: pan along the chart shows a floating label "Tue 7 · ₹1,240" and highlights the bar; release keeps the selection; tap elsewhere clears. Bar colours switch to the selected category colour when a donut segment is selected.
6. **Category list**: one row per category: icon, name, bar-under-name showing share, trailing amount and "34%". Sorted by amount. Tap → `/category/[id]?from&to`.

States: empty period: donut shows a hairline ring, total ₹0, list "Nothing in this period". Income mode uses income green for the bars.

### 3.8 Category drill-down (`/category/[id]`)

Header: category name, trailing `pencil` → edit category sheet. Top: 6-period bars (last 6 weeks/months/years matching the period type; the current one highlighted) with scrub; then total for the period and average per period; then the transaction list (Activity rows, day headers) for the period; split lines appear as their own rows marked with the parent title.

### 3.9 Budgets (`/(tabs)/budgets`)

Purpose: a calm "am I on track" view.

1. Header: large title "Budgets"; trailing `plus` → `/budget/new`.
2. **Overall budget card** (if one exists): "This month", large remaining amount ("₹17,600 left"), a 6 pt progress bar (accent; warning colour from 90%; expense red when over), under it "₹12,400 spent · ₹590/day left" in footnote.
3. **Category budgets** list: rows with the category icon, name, right-aligned "₹2,100 of ₹5,000", progress bar under the text spanning the row (category colour; warning/over rules as above). Tap → budget detail. Swipe left → Delete (undo toast).

States: empty: "No budgets" + button "Add budget". Over budget: amount text becomes expense red and the bar fills fully; no exclamation icons.

### 3.10 Budget detail (`/budget/[id]`) and add/edit (`/budget/new`, `/budget/[id]/edit`)

Detail: header = budget name, trailing "Edit". Progress card (as on the list, larger). **Pace chart**: cumulative spend line for the period vs a straight dotted "even pace" line, scrubbable. Period stepper (previous periods are read-only). Transactions in the period (Activity rows).

Add/Edit sheet: fields in a grouped list: Name (optional; defaults to category name or "Monthly budget"), Amount (keypad), Scope (menu: "All spending" or pick categories, multi-select grid), Period (segmented Weekly/Monthly/Yearly), Starts (weekday for weekly; day-of-month 1–28 for monthly; month for yearly; defaults from Settings). Save in the toolbar. Only one "All spending" budget per period type.

### 3.11 Recurring (`/recurring`, `/recurring/[id]`)

List: two sections. "Upcoming" (next 30 days, rows show title, category, due date, amount; swipe right "Post now", swipe left "Skip"; posted rows disappear). "Rules" (one row per active rule: title, cadence summary "Monthly · 5th", amount; paused rules dimmed). Header trailing `plus` → `/transaction/new?kind=expense` with the Repeat chip pre-opened. Empty: "No recurring transactions" + "Add".

Rule sheet: same as the add sheet fields minus date, plus "Next due" (date), "Ends" (Never/On date), "Paused" (switch), and a destructive "Delete rule" (keeps posted transactions; asks "Also delete future posted transactions?" only if any exist after today).

### 3.12 Accounts (`/accounts`, `/accounts/[id]`, `/accounts/new`, `/accounts/[id]/edit`)

List: total in display currency at top (hero), then rows: icon tile (type icon on account colour), name, type subtitle, trailing balance in its own currency (and converted below in footnote if different). Reorder by drag handle in an "Edit" mode. Archived accounts in a collapsed section. Trailing `plus` → new.

Detail: hero balance, "Transfer" and "Edit" buttons, then the account's transactions by month (same list component as Activity, with its month pill).

Add/Edit sheet: Name, Type (segmented Cash/Bank/Card/Other), Currency (searchable list; locked once the account has transactions), Opening balance (keypad; may be negative for cards), Colour (12-swatch row), "Default account" (switch), Archive/Delete at the bottom (Delete only when empty; otherwise "Move transactions to…" menu then delete).

### 3.13 Settings (`/settings`, modal stack)

Rows, grouped, 14 total. Values shown on the trailing side.

| Group | Row | Detail |
|---|---|---|
| General | Display currency | `/settings/currency`: currency list + "Exchange rates" section listing every currency used by an account with an editable rate to the display currency ("1 USD = ₹83.20"), "Updated 3 Oct" |
| | Week starts on | menu: Monday / Sunday |
| | Month starts on | menu: 1–28 |
| | Default account | menu |
| Appearance | Theme | menu: System / Light / Dark |
| | Haptics | switch |
| | Show decimals | switch (lists only; detail always shows full) |
| Privacy | Face ID | `/settings/lock`: enable switch, "Require after" menu (Immediately / 1 min / 5 min) |
| Data | Categories | `/settings/categories` |
| | Accounts | `/accounts` |
| | Export | `/settings/export`: range (This month / This year / All / Custom), accounts multi-select, "Export CSV" → share sheet |
| | Import | `/settings/import`: "Dime CSV", "Cashew CSV" buttons → document picker → preview "312 transactions, 14 categories (3 new), 2 accounts" → "Import"; all new categories get palette colours and `tag.fill` |
| | Erase all data | alert, destructive, requires typing nothing but confirms twice |
| About | Version | `/settings/about`: name, version, "Rate", "Send feedback" (mailto), licences |

Categories screen: two sections (Expense, Income), rows with icon tile + name, drag to reorder, swipe to delete (delete asks "Move transactions to…" with a menu of same-kind categories; never cascades). Trailing `plus`. Edit sheet: Name, Icon (grid of ~80 curated SF Symbol names, searchable), Colour (12 swatches), Kind (locked after creation).

### 3.14 Lock overlay

Rendered in the root layout above everything when `lock_enabled` and the app was backgrounded longer than the timeout (or on cold start). Content: app icon mark (48 pt), a single button "Unlock" that triggers `LocalAuthentication.authenticateAsync`. Authentication is attempted automatically on appear; the button is the retry. While the app is inactive/background, a blur view (`expo-blur`, intensity 60) covers the screen regardless of lock setting (privacy blur).

## 4. Data model (expo-sqlite + Drizzle)

IDs are UUID v4 text (`expo-crypto`). Times are `integer` unix ms. `date_key` is the local calendar day `YYYY-MM-DD` at time of entry, used for grouping and period queries. Money columns are `integer` minor units; every money column has a sibling `currency` text. Soft delete is not used; delete is real, with undo implemented by re-inserting the held row within the toast window.

```
accounts
  id text pk
  name text not null
  type text not null             -- 'cash' | 'bank' | 'card' | 'other'
  currency text not null         -- ISO 4217
  opening_balance integer not null default 0
  color text not null            -- palette key, e.g. 'blue'
  icon text not null             -- SF Symbol name
  is_default integer not null default 0
  sort_order integer not null default 0
  archived_at integer null
  created_at integer not null
  updated_at integer not null

categories
  id text pk
  name text not null
  kind text not null             -- 'expense' | 'income'
  icon text not null             -- SF Symbol name
  color text not null            -- palette key
  sort_order integer not null default 0
  archived_at integer null
  created_at integer not null
  updated_at integer not null
  index (kind, sort_order)

transactions
  id text pk
  kind text not null             -- 'expense' | 'income' | 'transfer'
  title text not null default ''
  memo text not null default ''
  amount integer not null        -- always positive; sign comes from kind
  currency text not null         -- = account currency at creation
  account_id text not null -> accounts.id
  category_id text null -> categories.id   -- null for transfers and split parents
  transfer_account_id text null -> accounts.id
  transfer_amount integer null   -- in transfer account currency; = amount when same currency
  transfer_currency text null
  occurred_at integer not null
  date_key text not null
  is_split integer not null default 0
  recurring_rule_id text null -> recurring_rules.id
  created_at integer not null
  updated_at integer not null
  index (date_key desc, occurred_at desc)
  index (account_id, date_key)
  index (category_id, date_key)
  index (recurring_rule_id)
  index (transfer_account_id)

transaction_splits
  id text pk
  transaction_id text not null -> transactions.id on delete cascade
  category_id text not null -> categories.id
  amount integer not null        -- same currency as parent; sum == parent.amount
  sort_order integer not null
  index (transaction_id), index (category_id)

recurring_rules
  id text pk
  kind text not null
  title text not null
  memo text not null default ''
  amount integer not null
  currency text not null
  account_id text not null -> accounts.id
  category_id text null -> categories.id
  transfer_account_id text null
  transfer_amount integer null
  frequency text not null        -- 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval integer not null default 1
  anchor_day integer null        -- weekday 1-7 for weekly, day-of-month 1-31 for monthly (clamped to month length), day-of-year via start for yearly
  start_date text not null       -- date_key of first occurrence
  end_date text null
  next_due text not null         -- date_key
  auto_post integer not null default 1
  paused_at integer null
  created_at integer not null
  updated_at integer not null
  index (next_due)

budgets
  id text pk
  name text not null
  amount integer not null
  currency text not null         -- display currency at creation
  period text not null           -- 'weekly' | 'monthly' | 'yearly'
  start_anchor integer not null  -- weekday / day-of-month / month
  scope text not null            -- 'all' | 'categories'
  archived_at integer null
  created_at integer not null
  updated_at integer not null

budget_categories
  budget_id text -> budgets.id on delete cascade
  category_id text -> categories.id on delete cascade
  pk (budget_id, category_id)

title_memory
  title_norm text pk             -- lowercased, trimmed, whitespace-collapsed
  title text not null            -- last display form
  kind text not null
  category_id text null
  account_id text null
  last_amount integer null
  last_currency text null
  use_count integer not null default 1
  last_used_at integer not null
  index (kind, use_count desc, last_used_at desc)

fx_rates
  base text not null             -- account currency
  quote text not null            -- display currency
  rate real not null             -- 1 base = rate quote (display only)
  updated_at integer not null
  pk (base, quote)

settings
  key text pk
  value text not null            -- JSON-encoded
```

Settings keys: `display_currency`, `theme` ('system'|'light'|'dark'), `haptics` (bool), `show_decimals` (bool), `week_start` (1|7), `month_start` (1–28), `default_account_id`, `lock_enabled` (bool), `lock_timeout_s` (0|60|300), `last_kind`, `last_account_id`, `onboarding_done`, `schema_seeded`, `recent_searches` (string[]).

Derived values (never stored): account balance = opening + Σ income − Σ expense − Σ transfers out + Σ transfer_amount in; budget spent = Σ expense in period across scope, counting split lines by their category; category totals count split lines, not split parents.

Business rules:

- Splits: parent keeps `amount`, `is_split=1`, `category_id=null`; 2–8 lines; Σ lines = amount, enforced in the repository layer in one transaction.
- Transfers: never count as spend or income anywhere. Cross-currency transfers store both amounts; the rate is implied, not stored.
- Recurring posting runs on app start and on foreground: for each active rule with `next_due <= today` (and ≤ end_date), insert a transaction at `next_due 09:00` local, advance `next_due`; cap at 100 iterations per rule. "Skip" advances without inserting. Editing a rule changes future posts only.
- Category delete: requires a target category; `update transactions/splits/rules/title_memory set category_id = target`, then delete. Account delete: same with a target account, or refused when transactions exist and no target was picked.
- Title memory updates on every save: upsert by `title_norm`, `use_count += 1`. Suggestions = prefix matches then substring, same kind, top 4.

### Seed categories

Expense (sort order as listed):

| Name | SF Symbol | Colour |
|---|---|---|
| Food & Drink | `fork.knife` | red |
| Groceries | `cart.fill` | green |
| Transport | `car.fill` | blue |
| Shopping | `bag.fill` | pink |
| Housing | `house.fill` | brown |
| Bills | `bolt.fill` | amber |
| Subscriptions | `arrow.triangle.2.circlepath` | indigo |
| Health | `cross.case.fill` | teal |
| Entertainment | `play.rectangle.fill` | purple |
| Travel | `airplane` | cyan |
| Education | `book.fill` | orange |
| Personal | `sparkles` | lime |
| Other | `ellipsis.circle.fill` | gray |

Income:

| Name | SF Symbol | Colour |
|---|---|---|
| Salary | `banknote.fill` | green |
| Freelance | `laptopcomputer` | blue |
| Investments | `chart.line.uptrend.xyaxis` | teal |
| Refunds | `arrow.uturn.backward.circle.fill` | cyan |
| Gifts | `gift.fill` | pink |
| Other income | `plus.circle.fill` | gray |

Account icons by type: cash `banknote`, bank `building.columns.fill`, card `creditcard.fill`, other `wallet.pass.fill`. Android: every SF Symbol name used in the app is mapped in one `symbolFallbacks.ts` to a MaterialIcons glyph; unknown names fall back to `circle`.

## 5. Design language (tokens)

Implemented as CSS variables in `src/global.css` for Uniwind and mirrored in a `tokens.ts` for Skia charts and Reanimated.

### 5.1 Colours, semantic

| Token | Light | Dark |
|---|---|---|
| `bg` | `#F2F2F7` | `#000000` |
| `surface` | `#FFFFFF` | `#1C1C1E` |
| `elevated` | `#FFFFFF` | `#2C2C2E` |
| `border` | `#E3E3E8` | `#2A2A2E` |
| `separator` | `rgba(60,60,67,0.12)` | `rgba(84,84,88,0.40)` |
| `text` | `#111114` | `#F5F5F7` |
| `text-secondary` | `#6E6E76` | `#A1A1AA` |
| `text-tertiary` | `#A5A5AD` | `#6B6B72` |
| `accent` | `#2E5BFF` | `#6B8CFF` |
| `accent-soft` (chips, selected bg) | `rgba(46,91,255,0.12)` | `rgba(107,140,255,0.18)` |
| `income` | `#1E9E5A` | `#3DD68C` |
| `expense` (over budget, negative balance only) | `#D93A3A` | `#FF5C5C` |
| `warning` | `#D98A0B` | `#FFB224` |
| `fill` (keypad keys, inactive bars) | `#E9E9EE` | `#2C2C2E` |
| `overlay` (toasts) | `#1C1C1E` | `#F2F2F7` (text inverted) |

Expense amounts are rendered in `text`, not red. Only income is coloured. Pure `#000000` background in dark mode (OLED, matches Dime and Apple's own apps).

### 5.2 Category palette (12 + gray)

Keys are what the DB stores. Light values sit on white; dark values are brightened for black.

| Key | Light | Dark | Key | Light | Dark |
|---|---|---|---|---|---|
| red | `#E5484D` | `#F2555A` | cyan | `#0AA2C0` | `#23C4E0` |
| orange | `#F76B15` | `#FF801F` | blue | `#3E63DD` | `#5B8DEF` |
| amber | `#E8A317` | `#FFB224` | indigo | `#5B5BD6` | `#7B7BF0` |
| lime | `#7CB342` | `#8FD14F` | purple | `#8E4EC6` | `#B06AE4` |
| green | `#30A46C` | `#3DD68C` | pink | `#D6409F` | `#F065B8` |
| teal | `#12A594` | `#0BD8B6` | brown | `#AD7F58` | `#C49A74` |
| gray | `#8B8D98` | `#9A9CA6` | | | |

Icon tiles: colour at 15% as background (dark: 22%), icon in the full colour. Donut and bars use the full colour.

### 5.3 Type scale (system font: SF Pro on iOS, Roboto on Android)

| Style | Size/Line | Weight | Tracking | Use |
|---|---|---|---|---|
| hero | 36/44 | 600 | −0.8 | Home balance, Insights total |
| amount-entry | 44/52 | 600 | −1.0 | Add sheet readout |
| large-title | 34/41 | 700 | −0.4 | Tab screen titles (native) |
| title1 | 28/34 | 700 | −0.3 | Detail amounts |
| title2 | 22/28 | 600 | −0.2 | Section totals, detail title |
| headline | 17/22 | 600 | 0 | Row titles when emphasised, buttons |
| body | 17/22 | 400 | 0 | Row titles, fields |
| callout | 16/21 | 400 | 0 | Chips |
| subhead | 15/20 | 400 | 0 | Row subtitles |
| footnote | 13/18 | 400 | 0 | Section headers, meta |
| caption | 12/16 | 500 | 0.1 | Chart labels, badges |

All amounts: `fontVariant: ['tabular-nums']`, weight 500 in rows and 600 in heroes. Never use rounded or monospace fonts.

### 5.4 Spacing, radii, lines

- 4 pt grid: 4, 8, 12, 16, 20, 24, 32, 40, 48. Screen gutter 16. Card padding 16. Row horizontal padding 16, vertical 12.
- Radii: 8 (keypad keys, small tiles), 12 (chips are full pills; buttons), 14 (cards, icon tiles 36 pt use 10), 20 (sheet top corners, system), 999 (pills, + button).
- Hairlines, not shadows: `StyleSheet.hairlineWidth` in `separator` between rows (inset 16 + icon width + 12 from leading). Cards have no border in dark mode and a `border` hairline in light mode. The only shadows: the + button (`0 4 12 rgba(0,0,0,0.16)`) and toasts (`0 6 20 rgba(0,0,0,0.20)`).

### 5.5 Motion

- Durations: 120 ms (press states), 200 ms (chip selection, progress bar fill), 250 ms (row fade-in, list reflow via `LinearTransition`), 400 ms (count-up, chart grow on first appear).
- Springs (Reanimated `withSpring`): `press = { damping: 20, stiffness: 300, mass: 0.8 }`; `layout = { damping: 18, stiffness: 220 }`; `sheetChip = { damping: 16, stiffness: 180 }`.
- Press feedback: scale 0.97 on rows/cards, 0.92 on the + button and keypad keys, opacity 0.6 on text buttons.
- Charts animate on first appear only, not on period change (period change crossfades 200 ms). Respect `AccessibilityInfo.isReduceMotionEnabled`: skip count-ups and chart growth.

### 5.6 Haptics (`expo-haptics`)

Light impact: + button, keypad keys, chip select. Selection: segment and donut selection, picker scroll. Success notification: transaction saved, budget saved, import complete. Error notification: validation shake. Medium impact: full-swipe delete. None on navigation. All gated by the Haptics setting.

### 5.7 Row anatomy (transaction row, 52 pt min height)

```
[16] [36×36 icon tile, r10] [12] Title (body)                    −₹1,240 (body 500 tabular) [16]
                                 Category · Account (subhead, secondary)   14:32 (footnote, tertiary)
```
Split: tile shows the first category icon with a 14 pt `square.split.2x1` badge bottom-right; subtitle "3 categories · Account". Transfer: tile icon `arrow.left.arrow.right` on gray; title "Cash → HDFC"; amount without sign in `text-secondary`. Foreign currency: amount line shows the original ("−$12.00") and the time slot shows the converted ("≈ ₹1,000"). Income: amount in `income` with "+". Title truncates to 1 line (tail), subtitle 1 line.

### 5.8 Components (React Native Reusables, owned in `src/components/ui`)

Use: `Button`, `Text`, `Input`, `Card`, `Separator`, `Switch`, `Badge`, `Progress`, `Skeleton`, `Toggle`/`ToggleGroup` (segmented), `DropdownMenu`/`ContextMenu` (native menus where available), `Sheet`/`Dialog` (only for the category grid and custom repeat; route sheets come from expo-router). App-specific components in `src/components/app`: `Amount`, `Keypad`, `CategoryChip`, `CategoryGrid`, `TransactionRow`, `DaySectionHeader`, `SummaryStrip`, `ProgressBar`, `Donut`, `Bars`, `PaceLine`, `UndoToast`, `EmptyState`, `IconTile`, `Symbol` (expo-symbols with the Android fallback map).

### 5.9 Amount formatting

- `formatMoney(minor, currency, { locale, compact?, sign?, decimals? })` built on `Intl.NumberFormat` (Hermes supports Intl). Locale = device locale; en-IN yields `1,23,456.00`. Symbol from `Intl` (`currencyDisplay: 'narrowSymbol'`), falling back to the code when none.
- Sign: expenses `−` (U+2212) prefix; income `+`; transfers none; balances `−` only when negative. Sign sits before the symbol: `−₹1,240.00`.
- Decimals: per currency (`INR/USD/EUR` 2, `JPY` 0). Lists honour "Show decimals"; detail and the entry readout always show them.
- Compact (hero overflow, chart axes and labels): ≥ 7 integer digits in heroes, always on axes. en-IN or INR: `1.2K`, `1.2L`, `1.2Cr` (thresholds 1e3, 1e5, 1e7). Other locales: `1.2K`, `1.2M`, `1.2B`. One decimal, trailing `.0` dropped.
- Parsing in the keypad is integer-only: digits accumulate in minor units; `.` switches to the fraction; nothing is ever parsed from a float string.

### 5.10 Copy rules

Terse. Sentence case. Numbers over words. No emoji, no exclamation marks, no "your", no instructional paragraphs, no "Oops". Empty state = one line (≤ 5 words) + one action. Buttons are verbs ("Add transaction", "Export CSV"). Destructive buttons name the object ("Delete rule").

Key strings:

| Where | String |
|---|---|
| Tabs | Home · Activity · Insights · Budgets |
| Home | Balance · This month · Spent · Earned · Upcoming · Recent · All · No transactions yet · Add transaction |
| Activity | Activity · Nothing in October · No matches · Clear filters · Deleted · Undo · Delete · Duplicate · Edit |
| Search | Title, memo or amount · Recent searches · Showing first 200 · Cancel |
| Add sheet | Cancel · Save · Expense · Income · Transfer · Title · Memo · Split · Remove split · Add line · Remaining ₹0 · All · Today · Yesterday · Never · Daily · Weekly · Monthly · Yearly · Custom… · Every · Ends · On date · From · To · Receives |
| Detail | Edit · Category · Account · Memo · Repeats · Original amount · Duplicate · Delete |
| Insights | Insights · Week · Month · Year · Custom · vs September · Nothing in this period · Other |
| Budgets | Budgets · This month · ₹17,600 left · ₹12,400 spent · ₹590/day left · No budgets · Add budget · All spending · Weekly · Monthly · Yearly · Starts |
| Recurring | Upcoming · Rules · Post now · Skip · Paused · Next due · No recurring transactions · Add · Delete rule |
| Accounts | Accounts · Cash · Bank · Card · Other · Opening balance · Default account · Archive · Move transactions to… · Transfer |
| Settings | Settings · Display currency · Exchange rates · Week starts on · Month starts on · Default account · Theme · System · Light · Dark · Haptics · Show decimals · Face ID · Require after · Immediately · 1 min · 5 min · Categories · Export · Import · Erase all data · About · Version |
| Export/Import | This month · This year · All · Custom · Export CSV · Dime CSV · Cashew CSV · 312 transactions, 14 categories (3 new), 2 accounts · Import · Imported |
| Lock | Unlock |
| Onboarding | Set up · Currency · Account · Opening balance · Start |

## 6. Charts (Skia)

| Chart | Screen | Data | Interaction |
|---|---|---|---|
| Donut | Insights | top 8 categories + Other for period and kind | tap segment → select (centre label, list filter, bars recolour); tap again → clear; selection haptic |
| Bars | Insights | per day (week/month) or per month (year/custom > 92 days) | pan to scrub with floating label; tap bar selects; swipe horizontally on empty chart area steps the period; average dotted line |
| Bars (6 periods) | Category drill-down | last 6 periods of the same type | scrub; tap a bar changes the list below to that period |
| Pace line | Budget detail | cumulative spend per day vs even pace | scrub shows "Day 12 · ₹8,400 of ₹12,000 pace" |
| Progress bar | Budgets, Home | spent/amount | none |

Rules: axes use compact amounts, at most 4 gridlines, hairline `separator` colour, no axis lines, labels in caption/tertiary. Empty data draws the frame with no marks. Period changes crossfade. Chart text uses the system font via Skia `matchFont`. All charts have `accessibilityLabel` summarising the data ("Spending by category: Food 34%, Transport 21%…").

## 7. Accessibility

- Dynamic Type: all text uses `allowFontScaling`; rows grow in height; heroes cap at 1.4× (`maxFontSizeMultiplier`), keypad keys at 1.2×, amounts in rows at 1.6×. Above the xxLarge content size, row subtitles move under the amount instead of beside it.
- VoiceOver: amounts read as "minus 1,240 rupees" (use a `formatMoneyForSpeech` that spells sign and currency name); rows read "Title, Category, Account, amount, time"; chart segments are individual accessible elements with label + value; the + button is "Add transaction"; swipe actions are exposed as `accessibilityActions`.
- Contrast: all text tokens ≥ 4.5:1 on their surfaces in both modes (`text-tertiary` is used only for non-essential meta); category colours are never the only carrier of meaning (name is always present).
- Hit targets ≥ 44×44 pt: chips get vertical slop, keypad keys are 48+ pt tall, row swipe buttons 72 pt wide.
- Reduce Motion honoured (§5.5). Reduce Transparency: privacy blur falls back to an opaque `bg` overlay.

## 8. Build phases

Each phase is self-contained and handed to one engineer agent. Acceptance = all criteria pass in Expo Go on an iPhone and the app still launches on Android.

### Phase 1: Foundation

- `tokens.ts` + `global.css` with every token in §5; theme follows the system and the `theme` setting.
- Drizzle schema for every table in §4, migrations, `db` provider, seed categories and settings, repository functions (`transactions`, `accounts`, `categories`, `budgets`, `recurring`, `settings`, `fx`) with typed inputs and unit tests for balance, budget-spent and recurring `next_due` maths.
- `formatMoney`, `formatMoneyForSpeech`, compact rules, locale detection; tests for en-IN, en-US, de-DE, JPY.
- Route skeleton from §2 with placeholder screens, native tabs with symbols, + button, settings modal stack, onboarding gate, `Symbol` component with Android fallback map.
- Accept: fresh install → onboarding → empty Home; dark/light toggle; `pnpm test` green; `tsc` strict clean.

### Phase 2: Ledger (core loop)

- Add/Edit sheet exactly per §3.5 including keypad, title memory, recents row, category grid sheet, date sheet, repeat menu, splits, transfers, validation shake, haptics.
- Activity list, day headers, month pill, filter chips, summary strip, swipe actions, undo toast, context menu; Transaction detail; Search sheet.
- Home populated per §3.2 (Upcoming section may be stubbed until Phase 4).
- Accept: new expense in ≤ 4 taps; split saves only when remaining is 0; delete → undo restores identical row; 5,000 seeded rows scroll at 60 fps; foreign-currency row shows original + converted.

### Phase 3: Insights

- Insights tab per §3.7 with donut, bars, scrub, period stepper and swipe, kind toggle, category list; Category drill-down per §3.8.
- Chart components in `src/components/app` with light/dark tokens and accessibility labels.
- Accept: donut selection filters list and recolours bars; scrub label matches the list total for that day; Year view aggregates by month; splits are attributed per line.

### Phase 4: Budgets, recurring, accounts

- Budgets list/detail/add/edit per §3.9–3.10 with pace line; Home "This month" budget line.
- Recurring posting engine (start + foreground), Upcoming on Home and `/recurring`, rule sheet, skip/post.
- Accounts list/detail/add/edit, archive, default, delete-with-move; transfers in the add sheet; display currency + manual rates screen; converted totals everywhere.
- Accept: a monthly rule created on the 31st posts on the 28/29/30 in short months; budget progress ignores transfers and counts split lines; archived accounts are excluded from Home balance; changing display currency updates every total without restart.

### Phase 5: Settings, import/export, lock

- Settings per §3.13, categories manager with reassign-on-delete, appearance, week/month start applied to all period maths.
- CSV export (RFC 4180, UTF-8 BOM, columns: `date,time,kind,title,memo,amount,currency,category,account,transfer_account,transfer_amount,split_index,split_count,id`) via `expo-file-system` + `expo-sharing`; import presets: Dime (`Date,Note,Amount,Category,Type`) and Cashew export columns (read the formats from the reference repos' exporters; map, never copy), with preview and dedupe by (date, amount, title).
- Face ID lock with timeout, privacy blur, Erase all data.
- Accept: export → import round-trips 1,000 rows losslessly; Dime sample.csv imports with categories created; lock engages after timeout and on cold start; blur appears in the app switcher.

### Phase 6: Polish

- Haptics audit against §5.6, motion audit against §5.5, Reduce Motion path, Dynamic Type at xxxLarge on every screen, VoiceOver pass on Home/Activity/Add, very-large-amount pass (₹99,99,99,999.99 everywhere), empty states on every screen, Android render pass (no crashes, symbols fall back, hairlines visible), launch time < 1 s warm, bundle of SF Symbol names verified to exist on iOS 17.
- Accept: a checklist file `docs/QA.md` with every screen × state ticked; screenshots for every route in `.screenshots/`.

## 9. Implementation notes (orchestrator, binding)

- **Name**: working name **Farthing**. It lives in exactly two places: `app.json` `expo.name` and `APP_NAME` in `src/constants/app.ts`. Bundle id and scheme stay as they are.
- **Expo Go only**: any dependency with native code must appear in `node_modules/expo/bundledNativeModules.json`; add it with `pnpm exec expo install`. Pure-JS libraries are fine. Available and preferred: `@react-native-segmented-control/segmented-control` (every segmented control), `@react-native-community/datetimepicker`, `expo-crypto` (UUIDs), `expo-symbols`, `@expo/vector-icons` (Android/web icon fallback), `@expo/ui` (SwiftUI menus/pickers on iOS, only where it stays simple and there is a non-iOS fallback), `expo-glass-effect`. Not available: zeego, `@react-native-menu/menu`.
- **Styling**: Uniwind + Tailwind 4 (`src/global.css`). Replace the stock shadcn greys with the §5 tokens. Keep the shadcn variable names Reusables components expect and map them (`--background` = bg, `--card` = surface, `--primary` = accent, `--muted-foreground` = text-secondary, `--border`, `--destructive` = expense), then add our own (`surface`, `elevated`, `separator`, `text-tertiary`, `accent-soft`, `income`, `expense`, `warning`, `fill`, `overlay`, and the category palette). `src/theme/tokens.ts` mirrors the same values for Skia, Reanimated and any place that needs a raw colour.
- **Theme setting**: System/Light/Dark is applied with `Uniwind.setTheme(...)` (check the Uniwind API) plus `Appearance.setColorScheme` so native tabs, sheets and pickers match.
- **Web is a QA target only**: it is used to screenshot the UI. Native-only pieces get a `.web.tsx` fallback when needed (tabs, symbols, segmented control, sheets). Never degrade the native implementation for the web.
- **Data access**: repositories are plain functions that take the Drizzle db as their first argument and are typed against the shared sqlite-core schema, so the same code runs on expo-sqlite (app) and better-sqlite3 (jest tests). UI reads data through small hooks in `src/data/hooks/*`, using `useLiveQuery` from `drizzle-orm/expo-sqlite` or a simple store invalidation, never ad-hoc SQL in screens.
- **Pure logic lives in `src/lib`** (money, dates/periods, keypad reducer, recurring maths, CSV) and is unit-tested.
- **Dev data**: `src/db/dev-seed.ts` builds about 6 months of realistic sample transactions in INR (salary, rent, groceries, Swiggy/Zomato, Uber, subscriptions, a split, a transfer, one USD account). It's reachable from Settings → About only in `__DEV__`, and `?seed=demo` on web auto-seeds for screenshots.
- **Process**: agents never commit; the orchestrator verifies (`pnpm verify`, `pnpm screenshots`) and commits.
