import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/helpers'
import { MapPin, Plus, Edit2, Trash2, DollarSign, RefreshCw } from 'lucide-react'
import type { Zone, PricingRule } from '@/types/database'
import toast from 'react-hot-toast'

export default function PricingPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedZone, setSelectedZone] = useState('')
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [saving, setSaving] = useState(false)

  const [zoneForm, setZoneForm] = useState({ name: '', name_en: '', region: '', sort_order: '0' })
  const [ruleForm, setRuleForm] = useState({
    zone_id: '', weight_from: '0', weight_to: '5',
    base_price: '25', extra_kg_price: '3', cod_fee_pct: '1.5', return_fee: '15'
  })

  async function loadData() {
    setLoading(true)
    const [{ data: zonesData }, { data: rulesData }] = await Promise.all([
      supabase.from('zones').select('*').order('sort_order'),
      supabase.from('pricing_rules').select('*, zone:zones(name)').order('zone_id, weight_from'),
    ])
    setZones(zonesData || [])
    setRules(rulesData || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filteredRules = selectedZone
    ? rules.filter(r => r.zone_id === selectedZone)
    : rules

  const openAddZone = () => {
    setEditingZone(null)
    setZoneForm({ name: '', name_en: '', region: '', sort_order: String(zones.length) })
    setShowZoneModal(true)
  }

  const openEditZone = (z: Zone) => {
    setEditingZone(z)
    setZoneForm({ name: z.name, name_en: z.name_en || '', region: z.region || '', sort_order: String(z.sort_order) })
    setShowZoneModal(true)
  }

  const handleSaveZone = async () => {
    if (!zoneForm.name) { toast.error('يرجى إدخال اسم المنطقة'); return }
    setSaving(true)
    try {
      const data = { name: zoneForm.name, name_en: zoneForm.name_en || null, region: zoneForm.region || null, sort_order: parseInt(zoneForm.sort_order) || 0 }
      if (editingZone) {
        await supabase.from('zones').update(data).eq('id', editingZone.id)
        toast.success('تم تحديث المنطقة')
      } else {
        await supabase.from('zones').insert({ ...data, is_active: true })
        toast.success('تم إضافة المنطقة')
      }
      setShowZoneModal(false)
      loadData()
    } finally { setSaving(false) }
  }

  const openAddRule = () => {
    setEditingRule(null)
    setRuleForm({ zone_id: selectedZone || zones[0]?.id || '', weight_from: '0', weight_to: '5', base_price: '25', extra_kg_price: '3', cod_fee_pct: '1.5', return_fee: '15' })
    setShowRuleModal(true)
  }

  const openEditRule = (r: PricingRule) => {
    setEditingRule(r)
    setRuleForm({
      zone_id: r.zone_id, weight_from: String(r.weight_from), weight_to: String(r.weight_to),
      base_price: String(r.base_price), extra_kg_price: String(r.extra_kg_price),
      cod_fee_pct: String(r.cod_fee_pct), return_fee: String(r.return_fee)
    })
    setShowRuleModal(true)
  }

  const handleSaveRule = async () => {
    if (!ruleForm.zone_id) { toast.error('يرجى اختيار المنطقة'); return }
    setSaving(true)
    try {
      const data = {
        zone_id: ruleForm.zone_id,
        weight_from: parseFloat(ruleForm.weight_from),
        weight_to: parseFloat(ruleForm.weight_to),
        base_price: parseFloat(ruleForm.base_price),
        extra_kg_price: parseFloat(ruleForm.extra_kg_price),
        cod_fee_pct: parseFloat(ruleForm.cod_fee_pct),
        return_fee: parseFloat(ruleForm.return_fee),
      }
      if (editingRule) {
        await supabase.from('pricing_rules').update(data).eq('id', editingRule.id)
        toast.success('تم تحديث قاعدة التسعير')
      } else {
        await supabase.from('pricing_rules').insert({ ...data, is_active: true })
        toast.success('تم إضافة قاعدة التسعير')
      }
      setShowRuleModal(false)
      loadData()
    } finally { setSaving(false) }
  }

  const deleteRule = async (id: string) => {
    if (!confirm('هل تريد حذف هذه القاعدة؟')) return
    await supabase.from('pricing_rules').delete().eq('id', id)
    toast.success('تم الحذف')
    loadData()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">المناطق والتسعير</h1>
          <p className="text-gray-500 text-sm">إدارة مناطق التوصيل وأسعار الشحن</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openAddZone} icon={<Plus className="w-4 h-4" />}>
            منطقة جديدة
          </Button>
          <Button onClick={openAddRule} icon={<Plus className="w-4 h-4" />}>
            قاعدة تسعير جديدة
          </Button>
        </div>
      </div>

      {/* Zones Grid */}
      <div>
        <h2 className="text-base font-bold text-gray-700 mb-3">المناطق</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </Card>
            ))
          ) : zones.map(z => (
            <Card
              key={z.id}
              hover
              className={`cursor-pointer border-2 transition-all ${selectedZone === z.id ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`}
              onClick={() => setSelectedZone(prev => prev === z.id ? '' : z.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{z.name}</h3>
                  {z.region && <p className="text-xs text-gray-400 mt-0.5">{z.region}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {rules.filter(r => r.zone_id === z.id).length} قاعدة تسعير
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); openEditZone(z) }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Pricing Rules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-700">
            قواعد التسعير
            {selectedZone && (
              <span className="text-blue-600 text-sm font-normal mr-2">
                - {zones.find(z => z.id === selectedZone)?.name}
              </span>
            )}
          </h2>
          {selectedZone && (
            <button onClick={() => setSelectedZone('')} className="text-xs text-gray-400 hover:text-gray-600">
              إلغاء الفلتر
            </button>
          )}
        </div>

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">المنطقة</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الوزن من</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الوزن إلى</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">السعر الأساسي</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">كل كجم إضافي</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">نسبة COD</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">رسوم الإرجاع</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={8} className="py-10 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    جارٍ التحميل...
                  </td></tr>
                ) : filteredRules.length === 0 ? (
                  <tr><td colSpan={8} className="py-10 text-center text-gray-400">
                    لا توجد قواعد تسعير
                  </td></tr>
                ) : filteredRules.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {(r.zone as { name?: string })?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.weight_from} كجم</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.weight_to} كجم</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">{formatCurrency(r.base_price)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(r.extra_kg_price)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.cod_fee_pct}%</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(r.return_fee)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEditRule(r)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteRule(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Zone Modal */}
      <Modal isOpen={showZoneModal} onClose={() => setShowZoneModal(false)} title={editingZone ? 'تعديل منطقة' : 'إضافة منطقة جديدة'} size="sm"
        footer={<div className="flex gap-2 justify-end"><Button variant="secondary" onClick={() => setShowZoneModal(false)}>إلغاء</Button><Button onClick={handleSaveZone} loading={saving}>حفظ</Button></div>}
      >
        <div className="space-y-4">
          <Input label="اسم المنطقة (عربي)" required value={zoneForm.name} onChange={e => setZoneForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="اسم المنطقة (إنجليزي)" value={zoneForm.name_en} onChange={e => setZoneForm(f => ({ ...f, name_en: e.target.value }))} dir="ltr" />
          <Input label="المحافظة/الإقليم" value={zoneForm.region} onChange={e => setZoneForm(f => ({ ...f, region: e.target.value }))} />
          <Input label="ترتيب الظهور" type="number" value={zoneForm.sort_order} onChange={e => setZoneForm(f => ({ ...f, sort_order: e.target.value }))} />
        </div>
      </Modal>

      {/* Rule Modal */}
      <Modal isOpen={showRuleModal} onClose={() => setShowRuleModal(false)} title={editingRule ? 'تعديل قاعدة تسعير' : 'إضافة قاعدة تسعير'} size="md"
        footer={<div className="flex gap-2 justify-end"><Button variant="secondary" onClick={() => setShowRuleModal(false)}>إلغاء</Button><Button onClick={handleSaveRule} loading={saving}>حفظ</Button></div>}
      >
        <div className="space-y-4">
          <Select label="المنطقة" required options={zones.map(z => ({ value: z.id, label: z.name }))} value={ruleForm.zone_id} onChange={e => setRuleForm(f => ({ ...f, zone_id: e.target.value }))} placeholder="اختر منطقة..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="الوزن من (كجم)" type="number" value={ruleForm.weight_from} onChange={e => setRuleForm(f => ({ ...f, weight_from: e.target.value }))} />
            <Input label="الوزن إلى (كجم)" type="number" value={ruleForm.weight_to} onChange={e => setRuleForm(f => ({ ...f, weight_to: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="السعر الأساسي (جنيه)" type="number" value={ruleForm.base_price} onChange={e => setRuleForm(f => ({ ...f, base_price: e.target.value }))} />
            <Input label="كل كجم إضافي (جنيه)" type="number" value={ruleForm.extra_kg_price} onChange={e => setRuleForm(f => ({ ...f, extra_kg_price: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="نسبة COD (%)" type="number" value={ruleForm.cod_fee_pct} onChange={e => setRuleForm(f => ({ ...f, cod_fee_pct: e.target.value }))} />
            <Input label="رسوم الإرجاع (جنيه)" type="number" value={ruleForm.return_fee} onChange={e => setRuleForm(f => ({ ...f, return_fee: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
