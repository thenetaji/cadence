export type SegmentedControlProps = {
  values: readonly string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  accessibilityLabel?: string;
  className?: string;
  /** Dims the control and ignores taps; the selected segment stays visible. */
  disabled?: boolean;
  /** Segments that cannot be chosen; dimmed on web, tap ignored (and reverted) on iOS. */
  disabledIndexes?: readonly number[];
};
