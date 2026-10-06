import { getSetting, insertMissingDefaults, setSetting } from './settings';
import {
  accounts,
  attachments,
  budgetCategories,
  budgets,
  categories,
  fxRates,
  people,
  tags,
  transactionTags,
  recurringRules,
  settings,
  titleMemory,
  transactionSplits,
  transactions,
} from '../schema';
import { seedDefaults } from '../seed';
import type { Db } from '../types';

/** Deletes every row, resets settings to their defaults (keeping the theme) and re-seeds the default categories, atomically. */
export function eraseAllData(db: Db): void {
  db.transaction((tx) => {
    const theme = getSetting(tx, 'theme');
    const iconStyle = getSetting(tx, 'icon_style');
    const iconBackground = getSetting(tx, 'icon_background');
    tx.delete(transactionSplits).run();
    tx.delete(transactionTags).run();
    tx.delete(attachments).run();
    tx.delete(transactions).run();
    tx.delete(tags).run();
    tx.delete(people).run();
    tx.delete(recurringRules).run();
    tx.delete(budgetCategories).run();
    tx.delete(budgets).run();
    tx.delete(titleMemory).run();
    tx.delete(fxRates).run();
    tx.delete(accounts).run();
    tx.delete(categories).run();
    tx.delete(settings).run();
    insertMissingDefaults(tx);
    setSetting(tx, 'theme', theme);
    setSetting(tx, 'icon_style', iconStyle);
    setSetting(tx, 'icon_background', iconBackground);
    seedDefaults(tx);
  });
}
