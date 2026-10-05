import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { AmountReadout } from '@/components/app/amount-readout';
import { ListGroup, ListRow } from '@/components/app/list-group';
import { showToast } from '@/components/app/toast-store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useActions } from '@/data/actions';
import { useBudgets, useCategories, useSettings } from '@/data/hooks';
import { ValidationError } from '@/db/errors';
import type { BudgetInput } from '@/db/repos/budgets';
import type { BudgetPeriod, BudgetScope } from '@/db/schema';
import { AmountKeypad } from '@/features/entry/amount-keypad';
import { CategoryGrid } from '@/features/entry/category-grid';
import { EntryLayout } from '@/features/entry/entry-layout';
import { FormRow, PickRow } from '@/features/entry/form-row';
import { useSheetHeader } from '@/features/entry/sheet-header';
import { useAmountEntry } from '@/features/entry/use-amount-entry';
import { FormChip } from '@/features/transaction-form/chips';
import { ShakeView } from '@/features/transaction-form/shake-view';
import { currencySymbol, formatMoneyForSpeech, minorDigits } from '@/lib/money';
import { haptic } from '@/theme/haptics';

import { anchorLabel, anchorOptions, defaultAnchor, editableName, PERIOD_LABELS, PERIOD_VALUES } from './logic';

type BudgetFormProps = { mode: 'new' | 'edit'; budgetId?: string };

const GENERIC: Record<BudgetPeriod, string> = { weekly: 'Weekly budget', monthly: 'Monthly budget', yearly: 'Yearly budget' };

