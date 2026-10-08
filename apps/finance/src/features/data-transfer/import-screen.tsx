import { useRouter } from "expo-router";
import * as React from "react";

import { ListGroup, ListRow, showToast } from "@studio/ui";
import {
  CsvFormatError,
  IMPORT_FORMAT_LABELS,
  parseImport,
  type ImportFormat,
} from "@/lib/csv";
import type { CategoryColorKey } from "@studio/theme";

import { pickTextFile } from "./pick-text-file";
import { useImportStore } from "./store";

const FORMATS: readonly { format: ImportFormat; color: CategoryColorKey }[] = [
  { format: "native", color: "blue" },
  { format: "dime", color: "green" },
  { format: "cashew", color: "orange" },
];

/** One row per supported CSV format; picking a file parses it and opens the preview. */
export function ImportSection() {
  const router = useRouter();
  const setPending = useImportStore((s) => s.set);
  const [busy, setBusy] = React.useState(false);

  const choose = async (format: ImportFormat) => {
    if (busy) return;
    setBusy(true);
    try {
      const text = await pickTextFile();
      if (text === null) return;
      const { rows, skipped } = parseImport(format, text);
      if (rows.length === 0) {
        showToast({ message: "No transactions", haptic: "warning" });
        return;
      }
      setPending({ format, rows, unreadable: skipped });
      router.push("/settings/import-preview");
    } catch (error) {
      showToast({
        message:
          error instanceof CsvFormatError
            ? "Wrong format"
            : "Could not read file",
        haptic: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ListGroup header="Import">
      {FORMATS.map(({ format, color }) => (
        <ListRow
          key={format}
          label={IMPORT_FORMAT_LABELS[format]}
          icon={{ name: "doc.text.fill", color }}
          chevron
          onPress={() => void choose(format)}
        />
      ))}
    </ListGroup>
  );
}
