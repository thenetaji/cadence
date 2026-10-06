import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { Amount } from '@/components/app/amount';
import { EdgeFade } from '@/components/app/edge-fade';
import { SymbolIcon } from '@/components/app/symbol';
import { Chip } from '@/components/app/chip';
import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { AccountWithBalance } from '@/data/hooks';
import { sumConverted, formatMoney, formatMoneyForSpeech, minorDigits, type RateLookup } from '@/lib/money';
import { pressScale } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

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
  const { colors } = useTokens();
  const total = React.useMemo(
    () => sumConverted(accounts.map((a) => ({ minor: a.balance, currency: a.currency })), displayCurrency, rates).total,
    [accounts, displayCurrency, rates],
  );
  const shown = useCountUp(total);
  const compact = Math.abs(total) / 10 ** minorDigits(displayCurrency) >= COMPACT_FROM;
  const text = formatMoney(shown, displayCurrency, { locale, compact, decimals: showDecimals ? undefined : 0 });
  const decimals = showDecimals ? undefined : 0;
  const visible = accounts.slice(0, MAX_CHIPS);
  // A single empty account would only repeat the hero's zero.
  const showChips = accounts.length > 1 || (accounts.length === 1 && accounts[0]!.balance !== 0);

  return (
    <Card className="gap-3 px-0 pb-4 pt-4">
      <Pressable
        role="button"
        accessibilityLabel={`Balance, ${formatMoneyForSpeech(total, displayCurrency)}`}
        scale={pressScale.card}
        onPress={() => router.push('/accounts')}
        className="px-4"
      >
        <View className="flex-row items-center justify-between">
          <Text variant="footnote" tone="secondary">
            Balance
          </Text>
          <SymbolIcon name="chevron.right" size={13} color={colors.textTertiary} weight="semibold" />
        </View>
        <Amount value={text} variant="hero" tone={total < 0 ? 'expense' : 'default'} />
      </Pressable>
      {showChips ? (
        <View>
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
        {accounts.length > 2 ? <EdgeFade color={colors.surface} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

export { BalanceCard };
