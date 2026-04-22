import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, TextArea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/helpers'
import { DollarSign, Plus, Clock, CheckCircle, RefreshCw } from 'lucide-react'
import type { SettlementRequest } from '@/types/database'
import toast from 'react-hot-toast'

export default function MerchantFinancePage() {
  const { user } = useAuthStore()
  const [merchant, setMerchant] = useState<{ id: string; balance: number; pending_settlement: number; store_name: string; bank_name: string | null; bank_account: string | null } | null>(null)
  const [settlements, setSettlements] = useState<SettlementRequest[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ amount: '', bank_name: '', bank_account: '', notes: '' })
  const [totalCOD, setTotalCOD] = useState(0)
  const [totalFees, setTotalFees] = useState(0)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    const { data: m } = await supabase.from('merchants').select('id, balance, pending_settlement, store_name, bank_name, bank_account').eq('user_id', user.id).single()
    if (!m) { setLoading(false); return }
    setMerchant(m)

    const [{ data: setts }, { data: deliveredShipments }] = await Promise.all([
      supabase.from('settlement_requests').select('*').eq('merchant_id', m.id).order('created_at', { ascending: false }),
      supabase.from('shipments').select('cod_amount, delivery_fee, cod_fee').eq('merchant_id', m.id).eq('status', 'delivered'),
    ])

    setSettlements((setts as SettlementRequest[]) || [])
    const cod = (deliveredShipments || []).reduce((sum, s) => sum + (s.cod_amount || 0), 0)
    const fees = (deliveredShipments || []).reduce((sum, s) => sum + (s.delivery_fee || 0) + (s.cod_fee || 0), 0)
    setTotalCOD(cod)
    setTotalFees(fees)
    setLoading(false)
  }

  const handleSettlementRequest = async () => {
    if (!merchant) return
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { toast.error('يرجى إدخال مبلغ صحيح'); return }
    if (amount > merchant.balance) { toast.error(`المبلغ أكبر من الرصيد المتاح (${formatCurrency(merchant.balance)})`); return }
    if (!form.bank_name || !form.bank_account) { toast.error('يرجى إدخال بيانات البنك'); return }

    setSaving(true)
    try {
      // Count delivered shipments for this settlement
      const { count } = await supabase.from('shipments').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'delivered')

      const { error } = await supabase.from('settlement_requests').insert({
        merchant_id: merchant.id,
        amount: amount,
        shipment_count: count || 0,
        status: 'pending',
        bank_name: form.bank_name,
        bank_account: form.bank_account,
        notes: form.notes || null,
        requested_by: user!.id,
      })
      if (error) throw error

      // Update merchant pending_settlement
      await supabase.from('merchants').update({ pending_settlement: merchant.pending_settlement + amount }).eq('id', merchant.id)

      toast.success('تم إرسال طلب التسوية بنجاح')
      setShowModal(false)
      setForm({ amount: '', bank_name: '', bank_account: '', notes: '' })
      loadData()
    } catch (err) {
      toast.error('فشل إرسال الطلب')
    } finally {
      setSaving(false)
    }
  }

  const statusLabels: Record<string, string> = {
    pending: 'قيد المراجعة', approved: 'موافق عليه', paid: 'تم الصرف', rejected: 'مرفوض'
  }
  const statusBadge = (s: string): 'warning' | 'info' | 'success' | 'danger' => {
    const map: Record<string, 'warning' | 'info' | 'success' | 'danger'> = { pending: 'warning', approved: 'info', paid: 'success', rejected: 'danger' }
    return map[s] || 'warning'
  }

  if (loading) return <div className="flex justify-center items-center h-48"><RefreshCw className="w-8 h-8 animate-spin text-green-600" /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">حسابي المالي</h1>
          <p className="text-gray-500 text-sm">إدارة رصيدك وطلبات التسوية</p>
        </div>
        <Button onClick={() => { setForm(prev => ({ ...prev, bank_name: merchant?.bank_name || '', bank_account: merchant?.bank_account || '' })); setShowModal(true) }} icon={<Plus className="w-4 h-4" />}>
          طلب تسوية
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <p className="text-green-100 text-sm">الرصيد المتاح</p>
          <p className="text-3xl font-black mt-1">{formatCurrency(merchant?.balance || 0)}</p>
          <p className="text-xs text-green-100 mt-1">يمكن طلب تسوية بهذا المبلغ</p>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <p className="text-blue-100 text-sm">إجمالي COD المحصَّل</p>
          <p className="text-3xl font-black mt-1">{formatCurrency(totalCOD)}</p>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0">
          <p className="text-orange-100 text-sm">قيد التسوية</p>
          <p className="text-3xl font-black mt-1">{formatCurrency(merchant?.pending_settlement || 0)}</p>
        </Card>
      </div>

      {/* Account Statement */}
      <Card>
        <h3 className="font-bold text-gray-800 mb-4">كشف الحساب المبسَّط</h3>
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">إجمالي مبالغ COD المحصَّلة</span>
            <span className="font-bold text-green-600">+ {formatCurrency(totalCOD)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">رسوم التوصيل والخدمة</span>
            <span className="font-bold text-red-500">- {formatCurrency(totalFees)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">التسويات المدفوعة</span>
            <span className="font-bold text-red-500">
              - {formatCurrency(settlements.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.amount, 0))}
            </span>
          </div>
          <div className="flex justify-between py-2 font-bold text-lg">
            <span>الرصيد الحالي</span>
            <span className="text-green-600">{formatCurrency(merchant?.balance || 0)}</span>
          </div>
        </div>
      </Card>

      {/* Settlement History */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">سجل طلبات التسوية</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">المبلغ</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">البنك</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">تاريخ الطلب</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">تاريخ الصرف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {settlements.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">لا توجد طلبات تسوية بعد</td></tr>
              ) : settlements.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-green-700">{formatCurrency(s.amount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.bank_name || '-'}</td>
                  <td className="px-4 py-3"><Badge variant={statusBadge(s.status)}>{statusLabels[s.status]}</Badge></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('ar-EG')}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{s.paid_at ? new Date(s.paid_at).toLocaleDateString('ar-EG') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="طلب تسوية جديدة" size="sm"
        footer={<div className="flex gap-2 justify-end"><Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button><Button onClick={handleSettlementRequest} loading={saving}>إرسال الطلب</Button></div>}
      >
        <div className="space-y-4">
          <div className="bg-green-50 rounded-xl p-3 text-sm">
            <p className="text-green-700">الرصيد المتاح للسحب: <strong>{formatCurrency(merchant?.balance || 0)}</strong></p>
          </div>
          <Input label="المبلغ المطلوب (جنيه)" type="number" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} max={merchant?.balance} />
          <Input label="اسم البنك" required value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="البنك الأهلي المصري" />
          <Input label="رقم الحساب / IBAN" required value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} dir="ltr" />
          <TextArea label="ملاحظات (اختياري)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
        </div>
      </Modal>
    </div>
  )
}
