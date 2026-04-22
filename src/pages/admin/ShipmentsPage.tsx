import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Table'
import { formatCurrency, formatDate, SHIPMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/utils/helpers'
import {
  Package, Search, Filter, Plus, RefreshCw, Eye, Edit2,
  Truck, CheckCircle, X, ChevronDown, Download
} from 'lucide-react'
import type { Shipment, ShipmentStatus, Courier, Merchant, Zone } from '@/types/database'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20
const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  ...Object.entries(SHIPMENT_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))
]

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Shipment | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [assignCourierId, setAssignCourierId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [statusUpdate, setStatusUpdate] = useState<ShipmentStatus | ''>('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const loadShipments = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('shipments')
        .select('*, merchant:merchants(store_name, contact_name), courier:couriers(name, phone), zone:zones(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (search) {
        query = query.or(`tracking_number.ilike.%${search}%,recipient_name.ilike.%${search}%,recipient_phone.ilike.%${search}%`)
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error, count } = await query
      if (error) throw error
      setShipments(data as Shipment[] || [])
      setTotal(count || 0)
    } catch (err) {
      toast.error('فشل تحميل الشحنات')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { loadShipments() }, [loadShipments])

  async function loadCouriers() {
    const { data } = await supabase.from('couriers').select('*').eq('status', 'active')
    setCouriers(data || [])
  }

  async function handleAssign() {
    if (!selected || !assignCourierId) return
    setAssigning(true)
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ courier_id: assignCourierId, status: 'assigned', assigned_at: new Date().toISOString() })
        .eq('id', selected.id)
      if (error) throw error
      toast.success('تم تعيين المندوب بنجاح')
      setShowAssign(false)
      loadShipments()
    } catch (err) {
      toast.error('فشل تعيين المندوب')
    } finally {
      setAssigning(false)
    }
  }

  async function handleStatusUpdate() {
    if (!selected || !statusUpdate) return
    setUpdatingStatus(true)
    try {
      const updateData: Partial<Shipment> = { status: statusUpdate as ShipmentStatus }
      if (statusUpdate === 'delivered') updateData.delivered_at = new Date().toISOString()
      if (statusUpdate === 'picked_up') updateData.picked_up_at = new Date().toISOString()
      if (statusUpdate === 'returned') updateData.returned_at = new Date().toISOString()

      const { error } = await supabase.from('shipments').update(updateData).eq('id', selected.id)
      if (error) throw error

      // Log status change
      await supabase.from('shipment_status_logs').insert({
        shipment_id: selected.id,
        from_status: selected.status,
        to_status: statusUpdate as ShipmentStatus,
        notes: `تحديث من لوحة الإدارة`,
      })

      toast.success('تم تحديث الحالة بنجاح')
      setShowDetail(false)
      loadShipments()
    } catch (err) {
      toast.error('فشل تحديث الحالة')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleExport = () => {
    const csv = [
      ['رقم التتبع', 'المستلم', 'الهاتف', 'العنوان', 'الحالة', 'مبلغ COD', 'رسوم الشحن', 'التاجر', 'المندوب', 'التاريخ'].join(','),
      ...shipments.map(s => [
        s.tracking_number, s.recipient_name, s.recipient_phone, s.recipient_address,
        SHIPMENT_STATUS_LABELS[s.status], s.cod_amount, s.delivery_fee,
        (s.merchant as { store_name?: string })?.store_name || '',
        (s.courier as { name?: string })?.name || '',
        new Date(s.created_at).toLocaleDateString('ar-EG')
      ].join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shipments-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">الشحنات</h1>
          <p className="text-gray-500 text-sm">{total.toLocaleString('ar-EG')} شحنة إجمالاً</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport} icon={<Download className="w-4 h-4" />}>
            تصدير
          </Button>
          <Button onClick={loadShipments} variant="secondary" icon={<RefreshCw className="w-4 h-4" />}>
            تحديث
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="بحث برقم التتبع، اسم المستلم، أو الهاتف..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              rightIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="sm:w-48">
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              placeholder="كل الحالات"
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
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">رقم التتبع</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">المستلم</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">العنوان</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">التاجر</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">المندوب</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">COD</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">التاريخ</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    جارٍ التحميل...
                  </td>
                </tr>
              ) : shipments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    لا توجد شحنات
                  </td>
                </tr>
              ) : (
                shipments.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-blue-600">{s.tracking_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.recipient_name}</p>
                        <p className="text-xs text-gray-400">{s.recipient_phone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">
                      {s.recipient_address}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {(s.merchant as { store_name?: string })?.store_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {(s.courier as { name?: string })?.name || (
                        <span className="text-yellow-600 text-xs">غير معين</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {s.cod_amount > 0 ? formatCurrency(s.cod_amount) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(s.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setSelected(s); setStatusUpdate(s.status); setShowDetail(true) }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!s.courier_id && (
                          <button
                            onClick={() => { setSelected(s); loadCouriers(); setShowAssign(true) }}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors"
                            title="تعيين مندوب"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail && !!selected}
        onClose={() => setShowDetail(false)}
        title={`تفاصيل الشحنة: ${selected?.tracking_number}`}
        size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowDetail(false)}>إغلاق</Button>
            <Button
              onClick={handleStatusUpdate}
              loading={updatingStatus}
              disabled={!statusUpdate || statusUpdate === selected?.status}
            >
              تحديث الحالة
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-bold text-gray-700 text-sm border-b pb-2">بيانات المستلم</h4>
                <InfoRow label="الاسم" value={selected.recipient_name} />
                <InfoRow label="الهاتف" value={selected.recipient_phone} />
                {selected.recipient_phone2 && <InfoRow label="هاتف بديل" value={selected.recipient_phone2} />}
                <InfoRow label="العنوان" value={selected.recipient_address} />
                {selected.recipient_notes && <InfoRow label="ملاحظات" value={selected.recipient_notes} />}
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-gray-700 text-sm border-b pb-2">بيانات الشحنة</h4>
                <InfoRow label="الوزن" value={`${selected.weight} كجم`} />
                <InfoRow label="الكمية" value={selected.quantity} />
                <InfoRow label="طريقة الدفع" value={PAYMENT_METHOD_LABELS[selected.payment_method]} />
                {selected.cod_amount > 0 && <InfoRow label="مبلغ COD" value={formatCurrency(selected.cod_amount)} />}
                <InfoRow label="رسوم الشحن" value={formatCurrency(selected.delivery_fee)} />
                {selected.is_fragile && <InfoRow label="هشاشة" value="قابل للكسر ⚠️" />}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-700 text-sm border-b pb-2 mb-3">تحديث الحالة</h4>
              <Select
                label="الحالة الجديدة"
                options={Object.entries(SHIPMENT_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                value={statusUpdate}
                onChange={e => setStatusUpdate(e.target.value as ShipmentStatus)}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Modal */}
      <Modal
        isOpen={showAssign && !!selected}
        onClose={() => setShowAssign(false)}
        title="تعيين مندوب توصيل"
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowAssign(false)}>إلغاء</Button>
            <Button onClick={handleAssign} loading={assigning} disabled={!assignCourierId}>
              تعيين المندوب
            </Button>
          </div>
        }
      >
        <Select
          label="اختر المندوب"
          options={couriers.map(c => ({ value: c.id, label: `${c.name} - ${c.phone}` }))}
          value={assignCourierId}
          onChange={e => setAssignCourierId(e.target.value)}
          placeholder="اختر مندوباً..."
        />
      </Modal>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | number | React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}:</span>
      <span className="text-sm font-medium text-gray-800 text-left">{value}</span>
    </div>
  )
}
