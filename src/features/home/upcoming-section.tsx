import { useRouter } from 'expo-router';
import * as React from 'react';

import { SectionHeader } from '@/components/app/section-header';
import { showToast } from '@/components/app/toast-store';
import { TransactionRow } from '@/components/app/transaction-row';
import { Card } from '@/components/ui/card';
import { useActions } from '@/data/actions';
import { useAccounts, useCategories, useRecurringRules, useUpcoming } from '@/data/hooks';

import { nextPerRule, toUpcomingRow, UPCOMING_DAYS } from './upcoming-model';

type UpcomingSectionProps = { todayKey: string; locale?: string; showDecimals: boolean };

/** Header with `All` whenever an active rule exists; rows for rules due within 7 days. */
function UpcomingSection({ todayKey, locale, showDecimals }: UpcomingSectionProps) {
  const router = useRouter();
  const actions = useActions();
  const occurrences = useUpcoming(UPCOMING_DAYS);
  const categories = useCategories();
  const accounts = useAccounts({ includeArchived: true });
  const categoryMap = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountMap = React.useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const rows = React.useMemo(
    () => nextPerRule(occurrences).map((o) => toUpcomingRow(o, { todayKey, locale, showDecimals, categories: categoryMap, accounts: accountMap })),
    [occurrences, todayKey, locale, showDecimals, categoryMap, accountMap],
  );
  const rules = useRecurringRules();
  // The header is the doorway to Recurring: show it whenever any rule is live, rows only when something is due soon.
  const hasActiveRule = rules.some((rule) => rule.pausedAt === null && (!rule.endDate || rule.endDate >= todayKey));
  if (rows.length === 0 && !hasActiveRule) return null;

  return (
    <>
      <SectionHeader title="Upcoming" actionLabel="All" onAction={() => router.push('/recurring')} />
      {rows.length > 0 ? (
      <Card className="mx-4 p-0">
        {rows.map((row, index) => (
          <TransactionRow
            key={row.ruleId}
            kind={row.kind}
            title={row.title}
            subtitle={row.subtitle}
            amount={row.amount}
            trailing={row.trailing}
            icon={row.icon}
            color={row.color}
            accessibilityLabel={row.accessibilityLabel}
            separator={index < rows.length - 1}
            onPress={() => router.push({ pathname: '/recurring/[id]', params: { id: row.ruleId } })}
            leftAction={{
              label: 'Post now',
              symbol: 'checkmark.circle.fill',
              tone: 'accent',
              onTrigger: () => {
                actions.recurring.postNow(row.ruleId);
                showToast({ message: 'Posted' });
              },
            }}
            rightAction={{
              label: 'Skip',
              symbol: 'forward.fill',
              tone: 'neutral',
              onTrigger: () => {
                actions.recurring.skip(row.ruleId);
                showToast({ message: 'Skipped', haptic: 'light' });
              },
            }}
          />
        ))}
      </Card>
      ) : null}
    </>
  );
}

export { UpcomingSection };
