import * as React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { TransactionRow } from '@/components/app/transaction-row';
import type { TransactionListItem } from '@/data/hooks';
import { registerCollapse , enteringFor, insertedEntering , Shimmer , motion } from '@studio/motion';
import type { EntryTracker } from '@studio/motion';

import { toRowModel, type RowModelContext } from './row-model';
import { useTransactionActions } from './use-transaction-actions';

type TransactionListRowProps = {
  item: TransactionListItem;
  context: RowModelContext;
  separator?: boolean;
  /** Which rows animate in; omit for none. */
  tracker?: EntryTracker;
};

/** A ledger row wired to detail, swipe delete/duplicate and the long-press menu. */
const TransactionListRow = React.memo(function TransactionListRow({ item, context, separator = true, tracker }: TransactionListRowProps) {
  const actions = useTransactionActions();
  const model = React.useMemo(() => toRowModel(item, context), [item, context]);
  const id = item.id;
  const onPress = React.useCallback(() => actions.open(id), [actions, id]);
  const onLongPress = React.useCallback(() => actions.menu(id), [actions, id]);
  const onDelete = React.useCallback(() => actions.remove(id), [actions, id]);
  const onDuplicate = React.useCallback(() => actions.duplicate(id), [actions, id]);
  const reduced = useReducedMotion();
  const collapse = useSharedValue(1);
  const measured = useSharedValue(0);
  // Decided once at mount: only first-appearance and genuinely inserted rows animate, never recycles.
  const [mountEntry] = React.useState(() => tracker?.peek(id));
  const entering = mountEntry ? (mountEntry.kind === 'insert' ? insertedEntering() : enteringFor(mountEntry.index)) : undefined;
  const inserted = mountEntry?.kind === 'insert';
  React.useEffect(() => {
    tracker?.consume(id);
  }, [tracker, id]);
  React.useEffect(() => {
    collapse.value = 1;
  }, [id, collapse]);
  const onLayout = React.useCallback(
    (e: LayoutChangeEvent) => {
      if (collapse.value >= 1) measured.value = e.nativeEvent.layout.height;
    },
    [collapse, measured],
  );
  // Delete: height + fade collapse, then the real delete runs; a refused delete springs back.
  React.useEffect(
    () =>
      registerCollapse(id, (commit) => {
        const finish = () => {
          if (commit() === false) collapse.value = withSpring(1, motion.springs.layout);
        };
        if (reduced) {
          finish();
          return;
        }
        collapse.value = withTiming(0, { duration: motion.durations.row + 30, easing: Easing.out(Easing.cubic) }, (done) => {
          if (done) runOnJS(finish)();
        });
      }),
    [id, collapse, reduced],
  );
  const wrapStyle = useAnimatedStyle(() => ({
    opacity: collapse.value,
    maxHeight: collapse.value >= 1 ? 100000 : measured.value * collapse.value,
  }));
  return (
    <Animated.View entering={entering} style={[{ overflow: 'hidden' }, wrapStyle]} onLayout={onLayout}>
    <TransactionRow
      kind={model.kind}
      title={model.title}
      subtitle={model.subtitle}
      amount={model.amount}
      trailing={model.trailing}
      icon={model.icon}
      color={model.color}
      split={model.split}
      badges={model.badges}
      accessibilityLabel={model.accessibilityLabel}
      separator={separator}
      onPress={onPress}
      onLongPress={onLongPress}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    />
      {inserted ? <Shimmer active /> : null}
    </Animated.View>
  );
});

export { TransactionListRow };
export type { TransactionListRowProps };
