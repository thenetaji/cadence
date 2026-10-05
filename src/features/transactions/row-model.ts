import type { TransactionRowProps } from '@/components/app/transaction-row';
import type { TransactionListItem } from '@/data/hooks';
import { addDays, monthShort, parseKey } from '@/lib/dates';
import { convertWithRates, formatMoney, formatMoneyForSpeech, type RateLookup, type SignMode } from '@/lib/money';
import type { CategoryColorKey } from '@/theme/tokens';

export interface RowModelContext {
  displayCurrency: string;
  locale?: string;
  showDecimals: boolean;
  rates: RateLookup;
  /** When set, rows from other days show a short day ("Yesterday", "3 Oct") instead of the time. */
  relativeTo?: string;
}

export interface RowModel {
  id: string;
  kind: TransactionRowProps['kind'];
  title: string;
  subtitle: string;
  amount: string;
  trailing: string;
  icon: string;
  color: CategoryColorKey;
  split: boolean;
  accessibilityLabel: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function trailingDay(item: TransactionListItem, todayKey: string | undefined): string {
  if (!todayKey || item.dateKey === todayKey) return formatTime(item.occurredAt);
  if (item.dateKey === addDays(todayKey, -1)) return 'Yesterday';
  const { day, month } = parseKey(item.dateKey);
  return `${day} ${monthShort(month)}`;
}

const SIGN: Record<TransactionListItem['kind'], SignMode> = { expense: 'minus', income: 'plus', transfer: 'none' };
const asColor = (value: string | undefined): CategoryColorKey => (value ?? 'gray') as CategoryColorKey;

/** Maps a ledger item to TransactionRow props (SPEC 5.7): expense, income, transfer, split and foreign variants. */
export function toRowModel(item: TransactionListItem, ctx: RowModelContext): RowModel {
  const decimals = ctx.showDecimals ? undefined : 0;
  const sign = SIGN[item.kind];
  const amount = formatMoney(item.amount, item.currency, { locale: ctx.locale, sign, decimals });
  const spoken = formatMoneyForSpeech(item.amount, item.currency, { sign });
  const time = trailingDay(item, ctx.relativeTo);
  const split = item.splits.length > 1;
  const isTransfer = item.kind === 'transfer';

  let trailing = time;
  let spokenTrailing = time;
  let spokenAmount = spoken;
  if (!isTransfer && item.currency !== ctx.displayCurrency) {
    const rate = ctx.rates(item.currency, ctx.displayCurrency);
    if (rate !== null) {
      const converted = convertWithRates(item.amount, item.currency, ctx.displayCurrency, ctx.rates);
      trailing = `≈ ${formatMoney(converted, ctx.displayCurrency, { locale: ctx.locale, sign: 'none', decimals })}`;
      spokenAmount = `${spoken}, about ${formatMoneyForSpeech(converted, ctx.displayCurrency, { sign: 'none' })}`;
      spokenTrailing = time;
    }
  }

  const accountName = item.account.name;
  const firstSplit = item.splits[0];
  const categoryName = split ? `${item.splits.length} categories` : (item.category?.name ?? '');

  let title: string;
  let subtitle: string;
  let icon: string;
  let color: CategoryColorKey;
  if (isTransfer) {
    const to = item.transferAccount?.name ?? '';
    title = `${accountName} → ${to}`;
    subtitle = 'Transfer';
    icon = 'arrow.left.arrow.right';
    color = 'gray';
  } else {
    title = item.title || categoryName || 'Transaction';
    subtitle = [categoryName, accountName].filter(Boolean).join(' · ');
    icon = (split ? firstSplit?.category.icon : item.category?.icon) ?? 'tag.fill';
    color = asColor(split ? firstSplit?.category.color : item.category?.color);
  }

  const spokenTitle = isTransfer ? `${accountName} to ${item.transferAccount?.name ?? ''}` : title;
  const spokenSubtitle = isTransfer ? 'Transfer' : [categoryName, accountName].filter(Boolean).join(', ');
  const accessibilityLabel = [spokenTitle, spokenSubtitle, spokenAmount, spokenTrailing].filter(Boolean).join(', ');

  return { id: item.id, kind: item.kind, title, subtitle, amount, trailing, icon, color, split, accessibilityLabel };
}
