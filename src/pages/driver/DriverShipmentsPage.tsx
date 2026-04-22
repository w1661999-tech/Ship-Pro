import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatCurrency, SHIPMENT_STATUS_LABELS } from '@/utils/helpers'
import { Package, Phone, MapPin, RefreshCw } from 'lucide-react'
import type { Shipment, ShipmentStatus } from '@/types/database'
import toast from 'react-hot-toast'

const DRIVER_STATUSES: ShipmentStatus[] = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'postponed', 'refused', 'returned']

export default function DriverShipmentsPage() {
  const { user } = useAuthStore()
  const [courierId, setCourierId] = useState<string | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Shipment | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [newStatus, setNewStatus] = useState<ShipmentStatus | ''>('')
  const [statusNotes, setStatusNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [filter, setFilter] = useState('active')

  useEffect(() => {
    if (!user) return
    supabase.from('couriers').select('id').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setCourierId(data.id)
    })
  }, [user])

  const load = useCallback(async () => {
    if (!courierId) return
    setLoading(true)
    let query = supabase.from('shipments').select('*, merchant:merchants(store_name)').eq('courier_id', courierId).order('assigned_at', { ascending: false })
    if (filter === 'active') query = query.in('status', ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'])
    else if (filter === 'delivered') query = query.eq('status', 'delivered')
    else if (filter === 'returned') query = query.in('status', ['refused', 'returned', 'postponed'])
    const { data } = await query
    setShipments(data as Shipment[] || [])
    setLoading(false)
  }, [courierId, filter])

  useEffect(() => { load() }, [load])

  async function handleStatusUpdate() {
    if (!selected || !newStatus) return
    setUpdating(true)
    try {
      const updateData: Partial<Shipment> = { status: newStatus }
      if (newStatus === 'picked_up') updateData.picked_up_at = new Date().toISOString()
      if (newStatus === 'delivered') updateData.delivered_at = new Date().toISOString()
      if (newStatus === 'returned') updateData.returned_at = new Date().toISOString()

      const { error } = await supabase.from('shipments').update(updateData).eq('id', selected.id)
      if (error) throw error

      await supabase.from('shipment_status_logs').insert({
        shipment_id: selected.id,
        from_status: selected.status,
        to_status: newStatus,
        courier_id: courierId,
        notes: statusNotes || null,
      })

      // If delivered and has COD, create collection record
      if (newStatus === 'delivered' && selected.cod_amount > 0) {
        await supabase.from('courier_collections').insert({
          courier_id: courierId!,
          shipment_id: selected.id,
          amount: selected.cod_amount,
          collected_at: new Date().toISOString(),
          is_transferred: false,
        })
        // Update courier total collections
        await (supabase.rpc('increment_courier_collections', { courier_id: courierId, amount: selected.cod_amount }) as unknown as Promise<unknown>).catch(() => {
          // Fallback: direct update
          supabase.from('couriers').select('total_collections, total_deliveries').eq('id', courierId!).single().then(({ data: c }) => {
            if (c) {
              supabase.from('couriers').update({
                total_collections: c.total_collections + selected.cod_amount,
                total_deliveries: c.total_deliveries + 1,
              }).eq('id', courierId!)
            }
          })
        })
      }

      toast.success('تم تحديث حالة الشحنة بنجاح')
      setShowModal(false)
      setStatusNotes('')
      load()
    } catch (err) {
      toast.error('فشل تحديث الحالة')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">شحناتي</h1>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'active', label: 'النشطة' },
          { key: 'delivered', label: 'المُسلَّمة' },
          { key: 'returned', label: 'المُعادة/المؤجلة' },
          { key: 'all', label: 'الكل' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              filter === f.key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : shipments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>لا توجد شحنات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shipments.map(s => (
            <Card key={s.id} hover onClick={() => { setSelected(s); setNewStatus(s.status); setShowModal(true) }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-blue-600">{s.tracking_number}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <h3 className="font-bold text-gray-900">{s.recipient_name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span dir="ltr">{s.recipient_phone}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-sm text-gray-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span className="text-xs">{s.recipient_address}</span>
                  </div>
                </div>
                {s.cod_amount > 0 && (
                  <div className="text-left flex-shrink-0">
                    <p className="text-xs text-gray-400">COD</p>
                    <p className="font-bold text-green-600 text-lg">{formatCurrency(s.cod_amount)}</p>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  {(s.merchant as { store_name?: string })?.store_name || ''}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); setSelected(s); setNewStatus(s.status); setShowModal(true) }}
                  className="text-xs bg-orange-50 text-orange-600 px-3 py-1 rounded-lg hover:bg-orange-100 font-medium"
                >
                  تحديث الحالة
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal && !!selected}
        onClose={() => { setShowModal(false); setStatusNotes('') }}
        title="تحديث حالة الشحنة"
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button onClick={handleStatusUpdate} loading={updating} disabled={!newStatus || newStatus === selected?.status}>
              تحديث
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-bold text-gray-800">{selected.recipient_name}</p>
              <p className="text-sm text-gray-600">{selected.recipient_address}</p>
              {selected.cod_amount > 0 && (
                <p className="text-sm font-bold text-green-600 mt-1">COD: {formatCurrency(selected.cod_amount)}</p>
              )}
            </div>
            <Select
              label="الحالة الجديدة"
              options={DRIVER_STATUSES.map(s => ({ value: s, label: SHIPMENT_STATUS_LABELS[s] }))}
              value={newStatus}
              onChange={e => setNewStatus(e.target.value as ShipmentStatus)}
            />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">ملاحظات (اختياري)</label>
              <textarea
                rows={2}
                value={statusNotes}
                onChange={e => setStatusNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                placeholder="أضف ملاحظة..."
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
