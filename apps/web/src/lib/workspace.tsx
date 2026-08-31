import {
  addManualAccount,
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
  removeAccount as removeAccountFromWorkspace,
  renameAccount as renameAccountLabel,
  renameCounterparty,
  setCounterpartyRole,
  setManualBalance,
  type Counterparty,
  type CounterpartyRole,
  type CsvTable,
  type ColumnMapping,
  type DraftStatement,
  type IsoDate,
  type Money,
  type MergeSummary,
  type RowProblem,
  type SupportedCurrency,
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

interface WorkspaceValue {
  workspace: Workspace
  ready: boolean
  importCsv: (request: ImportRequest) => ImportOutcome
  importStatement: (statement: DraftStatement, label: string) => ImportOutcome
  assignRole: (counterpartyId: string, role: CounterpartyRole) => void
  combine: (keepId: string, absorbId: string) => void
  rename: (counterpartyId: string, name: string) => void
  setCurrency: (currency: SupportedCurrency) => void
  renameAccount: (accountId: string, label: string) => void
  addAccount: (label: string, balance: Money) => void
  setAccountBalance: (accountId: string, balance: Money) => void
  removeAccount: (accountId: string) => void
  replace: (workspace: Workspace) => void
  reset: () => void
  money: (value: Money) => string
  moneyWhole: (value: Money) => string
  moneyCompact: (value: Money) => string
  moneySigned: (value: Money) => string
  day: (date: IsoDate) => string
  fullDay: (date: IsoDate) => string
  counterparty: (id: string) => Counterparty | undefined
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

  useEffect(() => {
    let cancelled = false
    storeRef.current
      .load()
      .then((loaded) => {
        if (!cancelled && loaded) setWorkspace(loaded)
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

  const workspaceRef = useRef(workspace)
  workspaceRef.current = workspace

  const importCsv = useCallback((request: ImportRequest): ImportOutcome => {
    const { statement, skipped } = buildStatement(request.table, request.mapping, {
      institution: request.institution,
      reference: request.reference,
      currency: request.currency,
    })
    const result = mergeStatement(workspaceRef.current, statement)
    setWorkspace(applySuggestedRoles(result.workspace, result.workspace.displayCurrency))
    return { summary: result.summary, skipped }
  }, [])

  const importStatement = useCallback(
    (statement: DraftStatement, label: string): ImportOutcome => {
      const result = mergeStatement(workspaceRef.current, {
        ...statement,
        institution: statement.institution === '' ? label : statement.institution,
      })
      setWorkspace(applySuggestedRoles(result.workspace, result.workspace.displayCurrency))
      return { summary: result.summary, skipped: [] }
    },
    [],
  )

  const assignRole = useCallback((counterpartyId: string, role: CounterpartyRole) => {
    setWorkspace((current) => setCounterpartyRole(current, counterpartyId, role))
  }, [])

  const combine = useCallback((keepId: string, absorbId: string) => {
    setWorkspace((current) => mergeCounterparties(current, keepId, absorbId))
  }, [])

  const rename = useCallback((counterpartyId: string, name: string) => {
    setWorkspace((current) => renameCounterparty(current, counterpartyId, name))
  }, [])

  const setCurrency = useCallback((currency: SupportedCurrency) => {
    setWorkspace((current) => changeDisplayCurrency(current, currency))
  }, [])

  const renameAccount = useCallback((accountId: string, label: string) => {
    setWorkspace(renameAccountLabel(workspaceRef.current, accountId, label))
  }, [])

  const addAccount = useCallback((label: string, balance: Money) => {
    setWorkspace(addManualAccount(workspaceRef.current, label, balance))
  }, [])

  const setAccountBalance = useCallback((accountId: string, balance: Money) => {
    setWorkspace(setManualBalance(workspaceRef.current, accountId, balance))
  }, [])

  const removeAccount = useCallback((accountId: string) => {
    setWorkspace(removeAccountFromWorkspace(workspaceRef.current, accountId))
  }, [])

  const reset = useCallback(() => {
    setWorkspace(emptyWorkspace(defaultCurrency(locale), locale))
  }, [locale])

  const value = useMemo<WorkspaceValue>(() => {
    const options = { locale: workspace.locale }
    const byId = new Map(workspace.counterparties.map((entry) => [entry.id, entry]))
    return {
      workspace,
      ready,
      importCsv,
      importStatement,
      assignRole,
      combine,
      rename,
      setCurrency,
      renameAccount,
      addAccount,
      setAccountBalance,
      removeAccount,
      replace: setWorkspace,
      reset,
      money: (money) => formatMoney(money, options),
      moneyWhole: (money) => formatWhole(money, options),
      moneyCompact: (money) => formatCompact(money, options),
      moneySigned: (money) => formatSigned(money, options),
      day: (date) => formatDate(date, workspace.locale, 'short'),
      fullDay: (date) => formatDate(date, workspace.locale, 'medium'),
      counterparty: (id) => byId.get(id),
    }
  }, [
    workspace,
    ready,
    importCsv,
    importStatement,
    assignRole,
    combine,
    rename,
    setCurrency,
    renameAccount,
    addAccount,
    setAccountBalance,
    removeAccount,
    reset,
  ])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return value
}
