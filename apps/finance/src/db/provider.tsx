import { DatabaseProvider as BaseProvider } from "@studio/data/provider";
import type { ReactNode } from "react";
import migrations from "../../drizzle/migrations";
import { db } from "./client";
import { useDb } from "./context";
import { seedDefaults } from "./seed";

export interface DatabaseProviderProps {
  children: ReactNode;
  /** Rendered while migrating and seeding. */
  fallback?: ReactNode;
  /** Rendered when migration or seeding fails. */
  errorFallback?: (error: Error) => ReactNode;
}

export function DatabaseProvider(props: DatabaseProviderProps) {
  return (
    <BaseProvider
      db={db}
      migrations={migrations}
      seed={seedDefaults}
      {...props}
    />
  );
}

export { useDb };
