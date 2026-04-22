import React from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { cn } from '@/utils/helpers'
import { useAuthStore } from '@/store/authStore'
import { signOut } from '@/lib/supabase'
import { LayoutDashboard, Package, DollarSign, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'الرئيسية', path: '/driver', icon: LayoutDashboard, exact: true },
  { label: 'شحناتي', path: '/driver/shipments', icon: Package },
  { label: 'التحصيلات', path: '/driver/collections', icon: DollarSign },
]

export default function DriverLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
    toast.success('تم تسجيل الخروج')
  }

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden" dir="rtl">
      {/* Header */}
      <header className="bg-orange-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black leading-tight">ShipPro</h1>
            <p className="text-xs text-orange-200 leading-tight">تطبيق المندوب</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="text-sm font-bold">{user?.full_name}</p>
            <p className="text-xs text-orange-200">مندوب توصيل</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="bg-white border-t border-gray-200 flex-shrink-0 safe-area-bottom">
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-gray-100">
          {navItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.path, item.exact)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors',
                  active
                    ? 'text-orange-600 bg-orange-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
