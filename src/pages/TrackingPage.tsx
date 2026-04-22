import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, SHIPMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/utils/helpers'
import {
  Package, Search, Truck, MapPin, Phone, Clock, CheckCircle,
  Share2, Copy, ArrowRight, AlertCircle, Star, Shield, Zap,
  User, Calendar, Weight, CreditCard, MessageSquare, Hash, History
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'

interface TrackingResult {
  id: string
  tracking_number: string
  recipient_name: string
  recipient_phone: string
  recipient_phone2?: string | null
  recipient_address: string
  status: string
  cod_amount: number
  delivery_fee: number
  payment_method: string
  weight: number
  quantity: number
  is_fragile: boolean
  product_description: string | null
  recipient_notes: string | null
  created_at: string
  assigned_at: string | null
  picked_up_at: string | null
  delivered_at: string | null
  returned_at: string | null
  attempts: number
  zone: { name: string; name_en?: string } | null
  courier: { name: string; phone: string } | null
  merchant: { store_name: string } | null
}

interface StatusLog {
  id: string
  shipment_id: string
  from_status: string | null
  to_status: string
  notes: string | null
  created_at: string
}

const STATUS_TIMELINE = [
  { key: 'pending', label: 'في الانتظار', icon: Clock, desc: 'تم استلام طلبك' },
  { key: 'assigned', label: 'تم التعيين', icon: Truck, desc: 'تم تعيين مندوب' },
  { key: 'picked_up', label: 'تم الاستلام', icon: Package, desc: 'استلم المندوب الشحنة' },
  { key: 'in_transit', label: 'في الطريق', icon: Truck, desc: 'الشحنة في الطريق إليك' },
  { key: 'out_for_delivery', label: 'خارج للتوصيل', icon: MapPin, desc: 'المندوب في طريقه إليك' },
  { key: 'delivered', label: 'تم التسليم', icon: CheckCircle, desc: 'تم تسليم الشحنة بنجاح' },
]

const STATUS_ORDER = ['pending', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered']

const TERMINAL_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType; desc: string }> = {
  returned: { label: 'مُرتجَعة', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: ArrowRight, desc: 'تم إرجاع الشحنة إلى المرسل' },
  refused: { label: 'مرفوضة', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: AlertCircle, desc: 'رفض المستلم استلام الشحنة' },
  cancelled: { label: 'ملغاة', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', icon: AlertCircle, desc: 'تم إلغاء هذه الشحنة' },
  postponed: { label: 'مؤجلة', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: Clock, desc: 'تم تأجيل التوصيل - سيعاد المحاولة' },
}

function getStatusIndex(status: string): number {
  return STATUS_ORDER.indexOf(status)
}

function getTimestamp(result: TrackingResult, stepKey: string): string | null {
  const map: Record<string, string | null> = {
    pending: result.created_at,
    assigned: result.assigned_at,
    picked_up: result.picked_up_at,
    in_transit: result.picked_up_at,
    out_for_delivery: result.picked_up_at,
    delivered: result.delivered_at,
  }
  return map[stepKey] || null
}

export default function TrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [trackingNumber, setTrackingNumber] = useState(searchParams.get('id') || '')
  const [result, setResult] = useState<TrackingResult | null>(null)
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([])
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [searched, setSearched] = useState(false)

  // Auto-search if URL has tracking number
  useEffect(() => {
    const idParam = searchParams.get('id')
    if (idParam && idParam.trim()) {
      setTrackingNumber(idParam.toUpperCase())
      handleTrackById(idParam.toUpperCase())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleTrackById(number: string) {
    setLoading(true)
    setNotFound(false)
    setResult(null)
    setStatusLogs([])
    setSearched(true)
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*, zone:zones(name, name_en), courier:couriers(name, phone), merchant:merchants(store_name)')
        .eq('tracking_number', number)
        .single()
      if (error || !data) {
        setNotFound(true)
      } else {
        setResult(data as TrackingResult)
        // جلب سجل الحالات من shipment_status_logs
        const { data: logs } = await supabase
          .from('shipment_status_logs')
          .select('id, shipment_id, from_status, to_status, notes, created_at')
          .eq('shipment_id', data.id)
          .order('created_at', { ascending: false })
        setStatusLogs(logs || [])
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleTrack(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const number = trackingNumber.trim().toUpperCase()
    if (!number) return
    setSearchParams({ id: number })
    await handleTrackById(number)
  }

  function handleCopy() {
    navigator.clipboard.writeText(result?.tracking_number || trackingNumber)
    toast.success('تم نسخ رقم التتبع')
  }

  function handleShare() {
    const url = `${window.location.origin}/track?id=${result?.tracking_number || trackingNumber}`
    if (navigator.share) {
      navigator.share({ title: 'تتبع شحنتي', url })
    } else {
      navigator.clipboard.writeText(url)
      toast.success('تم نسخ رابط التتبع')
    }
  }

  const currentStatusIndex = result ? getStatusIndex(result.status) : -1
  const isTerminal = result ? ['returned', 'refused', 'cancelled', 'postponed'].includes(result.status) : false
  const terminalConfig = result && isTerminal ? TERMINAL_STATUS_CONFIG[result.status] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950" dir="rtl">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-white leading-none">Ship Pro</h1>
              <p className="text-xs text-blue-300/70">نظام الشحن الاحترافي</p>
            </div>
          </div>
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm text-blue-300 hover:text-white transition-colors font-medium"
          >
            تسجيل الدخول
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs font-medium px-3 py-1.5 rounded-full mb-5 border border-blue-500/30">
            <Zap className="w-3.5 h-3.5" />
            تتبع فوري ودقيق
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
            تتبع شحنتك
            <span className="text-blue-400"> الآن</span>
          </h2>
          <p className="text-blue-200/70 text-lg mb-8">أدخل رقم التتبع للاطلاع على الحالة الآنية لشحنتك</p>

          {/* Search Form */}
          <form onSubmit={handleTrack} className="flex gap-2 max-w-lg mx-auto">
            <div className="flex-1 relative">
              <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="مثال: SP1234567890123"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value.toUpperCase())}
                className="w-full bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-3.5 pr-10 text-white placeholder:text-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all font-mono text-base"
                dir="ltr"
                data-testid="tracking-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-5 py-3.5 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/30 whitespace-nowrap"
              data-testid="tracking-submit"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {loading ? 'جارٍ البحث...' : 'تتبع'}
            </button>
          </form>
        </div>
      </section>

      <main className="max-w-2xl mx-auto px-4 pb-16">
        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-3 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-blue-200/70">جارٍ البحث عن الشحنة...</p>
          </div>
        )}

        {/* Not Found */}
        {searched && notFound && !loading && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-5">
              <Package className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">الشحنة غير موجودة</h3>
            <p className="text-blue-200/50">
              رقم التتبع <span className="font-mono text-blue-300">"{trackingNumber}"</span> غير موجود في النظام
            </p>
            <p className="text-sm text-blue-200/40 mt-2">تأكد من الرقم وحاول مجدداً</p>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="space-y-4">
            {/* Main Status Card */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              {/* Top gradient bar */}
              <div className={`h-1.5 ${
                result.status === 'delivered' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                isTerminal ? 'bg-gradient-to-r from-red-400 to-rose-500' :
                'bg-gradient-to-r from-blue-500 to-indigo-500'
              }`} />

              {/* Header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-gray-400 font-medium">رقم التتبع</p>
                      <button onClick={handleCopy} className="text-gray-400 hover:text-blue-500 transition-colors" title="نسخ">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={handleShare} className="text-gray-400 hover:text-green-500 transition-colors" title="مشاركة">
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-2xl font-black text-gray-900 font-mono">{result.tracking_number}</p>
                    {result.merchant && (
                      <p className="text-sm text-gray-500 mt-0.5">من: {result.merchant.store_name}</p>
                    )}
                  </div>
                  <StatusBadge status={result.status} />
                </div>
              </div>

              {/* Timeline — Normal Status */}
              {!isTerminal && (
                <div className="p-5">
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute top-4 right-4 left-4 h-0.5 bg-gray-200 hidden sm:block" />
                    <div
                      className="absolute top-4 right-4 h-0.5 bg-gradient-to-l from-blue-500 to-green-500 hidden sm:block transition-all duration-700"
                      style={{ width: `${currentStatusIndex >= 0 ? (currentStatusIndex / (STATUS_TIMELINE.length - 1)) * 100 : 0}%` }}
                    />

                    <div className="flex items-start justify-between gap-1 relative">
                      {STATUS_TIMELINE.map((step, index) => {
                        const Icon = step.icon
                        const isCompleted = currentStatusIndex > index
                        const isCurrent = currentStatusIndex === index
                        const ts = getTimestamp(result, step.key)

                        return (
                          <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all z-10 ${
                              isCompleted
                                ? 'bg-green-500 border-green-500 shadow-md shadow-green-200'
                                : isCurrent
                                ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-200 ring-2 ring-blue-200'
                                : 'bg-white border-gray-200'
                            }`}>
                              <Icon className={`w-3.5 h-3.5 ${isCompleted || isCurrent ? 'text-white' : 'text-gray-300'}`} />
                            </div>
                            <span className={`text-xs font-medium text-center leading-tight ${
                              isCurrent ? 'text-blue-700 font-bold' : isCompleted ? 'text-green-700' : 'text-gray-400'
                            }`} style={{ maxWidth: '56px' }}>
                              {step.label}
                            </span>
                            {ts && (isCurrent || isCompleted) && (
                              <span className="text-[10px] text-gray-400 text-center" style={{ maxWidth: '56px' }}>
                                {new Date(ts).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Current status description */}
                  {currentStatusIndex >= 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-xl flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                      <p className="text-sm font-medium text-blue-700">{STATUS_TIMELINE[currentStatusIndex]?.desc}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Terminal Status */}
              {isTerminal && terminalConfig && (
                <div className={`m-4 p-4 rounded-xl border ${terminalConfig.bg}`}>
                  <div className="flex items-center gap-3">
                    <terminalConfig.icon className={`w-6 h-6 ${terminalConfig.color} flex-shrink-0`} />
                    <div>
                      <p className={`font-bold ${terminalConfig.color}`}>{terminalConfig.label}</p>
                      <p className={`text-sm ${terminalConfig.color} opacity-80`}>{terminalConfig.desc}</p>
                    </div>
                  </div>
                  {result.attempts > 0 && (
                    <p className="text-xs text-gray-500 mt-2">عدد محاولات التوصيل: {result.attempts}</p>
                  )}
                </div>
              )}
            </div>

            {/* Details Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                <h3 className="font-bold text-gray-800">تفاصيل الشحنة</h3>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailRow icon={<User className="w-4 h-4" />} label="المستلم" value={result.recipient_name} />
                <DetailRow icon={<Phone className="w-4 h-4" />} label="الهاتف" value={result.recipient_phone} dir="ltr" />
                {result.recipient_phone2 && (
                  <DetailRow icon={<Phone className="w-4 h-4" />} label="هاتف بديل" value={result.recipient_phone2} dir="ltr" />
                )}
                <DetailRow icon={<MapPin className="w-4 h-4" />} label="المنطقة" value={result.zone?.name || '-'} />
                <DetailRow icon={<Calendar className="w-4 h-4" />} label="تاريخ الإضافة" value={new Date(result.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })} />
                <DetailRow icon={<Weight className="w-4 h-4" />} label="الوزن" value={`${result.weight} كجم`} />
                {result.delivered_at && (
                  <DetailRow icon={<CheckCircle className="w-4 h-4 text-green-600" />} label="تاريخ التسليم" value={new Date(result.delivered_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })} />
                )}
                <DetailRow icon={<CreditCard className="w-4 h-4" />} label="طريقة الدفع" value={PAYMENT_METHOD_LABELS[result.payment_method] || result.payment_method} />
              </div>

              {/* Address */}
              <div className="px-5 pb-4">
                <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">العنوان</p>
                    <p className="text-sm font-medium text-gray-800">{result.recipient_address}</p>
                  </div>
                </div>
              </div>

              {/* Product */}
              {result.product_description && (
                <div className="px-5 pb-4">
                  <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                    <Package className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">محتوى الشحنة</p>
                      <p className="text-sm font-medium text-gray-800">{result.product_description}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fragile Warning */}
              {result.is_fragile && (
                <div className="px-5 pb-4">
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-amber-700">⚠️ شحنة قابلة للكسر - يُرجى التعامل بحرص</p>
                  </div>
                </div>
              )}
            </div>

            {/* COD Amount */}
            {result.cod_amount > 0 && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 shadow-lg shadow-green-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm mb-1">مبلغ الاستلام (COD)</p>
                    <p className="text-4xl font-black text-white">{formatCurrency(result.cod_amount)}</p>
                    <p className="text-green-200 text-xs mt-1">يُدفع نقداً عند الاستلام</p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            )}

            {/* Courier Info */}
            {result.courier && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-500" />
                  <h3 className="font-bold text-gray-800">معلومات المندوب</h3>
                </div>
                <div className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{result.courier.name}</p>
                    <a
                      href={`tel:${result.courier.phone}`}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 mt-0.5"
                      dir="ltr"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {result.courier.phone}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {result.recipient_notes && (
              <div className="bg-white rounded-2xl shadow-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-gray-800">ملاحظات التسليم</h3>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-sm text-amber-800">{result.recipient_notes}</p>
                </div>
              </div>
            )}

            {/* Status History Log */}
            {statusLogs.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-500" />
                  <h3 className="font-bold text-gray-800">سجل تحديثات الشحنة</h3>
                  <span className="mr-auto text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                    {statusLogs.length} تحديث
                  </span>
                </div>
                <div className="p-4">
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute right-4 top-2 bottom-2 w-0.5 bg-gray-200" />
                    <div className="space-y-3">
                      {statusLogs.map((log, idx) => {
                        const isFirst = idx === 0
                        const statusLabel = SHIPMENT_STATUS_LABELS[log.to_status] || log.to_status
                        const statusColorMap: Record<string, string> = {
                          delivered: 'bg-green-500',
                          in_transit: 'bg-blue-500',
                          out_for_delivery: 'bg-purple-500',
                          picked_up: 'bg-indigo-500',
                          assigned: 'bg-yellow-500',
                          pending: 'bg-gray-400',
                          returned: 'bg-red-500',
                          refused: 'bg-orange-500',
                          cancelled: 'bg-gray-500',
                          postponed: 'bg-amber-500',
                        }
                        const dotColor = statusColorMap[log.to_status] || 'bg-gray-400'
                        return (
                          <div key={log.id} className="flex items-start gap-4 pr-2">
                            <div className={`relative z-10 w-3 h-3 rounded-full flex-shrink-0 mt-1 ${dotColor} ${isFirst ? 'ring-2 ring-offset-1 ring-current' : ''}`} />
                            <div className={`flex-1 p-3 rounded-xl border ${isFirst ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <span className={`text-sm font-bold ${isFirst ? 'text-blue-700' : 'text-gray-700'}`}>
                                  {statusLabel}
                                </span>
                                <span className="text-xs text-gray-400 ltr">
                                  {new Date(log.created_at).toLocaleString('ar-EG', {
                                    month: 'short', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              {log.notes && (
                                <p className="text-xs text-gray-500 mt-1">{log.notes}</p>
                              )}
                              {log.from_status && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  من: {SHIPMENT_STATUS_LABELS[log.from_status] || log.from_status}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium py-3 rounded-xl transition-colors border border-white/20 backdrop-blur-sm"
              >
                <Share2 className="w-4 h-4" />
                مشاركة
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium py-3 rounded-xl transition-colors border border-white/20 backdrop-blur-sm"
              >
                <Copy className="w-4 h-4" />
                نسخ الرقم
              </button>
            </div>
          </div>
        )}

        {/* Features - show when no result */}
        {!searched && !loading && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { icon: Zap, title: 'تتبع فوري', desc: 'معرفة موقع شحنتك بلحظة', color: 'text-yellow-400' },
              { icon: Shield, title: 'معلومات موثوقة', desc: 'بيانات حقيقية ومحدّثة', color: 'text-blue-400' },
              { icon: Star, title: 'خدمة متميزة', desc: 'دعم على مدار الساعة', color: 'text-purple-400' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
                <p className="text-white font-bold text-sm">{title}</p>
                <p className="text-blue-200/50 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center">
        <p className="text-blue-200/40 text-xs">Ship Pro © 2026 — جميع الحقوق محفوظة</p>
      </footer>
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
  dir: textDir,
}: {
  icon: React.ReactNode
  label: string
  value: string
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className={`text-sm font-semibold text-gray-800 truncate ${textDir === 'ltr' ? 'text-left' : ''}`} dir={textDir}>{value}</p>
      </div>
    </div>
  )
}
