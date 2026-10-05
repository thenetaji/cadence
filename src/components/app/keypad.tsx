import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { dynamicType, pressScale } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00' | '.' | '+' | '-' | 'backspace' | '=';

type KeypadProps = {
  onKey: (key: KeypadKey) => void;
  onLongBackspace?: () => void;
  showDecimal?: boolean;
  saveMode?: boolean;
  hapticsEnabled?: boolean;
};

const layout: readonly (readonly KeypadKey[])[] = [
  ['7', '8', '9', 'backspace'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['.', '0', '00', '='],
];

const operatorLabels: Partial<Record<KeypadKey, string>> = { '-': '−', '+': '+', '=': '=' };

const speech: Partial<Record<KeypadKey, string>> = {
  '-': 'Minus',
  '+': 'Plus',
  '=': 'Equals',
  '.': 'Decimal point',
  '00': 'Double zero',
  backspace: 'Delete',
};

function Keypad({ onKey, onLongBackspace, showDecimal = true, saveMode = false, hapticsEnabled }: KeypadProps) {
  const { colors } = useTokens();
  return (
    <View style={{ backgroundColor: colors.separator, gap: StyleSheet.hairlineWidth }}>
      {layout.map((row) => (
        <View key={row[0]} className="flex-row" style={{ gap: StyleSheet.hairlineWidth }}>
          {row.map((key) => {
            if (key === '.' && !showDecimal) {
              return <View key={key} className="h-14 flex-1 bg-surface" />;
            }
            const isSave = key === '=' && saveMode;
            const isOperator = key === '-' || key === '+' || key === '=';
            const label = isSave ? 'Save' : (speech[key] ?? key);
            return (
              <Pressable
                key={key}
                role="button"
                accessibilityLabel={label}
                haptic="light"
                hapticsEnabled={hapticsEnabled}
                scale={pressScale.key}
                onPress={() => onKey(key)}
                onLongPress={key === 'backspace' ? onLongBackspace : undefined}
                delayLongPress={400}
                className={cn('h-14 flex-1 items-center justify-center', isSave ? 'bg-accent' : 'bg-surface active:bg-fill')}
              >
                {key === 'backspace' ? (
                  <SymbolIcon name="delete.left" size={22} color={colors.text} />
                ) : isSave ? (
                  <Text variant="headline" maxFontSizeMultiplier={dynamicType.keypad} className="text-primary-foreground">
                    Save
                  </Text>
                ) : (
                  <Text
                    variant="title2"
                    tone={isOperator ? 'accent' : 'default'}
                    maxFontSizeMultiplier={dynamicType.keypad}
                    className="font-normal"
                  >
                    {operatorLabels[key] ?? key}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export { Keypad };
export type { KeypadKey, KeypadProps };
