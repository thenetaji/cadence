import { View } from 'react-native';

import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { colors, pressOpacity, shadows } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type UndoToastProps = { message: string; actionLabel?: string; onAction?: () => void };

function UndoToast({ message, actionLabel, onAction }: UndoToastProps) {
  const { isDark } = useTokens();
  const actionColor = colors[isDark ? 'light' : 'dark'].accent;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={shadows.toast}
      className="min-h-12 flex-row items-center justify-between rounded-[14px] bg-overlay pl-4"
    >
      <Text variant="callout" tone="inverted" numberOfLines={1} className="flex-1 pr-2">
        {message}
      </Text>
      {actionLabel ? (
        <Pressable
          role="button"
          scale={1}
          dimTo={pressOpacity.text}
          hitSlop={{ top: 4, bottom: 4 }}
          onPress={onAction}
          className="h-12 justify-center px-4"
        >
          <Text variant="callout" className="font-semibold" style={{ color: actionColor }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : (
        <View className="w-4" />
      )}
    </View>
  );
}

export { UndoToast };
export type { UndoToastProps };
