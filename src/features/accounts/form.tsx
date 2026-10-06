import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, View } from 'react-native';

import { AmountReadout } from '@/components/app/amount-readout';
import { CurrencyPicker } from '@/components/app/currency-picker';
import { ListGroup, ListRow } from '@/components/app/list-group';
import { OptionPicker } from '@/components/app/option-picker';
import { AppIcon } from '@/icons/app-icon';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { useActions } from '@/data/actions';
import { useAccountUsage, useAccounts, useRateLookup, useSettings } from '@/data/hooks';
import { ValidationError } from '@/db/errors';
import { ACCOUNT_ICONS } from '@/db/repos/accounts';
import type { AccountType } from '@/db/schema';
import { AmountKeypad } from '@/features/entry/amount-keypad';
import { EntryLayout } from '@/features/entry/entry-layout';
import { FormRow } from '@/features/entry/form-row';
import { useSheetHeader } from '@/features/entry/sheet-header';
import { useAmountEntry } from '@/features/entry/use-amount-entry';
import { FormChip } from '@/features/transaction-form/chips';
import { currencySymbol, formatMoneyForSpeech, minorDigits } from '@/lib/money';
import { haptic } from '@/theme/haptics';
import { categoryKeys, type CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

import { TYPE_LABELS, TYPES } from './model';

const RATE_DIGITS = 6;
const RATE_SCALE = 10 ** RATE_DIGITS;
const toRateMinor = (rate: number | null) => (rate === null ? 0 : Math.round(rate * RATE_SCALE));

const SWATCHES = categoryKeys.filter((key): key is Exclude<CategoryColorKey, 'gray'> => key !== 'gray');

function Swatches({ value, onChange }: { value: string; onChange: (key: CategoryColorKey) => void }) {
  const { ink, colors } = useTokens();
  return (
    <View className="-mx-1 flex-row flex-wrap">
      {SWATCHES.map((key) => {
        const on = key === value;
        return (
          <View key={key} className="w-1/6 items-center pb-3">
            <Pressable
              role="button"
              accessibilityLabel={key}
              accessibilityState={{ selected: on }}
              haptic="selection"
              onPress={() => onChange(key)}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ borderWidth: 2, borderColor: on ? colors.accent : 'transparent' }}
            >
              <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: ink[key] }}>
                {on ? <AppIcon name="checkmark" size={14} color="#FFFFFF" /> : null}
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

type AccountFormProps = { mode: 'new' | 'edit'; accountId?: string };

/** Add/edit account sheet. */
export function AccountForm({ mode, accountId }: AccountFormProps) {
  const router = useRouter();
  const actions = useActions();
  const settings = useSettings();
  const accounts = useAccounts({ includeArchived: true });
  const rates = useRateLookup();
  const usage = useAccountUsage(accountId);
  const source = mode === 'edit' ? accounts.find((a) => a.id === accountId) : undefined;

  const [name, setName] = React.useState(source?.name ?? '');
  const [type, setType] = React.useState<AccountType>(source?.type ?? 'bank');
  const [currency, setCurrency] = React.useState(source?.currency ?? settings.display_currency);
  const [negative, setNegative] = React.useState((source?.openingBalance ?? 0) < 0);
  const [amount, setAmount] = React.useState(Math.abs(source?.openingBalance ?? 0));
  const [color, setColor] = React.useState<string>(() => source?.color ?? SWATCHES.find((k) => !accounts.some((a) => a.color === k)) ?? 'blue');
  const [isDefault, setIsDefault] = React.useState(source?.isDefault ?? false);
  const [keypadOpen, setKeypadOpen] = React.useState(false);
  const [nameFocused, setNameFocused] = React.useState(false);
  const [currencyOpen, setCurrencyOpen] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);

  const displayCurrency = settings.display_currency;
  const [rateMinor, setRateMinor] = React.useState(() => toRateMinor(rates(source?.currency ?? displayCurrency, displayCurrency)));
  const [target, setTarget] = React.useState<'balance' | 'rate'>('balance');

  const digits = minorDigits(currency);
  const entry = useAmountEntry(digits, amount, setAmount);
  const rateEntry = useAmountEntry(RATE_DIGITS, rateMinor, setRateMinor);
  const foreign = currency !== displayCurrency;
  const storedRate = rates(currency, displayCurrency);
  const needsRate = foreign && rateMinor === 0;
  const locked = mode === 'edit' && usage > 0;

  const close = () => {
    if (router.canDismiss()) router.dismiss();
    else if (router.canGoBack()) router.back();
    else router.replace('/accounts');
  };

  const disabled = name.trim().length === 0 || needsRate;
  const header = useSheetHeader({ title: mode === 'edit' ? 'Edit account' : 'New account', onCancel: close, onSave: () => save(), saveDisabled: disabled });
  if (mode === 'edit' && !source) return null;
  const signed = negative ? -amount : amount;

  const save = () => {
    if (disabled) {
      haptic('error');
      return;
    }
    try {
      if (mode === 'edit' && accountId && source) {
        actions.accounts.update(accountId, {
          name,
          type,
          ...(currency !== source.currency && { currency }),
          openingBalance: signed,
          color,
          ...(type !== source.type && source.icon === ACCOUNT_ICONS[source.type] && { icon: ACCOUNT_ICONS[type] }),
        });
        if (isDefault && !source.isDefault) actions.accounts.setDefault(accountId);
      } else {
        actions.accounts.create({ name, type, currency, openingBalance: signed, color, isDefault });
      }
      if (foreign && rateMinor > 0 && rateMinor / RATE_SCALE !== storedRate) actions.fx.setRate(currency, displayCurrency, rateMinor / RATE_SCALE);
    } catch (error) {
      haptic('error');
      if (error instanceof ValidationError) return;
      throw error;
    }
    haptic('success');
    close();
  };

  const changeCurrency = (code: string) => {
    setCurrency(code);
    const nextRate = toRateMinor(rates(code, displayCurrency));
    setRateMinor(nextRate);
    rateEntry.reset(RATE_DIGITS, nextRate);
    setTarget('balance');
    if (minorDigits(code) !== digits) {
      setAmount(0);
      entry.reset(minorDigits(code), 0);
    }
  };

  const toggleNegative = () => {
    setNegative((v) => !v);
    setTarget('balance');
    setKeypadOpen(true);
  };

  const gone = () => {
    if (router.canDismiss()) router.dismissTo('/accounts');
    else close();
  };

  const archive = () => {
    if (!accountId || !source) return;
    if (source.archivedAt) actions.accounts.unarchive(accountId);
    else actions.accounts.archive(accountId);
    haptic('success');
    close();
  };

  const confirmDelete = (moveToId?: string) => {
    if (!accountId || !source) return;
    Alert.alert(`Delete ${source.name}`, undefined, [
      {
        text: 'Delete account',
        style: 'destructive',
        onPress: () => {
          try {
            actions.accounts.delete(accountId, moveToId);
          } catch (error) {
            haptic('error');
            if (error instanceof ValidationError) return;
            throw error;
          }
          gone();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const targets = accounts.filter((a) => a.id !== accountId && a.currency === source?.currency && !a.archivedAt);
  const onDelete = () => (usage === 0 ? confirmDelete() : setMoveOpen(true));
  const showKeypad = keypadOpen && !nameFocused;
  const keypadEntry = target === 'rate' ? rateEntry : entry;
  const rateText = rateMinor === 0 && target !== 'rate' ? '…' : rateEntry.view.display;
  const canGoNegative = type === 'card' || type === 'other' || negative;

  return (
    <>
      <Stack.Screen options={header} />
      <EntryLayout keypad={showKeypad ? <AmountKeypad entry={keypadEntry} digits={target === 'rate' ? RATE_DIGITS : digits} onSave={save} /> : null}>
        <View className="items-center gap-1 pt-1">
          <Text variant="footnote" tone="secondary">
            Opening balance
          </Text>
          <AmountReadout
            symbol={`${negative && amount > 0 ? '−' : ''}${currencySymbol(currency)}`}
            value={entry.view.display}
            expression={entry.view.expression}
            onPress={() => {
              setNameFocused(false);
              setTarget('balance');
              setKeypadOpen(true);
            }}
            accessibilityLabel={`Opening balance, ${formatMoneyForSpeech(signed, currency)}`}
          />
          {canGoNegative ? (
            <FormChip label="Negative" icon="minus.circle" selected={negative} onPress={toggleNegative} accessibilityLabel="Negative balance" />
          ) : null}
        </View>
        <ListGroup>
          <FormRow label="Name">
            <Input
              variant="inline"
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              placeholder="Name"
              returnKeyType="done"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={40}
              accessibilityLabel="Name"
              className="h-6 min-h-0 flex-1 py-0 text-right"
            />
          </FormRow>
          <FormRow label="Type" stacked>
            <SegmentedControl
              values={TYPES.map((t) => TYPE_LABELS[t])}
              selectedIndex={TYPES.indexOf(type)}
              onChange={(index) => {
                const next = TYPES[index] ?? 'bank';
                setType(next);
                if (next === 'cash' || next === 'bank') setNegative(false);
              }}
              accessibilityLabel="Type"
            />
          </FormRow>
          <ListRow
            label="Currency"
            value={`${currencySymbol(currency)} ${currency}`}
            chevron={!locked}
            onPress={locked ? undefined : () => setCurrencyOpen(true)}
          />
          {foreign ? (
            <FormRow label="Rate">
              <Pressable
                role="button"
                accessibilityLabel={`Rate, 1 ${currency} equals ${rateText} ${displayCurrency}`}
                onPress={() => {
                  setNameFocused(false);
                  setTarget('rate');
                  setKeypadOpen(true);
                }}
                className="h-9 justify-center"
              >
                <Text variant="body" tone={target === 'rate' ? 'accent' : needsRate ? 'warning' : 'default'} numeric>
                  1 {currency} = {currencySymbol(displayCurrency)}
                  {rateText}
                </Text>
              </Pressable>
            </FormRow>
          ) : null}
          {source?.isDefault ? (
            <ListRow label="Default account" value="On" />
          ) : (
            <ListRow label="Default account" switchValue={isDefault} onSwitchChange={setIsDefault} />
          )}
          <FormRow label="Colour" stacked>
            <Swatches value={color} onChange={(key) => setColor(key)} />
          </FormRow>
        </ListGroup>
        {mode === 'edit' && source ? (
          <ListGroup>
            <ListRow label={source.archivedAt ? 'Unarchive' : 'Archive'} onPress={archive} />
            {usage === 0 || targets.length > 0 ? <ListRow label="Delete account" destructive onPress={onDelete} /> : null}
          </ListGroup>
        ) : null}
      </EntryLayout>
      <CurrencyPicker visible={currencyOpen} selected={currency} onSelect={changeCurrency} onClose={() => setCurrencyOpen(false)} />
      <OptionPicker
        visible={moveOpen}
        title="Move transactions to…"
        options={targets.map((a) => ({ value: a.id, label: a.name }))}
        selected={null}
        onSelect={(id) => {
          if (id) setTimeout(() => confirmDelete(id), 350);
        }}
        onClose={() => setMoveOpen(false)}
      />
    </>
  );
}
