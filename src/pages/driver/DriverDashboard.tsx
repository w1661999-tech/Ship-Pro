import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card, StatCard } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/helpers'
import { Link } from 'react-router-dom'
import {
  Package, DollarSign, CheckCircle, Clock,
  ArrowLeft, MapPin, Phone, RefreshCw
} from 'lucide-react'

export default function DriverDashboard() {
  const { user } = useAuthStore()
  const [courierId, setCourierId] = useState<string | null>(null)
  const [courierData, setCourierData] = useState<any>(null)
  const [stats, setStats] = useState({
    activeShipments: 0,
    deliveredToday: 0,
    totalDelivered: 0,
    pendingCOD: 0,
    totalCOD: 0,
  })
  const [recentShipments, setRecentShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)

    try {
      const { data: courier } = await supabase
        .from('couriers')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!courier) {
        setLoading(false)
        return
      }

      setCourierId(courier.id)
      setCourierData(courier)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString()

      const [
        { count: active },
        { count: deliveredToday },
        { data: collections },
        { data: recent },
      ] = await Promise.all([
        supabase.from('shipments').select('*', { count: 'exact', head: true })
          .eq('courier_id', courier.id)
          .in('status', ['assigned', 'picked_up', 'in_transit', 'out_for_delivery']),
        supabase.from('shipments').select('*', { count: 'exact', head: true })
          .eq('courier_id', courier.id)
          .eq('status', 'delivered')
          .gte('delivered_at', todayStr),
        supabase.from('courier_collections').select('amount, is_transferred')
          .eq('courier_id', courier.id),
        supabase.from('shipments').select('*, merchant:merchants(store_name)')
          .eq('courier_id', courier.id)
          .in('status', ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'])
          .order('assigned_at', { ascending: false })
          .limit(5),
      ])

      const totalCOD = (collections || []).reduce((sum: number, c: any) => sum + c.amount, 0)
      const pendingCOD = (collections || [])
        .filter((c: any) => !c.is_transferred)
        .reduce((sum: number, c: any) => sum + c.amount, 0)

      setStats({
        activeShipments: active || 0,
        deliveredToday: deliveredToday || 0,
        totalDelivered: courier.total_deliveries || 0,
        pendingCOD,
        totalCOD,
      })
      setRecentShipments(recent || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!courierId) {
    return (
      <div className="text-center py-16">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-600">لم يتم ربط حسابك بمندوب</h2>
        <p className="text-gray-400 text-sm mt-1">تواصل مع الإدارة لإكمال التسجيل</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">مرحباً</p>
            <h1 className="text-xl font-black">{user?.full_name}</h1>
            <p className="text-orange-100 text-sm mt-0.5">{courierData?.vehicle_type && `مندوب | ${courierData.vehicle_type}`}</p>
          </div>
          <div className="text-left">
            <p className="text-orange-100 text-xs">نسبة النجاح</p>
            <p className="text-3xl font-black">{(courierData?.success_rate || 0).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="شحنات نشطة"
          value={stats.activeShipments.toString()}
          icon={<Clock className="w-5 h-5 text-orange-600" />}
          color="orange"
        />
        <StatCard
          title="تم التسليم اليوم"
          value={stats.deliveredToday.toString()}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          color="green"
        />
        <StatCard
          title="إجمالي توصيلاتك"
          value={stats.totalDelivered.toString()}
          icon={<Package className="w-5 h-5 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title="COD غير محوَّل"
          value={formatCurrency(stats.pendingCOD)}
          icon={<DollarSign className="w-5 h-5 text-red-600" />}
          color="red"
        />
      </div>

      {/* Pending COD Alert */}
      {stats.pendingCOD > 0 && (
        <Card className="bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-orange-800">مبالغ لم تُحوَّل للإدارة</p>
              <p className="text-2xl font-black text-orange-600">{formatCurrency(stats.pendingCOD)}</p>
            </div>
            <Link to="/driver/collections">
              <button className="text-xs bg-orange-500 text-white px-3 py-2 rounded-xl font-medium hover:bg-orange-600">
                عرض التحصيلات
              </button>
            </Link>
          </div>
        </Card>
      )}

      {/* Active Shipments */}
      <Card padding="none">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">الشحنات النشطة</h3>
          <Link to="/driver/shipments" className="text-xs text-orange-500 font-medium flex items-center gap-1">
            الكل <ArrowLeft className="w-3 h-3" />
          </Link>
        </div>
        {recentShipments.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا توجد شحنات نشطة</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentShipments.map((s: any) => (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-blue-600">{s.tracking_number}</span>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{s.recipient_name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{s.recipient_phone}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-xs text-gray-500 mt-0.5">
                      <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span className="truncate">{s.recipient_address}</span>
                    </div>
                  </div>
                  {s.cod_amount > 0 && (
                    <div className="text-left flex-shrink-0">
                      <p className="text-xs text-gray-400">COD</p>
                      <p className="font-bold text-green-600">{formatCurrency(s.cod_amount)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/driver/shipments">
          <Card hover className="text-center py-4">
            <Package className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-800">شحناتي</p>
            <p className="text-xs text-gray-400">{stats.activeShipments} نشطة</p>
          </Card>
        </Link>
        <Link to="/driver/collections">
          <Card hover className="text-center py-4">
            <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-800">التحصيلات</p>
            <p className="text-xs text-gray-400">{formatCurrency(stats.totalCOD)}</p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
