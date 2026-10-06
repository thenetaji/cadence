import { createContext, useContext } from 'react';

export const DatabaseContext = createContext<unknown>(null);

/** The app's database handle; `Db` is the app's own type (apps re-export this with it bound). */
export function useDb<Db>(): Db {
  const value = useContext(DatabaseContext);
  if (!value) throw new Error('useDb must be used inside <DatabaseProvider>');
  return value as Db;
}
