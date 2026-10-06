import { View } from 'react-native';

import { AppIcon } from '@studio/icons';
import { Pressable } from '@studio/ui';
import { categoryKeys, type CategoryColorKey } from '@studio/theme';
import { useTokens } from '@studio/theme';

/** The 12 chromatic palette keys; gray stays a seed-only colour. */
export const CATEGORY_SWATCHES = categoryKeys.filter((key): key is Exclude<CategoryColorKey, 'gray'> => key !== 'gray');

type SwatchesProps = { value: CategoryColorKey; onChange: (key: CategoryColorKey) => void };

function Swatches({ value, onChange }: SwatchesProps) {
  const { ink, colors } = useTokens();
  return (
    <View className="-mx-1 flex-row flex-wrap">
      {CATEGORY_SWATCHES.map((key) => {
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

export { Swatches };
