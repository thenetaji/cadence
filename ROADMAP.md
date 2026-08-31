# Roadmap

Ordered by what unblocks the most people, not by what is most interesting to build.

## Working now

- CSV import with column detection, delimiter sniffing and locale-aware dates and amounts
- PDF import plumbing: a `StatementParser` interface, a synthetic fixture generator and one
  reference parser
- USD, EUR and INR, each with its own minor-unit handling; amounts of different currencies cannot
  be added
- Several accounts, including ones you type a balance into by hand
- Five-label counterparty model with automatic suggestions after import
- Runway, monthly flow, income rhythm, lending ledger and larger-decision detection
- Overview, Activity, People, Person and Income screens in light and dark
- Local persistence, JSON export and restore
- Installable as a web app with an offline shell

## Next

- **Parsers for real banks.** The interface and fixture pattern are in place; each bank is one
  file, one fixture and one test. Needed anywhere statements are only issued as PDFs.
- **Accounts in different currencies at once.** The model carries currency per account; the
  interface still assumes a single display currency.
- **Expected repayment dates on lending**, so money coming back appears in a forecast.

## Later

- **Encrypted sync.** An adapter interface with an S3-compatible implementation. The device stays
  the source of truth; the server only ever holds ciphertext.
- **Android build via Capacitor**, distributed as an APK from GitHub Releases.
- **iOS build**, once there is a reason to pay for an Apple Developer account.

## Deliberately not planned

- Bank account linking through an aggregator. It requires regulated status in most countries and
  would mean handling other people's credentials.
- A hosted service that stores readable financial data.
- Advertising.
- Configurable categories, custom fields or a rule builder. The five labels are the whole model on
  purpose; every tracker that added flexibility here became a chore to maintain.
