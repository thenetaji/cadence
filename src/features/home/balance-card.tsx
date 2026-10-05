import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { Amount } from '@/components/app/amount';
import { Chip } from '@/components/app/chip';
import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { AccountWithBalance } from '@/data/hooks';
import { convertWithRates, formatMoney, formatMoneyForSpeech, minorDigits, type RateLookup } from '@/lib/money';
import { pressScale } from '@/theme/tokens';

import { useCountUp } from './use-count-up';

const MAX_CHIPS = 6;
const COMPACT_FROM = 1e7;

type BalanceCardProps = {
  accounts: readonly AccountWithBalance[];
  displayCurrency: string;
  locale?: string;
  showDecimals: boolean;
  rates: RateLookup;
};

/** Total of non-archived accounts in the display currency, with one chip per account. */
function BalanceCard({ accounts, displayCurrency, locale, showDecimals, rates }: BalanceCardProps) {
  const router = useRouter();
  const total = React.useMemo(
    () => accounts.reduce((sum, a) => sum + convertWithRates(a.balance, a.currency, displayCurrency, rates), 0),
    [accounts, displayCurrency, rates],
  );
  const shown = useCountUp(total);
  const compact = Math.abs(total) / 10 ** minorDigits(displayCurrency) >= COMPACT_FROM;
  const text = formatMoney(shown, displayCurrency, { locale, compact, decimals: showDecimals ? undefined : 0 });
  const decimals = showDecimals ? undefined : 0;
  const visible = accounts.slice(0, MAX_CHIPS);

  return (
    <Card className="gap-3 px-0 pb-4 pt-4">
      <Pressable
        role="button"
        accessibilityLabel={`Balance, ${formatMoneyForSpeech(total, displayCurrency)}`}
        scale={pressScale.card}
        onPress={() => router.push('/accounts')}
        className="px-4"
      >
        <Text variant="footnote" tone="secondary">
          Balance
        </Text>
        <Amount value={text} variant="hero" tone={total < 0 ? 'expense' : 'default'} />
      </Pressable>
      {accounts.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
          {visible.map((account) => (
            <Chip
              key={account.id}
              label={account.name}
              hint={formatMoney(account.balance, account.currency, { locale, decimals })}
              accessibilityLabel={`${account.name}, ${formatMoneyForSpeech(account.balance, account.currency)}`}
              onPress={() => router.push({ pathname: '/accounts/[id]', params: { id: account.id } })}
            />
          ))}
          {accounts.length > MAX_CHIPS ? <Chip label="All accounts" trailingIcon="chevron.right" onPress={() => router.push('/accounts')} /> : null}
        </ScrollView>
      ) : (
        <View />
      )}
    </Card>
  );
}

export { BalanceCard };
