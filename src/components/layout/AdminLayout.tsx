import React, { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { cn } from '@/utils/helpers'
import { useAuthStore } from '@/store/authStore'
import { signOut } from '@/lib/supabase'
import {
  LayoutDashboard, Package, Users, TruckIcon, DollarSign,
  MapPin, LogOut, Menu, ChevronDown, ChevronUp,
  FileSpreadsheet, LifeBuoy, Warehouse, Settings
} from 'lucide-react'
import toast from 'react-hot-toast'
import NotificationBell from '@/components/NotificationBell'

const navItems = [
  {
    label: 'لوحة التحكم',
    path: '/admin',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'الشحنات',
    path: '/admin/shipments',
    icon: Package,
  },
  {
    label: 'المناديب',
    path: '/admin/couriers',
    icon: TruckIcon,
  },
  {
    label: 'التجار',
    path: '/admin/merchants',
    icon: Users,
  },
  {
    label: 'المناطق والتسعير',
    path: '/admin/pricing',
    icon: MapPin,
  },
  {
    label: 'المالية',
    path: '/admin/finance',
    icon: DollarSign,
    children: [
      { label: 'المعاملات والتسويات', path: '/admin/finance' },
      { label: 'تحصيلات المناديب', path: '/admin/collections' },
    ]
  },
  {
    label: 'استيراد الشحنات',
    path: '/admin/import',
    icon: FileSpreadsheet,
  },
  {
    label: 'المخازن والأرفف',
    path: '/admin/warehouses',
    icon: Warehouse,
  },
  {
    label: 'الدعم والتذاكر',
    path: '/admin/tickets',
    icon: LifeBuoy,
  },
  {
    label: 'إعدادات النظام',
    path: '/admin/system',
    icon: Settings,
  },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['/admin/finance'])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
    toast.success('تم تسجيل الخروج بنجاح')
  }

  const toggleMenu = (path: string) => {
    setExpandedMenus(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    )
  }

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const isParentActive = (item: typeof navItems[0]) => {
    if (item.children) {
      return item.children.some(c => location.pathname.startsWith(c.path))
    }
    return isActive(item.path, item.exact)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="text-base font-black text-gray-900">ShipPro</h1>
              <p className="text-xs text-gray-400">لوحة الإدارة</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const active = isParentActive(item)
            const expanded = expandedMenus.includes(item.path)

            if (item.children) {
              return (
                <div key={item.path}>
                  <button
                    onClick={() => toggleMenu(item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium',
                      active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-right">{item.label}</span>
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </>
                    )}
                  </button>
                  {sidebarOpen && expanded && (
                    <div className="mr-7 mt-1 space-y-1">
                      {item.children.map(child => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={() => setMobileSidebarOpen(false)}
                          className={cn(
                            'block px-3 py-2 rounded-lg text-sm transition-colors',
                            location.pathname === child.path
                              ? 'text-blue-700 bg-blue-50 font-semibold'
                              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium',
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User */}
      {sidebarOpen && (
        <div className="px-3 py-3 border-t border-gray-200">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-sm">{user?.full_name?.[0] || 'A'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col bg-white border-l border-gray-200 shadow-sm transition-all duration-300 flex-shrink-0',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        <SidebarContent />
        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-14 -left-3 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow hidden lg:flex"
          style={{ zIndex: 10 }}
        >
          <ChevronDown className={cn('w-3 h-3 text-gray-500 transition-transform', sidebarOpen ? 'rotate-90' : '-rotate-90')} />
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 w-72 bg-white shadow-2xl z-50 lg:hidden flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-2 mr-auto">
            <NotificationBell />
            <span className="text-sm font-bold text-gray-700 hidden sm:block">{user?.full_name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">خروج</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
