import * as React from 'react';
import { ScrollView } from 'react-native';

import { ListGroup, ListRow } from '@/components/app/list-group';
import { OptionPicker } from '@/components/app/option-picker';
import { showToast } from '@/components/app/toast-store';
import { useSetting } from '@/data/hooks';
import { haptic } from '@studio/theme';

import { authenticate } from './authenticate';
import { LOCK_TIMEOUT_OPTIONS, lockTimeoutLabel } from './timeout';

/** Enable switch (authenticates once first) and the Require after timeout. */
export function LockSettingsScreen() {
  const [enabled, setEnabled] = useSetting('lock_enabled');
  const [timeoutS, setTimeoutS] = useSetting('lock_timeout_s');
  const [picking, setPicking] = React.useState(false);

  const toggle = async (next: boolean) => {
    if (!next) {
      setEnabled(false);
      return;
    }
    const result = await authenticate('Enable Face ID');
    if (result === 'success') setEnabled(true);
    else if (result === 'unavailable') showToast({ message: 'Not available on this device', haptic: 'warning' });
    else haptic('error');
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 py-4">
      <ListGroup>
        <ListRow label="Face ID" icon={{ name: 'faceid', color: 'green' }} switchValue={enabled} onSwitchChange={(next) => void toggle(next)} />
      </ListGroup>
      <ListGroup>
        <ListRow
          label="Require after"
          value={lockTimeoutLabel(timeoutS)}
          chevron={enabled}
          onPress={enabled ? () => setPicking(true) : undefined}
        />
      </ListGroup>
      <OptionPicker
        visible={picking}
        title="Require after"
        options={LOCK_TIMEOUT_OPTIONS}
        selected={timeoutS}
        onSelect={setTimeoutS}
        onClose={() => setPicking(false)}
      />
    </ScrollView>
  );
}
