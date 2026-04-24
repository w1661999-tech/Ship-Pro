import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { Loader2, RefreshCw } from 'lucide-react'

const AdminLayout = React.lazy(() => import('@/components/layout/AdminLayout'))
const MerchantLayout = React.lazy(() => import('@/components/layout/MerchantLayout'))
const DriverLayout = React.lazy(() => import('@/components/layout/DriverLayout'))

const LoginPage = React.lazy(() => import('@/pages/LoginPage'))
const TrackingPage = React.lazy(() => import('@/pages/TrackingPage'))

const AdminDashboard = React.lazy(() => import('@/pages/admin/AdminDashboard'))
const ShipmentsPage = React.lazy(() => import('@/pages/admin/ShipmentsPage'))
const CouriersPage = React.lazy(() => import('@/pages/admin/CouriersPage'))
const MerchantsPage = React.lazy(() => import('@/pages/admin/MerchantsPage'))
const PricingPage = React.lazy(() => import('@/pages/admin/PricingPage'))
const FinancePage = React.lazy(() => import('@/pages/admin/FinancePage'))
const ImportPage = React.lazy(() => import('@/pages/admin/ImportPage'))
const CollectionsPage = React.lazy(() => import('@/pages/admin/CollectionsPage'))
const AdminTicketsPage = React.lazy(() => import('@/pages/admin/AdminTicketsPage'))
const WarehousePage = React.lazy(() => import('@/pages/admin/WarehousePage'))
const SystemPage = React.lazy(() => import('@/pages/admin/SystemPage'))

const MerchantDashboard = React.lazy(() => import('@/pages/merchant/MerchantDashboard'))
const MerchantShipmentsPage = React.lazy(() => import('@/pages/merchant/MerchantShipmentsPage'))
const AddShipmentPage = React.lazy(() => import('@/pages/merchant/AddShipmentPage'))
const WaybillsPage = React.lazy(() => import('@/pages/merchant/WaybillsPage'))
const MerchantFinancePage = React.lazy(() => import('@/pages/merchant/MerchantFinancePage'))
const MerchantImportPage = React.lazy(() => import('@/pages/merchant/MerchantImportPage'))
const MerchantTicketsPage = React.lazy(() => import('@/pages/merchant/MerchantTicketsPage'))

const DriverDashboard = React.lazy(() => import('@/pages/driver/DriverDashboard'))
const DriverShipmentsPage = React.lazy(() => import('@/pages/driver/DriverShipmentsPage'))
const DriverCollectionsPage = React.lazy(() => import('@/pages/driver/DriverCollectionsPage'))

function FullScreenLoader({ message = 'جارٍ تحميل النظام...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  )
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('Ship Pro runtime error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center" dir="rtl">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-slate-900 mb-2">حدث خطأ غير متوقع</h1>
            <p className="text-sm text-slate-600 mb-5">
              تم إيقاف الصفحة الحالية لحماية البيانات. يمكنك إعادة تحميل الصفحة للمتابعة.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 transition-colors"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, loading } = useAuthStore()
  const [authTimeout, setAuthTimeout] = React.useState(false)

  React.useEffect(() => {
    if (!loading) {
      setAuthTimeout(false)
      return
    }
    const t = setTimeout(() => setAuthTimeout(true), 12000)
    return () => clearTimeout(t)
  }, [loading])

  if (user && allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    if (user.role === 'merchant') return <Navigate to="/merchant" replace />
    if (user.role === 'driver') return <Navigate to="/driver" replace />
    return <Navigate to="/login" replace />
  }

  if (authTimeout && !user) {
    return <Navigate to="/login" replace />
  }

  if (loading && !user) {
    return <FullScreenLoader />
  }

  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  useAuth()
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <AppInitializer>
          <Suspense fallback={<FullScreenLoader message="جارٍ تحميل الصفحة..." />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/track" element={<TrackingPage />} />
              <Route path="/tracking" element={<TrackingPage />} />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="shipments" element={<ShipmentsPage />} />
                <Route path="couriers" element={<CouriersPage />} />
                <Route path="merchants" element={<MerchantsPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="finance" element={<FinancePage />} />
                <Route path="settlements" element={<FinancePage />} />
                <Route path="collections" element={<CollectionsPage />} />
                <Route path="import" element={<ImportPage />} />
                <Route path="tickets" element={<AdminTicketsPage />} />
                <Route path="warehouses" element={<WarehousePage />} />
                <Route path="system" element={<SystemPage />} />
              </Route>

              <Route
                path="/merchant"
                element={
                  <ProtectedRoute allowedRoles={['merchant']}>
                    <MerchantLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<MerchantDashboard />} />
                <Route path="shipments" element={<MerchantShipmentsPage />} />
                <Route path="add-shipment" element={<AddShipmentPage />} />
                <Route path="import" element={<MerchantImportPage />} />
                <Route path="waybills" element={<WaybillsPage />} />
                <Route path="finance" element={<MerchantFinancePage />} />
                <Route path="tickets" element={<MerchantTicketsPage />} />
              </Route>

              <Route
                path="/driver"
                element={
                  <ProtectedRoute allowedRoles={['driver']}>
                    <DriverLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DriverDashboard />} />
                <Route path="shipments" element={<DriverShipmentsPage />} />
                <Route path="collections" element={<DriverCollectionsPage />} />
              </Route>

              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>

          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: {
                fontFamily: 'Cairo, sans-serif',
                direction: 'rtl',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '14px',
              },
              success: {
                style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
                iconTheme: { primary: '#16a34a', secondary: '#f0fdf4' },
              },
              error: {
                style: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
                iconTheme: { primary: '#dc2626', secondary: '#fef2f2' },
              },
            }}
          />
        </AppInitializer>
      </AppErrorBoundary>
    </BrowserRouter>
  )
}
