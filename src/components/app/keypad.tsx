import * as React from 'react';
import { View } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { dynamicType } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00' | '.' | '+' | '-' | 'backspace' | '=';

type KeypadProps = {
  onKey: (key: KeypadKey) => void;
  onLongBackspace?: () => void;
  showDecimal?: boolean;
  saveMode?: boolean;
  /** Save key at 40% opacity (amount blocks saving); still pressable so the error haptic fires. */
  saveDisabled?: boolean;
  hapticsEnabled?: boolean;
  /** Key height in pt, clamped to 52-64; the add sheet sizes it to the free space. */
  keyHeight?: number;
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

const KEY_GAP = 8;

type KeyCellProps = {
  keyName: KeypadKey;
  height: number;
  saveMode: boolean;
  saveDisabled: boolean;
  hapticsEnabled?: boolean;
  onKey: (key: KeypadKey) => void;
  onLongBackspace?: () => void;
};

function KeyCell({ keyName, height, saveMode, saveDisabled, hapticsEnabled, onKey, onLongBackspace }: KeyCellProps) {
  const { colors, isDark } = useTokens();
  const [pressed, setPressed] = React.useState(false);
  const isSave = keyName === '=' && saveMode;
  const isOperator = keyName === '-' || keyName === '+' || keyName === '=';
  const isDigit = !isOperator && keyName !== 'backspace' && keyName !== '.';
  const isDigitLike = isDigit || keyName === '.';
  // Dark: digits sit on `surface`, operators and backspace on `elevated`, so the operator column reads against black.
  const base = isDark ? (isDigitLike ? colors.surface : colors.elevated) : isDigitLike ? colors.surface : colors.fill;
  const down = isDark ? (isDigitLike ? '#2C2C2E' : '#3A3A3C') : isDigitLike ? '#E4E4E9' : '#DCDCE2';
  const label = isSave ? 'Save' : (speech[keyName] ?? keyName);
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      haptic="light"
      hapticsEnabled={hapticsEnabled}
      scale={0.94}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => onKey(keyName)}
      onLongPress={keyName === 'backspace' ? onLongBackspace : undefined}
      delayLongPress={400}
      className="flex-1 items-center justify-center rounded-[12px]"
      style={{ height, backgroundColor: isSave ? colors.accent : pressed ? down : base, opacity: isSave ? (saveDisabled ? 0.4 : pressed ? 0.85 : 1) : 1 }}
    >
      {keyName === 'backspace' ? (
        <SymbolIcon name="delete.left" size={24} color={colors.text} weight="regular" />
      ) : isSave ? (
        <Text
          variant="headline"
          maxFontSizeMultiplier={dynamicType.keypad}
          style={{ color: colors.onAccent }}
          className="text-[19px] font-semibold"
        >
          Save
        </Text>
      ) : (
        <Text
          variant="title1"
          tone={isOperator ? 'accent' : 'default'}
          numeric
          maxFontSizeMultiplier={dynamicType.keypad}
          className="text-[28px] font-normal leading-[34px] tracking-normal"
        >
          {operatorLabels[keyName] ?? keyName}
        </Text>
      )}
    </Pressable>
  );
}

/** 4x4 grid of separate rounded keys on the page background. `keyHeight` is clamped to 52-64. */
function Keypad({ onKey, onLongBackspace, showDecimal = true, saveMode = false, saveDisabled = false, hapticsEnabled, keyHeight = 56 }: KeypadProps) {
  const height = Math.min(Math.max(keyHeight, 52), 64);
  return (
    <View className="bg-bg" style={{ padding: KEY_GAP, gap: KEY_GAP }}>
      {layout.map((row) => (
        <View key={row[0]} className="flex-row" style={{ gap: KEY_GAP }}>
          {row.map((key) =>
            key === '.' && !showDecimal ? (
              <View key={key} className="flex-1" style={{ height }} />
            ) : (
              <KeyCell
                key={key}
                keyName={key}
                height={height}
                saveMode={saveMode}
                saveDisabled={saveDisabled}
                hapticsEnabled={hapticsEnabled}
                onKey={onKey}
                onLongBackspace={onLongBackspace}
              />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

export { Keypad };
export type { KeypadKey, KeypadProps };
