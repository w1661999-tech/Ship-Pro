import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card, StatCard } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/helpers'
import { Link } from 'react-router-dom'
import { Package, DollarSign, CheckCircle, Clock, ArrowRight, Plus, TrendingUp } from 'lucide-react'

interface Stats {
  total: number
  delivered: number
  pending: number
  returned: number
  balance: number
  pendingSettlement: number
  cod: number
  deliveryRate: number
}

export default function MerchantDashboard() {
  const { user } = useAuthStore()
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({ total: 0, delivered: 0, pending: 0, returned: 0, balance: 0, pendingSettlement: 0, cod: 0, deliveryRate: 0 })
  const [recentShipments, setRecentShipments] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadMerchantData()
  }, [user])

  async function loadMerchantData() {
    if (!user) return

    // Find merchant by user_id
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!merchant) {
      setLoading(false)
      return
    }

    setMerchantId(merchant.id)

    // Single high-perf RPC instead of 5 round-trips
    const [{ data: rpcStats }, { data: recent }] = await Promise.all([
      supabase.rpc('merchant_dashboard_stats', { p_merchant_id: merchant.id }),
      supabase.from('shipments').select('*, courier:couriers(name)').eq('merchant_id', merchant.id).order('created_at', { ascending: false }).limit(6),
    ])

    const s = (rpcStats || {}) as any
    const total = Number(s.total_shipments || 0)
    const delivered = Number(s.delivered || 0)
    const deliveryRate = total ? Math.round((delivered / total) * 100) : 0

    setStats({
      total,
      delivered,
      pending: Number(s.pending || 0) + Number(s.in_transit || 0),
      returned: Number(s.returned || 0),
      balance: Number(s.balance || 0),
      pendingSettlement: Number(s.pending_settlement || 0),
      cod: Number(s.total_cod || 0),
      deliveryRate,
    })
    setRecentShipments(recent || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full w-8 h-8 border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!merchantId) {
    return (
      <div className="text-center py-16">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-600">لم يتم ربط حسابك بتاجر</h2>
        <p className="text-gray-400 text-sm mt-1">تواصل مع الإدارة لإكمال التسجيل</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">مرحباً، {user?.full_name} 👋</h1>
          <p className="text-gray-500 text-sm">نظرة عامة على نشاطك</p>
        </div>
        <Link to="/merchant/add-shipment">
          <Button icon={<Plus className="w-4 h-4" />}>إضافة شحنة جديدة</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="إجمالي الشحنات" value={stats.total} icon={<Package className="w-6 h-6 text-blue-600" />} color="blue" />
        <StatCard title="تم التسليم" value={stats.delivered} icon={<CheckCircle className="w-6 h-6 text-green-600" />} color="green" />
        <StatCard title="جارٍ التوصيل" value={stats.pending} icon={<Clock className="w-6 h-6 text-yellow-600" />} color="yellow" />
        <StatCard title="معدل التسليم" value={`${stats.deliveryRate}%`} icon={<TrendingUp className="w-6 h-6 text-purple-600" />} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
          <p className="text-green-100 text-sm">الرصيد المتاح</p>
          <p className="text-3xl font-black mt-1">{formatCurrency(stats.balance)}</p>
          <Link to="/merchant/finance" className="mt-3 inline-flex items-center gap-1 text-sm text-green-100 hover:text-white">
            طلب تسوية <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <p className="text-blue-100 text-sm">COD المحصَّل</p>
          <p className="text-3xl font-black mt-1">{formatCurrency(stats.cod)}</p>
          <p className="text-xs text-blue-200 mt-2">إجمالي مبالغ الاستلام</p>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0">
          <p className="text-orange-100 text-sm">قيد التسوية</p>
          <p className="text-3xl font-black mt-1">{formatCurrency(stats.pendingSettlement)}</p>
          <p className="text-xs text-orange-200 mt-2">مبالغ في انتظار الصرف</p>
        </Card>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">آخر الشحنات</h3>
          <Link to="/merchant/shipments" className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
            عرض الكل <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentShipments.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <p>لا توجد شحنات بعد</p>
              <Link to="/merchant/add-shipment" className="mt-2 text-green-600 text-sm hover:underline">
                أضف شحنتك الأولى
              </Link>
            </div>
          ) : (recentShipments as Array<{ id: string; tracking_number: string; recipient_name: string; recipient_address: string; status: string; cod_amount: number; courier?: { name?: string } }>).map(s => (
            <div key={s.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-mono text-blue-600">{s.tracking_number}</p>
                <p className="text-sm font-medium text-gray-800">{s.recipient_name}</p>
                <p className="text-xs text-gray-400">{s.recipient_address}</p>
              </div>
              <div className="text-left">
                <StatusBadge status={s.status as never} />
                {s.cod_amount > 0 && (
                  <p className="text-xs text-green-600 font-semibold mt-1">{formatCurrency(s.cod_amount)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
