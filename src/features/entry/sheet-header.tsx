import type { NativeStackNavigationOptions } from 'expo-router';
import * as React from 'react';

import { barLeft, barRight } from '@/components/app/header-button';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type SheetHeaderOptions = {
  title: string;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
};

/** Native toolbar for a form sheet: Cancel on the left, Save on the right. */
function sheetHeader({ title, onCancel, onSave, saveDisabled = false, saveLabel = 'Save' }: SheetHeaderOptions): NativeStackNavigationOptions {
  return {
    title,
    headerShown: true,
    ...barLeft(
      <Button variant="barSecondary" size="sm" onPress={onCancel} accessibilityLabel="Cancel">
        <Text variant="body">Cancel</Text>
      </Button>
    ),
    ...barRight(
      <Button variant="barPrimary" size="sm" disabled={saveDisabled} onPress={onSave} accessibilityLabel={saveLabel}>
        <Text variant="headline">{saveLabel}</Text>
      </Button>
    ),
  };
}

/**
 * Stable toolbar options: callbacks go through refs so the options object only changes with the
 * title or the Save state, never on every render (a fresh object each render makes the navigator re-render in a loop).
 */
export function useSheetHeader({ title, onCancel, onSave, saveDisabled = false, saveLabel = 'Save' }: SheetHeaderOptions): NativeStackNavigationOptions {
  // Handlers are read from refs at press time only; the compiler cannot see that.
  'use no memo';
  const cancel = React.useRef(onCancel);
  const save = React.useRef(onSave);
  React.useEffect(() => {
    cancel.current = onCancel;
    save.current = onSave;
  });
  return React.useMemo(
    // eslint-disable-next-line react-hooks/refs -- the refs are only read when a button is pressed
    () => sheetHeader({ title, onCancel: () => cancel.current(), onSave: () => save.current(), saveDisabled, saveLabel }),
    [title, saveDisabled, saveLabel],
  );
}
