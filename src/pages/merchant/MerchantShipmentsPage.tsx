import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card, StatCard } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Table'
import { formatCurrency, SHIPMENT_STATUS_LABELS } from '@/utils/helpers'
import { Package, Search, RefreshCw, Download, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react'
import type { Shipment } from '@/types/database'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20

const STATUS_QUICK_FILTERS = [
  { key: '', label: 'الكل', color: 'gray' },
  { key: 'pending', label: 'انتظار', color: 'yellow' },
  { key: 'assigned', label: 'معيَّن', color: 'blue' },
  { key: 'picked_up', label: 'استُلم', color: 'indigo' },
  { key: 'in_transit', label: 'في الطريق', color: 'purple' },
  { key: 'out_for_delivery', label: 'خارج', color: 'orange' },
  { key: 'delivered', label: 'مُسلَّم', color: 'green' },
  { key: 'returned', label: 'مُرتجَع', color: 'red' },
  { key: 'postponed', label: 'مؤجَّل', color: 'gray' },
]

export default function MerchantShipmentsPage() {
  const { user } = useAuthStore()
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stats, setStats] = useState({ total: 0, delivered: 0, pending: 0, returned: 0, totalCOD: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('merchants').select('id').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setMerchantId(data.id)
        loadStats(data.id)
      }
    })
  }, [user])

  async function loadStats(mId: string) {
    setLoadingStats(true)
    try {
      const [
        { count: total },
        { count: delivered },
        { count: pending },
        { count: returned },
        { data: codData },
      ] = await Promise.all([
        supabase.from('shipments').select('*', { count: 'exact', head: true }).eq('merchant_id', mId),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).eq('merchant_id', mId).eq('status', 'delivered'),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).eq('merchant_id', mId).in('status', ['pending', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery']),
        supabase.from('shipments').select('*', { count: 'exact', head: true }).eq('merchant_id', mId).in('status', ['returned', 'refused']),
        supabase.from('shipments').select('cod_amount').eq('merchant_id', mId).eq('status', 'delivered'),
      ])
      const totalCOD = (codData || []).reduce((s: number, r: any) => s + (r.cod_amount || 0), 0)
      setStats({ total: total || 0, delivered: delivered || 0, pending: pending || 0, returned: returned || 0, totalCOD })
    } finally {
      setLoadingStats(false)
    }
  }

  const load = useCallback(async () => {
    if (!merchantId) return
    setLoading(true)
    try {
      let query = supabase
        .from('shipments')
        .select('*, courier:couriers(name), zone:zones(name)', { count: 'exact' })
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (search.trim()) {
        query = query.or(
          `tracking_number.ilike.%${search.trim()}%,recipient_name.ilike.%${search.trim()}%,recipient_phone.ilike.%${search.trim()}%`
        )
      }
      if (statusFilter) query = query.eq('status', statusFilter)

      const { data, count } = await query
      setShipments(data as Shipment[] || [])
      setTotal(count || 0)
    } finally {
      setLoading(false)
    }
  }, [merchantId, page, search, statusFilter])

  useEffect(() => { load() }, [load])

  async function handleExport() {
    if (!merchantId) return
    setExporting(true)
    try {
      let query = supabase
        .from('shipments')
        .select('tracking_number, recipient_name, recipient_phone, recipient_address, status, cod_amount, delivery_fee, created_at, zone:zones(name), courier:couriers(name)')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })

      if (statusFilter) query = query.eq('status', statusFilter)
      if (search.trim()) query = query.or(`tracking_number.ilike.%${search.trim()}%,recipient_name.ilike.%${search.trim()}%`)

      const { data } = await query
      if (!data || data.length === 0) { toast.error('لا توجد بيانات للتصدير'); return }

      const headers = ['رقم التتبع', 'المستلم', 'الهاتف', 'العنوان', 'المنطقة', 'المندوب', 'الحالة', 'COD', 'رسوم الشحن', 'التاريخ']
      const rows = data.map((s: any) => [
        s.tracking_number,
        s.recipient_name,
        s.recipient_phone,
        s.recipient_address,
        s.zone?.name || '',
        s.courier?.name || '',
        SHIPMENT_STATUS_LABELS[s.status] || s.status,
        s.cod_amount,
        s.delivery_fee,
        new Date(s.created_at).toLocaleDateString('ar-EG'),
      ])

      const csv = '\uFEFF' + [headers, ...rows].map(r => r.map((v: any) => `"${v}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shipments_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`تم تصدير ${data.length} شحنة`)
    } catch {
      toast.error('فشل التصدير')
    } finally {
      setExporting(false)
    }
  }

  const deliveryRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">شحناتي</h1>
          <p className="text-gray-500 text-sm">إجمالي {stats.total.toLocaleString('ar-EG')} شحنة</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { load(); if (merchantId) loadStats(merchantId) }}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            تحديث
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            loading={exporting}
            icon={<Download className="w-4 h-4" />}
          >
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><div className="animate-pulse h-12 bg-gray-100 rounded" /></Card>
          ))
        ) : (
          <>
            <StatCard title="مُسلَّمة" value={stats.delivered.toLocaleString('ar-EG')} icon={<CheckCircle className="w-5 h-5 text-green-600" />} color="green" />
            <StatCard title="قيد التوصيل" value={stats.pending.toLocaleString('ar-EG')} icon={<Clock className="w-5 h-5 text-yellow-600" />} color="yellow" />
            <StatCard title="مُرتجَعة/مرفوضة" value={stats.returned.toLocaleString('ar-EG')} icon={<AlertCircle className="w-5 h-5 text-red-600" />} color="red" />
            <StatCard title="COD المحصَّل" value={formatCurrency(stats.totalCOD)} icon={<TrendingUp className="w-5 h-5 text-blue-600" />} color="blue" trend={{ value: deliveryRate, label: 'نسبة التسليم' }} />
          </>
        )}
      </div>

      {/* Filters */}
      <Card>
        <div className="space-y-3">
          {/* Quick Status Filters */}
          <div className="flex gap-2 flex-wrap">
            {STATUS_QUICK_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setPage(1) }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === f.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="بحث برقم التتبع أو اسم أو هاتف المستلم..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                rightIcon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-sm">
            {loading ? 'جارٍ التحميل...' : `${total.toLocaleString('ar-EG')} نتيجة`}
          </h3>
          {total > 0 && (
            <span className="text-xs text-gray-400">
              صفحة {page} من {Math.ceil(total / PAGE_SIZE)}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">رقم التتبع</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">المستلم</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 hidden md:table-cell">المنطقة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 hidden lg:table-cell">المندوب</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">COD</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 hidden sm:table-cell">رسوم الشحن</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 hidden sm:table-cell">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="animate-pulse h-3 bg-gray-200 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : shipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">لا توجد شحنات</p>
                    {search && <p className="text-sm">جرب كلمة بحث مختلفة</p>}
                  </td>
                </tr>
              ) : (
                shipments.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-blue-600 font-bold">{s.tracking_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{s.recipient_name}</p>
                      <p className="text-xs text-gray-400" dir="ltr">{s.recipient_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                      {(s.zone as { name?: string })?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell">
                      {(s.courier as { name?: string })?.name || (
                        <span className="text-yellow-600 text-xs">غير معيَّن</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-700">
                      {s.cod_amount > 0 ? formatCurrency(s.cod_amount) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                      {formatCurrency(s.delivery_fee)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden sm:table-cell">
                      {new Date(s.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > PAGE_SIZE && (
          <div className="p-4 border-t border-gray-100">
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={p => { setPage(p); window.scrollTo(0, 0) }} />
          </div>
        )}
      </Card>
    </div>
  )
}
