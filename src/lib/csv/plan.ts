import { toDateKey } from '@/lib/dates';
import { getCurrency, toMinor } from '@/lib/money';
import { categoryKeys } from '@/theme/tokens';

import type { ImportKind, ImportRow } from './import';

export const IMPORT_CATEGORY_ICON = 'tag.fill';
export const IMPORT_PALETTE = categoryKeys.filter((key) => key !== 'gray');

export interface ExistingAccount {
  id: string;
  name: string;
  currency: string;
}
export interface ExistingCategory {
  id: string;
  name: string;
  kind: 'expense' | 'income';
}
export interface ExistingData {
  accounts: readonly ExistingAccount[];
  categories: readonly ExistingCategory[];
  ids: ReadonlySet<string>;
  /** Number of stored transactions per dedupe key; see {@link dedupeKey}. */
  keys: ReadonlyMap<string, number>;
}
export interface PlanDefaults {
  displayCurrency: string;
  defaultAccountId: string | null;
}

export interface PlannedTransaction {
  id?: string;
  kind: ImportKind;
  occurredAt: number;
  title: string;
  memo: string;
  amount: number;
  currency: string;
  accountKey: string;
  categoryKey: string | null;
  /** Display name of the (first) category; null for transfers. */
  categoryName: string | null;
  transferAccountKey: string | null;
  transferAmount: number | null;
  splits: { categoryKey: string; amount: number }[];
}

export interface ImportStats {
  transactions: number;
  categories: number;
  newCategories: number;
  accounts: number;
  newAccounts: number;
  duplicates: number;
  skipped: number;
}

export interface ImportPlan {
  transactions: PlannedTransaction[];
  newAccounts: { key: string; name: string; currency: string }[];
  newCategories: { key: string; kind: 'expense' | 'income'; name: string }[];
  stats: ImportStats;
}

const norm = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

export const accountKey = (name: string) => norm(name);
export const categoryKey = (kind: 'expense' | 'income', name: string) => `${kind}:${norm(name)}`;

/** Transactions match when day, amount and title agree. */
export function dedupeKey(dateKey: string, amount: number, title: string): string {
  return `${dateKey}|${amount}|${norm(title)}`;
}

const fallbackCategory = (kind: 'expense' | 'income') => (kind === 'income' ? 'Other income' : 'Other');
const DEFAULT_ACCOUNT_NAME = 'Cash';

