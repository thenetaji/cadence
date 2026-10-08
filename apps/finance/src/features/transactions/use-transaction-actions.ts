import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";

import { showToast } from "@studio/ui";
import { useActions } from "@/data/actions";
import { collapseThen } from "@studio/motion";

export interface TransactionActions {
  open: (id: string) => void;
  edit: (id: string) => void;
  duplicate: (id: string) => void;
  /** Deletes and shows the undo toast. */
  remove: (id: string) => boolean;
  /** Native action menu: Edit, Duplicate, Delete. */
  menu: (id: string) => void;
}

/** Stable navigation and write handlers shared by every transaction list and the detail screen. */
export function useTransactionActions(): TransactionActions {
  const router = useRouter();
  const actions = useActions();
  return useMemo(() => {
    const open = (id: string) =>
      router.push({ pathname: "/transaction/[id]", params: { id } });
    const edit = (id: string) =>
      router.push({ pathname: "/transaction/[id]/edit", params: { id } });
    const duplicate = (id: string) =>
      router.push({
        pathname: "/transaction/new",
        params: { duplicateOf: id },
      });
    const remove = (id: string): boolean =>
      !!collapseThen(id, () => removeNow(id));
    const removeNow = (id: string) => {
      const snapshot = actions.transactions.delete(id);
      if (!snapshot) return false;
      showToast({
        message: "Deleted",
        actionLabel: "Undo",
        onAction: () => actions.transactions.restore(snapshot),
      });
      return true;
    };
    const menu = (id: string) => {
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ["Edit", "Duplicate", "Delete", "Cancel"],
            destructiveButtonIndex: 2,
            cancelButtonIndex: 3,
          },
          (index) => {
            if (index === 0) edit(id);
            else if (index === 1) duplicate(id);
            else if (index === 2) remove(id);
          },
        );
        return;
      }
      Alert.alert("Transaction", undefined, [
        { text: "Edit", onPress: () => edit(id) },
        { text: "Duplicate", onPress: () => duplicate(id) },
        { text: "Delete", style: "destructive", onPress: () => remove(id) },
        { text: "Cancel", style: "cancel" },
      ]);
    };
    return { open, edit, duplicate, remove, menu };
  }, [router, actions]);
}
