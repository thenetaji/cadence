import { Image } from 'expo-image';
import { View } from 'react-native';

import { AppIcon } from '@/icons/app-icon';
import { Pressable } from '@/components/ui/pressable';
import { useTokens } from '@/theme/use-tokens';

type ReceiptThumbProps = {
  uri: string;
  size?: number;
  onPress?: () => void;
  /** Shows a remove x in the corner. */
  onRemove?: () => void;
};

/** Rounded photo thumbnail with a rim; optional remove badge. */
export function ReceiptThumb({ uri, size = 56, onPress, onRemove }: ReceiptThumbProps) {
  const { colors } = useTokens();
  return (
    <View style={{ width: size, height: size }}>
      <Pressable
        role="button"
        accessibilityLabel="View receipt"
        haptic="light"
        disabled={!onPress}
        onPress={onPress}
        style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.fill }}
      >
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={150} />
      </Pressable>
      {onRemove ? (
        <Pressable
          role="button"
          accessibilityLabel="Remove receipt"
          haptic="light"
          hitSlop={8}
          onPress={onRemove}
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: colors.elevated,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="close" size={10} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}
