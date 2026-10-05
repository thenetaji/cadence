import * as Slot from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Text as RNText } from 'react-native';

import { cn } from '@/lib/utils';

const textVariants = cva('text-base text-foreground', {
  variants: {
    variant: {
      default: '',
      h1: 'text-4xl font-extrabold tracking-tight',
      h2: 'border-b border-border pb-2 text-3xl font-semibold tracking-tight',
      h3: 'text-2xl font-semibold tracking-tight',
      large: 'text-lg font-semibold',
      small: 'text-sm font-medium leading-none',
      muted: 'text-sm text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

// Lets a parent (e.g. Button) set the default text classes for nested <Text>.
const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant,
  ...props
}: React.ComponentProps<typeof RNText> &
  VariantProps<typeof textVariants> & { asChild?: boolean }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot.Text : RNText;
  return <Component className={cn(textVariants({ variant }), textClass, className)} {...props} />;
}

export { Text, TextClassContext, textVariants };
