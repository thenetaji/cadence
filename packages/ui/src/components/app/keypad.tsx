import * as React from 'react';
import { View } from 'react-native';

import { AppIcon } from '@studio/icons';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { Pressable } from '../ui/pressable';
import { motion } from '@studio/motion';
import { haptic , dynamicType , useTokens } from '@studio/theme';
import { Text } from '../ui/text';

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
  // Digits on `elevated` with a rim so they read on true black; operators on the brass soft fill.
  const base = isOperator ? colors.accentSoft : isDark ? colors.elevated : isDigitLike ? colors.surface : colors.fill;
  const down = isDark ? (isOperator ? 'rgba(226,185,106,0.28)' : '#26262A') : isOperator ? 'rgba(201,162,79,0.28)' : '#E4E1DA';
  const label = isSave ? 'Save' : (speech[keyName] ?? keyName);

  // Save key morphs into a check (scale + rotate spring) before the sheet dismisses.
  const reduced = useReducedMotion();
  const done = useSharedValue(0);
  const saving = React.useRef(false);
  const labelStyle = useAnimatedStyle(() => ({ opacity: 1 - done.value, transform: [{ scale: 1 - done.value * 0.6 }, { rotate: `${done.value * 90}deg` }] }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: done.value, transform: [{ scale: done.value }, { rotate: `${(1 - done.value) * -90}deg` }] }));
  const press = () => {
    if (!isSave || saveDisabled || saving.current) {
      onKey(keyName);
      return;
    }
    saving.current = true;
    haptic('success', hapticsEnabled);
    done.set(reduced ? 1 : withSpring(1, motion.springs.morph));
    setTimeout(() => {
      onKey(keyName);
      // If the form refused to save the key returns to normal.
      setTimeout(() => {
        done.set(withSpring(0, motion.springs.morph));
        saving.current = false;
      }, 900);
    }, reduced ? 0 : 300);
  };
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      haptic={isSave ? false : 'light'}
      hapticsEnabled={hapticsEnabled}
      scale={0.94}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={press}
      onLongPress={keyName === 'backspace' ? onLongBackspace : undefined}
      delayLongPress={400}
      className="flex-1 items-center justify-center rounded-[12px]"
      style={{ height, borderWidth: isSave ? 0 : 1, borderColor: colors.border, backgroundColor: isSave ? colors.accent : pressed ? down : base, opacity: isSave ? (saveDisabled ? 0.4 : pressed ? 0.85 : 1) : 1 }}
    >
      {keyName === 'backspace' ? (
        <AppIcon name="delete.left" size={24} color={colors.text} />
      ) : isSave ? (
        <>
          <Animated.View style={labelStyle}>
            <Text variant="headline" maxFontSizeMultiplier={dynamicType.keypad} style={{ color: colors.onAccent }} className="text-[19px] font-semibold">
              Save
            </Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, checkStyle]}>
            <AppIcon name="checkmark" size={26} color={colors.onAccent} />
          </Animated.View>
        </>
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
