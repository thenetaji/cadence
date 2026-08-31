import type { Workspace } from '@cadence/core'

export interface WorkspaceStore {
  load(): Promise<Workspace | null>
  save(workspace: Workspace): Promise<void>
  clear(): Promise<void>
}

const DATABASE = 'cadence'
const STORE = 'workspace'
const KEY = 'current'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE, mode)
        const request = action(transaction.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => database.close()
      }),
  )
}

export const indexedDbStore: WorkspaceStore = {
  async load() {
    const value = await run<unknown>('readonly', (store) => store.get(KEY))
    return (value as Workspace | undefined) ?? null
  },
  async save(workspace) {
    await run('readwrite', (store) => store.put(workspace, KEY))
  },
  async clear() {
    await run('readwrite', (store) => store.delete(KEY))
  },
}

export const memoryStore = (): WorkspaceStore => {
  let held: Workspace | null = null
  return {
    load: async () => held,
    save: async (workspace) => {
      held = workspace
    },
    clear: async () => {
      held = null
    },
  }
}

export function createStore(): WorkspaceStore {
  return typeof indexedDB === 'undefined' ? memoryStore() : indexedDbStore
}
