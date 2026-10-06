import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { AppIcon } from '@studio/icons';
import { SheetScroll , Button , Input , Pressable , Text } from '@studio/ui';
import { useActions } from '@/data/actions';
import { useOutstanding, usePeople } from '@/data/hooks';
import { ValidationError } from '@/db/errors';
import type { PersonRow } from '@/db/schema';
import { titleAfterPerson } from '@/features/transaction-form/logic';
import { useDraftStore } from '@/features/transaction-form/store';
import { haptic , useTokens } from '@studio/theme';

import { Avatar } from './avatar';

const MAX_RECENT = 4;

function PersonRowView({ person, selected, onPress, last }: { person: PersonRow; selected: boolean; onPress: () => void; last: boolean }) {
  const { colors } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityLabel={person.name}
      accessibilityState={{ selected }}
      scale={1}
      onPress={onPress}
      className="min-h-[56px] flex-row items-center gap-3 bg-surface px-4 active:bg-fill"
    >
      <Avatar name={person.name} size={36} />
      <Text variant="body" numberOfLines={1} className="flex-1">
        {person.name}
      </Text>
      {selected ? <AppIcon name="check" size={16} color={colors.accent} /> : null}
      {last ? null : <View pointerEvents="none" style={{ left: 64, height: 0.5, backgroundColor: colors.separator }} className="absolute bottom-0 right-0" />}
    </Pressable>
  );
}

/** Who the money went to or came from: search, recents, and a New person row for a name that is not there yet. */
export function PersonSheet() {
  const router = useRouter();
  const actions = useActions();
  const { colors } = useTokens();
  const people = usePeople();
  const withActivity = useOutstanding({ includeSettled: true });
  const selectedId = useDraftStore((s) => s.personId);
  const [query, setQuery] = React.useState('');

  const activity = React.useMemo(() => new Map(withActivity.map((o) => [o.person.id, o.lastActivityAt ?? 0])), [withActivity]);
  const clean = query.trim().replace(/\s+/g, ' ');
  const lower = clean.toLowerCase();
  const matches = clean ? people.filter((p) => p.name.toLowerCase().includes(lower)) : people;
  const recent = clean
    ? []
    : [...people]
        .filter((p) => (activity.get(p.id) ?? 0) > 0)
        .sort((a, b) => (activity.get(b.id) ?? 0) - (activity.get(a.id) ?? 0))
        .slice(0, MAX_RECENT);
  const recentIds = new Set(recent.map((p) => p.id));
  const rest = matches.filter((p) => !recentIds.has(p.id));
  const canCreate = clean !== '' && !people.some((p) => p.name.toLowerCase() === lower);

  const choose = (person: PersonRow) => {
    haptic('selection');
    const s = useDraftStore.getState();
    const previous = people.find((p) => p.id === s.personId)?.name;
    s.patch({
      personId: person.id,
      title: titleAfterPerson(s.title, previous, person.name),
      appliedTitleNorm: null,
    });
    router.back();
  };

  const create = () => {
    try {
      choose(actions.people.create({ name: clean }));
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error;
      const existing = people.find((p) => p.name.toLowerCase() === lower);
      if (existing) choose(existing);
      else haptic('error');
    }
  };

  const group = (title: string, rows: readonly PersonRow[]) =>
    rows.length === 0 ? null : (
      <View>
        <Text variant="footnote" tone="secondary" className="px-8 pb-2">
          {title}
        </Text>
        <View className="mx-4 overflow-hidden rounded-[18px] bg-surface" style={{ borderWidth: 1, borderColor: colors.border }}>
          {rows.map((p, i) => (
            <PersonRowView key={p.id} person={p} selected={p.id === selectedId} onPress={() => choose(p)} last={i === rows.length - 1} />
          ))}
        </View>
      </View>
    );

  return (
    <SheetScroll
      header={
        <>
          <View className="h-12 flex-row items-center px-2">
            <View className="w-20 items-start">
              <Button variant="barSecondary" size="sm" onPress={() => router.back()} accessibilityLabel="Cancel">
                <Text variant="body">Cancel</Text>
              </Button>
            </View>
            <Text variant="headline" accessibilityRole="header" className="flex-1 text-center">
              Person
            </Text>
            <View className="w-20" />
          </View>
          <View className="px-4 pb-3 pt-1">
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search or add a name"
              accessibilityLabel="Search people"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={canCreate ? create : undefined}
            />
          </View>
        </>
      }
      bodyClassName="gap-6 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      {canCreate ? (
        <View className="mx-4 overflow-hidden rounded-[18px] bg-surface" style={{ borderWidth: 1, borderColor: colors.border }}>
          <Pressable
            role="button"
            accessibilityLabel={`New person ${clean}`}
            scale={1}
            onPress={create}
            className="min-h-[56px] flex-row items-center gap-3 bg-surface px-4 active:bg-fill"
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.accentSoft,
              }}
              className="items-center justify-center"
            >
              <AppIcon name="add" size={16} color={colors.accentText} />
            </View>
            <Text variant="body" tone="accent" numberOfLines={1} className="flex-1">
              New person “{clean}”
            </Text>
          </Pressable>
        </View>
      ) : null}
      {group('Recent', recent)}
      {group(recent.length > 0 ? 'Everyone' : clean ? 'Matches' : 'People', rest)}
    </SheetScroll>
  );
}
