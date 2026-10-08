import { DatabaseContext, useDb as useDbBase } from "@studio/data";

import type { Db } from "./types";

export { DatabaseContext };

export function useDb(): Db {
  return useDbBase<Db>();
}
