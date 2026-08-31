import {
  addManualAccount,
  addScheduled,
  addTransaction,
  applySuggestedRoles,
  buildStatement,
  emptyWorkspace,
  formatCompact,
  formatDate,
  formatMoney,
  formatSigned,
  formatWhole,
  changeDisplayCurrency,
  currencyForRegion,
  mergeCounterparties,
  mergeStatement,
  normaliseWorkspace,
  recordScheduled,
  recordTransfer,
  removeAccount as removeAccountFromWorkspace,
  removeScheduled,
  removeTransaction,
  renameAccount as renameAccountLabel,
  renameCounterparty,
  setCounterpartyDueDate,
  setCounterpartyNote,
  setCounterpartyRole,
  setManualBalance,
  skipScheduled,
  updateScheduled,
  updateTransaction,
  type Counterparty,
  type CounterpartyRole,
  type CsvTable,
  type ColumnMapping,
  type DraftStatement,
  type IsoDate,
  type Money,
  type MergeSummary,
  type Plan,
  type RowProblem,
  type ScheduledInput,
  type ScheduledItem,
  type SupportedCurrency,
  type TransactionInput,
  type TransferInput,
  type Workspace,
} from '@cadence/core'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { createStore, type WorkspaceStore } from './store'

export interface ImportRequest {
  table: CsvTable
  mapping: ColumnMapping
  institution: string
  reference: string
  currency: SupportedCurrency
}

export interface ImportOutcome {
  summary: MergeSummary
  skipped: RowProblem[]
}

const UNDO_DEPTH = 25

