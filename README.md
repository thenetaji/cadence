# Cadence

A finance tracker for people whose income does not arrive on the first of the month.

Freelancers, contractors and anyone paid per project. Cadence answers three questions most
budgeting apps get wrong:

- **How long can I last if nothing comes in?** A runway figure built on cash you can actually
  spend today.
- **Where is my money if it is not in my account?** Money lent to friends and family is tracked
  as yours, not written off as spending.
- **How steady is my income really?** Gaps between payments and how much rides on one client.

Everything is read and stored on your own device. There is no account, no server and no upload.

## Why it exists

Most trackers assume a salary, treat a transfer between your own accounts as spending, and have
nowhere to record the money sitting with a friend. For irregular earners those three mistakes make
every number wrong.

## Status

Working: entries typed in by hand, CSV import, PDF import plumbing, transfers between your own
accounts, things that repeat, a forecast, and the whole interface. Parsers for specific banks,
cloud sync and mobile builds are planned but not written yet — see [ROADMAP.md](ROADMAP.md).

Currencies: **USD, EUR and INR**. Adding another is a line in
`packages/core/src/money/currencies.ts` plus its minor-unit exponent.

## Try it

```bash
pnpm install
pnpm dev
```

Open the app and choose **Use sample data instead** on the import screen. That loads ten months of
generated transactions so you can see every screen without touching your own statements.

## Recording by hand

Nothing has to be imported. The **+** button on any screen opens one sheet for all three kinds of
entry:

- **Spent** and **Received** ask for an amount, a name and a date. A name it has not seen before
  asks for its label there and then, so the entry lands in the right totals immediately.
- **Moved** records a transfer between two of your own accounts as both halves at once. It never
  reads as income on one side or spending on the other, and deleting one half deletes both.

Every row is editable, whether you typed it or imported it — tap it in Activity. Editing an
imported row drops the statement balance it carried, because that figure described the row as the
bank wrote it; the account is then anchored on the rows before it. **Undo** on the Activity screen
goes back through the last twenty-five changes.

If you have no account yet, the sheet offers to make one called Cash. Balances for accounts you
type in are read as the balance *now* — anything already recorded is worked backwards out of it.

## Planning ahead

The **Plan** screen is for money that has not moved yet.

- **Things that repeat** — rent, a subscription, a retainer — each with a rhythm and a next date.
  Recording one writes it into the ledger and moves it on; the amount can differ from the expected
  one, because a bill rarely lands to the penny.
- **A forecast** of the balance for the next ninety days: everything scheduled, plus ordinary
  spending at the rate of your recent months. Bills already in the schedule are taken out of that
  rate rather than counted twice. It names the lowest point and the day the money would run out.
- **A monthly spending target**, if you want one, with what is left and what each remaining day can
  hold.
- **Repayment dates** on money you have lent, ordered by urgency, with anything overdue marked.

## Importing your own data

Export a CSV from your bank and drop it in. Cadence works out which columns are the date, the
description and the amount, handles both a single signed amount column and separate
money-in / money-out columns, and copes with `1,234.56`, `1.234,56` and `12,69,536.00`.

Dates that could be read either way (`04/02/2026`) fall back to your locale, and you can flip the
order in the import screen if the preview looks wrong.

PDFs work too, but only where a parser exists for that bank. There is one reference parser and a
synthetic fixture showing the shape; see [CONTRIBUTING.md](CONTRIBUTING.md) for how to add a bank.
Where a bank offers CSV, prefer it — it needs no parser at all.

Accounts are created per import. Add one by hand in Settings for cash, or for an account with no
statement to import.

## Labels

Every name money moves to or from gets one of five labels. This is the only thing the app asks you
to teach it, and it is what makes the numbers mean anything:

| Label | Meaning |
| --- | --- |
| **Mine** | Another account or wallet of yours. Movement, not spending. |
| **Client** | Someone who pays you. |
| **Spending** | Money gone. |
| **Lent** | Money you expect back. Counted as yours, kept out of runway. |
| **Support** | Money given to family or friends, not expected back. |

After an import Cadence guesses the obvious ones — a name that only ever pays you and does so more
than once is a client; repeated outgoings are spending; anything matching your own accounts is a
transfer. Anyone you both pay *and* receive from is left for you to judge, because no rule can tell
lending from a shared dinner.

## Architecture

```
packages/core   Money, the data model, CSV and PDF import, analysis. No React, no DOM.
apps/web        The interface. Vite, React, Tailwind.
```

pdf.js loads only when someone picks a PDF, so the main bundle stays around 80 kB gzipped.

`packages/core` deliberately depends on nothing from the browser. Every rule about what a number
means lives there and is covered by tests, so a future mobile app can reuse it unchanged.

Money is stored as whole minor units with a currency code attached. Amounts of different currencies
cannot be added together — the type system refuses.

## Privacy

Statements are parsed in the browser. Your data is written to IndexedDB on the device and nowhere
else. **Export a backup** in Settings writes a JSON file you control, and **Export transactions as
CSV** writes one row per movement for a spreadsheet or an accountant. Deleting the site data
deletes everything.

## Licence

`packages/core` is MIT so the import and analysis code can be reused freely.
The application is AGPL-3.0 — you can self-host and modify it, and any hosted version must share
its changes. See [LICENSE](LICENSE).
