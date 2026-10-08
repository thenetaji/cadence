import { useEffect } from "react";
import { AppState } from "react-native";
import { toDateKey } from "@studio/dates";
import { useActions } from "../actions";

/** Posts due recurring transactions on mount and every time the app returns to the foreground. */
export function usePostDueRecurring(): void {
  const actions = useActions();
  useEffect(() => {
    const run = () => {
      actions.recurring.postDue(toDateKey(Date.now()));
    };
    run();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    return () => subscription.remove();
  }, [actions]);
}
