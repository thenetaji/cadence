import { toDateKey } from '@studio/dates';
import { isLendingKind } from '@/lib/ledger';
import { getCurrency, toMinor } from '@studio/money';
import { categoryKeys } from '@studio/theme';

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
  /** Stored tag names (matched ignoring case); omitted means none. */
  tags?: readonly { id: string; name: string }[];
  /** Stored people (matched ignoring case); omitted means none. */
  people?: readonly { id: string; name: string }[];
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
  /** Tag names, deduplicated. */
  tags: string[];
  /** Person name for the lending kinds. */
  personName: string | null;
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
  /** Tag names that do not exist yet. */
  newTags: string[];
  /** People that do not exist yet. */
  newPeople: string[];
  stats: ImportStats;
}

const norm = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

export const accountKey = (name: string) => norm(name);

/** Plan key per stored account id: the name, plus the currency when two stored accounts share a name. */
export function existingAccountKeys(list: readonly ExistingAccount[]): Map<string, string> {
  const seen = new Set<string>();
  const out = new Map<string, string>();
  for (const a of list) {
    const base = accountKey(a.name);
    out.set(a.id, seen.has(base) ? `${base}|${a.currency}` : base);
    seen.add(base);
  }
  return out;
}

interface PlanAccount {
  key: string;
  name: string;
  currency: string;
}
export const categoryKey = (kind: 'expense' | 'income', name: string) => `${kind}:${norm(name)}`;

/** Transactions match when day, amount and title agree. */
export function dedupeKey(dateKey: string, amount: number, title: string): string {
  return `${dateKey}|${amount}|${norm(title)}`;
}

const fallbackCategory = (kind: 'expense' | 'income') => (kind === 'income' ? 'Other income' : 'Other');
const DEFAULT_ACCOUNT_NAME = 'Cash';

