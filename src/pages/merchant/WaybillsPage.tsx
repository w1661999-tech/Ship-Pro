import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency, PAYMENT_METHOD_LABELS } from '@/utils/helpers'
import { Printer, Search, Package, CheckSquare, Square, Truck, MapPin, Phone, Calendar } from 'lucide-react'
import type { Shipment } from '@/types/database'
import toast from 'react-hot-toast'
import WaybillBarcode from '@/components/WaybillBarcode'

export default function WaybillsPage() {
  const { user } = useAuthStore()
  const [merchantData, setMerchantData] = useState<{
    id: string; store_name: string; phone: string; address: string
  } | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'assigned' | 'picked_up'>('all')
  const [paperSize, setPaperSize] = useState<'a4' | 'thermal10x15' | 'thermal80mm'>('a4')

  useEffect(() => {
    if (!user) return
    supabase.from('merchants')
      .select('id, store_name, phone, address')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setMerchantData(data)
          loadShipments(data.id)
        }
      })
  }, [user])

  async function loadShipments(mId: string) {
    setLoading(true)
    const query = supabase
      .from('shipments')
      .select('*, zone:zones(name)')
      .eq('merchant_id', mId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (statusFilter !== 'all') {
      query.eq('status', statusFilter)
    } else {
      query.in('status', ['pending', 'assigned', 'picked_up'])
    }

    const { data } = await query
    setShipments((data as Shipment[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    if (merchantData?.id) loadShipments(merchantData.id)

  }, [statusFilter])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredShipments = shipments.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.tracking_number.toLowerCase().includes(q) ||
      s.recipient_name.includes(q) ||
      s.recipient_phone?.includes(q)
    )
  })

  const selectAll = () => setSelected(new Set(filteredShipments.map(s => s.id)))
  const clearAll = () => setSelected(new Set())
  const selectedShipments = filteredShipments.filter(s => selected.has(s.id))

  const handlePrint = () => {
    if (selected.size === 0) { toast.error('يرجى اختيار شحنة واحدة على الأقل'); return }
    window.print()
  }

  return (
    <>
      {/* Print styles - supports A4 (2-up grid), 10x15cm thermal, and 80mm thermal receipts */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { direction: rtl; }
          ${paperSize === 'a4' ? `
          @page { size: A4; margin: 10mm; }
          .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
          .print-waybill {
            break-inside: avoid;
            border: 1.5px solid #000 !important;
            border-radius: 4px;
            padding: 10px !important;
            background: #fff;
            font-family: 'Cairo', 'Arial', sans-serif;
            direction: rtl;
            font-size: 11px;
          }
          ` : paperSize === 'thermal10x15' ? `
          @page { size: 100mm 150mm; margin: 2mm; }
          .print-grid { display: block; }
          .print-waybill {
            page-break-after: always;
            break-after: page;
            border: 1px solid #000 !important;
            border-radius: 3px;
            padding: 4mm !important;
            background: #fff;
            font-family: 'Cairo', 'Arial', sans-serif;
            direction: rtl;
            width: 96mm;
            height: 146mm;
            box-sizing: border-box;
            font-size: 10px;
            overflow: hidden;
          }
          ` : `
          @page { size: 80mm auto; margin: 1mm; }
          .print-grid { display: block; }
          .print-waybill {
            page-break-after: always;
            break-after: page;
            border: 1px solid #000 !important;
            padding: 2mm !important;
            background: #fff;
            font-family: 'Cairo', 'Arial', sans-serif;
            direction: rtl;
            width: 78mm;
            box-sizing: border-box;
            font-size: 9px;
          }
          `}
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      {/* Screen view */}
      <div className="no-print space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900">بوالص الشحن</h1>
            <p className="text-gray-500 text-sm">طباعة بوالص شحن احترافية - يدعم الطابعات الحرارية</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">حجم البوليصة:</label>
            <select
              value={paperSize}
              onChange={e => setPaperSize(e.target.value as 'a4' | 'thermal10x15' | 'thermal80mm')}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="a4">A4 (بوليصتين لكل صفحة)</option>
              <option value="thermal10x15">حرارية 10×15 سم</option>
              <option value="thermal80mm">حرارية 80mm</option>
            </select>
          </div>
          <Button
            onClick={handlePrint}
            disabled={selected.size === 0}
            icon={<Printer className="w-4 h-4" />}
          >
            طباعة ({selected.size}) بوليصة
          </Button>
        </div>

        <Card>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <Input
                label="بحث"
                placeholder="رقم تتبع / اسم / هاتف..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                rightIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'all', label: 'الكل' },
                { key: 'pending', label: 'انتظار' },
                { key: 'assigned', label: 'معيَّن' },
                { key: 'picked_up', label: 'استُلم' },
              ] as const).map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                    statusFilter === f.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={selectAll} size="sm" icon={<CheckSquare className="w-4 h-4" />}>
              تحديد الكل ({filteredShipments.length})
            </Button>
            <Button variant="ghost" onClick={clearAll} size="sm" icon={<Square className="w-4 h-4" />}>
              إلغاء
            </Button>
          </div>
        </Card>

        {/* Stats Bar */}
        {selected.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-4 flex-wrap">
            <span className="text-blue-700 font-bold text-sm">تم تحديد {selected.size} شحنة</span>
            <div className="flex items-center gap-1 text-blue-600 text-sm">
              <span>إجمالي COD:</span>
              <span className="font-bold">
                {formatCurrency(selectedShipments.reduce((sum, s) => sum + (s.cod_amount || 0), 0))}
              </span>
            </div>
            <button
              onClick={handlePrint}
              className="mr-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> طباعة الآن
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا توجد شحنات</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'جرب كلمة بحث مختلفة' : 'لا توجد شحنات في هذه الحالة'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredShipments.map(s => {
              const isSelected = selected.has(s.id)
              return (
                <div
                  key={s.id}
                  onClick={() => toggleSelect(s.id)}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-green-500 bg-green-50 shadow-md shadow-green-100'
                      : 'border-gray-200 hover:border-blue-200 bg-white'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all ${
                        isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="text-white text-xs leading-none">✓</span>}
                      </div>
                      <span className="text-sm font-mono font-bold text-blue-700">{s.tracking_number}</span>
                    </div>
                    {s.cod_amount > 0 && (
                      <span className="text-sm font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-lg">
                        {formatCurrency(s.cod_amount)}
                      </span>
                    )}
                  </div>

                  {/* Recipient */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      <p className="font-bold text-gray-900 text-sm">{s.recipient_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-sm text-gray-600" dir="ltr">{s.recipient_phone}</p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-500 line-clamp-2">{s.recipient_address}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-blue-400" />
                      <p className="text-xs text-blue-600 font-medium">{(s.zone as any)?.name || '-'}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-300" />
                      <p className="text-xs text-gray-400">
                        {new Date(s.created_at).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* =========== PRINT AREA =========== */}
      <div className="print-only">
        <div className="print-grid">
          {selectedShipments.map(s => (
            <div key={s.id} className="print-waybill">
              {/* ---- Waybill Header ---- */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid #000',
                paddingBottom: '8px',
                marginBottom: '8px',
              }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '16px', color: '#1e3a5f' }}>🚚 Ship Pro</div>
                  <div style={{ fontSize: '9px', color: '#666' }}>نظام الشحن الاحترافي</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '13px', letterSpacing: '1px' }}>
                    {s.tracking_number}
                  </div>
                  <div style={{ fontSize: '9px', color: '#666' }}>
                    {new Date(s.created_at).toLocaleDateString('ar-EG')}
                  </div>
                </div>
              </div>

              {/* ---- Barcode visual ---- */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                <WaybillBarcode value={s.tracking_number} height={55} width={1.8} fontSize={9} />
              </div>
              <div style={{ textAlign: 'center', fontSize: '8px', marginBottom: '8px', letterSpacing: '2px', fontFamily: 'monospace' }}>
                {s.tracking_number}
              </div>

              {/* ---- Main Info Grid ---- */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                {/* Recipient */}
                <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '6px', background: '#f9fafb' }}>
                  <div style={{ fontWeight: 700, fontSize: '9px', color: '#374151', marginBottom: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '3px' }}>
                    📦 المستلم
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '12px', color: '#111' }}>{s.recipient_name}</div>
                  <div style={{ fontSize: '11px', direction: 'ltr', textAlign: 'right' }}>{s.recipient_phone}</div>
                  {s.recipient_phone2 && (
                    <div style={{ fontSize: '10px', direction: 'ltr', textAlign: 'right', color: '#555' }}>{s.recipient_phone2}</div>
                  )}
                  <div style={{ fontSize: '9px', color: '#374151', marginTop: '2px' }}>{s.recipient_address}</div>
                  <div style={{ fontSize: '9px', color: '#2563eb', fontWeight: 600, marginTop: '1px' }}>
                    📍 {(s.zone as any)?.name || ''}
                  </div>
                </div>

                {/* Sender */}
                <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '6px', background: '#f0f9ff' }}>
                  <div style={{ fontWeight: 700, fontSize: '9px', color: '#374151', marginBottom: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '3px' }}>
                    🏪 المُرسِل
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '12px', color: '#111' }}>{merchantData?.store_name || ''}</div>
                  <div style={{ fontSize: '11px', direction: 'ltr', textAlign: 'right' }}>{merchantData?.phone || ''}</div>
                  {merchantData?.address && (
                    <div style={{ fontSize: '9px', color: '#374151', marginTop: '2px' }}>{merchantData.address}</div>
                  )}
                </div>
              </div>

              {/* ---- Footer Info ---- */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '4px',
                borderTop: '1px solid #ddd',
                paddingTop: '6px',
              }}>
                <div style={{ textAlign: 'center', background: '#f9fafb', borderRadius: '4px', padding: '4px 2px' }}>
                  <div style={{ color: '#6b7280', fontSize: '8px' }}>الوزن</div>
                  <div style={{ fontWeight: 700, fontSize: '11px' }}>{s.weight} كجم</div>
                </div>
                <div style={{ textAlign: 'center', background: '#f9fafb', borderRadius: '4px', padding: '4px 2px' }}>
                  <div style={{ color: '#6b7280', fontSize: '8px' }}>الدفع</div>
                  <div style={{ fontWeight: 700, fontSize: '10px' }}>{PAYMENT_METHOD_LABELS[s.payment_method] || s.payment_method}</div>
                </div>
                <div style={{ textAlign: 'center', background: '#f9fafb', borderRadius: '4px', padding: '4px 2px' }}>
                  <div style={{ color: '#6b7280', fontSize: '8px' }}>رسوم الشحن</div>
                  <div style={{ fontWeight: 700, fontSize: '11px' }}>{s.delivery_fee} ج</div>
                </div>
                <div style={{
                  textAlign: 'center',
                  background: s.cod_amount > 0 ? '#f0fdf4' : '#f9fafb',
                  border: s.cod_amount > 0 ? '1.5px solid #bbf7d0' : '1px solid transparent',
                  borderRadius: '4px',
                  padding: '4px 2px',
                }}>
                  <div style={{ color: '#6b7280', fontSize: '8px' }}>COD</div>
                  <div style={{ fontWeight: 900, color: s.cod_amount > 0 ? '#16a34a' : '#9ca3af', fontSize: s.cod_amount > 0 ? '13px' : '10px' }}>
                    {s.cod_amount > 0 ? `${s.cod_amount} ج` : 'مدفوع'}
                  </div>
                </div>
              </div>

              {/* Fragile / Notes */}
              {(s.is_fragile || s.recipient_notes) && (
                <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {s.is_fragile && (
                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px', padding: '4px 6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '9px', color: '#92400e' }}>⚠️ قابل للكسر — يُرجى التعامل بحرص</span>
                    </div>
                  )}
                  {s.recipient_notes && (
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '4px 6px' }}>
                      <span style={{ fontSize: '9px', color: '#1e40af' }}>📝 {s.recipient_notes}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Signature Line */}
              <div style={{ marginTop: '8px', borderTop: '1px dashed #ccc', paddingTop: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '8px', color: '#9ca3af' }}>توقيع المستلم</div>
                  <div style={{ borderBottom: '1px solid #374151', width: '80px', marginTop: '10px' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '8px', color: '#9ca3af' }}>توقيع المندوب</div>
                  <div style={{ borderBottom: '1px solid #374151', width: '80px', marginTop: '10px' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function BarcodeVisual({ value }: { value: string }) {
  const chars = value.split('')
  const bars = chars.map((c, i) => {
    const code = c.charCodeAt(0)
    const wide = code % 3 === 0
    const spaceBefore = i > 0 && chars[i - 1].charCodeAt(0) % 2 === 0
    return { wide, spaceBefore }
  })

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', height: '36px', gap: '1px' }}>
      {bars.map((b, i) => (
        <React.Fragment key={i}>
          {b.spaceBefore && <div style={{ width: '2px' }} />}
          <div style={{
            width: b.wide ? '3px' : '1.5px',
            height: i % 4 === 0 ? '100%' : i % 3 === 0 ? '85%' : '70%',
            background: '#000',
            borderRadius: '0.5px',
          }} />
        </React.Fragment>
      ))}
    </div>
  )
}
