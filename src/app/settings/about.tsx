import Constants from 'expo-constants';
import { ScrollView } from 'react-native';

import { ListGroup, ListRow } from '@/components/app/list-group';
import { showToast } from '@/components/app/toast-store';
import { APP_NAME } from '@/constants/app';
import { useActions } from '@/data/actions';

export default function About() {
  const actions = useActions();
  const version = Constants.expoConfig?.version ?? '';
  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 py-4">
      <ListGroup>
        <ListRow label="Name" value={APP_NAME} />
        <ListRow label="Version" value={version} />
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
