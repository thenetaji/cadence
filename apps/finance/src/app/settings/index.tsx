import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView } from 'react-native';

import { ListGroup, ListRow } from '@studio/ui';
import { OptionPicker, type Option } from '@studio/ui';
import { useAccounts, useSetting } from '@/data/hooks';
import { ICON_STYLE_LABELS } from '@studio/icons';
import { ordinal } from '@/features/budgets/logic';
import { moneyLocale } from '@/features/transactions/use-money-context';
import { formatMoney } from '@studio/money';
import { Text } from '@studio/ui';
import Constants from 'expo-constants';

type Picker = 'week' | 'month' | 'account' | null;

const weekOptions: readonly Option<1 | 7>[] = [
  { value: 1, label: 'Monday' },
  { value: 7, label: 'Sunday' },
];

const monthOptions: readonly Option<number>[] = Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: ordinal(i + 1) }));

export default function Settings() {
  const router = useRouter();
  const accounts = useAccounts();
  const [displayCurrency] = useSetting('display_currency');
  const [weekStart, setWeekStart] = useSetting('week_start');
  const [monthStart, setMonthStart] = useSetting('month_start');
  const [defaultAccountId, setDefaultAccountId] = useSetting('default_account_id');
  const [theme] = useSetting('theme');
  const [iconStyle] = useSetting('icon_style');
  const [haptics, setHaptics] = useSetting('haptics');
  const [showDecimals, setShowDecimals] = useSetting('show_decimals');
  const [lockEnabled] = useSetting('lock_enabled');
  const [hideAmounts] = useSetting('hide_amounts');
  const [picker, setPicker] = React.useState<Picker>(null);
  const close = () => setPicker(null);
  const defaultAccount = accounts.find((a) => a.id === defaultAccountId);
  const accountOptions = React.useMemo<readonly Option<string | null>[]>(
    () => accounts.map((a) => ({ value: a.id, label: a.name })),
    [accounts],
  );

  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 py-4 pb-12">
      <ListGroup>
        <ListRow
          label="Display currency"
          icon={{ name: 'dollarsign.circle.fill', color: 'green' }}
          value={displayCurrency}
          chevron
          onPress={() => router.push('/settings/currency')}
        />
        <ListRow
          label="Week starts on"
          icon={{ name: 'calendar', color: 'red' }}
          value={weekStart === 7 ? 'Sunday' : 'Monday'}
          chevron
          onPress={() => setPicker('week')}
        />
        <ListRow
          label="Month starts on"
          icon={{ name: 'calendar', color: 'orange' }}
          value={ordinal(monthStart)}
          chevron
          onPress={() => setPicker('month')}
        />
        <ListRow
          label="Default account"
          icon={{ name: 'wallet.pass.fill', color: 'blue' }}
          value={defaultAccount?.name}
          chevron
          onPress={() => setPicker('account')}
        />
        <ListRow label="Reminders" icon={{ name: 'bell', color: 'red' }} chevron onPress={() => router.push('/settings/reminders')} />
      </ListGroup>
      <ListGroup>
        <ListRow
          label="Theme"
          icon={{ name: 'paintbrush.fill', color: 'purple' }}
          value={theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'}
          chevron
          onPress={() => router.push('/settings/appearance')}
        />
        <ListRow
          label="Icons"
          icon={{ name: 'grid', color: 'indigo' }}
          value={ICON_STYLE_LABELS[iconStyle].label}
          chevron
          onPress={() => router.push('/settings/appearance')}
        />
        <ListRow label="Haptics" icon={{ name: 'iphone', color: 'pink' }} switchValue={haptics} onSwitchChange={setHaptics} />
        <ListRow
          label="Show decimals"
          icon={{ name: 'percent', color: 'gray' }}
          value={formatMoney(124000, displayCurrency, { locale: moneyLocale(displayCurrency), decimals: showDecimals ? undefined : 0 })}
          switchValue={showDecimals}
          onSwitchChange={setShowDecimals}
        />
      </ListGroup>
      <ListGroup>
        <ListRow
          label="Privacy"
          icon={{ name: 'lock', color: 'green' }}
          value={lockEnabled || hideAmounts ? 'On' : 'Off'}
          chevron
          onPress={() => router.push('/settings/privacy')}
        />
      </ListGroup>
      <ListGroup>
        <ListRow label="Categories" icon={{ name: 'tag.fill', color: 'orange' }} chevron onPress={() => router.push('/settings/categories')} />
        <ListRow label="Accounts" icon={{ name: 'building.columns.fill', color: 'blue' }} chevron onPress={() => router.push('/accounts')} />
        <ListRow label="People" icon={{ name: 'loans', color: 'teal' }} chevron onPress={() => router.push('/people')} />
        <ListRow label="Tags" icon={{ name: 'tag', color: 'pink' }} chevron onPress={() => router.push('/tags')} />
        <ListRow label="Recurring" icon={{ name: 'repeat', color: 'indigo' }} chevron onPress={() => router.push('/recurring')} />
        <ListRow label="Subscriptions" icon={{ name: 'subscriptions', color: 'purple' }} chevron onPress={() => router.push('/subscriptions')} />
        <ListRow label="Backup & sync" icon={{ name: 'cloud', color: 'cyan' }} chevron onPress={() => router.push('/settings/backup')} />
        <ListRow label="Import & export" icon={{ name: 'square.and.arrow.up', color: 'indigo' }} chevron onPress={() => router.push('/settings/transfer')} />
      </ListGroup>
      <ListGroup>
        <ListRow label="About" icon={{ name: 'info.circle', color: 'gray' }} chevron onPress={() => router.push('/settings/about')} />
      </ListGroup>
      <Text variant="footnote" tone="tertiary" className="text-center">
        {`Version ${Constants.expoConfig?.version ?? ''} · Made with love`}
      </Text>

      <OptionPicker visible={picker === 'week'} title="Week starts on" options={weekOptions} selected={weekStart} onSelect={setWeekStart} onClose={close} />
      <OptionPicker visible={picker === 'month'} title="Month starts on" options={monthOptions} selected={monthStart} onSelect={setMonthStart} onClose={close} />
      <OptionPicker
        visible={picker === 'account'}
        title="Default account"
        options={accountOptions}
        selected={defaultAccountId}
        onSelect={(id) => {
          if (id !== null) setDefaultAccountId(id);
        }}
        onClose={close}
      />
    </ScrollView>
  );
}
