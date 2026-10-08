import { useState, type ReactNode } from "react";
import { Platform } from "react-native";

import { useDb } from "@/db/context";
import { seedDemoData, seedDemoExtras } from "@/db/dev-seed";
import { createAccount } from "@/db/repos/accounts";
import { getSetting, setSetting } from "@/db/repos/settings";
import type { Db } from "@/db/types";

type SeedMode = "demo" | "empty";

function requestedSeed(): SeedMode | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const mode = new URLSearchParams(window.location.search).get("seed");
  return mode === "demo" || mode === "empty" ? mode : null;
}

function requestedHide(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("hide") === "1";
}

function seedEmpty(db: Db): void {
  const account = createAccount(db, {
    name: "Cash",
    type: "cash",
    currency: "USD",
    openingBalance: 0,
    color: "blue",
    isDefault: true,
  });
  setSetting(db, "display_currency", "USD");
  setSetting(db, "default_account_id", account.id);
  setSetting(db, "onboarding_done", true);
}

/** Web only: `?hide=1` also turns on Hide amounts; `?seed=demo` (populated) or `?seed=empty` (onboarded, no transactions) prepares a fresh database before the app renders. */
export function DemoSeedGate({ children }: { children: ReactNode }) {
  const db = useDb();
  useState(() => {
    const mode = requestedSeed();
    if (mode && !getSetting(db, "onboarding_done")) {
      if (mode === "demo") {
        seedDemoData(db);
        seedDemoExtras(db);
      } else seedEmpty(db);
      if (requestedHide()) setSetting(db, "hide_amounts", true);
    }
    return true;
  });
  return <>{children}</>;
}
