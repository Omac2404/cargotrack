import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

/**
 * Sevkiyat / araç formları (sticky tam-genişlik header için) padding'siz render edilir.
 * Diğer sayfalar standart p-6 padding ile.
 */
function isFullBleedRoute(path: string): boolean {
  const parts = path.split('/').filter(Boolean)
  // Sevkiyat: ['shipments', mode, 'new'] | ['shipments', mode, id, 'edit']
  if (parts[0] === 'shipments') {
    if (parts.length === 3 && parts[2] === 'new') return true
    if (parts.length === 4 && parts[3] === 'edit') return true
  }
  // Araç: ['vehicles', 'new'] | ['vehicles', id, 'edit']
  if (parts[0] === 'vehicles') {
    if (parts.length === 2 && parts[1] === 'new') return true
    if (parts.length === 3 && parts[2] === 'edit') return true
  }
  return false
}

export function AppShell() {
  const location = useLocation()
  const fullBleed = isFullBleedRoute(location.pathname)

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-x-hidden">
          {fullBleed ? (
            <Outlet />
          ) : (
            <div className="p-3 md:p-6">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
