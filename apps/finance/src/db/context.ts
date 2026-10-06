import { createContext, useContext } from 'react';
import type { Db } from './types';

export const DatabaseContext = createContext<Db | null>(null);

export function useDb(): Db {
  const value = useContext(DatabaseContext);
  if (!value) throw new Error('useDb must be used inside <DatabaseProvider>');
  return value;
}
