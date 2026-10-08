import type { AccountWithBalance } from "@/data/hooks";
import {
  convertWithRates,
  formatMoney,
  formatMoneyForSpeech,
  sumConverted,
  type RateLookup,
} from "@studio/money";
import type { AccountType } from "@/db/schema";
import type { CategoryColorKey } from "@studio/theme";

export const TYPE_LABELS: Record<AccountType, string> = {
  cash: "Cash",
  bank: "Bank",
  card: "Card",
  other: "Other",
};
export const TYPES: readonly AccountType[] = ["cash", "bank", "card", "other"];

export interface AccountFormat {
  displayCurrency: string;
  rates: RateLookup;
  locale?: string;
  showDecimals: boolean;
}

export interface AccountView {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  color: CategoryColorKey;
  negative: boolean;
  balance: string;
  /** "≈ ₹10,140" when the account's currency differs from the display currency and a rate exists. */
  converted?: string;
  archived: boolean;
  accessibilityLabel: string;
}

/** Sum of balances in the display currency. Accounts in a currency with no rate are left out, never added unconverted. */
export function totalInDisplay(
  accounts: readonly AccountWithBalance[],
  fmt: Pick<AccountFormat, "displayCurrency" | "rates">,
): { total: number; excluded: AccountWithBalance[] } {
  const priced = accounts.filter(
    (a) => fmt.rates(a.currency, fmt.displayCurrency) !== null,
  );
  const { total } = sumConverted(
    priced.map((a) => ({ minor: a.balance, currency: a.currency })),
    fmt.displayCurrency,
    fmt.rates,
  );
  return { total, excluded: accounts.filter((a) => !priced.includes(a)) };
}

export function toAccountView(
  account: AccountWithBalance,
  fmt: AccountFormat,
): AccountView {
  const decimals = fmt.showDecimals ? undefined : 0;
  const balance = formatMoney(account.balance, account.currency, {
    locale: fmt.locale,
    decimals,
  });
  const foreign =
    account.currency !== fmt.displayCurrency &&
    fmt.rates(account.currency, fmt.displayCurrency) !== null;
  const converted = foreign
    ? `≈ ${formatMoney(convertWithRates(account.balance, account.currency, fmt.displayCurrency, fmt.rates), fmt.displayCurrency, { locale: fmt.locale, decimals })}`
    : undefined;
  return {
    id: account.id,
    name: account.name,
    subtitle: TYPE_LABELS[account.type],
    icon: account.icon,
    color: account.color as CategoryColorKey,
    negative: account.balance < 0,
    balance,
    converted,
    archived: account.archivedAt !== null,
    accessibilityLabel: [
      account.name,
      TYPE_LABELS[account.type],
      formatMoneyForSpeech(account.balance, account.currency, {
        locale: fmt.locale,
      }),
    ].join(", "),
  };
}
