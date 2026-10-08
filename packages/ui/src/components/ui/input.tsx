import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";

import { cn } from "../../lib/utils";
import { useTokens } from "@studio/theme";

const inputVariants = cva("text-[17px] text-foreground", {
  variants: {
    variant: {
      field: "h-11 rounded-[12px] bg-fill px-3",
      inline: "min-h-11 bg-transparent px-0 py-2",
    },
  },
  defaultVariants: { variant: "field" },
});

type InputProps = Omit<
  TextInputProps,
  "className" | "placeholderTextColorClassName"
> &
  VariantProps<typeof inputVariants> & { className?: string };

const Input = React.forwardRef<TextInput, InputProps>(function Input(
  { className, variant, ...props },
  ref,
) {
  const { colors } = useTokens();
  return (
    <TextInput
      ref={ref}
      maxFontSizeMultiplier={2}
      placeholderTextColor={colors.textTertiary}
      selectionColor={colors.accent}
      cursorColor={colors.accent}
      className={cn(
        inputVariants({ variant }),
        props.editable === false && "opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export { Input, inputVariants };
export type { InputProps };
