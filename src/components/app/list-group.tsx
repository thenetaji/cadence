import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/icons/app-icon';
import { IconTile } from '@/components/app/icon-tile';
import { Pressable } from '@/components/ui/pressable';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import type { CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type ListRowInjectedProps = { showSeparator?: boolean };

type ListRowProps = ListRowInjectedProps & {
  label: string;
  icon?: { name: string; color: CategoryColorKey };
  value?: string;
  subtitle?: string;
  chevron?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
  /** Centres the label; for a standalone action row such as "Delete rule" in its own group. */
  centered?: boolean;
  onPress?: () => void;
};

function ListRow({
  label,
  icon,
  value,
  subtitle,
  chevron = false,
  switchValue,
  onSwitchChange,
  trailing,
  destructive = false,
  centered = false,
  onPress,
  showSeparator = false,
}: ListRowProps) {
  const { colors } = useTokens();
  const hasSwitch = switchValue !== undefined;
  const interactive = !!onPress && !hasSwitch;
  return (
    <Pressable
      role={hasSwitch ? undefined : 'button'}
      disabled={!interactive}
      scale={1}
      onPress={onPress}
      accessibilityLabel={hasSwitch ? undefined : [label, value].filter(Boolean).join(', ')}
      className="min-h-[52px] flex-row items-center bg-surface px-4 py-2 active:bg-fill"
    >
      {icon ? (
        <View className="mr-3">
          <IconTile icon={icon.name} color={icon.color} />
        </View>
      ) : null}
      <View className="flex-1 py-1">
        <Text variant="body" tone={destructive ? 'expense' : 'default'} numberOfLines={1} className={centered ? 'text-center' : undefined}>
          {label}
        </Text>
        {subtitle ? (
          <Text variant="subhead" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="body" tone="secondary" numeric numberOfLines={1} className={hasSwitch ? 'ml-3 mr-3 shrink' : 'ml-3 shrink'}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {hasSwitch ? <Switch value={switchValue} onValueChange={onSwitchChange} accessibilityLabel={label} /> : null}
      {chevron ? (
        <View className="ml-2">
          <AppIcon name="chevron.right" size={13} color={colors.textTertiary} />
        </View>
      ) : null}
      {showSeparator ? (
        <View
          pointerEvents="none"
          style={{ left: icon ? 66 : 16, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }}
          className="absolute bottom-0 right-0"
        />
      ) : null}
    </Pressable>
  );
}

type ListGroupProps = {
  header?: string;
  footer?: string;
  children: React.ReactNode;
};

function ListGroup({ header, footer, children }: ListGroupProps) {
  const { colors } = useTokens();
  const items = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<ListRowInjectedProps>[];
  return (
    <View className="px-4">
      {header ? (
        <Text variant="footnote" tone="secondary" className="px-4 pb-2" accessibilityRole="header">
          {header}
        </Text>
      ) : null}
      <View
        className="overflow-hidden rounded-[18px] bg-surface"
        style={{ borderWidth: 1, borderColor: colors.border }}
      >
        {items.map((item, index) => React.cloneElement(item, { showSeparator: index < items.length - 1 }))}
      </View>
      {footer ? (
        <Text variant="footnote" tone="secondary" className="px-4 pt-2">
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export { ListGroup, ListRow };
export type { ListGroupProps, ListRowProps };
