import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '~/app/App'
import { RouterProvider } from '~/lib/router'
import { WorkspaceProvider } from '~/lib/workspace'
import '~/styles/tokens.css'

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element')

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </RouterProvider>
  </StrictMode>,
)