/** Resolves a parsed file against existing data: matches or plans accounts and categories, converts amounts, drops duplicates. */
export function planImport(rows: readonly ImportRow[], existing: ExistingData, defaults: PlanDefaults): ImportPlan {
  // Accounts by normalised name; a name can hold several currencies.
  const registry = new Map<string, PlanAccount[]>();
  const keyById = existingAccountKeys(existing.accounts);
  for (const a of existing.accounts) {
    const list = registry.get(accountKey(a.name)) ?? [];
    list.push({ key: keyById.get(a.id) as string, name: a.name, currency: a.currency });
    registry.set(accountKey(a.name), list);
  }
  const categories = new Set(existing.categories.map((c) => categoryKey(c.kind, c.name)));
  const remaining = new Map(existing.keys);
  const seenIds = new Set(existing.ids);

  const defaultAccount =
    existing.accounts.find((a) => a.id === defaults.defaultAccountId) ?? existing.accounts[0] ?? null;

  const newAccounts = new Map<string, { key: string; name: string; currency: string }>();
  const newCategories = new Map<string, { key: string; kind: 'expense' | 'income'; name: string }>();
  const knownTags = new Set((existing.tags ?? []).map((t) => norm(t.name)));
  const knownPeople = new Set((existing.people ?? []).map((p) => norm(p.name)));
  const newTags = new Map<string, string>();
  const newPeople = new Map<string, string>();
  const usedAccounts = new Set<string>();
  const usedCategories = new Set<string>();
  const out: PlannedTransaction[] = [];
  let duplicates = 0;
  let skipped = 0;

  /**
   * Accounts match by name and currency. With a stated currency that differs from the stored one,
   * a separate "Name (CUR)" account is used; amounts are never relabelled. With no stated currency
   * the stored account wins, and a new account takes `fallback`.
   */
  const resolve = (name: string, code: string | null, fallback: string): PlanAccount => {
    const base = accountKey(name);
    const found = registry.get(base) ?? [];
    if (!code) return found[0] ?? { key: base, name: name.trim(), currency: fallback };
    const same = found.find((a) => a.currency === code);
    if (same) return same;
    if (found.length === 0) return { key: base, name: name.trim(), currency: code };
    const altName = `${name.trim()} (${code})`;
    const alt = (registry.get(accountKey(altName)) ?? []).find((a) => a.currency === code);
    return alt ?? { key: accountKey(altName), name: altName, currency: code };
  };
  const knownCode = (code: string | null) => (code && getCurrency(code) ? code : null);

  for (const row of rows) {
    const kind = row.kind;
    const accountName = row.account?.trim() || defaultAccount?.name || DEFAULT_ACCOUNT_NAME;
    const account = resolve(accountName, knownCode(row.currency), defaults.displayCurrency);
    const aKey = account.key;
    const currency = account.currency;

    const amount = toMinor(row.amount, currency);
    if (amount === null || amount <= 0) {
      skipped++;
      continue;
    }

    let transferKey: string | null = null;
    let transferAcct: PlanAccount | null = null;
    let transferAmount: number | null = null;
    let transferCurrency = currency;
    if (kind === 'transfer') {
      const transferName = row.transferAccount?.trim() ?? '';
      const sameAmount = row.transferAmount === null || row.transferAmount === row.amount;
      transferAcct = transferName ? resolve(transferName, null, sameAmount ? currency : defaults.displayCurrency) : null;
      transferKey = transferAcct?.key ?? null;
      if (!transferAcct || transferKey === aKey) {
        skipped++;
        continue;
      }
      transferCurrency = transferAcct.currency;
      transferAmount = row.transferAmount === null ? amount : toMinor(row.transferAmount, transferCurrency);
      if (transferAmount === null || transferAmount <= 0) {
        skipped++;
        continue;
      }
    }

    const lending = isLendingKind(kind);
    const personName = lending ? (row.person?.trim().replace(/\s+/g, ' ') ?? '') : '';
    if (lending && personName === '') {
      skipped++;
      continue;
    }

    const lineKind = kind === 'income' ? 'income' : 'expense';
    const lineName = (name: string) => name.trim() || fallbackCategory(lineKind);
    let cKey: string | null = null;
    const splits: { categoryKey: string; amount: number }[] = [];
    const names: string[] = [];
    if (kind !== 'transfer' && !lending) {
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

    const title = row.title.trim() || (kind === 'transfer' ? '' : lending ? personName : (names[0] ?? ''));
    const key = dedupeKey(toDateKey(row.occurredAt), amount, title);
    const left = remaining.get(key) ?? 0;
    if ((row.id && seenIds.has(row.id)) || left > 0) {
      if (left > 0) remaining.set(key, left - 1);
      duplicates++;
      continue;
    }
    if (row.id) seenIds.add(row.id);

    const register = (a: PlanAccount) => {
      usedAccounts.add(a.key);
      const list = registry.get(accountKey(a.name)) ?? [];
      if (list.some((x) => x.key === a.key)) return;
      newAccounts.set(a.key, a);
      registry.set(accountKey(a.name), [...list, a]);
    };
    register(account);
    if (transferAcct) register(transferAcct);
    const registerCategory = (name: string, k: string) => {
      usedCategories.add(k);
      if (!categories.has(k) && !newCategories.has(k)) newCategories.set(k, { key: k, kind: lineKind, name: name.trim() });
    };
    if (cKey) registerCategory(names[0] as string, cKey);
    splits.forEach((s, i) => registerCategory(names[i] as string, s.categoryKey));

    const rowTags: string[] = [];
    for (const raw of row.tags ?? []) {
      const name = raw.trim().replace(/\s+/g, ' ');
      if (name === '' || rowTags.some((t) => norm(t) === norm(name))) continue;
      rowTags.push(name);
      if (!knownTags.has(norm(name)) && !newTags.has(norm(name))) newTags.set(norm(name), name);
    }
    if (lending && !knownPeople.has(norm(personName)) && !newPeople.has(norm(personName))) newPeople.set(norm(personName), personName);

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
      tags: rowTags,
      personName: lending ? personName : null,
    });
  }

  return {
    transactions: out,
    newAccounts: [...newAccounts.values()],
    newCategories: [...newCategories.values()],
    newTags: [...newTags.values()],
    newPeople: [...newPeople.values()],
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

/** "8 categories (3 new) · 1 account": the breakdown beneath the transaction count. */
export function importBreakdown(stats: Pick<ImportStats, 'categories' | 'newCategories' | 'accounts' | 'newAccounts'>): string {
  const categories = `${stats.categories} ${stats.categories === 1 ? 'category' : 'categories'}`;
  const accounts = `${stats.accounts} ${stats.accounts === 1 ? 'account' : 'accounts'}`;
  return [
    stats.newCategories > 0 ? `${categories} (${stats.newCategories} new)` : categories,
    stats.newAccounts > 0 ? `${accounts} (${stats.newAccounts} new)` : accounts,
  ].join(' · ');
}
