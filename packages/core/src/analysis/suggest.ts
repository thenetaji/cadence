import type { CounterpartyRole, Workspace } from '../model'
import type { CurrencyCode } from '../money'
import { partyTotals, type PartyTotals } from './summary'

const OWN_ACCOUNT = /\b(own|self|my)\b|savings account|transfer to savings|internal transfer/i
const REPEATS_NEEDED = 2

export interface RoleSuggestion {
  counterpartyId: string
  role: CounterpartyRole
}

export function suggestRole(entry: PartyTotals): CounterpartyRole {
  if (OWN_ACCOUNT.test(entry.counterparty.displayName)) return 'account'

  const onlyOut = entry.outflow.minor > 0 && entry.inflow.minor === 0
  const onlyIn = entry.inflow.minor > 0 && entry.outflow.minor === 0

  if (onlyOut && entry.count >= REPEATS_NEEDED) return 'spending'
  if (onlyIn && entry.count >= REPEATS_NEEDED) return 'client'

  return 'unassigned'
}

export function suggestRoles(workspace: Workspace, currency: CurrencyCode): RoleSuggestion[] {
  return partyTotals(workspace, currency)
    .filter((entry) => entry.counterparty.role === 'unassigned')
    .map((entry) => ({ counterpartyId: entry.counterparty.id, role: suggestRole(entry) }))
    .filter((suggestion) => suggestion.role !== 'unassigned')
}

export function applySuggestedRoles(workspace: Workspace, currency: CurrencyCode): Workspace {
  const suggestions = new Map(
    suggestRoles(workspace, currency).map((entry) => [entry.counterpartyId, entry.role]),
  )
  if (suggestions.size === 0) return workspace

  return {
    ...workspace,
    counterparties: workspace.counterparties.map((entry) => {
      const role = suggestions.get(entry.id)
      return role ? { ...entry, role } : entry
    }),
  }
}
