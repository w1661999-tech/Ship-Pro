import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select, TextArea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Table'
import { formatCurrency, MERCHANT_STATUS_LABELS } from '@/utils/helpers'
import {
  Users, Plus, Edit2, Search, RefreshCw, Phone,
  MapPin, Package, DollarSign, Eye, ChevronDown
} from 'lucide-react'
import type { Merchant, Zone } from '@/types/database'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20

const STATUS_BADGE_MAP: Record<string, 'success' | 'danger' | 'warning'> = {
  active: 'success',
  suspended: 'danger',
  pending: 'warning',
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [editing, setEditing] = useState<Merchant | null>(null)
  const [selected, setSelected] = useState<Merchant | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    store_name: '', contact_name: '', phone: '', email: '',
    address: '', zone_id: '', status: 'active',
    bank_name: '', bank_account: '', notes: '', commission_rate: '0',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('merchants')
        .select('*, zone:zones(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (search) query = query.or(`store_name.ilike.%${search}%,contact_name.ilike.%${search}%,phone.ilike.%${search}%`)
      if (statusFilter) query = query.eq('status', statusFilter)

      const { data, count } = await query
      setMerchants(data as Merchant[] || [])
      setTotal(count || 0)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    supabase.from('zones').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setZones(data || []))
  }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ store_name: '', contact_name: '', phone: '', email: '', address: '', zone_id: '', status: 'active', bank_name: '', bank_account: '', notes: '', commission_rate: '0' })
    setShowModal(true)
  }

  const openEdit = (m: Merchant) => {
    setEditing(m)
    setForm({
      store_name: m.store_name, contact_name: m.contact_name, phone: m.phone,
      email: m.email, address: m.address || '', zone_id: m.zone_id || '',
      status: m.status, bank_name: (m as any).bank_name || '',
      bank_account: (m as any).bank_account || '', notes: m.notes || '',
      commission_rate: String((m as any).commission_rate || 0),
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.store_name || !form.phone || !form.contact_name) {
      toast.error('يرجى إدخال اسم المتجر، اسم التواصل، ورقم الهاتف')
      return
    }
    setSaving(true)
    try {
      const data = {
        store_name: form.store_name,
        contact_name: form.contact_name,
        phone: form.phone,
        email: form.email,
        address: form.address || null,
        zone_id: form.zone_id || null,
        status: form.status as Merchant['status'],
        notes: form.notes || null,
        bank_name: form.bank_name || null,
        bank_account: form.bank_account || null,
        commission_rate: parseFloat(form.commission_rate) || 0,
      }
      if (editing) {
        const { error } = await supabase.from('merchants').update(data).eq('id', editing.id)
        if (error) throw error
        toast.success('تم تحديث بيانات التاجر')
      } else {
        const { error } = await supabase.from('merchants').insert({
          ...data,
          balance: 0, pending_settlement: 0, total_shipments: 0, delivery_rate: 0,
        })
        if (error) throw error
        toast.success('تم إضافة التاجر بنجاح')
      }
      setShowModal(false)
      load()
    } catch (err: any) {
      toast.error(err.message || 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (merchant: Merchant) => {
    const newStatus = merchant.status === 'active' ? 'suspended' : 'active'
    await supabase.from('merchants').update({ status: newStatus }).eq('id', merchant.id)
    toast.success(`تم ${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} التاجر`)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">التجار</h1>
          <p className="text-gray-500 text-sm">{total.toLocaleString('ar-EG')} تاجر</p>
        </div>
        <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>إضافة تاجر</Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="بحث باسم المتجر، التواصل، أو الهاتف..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              rightIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="sm:w-44">
            <Select
              options={[
                { value: '', label: 'كل الحالات' },
                { value: 'active', label: 'نشط' },
                { value: 'suspended', label: 'موقوف' },
                { value: 'pending', label: 'قيد المراجعة' },
              ]}
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
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
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">التاجر</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">التواصل</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">المنطقة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الشحنات</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الرصيد</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    جارٍ التحميل...
                  </td>
                </tr>
              ) : merchants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    لا يوجد تجار
                  </td>
                </tr>
              ) : merchants.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-600 font-bold">{m.store_name[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{m.store_name}</p>
                        <p className="text-xs text-gray-400">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-700">{m.contact_name}</p>
                    <p className="text-xs text-gray-400 dir-ltr">{m.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {(m.zone as { name?: string })?.name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium text-gray-800">{m.total_shipments}</span>
                      <span className="text-xs text-green-600">({m.delivery_rate?.toFixed(0)}%)</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-green-700">{formatCurrency(m.balance)}</p>
                    {m.pending_settlement > 0 && (
                      <p className="text-xs text-orange-500">معلق: {formatCurrency(m.pending_settlement)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE_MAP[m.status] || 'gray'}>
                      {MERCHANT_STATUS_LABELS[m.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setSelected(m); setShowDetail(true) }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                        title="التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(m)}
                        className={`p-1.5 rounded-lg text-xs font-medium ${
                          m.status === 'active'
                            ? 'hover:bg-red-50 text-red-500'
                            : 'hover:bg-green-50 text-green-600'
                        }`}
                        title={m.status === 'active' ? 'إيقاف' : 'تفعيل'}
                      >
                        {m.status === 'active' ? '⏸' : '▶'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `تعديل: ${editing.store_name}` : 'إضافة تاجر جديد'}
        size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving}>حفظ</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="اسم المتجر / الشركة" required value={form.store_name} onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))} />
            <Input label="اسم الشخص المسؤول" required value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="رقم الهاتف" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} dir="ltr" />
            <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} dir="ltr" />
          </div>
          <Input label="العنوان" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="المنطقة"
              options={zones.map(z => ({ value: z.id, label: z.name }))}
              value={form.zone_id}
              onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}
              placeholder="اختر منطقة..."
            />
            <Select
              label="الحالة"
              options={[
                { value: 'active', label: 'نشط' },
                { value: 'suspended', label: 'موقوف' },
                { value: 'pending', label: 'قيد المراجعة' },
              ]}
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="اسم البنك" value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} />
            <Input label="رقم الحساب" value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} dir="ltr" />
          </div>
          <TextArea label="ملاحظات" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail && !!selected}
        onClose={() => setShowDetail(false)}
        title={selected?.store_name || ''}
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowDetail(false)}>إغلاق</Button>
            <Button onClick={() => { setShowDetail(false); openEdit(selected!) }}>تعديل</Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">الشخص المسؤول</p>
                <p className="font-semibold text-gray-800">{selected.contact_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">الهاتف</p>
                <p className="font-semibold text-gray-800">{selected.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">البريد الإلكتروني</p>
                <p className="font-semibold text-gray-800">{selected.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">الحالة</p>
                <Badge variant={STATUS_BADGE_MAP[selected.status] || 'gray'}>
                  {MERCHANT_STATUS_LABELS[selected.status]}
                </Badge>
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-500">الرصيد المتاح</p>
                <p className="font-black text-green-700">{formatCurrency(selected.balance)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">إجمالي الشحنات</p>
                <p className="font-black text-gray-800">{selected.total_shipments}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">معدل التسليم</p>
                <p className="font-black text-blue-700">{selected.delivery_rate?.toFixed(0)}%</p>
              </div>
            </div>
            {selected.address && (
              <div>
                <p className="text-xs text-gray-500">العنوان</p>
                <p className="text-sm text-gray-700">{selected.address}</p>
              </div>
            )}
            {selected.notes && (
              <div>
                <p className="text-xs text-gray-500">ملاحظات</p>
                <p className="text-sm text-gray-700">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
