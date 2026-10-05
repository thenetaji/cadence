import { cva, type VariantProps } from 'class-variance-authority';
import { View, type ViewProps } from 'react-native';

import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const badgeVariants = cva('h-5 flex-row items-center justify-center self-start rounded-full px-2', {
  variants: {
    variant: {
      default: 'bg-fill',
      accent: 'bg-accent-soft',
      income: 'bg-income/15',
      warning: 'bg-warning/15',
      expense: 'bg-expense/15',
    },
  },
  defaultVariants: { variant: 'default' },
});

const badgeTextVariants = cva('', {
  variants: {
    variant: {
      default: 'text-secondary',
      accent: 'text-accent',
      income: 'text-income',
      warning: 'text-warning',
      expense: 'text-expense',
    },
  },
  defaultVariants: { variant: 'default' },
});

type BadgeProps = ViewProps & VariantProps<typeof badgeVariants> & { label?: string };

function Badge({ className, variant, label, children, ...props }: BadgeProps) {
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <View className={cn(badgeVariants({ variant }), className)} {...props}>
        {label ? <Text variant="caption">{label}</Text> : children}
      </View>
    </TextClassContext.Provider>
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
