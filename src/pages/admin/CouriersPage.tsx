import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select, TextArea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, VEHICLE_TYPE_LABELS, COURIER_STATUS_LABELS } from '@/utils/helpers'
import { Truck, Plus, Edit2, Search, RefreshCw, Phone, MapPin, Star, Package } from 'lucide-react'
import type { Courier, Zone } from '@/types/database'
import toast from 'react-hot-toast'

const STATUS_BADGE: Record<string, 'success' | 'danger' | 'warning'> = {
  active: 'success',
  inactive: 'danger',
  on_delivery: 'warning',
}

export default function CouriersPage() {
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Courier | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', national_id: '', vehicle_type: 'motorcycle',
    vehicle_plate: '', zone_id: '', notes: '', status: 'active'
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase.from('couriers').select('*, zone:zones(name)').order('created_at', { ascending: false })
      if (search) query = query.ilike('name', `%${search}%`)
      const { data } = await query
      setCouriers(data || [])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    supabase.from('zones').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setZones(data || []))
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', phone: '', national_id: '', vehicle_type: 'motorcycle', vehicle_plate: '', zone_id: '', notes: '', status: 'active' })
    setShowModal(true)
  }

  const openEdit = (c: Courier) => {
    setEditing(c)
    setForm({
      name: c.name, phone: c.phone, national_id: c.national_id || '',
      vehicle_type: c.vehicle_type, vehicle_plate: c.vehicle_plate || '',
      zone_id: c.zone_id || '', notes: c.notes || '', status: c.status
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.phone) { toast.error('يرجى إدخال الاسم والهاتف'); return }
    setSaving(true)
    try {
      const data = {
        name: form.name, phone: form.phone,
        national_id: form.national_id || null,
        vehicle_type: form.vehicle_type as Courier['vehicle_type'],
        vehicle_plate: form.vehicle_plate || null,
        zone_id: form.zone_id || null,
        notes: form.notes || null,
        status: form.status as Courier['status'],
      }
      if (editing) {
        const { error } = await supabase.from('couriers').update(data).eq('id', editing.id)
        if (error) throw error
        toast.success('تم تحديث المندوب')
      } else {
        const { error } = await supabase.from('couriers').insert({ ...data, total_deliveries: 0, success_rate: 0, total_collections: 0 })
        if (error) throw error
        toast.success('تم إضافة المندوب')
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast.error('فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (courier: Courier) => {
    const newStatus = courier.status === 'active' ? 'inactive' : 'active'
    await supabase.from('couriers').update({ status: newStatus }).eq('id', courier.id)
    toast.success(`تم ${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} المندوب`)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">المناديب</h1>
          <p className="text-gray-500 text-sm">{couriers.length} مندوب</p>
        </div>
        <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>إضافة مندوب</Button>
      </div>

      <Card>
        <Input
          placeholder="بحث بالاسم..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          rightIcon={<Search className="w-4 h-4" />}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </Card>
          ))
        ) : couriers.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-gray-400">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>لا يوجد مناديب</p>
          </div>
        ) : (
          couriers.map(c => (
            <Card key={c.id} hover>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">{c.name[0]}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{c.name}</h3>
                    <Badge variant={STATUS_BADGE[c.status] || 'gray'}>{COURIER_STATUS_LABELS[c.status]}</Badge>
                  </div>
                </div>
                <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span dir="ltr">{c.phone}</span>
                </div>
                {c.zone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{(c.zone as { name?: string }).name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Truck className="w-3.5 h-3.5 text-gray-400" />
                  <span>{VEHICLE_TYPE_LABELS[c.vehicle_type]}</span>
                  {c.vehicle_plate && <span className="text-gray-400">({c.vehicle_plate})</span>}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-400">التوصيلات</p>
                  <p className="text-sm font-bold text-gray-800">{c.total_deliveries}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">نسبة النجاح</p>
                  <p className="text-sm font-bold text-green-600">{c.success_rate.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">التحصيلات</p>
                  <p className="text-sm font-bold text-gray-800">{formatCurrency(c.total_collections)}</p>
                </div>
              </div>

              <button
                onClick={() => toggleStatus(c)}
                className={`w-full mt-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  c.status === 'active'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                {c.status === 'active' ? 'إيقاف التفعيل' : 'تفعيل'}
              </button>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'تعديل مندوب' : 'إضافة مندوب جديد'}
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving}>حفظ</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم الكامل" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="رقم الهاتف" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="الرقم القومي" value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} dir="ltr" />
            <Input label="لوحة المركبة" value={form.vehicle_plate} onChange={e => setForm(f => ({ ...f, vehicle_plate: e.target.value }))} dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="نوع المركبة"
              options={Object.entries(VEHICLE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              value={form.vehicle_type}
              onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}
            />
            <Select
              label="المنطقة"
              options={zones.map(z => ({ value: z.id, label: z.name }))}
              value={form.zone_id}
              onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}
              placeholder="اختر منطقة..."
            />
          </div>
          <Select
            label="الحالة"
            options={Object.entries(COURIER_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
          />
          <TextArea label="ملاحظات" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
        </div>
      </Modal>
    </div>
  )
}
