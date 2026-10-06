# Research: what makes a finance tracker worth opening every day

Sources: App Store listings and reviews (Dime 4.8/317, Cashew 4.9/613, Copilot 4.8/31K, MoneyCoach), product pages (Copilot, MoneyCoach, Ducat, Groat, Quid, Kept, Coffer), a design teardown of Copilot (blakecrosley.com), comparison articles on YNAB/Monarch, and a code-level inventory of the two GPL reference repos (`.reference/dime`, `.reference/cashew`). Features and UX were studied; no code was copied.

## 1. Feature matrix

| Feature | Dime | Cashew | Best in class (who) | Our call |
|---|---|---|---|---|
| Entry fields | one 50-char note | title + note, title autocomplete sets category | title + memo, autocomplete (Cashew, MoneyCoach) | **Title + memo**, title memory fills category + account |
| Amount keypad | custom pad, auto-decimal | calculator pad (+ − × ÷), "000" key, haptics | calculator pad (Cashew) | Custom pad with + − and a 2-step =; no ÷ × |
| Category picker | inline emoji grid replaces keypad | chained bottom sheets, subcategories | inline, recents first (Dime) | Inline recents row + full grid sheet |
| Split transaction | no | no (separate "bill splitter") | Copilot, bank apps | **v1 core**, remainder auto-filled |
| Accounts / transfers | none (top review request) | wallets, paired transfer rows | Copilot, MoneyCoach | Accounts + single-row transfers |
| Multi-currency | one global currency, Double | per-wallet currency, online + custom rates | Florin, MoneyCoach | Per-account currency, manual rates in v1 |
| Money type | Double | Double (negative = expense, plus redundant flag) | Decimal/int | Integer minor units + ISO code |
| Charts | week/month/year bars only | pie, line, bar, heatmap | Copilot: charts are the interface, scrub + drill | Donut + bars + drill-down; scrub to inspect |
| Budgets | overall or per category, 4 periods | custom periods, category limits, filter matrix | simple + pace line (Copilot) | Overall + category, weekly/monthly/yearly, pace |
| Recurring | daily/weekly/monthly × N, no end date | subscription / repetitive / upcoming (3 near-identical types) | one rule type with "next due" (MoneyCoach) | One rule type, end date, upcoming list, post or skip |
| Search | notes only | text + 10 filter dimensions | text across title/memo + 3–4 filters | Title/memo/amount + category/account/date/type |
| Export / import | CSV `Date,Note,Amount,Category,Type` | CSV with column mapping, DB backup, Drive | CSV with date range (Copilot complaint: none) | CSV export w/ range; import Dime + Cashew CSV |
| Lock | Face ID | biometrics (buggy per reviews) | Face ID + privacy blur | Face ID + blur on background |
| Settings count | ~20 rows across 4 groups | ~75 reachable + 32 debug flags, 217 pref keys | ≤ 15 (Things 3) | ≤ 14 rows, no "more options" page |
| Undo | 4s "Tap to undo" toast on delete | activity log page | undo toast (Dime, Apple Mail) | Undo toast for delete |
| Dynamic Type | SF Pro Rounded, capped at xxLarge | custom font + text-contrast toggle | system fonts, scales (Apple) | SF Pro, scales to xxxLarge, amounts tabular |

## 2. What users praise (recurring themes)

- **Speed of entry**: "log in seconds" is the lead line for Groat, Ducat, Cashew ("fast entries"), MoneyCoach (Quick Entry). Dime reviewers cite "simple, minimizes overwhelm".
- **Design that feels native**: Dime ("superior design compared to paid competitors", "iOS-centric"); MoneyCoach ("a very good iPhone app first, finance tool second"); Copilot (ADA finalist, "charts are the primary interaction layer", "zero decorative chrome", 90% white text, semantic data colours used consistently everywhere).
- **Privacy and no bank login**: cited positively for Cashew, Kept, Coffer, Quid, Dime. Manual-entry users chose manual on purpose (Ducat: "intentional tracking").
- **Legible insights**: Copilot "clear instead of chaotic"; Cashew "well-structured, detailed overview".
- **Free core / one-time price**: resentment of $13/mo (Copilot) and "exhausting" systems (YNAB).

## 3. What users complain about

| Complaint | Where seen | Implication |
|---|---|---|
| No accounts / can't see where money is | Dime top review request | Accounts in v1 |
| Only a note field, no title | Dime | Title + memo |
| No charts / weak reporting | Dime | Insights tab with drill-down |
| Export can't be filtered by date | Copilot | Export sheet with range + account |
| Learning curve, too many concepts | YNAB, Monarch, Cashew ("not minimal at first") | One transaction type, one recurring type, one budget type |
| Biometric lock fails, keyboard glitches | Cashew (post-update) | Lock must be rock solid; custom keypad, never the system keyboard for amounts |
| Sync/bank data wrong | Monarch, Copilot | We avoid bank linking entirely |
| Ugly / outdated UI | YNAB, Bluecoins, Money Manager | Tokens, hairlines, no gradients, no mascots |
| Deleting a category deletes transactions | Dime (cascade) | Reassign on delete, never cascade |

## 4. Patterns worth stealing (behaviour, not code)

1. **Dime's one-screen add**: amount readout, keypad, category grid sliding in place of the keypad, date overlay, no navigation. Validation shakes the missing field; blank title defaults to the category name.
2. **Cashew's title memory**: typing "Swiggy" fills category Food and the last account. Highest-leverage speed feature.
3. **Dime's undo toast** on delete instead of a confirm dialog.
4. **Copilot's chart grammar**: one semantic colour per meaning, tap a segment to filter the list below, swipe to change period, numbers in tabular figures.
5. **Dime's week/month start settings** and "upcoming logs" toggle: small, cheap, loved.
6. **Cashew's upcoming/auto-pay**: recurring rows appear as "due" and can be posted or skipped.
7. **MoneyCoach's bulk edit and range export**: tax-season features reviewers ask for.

## 5. Anti-patterns to avoid

- Cashew: 3 recurring types, 2 loan systems, 13 reorderable home sections each with 7 period keys, settings split across 5 places, premium nags, a mascot.
- Dime: no seed categories (empty picker on first run), emoji icons (inconsistent weight next to SF text), category cascade-delete, single currency.
- Both: money as Double.
- Generic trackers: onboarding carousels, "tips" cards, gradient hero cards, confetti by default.

## 6. Conclusions that drive the spec

1. The core loop is **open → amount → category → save**; everything else is one tap away but never in the way. Target ≤ 3 s, ≤ 4 taps.
2. **One of each concept**: one transaction type (with kind expense/income/transfer), one recurring rule, one budget shape. Depth comes from splits, accounts, currencies and drill-down, not from option matrices.
3. **Charts are navigation**: every chart element is tappable and leads to the transactions behind it.
4. **Numbers are the UI**: tabular SF Pro, income green, expenses in plain text (red is reserved for warnings), locale grouping (en-IN lakh/crore).
5. **Native feel over custom chrome**: real tab bar, sheets, hairlines, system type, haptics on commit only.
6. **Settings ≤ 14 rows**. If a feature needs a toggle to be good, it is not good enough yet.
7. **Seed 12 expense + 6 income categories** with SF Symbols and a 12-colour palette tuned for light and dark.
8. **Switching cost is a feature**: import Dime and Cashew CSV on day one; export CSV with a date range.
