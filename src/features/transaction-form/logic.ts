import { defaultAnchorDay, nextDueDate, type Frequency } from '@/lib/recurring';
import { addDays, dayLabel, keyToLocalMs, toDateKey, weekday, type DateKey } from '@/lib/dates';
import { convertMinor } from '@/lib/money';
import type { RecurringInput } from '@/db/repos/recurring';
import type { SplitInput, TransactionInput } from '@/db/repos/transactions';
import type { TransactionKind } from '@/db/schema';

export const MAX_SPLIT_LINES = 8;

export interface SplitDraftLine {
  key: string;
  categoryId: string | null;
  amount: number;
}

export interface RepeatDraft {
  frequency: Frequency;
  interval: number;
  endDate: DateKey | null;
}

/** Everything the sheet edits, in minor units. Shared between the sheet and its sub-sheets. */
export interface Draft {
  kind: TransactionKind;
  amount: number;
  /** Explicit "Receives" amount for cross-currency transfers; null follows the fx rate. */
  receives: number | null;
  title: string;
  memo: string;
  categoryId: string | null;
  accountId: string | null;
  transferAccountId: string | null;
  occurredAt: number;
  repeat: RepeatDraft | null;
  splits: SplitDraftLine[] | null;
  /** Normalised title a suggestion chip filled in; hides the suggestions until the title changes. */
  appliedTitleNorm: string | null;
}

// ---------------------------------------------------------------- splits

export const splitRemaining = (total: number, lines: readonly SplitDraftLine[]): number =>
  total - lines.reduce((sum, line) => sum + line.amount, 0);

let lineCounter = 0;
export const newLineKey = (): string => `line-${++lineCounter}`;

/** Two lines: the current category with the full amount, and an empty one. */
export function startSplit(total: number, categoryId: string | null): SplitDraftLine[] {
  return [
    { key: newLineKey(), categoryId, amount: total },
    { key: newLineKey(), categoryId: null, amount: 0 },
  ];
}

export function addSplitLine(lines: readonly SplitDraftLine[]): SplitDraftLine[] {
  if (lines.length >= MAX_SPLIT_LINES) return [...lines];
  return [...lines, { key: newLineKey(), categoryId: null, amount: 0 }];
}

/** Removing a line from a two-line split collapses it (`null`). */
export function removeSplitLine(lines: readonly SplitDraftLine[], key: string): SplitDraftLine[] | null {
  const next = lines.filter((line) => line.key !== key);
  return next.length < 2 ? null : next;
}

export function updateSplitLine(lines: readonly SplitDraftLine[], key: string, patch: Partial<Omit<SplitDraftLine, 'key'>>): SplitDraftLine[] {
  return lines.map((line) => (line.key === key ? { ...line, ...patch } : line));
}

/** Category kept when a split collapses back to one: the first line's. */
export const collapsedCategory = (lines: readonly SplitDraftLine[]): string | null => lines[0]?.categoryId ?? null;

// ---------------------------------------------------------------- defaults

export interface DefaultsInput {
  params: { kind?: string; accountId?: string; categoryId?: string };
  lastKind: TransactionKind;
  lastAccountId: string | null;
  defaultAccountId: string | null;
  accounts: readonly { id: string }[];
  categories: readonly { id: string; kind: string }[];
}

export interface ResolvedDefaults {
  kind: TransactionKind;
  accountId: string | null;
  transferAccountId: string | null;
  categoryId: string | null;
}

const isKind = (value: unknown): value is TransactionKind => value === 'expense' || value === 'income' || value === 'transfer';

export function resolveDefaults(input: DefaultsInput): ResolvedDefaults {
  const { params, accounts } = input;
  const kind = isKind(params.kind) ? params.kind : input.lastKind;
  const has = (id: string | null | undefined): id is string => !!id && accounts.some((a) => a.id === id);
  const accountId =
    [params.accountId, input.lastAccountId, input.defaultAccountId].find(has) ?? accounts[0]?.id ?? null;
  const transferAccountId = kind === 'transfer' ? pickOtherAccount(accounts, accountId, null) : null;
  const category = params.categoryId ? input.categories.find((c) => c.id === params.categoryId) : undefined;
  const categoryId = kind !== 'transfer' && category?.kind === kind ? category.id : null;
  return { kind, accountId, transferAccountId, categoryId };
}

