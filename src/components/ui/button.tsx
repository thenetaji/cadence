import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { ActivityIndicator } from 'react-native';

import { Pressable, type PressableProps } from '@/components/ui/pressable';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { useTokens } from '@/theme/use-tokens';
import { pressOpacity, pressScale } from '@/theme/tokens';

const buttonVariants = cva('flex-row items-center justify-center gap-2 rounded-[12px]', {
  variants: {
    variant: {
      primary: 'bg-accent',
      secondary: 'bg-fill',
      ghost: 'bg-accent-soft',
      destructiveText: '',
      plainText: '',
    },
    size: {
      sm: 'h-9 min-w-[44px] px-3',
      md: 'h-11 px-4',
      lg: 'h-[52px] px-6',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

const buttonTextVariants = cva('', {
  variants: {
    variant: {
      primary: 'text-primary-foreground',
      secondary: 'text-foreground',
      ghost: 'text-accent',
      destructiveText: 'text-expense',
      plainText: 'text-accent',
    },
  },
  defaultVariants: { variant: 'primary' },
});

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;

type ButtonProps = Omit<PressableProps, 'children'> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    children?: React.ReactNode;
  };

function Button({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }: ButtonProps) {
  const { colors } = useTokens();
  const isText = variant === 'destructiveText' || variant === 'plainText';
  const spinner = variant === 'primary' ? colors.onAccent : colors.textSecondary;
  const inactive = disabled || loading;
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant })}>
      <Pressable
        role="button"
        accessibilityState={{ disabled: !!inactive, busy: loading }}
        disabled={inactive}
        scale={isText ? 1 : pressScale.row}
        dimTo={isText ? pressOpacity.text : undefined}
        className={cn(buttonVariants({ variant, size }), disabled && 'opacity-40', className)}
        {...props}
      >
        {loading ? <ActivityIndicator size="small" color={spinner} /> : null}
        {typeof children === 'string' ? <Text variant="headline">{children}</Text> : children}
      </Pressable>
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps, ButtonVariant };
