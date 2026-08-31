import { useEffect, useState } from 'react'
import { AppShell } from '~/components/shell'
import { ActivityPage } from '~/features/activity'
import { ImportSheet } from '~/features/import'
import { IncomePage } from '~/features/income'
import { OverviewPage } from '~/features/overview'
import { PeoplePage } from '~/features/people'
import { PersonPage } from '~/features/person'
import { SettingsSheet } from '~/features/settings'
import { useRouter } from '~/lib/router'
import { applyTheme, readThemeChoice, watchSystemTheme } from '~/lib/theme'
import { useWorkspace } from '~/lib/workspace'

export function App() {
  const { route } = useRouter()
  const { ready } = useWorkspace()
  const [importing, setImporting] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    applyTheme(readThemeChoice())
    return watchSystemTheme(() => applyTheme(readThemeChoice()))
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route.name, route.param])

  if (!ready) return null

  return (
    <AppShell>
      {renderRoute(route.name, route.param, () => setImporting(true), () => setSettingsOpen(true))}
      {importing ? <ImportSheet onClose={() => setImporting(false)} /> : null}
      {settingsOpen ? <SettingsSheet onClose={() => setSettingsOpen(false)} /> : null}
    </AppShell>
  )
}

function renderRoute(
  name: string,
  param: string | null,
  onImport: () => void,
  onSettings: () => void,
) {
  switch (name) {
    case 'activity':
      return <ActivityPage />
    case 'people':
      return <PeoplePage />
    case 'person':
      return param ? <PersonPage counterpartyId={param} /> : <PeoplePage />
    case 'income':
      return <IncomePage />
    default:
      return <OverviewPage onImport={onImport} onSettings={onSettings} />
  }
}
