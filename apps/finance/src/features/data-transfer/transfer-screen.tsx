import * as React from "react";
import { ScrollView } from "react-native";

import { ListGroup, ListRow } from "@studio/ui";
import { useActions } from "@/data/actions";
import { haptic } from "@studio/theme";

import { confirmErase } from "./erase";
import { ExportSection } from "./export-screen";
import { ImportSection } from "./import-screen";

/** Import, export and, last, Erase all data (two-step confirmation). */
export function TransferScreen() {
  const actions = useActions();
  // Onboarding is the unprotected route once `onboarding_done` resets, so the navigator moves there on its own.
  const eraseAll = () =>
    confirmErase(() => {
      actions.data.eraseAll();
      haptic("success");
    });
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-6 pb-12 pt-4"
    >
      <ImportSection />
      <ExportSection />
      <ListGroup>
        <ListRow label="Erase all data" destructive onPress={eraseAll} />
      </ListGroup>
    </ScrollView>
  );
}
