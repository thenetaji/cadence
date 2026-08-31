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

Early. CSV import, PDF import plumbing, the data model and the interface are working. Parsers for
specific banks, cloud sync and mobile builds are planned but not written yet — see
[ROADMAP.md](ROADMAP.md).

Currencies: **USD, EUR and INR**. Adding another is a line in
`packages/core/src/money/currencies.ts` plus its minor-unit exponent.

## Try it

```bash
pnpm install
pnpm dev
```

Open the app and choose **Use sample data instead** on the import screen. That loads ten months of
generated transactions so you can see every screen without touching your own statements.

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
else. **Export a backup** in Settings writes a JSON file you control. Deleting the site data
deletes everything.

## Licence

`packages/core` is MIT so the import and analysis code can be reused freely.
The application is AGPL-3.0 — you can self-host and modify it, and any hosted version must share
its changes. See [LICENSE](LICENSE).
