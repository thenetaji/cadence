import * as React from 'react';

import { TransactionRow } from '@/components/app/transaction-row';
import type { TransactionListItem } from '@/data/hooks';

import { toRowModel, type RowModelContext } from './row-model';
import { useTransactionActions } from './use-transaction-actions';

type TransactionListRowProps = {
  item: TransactionListItem;
  context: RowModelContext;
  separator?: boolean;
};

/** A ledger row wired to detail, swipe delete/duplicate and the long-press menu. */
const TransactionListRow = React.memo(function TransactionListRow({ item, context, separator = true }: TransactionListRowProps) {
  const actions = useTransactionActions();
  const model = React.useMemo(() => toRowModel(item, context), [item, context]);
  const id = item.id;
  const onPress = React.useCallback(() => actions.open(id), [actions, id]);
  const onLongPress = React.useCallback(() => actions.menu(id), [actions, id]);
  const onDelete = React.useCallback(() => actions.remove(id), [actions, id]);
  const onDuplicate = React.useCallback(() => actions.duplicate(id), [actions, id]);
  return (
    <TransactionRow
      kind={model.kind}
      title={model.title}
      subtitle={model.subtitle}
      amount={model.amount}
      trailing={model.trailing}
      icon={model.icon}
      color={model.color}
      split={model.split}
      accessibilityLabel={model.accessibilityLabel}
      separator={separator}
      onPress={onPress}
      onLongPress={onLongPress}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
    />
  );
});

export { TransactionListRow };
export type { TransactionListRowProps };
