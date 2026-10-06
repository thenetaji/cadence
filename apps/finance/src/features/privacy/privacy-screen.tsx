import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';

import { ListGroup, ListRow } from '@/components/app/list-group';
import { useSetting } from '@/data/hooks';
import { Stagger } from '@studio/motion';

/** Face ID lock and the Hide amounts switch. */
export function PrivacyScreen() {
  const router = useRouter();
  const [lockEnabled] = useSetting('lock_enabled');
  const [hideAmounts, setHideAmounts] = useSetting('hide_amounts');
  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 py-4 pb-12">
      <Stagger index={0}>
        <ListGroup>
          <ListRow
            label="Face ID"
            icon={{ name: 'faceid', color: 'green' }}
            value={lockEnabled ? 'On' : 'Off'}
            chevron
            onPress={() => router.push('/settings/lock')}
          />
          <ListRow label="Hide amounts" icon={{ name: 'security', color: 'indigo' }} switchValue={hideAmounts} onSwitchChange={setHideAmounts} />
        </ListGroup>
      </Stagger>
    </ScrollView>
  );
}
