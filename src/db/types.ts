import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Schema } from './schema';

/** Synchronous Drizzle database; satisfied by both expo-sqlite and better-sqlite3 instances. */
export type Db = BaseSQLiteDatabase<'sync', unknown, Schema>;
