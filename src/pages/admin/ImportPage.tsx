import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { generateTrackingNumber, formatDate, SHIPMENT_STATUS_LABELS } from '@/utils/helpers'
import {
  FileSpreadsheet, Upload, AlertTriangle, CheckCircle,
  Download, X, RefreshCw, Info
} from 'lucide-react'
import type { Merchant, Zone } from '@/types/database'
import toast from 'react-hot-toast'

interface ImportRow {
  recipient_name: string
  recipient_phone: string
  recipient_address: string
  cod_amount: string | number
  weight?: string | number
  zone_name?: string
  notes?: string
  product_description?: string
  recipient_phone2?: string
}

interface ParsedRow extends ImportRow {
  index: number
  valid: boolean
  errors: string[]
  zone_id?: string
  tracking_number?: string
}

export default function ImportPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [selectedMerchant, setSelectedMerchant] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [batches, setBatches] = useState<any[]>([])
  const [loadingBatches, setLoadingBatches] = useState(true)

  useEffect(() => {
    supabase.from('merchants').select('id, store_name').eq('status', 'active').order('store_name').then(({ data }) => setMerchants(data as Merchant[] || []))
    supabase.from('zones').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setZones(data || []))
    loadBatches()
  }, [])

  async function loadBatches() {
    setLoadingBatches(true)
    const { data } = await supabase
      .from('import_batches')
      .select('*, merchant:merchants(store_name)')
      .order('created_at', { ascending: false })
      .limit(10)
    setBatches(data || [])
    setLoadingBatches(false)
  }

  function parseCSV(content: string): ImportRow[] {
    const lines = content.split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
      const row: any = {}
      headers.forEach((h, i) => {
        row[h] = values[i] || ''
      })
      return row
    })
  }

  function validateAndMapRows(rawRows: ImportRow[]): ParsedRow[] {
    return rawRows.map((row, index) => {
      const errors: string[] = []
      
      if (!row.recipient_name?.toString().trim()) errors.push('الاسم مطلوب')
      if (!row.recipient_phone?.toString().trim()) errors.push('الهاتف مطلوب')
      if (!row.recipient_address?.toString().trim()) errors.push('العنوان مطلوب')
      
      const codAmount = parseFloat(row.cod_amount?.toString() || '0')
      if (isNaN(codAmount)) errors.push('قيمة COD غير صحيحة')
      
      // Find zone by name
      let zone_id: string | undefined
      if (row.zone_name) {
        const zone = zones.find(z =>
          z.name.includes(row.zone_name!) ||
          z.name_en?.toLowerCase().includes(row.zone_name!.toLowerCase()) ||
          row.zone_name!.includes(z.name)
        )
        if (zone) zone_id = zone.id
        else errors.push(`منطقة "${row.zone_name}" غير موجودة`)
      } else {
        errors.push('اسم المنطقة مطلوب')
      }

      return {
        ...row,
        index: index + 1,
        valid: errors.length === 0,
        errors,
        zone_id,
        tracking_number: generateTrackingNumber(),
      }
    })
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!selectedMerchant) {
      toast.error('يرجى اختيار التاجر أولاً')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const rawRows = parseCSV(content)
      if (rawRows.length === 0) {
        toast.error('الملف فارغ أو بصيغة غير صحيحة')
        return
      }
      const parsedRows = validateAndMapRows(rawRows)
      setRows(parsedRows)
      setStep('preview')
      toast.success(`تم قراءة ${rawRows.length} صف من الملف`)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  async function handleImport() {
    if (!selectedMerchant) {
      toast.error('يرجى اختيار التاجر')
      return
    }
    const validRows = rows.filter(r => r.valid)
    if (validRows.length === 0) {
      toast.error('لا توجد صفوف صالحة للاستيراد')
      return
    }

    setImporting(true)
    let successCount = 0
    let failedCount = 0

    try {
      // Create import batch record
      const { data: batch } = await supabase.from('import_batches').insert({
        merchant_id: selectedMerchant,
        total_rows: validRows.length,
        success_rows: 0,
        failed_rows: 0,
        status: 'processing',
      }).select().single()

      // Get pricing for merchant's zone
      const merchantData = merchants.find(m => m.id === selectedMerchant)
      
      // Import in chunks of 20
      const CHUNK_SIZE = 20
      for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
        const chunk = validRows.slice(i, i + CHUNK_SIZE)
        const shipmentsToInsert = chunk.map(row => ({
          tracking_number: row.tracking_number || generateTrackingNumber(),
          merchant_id: selectedMerchant,
          zone_id: row.zone_id,
          recipient_name: row.recipient_name.toString().trim(),
          recipient_phone: row.recipient_phone.toString().trim(),
          recipient_phone2: row.recipient_phone2?.toString().trim() || null,
          recipient_address: row.recipient_address.toString().trim(),
          recipient_notes: row.notes?.toString().trim() || null,
          product_description: row.product_description?.toString().trim() || null,
          weight: parseFloat(row.weight?.toString() || '1') || 1,
          quantity: 1,
          is_fragile: false,
          payment_method: 'cod' as const,
          cod_amount: parseFloat(row.cod_amount?.toString() || '0') || 0,
          delivery_fee: 0,
          cod_fee: 0,
          return_fee: 0,
          status: 'pending' as const,
          attempts: 0,
          import_batch_id: batch?.id || null,
        }))

        const { error } = await supabase.from('shipments').insert(shipmentsToInsert)
        if (error) {
          failedCount += chunk.length
        } else {
          successCount += chunk.length
        }
      }

      // Update batch
      if (batch) {
        await supabase.from('import_batches').update({
          success_rows: successCount,
          failed_rows: failedCount,
          status: failedCount === 0 ? 'completed' : 'partial',
        }).eq('id', batch.id)
      }

      setImportResult({ success: successCount, failed: failedCount })
      setStep('done')
      loadBatches()

      if (successCount > 0) {
        toast.success(`تم استيراد ${successCount} شحنة بنجاح`)
      }
    } catch (err) {
      toast.error('فشل الاستيراد')
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    const csvContent = [
      'recipient_name,recipient_phone,recipient_phone2,recipient_address,zone_name,cod_amount,weight,product_description,notes',
      'محمد أحمد,01012345678,,شارع النصر - القاهرة,القاهرة - مناطق قريبة,150,0.5,ملابس,',
      'فاطمة علي,01098765432,,المعادي - القاهرة,الجيزة,200,1,إلكترونيات,تسليم سريع',
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_shipments.csv'
    a.click()
  }

  const validRows = rows.filter(r => r.valid)
  const invalidRows = rows.filter(r => !r.valid)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">استيراد الشحنات</h1>
          <p className="text-gray-500 text-sm">رفع ملف Excel/CSV لإضافة شحنات بالجملة</p>
        </div>
        <Button variant="secondary" onClick={downloadTemplate} icon={<Download className="w-4 h-4" />}>
          تحميل النموذج
        </Button>
      </div>

      {step === 'upload' && (
        <>
          {/* Steps Guide */}
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-800 mb-2">كيفية الاستخدام:</p>
                <ol className="space-y-1 text-sm text-blue-700">
                  <li>1. حمّل نموذج CSV بالضغط على "تحميل النموذج"</li>
                  <li>2. اختر التاجر المرتبطة به الشحنات</li>
                  <li>3. اختر ملف CSV المعبأ بالبيانات</li>
                  <li>4. راجع البيانات واضغط "استيراد"</li>
                </ol>
                <p className="text-xs text-blue-600 mt-2">الأعمدة المطلوبة: recipient_name، recipient_phone، recipient_address، zone_name، cod_amount</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <Select
                label="التاجر"
                required
                options={merchants.map(m => ({ value: m.id, label: m.store_name }))}
                value={selectedMerchant}
                onChange={e => setSelectedMerchant(e.target.value)}
                placeholder="اختر التاجر..."
              />

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ملف CSV <span className="text-red-500">*</span>
                </label>
                <label
                  className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    selectedMerchant
                      ? 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
                      : 'border-gray-200 cursor-not-allowed bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className={`w-10 h-10 ${selectedMerchant ? 'text-blue-400' : 'text-gray-300'}`} />
                    <p className={`text-sm font-medium ${selectedMerchant ? 'text-blue-600' : 'text-gray-400'}`}>
                      {selectedMerchant ? 'اضغط لرفع ملف CSV' : 'اختر التاجر أولاً'}
                    </p>
                    <p className="text-xs text-gray-400">CSV, TXT (مفصول بفاصلة)</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={!selectedMerchant}
                  />
                </label>
              </div>
            </div>
          </Card>
        </>
      )}

      {step === 'preview' && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <p className="text-xs text-blue-600 font-medium">إجمالي الصفوف</p>
              <p className="text-2xl font-black text-blue-700">{rows.length}</p>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <p className="text-xs text-green-600 font-medium">صالح للاستيراد</p>
              <p className="text-2xl font-black text-green-700">{validRows.length}</p>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <p className="text-xs text-red-600 font-medium">بها أخطاء</p>
              <p className="text-2xl font-black text-red-700">{invalidRows.length}</p>
            </Card>
          </div>

          {/* Error Rows */}
          {invalidRows.length > 0 && (
            <Card className="border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-red-700">صفوف بها أخطاء ({invalidRows.length})</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {invalidRows.map(row => (
                  <div key={row.index} className="bg-red-50 rounded-lg p-3 text-sm">
                    <span className="font-bold text-red-700">الصف {row.index}: {row.recipient_name || '(فارغ)'}</span>
                    <ul className="mt-1 space-y-0.5">
                      {row.errors.map((err, i) => (
                        <li key={i} className="text-red-600 flex items-center gap-1.5">
                          <X className="w-3 h-3 flex-shrink-0" /> {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Preview Table */}
          <Card padding="none">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">معاينة البيانات الصالحة ({validRows.length} شحنة)</h3>
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">#</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">الاسم</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">الهاتف</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">العنوان</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">المنطقة</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">COD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {validRows.slice(0, 50).map(row => (
                    <tr key={row.index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-400">{row.index}</td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-800">{row.recipient_name}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{row.recipient_phone}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 max-w-[150px] truncate">{row.recipient_address}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{row.zone_name}</td>
                      <td className="px-3 py-2 text-sm font-medium text-green-700">{row.cod_amount} ج</td>
                    </tr>
                  ))}
                  {validRows.length > 50 && (
                    <tr>
                      <td colSpan={6} className="py-2 text-center text-xs text-gray-400">
                        ... و {validRows.length - 50} صف إضافي
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => { setStep('upload'); setRows([]) }}
            >
              إلغاء / تغيير الملف
            </Button>
            <Button
              onClick={handleImport}
              loading={importing}
              disabled={validRows.length === 0}
              icon={<Upload className="w-4 h-4" />}
            >
              استيراد {validRows.length} شحنة
            </Button>
          </div>
        </>
      )}

      {step === 'done' && importResult && (
        <Card className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">اكتمل الاستيراد!</h2>
          <div className="flex justify-center gap-8 mb-6">
            <div>
              <p className="text-3xl font-black text-green-600">{importResult.success}</p>
              <p className="text-sm text-gray-500">شحنة مستوردة</p>
            </div>
            {importResult.failed > 0 && (
              <div>
                <p className="text-3xl font-black text-red-500">{importResult.failed}</p>
                <p className="text-sm text-gray-500">فشل استيرادها</p>
              </div>
            )}
          </div>
          <Button onClick={() => { setStep('upload'); setRows([]); setImportResult(null) }}>
            استيراد دفعة جديدة
          </Button>
        </Card>
      )}

      {/* Previous Batches */}
      <Card padding="none">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">سجل الاستيراد السابق</h3>
          <button onClick={loadBatches} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingBatches ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">التاجر</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الإجمالي</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">ناجح</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">فاشل</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingBatches ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              ) : batches.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">لا يوجد سجل استيراد بعد</td></tr>
              ) : batches.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {(b.merchant as any)?.store_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{b.total_rows}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-bold">{b.success_rows}</td>
                  <td className="px-4 py-3 text-sm text-red-500">{b.failed_rows || 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={b.status === 'completed' ? 'success' : b.status === 'processing' ? 'warning' : 'danger'}>
                      {b.status === 'completed' ? 'مكتمل' : b.status === 'processing' ? 'جارٍ' : 'جزئي'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(b.created_at).toLocaleDateString('ar-EG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