export function pickOtherAccount(accounts: readonly { id: string }[], accountId: string | null, current: string | null): string | null {
  if (current && current !== accountId && accounts.some((a) => a.id === current)) return current;
  return accounts.find((a) => a.id !== accountId)?.id ?? null;
}

/** Fields to patch when the kind changes: categories and splits belong to one kind. */
export function kindChangePatch(
  draft: Pick<Draft, 'accountId' | 'categoryId' | 'transferAccountId'>,
  kind: TransactionKind,
  accounts: readonly { id: string }[],
  categories: readonly { id: string; kind: string }[],
): Partial<Draft> {
  const keepCategory = kind !== 'transfer' && categories.some((c) => c.id === draft.categoryId && c.kind === kind);
  return {
    kind,
    categoryId: keepCategory ? draft.categoryId : null,
    splits: null,
    transferAccountId: kind === 'transfer' ? pickOtherAccount(accounts, draft.accountId, draft.transferAccountId) : draft.transferAccountId,
  };
}

// ---------------------------------------------------------------- transfers

/** Receives amount from the rate; 0 when no rate is known across different currencies. */
export function autoReceives(amount: number, from: string, to: string, rate: number | null): number {
  if (from === to) return amount;
  return rate === null ? 0 : convertMinor(amount, from, to, rate);
}

// ---------------------------------------------------------------- repeat

export const REPEAT_PRESETS: readonly { label: string; frequency: Frequency }[] = [
  { label: 'Daily', frequency: 'daily' },
  { label: 'Weekly', frequency: 'weekly' },
  { label: 'Monthly', frequency: 'monthly' },
  { label: 'Yearly', frequency: 'yearly' },
];

const UNIT: Record<Frequency, [string, string]> = {
  daily: ['day', 'days'],
  weekly: ['week', 'weeks'],
  monthly: ['month', 'months'],
  yearly: ['year', 'years'],
};

const PRESET_LABEL: Record<Frequency, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

export function repeatLabel(repeat: Pick<RepeatDraft, 'frequency' | 'interval'> | null): string {
  if (!repeat) return 'Never';
  if (repeat.interval <= 1) return PRESET_LABEL[repeat.frequency];
  return `Every ${repeat.interval} ${UNIT[repeat.frequency][1]}`;
}

// ---------------------------------------------------------------- date

const pad = (n: number) => String(n).padStart(2, '0');

