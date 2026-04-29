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
    // Slight delay so the print-only DOM is fully painted (barcodes may need a tick).
    setTimeout(() => window.print(), 100)
  }

  // Helpers ----------------------------------------------------------------

  const fmtDate = (d?: string | null) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    } catch { return '—' }
  }

  return (
    <>
      {/*
        ===================================================================
        PRINT STYLES — fixed 2026-04-29
        ===================================================================
        Three layouts:
          • A4: 2 waybills per page (2-up grid)
          • thermal10x15 : 100mm × 150mm thermal label printer
          • thermal80mm  : 80mm thermal receipt printer

        Critical fixes applied:
          1. .print-only is now SHOWN during print (was missing rule).
          2. The whole admin/merchant chrome (sidebar, header, sticky bars)
             is hidden via html/body resets and the .no-print class.
          3. body & html margins reset to avoid blank cards on first page.
          4. Each waybill forces page-break-inside: avoid, so it never gets
             split between pages (was the root cause of blank A4 pages).
          5. Backgrounds, borders, colors are forced to print using
             -webkit-print-color-adjust: exact.
      */}
      <style>{`
        @media screen {
          .print-only { display: none !important; }
        }
        @media print {
          /* Reset page chrome */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only {
            display: block !important;
            position: absolute;
            left: 0; top: 0; right: 0;
            width: 100%;
            background: #fff;
          }
          .no-print { display: none !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          ${paperSize === 'a4' ? `
            @page { size: A4; margin: 8mm; }
            .print-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6mm;
              padding: 0;
            }
            .print-waybill {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              border: 2px solid #111 !important;
              border-radius: 6px;
              padding: 8px !important;
              background: #fff !important;
              font-family: 'Cairo', 'Tajawal', 'Arial', sans-serif;
              direction: rtl;
              font-size: 10.5px;
              color: #111 !important;
              min-height: 130mm;
              display: flex;
              flex-direction: column;
            }
            /* Force a page-break after every TWO waybills to keep the
               2-up grid clean (avoids ‘orphan’ items causing blank space) */
            .print-waybill:nth-child(2n) {
              page-break-after: always;
              break-after: page;
            }
          ` : paperSize === 'thermal10x15' ? `
            @page { size: 100mm 150mm; margin: 0; }
            .print-grid { display: block; padding: 0; }
            .print-waybill {
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              break-inside: avoid;
              border: 1px solid #000 !important;
              padding: 3mm !important;
              background: #fff !important;
              font-family: 'Cairo', 'Tajawal', 'Arial', sans-serif;
              direction: rtl;
              width: 100mm;
              height: 150mm;
              box-sizing: border-box;
              font-size: 9.5px;
              overflow: hidden;
              color: #111 !important;
              display: flex;
              flex-direction: column;
            }
            .print-waybill:last-child {
              page-break-after: auto;
              break-after: auto;
            }
          ` : `
            @page { size: 80mm auto; margin: 1mm; }
            .print-grid { display: block; padding: 0; }
            .print-waybill {
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              border: 1px solid #000 !important;
              padding: 2mm !important;
              background: #fff !important;
              font-family: 'Cairo', 'Tajawal', 'Arial', sans-serif;
              direction: rtl;
              width: 78mm;
              box-sizing: border-box;
              font-size: 9px;
              color: #111 !important;
            }
            .print-waybill:last-child {
              page-break-after: auto;
            }
          `}
        }
      `}</style>

      {/* =========== SCREEN VIEW =========== */}
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

      {/* =========================================================
          PRINT AREA — only visible when window.print() is invoked
          ========================================================= */}
      <div className="print-only">
        <div className="print-grid">
          {selectedShipments.map(s => {
            const totalAmount = (s.cod_amount || 0) + (s.delivery_fee || 0) + ((s as any).cod_fee || 0)
            const codShown = (s.cod_amount || 0) > 0
            return (
              <div key={s.id} className="print-waybill">
                {/* ===== HEADER ===== */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '2px solid #1e3a8a',
                  paddingBottom: '6px',
                  marginBottom: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '32px', height: '32px',
                      background: '#1e3a8a', borderRadius: '6px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '18px', fontWeight: 900,
                    }}>📦</div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '15px', color: '#1e3a8a' }}>Ship Pro</div>
                      <div style={{ fontSize: '8px', color: '#6b7280' }}>نظام الشحن الاحترافي</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{
                      fontFamily: '"Courier New", monospace',
                      fontWeight: 900,
                      fontSize: '13px',
                      letterSpacing: '1px',
                      background: '#1e3a8a',
                      color: '#fff',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      direction: 'ltr',
                    }}>
                      {s.tracking_number}
                    </div>
                    <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '2px' }}>
                      تاريخ الإصدار: {fmtDate(s.created_at)}
                    </div>
                  </div>
                </div>

                {/* ===== BARCODE ===== */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: '#fff',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '4px',
                  padding: '4px',
                  marginBottom: '6px',
                }}>
                  <WaybillBarcode value={s.tracking_number} height={50} width={1.6} fontSize={8} />
                </div>

                {/* ===== ZONE BADGE (LARGE) ===== */}
                {(s.zone as any)?.name && (
                  <div style={{
                    background: '#fef3c7',
                    border: '1.5px solid #f59e0b',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    marginBottom: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#78350f' }}>📍 منطقة التسليم</span>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#78350f' }}>
                      {(s.zone as any).name}
                    </span>
                  </div>
                )}

                {/* ===== RECIPIENT + SENDER GRID ===== */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '5px',
                  marginBottom: '6px',
                }}>
                  {/* Recipient — TO */}
                  <div style={{
                    border: '1.5px solid #16a34a',
                    borderRadius: '5px',
                    padding: '5px',
                    background: '#f0fdf4',
                  }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '9px',
                      color: '#15803d',
                      marginBottom: '3px',
                      borderBottom: '1px solid #86efac',
                      paddingBottom: '2px',
                      textAlign: 'center',
                      background: '#16a34a',
                      color: '#fff',
                      borderRadius: '3px',
                      padding: '2px 4px',
                      margin: '-2px -2px 3px -2px',
                    }}>
                      📍 المستلم (إلى)
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '12px', color: '#111', marginBottom: '1px' }}>
                      {s.recipient_name}
                    </div>
                    <div style={{ fontSize: '11px', direction: 'ltr', textAlign: 'right', fontWeight: 700, color: '#1f2937' }}>
                      📞 {s.recipient_phone}
                    </div>
                    {s.recipient_phone2 && (
                      <div style={{ fontSize: '10px', direction: 'ltr', textAlign: 'right', color: '#374151' }}>
                        ☎ {s.recipient_phone2}
                      </div>
                    )}
                    <div style={{ fontSize: '9px', color: '#1f2937', marginTop: '3px', lineHeight: 1.3 }}>
                      🏠 {s.recipient_address}
                    </div>
                  </div>

                  {/* Sender — FROM */}
                  <div style={{
                    border: '1.5px solid #2563eb',
                    borderRadius: '5px',
                    padding: '5px',
                    background: '#eff6ff',
                  }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '9px',
                      textAlign: 'center',
                      background: '#2563eb',
                      color: '#fff',
                      borderRadius: '3px',
                      padding: '2px 4px',
                      margin: '-2px -2px 3px -2px',
                    }}>
                      🏪 المرسل (من)
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '12px', color: '#111', marginBottom: '1px' }}>
                      {merchantData?.store_name || '—'}
                    </div>
                    <div style={{ fontSize: '11px', direction: 'ltr', textAlign: 'right', fontWeight: 700, color: '#1f2937' }}>
                      📞 {merchantData?.phone || '—'}
                    </div>
                    {merchantData?.address && (
                      <div style={{ fontSize: '9px', color: '#1f2937', marginTop: '3px', lineHeight: 1.3 }}>
                        🏠 {merchantData.address}
                      </div>
                    )}
                  </div>
                </div>

                {/* ===== PRODUCT DESCRIPTION ===== */}
                {(s as any).product_description && (
                  <div style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    background: '#f8fafc',
                    marginBottom: '5px',
                  }}>
                    <div style={{ fontSize: '8px', fontWeight: 700, color: '#475569', marginBottom: '1px' }}>
                      🎁 وصف المنتج
                    </div>
                    <div style={{ fontSize: '10px', color: '#0f172a', fontWeight: 600 }}>
                      {(s as any).product_description}
                    </div>
                  </div>
                )}

                {/* ===== FINANCE GRID — 4 COLUMNS ===== */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '4px',
                  marginBottom: '5px',
                }}>
                  <div style={{
                    textAlign: 'center',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '4px 2px',
                  }}>
                    <div style={{ color: '#475569', fontSize: '7.5px', fontWeight: 700 }}>الوزن</div>
                    <div style={{ fontWeight: 900, fontSize: '11px', color: '#0f172a' }}>{s.weight || 1} كجم</div>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '4px 2px',
                  }}>
                    <div style={{ color: '#475569', fontSize: '7.5px', fontWeight: 700 }}>القطع</div>
                    <div style={{ fontWeight: 900, fontSize: '11px', color: '#0f172a' }}>{(s as any).quantity || 1}</div>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '4px 2px',
                  }}>
                    <div style={{ color: '#475569', fontSize: '7.5px', fontWeight: 700 }}>طريقة الدفع</div>
                    <div style={{ fontWeight: 900, fontSize: '9.5px', color: '#0f172a' }}>
                      {PAYMENT_METHOD_LABELS[s.payment_method] || s.payment_method}
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '4px 2px',
                  }}>
                    <div style={{ color: '#475569', fontSize: '7.5px', fontWeight: 700 }}>رسوم الشحن</div>
                    <div style={{ fontWeight: 900, fontSize: '11px', color: '#0f172a' }}>
                      {s.delivery_fee || 0} ج.م
                    </div>
                  </div>
                </div>

                {/* ===== COD HIGHLIGHT (BIG) ===== */}
                <div style={{
                  background: codShown ? '#16a34a' : '#9ca3af',
                  color: '#fff',
                  border: '2px solid ' + (codShown ? '#15803d' : '#6b7280'),
                  borderRadius: '6px',
                  padding: '6px',
                  marginBottom: '5px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '8.5px', fontWeight: 700, opacity: 0.9 }}>
                      {codShown ? 'المبلغ المطلوب تحصيله من العميل' : 'حالة الدفع'}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 900, marginTop: '1px' }}>
                      {codShown
                        ? `${(s.cod_amount || 0).toLocaleString('ar-EG')} جنيه مصري`
                        : '✓ مدفوع مسبقاً'}
                    </div>
                  </div>
                  {codShown && (
                    <div style={{
                      background: '#fff',
                      color: '#15803d',
                      fontWeight: 900,
                      fontSize: '18px',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>💰</div>
                  )}
                </div>

                {/* ===== FRAGILE / NOTES ===== */}
                {(s.is_fragile || s.recipient_notes) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '5px' }}>
                    {s.is_fragile && (
                      <div style={{
                        background: '#fef3c7',
                        border: '1.5px solid #f59e0b',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        fontWeight: 800,
                        fontSize: '9.5px',
                        color: '#92400e',
                      }}>
                        ⚠️ قابل للكسر — يُرجى التعامل بحرص شديد
                      </div>
                    )}
                    {s.recipient_notes && (
                      <div style={{
                        background: '#eff6ff',
                        border: '1px solid #60a5fa',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        fontSize: '9.5px',
                        color: '#1e40af',
                      }}>
                        📝 <span style={{ fontWeight: 700 }}>ملاحظات:</span> {s.recipient_notes}
                      </div>
                    )}
                  </div>
                )}

                {/* ===== SIGNATURES ===== */}
                <div style={{
                  marginTop: 'auto',
                  paddingTop: '5px',
                  borderTop: '1px dashed #94a3b8',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', color: '#475569', fontWeight: 700, marginBottom: '12px' }}>
                      توقيع المستلم
                    </div>
                    <div style={{ borderBottom: '1.5px solid #1f2937', height: '0' }} />
                    <div style={{ fontSize: '7px', color: '#94a3b8', marginTop: '2px' }}>الاسم والتاريخ</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '8px', color: '#475569', fontWeight: 700, marginBottom: '12px' }}>
                      توقيع المندوب
                    </div>
                    <div style={{ borderBottom: '1.5px solid #1f2937', height: '0' }} />
                    <div style={{ fontSize: '7px', color: '#94a3b8', marginTop: '2px' }}>اسم المندوب والتاريخ</div>
                  </div>
                </div>

                {/* ===== FOOTER ===== */}
                <div style={{
                  marginTop: '4px',
                  paddingTop: '3px',
                  borderTop: '1px solid #e2e8f0',
                  fontSize: '7px',
                  color: '#94a3b8',
                  textAlign: 'center',
                }}>
                  للاستفسار: تتبع شحنتك على ship-pro-roan.vercel.app/track | هذه الوثيقة صادرة إلكترونياً ولا تحتاج لختم
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
