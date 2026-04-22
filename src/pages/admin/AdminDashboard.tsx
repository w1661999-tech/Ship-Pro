import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, StatCard } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCurrency, SHIPMENT_STATUS_LABELS } from '@/utils/helpers'
import {
  Package, TruckIcon, Users, DollarSign, CheckCircle,
  Clock, ArrowLeft, RefreshCw, TrendingUp,
  ShoppingBag, BarChart2, Activity, AlertCircle, Layers, FileText, Wallet
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

interface DashboardStats {
  totalShipments: number
  deliveredToday: number
  deliveredTotal: number
  pendingShipments: number
  activeDrivers: number
  totalMerchants: number
  todayRevenue: number
  totalRevenue: number
  totalCOD: number
  overallDeliveryRate: number
  inTransitCount: number
  returnedCount: number
}

interface FinancialTransaction {
  id: string
  type: string
  amount: number
  description: string | null
  status: string
  created_at: string
}

interface ChartData {
  name: string
  شحنات: number
  مُسلَّمة: number
}

const STATUS_COLORS_PIE: Record<string, string> = {
  pending: '#f59e0b',
  assigned: '#3b82f6',
  picked_up: '#6366f1',
  in_transit: '#8b5cf6',
  out_for_delivery: '#f97316',
  delivered: '#22c55e',
  postponed: '#6b7280',
  refused: '#ef4444',
  returned: '#ec4899',
  cancelled: '#64748b',
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalShipments: 0, deliveredToday: 0, deliveredTotal: 0, pendingShipments: 0,
    activeDrivers: 0, totalMerchants: 0, todayRevenue: 0, totalRevenue: 0,
    totalCOD: 0, overallDeliveryRate: 0, inTransitCount: 0, returnedCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [statusDistribution, setStatusDistribution] = useState<{ name: string; value: number; color: string }[]>([])
  const [recentShipments, setRecentShipments] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<FinancialTransaction[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString()

      const [
        { count: total },
        { count: deliveredToday },
        { count: deliveredTotal },
        { count: pending },
        { count: inTransit },
        { count: returned },
        { count: activeDrivers },
        { count: totalMerchants },
        { data: codData },
        { data: revenueData },
        { data: recent },
        { data: allShipments },
        { data: transactions },
      ] = await Promise.all([
        supabase.from('shipments').select('*', { count: 'exact', head: true }),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).eq('status', 'delivered').gte('delivered_at', todayStr),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).in('status', ['pending', 'assigned']),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).in('status', ['picked_up', 'in_transit', 'out_for_delivery']),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).in('status', ['returned', 'refused']),
        supabase.from('couriers').select('*', { count: 'exact', head: true }).in('status', ['active', 'on_delivery']),
        supabase.from('merchants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('shipments').select('cod_amount').eq('status', 'delivered'),
        supabase.from('shipments').select('delivery_fee, created_at'),
        supabase.from('shipments').select('*, merchant:merchants(store_name), courier:couriers(name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('shipments').select('status, delivery_fee, created_at'),
        supabase.from('financial_transactions').select('id, type, amount, description, status, created_at').order('created_at', { ascending: false }).limit(8),
      ])
      setRecentTransactions(transactions || [])

      const totalCOD = (codData || []).reduce((sum: number, s: any) => sum + (s.cod_amount || 0), 0)
      const todayRevenue = (revenueData || [])
        .filter((s: any) => s.created_at >= todayStr)
        .reduce((sum: number, s: any) => sum + (s.delivery_fee || 0), 0)
      const totalRevenue = (revenueData || [])
        .reduce((sum: number, s: any) => sum + (s.delivery_fee || 0), 0)

      const overallDeliveryRate = total && (total as number) > 0
        ? Math.round(((deliveredTotal || 0) / (total as number)) * 100)
        : 0

      setStats({
        totalShipments: total || 0,
        deliveredToday: deliveredToday || 0,
        deliveredTotal: deliveredTotal || 0,
        pendingShipments: pending || 0,
        inTransitCount: inTransit || 0,
        returnedCount: returned || 0,
        activeDrivers: activeDrivers || 0,
        totalMerchants: totalMerchants || 0,
        todayRevenue,
        totalRevenue,
        totalCOD,
        overallDeliveryRate,
      })

      // Status distribution pie chart
      const statusCounts: Record<string, number> = {}
      ;(allShipments || []).forEach((s: any) => {
        statusCounts[s.status] = (statusCounts[s.status] || 0) + 1
      })
      const distribution = Object.entries(statusCounts)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => ({
          name: SHIPMENT_STATUS_LABELS[k] || k,
          value: v,
          color: STATUS_COLORS_PIE[k] || '#6b7280',
        }))
      setStatusDistribution(distribution)

      // 7-day chart
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dayStr = d.toLocaleDateString('ar-EG', { weekday: 'short' })
        const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999)
        const dayS = dayStart.toISOString()
        const dayE = dayEnd.toISOString()
        const dayShipments = (allShipments || []).filter((s: any) => s.created_at >= dayS && s.created_at <= dayE).length
        const dayDelivered = (allShipments || []).filter((s: any) => s.status === 'delivered' && s.created_at >= dayS && s.created_at <= dayE).length
        days.push({ name: dayStr, 'شحنات': dayShipments, 'مُسلَّمة': dayDelivered })
      }
      setChartData(days)
      setRecentShipments(recent || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const statCards1 = [
    { title: 'إجمالي الشحنات', value: stats.totalShipments.toLocaleString('ar-EG'), icon: <Package className="w-5 h-5 text-blue-600" />, color: 'blue' as const },
    { title: 'تم التسليم اليوم', value: stats.deliveredToday.toLocaleString('ar-EG'), icon: <CheckCircle className="w-5 h-5 text-green-600" />, color: 'green' as const },
    { title: 'في الانتظار والتعيين', value: stats.pendingShipments.toLocaleString('ar-EG'), icon: <Clock className="w-5 h-5 text-yellow-600" />, color: 'yellow' as const },
    { title: 'في الطريق / خارج', value: stats.inTransitCount.toLocaleString('ar-EG'), icon: <TruckIcon className="w-5 h-5 text-purple-600" />, color: 'purple' as const },
  ]

  const statCards2 = [
    { title: 'معدل التسليم الكلي', value: `${stats.overallDeliveryRate}%`, icon: <BarChart2 className="w-5 h-5 text-blue-600" />, color: 'blue' as const, trend: stats.overallDeliveryRate > 50 ? { value: stats.overallDeliveryRate, label: 'تسليم ناجح' } : undefined },
    { title: 'إيرادات اليوم', value: formatCurrency(stats.todayRevenue), icon: <DollarSign className="w-5 h-5 text-green-600" />, color: 'green' as const },
    { title: 'إجمالي COD المحصَّل', value: formatCurrency(stats.totalCOD), icon: <TrendingUp className="w-5 h-5 text-orange-600" />, color: 'orange' as const },
    { title: 'مُرتجَعة / مرفوضة', value: stats.returnedCount.toLocaleString('ar-EG'), icon: <AlertCircle className="w-5 h-5 text-red-600" />, color: 'red' as const },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">لوحة التحكم</h1>
          <p className="text-gray-500 text-sm">
            {lastUpdated
              ? `آخر تحديث: ${lastUpdated.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
              : 'نظرة عامة على نظام الشحن'}
          </p>
        </div>
        <button
          onClick={loadDashboard}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Alert: High Return Rate */}
      {!loading && stats.totalShipments > 0 && stats.returnedCount / stats.totalShipments > 0.15 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-700 text-sm">تنبيه: معدل الإرجاع مرتفع</p>
            <p className="text-xs text-red-600">
              نسبة الإرجاع/الرفض {Math.round((stats.returnedCount / stats.totalShipments) * 100)}% — يُنصح بمراجعة أسباب الإرجاع
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards1.map((card, i) => (
          loading ? (
            <Card key={i}>
              <Skeleton className="h-4 w-3/4 mb-3" />
              <Skeleton className="h-8 w-1/2" />
            </Card>
          ) : (
            <StatCard key={card.title} {...card} />
          )
        ))}
      </div>

      {/* Stats Grid Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards2.map((card, i) => (
          loading ? (
            <Card key={i}>
              <Skeleton className="h-4 w-3/4 mb-3" />
              <Skeleton className="h-8 w-1/2" />
            </Card>
          ) : (
            <StatCard key={card.title} {...card} />
          )
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Area Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">الشحنات خلال 7 أيام</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> شحنات</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> مُسلَّمة</span>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : chartData.every(d => d['شحنات'] === 0) ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400">
              <Layers className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">لا توجد شحنات في آخر 7 أيام</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorShipments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontFamily: 'Cairo, sans-serif', fontSize: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Area type="monotone" dataKey="شحنات" stroke="#3b82f6" fill="url(#colorShipments)" strokeWidth={2} />
                <Area type="monotone" dataKey="مُسلَّمة" stroke="#22c55e" fill="url(#colorDelivered)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Pie Chart */}
        <Card>
          <h3 className="font-bold text-gray-800 mb-4">توزيع الحالات</h3>
          {loading ? (
            <Skeleton className="h-40 w-full rounded-full" />
          ) : statusDistribution.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-gray-400">
              <p className="text-sm">لا توجد بيانات بعد</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {statusDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontFamily: 'Cairo, sans-serif', fontSize: '11px', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="space-y-1.5 mt-1">
            {statusDistribution.slice(0, 6).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-800">{item.value}</span>
                  <span className="text-gray-400">
                    ({stats.totalShipments > 0 ? Math.round((item.value / stats.totalShipments) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Shipments */}
        <Card padding="none" className="lg:col-span-2">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <h3 className="font-bold text-gray-800">آخر الشحنات</h3>
            </div>
            <Link to="/admin/shipments" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-20 h-4" />
                  <Skeleton className="flex-1 h-4" />
                  <Skeleton className="w-16 h-4" />
                </div>
              ))}
            </div>
          ) : recentShipments.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد شحنات بعد</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentShipments.map((s: any) => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <span className="text-xs font-mono text-blue-600 w-24 flex-shrink-0">{s.tracking_number}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.recipient_name}</p>
                    <p className="text-xs text-gray-400 truncate">{s.recipient_address}</p>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <StatusBadge status={s.status} />
                    {s.cod_amount > 0 && (
                      <p className="text-xs text-green-600 font-semibold mt-0.5 text-left">{formatCurrency(s.cod_amount)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Links */}
        <Card>
          <h3 className="font-bold text-gray-800 mb-4">روابط سريعة</h3>
          <div className="space-y-1.5">
            {[
              { to: '/admin/shipments', label: 'إدارة الشحنات', sub: `${stats.totalShipments.toLocaleString('ar-EG')} شحنة`, icon: Package, color: 'blue' },
              { to: '/admin/couriers', label: 'المناديب', sub: `${stats.activeDrivers} نشط`, icon: TruckIcon, color: 'purple' },
              { to: '/admin/merchants', label: 'التجار', sub: `${stats.totalMerchants} تاجر`, icon: Users, color: 'orange' },
              { to: '/admin/finance', label: 'المالية والتسويات', sub: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'green' },
              { to: '/admin/pricing', label: 'المناطق والتسعير', sub: 'إدارة الأسعار', icon: ShoppingBag, color: 'yellow' },
              { to: '/admin/import', label: 'استيراد الشحنات', sub: 'CSV / Excel', icon: FileText, color: 'gray' },
            ].map(({ to, label, sub, icon: Icon, color }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${color}-100 flex-shrink-0`}>
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
                <ArrowLeft className="w-3 h-3 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Financial Transactions */}
      {recentTransactions.length > 0 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-green-500" />
              <h3 className="font-bold text-gray-800">آخر المعاملات المالية</h3>
            </div>
            <Link to="/admin/finance" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentTransactions.map((tx) => {
              const typeLabels: Record<string, { label: string; color: string }> = {
                cod_collected:       { label: 'COD محصَّل',         color: 'text-green-600 bg-green-50' },
                merchant_settlement: { label: 'تسوية تاجر',         color: 'text-blue-600 bg-blue-50' },
                courier_salary:      { label: 'راتب مندوب',         color: 'text-purple-600 bg-purple-50' },
                return_fee:          { label: 'رسوم إرجاع',         color: 'text-red-600 bg-red-50' },
                delivery_fee:        { label: 'رسوم توصيل',         color: 'text-indigo-600 bg-indigo-50' },
                cod_transfer:        { label: 'تحويل COD',           color: 'text-orange-600 bg-orange-50' },
              }
              const typeInfo = typeLabels[tx.type] || { label: tx.type, color: 'text-gray-600 bg-gray-50' }
              return (
                <div key={tx.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 truncate">{tx.description || '—'}</p>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(tx.amount)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
