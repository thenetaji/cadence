import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView } from 'react-native';

import { ListGroup, ListRow } from '@/components/app/list-group';
import { OptionPicker, type Option } from '@/components/app/option-picker';
import { useActions } from '@/data/actions';
import { useAccounts, useSetting } from '@/data/hooks';
import { confirmErase } from '@/features/data-transfer/erase';
import { haptic } from '@/theme/haptics';

type Picker = 'week' | 'month' | 'account' | null;

const weekOptions: readonly Option<1 | 7>[] = [
  { value: 1, label: 'Monday' },
  { value: 7, label: 'Sunday' },
];

const monthOptions: readonly Option<number>[] = Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

export default function Settings() {
  const router = useRouter();
  const actions = useActions();
  const accounts = useAccounts();
  const [displayCurrency] = useSetting('display_currency');
  const [weekStart, setWeekStart] = useSetting('week_start');
  const [monthStart, setMonthStart] = useSetting('month_start');
  const [defaultAccountId, setDefaultAccountId] = useSetting('default_account_id');
  const [theme] = useSetting('theme');
  const [haptics, setHaptics] = useSetting('haptics');
  const [showDecimals, setShowDecimals] = useSetting('show_decimals');
  const [lockEnabled] = useSetting('lock_enabled');
  const [picker, setPicker] = React.useState<Picker>(null);
  const close = () => setPicker(null);
  // Onboarding is the unprotected route once `onboarding_done` resets, so the navigator moves there on its own.
  const eraseAll = () =>
    confirmErase(() => {
      actions.data.eraseAll();
      haptic('success');
    });

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
          value={String(monthStart)}
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
      </ListGroup>
      <ListGroup>
        <ListRow
          label="Theme"
          icon={{ name: 'paintbrush.fill', color: 'purple' }}
          value={theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'}
          chevron
          onPress={() => router.push('/settings/appearance')}
        />
        <ListRow label="Haptics" icon={{ name: 'iphone', color: 'pink' }} switchValue={haptics} onSwitchChange={setHaptics} />
        <ListRow label="Show decimals" icon={{ name: 'percent', color: 'gray' }} switchValue={showDecimals} onSwitchChange={setShowDecimals} />
      </ListGroup>
      <ListGroup>
        <ListRow
          label="Face ID"
          icon={{ name: 'faceid', color: 'green' }}
          value={lockEnabled ? 'On' : 'Off'}
          chevron
          onPress={() => router.push('/settings/lock')}
        />
      </ListGroup>
      <ListGroup>
        <ListRow label="Categories" icon={{ name: 'tag.fill', color: 'orange' }} chevron onPress={() => router.push('/settings/categories')} />
        <ListRow label="Accounts" icon={{ name: 'building.columns.fill', color: 'blue' }} chevron onPress={() => router.push('/accounts')} />
        <ListRow label="Export" icon={{ name: 'square.and.arrow.up', color: 'indigo' }} chevron onPress={() => router.push('/settings/export')} />
        <ListRow label="Import" icon={{ name: 'square.and.arrow.down', color: 'teal' }} chevron onPress={() => router.push('/settings/import')} />
        <ListRow label="Erase all data" destructive onPress={eraseAll} />
      </ListGroup>
      <ListGroup>
        <ListRow label="About" icon={{ name: 'info.circle', color: 'gray' }} chevron onPress={() => router.push('/settings/about')} />
      </ListGroup>

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
