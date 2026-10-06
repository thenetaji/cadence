import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Platform, ScrollView, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/app/empty-state';
import { AppIcon } from '@/icons/app-icon';
import { ListGroup, ListRow } from '@/components/app/list-group';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useSearchTransactions, useSetting } from '@/data/hooks';
import { pushRecentSearch } from '@/features/search/recent-searches';
import { TransactionDayList } from '@/features/transactions/transaction-day-list';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { useTokens } from '@/theme/use-tokens';

const HIDDEN_HEADER = { headerShown: false } as const;
const DEBOUNCE_MS = 150;
const LIMIT = 200;

export default function Search() {
  const router = useRouter();
  const { colors } = useTokens();
  const params = useLocalSearchParams<{ q?: string }>();
  const money = useMoneyContext();
  const [recent, setRecent] = useSetting('recent_searches');
  const [query, setQuery] = React.useState(params.q ?? '');
  const [term, setTerm] = React.useState(params.q ?? '');

  React.useEffect(() => {
    const timer = setTimeout(() => setTerm(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const active = query.trim() === '' ? '' : term;
  const results = useSearchTransactions(active);

  const latest = React.useRef({ term: '', found: false, recent });
  React.useEffect(() => {
    latest.current = { term: active, found: results.length > 0, recent };
  });
  const remember = React.useCallback(
    (text: string) => setRecent(pushRecentSearch(latest.current.recent, text)),
    [setRecent],
  );
  useFocusEffect(
    React.useCallback(
      () => () => {
        if (latest.current.found) remember(latest.current.term);
      },
      [remember],
    ),
  );

  const typing = query.trim() !== '';
  const footer =
    results.length >= LIMIT ? (
      <Text variant="footnote" tone="secondary" className="py-4 text-center">
        Showing first {LIMIT}
      </Text>
    ) : null;

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={HIDDEN_HEADER} />
      <View className="flex-row items-center gap-2 px-4 pb-2 pt-6">
        <View className="h-10 flex-1 flex-row items-center gap-2 rounded-[12px] bg-fill px-3">
          <AppIcon name="magnifyingglass" size={16} color={colors.textTertiary} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Title, memo or amount"
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            maxFontSizeMultiplier={2}
            onSubmitEditing={() => remember(query)}
            accessibilityLabel="Search"
            style={Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : undefined}
            className="h-10 flex-1 text-[17px] text-foreground"
          />
        </View>
        <Button variant="barSecondary" size="sm" onPress={() => router.back()}>
          Cancel
        </Button>
      </View>
      {typing && results.length === 0 && term === query ? (
        <EmptyState message="No matches" />
      ) : typing ? (
        <TransactionDayList
          items={results}
          context={money}
          footer={footer}
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      ) : recent.length > 0 ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pt-4">
          <ListGroup header="Recent searches">
            {recent.slice(0, 5).map((entry) => (
              <ListRow
                key={entry}
                label={entry}
                onPress={() => {
                  setQuery(entry);
                  setTerm(entry);
                }}
              />
            ))}
          </ListGroup>
        </ScrollView>
      ) : null}
    </View>
  );
}
