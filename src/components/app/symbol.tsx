import { MaterialIcons } from '@expo/vector-icons';
import { SymbolView, type SymbolWeight } from 'expo-symbols';
import { Platform } from 'react-native';

import { resolveGlyph } from '@/components/app/symbolFallbacks';

type SymbolIconProps = {
  name: string;
  size?: number;
  color: string;
  weight?: SymbolWeight;
  accessibilityLabel?: string;
};

function SymbolIcon({ name, size = 20, color, weight = 'medium', accessibilityLabel }: SymbolIconProps) {
  const hidden = accessibilityLabel === undefined;
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={name as React.ComponentProps<typeof SymbolView>['name']}
        size={size}
        tintColor={color}
        type="monochrome"
        weight={weight}
        resizeMode="scaleAspectFit"
        style={{ width: size, height: size }}
        accessibilityLabel={accessibilityLabel}
        accessibilityElementsHidden={hidden}
        importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      />
    );
  }
  return (
    <MaterialIcons
      name={resolveGlyph(name)}
      size={size}
      color={color}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
    />
  );
}

export { SymbolIcon };
export type { SymbolIconProps };
