import { Text, type TextTone } from '@/components/ui/text';
import { AnimatedNumber } from '@/motion/animated-number';
import { cn } from '@/lib/utils';
import { dynamicType } from '@studio/theme';

type AmountVariant = 'row' | 'title' | 'hero' | 'entry';

type AmountProps = {
  value: string;
  tone?: TextTone;
  variant?: AmountVariant;
  accessibilityLabel?: string;
  className?: string;
  /** Odometer roll when the value changes (`'intro'` also rolls up from zero on first appearance). */
  animate?: boolean | 'intro';
};

const variantProps = {
  row: { variant: 'body', className: 'font-medium', multiplier: dynamicType.rowAmount },
  title: { variant: 'title2', className: '', multiplier: dynamicType.rowAmount },
  hero: { variant: 'hero', className: '', multiplier: dynamicType.hero },
  entry: { variant: 'amountEntry', className: '', multiplier: dynamicType.hero },
} as const;

function Amount({ value, tone = 'default', variant = 'row', accessibilityLabel, className, animate = false }: AmountProps) {
  const config = variantProps[variant];
  const fit = variant === 'hero' || variant === 'entry';
  if (animate) {
    return (
      <AnimatedNumber
        value={value}
        variant={config.variant}
        tone={tone}
        fit={fit}
        intro={animate === 'intro'}
        accessibilityLabel={accessibilityLabel}
        className={cn(config.className, className)}
      />
    );
  }
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
