import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Warehouse, Box, Package, MapPin, Plus, Trash2, Loader2, ScanLine, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import BarcodeScanner from '@/components/BarcodeScanner'

interface WarehouseRow {
  id: string
  code: string
  name: string
  address: string | null
  is_active: boolean
}

interface Shelf {
  id: string
  warehouse_id: string
  code: string
  name: string | null
  capacity: number
  current_count: number
}

interface Assignment {
  id: string
  shipment_id: string
  shelf_id: string
  created_at: string
  shipment?: { tracking_number: string; recipient_name: string; status: string } | null
  shelf?: { code: string } | null
}

export default function WarehousePage() {
  const { user } = useAuthStore()
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([])
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedWh, setSelectedWh] = useState<string | null>(null)
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWhModal, setShowWhModal] = useState(false)
  const [showShelfModal, setShowShelfModal] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [schemaReady, setSchemaReady] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [wh, sh, asg] = await Promise.all([
      supabase.from('warehouses').select('*').order('created_at', { ascending: false }),
      supabase.from('warehouse_shelves').select('*').order('code'),
      supabase.from('shipment_shelf_assignments')
        .select('*, shipment:shipments(tracking_number, recipient_name, status), shelf:warehouse_shelves(code)')
        .is('removed_at', null)
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    // Detect missing schema (tables don't exist yet)
    const missingSchema = [wh, sh, asg].some(r => {
      const msg = (r.error?.message || '').toLowerCase()
      return msg.includes('relation') && msg.includes('does not exist')
    })
    if (missingSchema) {
      setSchemaReady(false)
      setLoading(false)
      return
    }

    setWarehouses((wh.data || []) as WarehouseRow[])
    setShelves((sh.data || []) as Shelf[])
    setAssignments((asg.data || []) as Assignment[])
    if (wh.data && wh.data.length > 0 && !selectedWh) setSelectedWh(wh.data[0].id as string)
    setLoading(false)
  }, [selectedWh])

  useEffect(() => { load() }, [load])

  const warehouseShelves = shelves.filter(s => s.warehouse_id === selectedWh)

  const handleScan = async (tracking: string) => {
    if (!selectedShelf) {
      toast.error('اختر الرف أولاً قبل المسح')
      return
    }
    const { data: ship } = await supabase.from('shipments').select('id').eq('tracking_number', tracking).single()
    if (!ship) {
      toast.error(`لم يتم العثور على الشحنة: ${tracking}`)
      return
    }
    const { error } = await supabase.from('shipment_shelf_assignments').insert({
      shipment_id: (ship as { id: string }).id,
      shelf_id: selectedShelf,
      assigned_by: user?.id,
    })
    if (error) {
      toast.error('فشل التعيين: ' + error.message)
    } else {
      toast.success(`تم تعيين ${tracking} للرف بنجاح`)
      load()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!schemaReady) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-blue-600" />
            إدارة المخازن والأرفف
          </h1>
        </div>
        <Card className="border-2 border-amber-200 bg-amber-50">
          <div className="py-6 text-center">
            <Warehouse className="w-12 h-12 text-amber-600 mx-auto mb-3" />
            <h2 className="text-lg font-black text-amber-900 mb-2">يحتاج هذا الموديول إلى تفعيل</h2>
            <p className="text-sm text-amber-800 mb-4 max-w-md mx-auto">
              جداول المخازن غير موجودة في قاعدة البيانات بعد. يرجى تطبيق الـ migration من صفحة إعدادات النظام.
            </p>
            <Button onClick={() => window.location.href = '/admin/system'}>
              <ArrowLeft className="w-4 h-4 ml-1" />
              الانتقال لإعدادات النظام
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-blue-600" />
            إدارة المخازن والأرفف
          </h1>
          <p className="text-sm text-gray-500 mt-1">تعريف المخازن، الأرفف، وتخصيص الشحنات للأرفف بالماسح الضوئي</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowWhModal(true)}>
            <Plus className="w-4 h-4 ml-1" />
            مخزن جديد
          </Button>
          <Button variant="secondary" onClick={() => setShowShelfModal(true)} disabled={!selectedWh}>
            <Plus className="w-4 h-4 ml-1" />
            رف جديد
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="المخازن" value={warehouses.length} icon={<Warehouse className="w-5 h-5 text-blue-600" />} color="blue" />
        <StatCard title="الأرفف" value={shelves.length} icon={<Box className="w-5 h-5 text-purple-600" />} color="purple" />
        <StatCard title="الشحنات المخزّنة" value={assignments.length} icon={<Package className="w-5 h-5 text-green-600" />} color="green" />
        <StatCard title="النشطة" value={warehouses.filter(w => w.is_active).length} icon={<MapPin className="w-5 h-5 text-orange-600" />} color="orange" />
      </div>

      {warehouses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {warehouses.map(w => (
            <button
              key={w.id}
              onClick={() => { setSelectedWh(w.id); setSelectedShelf(null) }}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-all ${
                selectedWh === w.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
              }`}
            >
              {w.name} <span className="text-xs opacity-70 font-mono" dir="ltr">({w.code})</span>
            </button>
          ))}
        </div>
      )}

      {warehouses.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-gray-400">
            <Warehouse className="w-12 h-12 mx-auto mb-2 opacity-60" />
            <p className="text-sm">لا توجد مخازن بعد — أنشئ المخزن الأول</p>
          </div>
        </Card>
      ) : selectedWh && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">أرفف المخزن</h2>
            {selectedShelf && (
              <Button variant="secondary" onClick={() => setShowScanner(true)}>
                <ScanLine className="w-4 h-4 ml-1" />
                مسح وتخزين
              </Button>
            )}
          </div>

          {warehouseShelves.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">لا توجد أرفف — أضف رفاً جديداً</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {warehouseShelves.map(s => {
                const count = assignments.filter(a => a.shelf_id === s.id).length
                const full = count >= s.capacity
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedShelf(s.id)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      selectedShelf === s.id
                        ? 'border-blue-500 bg-blue-50'
                        : full
                          ? 'border-red-200 bg-red-50 hover:border-red-400'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <Box className={`w-6 h-6 mx-auto mb-1 ${selectedShelf === s.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className="font-bold text-sm text-gray-900" dir="ltr">{s.code}</p>
                    <p className="text-xs text-gray-500">{count}/{s.capacity}</p>
                  </button>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Assignments list */}
      {assignments.length > 0 && (
        <Card>
          <h2 className="font-bold text-gray-900 mb-3">أحدث الشحنات المخزّنة</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 border-b">
                <tr>
                  <th className="text-right py-2">الشحنة</th>
                  <th className="text-right py-2">المستلم</th>
                  <th className="text-right py-2">الرف</th>
                  <th className="text-right py-2">التاريخ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {assignments.slice(0, 20).map(a => (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="py-2 font-mono text-xs" dir="ltr">{a.shipment?.tracking_number}</td>
                    <td className="py-2">{a.shipment?.recipient_name}</td>
                    <td className="py-2 font-mono text-xs" dir="ltr">{a.shelf?.code}</td>
                    <td className="py-2 text-xs text-gray-500">{new Date(a.created_at).toLocaleString('ar-EG')}</td>
                    <td className="py-2 text-left">
                      <button
                        onClick={async () => {
                          await supabase.from('shipment_shelf_assignments').update({ removed_at: new Date().toISOString() }).eq('id', a.id)
                          toast.success('تم إزالة التخصيص')
                          load()
                        }}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showWhModal && (
        <WarehouseModal onClose={() => setShowWhModal(false)} onSaved={() => { setShowWhModal(false); load() }} />
      )}
      {showShelfModal && selectedWh && (
        <ShelfModal warehouseId={selectedWh} onClose={() => setShowShelfModal(false)} onSaved={() => { setShowShelfModal(false); load() }} />
      )}
      {showScanner && (
        <BarcodeScanner
          title="مسح شحنات للتخزين"
          continuous
          hint="امسح باركود الشحنات بالتتابع — سيتم تعيينها تلقائياً للرف المحدد"
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

function WarehouseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!code.trim() || !name.trim()) { toast.error('يرجى إدخال الكود والاسم'); return }
    setSaving(true)
    const { error } = await supabase.from('warehouses').insert({ code: code.trim().toUpperCase(), name: name.trim(), address: address.trim() || null })
    setSaving(false)
    if (error) { toast.error('فشل: ' + error.message); return }
    toast.success('تم إنشاء المخزن')
    onSaved()
  }

  return (
    <Modal isOpen onClose={onClose} title="مخزن جديد">
      <div className="space-y-3">
        <Input label="كود المخزن" value={code} onChange={e => setCode(e.target.value)} placeholder="مثال: WH-CAI-01" required />
        <Input label="الاسم" value={name} onChange={e => setName(e.target.value)} placeholder="مثال: مخزن القاهرة الرئيسي" required />
        <Input label="العنوان" value={address} onChange={e => setAddress(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function ShelfModal({ warehouseId, onClose, onSaved }: { warehouseId: string; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState('')
  const [capacity, setCapacity] = useState(100)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!code.trim()) { toast.error('يرجى إدخال كود الرف'); return }
    setSaving(true)
    const { error } = await supabase.from('warehouse_shelves').insert({
      warehouse_id: warehouseId,
      code: code.trim().toUpperCase(),
      capacity,
    })
    setSaving(false)
    if (error) { toast.error('فشل: ' + error.message); return }
    toast.success('تم إضافة الرف')
    onSaved()
  }

  return (
    <Modal isOpen onClose={onClose} title="رف جديد">
      <div className="space-y-3">
        <Input label="كود الرف" value={code} onChange={e => setCode(e.target.value)} placeholder="مثال: A-01-R3" required />
        <Input label="السعة القصوى" type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}</Button>
        </div>
      </div>
    </Modal>
  )
}