/** Resolves a parsed file against existing data: matches or plans accounts and categories, converts amounts, drops duplicates. */
export function planImport(rows: readonly ImportRow[], existing: ExistingData, defaults: PlanDefaults): ImportPlan {
  const accounts = new Map(existing.accounts.map((a) => [accountKey(a.name), a]));
  const categories = new Set(existing.categories.map((c) => categoryKey(c.kind, c.name)));
  const remaining = new Map(existing.keys);
  const seenIds = new Set(existing.ids);

  const defaultAccount =
    existing.accounts.find((a) => a.id === defaults.defaultAccountId) ?? existing.accounts[0] ?? null;

  const newAccounts = new Map<string, { key: string; name: string; currency: string }>();
  const newCategories = new Map<string, { key: string; kind: 'expense' | 'income'; name: string }>();
  const usedAccounts = new Set<string>();
  const usedCategories = new Set<string>();
  const out: PlannedTransaction[] = [];
  let duplicates = 0;
  let skipped = 0;

  const currencyOf = (key: string, hint: string): string =>
    accounts.get(key)?.currency ?? newAccounts.get(key)?.currency ?? hint;
  const hintFor = (code: string | null) => (code && getCurrency(code) ? code : defaults.displayCurrency);

  for (const row of rows) {
    const kind = row.kind;
    const accountName = row.account?.trim() || defaultAccount?.name || DEFAULT_ACCOUNT_NAME;
    const aKey = accountKey(accountName);
    const currency = currencyOf(aKey, hintFor(row.currency));

    const amount = toMinor(row.amount, currency);
    if (amount === null || amount <= 0) {
      skipped++;
      continue;
    }

    let transferKey: string | null = null;
    let transferName = '';
    let transferAmount: number | null = null;
    let transferCurrency = currency;
    if (kind === 'transfer') {
      transferName = row.transferAccount?.trim() ?? '';
      transferKey = transferName ? accountKey(transferName) : null;
      if (!transferKey || transferKey === aKey) {
        skipped++;
        continue;
      }
      const sameAmount = row.transferAmount === null || row.transferAmount === row.amount;
      transferCurrency = currencyOf(transferKey, sameAmount ? currency : defaults.displayCurrency);
      transferAmount = row.transferAmount === null ? amount : toMinor(row.transferAmount, transferCurrency);
      if (transferAmount === null || transferAmount <= 0) {
        skipped++;
        continue;
      }
    }

    const lineKind = kind === 'income' ? 'income' : 'expense';
    const lineName = (name: string) => name.trim() || fallbackCategory(lineKind);
    let cKey: string | null = null;
    const splits: { categoryKey: string; amount: number }[] = [];
    const names: string[] = [];
    if (kind !== 'transfer') {
      if (row.splits.length > 0) {
        let sum = 0;
        for (const line of row.splits) {
          const minor = toMinor(line.amount, currency);
          if (minor === null || minor <= 0) {
            sum = -1;
            break;
          }
          sum += minor;
          names.push(lineName(line.category));
          splits.push({ categoryKey: categoryKey(lineKind, lineName(line.category)), amount: minor });
        }
        if (sum !== amount || splits.length < 2 || splits.length > 8) {
          skipped++;
          continue;
        }
      } else {
        names.push(lineName(row.category));
        cKey = categoryKey(lineKind, lineName(row.category));
      }
    }

    const title = row.title.trim() || (kind === 'transfer' ? '' : (names[0] ?? ''));
    const key = dedupeKey(toDateKey(row.occurredAt), amount, title);
    const left = remaining.get(key) ?? 0;
    if ((row.id && seenIds.has(row.id)) || left > 0) {
      if (left > 0) remaining.set(key, left - 1);
      duplicates++;
      continue;
    }
    if (row.id) seenIds.add(row.id);

    const register = (name: string, code: string, k: string) => {
      usedAccounts.add(k);
      if (!accounts.has(k) && !newAccounts.has(k)) newAccounts.set(k, { key: k, name: name.trim(), currency: code });
    };
    register(accountName, currency, aKey);
    if (transferKey) register(transferName, transferCurrency, transferKey);
    const registerCategory = (name: string, k: string) => {
      usedCategories.add(k);
      if (!categories.has(k) && !newCategories.has(k)) newCategories.set(k, { key: k, kind: lineKind, name: name.trim() });
    };
    if (cKey) registerCategory(names[0] as string, cKey);
    splits.forEach((s, i) => registerCategory(names[i] as string, s.categoryKey));

    out.push({
      id: row.id,
      kind,
      occurredAt: row.occurredAt,
      title,
      memo: row.memo.trim(),
      amount,
      currency,
      accountKey: aKey,
      categoryKey: cKey,
      categoryName: names[0] ?? null,
      transferAccountKey: transferKey,
      transferAmount,
      splits,
    });
  }

  return {
    transactions: out,
    newAccounts: [...newAccounts.values()],
    newCategories: [...newCategories.values()],
    stats: {
      transactions: out.length,
      categories: usedCategories.size,
      newCategories: newCategories.size,
      accounts: usedAccounts.size,
      newAccounts: newAccounts.size,
      duplicates,
      skipped,
    },
  };
}

/** "312 transactions, 14 categories (3 new), 2 accounts" */
export function importSummary(stats: Pick<ImportStats, 'transactions' | 'categories' | 'newCategories' | 'accounts'>): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const categories = `${stats.categories} ${stats.categories === 1 ? 'category' : 'categories'}`;
  return [
    plural(stats.transactions, 'transaction'),
    stats.newCategories > 0 ? `${categories} (${stats.newCategories} new)` : categories,
    plural(stats.accounts, 'account'),
  ].join(', ');
}
