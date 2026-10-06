import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { SheetScroll } from '@/components/app/sheet-scroll';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useActions } from '@/data/actions';
import { useTags } from '@/data/hooks';
import { ValidationError } from '@/db/errors';
import { toggleId } from '@/features/transaction-form/logic';
import { useDraftStore } from '@/features/transaction-form/store';
import { AppIcon } from '@studio/icons';
import { Pop } from '@studio/motion';
import { haptic , useTokens } from '@studio/theme';

import { canCreateTag, matchesQuery, nextTagColor, TAG_COLORS } from './model';
import { TagPill } from './tag-pill';

/** Multi-select of tags as coloured pills, with a field that searches and creates. Writes the draft as you tap. */
export function TagsSheet() {
  const router = useRouter();
  const actions = useActions();
  const { colors, category } = useTokens();
  const tags = useTags();
  const tagIds = useDraftStore((s) => s.tagIds);
  const [query, setQuery] = React.useState('');
  const [picked, setPicked] = React.useState<string | null>(null);

  const clean = query.trim().replace(/\s+/g, ' ');
  const creating = canCreateTag(clean, tags);
  const color = picked ?? nextTagColor(tags);
  const shown = clean ? tags.filter((t) => matchesQuery(t.name, clean)) : tags;

  const toggle = (id: string) => useDraftStore.getState().patch({ tagIds: toggleId(useDraftStore.getState().tagIds, id) });

  const create = () => {
    try {
      const tag = actions.tags.create({ name: clean, color });
      const s = useDraftStore.getState();
      s.patch({ tagIds: [...s.tagIds, tag.id] });
      haptic('success');
      setQuery('');
      setPicked(null);
    } catch (error) {
      if (error instanceof ValidationError) haptic('error');
      else throw error;
    }
  };

  return (
    <SheetScroll
      header={
        <>
          <View className="h-12 flex-row items-center px-2">
            <View className="w-20" />
            <Text variant="headline" accessibilityRole="header" className="flex-1 text-center">
              Tags
            </Text>
            <View className="w-20 items-end">
              <Button variant="barPrimary" size="sm" onPress={() => router.back()} accessibilityLabel="Done">
                <Text variant="headline">Done</Text>
              </Button>
            </View>
          </View>
          <View className="px-4 pb-3 pt-1">
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search or create a tag"
              accessibilityLabel="Search tags"
              autoCapitalize="sentences"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={creating ? create : undefined}
            />
          </View>
        </>
      }
      bodyClassName="gap-6 px-4 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      {creating ? (
        <View className="gap-3 rounded-[18px] bg-surface p-4" style={{ borderWidth: 1, borderColor: colors.border }}>
          <View className="flex-row flex-wrap gap-3">
            {TAG_COLORS.map((key) => (
              <Pressable
                key={key}
                role="button"
                accessibilityLabel={`Colour ${key}`}
                accessibilityState={{ selected: key === color }}
                haptic="selection"
                scale={0.9}
                hitSlop={4}
                onPress={() => setPicked(key)}
              >
                <Pop active={key === color}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      padding: 2,
                      borderWidth: 2,
                      borderColor: key === color ? colors.text : 'transparent',
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 12,
                        backgroundColor: category[key],
                      }}
                    />
                  </View>
                </Pop>
              </Pressable>
            ))}
          </View>
          <Pressable
            role="button"
            accessibilityLabel={`Create ${clean}`}
            haptic="light"
            onPress={create}
            className="h-11 flex-row items-center justify-center gap-2 rounded-[12px] bg-accent"
          >
            <AppIcon name="add" size={15} color={colors.onAccent} />
            <Text variant="headline" numberOfLines={1} style={{ color: colors.onAccent }}>
              Create “{clean}”
            </Text>
          </Pressable>
        </View>
      ) : null}
      {shown.length > 0 ? (
        <View className="flex-row flex-wrap gap-2.5">
          {shown.map((tag) => (
            <TagPill key={tag.id} name={tag.name} color={tag.color} size="md" selected={tagIds.includes(tag.id)} onPress={() => toggle(tag.id)} />
          ))}
        </View>
      ) : creating ? null : (
        <Text variant="callout" tone="secondary" className="px-1">
          No tags yet
        </Text>
      )}
    </SheetScroll>
  );
}
