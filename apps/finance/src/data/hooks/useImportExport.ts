import { useCallback } from 'react';
import { useDb } from '@/db/context';
import { listForExport, loadImportContext, type ExportFilter } from '@/db/repos/importer';
import { planImport, type ImportPlan, type ImportRow } from '@/lib/csv';
import { useSettings } from './useSettings';

/** One-off read of the transactions to export; not live. */
export function useExportReader() {
  const db = useDb();
  return useCallback((filter: ExportFilter) => listForExport(db, filter), [db]);
}

/** Dry run of an import against the current data, for the preview screen. */
export function useImportPlanner() {
  const db = useDb();
  const settings = useSettings();
  const displayCurrency = settings.display_currency;
  const defaultAccountId = settings.default_account_id;
  return useCallback(
    (rows: readonly ImportRow[]): ImportPlan => planImport(rows, loadImportContext(db), { displayCurrency, defaultAccountId }),
    [db, displayCurrency, defaultAccountId],
  );
}