/** Add/edit budget sheet: amount on the keypad, then name, scope, period and start. */
export function BudgetForm({ mode, budgetId }: BudgetFormProps) {
  const router = useRouter();
  const actions = useActions();
  const settings = useSettings();
  const progress = useBudgets();
  const categories = useCategories('expense');
  const source = mode === 'edit' ? progress.find((p) => p.budget.id === budgetId)?.budget : undefined;

  const [currency] = React.useState(() => source?.currency ?? settings.display_currency);
  const digits = minorDigits(currency);
  const [name, setName] = React.useState(() => (source ? editableName(source) : ''));
  const [amount, setAmount] = React.useState(source?.amount ?? 0);
  const [scope, setScope] = React.useState<BudgetScope>(source?.scope ?? 'categories');
  const [categoryIds, setCategoryIds] = React.useState<string[]>(source?.categoryIds ?? []);
  const [period, setPeriod] = React.useState<BudgetPeriod>(source?.period ?? 'monthly');
  const [anchor, setAnchor] = React.useState(() => source?.startAnchor ?? defaultAnchor('monthly', { weekStart: settings.week_start, monthStart: settings.month_start }));
  const [keypadOpen, setKeypadOpen] = React.useState(mode === 'new');
  const [nameFocused, setNameFocused] = React.useState(false);
  const [shake, setShake] = React.useState(0);
  const entry = useAmountEntry(digits, amount, setAmount);

  const taken = progress.some((p) => p.budget.scope === 'all' && p.budget.period === period && p.budget.id !== budgetId);
  const blocked = scope === 'all' && taken;
  const missingCategory = scope === 'categories' && categoryIds.length === 0;
  const disabled = amount <= 0 || blocked || missingCategory;

  const close = () => {
    if (router.canDismiss()) router.dismiss();
    else if (router.canGoBack()) router.back();
    else router.replace('/budgets');
  };

  const save = () => {
    if (missingCategory) {
      setShake((n) => n + 1);
      haptic('error');
      return;
    }
    if (disabled) {
      haptic('error');
      return;
    }
    const input: BudgetInput = {
      name: name.trim() || undefined,
      amount,
      currency,
      period,
      startAnchor: anchor,
      scope,
      categoryIds: scope === 'categories' ? categoryIds : [],
    };
    try {
      if (mode === 'edit' && budgetId) actions.budgets.update(budgetId, input);
      else actions.budgets.create(input);
    } catch (error) {
      haptic('error');
      if (error instanceof ValidationError) return;
      throw error;
    }
    haptic('success');
    close();
  };

  const remove = () => {
    if (!source || !budgetId) return;
    const input: BudgetInput = {
      name: source.name,
      amount: source.amount,
      currency: source.currency,
      period: source.period,
      startAnchor: source.startAnchor,
      scope: source.scope,
      categoryIds: source.categoryIds,
    };
    actions.budgets.delete(budgetId);
    if (router.canDismiss()) router.dismissAll();
    else close();
    showToast({ message: 'Deleted', actionLabel: 'Undo', onAction: () => actions.budgets.create(input) });
  };

  const changePeriod = (index: number) => {
    const next = PERIOD_VALUES[index];
    if (!next) return;
    setPeriod(next);
    setAnchor(defaultAnchor(next, { weekStart: settings.week_start, monthStart: settings.month_start }));
  };

  const toggleCategory = (id: string) => setCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const chooseScope = (next: BudgetScope) => {
    setScope(next);
    if (next === 'categories') setKeypadOpen(false);
  };

  const picked = categories.filter((c) => categoryIds.includes(c.id));
  const placeholder = scope === 'categories' && picked.length === 1 ? (picked[0]?.name ?? GENERIC[period]) : GENERIC[period];
  const showKeypad = keypadOpen && !nameFocused;

  const header = useSheetHeader({ title: mode === 'edit' ? 'Edit budget' : 'New budget', onCancel: close, onSave: () => save(), saveDisabled: disabled });

  if (mode === 'edit' && !source) return null;

  return (
    <>
      <Stack.Screen options={header} />
      <EntryLayout keypad={showKeypad ? <AmountKeypad entry={entry} digits={digits} onSave={save} /> : null}>
        <View className="h-[92px] justify-center">
          <AmountReadout
            symbol={currencySymbol(currency)}
            value={entry.view.display}
            expression={entry.view.expression}
            onPress={() => {
              setNameFocused(false);
              setKeypadOpen(true);
            }}
            accessibilityLabel={`Amount, ${formatMoneyForSpeech(amount, currency, { sign: 'none' })}`}
          />
        </View>
        <ListGroup>
          <FormRow label="Name">
            <Input
              variant="inline"
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              placeholder={placeholder}
              returnKeyType="done"
              autoCapitalize="sentences"
              maxLength={40}
              accessibilityLabel="Name"
              className="h-6 min-h-0 flex-1 py-0 text-right"
            />
          </FormRow>
          <FormRow label="Scope">
            <ShakeView trigger={shake}>
              <View className="flex-row gap-2">
                <FormChip
                  label="All spending"
                  hint={taken ? 'Taken' : undefined}
                  selected={scope === 'all'}
                  onPress={() => (taken ? haptic('error') : chooseScope('all'))}
                  accessibilityLabel={taken ? 'All spending, already exists for this period' : 'All spending'}
                />
                <FormChip label="Categories" selected={scope === 'categories'} onPress={() => chooseScope('categories')} />
              </View>
            </ShakeView>
          </FormRow>
          <FormRow label="Period">
            <View className="w-[210px]">
              <SegmentedControl values={PERIOD_LABELS} selectedIndex={PERIOD_VALUES.indexOf(period)} onChange={changePeriod} accessibilityLabel="Period" />
            </View>
          </FormRow>
          <PickRow
            label="Starts"
            value={anchorLabel(period, anchor)}
            title={period === 'weekly' ? 'Week starts on' : period === 'monthly' ? 'Day of month' : 'Year starts in'}
            options={anchorOptions(period)}
            selected={anchor}
            onSelect={setAnchor}
          />
        </ListGroup>
        {scope === 'categories' && showKeypad ? (
          <ListGroup>
            <ListRow
              label="Categories"
              value={picked.length === 0 ? 'Choose' : picked.length === 1 ? picked[0]?.name : `${picked.length} selected`}
              chevron
              onPress={() => setKeypadOpen(false)}
            />
          </ListGroup>
        ) : null}
        {scope === 'categories' && !showKeypad ? (
          <Card className="mx-4 p-0 pt-1">
            <CategoryGrid categories={categories} selected={categoryIds} onToggle={toggleCategory} />
          </Card>
        ) : null}
        {mode === 'edit' ? (
          <ListGroup>
            <ListRow label="Delete budget" destructive onPress={remove} />
          </ListGroup>
        ) : null}
      </EntryLayout>
    </>
  );
}