export function timeLabel(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Today", "Yesterday", "Mon 3 Oct"; the time is appended only when `withTime` (the user changed it): "Today 14:32". */
export function dateChipLabel(occurredAt: number, todayKey: DateKey, withTime = true): string {
  const day = dayLabel(toDateKey(occurredAt), todayKey);
  return withTime ? `${day} ${timeLabel(occurredAt)}` : day;
}

export const minuteOfDay = (ms: number): number => new Date(ms).getHours() * 60 + new Date(ms).getMinutes();

/** Same time of day on another date key. */
export function withDateKey(occurredAt: number, key: DateKey): number {
  const d = new Date(occurredAt);
  return keyToLocalMs(key, d.getHours(), d.getMinutes());
}

export const yesterdayOf = (now: number): number => withDateKey(now, addDays(toDateKey(now), -1));

// ---------------------------------------------------------------- save

export interface SaveContext {
  /** True when the source and destination accounts share a currency (or it is not a transfer). */
  sameCurrency: boolean;
  /** Receives amount after applying the rate fallback. */
  receivesAmount: number;
}

export type SaveBlock = 'amount' | 'accounts' | 'receives' | 'split_total' | 'category' | 'split_category';

/** What stops a save, or null. Save is disabled for everything except the two category cases (those shake). */
export function saveBlock(draft: Draft, ctx: SaveContext): SaveBlock | null {
  if (draft.amount <= 0) return 'amount';
  if (draft.kind === 'transfer') {
    if (!draft.accountId || !draft.transferAccountId || draft.accountId === draft.transferAccountId) return 'accounts';
    if (!ctx.sameCurrency && ctx.receivesAmount <= 0) return 'receives';
    return null;
  }
  if (draft.splits) {
    const nonEmpty = draft.splits.every((line) => line.amount > 0);
    if (splitRemaining(draft.amount, draft.splits) !== 0 || !nonEmpty) return 'split_total';
    if (draft.splits.some((line) => !line.categoryId)) return 'split_category';
    return null;
  }
  return draft.categoryId ? null : 'category';
}

export const isSaveDisabled = (block: SaveBlock | null): boolean => block !== null && block !== 'category' && block !== 'split_category';

export function buildTransactionInput(draft: Draft, ctx: SaveContext, recurringRuleId: string | null = null): TransactionInput {
  const base: TransactionInput = {
    kind: draft.kind,
    title: draft.title,
    memo: draft.memo,
    amount: draft.amount,
    accountId: draft.accountId ?? '',
    occurredAt: draft.occurredAt,
    recurringRuleId,
  };
  if (draft.kind === 'transfer') {
    return { ...base, transferAccountId: draft.transferAccountId, transferAmount: ctx.sameCurrency ? draft.amount : ctx.receivesAmount };
  }
  if (draft.splits) {
    const splits: SplitInput[] = draft.splits.map((line) => ({ categoryId: line.categoryId ?? '', amount: line.amount }));
    return { ...base, splits };
  }
  return { ...base, categoryId: draft.categoryId };
}

/** Rule for Repeat ≠ Never. This transaction is the first occurrence, so `nextDue` is the one after it. */
export function buildRuleInput(draft: Draft, ctx: SaveContext, fallbackTitle: string): RecurringInput | null {
  if (!draft.repeat || !draft.accountId) return null;
  const startDate = toDateKey(draft.occurredAt);
  const { frequency, interval, endDate } = draft.repeat;
  const nextDue = nextDueDate({ frequency, interval, anchorDay: defaultAnchorDay(frequency, startDate, weekday), startDate }, startDate);
  return {
    kind: draft.kind,
    title: draft.title.trim() || fallbackTitle,
    memo: draft.memo,
    amount: draft.amount,
    accountId: draft.accountId,
    categoryId: draft.kind === 'transfer' ? null : (draft.splits?.[0]?.categoryId ?? draft.categoryId),
    transferAccountId: draft.kind === 'transfer' ? draft.transferAccountId : null,
    transferAmount: draft.kind === 'transfer' ? (ctx.sameCurrency ? draft.amount : ctx.receivesAmount) : null,
    frequency,
    interval,
    startDate,
    endDate,
    nextDue,
  };
}

// ---------------------------------------------------------------- draft factories

export function emptyDraft(defaults: ResolvedDefaults, now: number): Draft {
  return {
    kind: defaults.kind,
    amount: 0,
    receives: null,
    title: '',
    memo: '',
    categoryId: defaults.categoryId,
    accountId: defaults.accountId,
    transferAccountId: defaults.transferAccountId,
    occurredAt: now,
    repeat: null,
    splits: null,
    appliedTitleNorm: null,
  };
}

interface SourceTransaction {
  kind: TransactionKind;
  title: string;
  memo: string;
  amount: number;
  currency: string;
  accountId: string;
  categoryId: string | null;
  transferAccountId: string | null;
  transferAmount: number | null;
  transferCurrency: string | null;
  occurredAt: number;
  splits: readonly { categoryId: string; amount: number }[];
}

/** Edit mode keeps the date; duplicating uses `now` and drops the recurring link. */
export function draftFromTransaction(source: SourceTransaction, occurredAt: number): Draft {
  const cross = source.transferCurrency !== null && source.transferCurrency !== source.currency;
  return {
    kind: source.kind,
    amount: source.amount,
    receives: source.kind === 'transfer' && cross ? source.transferAmount : null,
    title: source.title,
    memo: source.memo,
    categoryId: source.categoryId,
    accountId: source.accountId,
    transferAccountId: source.transferAccountId,
    occurredAt,
    repeat: null,
    splits:
      source.splits.length > 0
        ? source.splits.map((line) => ({ key: newLineKey(), categoryId: line.categoryId, amount: line.amount }))
        : null,
    appliedTitleNorm: null,
  };
}

/** "₹340" for whole amounts, "₹340.50" otherwise: compact money for chips and the split footer. */
export function moneyShort(minor: number, currency: string, format: (minor: number, currency: string, options: { decimals?: number; sign?: 'none' }) => string, digits: number): string {
  const whole = minor % 10 ** digits === 0;
  return format(minor, currency, { sign: 'none', ...(whole ? { decimals: 0 } : {}) });
}
