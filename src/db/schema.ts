import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Placeholder so drizzle-kit has a schema; real tables come with the product spec.
export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: integer('updated_at'),
});
