import { formatMoney } from '@/lib/money';

/** Two-letter avatar initials: "Rahul Sharma" -> "RS", "rahul" -> "R", "" -> "?". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = [...(words[0] ?? '')][0] ?? '';
  const last = words.length > 1 ? ([...(words[words.length - 1] ?? '')][0] ?? '') : '';
  return (first + last).toUpperCase();
}

export interface BalanceLike {
  currency: string;
  amount: number;
}

/** "owes you ₹2,400", "you owe ₹800"; several currencies join with a dot. Tone follows the largest balance. */
export function balanceLine(balances: readonly BalanceLike[], options: { locale?: string; decimals?: number } = {}): { text: string; tone: 'income' | 'secondary' } {
  if (balances.length === 0) return { text: 'settled', tone: 'secondary' };
  const parts = balances.map((b) => {
    const money = formatMoney(Math.abs(b.amount), b.currency, { locale: options.locale, sign: 'none', decimals: options.decimals });
    return b.amount > 0 ? `owes you ${money}` : `you owe ${money}`;
  });
  return { text: parts.join(' · '), tone: (balances[0]?.amount ?? 0) > 0 ? 'income' : 'secondary' };
}

/** Largest outstanding balance in the given currency, as a positive amount; 0 when none. */
export function outstandingIn(balances: readonly BalanceLike[], currency: string): number {
  return Math.abs(balances.find((b) => b.currency === currency)?.amount ?? 0);
}
