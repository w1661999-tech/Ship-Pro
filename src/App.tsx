import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'

// Layouts
import AdminLayout from '@/components/layout/AdminLayout'
import MerchantLayout from '@/components/layout/MerchantLayout'
import DriverLayout from '@/components/layout/DriverLayout'

// Pages
import LoginPage from '@/pages/LoginPage'
import TrackingPage from '@/pages/TrackingPage'

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard'
import ShipmentsPage from '@/pages/admin/ShipmentsPage'
import CouriersPage from '@/pages/admin/CouriersPage'
import MerchantsPage from '@/pages/admin/MerchantsPage'
import PricingPage from '@/pages/admin/PricingPage'
import FinancePage from '@/pages/admin/FinancePage'
import ImportPage from '@/pages/admin/ImportPage'
import CollectionsPage from '@/pages/admin/CollectionsPage'

// Merchant Pages
import MerchantDashboard from '@/pages/merchant/MerchantDashboard'
import MerchantShipmentsPage from '@/pages/merchant/MerchantShipmentsPage'
import AddShipmentPage from '@/pages/merchant/AddShipmentPage'
import WaybillsPage from '@/pages/merchant/WaybillsPage'
import MerchantFinancePage from '@/pages/merchant/MerchantFinancePage'
import MerchantImportPage from '@/pages/merchant/MerchantImportPage'

// Driver Pages
import DriverDashboard from '@/pages/driver/DriverDashboard'
import DriverShipmentsPage from '@/pages/driver/DriverShipmentsPage'
import DriverCollectionsPage from '@/pages/driver/DriverCollectionsPage'

import { Loader2 } from 'lucide-react'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, loading } = useAuthStore()
  const [authTimeout, setAuthTimeout] = React.useState(false)

  // If loading takes more than 12s, force redirect to login
  React.useEffect(() => {
    if (!loading) {
      setAuthTimeout(false)
      return
    }
    const t = setTimeout(() => setAuthTimeout(true), 12000)
    return () => clearTimeout(t)
  }, [loading])

  // If we have a user cached AND their role doesn't match allowed roles,
  // redirect immediately without waiting for loading to complete.
  // This prevents security bypass during loading state.
  if (user && allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    if (user.role === 'merchant') return <Navigate to="/merchant" replace />
    if (user.role === 'driver') return <Navigate to="/driver" replace />
    return <Navigate to="/login" replace />
  }

  // Force redirect if auth timed out
  if (authTimeout && !user) {
    return <Navigate to="/login" replace />
  }

  // Show spinner only when loading AND no cached user yet
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">جارٍ تحميل النظام...</p>
        </div>
      </div>
    )
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
      <AppInitializer>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/track" element={<TrackingPage />} />
          <Route path="/tracking" element={<TrackingPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="shipments" element={<ShipmentsPage />} />
            <Route path="couriers" element={<CouriersPage />} />
            <Route path="merchants" element={<MerchantsPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="settlements" element={<FinancePage />} />
            <Route path="collections" element={<CollectionsPage />} />
            <Route path="import" element={<ImportPage />} />
          </Route>

          {/* Merchant Routes */}
          <Route path="/merchant" element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantLayout />
            </ProtectedRoute>
          }>
            <Route index element={<MerchantDashboard />} />
            <Route path="shipments" element={<MerchantShipmentsPage />} />
            <Route path="add-shipment" element={<AddShipmentPage />} />
            <Route path="import" element={<MerchantImportPage />} />
            <Route path="waybills" element={<WaybillsPage />} />
            <Route path="finance" element={<MerchantFinancePage />} />
          </Route>

          {/* Driver Routes */}
          <Route path="/driver" element={
            <ProtectedRoute allowedRoles={['driver']}>
              <DriverLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DriverDashboard />} />
            <Route path="shipments" element={<DriverShipmentsPage />} />
            <Route path="collections" element={<DriverCollectionsPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

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
    </BrowserRouter>
  )
}
