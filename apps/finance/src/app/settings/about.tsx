import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import * as React from 'react';
import { Linking, ScrollView } from 'react-native';

import { ListGroup, ListRow , showToast } from '@studio/ui';
import { APP_NAME, FEEDBACK_EMAIL } from '@/constants/app';
import { useActions } from '@/data/actions';
import { LICENCES } from '@/features/about/licences';

/** Whether the store review prompt can be shown; false on web and in builds without a store. */
function useCanRate(): boolean {
  const [available, setAvailable] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    StoreReview.isAvailableAsync()
      .then((value) => alive && setAvailable(value))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return available;
}

export default function About() {
  const actions = useActions();
  const canRate = useCanRate();
  const version = Constants.expoConfig?.version ?? '';
  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 py-4 pb-12">
      <ListGroup>
        {canRate ? (
          <ListRow
            label="Rate"
            icon={{ name: 'star.fill', color: 'amber' }}
            chevron
            onPress={() => void StoreReview.requestReview().catch(() => undefined)}
          />
        ) : null}
        {FEEDBACK_EMAIL ? (
          <ListRow
            label="Send feedback"
            icon={{ name: 'envelope.fill', color: 'blue' }}
            chevron
            onPress={() => void Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} ${version}`)}`).catch(() => showToast({ message: 'No mail app', haptic: 'warning' }))}
          />
        ) : null}
      </ListGroup>
      <ListGroup header="Licences">
        {LICENCES.map((item) => (
          <ListRow key={item.name} label={item.name} value={item.licence} />
        ))}
      </ListGroup>
      {__DEV__ ? (
        <ListGroup>
          <ListRow
            label="Load demo data"
            icon={{ name: 'square.and.arrow.down', color: 'blue' }}
            onPress={() => {
              actions.dev.seedDemo();
              showToast({ message: 'Demo data loaded' });
            }}
          />
        </ListGroup>
      ) : null}
    </ScrollView>
  );
}
