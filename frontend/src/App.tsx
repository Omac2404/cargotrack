import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useEffect, lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

import { queryClient } from '@/lib/queryClient'
import { useAuth } from '@/stores/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { CommandPalette, useCommandPalette } from '@/components/CommandPalette'
import { GlobalShortcutsProvider } from '@/components/ShortcutsHelp'
import { ComingSoon } from '@/features/placeholder/ComingSoon'

// Code splitting — her sayfa kendi bundle'ında
const StatisticsPage = lazy(() => import('@/features/statistics/StatisticsPage').then((m) => ({ default: m.StatisticsPage })))
const ShipmentsListPage = lazy(() => import('@/features/shipments/ShipmentsListPage').then((m) => ({ default: m.ShipmentsListPage })))
const ShipmentFormPage = lazy(() => import('@/features/shipments/ShipmentFormPage').then((m) => ({ default: m.ShipmentFormPage })))
const PartnersListPage = lazy(() => import('@/features/partners/PartnersListPage').then((m) => ({ default: m.PartnersListPage })))
const PartnerDetailPage = lazy(() => import('@/features/partners/PartnerDetailPage').then((m) => ({ default: m.PartnerDetailPage })))
const WarehousesListPage = lazy(() => import('@/features/warehouses/WarehousesListPage').then((m) => ({ default: m.WarehousesListPage })))
const VehiclesListPage = lazy(() => import('@/features/vehicles/VehiclesListPage').then((m) => ({ default: m.VehiclesListPage })))
const VehicleFormPage = lazy(() => import('@/features/vehicles/VehicleFormPage').then((m) => ({ default: m.VehicleFormPage })))
const AssignmentsListPage = lazy(() => import('@/features/assignments/AssignmentsListPage').then((m) => ({ default: m.AssignmentsListPage })))
const DocumentsPage = lazy(() => import('@/features/documents/DocumentsPage').then((m) => ({ default: m.DocumentsPage })))
const UsersListPage = lazy(() => import('@/features/users/UsersListPage').then((m) => ({ default: m.UsersListPage })))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const StorageOrdersPage = lazy(() => import('@/features/storage-orders/StorageOrdersPage').then((m) => ({ default: m.StorageOrdersPage })))
const AuditLogPage = lazy(() => import('@/features/audit/AuditLogPage').then((m) => ({ default: m.AuditLogPage })))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const ArchivePage = lazy(() => import('@/features/archive/ArchivePage').then((m) => ({ default: m.ArchivePage })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function AppRoutes() {
  const logout = useAuth((s) => s.logout)
  const cmdK = useCommandPalette()

  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('ct:unauthorized', handler)
    return () => window.removeEventListener('ct:unauthorized', handler)
  }, [logout])

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <AppShell />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Suspense fallback={<PageLoader />}><StatisticsPage /></Suspense>} />
          <Route path="/shipments/:mode" element={<Suspense fallback={<PageLoader />}><ShipmentsListPage /></Suspense>} />
          <Route path="/shipments/:mode/new" element={<Suspense fallback={<PageLoader />}><ShipmentFormPage /></Suspense>} />
          <Route path="/shipments/:mode/:id/edit" element={<Suspense fallback={<PageLoader />}><ShipmentFormPage /></Suspense>} />
          <Route path="/partners" element={<Suspense fallback={<PageLoader />}><PartnersListPage /></Suspense>} />
          <Route path="/partners/:id" element={<Suspense fallback={<PageLoader />}><PartnerDetailPage /></Suspense>} />
          <Route path="/warehouses" element={<Suspense fallback={<PageLoader />}><WarehousesListPage /></Suspense>} />
          <Route path="/vehicles" element={<Suspense fallback={<PageLoader />}><VehiclesListPage /></Suspense>} />
          <Route path="/vehicles/new" element={<Suspense fallback={<PageLoader />}><VehicleFormPage /></Suspense>} />
          <Route path="/vehicles/:id/edit" element={<Suspense fallback={<PageLoader />}><VehicleFormPage /></Suspense>} />
          <Route path="/assignments" element={<Suspense fallback={<PageLoader />}><AssignmentsListPage /></Suspense>} />
          <Route path="/documents" element={<Suspense fallback={<PageLoader />}><DocumentsPage /></Suspense>} />
          <Route path="/users" element={<Suspense fallback={<PageLoader />}><UsersListPage /></Suspense>} />
          <Route path="/profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
          <Route path="/storage-orders" element={<Suspense fallback={<PageLoader />}><StorageOrdersPage /></Suspense>} />
          <Route path="/audit" element={<Suspense fallback={<PageLoader />}><AuditLogPage /></Suspense>} />
          <Route path="/reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
          <Route path="/archive" element={<Suspense fallback={<PageLoader />}><ArchivePage /></Suspense>} />
          <Route path="/settings" element={<ComingSoon title="Ayarlar" phase="Sonraki sürüm" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Ctrl+K command palette */}
      <CommandPalette open={cmdK.open} onOpenChange={cmdK.setOpen} />

      {/* Global klavye kısayolları (?, Ctrl+N, J/K, g+X navigasyon vs.) */}
      <GlobalShortcutsProvider />
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster
        position="bottom-right"
        richColors
        toastOptions={{
          classNames: { toast: 'font-sans text-sm' },
        }}
      />
    </QueryClientProvider>
  )
}
