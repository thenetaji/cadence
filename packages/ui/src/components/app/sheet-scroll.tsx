import * as React from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";

type SheetScrollProps = Omit<
  ScrollViewProps,
  "children" | "stickyHeaderIndices"
> & {
  /** Toolbar (and any search field): pinned to the top of the sheet. */
  header?: React.ReactNode;
  bodyClassName?: string;
  children?: React.ReactNode;
};

/**
 * Root of a scrolling form sheet. react-native-screens forces the first scroll view it finds in a
 * formSheet to the sheet's full frame and drives detent expansion from it, so the scroll view must be
 * the screen's only root: a toolbar View above it, or a footer below, ends up under (or over) it and
 * the content blanks when the detent changes. The toolbar therefore lives inside as a sticky header.
 */
function SheetScroll({
  header,
  bodyClassName,
  children,
  ...props
}: SheetScrollProps) {
  return (
    <ScrollView
      className="flex-1 bg-bg"
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      stickyHeaderIndices={header ? [0] : undefined}
      {...props}
    >
      {header ? <View className="bg-bg pt-2">{header}</View> : null}
      <View className={bodyClassName}>{children}</View>
    </ScrollView>
  );
}

export { SheetScroll };
