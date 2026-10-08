import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { toDateKey } from "@studio/dates";

const MINUTE = 60_000;

/** Today's date key; refreshes when the app foregrounds and when the local day rolls over. */
export function useTodayKey(): string {
  const [today, setToday] = useState(() => toDateKey(Date.now()));
  useEffect(() => {
    const refresh = () => setToday(toDateKey(Date.now()));
    const timer = setInterval(refresh, MINUTE);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  return today;
}