interface WorkspaceValue {
  workspace: Workspace
  ready: boolean
  importCsv: (request: ImportRequest) => ImportOutcome
  importStatement: (statement: DraftStatement, label: string) => ImportOutcome
  addEntry: (input: TransactionInput) => void
  editEntry: (transactionId: string, patch: Partial<TransactionInput>) => void
  deleteEntry: (transactionId: string) => void
  transfer: (input: TransferInput) => void
  addSchedule: (input: ScheduledInput) => void
  editSchedule: (itemId: string, patch: Partial<Omit<ScheduledItem, 'id'>>) => void
  deleteSchedule: (itemId: string) => void
  recordSchedule: (itemId: string, options?: { date?: IsoDate; amount?: Money }) => void
  skipSchedule: (itemId: string) => void
  assignRole: (counterpartyId: string, role: CounterpartyRole) => void
  setDueDate: (counterpartyId: string, dueDate: IsoDate | null) => void
  setPartyNote: (counterpartyId: string, note: string) => void
  setPlan: (patch: Partial<Plan>) => void
  combine: (keepId: string, absorbId: string) => void
  rename: (counterpartyId: string, name: string) => void
  setCurrency: (currency: SupportedCurrency) => void
  renameAccount: (accountId: string, label: string) => void
  addAccount: (label: string, balance: Money) => void
  setAccountBalance: (accountId: string, balance: Money) => void
  removeAccount: (accountId: string) => void
  replace: (workspace: Workspace) => void
  reset: () => void
  undo: () => void
  canUndo: boolean
  money: (value: Money) => string
  moneyWhole: (value: Money) => string
  moneyCompact: (value: Money) => string
  moneySigned: (value: Money) => string
  day: (date: IsoDate) => string
  fullDay: (date: IsoDate) => string
  counterparty: (id: string) => Counterparty | undefined
  account: (id: string) => string
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

function defaultLocale(): string {
  return typeof navigator === 'undefined' ? 'en-US' : (navigator.language ?? 'en-US')
}

function defaultCurrency(locale: string): SupportedCurrency {
  return currencyForRegion(new Intl.Locale(locale).maximize().region ?? 'US')
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<WorkspaceStore>(createStore())
  const locale = useMemo(defaultLocale, [])
  const [workspace, setWorkspace] = useState<Workspace>(() =>
    emptyWorkspace(defaultCurrency(locale), locale),
  )
  const [ready, setReady] = useState(false)
  const [undoDepth, setUndoDepth] = useState(0)

  const workspaceRef = useRef(workspace)
  workspaceRef.current = workspace
  const historyRef = useRef<Workspace[]>([])

  useEffect(() => {
    let cancelled = false
    storeRef.current
      .load()
      .then((loaded) => {
        if (!cancelled && loaded) setWorkspace(normaliseWorkspace(loaded))
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    void storeRef.current.save(workspace)
  }, [workspace, ready])

  /**
   * Every change goes through here so the last few states are always recoverable.
   * The update runs against a ref rather than inside the state updater, so a throw
   * from the model leaves the workspace and the history untouched.
   */
  const commit = useCallback((update: (current: Workspace) => Workspace) => {
    const current = workspaceRef.current
    const next = update(current)
    if (next === current) return
    historyRef.current = [...historyRef.current, current].slice(-UNDO_DEPTH)
    workspaceRef.current = next
    setWorkspace(next)
    setUndoDepth(historyRef.current.length)
  }, [])

  const undo = useCallback(() => {
    const previous = historyRef.current.at(-1)
    if (!previous) return
    historyRef.current = historyRef.current.slice(0, -1)
    workspaceRef.current = previous
    setWorkspace(previous)
    setUndoDepth(historyRef.current.length)
  }, [])

  const importCsv = useCallback(
    (request: ImportRequest): ImportOutcome => {
      const { statement, skipped } = buildStatement(request.table, request.mapping, {
        institution: request.institution,
        reference: request.reference,
        currency: request.currency,
      })
      let summary: MergeSummary | null = null
      commit((current) => {
        const result = mergeStatement(current, statement)
        summary = result.summary
        return applySuggestedRoles(result.workspace, result.workspace.displayCurrency)
      })
      return {
        summary: summary ?? { accountId: '', added: 0, duplicates: 0, newCounterparties: [] },
        skipped,
      }
    },
    [commit],
  )

  const importStatement = useCallback(
    (statement: DraftStatement, label: string): ImportOutcome => {
      let summary: MergeSummary | null = null
      commit((current) => {
        const result = mergeStatement(current, {
          ...statement,
          institution: statement.institution === '' ? label : statement.institution,
        })
        summary = result.summary
        return applySuggestedRoles(result.workspace, result.workspace.displayCurrency)
      })
      return {
        summary: summary ?? { accountId: '', added: 0, duplicates: 0, newCounterparties: [] },
        skipped: [],
      }
    },
    [commit],
  )

  const actions = useMemo(
    () => ({
      addEntry: (input: TransactionInput) =>
        commit((current) => addTransaction(current, input).workspace),
      editEntry: (transactionId: string, patch: Partial<TransactionInput>) =>
        commit((current) => updateTransaction(current, transactionId, patch)),
      deleteEntry: (transactionId: string) =>
        commit((current) => removeTransaction(current, transactionId)),
      transfer: (input: TransferInput) => commit((current) => recordTransfer(current, input)),
      addSchedule: (input: ScheduledInput) => commit((current) => addScheduled(current, input)),
      editSchedule: (itemId: string, patch: Partial<Omit<ScheduledItem, 'id'>>) =>
        commit((current) => updateScheduled(current, itemId, patch)),
      deleteSchedule: (itemId: string) => commit((current) => removeScheduled(current, itemId)),
      recordSchedule: (itemId: string, options?: { date?: IsoDate; amount?: Money }) =>
        commit((current) => recordScheduled(current, itemId, options)),
      skipSchedule: (itemId: string) => commit((current) => skipScheduled(current, itemId)),
      assignRole: (counterpartyId: string, role: CounterpartyRole) =>
        commit((current) => setCounterpartyRole(current, counterpartyId, role)),
      setDueDate: (counterpartyId: string, dueDate: IsoDate | null) =>
        commit((current) => setCounterpartyDueDate(current, counterpartyId, dueDate)),
      setPartyNote: (counterpartyId: string, note: string) =>
        commit((current) => setCounterpartyNote(current, counterpartyId, note)),
      setPlan: (patch: Partial<Plan>) =>
        commit((current) => ({ ...current, plan: { ...current.plan, ...patch } })),
      combine: (keepId: string, absorbId: string) =>
        commit((current) => mergeCounterparties(current, keepId, absorbId)),
      rename: (counterpartyId: string, name: string) =>
        commit((current) => renameCounterparty(current, counterpartyId, name)),
      setCurrency: (currency: SupportedCurrency) =>
        commit((current) => changeDisplayCurrency(current, currency)),
      renameAccount: (accountId: string, label: string) =>
        commit((current) => renameAccountLabel(current, accountId, label)),
      addAccount: (label: string, balance: Money) =>
        commit((current) => addManualAccount(current, label, balance)),
      setAccountBalance: (accountId: string, balance: Money) =>
        commit((current) => setManualBalance(current, accountId, balance)),
      removeAccount: (accountId: string) =>
        commit((current) => removeAccountFromWorkspace(current, accountId)),
      replace: (next: Workspace) => commit(() => normaliseWorkspace(next)),
      reset: () => commit(() => emptyWorkspace(defaultCurrency(locale), locale)),
    }),
    [commit, locale],
  )

  const value = useMemo<WorkspaceValue>(() => {
    const options = { locale: workspace.locale }
    const byId = new Map(workspace.counterparties.map((entry) => [entry.id, entry]))
    const accountsById = new Map(workspace.accounts.map((entry) => [entry.id, entry.label]))
    return {
      workspace,
      ready,
      importCsv,
      importStatement,
      undo,
      canUndo: undoDepth > 0,
      ...actions,
      money: (money) => formatMoney(money, options),
      moneyWhole: (money) => formatWhole(money, options),
      moneyCompact: (money) => formatCompact(money, options),
      moneySigned: (money) => formatSigned(money, options),
      day: (date) => formatDate(date, workspace.locale, 'short'),
      fullDay: (date) => formatDate(date, workspace.locale, 'medium'),
      counterparty: (id) => byId.get(id),
      account: (id) => accountsById.get(id) ?? 'Unknown account',
    }
  }, [workspace, ready, importCsv, importStatement, undo, undoDepth, actions])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return value
}
