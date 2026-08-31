import { describe, expect, it } from 'vitest'
import {
  applySuggestedRoles,
  buildStatement,
  emptyWorkspace,
  mergeCounterparties,
  mergeStatement,
  overview,
  parseCsv,
  sampleCsv,
  sampleRoleSuggestions,
  setCounterpartyRole,
  suggestMapping,
} from '../src'
import { toMajor } from '../src/money'

describe('sample data', () => {
  it('imports end to end and produces a sensible overview', () => {
    const table = parseCsv(sampleCsv())
    const mapping = suggestMapping(table, 'en-IE')
    const { statement, skipped } = buildStatement(table, mapping, {
      institution: 'Sample Bank',
      reference: 'DEMO',
      currency: 'EUR',
    })
    expect(skipped).toHaveLength(0)
    expect(statement.transactions.length).toBeGreaterThan(200)

    let workspace = applySuggestedRoles(
      mergeStatement(emptyWorkspace('EUR', 'en-IE'), statement).workspace,
      'EUR',
    )

    const guessed = workspace.counterparties.filter((entry) => entry.role !== 'unassigned')
    expect(guessed.length).toBeGreaterThan(workspace.counterparties.length / 2)

    for (const party of workspace.counterparties) {
      const hit = sampleRoleSuggestions.find((entry) => party.displayName.includes(entry.match))
      if (hit) workspace = setCounterpartyRole(workspace, party.id, hit.role)
      else if (party.role === 'unassigned') {
        workspace = setCounterpartyRole(workspace, party.id, 'spending')
      }
    }

    const loan = workspace.counterparties.find((entry) => entry.displayName.startsWith('LOAN TO SAM'))
    const repayment = workspace.counterparties.find((entry) =>
      entry.displayName.startsWith('REPAYMENT SAM'),
    )
    expect(loan).toBeDefined()
    expect(repayment).toBeDefined()
    workspace = mergeCounterparties(workspace, loan?.id ?? '', repayment?.id ?? '')

    const result = overview(workspace, 'EUR')
    expect(toMajor(result.lentOutstanding)).toBe(2200)
    expect(result.runway.months).toBeGreaterThan(0)
    expect(result.months.length).toBeGreaterThan(8)
    expect(result.decisions.length).toBeGreaterThan(0)
  })
})
