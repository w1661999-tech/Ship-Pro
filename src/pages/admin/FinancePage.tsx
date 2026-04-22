import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/utils/helpers'
import { DollarSign, TrendingUp, RefreshCw, CheckCircle, Clock, ArrowUpRight } from 'lucide-react'
import type { FinancialTransaction, SettlementRequest } from '@/types/database'
import toast from 'react-hot-toast'

const TX_TYPE_LABELS: Record<string, string> = {
  cod_collected: 'COD محصَّل',
  merchant_settlement: 'تسوية تاجر',
  courier_salary: 'راتب مندوب',
  return_fee: 'رسوم إرجاع',
  delivery_fee: 'رسوم توصيل',
  cod_transfer: 'تحويل COD',
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [settlements, setSettlements] = useState<SettlementRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'transactions' | 'settlements'>('settlements')
  const [stats, setStats] = useState({ totalCOD: 0, totalFees: 0, pendingSettlements: 0, settledAmount: 0 })

  async function loadData() {
    setLoading(true)
    const [{ data: txData }, { data: settData }] = await Promise.all([
      supabase.from('financial_transactions').select('*, merchant:merchants(store_name), courier:couriers(name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('settlement_requests').select('*, merchant:merchants(store_name, contact_name, bank_name, bank_account)').order('created_at', { ascending: false }),
    ])

    setTransactions((txData as FinancialTransaction[]) || [])
    setSettlements((settData as SettlementRequest[]) || [])

    // Calculate stats
    const cod = (txData || []).filter(t => t.type === 'cod_collected').reduce((s, t) => s + t.amount, 0)
    const fees = (txData || []).filter(t => t.type === 'delivery_fee').reduce((s, t) => s + t.amount, 0)
    const pendingSett = (settData || []).filter(s => s.status === 'pending').reduce((s, r) => s + r.amount, 0)
    const paidSett = (settData || []).filter(s => s.status === 'paid').reduce((s, r) => s + r.amount, 0)

    setStats({ totalCOD: cod, totalFees: fees, pendingSettlements: pendingSett, settledAmount: paidSett })
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function approveSettlement(id: string) {
    await supabase.from('settlement_requests').update({ status: 'approved' }).eq('id', id)
    toast.success('تم الموافقة على طلب التسوية')
    loadData()
  }

  async function paySettlement(id: string, merchantId: string, amount: number) {
    // Update settlement status
    await supabase.from('settlement_requests').update({
      status: 'paid',
      paid_at: new Date().toISOString()
    }).eq('id', id)

    // Update merchant balance
    const { data: merchant } = await supabase.from('merchants').select('balance, pending_settlement').eq('id', merchantId).single()
    if (merchant) {
      await supabase.from('merchants').update({
        balance: Math.max(0, merchant.balance - amount),
        pending_settlement: Math.max(0, merchant.pending_settlement - amount)
      }).eq('id', merchantId)
    }

    // Create financial transaction
    await supabase.from('financial_transactions').insert({
      type: 'merchant_settlement',
      amount: amount,
      merchant_id: merchantId,
      status: 'completed',
      description: `تسوية تاجر - ${new Date().toLocaleDateString('ar-EG')}`,
    })

    toast.success('تم صرف التسوية بنجاح')
    loadData()
  }

  async function rejectSettlement(id: string) {
    await supabase.from('settlement_requests').update({ status: 'rejected' }).eq('id', id)
    toast.success('تم رفض طلب التسوية')
    loadData()
  }

  const settlementStatusBadge = (status: string): 'warning' | 'info' | 'success' | 'danger' | 'gray' => {
    const map: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'gray'> = {
      pending: 'warning', approved: 'info', paid: 'success', rejected: 'danger'
    }
    return map[status] || 'gray'
  }

  const settlementStatusLabel: Record<string, string> = {
    pending: 'قيد المراجعة', approved: 'موافق عليه', paid: 'تم الصرف', rejected: 'مرفوض'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">المالية</h1>
          <p className="text-gray-500 text-sm">إدارة المعاملات المالية وطلبات التسوية</p>
        </div>
        <Button variant="secondary" onClick={loadData} icon={<RefreshCw className="w-4 h-4" />}>تحديث</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="إجمالي COD المحصَّل" value={formatCurrency(stats.totalCOD)} icon={<DollarSign className="w-6 h-6 text-green-600" />} color="green" />
        <StatCard title="رسوم التوصيل" value={formatCurrency(stats.totalFees)} icon={<TrendingUp className="w-6 h-6 text-blue-600" />} color="blue" />
        <StatCard title="تسويات معلقة" value={formatCurrency(stats.pendingSettlements)} icon={<Clock className="w-6 h-6 text-yellow-600" />} color="yellow" />
        <StatCard title="إجمالي التسويات المدفوعة" value={formatCurrency(stats.settledAmount)} icon={<CheckCircle className="w-6 h-6 text-purple-600" />} color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('settlements')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'settlements' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          طلبات التسوية ({settlements.filter(s => s.status === 'pending').length})
        </button>
        <button
          onClick={() => setTab('transactions')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'transactions' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          سجل المعاملات
        </button>
      </div>

      {/* Settlements Tab */}
      {tab === 'settlements' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">التاجر</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">المبلغ المطلوب</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">عدد الشحنات</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">البنك</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">التاريخ</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />جارٍ التحميل...
                  </td></tr>
                ) : settlements.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-400">لا توجد طلبات تسوية</td></tr>
                ) : settlements.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{(s.merchant as { store_name?: string })?.store_name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-700">{formatCurrency(s.amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.shipment_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {(s.merchant as { bank_name?: string })?.bank_name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={settlementStatusBadge(s.status)}>{settlementStatusLabel[s.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('ar-EG')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {s.status === 'pending' && (
                          <>
                            <button onClick={() => approveSettlement(s.id)}
                              className="px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-600 hover:bg-blue-100">
                              موافقة
                            </button>
                            <button onClick={() => rejectSettlement(s.id)}
                              className="px-2 py-1 rounded-lg text-xs bg-red-50 text-red-600 hover:bg-red-100">
                              رفض
                            </button>
                          </>
                        )}
                        {s.status === 'approved' && (
                          <button onClick={() => paySettlement(s.id, s.merchant_id, s.amount)}
                            className="px-2 py-1 rounded-lg text-xs bg-green-50 text-green-600 hover:bg-green-100">
                            صرف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">النوع</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">المبلغ</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الوصف</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">التاجر/المندوب</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-gray-400">لا توجد معاملات</td></tr>
                ) : transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Badge variant="default">{TX_TYPE_LABELS[t.type] || t.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">{formatCurrency(t.amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{t.description || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {(t.merchant as { store_name?: string })?.store_name ||
                       (t.courier as { name?: string })?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={t.status === 'completed' ? 'success' : t.status === 'cancelled' ? 'danger' : 'warning'}>
                        {t.status === 'completed' ? 'مكتمل' : t.status === 'cancelled' ? 'ملغي' : 'معلق'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('ar-EG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
