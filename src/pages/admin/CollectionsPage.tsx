import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { formatCurrency } from '@/utils/helpers'
import { DollarSign, CheckCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Collection {
  id: string
  courier_id: string
  shipment_id: string
  amount: number
  collected_at: string
  is_transferred: boolean
  transferred_at: string | null
  notes: string | null
  courier?: { name: string; phone: string }
  shipment?: { tracking_number: string; recipient_name: string }
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCourier, setFilterCourier] = useState('')
  const [filterTransferred, setFilterTransferred] = useState('')
  const [couriers, setCouriers] = useState<{ id: string; name: string }[]>([])
  const [stats, setStats] = useState({
    totalAmount: 0,
    transferredAmount: 0,
    pendingAmount: 0,
    totalCount: 0,
  })
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    supabase.from('couriers').select('id, name').eq('status', 'active').order('name').then(({ data }) => setCouriers(data || []))
    loadCollections()
  }, [])

  const loadCollections = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('courier_collections')
        .select('*, courier:couriers(name, phone), shipment:shipments(tracking_number, recipient_name)')
        .order('collected_at', { ascending: false })
        .limit(100)

      if (filterCourier) query = query.eq('courier_id', filterCourier)
      if (filterTransferred === 'yes') query = query.eq('is_transferred', true)
      if (filterTransferred === 'no') query = query.eq('is_transferred', false)

      const { data } = await query
      const cols = (data as Collection[]) || []
      setCollections(cols)

      const totalAmount = cols.reduce((sum, c) => sum + c.amount, 0)
      const transferredAmount = cols.filter(c => c.is_transferred).reduce((sum, c) => sum + c.amount, 0)
      const pendingAmount = cols.filter(c => !c.is_transferred).reduce((sum, c) => sum + c.amount, 0)

      setStats({
        totalAmount,
        transferredAmount,
        pendingAmount,
        totalCount: cols.length,
      })
    } finally {
      setLoading(false)
    }
  }, [filterCourier, filterTransferred])

  useEffect(() => { loadCollections() }, [loadCollections])

  async function markAsTransferred(id: string) {
    const { error } = await supabase
      .from('courier_collections')
      .update({ is_transferred: true, transferred_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('فشل تحديث الحالة')
    } else {
      toast.success('تم تسجيل التحويل')
      loadCollections()
    }
  }

  async function markAllPendingTransferred(courierId: string) {
    setMarkingAll(true)
    try {
      const { error } = await supabase
        .from('courier_collections')
        .update({ is_transferred: true, transferred_at: new Date().toISOString() })
        .eq('courier_id', courierId)
        .eq('is_transferred', false)

      if (error) throw error
      toast.success('تم تسجيل تسليم جميع التحصيلات المعلقة')
      loadCollections()
    } catch {
      toast.error('فشل التحديث')
    } finally {
      setMarkingAll(false)
    }
  }

  // Group pending by courier
  const pendingByCourier = collections
    .filter(c => !c.is_transferred)
    .reduce((acc: Record<string, { courierId: string; name: string; phone: string; amount: number; count: number }>, c) => {
      const name = (c.courier as any)?.name || c.courier_id
      const phone = (c.courier as any)?.phone || ''
      if (!acc[c.courier_id]) {
        acc[c.courier_id] = { courierId: c.courier_id, name, phone, amount: 0, count: 0 }
      }
      acc[c.courier_id].amount += c.amount
      acc[c.courier_id].count++
      return acc
    }, {})

  const pendingCouriers = Object.values(pendingByCourier)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">تحصيلات المناديب</h1>
          <p className="text-gray-500 text-sm">متابعة وتسجيل مبالغ COD المحصَّلة</p>
        </div>
        <Button variant="secondary" onClick={loadCollections} icon={<RefreshCw className="w-4 h-4" />}>
          تحديث
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="إجمالي التحصيلات" value={formatCurrency(stats.totalAmount)} icon={<DollarSign className="w-5 h-5 text-blue-600" />} color="blue" />
        <StatCard title="تم التحويل" value={formatCurrency(stats.transferredAmount)} icon={<CheckCircle className="w-5 h-5 text-green-600" />} color="green" />
        <StatCard title="لم يُحوَّل بعد" value={formatCurrency(stats.pendingAmount)} icon={<Clock className="w-5 h-5 text-yellow-600" />} color="yellow" />
        <StatCard title="عدد العمليات" value={stats.totalCount.toString()} icon={<DollarSign className="w-5 h-5 text-purple-600" />} color="purple" />
      </div>

      {/* Pending Couriers Alert */}
      {pendingCouriers.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <h3 className="font-bold text-orange-800">مناديب لديهم مبالغ لم تُحوَّل</h3>
          </div>
          <div className="space-y-2">
            {pendingCouriers.map(c => (
              <div key={c.courierId} className="flex items-center justify-between bg-white rounded-xl p-3">
                <div>
                  <p className="font-bold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.phone} — {c.count} تحصيل</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-black text-orange-600 text-lg">{formatCurrency(c.amount)}</p>
                  <Button
                    size="sm"
                    onClick={() => markAllPendingTransferred(c.courierId)}
                    loading={markingAll}
                  >
                    تسجيل تسليم الكل
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select
              options={[{ value: '', label: 'كل المناديب' }, ...couriers.map(c => ({ value: c.id, label: c.name }))]}
              value={filterCourier}
              onChange={e => setFilterCourier(e.target.value)}
              placeholder="كل المناديب"
            />
          </div>
          <div className="sm:w-44">
            <Select
              options={[
                { value: '', label: 'كل الحالات' },
                { value: 'no', label: 'لم يُحوَّل' },
                { value: 'yes', label: 'تم التحويل' },
              ]}
              value={filterTransferred}
              onChange={e => setFilterTransferred(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">المندوب</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الشحنة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">المبلغ</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">تاريخ التحصيل</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  جارٍ التحميل...
                </td></tr>
              ) : collections.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  لا توجد تحصيلات
                </td></tr>
              ) : collections.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{(c.courier as any)?.name || '-'}</p>
                    <p className="text-xs text-gray-400">{(c.courier as any)?.phone || ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-mono text-blue-600">{(c.shipment as any)?.tracking_number || '-'}</p>
                    <p className="text-sm text-gray-700">{(c.shipment as any)?.recipient_name || ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-green-700">{formatCurrency(c.amount)}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(c.collected_at).toLocaleDateString('ar-EG', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.is_transferred ? 'success' : 'warning'}>
                      {c.is_transferred ? 'تم التحويل' : 'لم يُحوَّل'}
                    </Badge>
                    {c.transferred_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(c.transferred_at).toLocaleDateString('ar-EG')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!c.is_transferred && (
                      <button
                        onClick={() => markAsTransferred(c.id)}
                        className="px-3 py-1 rounded-lg text-xs bg-green-50 text-green-700 hover:bg-green-100 font-medium"
                      >
                        تسجيل تسليم
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
