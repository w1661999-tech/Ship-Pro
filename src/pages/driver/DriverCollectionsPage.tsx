import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/helpers'
import { DollarSign, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import type { CourierCollection } from '@/types/database'
import toast from 'react-hot-toast'

export default function DriverCollectionsPage() {
  const { user } = useAuthStore()
  const [courierId, setCourierId] = useState<string | null>(null)
  const [collections, setCollections] = useState<CourierCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, transferred: 0, pending: 0 })

  useEffect(() => {
    if (!user) return
    supabase.from('couriers').select('id').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setCourierId(data.id)
    })
  }, [user])

  const load = useCallback(async () => {
    if (!courierId) return
    setLoading(true)
    const { data } = await supabase
      .from('courier_collections')
      .select('*, shipment:shipments(tracking_number, recipient_name, recipient_address, cod_amount)')
      .eq('courier_id', courierId)
      .order('collected_at', { ascending: false })

    const cols = (data as CourierCollection[]) || []
    setCollections(cols)

    const total = cols.reduce((sum, c) => sum + c.amount, 0)
    const transferred = cols.filter(c => c.is_transferred).reduce((sum, c) => sum + c.amount, 0)
    const pending = cols.filter(c => !c.is_transferred).reduce((sum, c) => sum + c.amount, 0)

    setStats({ total, transferred, pending })
    setLoading(false)
  }, [courierId])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">التحصيلات</h1>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="الإجمالي" value={formatCurrency(stats.total)} icon={<DollarSign className="w-5 h-5 text-green-600" />} color="green" />
        <StatCard title="تم التحويل" value={formatCurrency(stats.transferred)} icon={<CheckCircle className="w-5 h-5 text-blue-600" />} color="blue" />
        <StatCard title="في الانتظار" value={formatCurrency(stats.pending)} icon={<Clock className="w-5 h-5 text-yellow-600" />} color="yellow" />
      </div>

      {stats.pending > 0 && (
        <Card className="bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-orange-800">مبالغ لم تُحوَّل بعد</p>
              <p className="text-2xl font-black text-orange-600">{formatCurrency(stats.pending)}</p>
            </div>
            <DollarSign className="w-10 h-10 text-orange-300" />
          </div>
          <p className="text-xs text-orange-600 mt-2">يرجى تسليم هذه المبالغ للإدارة</p>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>لا توجد تحصيلات بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {collections.map(c => {
            const shipment = c.shipment as { tracking_number?: string; recipient_name?: string; recipient_address?: string }
            return (
              <Card key={c.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono text-blue-600">{shipment?.tracking_number}</p>
                    <p className="font-bold text-gray-900">{shipment?.recipient_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{shipment?.recipient_address}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(c.collected_at).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-black text-green-600">{formatCurrency(c.amount)}</p>
                    <Badge variant={c.is_transferred ? 'success' : 'warning'} className="mt-1">
                      {c.is_transferred ? 'تم التحويل' : 'لم يُحوَّل'}
                    </Badge>
                    {c.transferred_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(c.transferred_at).toLocaleDateString('ar-EG')}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
