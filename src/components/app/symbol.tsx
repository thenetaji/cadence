import { AppIcon } from '@/icons/app-icon';

type SymbolIconProps = {
  name: string;
  size?: number;
  color: string;
  weight?: string;
  accessibilityLabel?: string;
};

/** Compatibility wrapper: draws the user's chosen icon style. New code should use `AppIcon` from `@/icons`. */
function SymbolIcon({ name, size = 20, color, accessibilityLabel }: SymbolIconProps) {
  return <AppIcon name={name} size={size} color={color} accessibilityLabel={accessibilityLabel} />;
}

export { SymbolIcon };
export type { SymbolIconProps };
