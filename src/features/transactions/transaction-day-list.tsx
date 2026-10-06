import { FlashList } from '@shopify/flash-list';
import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { DaySectionHeader } from '@/components/app/day-section-header';
import type { TransactionListItem } from '@/data/hooks';

import { buildDayEntries, headerIndices, type ListEntry } from './day-groups';
import { TransactionListRow } from './transaction-list-row';
import type { MoneyContext } from './use-money-context';

type TransactionDayListProps = {
  items: readonly TransactionListItem[];
  context: MoneyContext;
  header?: React.ReactElement | null;
  footer?: React.ReactElement | null;
  empty?: React.ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardDismissMode?: 'none' | 'on-drag' | 'interactive';
};

const keyOf = (entry: ListEntry) => entry.key;
const typeOf = (entry: ListEntry) => entry.type;

/** Day-grouped ledger on FlashList: sticky day headers, memoised rows, stable keys. */
function TransactionDayList({ items, context: callerContext, header, footer, empty, contentContainerStyle, keyboardDismissMode }: TransactionDayListProps) {
  // Day headers already say the date, so rows under them always show the time (C4), whatever the caller passed.
  const context = React.useMemo(() => (callerContext.relativeTo ? { ...callerContext, relativeTo: undefined } : callerContext), [callerContext]);
  const entries = React.useMemo(() => buildDayEntries(items, context), [items, context]);
  const sticky = React.useMemo(() => headerIndices(entries), [entries]);
  const renderItem = React.useCallback(
    ({ item }: { item: ListEntry }) =>
      item.type === 'header' ? (
        <DaySectionHeader label={item.label} total={item.total} />
      ) : (
        <TransactionListRow item={item.item} context={context} separator={!item.last} />
      ),
    [context],
  );
  return (
    <FlashList
      data={entries}
      renderItem={renderItem}
      keyExtractor={keyOf}
      getItemType={typeOf}
      stickyHeaderIndices={sticky}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={empty}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={contentContainerStyle}
    />
  );
}

export { TransactionDayList };
export type { TransactionDayListProps };
