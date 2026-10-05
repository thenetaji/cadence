import { Text, type TextTone } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { dynamicType } from '@/theme/tokens';

type AmountVariant = 'row' | 'title' | 'hero' | 'entry';

type AmountProps = {
  value: string;
  tone?: TextTone;
  variant?: AmountVariant;
  accessibilityLabel?: string;
  className?: string;
};

const variantProps = {
  row: { variant: 'body', className: 'font-medium', multiplier: dynamicType.rowAmount },
  title: { variant: 'title2', className: '', multiplier: dynamicType.rowAmount },
  hero: { variant: 'hero', className: '', multiplier: dynamicType.hero },
  entry: { variant: 'amountEntry', className: '', multiplier: dynamicType.hero },
} as const;

function Amount({ value, tone = 'default', variant = 'row', accessibilityLabel, className }: AmountProps) {
  const config = variantProps[variant];
  const fit = variant === 'hero' || variant === 'entry';
  return (
    <Text
      numeric
      variant={config.variant}
      tone={tone}
      numberOfLines={1}
      adjustsFontSizeToFit={fit}
      minimumFontScale={variant === 'hero' ? 28 / 36 : 32 / 44}
      maxFontSizeMultiplier={config.multiplier}
      accessibilityLabel={accessibilityLabel}
      className={cn(config.className, className)}
    >
      {value}
    </Text>
  );
}

export { Amount };
export type { AmountProps, AmountVariant };
