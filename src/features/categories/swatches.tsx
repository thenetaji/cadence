import { View } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { categoryKeys, type CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

/** The 12 chromatic palette keys; gray stays a seed-only colour. */
export const CATEGORY_SWATCHES = categoryKeys.filter((key): key is Exclude<CategoryColorKey, 'gray'> => key !== 'gray');

type SwatchesProps = { value: CategoryColorKey; onChange: (key: CategoryColorKey) => void };

function Swatches({ value, onChange }: SwatchesProps) {
  const { category } = useTokens();
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
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: category[key] }}
            >
              {on ? <SymbolIcon name="checkmark" size={15} color="#FFFFFF" weight="bold" /> : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export { Swatches };
