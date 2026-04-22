import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { generateTrackingNumber } from '@/utils/helpers'
import { FileSpreadsheet, Upload, AlertTriangle, CheckCircle, Download, X, Info } from 'lucide-react'
import type { Zone } from '@/types/database'
import toast from 'react-hot-toast'

interface ParsedRow {
  index: number
  recipient_name: string
  recipient_phone: string
  recipient_address: string
  cod_amount: number
  weight: number
  zone_name: string
  zone_id?: string
  notes?: string
  valid: boolean
  errors: string[]
  tracking_number: string
}

export default function MerchantImportPage() {
  const { user } = useAuthStore()
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')

  useEffect(() => {
    if (!user) return
    supabase.from('merchants').select('id').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setMerchantId(data.id)
    })
    supabase.from('zones').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setZones(data || []))
  }, [user])

  function parseCSV(content: string): any[] {
    const lines = content.split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
      const row: any = {}
      headers.forEach((h, i) => { row[h] = values[i] || '' })
      return row
    })
  }

  function validateRows(rawRows: any[]): ParsedRow[] {
    return rawRows.map((row, index) => {
      const errors: string[] = []
      if (!row.recipient_name?.trim()) errors.push('الاسم مطلوب')
      if (!row.recipient_phone?.trim()) errors.push('الهاتف مطلوب')
      if (!row.recipient_address?.trim()) errors.push('العنوان مطلوب')

      const codAmount = parseFloat(row.cod_amount || '0')
      if (isNaN(codAmount)) errors.push('قيمة COD غير صحيحة')

      let zone_id: string | undefined
      if (row.zone_name) {
        const zone = zones.find(z =>
          z.name.includes(row.zone_name) ||
          row.zone_name.includes(z.name) ||
          z.name_en?.toLowerCase().includes(row.zone_name.toLowerCase())
        )
        if (zone) zone_id = zone.id
        else errors.push(`منطقة "${row.zone_name}" غير معروفة`)
      } else {
        errors.push('اسم المنطقة مطلوب')
      }

      return {
        index: index + 1,
        recipient_name: row.recipient_name || '',
        recipient_phone: row.recipient_phone || '',
        recipient_address: row.recipient_address || '',
        cod_amount: codAmount || 0,
        weight: parseFloat(row.weight || '1') || 1,
        zone_name: row.zone_name || '',
        zone_id,
        notes: row.notes || '',
        valid: errors.length === 0,
        errors,
        tracking_number: generateTrackingNumber(),
      }
    })
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!merchantId) { toast.error('لم يتم ربط حسابك بتاجر'); return }

    const reader = new FileReader()
    reader.onload = event => {
      const content = event.target?.result as string
      const rawRows = parseCSV(content)
      if (rawRows.length === 0) { toast.error('الملف فارغ أو بصيغة غير صحيحة'); return }
      const parsedRows = validateRows(rawRows)
      setRows(parsedRows)
      setStep('preview')
      toast.success(`تم قراءة ${rawRows.length} صف`)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  async function handleImport() {
    if (!merchantId) return
    const validRows = rows.filter(r => r.valid)
    if (validRows.length === 0) { toast.error('لا توجد صفوف صالحة'); return }

    setImporting(true)
    let successCount = 0, failedCount = 0

    try {
      const { data: batch } = await supabase.from('import_batches').insert({
        merchant_id: merchantId,
        total_rows: validRows.length,
        success_rows: 0,
        failed_rows: 0,
        status: 'processing',
      }).select().single()

      for (let i = 0; i < validRows.length; i += 20) {
        const chunk = validRows.slice(i, i + 20)
        const toInsert = chunk.map(row => ({
          tracking_number: row.tracking_number,
          merchant_id: merchantId,
          zone_id: row.zone_id,
          recipient_name: row.recipient_name.trim(),
          recipient_phone: row.recipient_phone.trim(),
          recipient_address: row.recipient_address.trim(),
          recipient_notes: row.notes?.trim() || null,
          weight: row.weight,
          quantity: 1,
          is_fragile: false,
          payment_method: 'cod' as const,
          cod_amount: row.cod_amount,
          delivery_fee: 0,
          cod_fee: 0,
          return_fee: 0,
          status: 'pending' as const,
          attempts: 0,
          import_batch_id: batch?.id || null,
        }))

        const { error } = await supabase.from('shipments').insert(toInsert)
        if (error) failedCount += chunk.length
        else successCount += chunk.length
      }

      if (batch) {
        await supabase.from('import_batches').update({
          success_rows: successCount,
          failed_rows: failedCount,
          status: failedCount === 0 ? 'completed' : 'partial',
        }).eq('id', batch.id)
      }

      setImportResult({ success: successCount, failed: failedCount })
      setStep('done')
      if (successCount > 0) toast.success(`تم استيراد ${successCount} شحنة بنجاح`)
    } catch {
      toast.error('فشل الاستيراد')
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    const csv = [
      'recipient_name,recipient_phone,recipient_address,zone_name,cod_amount,weight,notes',
      'محمد أحمد,01012345678,شارع النصر القاهرة,القاهرة - مناطق قريبة,150,0.5,',
      'فاطمة علي,01098765432,المعادي القاهرة,الجيزة,200,1,تسليم سريع',
    ].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_import.csv'
    a.click()
  }

  const validRows = rows.filter(r => r.valid)
  const invalidRows = rows.filter(r => !r.valid)

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">استيراد شحنات بالجملة</h1>
          <p className="text-gray-500 text-sm">رفع ملف CSV لإضافة عدة شحنات دفعة واحدة</p>
        </div>
        <Button variant="secondary" onClick={downloadTemplate} icon={<Download className="w-4 h-4" />}>
          تحميل النموذج
        </Button>
      </div>

      {!merchantId && (
        <Card className="bg-red-50 border-red-200">
          <p className="text-red-700 font-medium">⚠️ لم يتم ربط حسابك بتاجر. تواصل مع الإدارة.</p>
        </Card>
      )}

      {step === 'upload' && (
        <Card>
          <div className="space-y-5">
            <Card className="bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="font-bold mb-1">تعليمات:</p>
                  <ol className="space-y-0.5 list-decimal list-inside">
                    <li>حمّل نموذج CSV وعبّئه بالبيانات</li>
                    <li>تأكد من كتابة اسم المنطقة بنفس صيغة النظام</li>
                    <li>ارفع الملف وراجع البيانات قبل الاستيراد</li>
                  </ol>
                  <p className="mt-2 font-medium">المناطق المتاحة: {zones.map(z => z.name).join(' | ')}</p>
                </div>
              </div>
            </Card>

            <div>
              <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                merchantId ? 'border-green-300 hover:border-green-400 hover:bg-green-50' : 'border-gray-200 cursor-not-allowed'
              }`}>
                <FileSpreadsheet className={`w-12 h-12 mb-2 ${merchantId ? 'text-green-400' : 'text-gray-300'}`} />
                <p className={`font-medium ${merchantId ? 'text-green-600' : 'text-gray-400'}`}>
                  {merchantId ? 'اضغط لرفع ملف CSV' : 'يلزم ربط الحساب أولاً'}
                </p>
                <p className="text-xs text-gray-400 mt-1">CSV فقط</p>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={!merchantId}
                />
              </label>
            </div>
          </div>
        </Card>
      )}

      {step === 'preview' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200 text-center">
              <p className="text-xs text-blue-600">الإجمالي</p>
              <p className="text-2xl font-black text-blue-700">{rows.length}</p>
            </Card>
            <Card className="bg-green-50 border-green-200 text-center">
              <p className="text-xs text-green-600">صالح</p>
              <p className="text-2xl font-black text-green-700">{validRows.length}</p>
            </Card>
            <Card className="bg-red-50 border-red-200 text-center">
              <p className="text-xs text-red-600">أخطاء</p>
              <p className="text-2xl font-black text-red-700">{invalidRows.length}</p>
            </Card>
          </div>

          {invalidRows.length > 0 && (
            <Card className="border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-red-700 text-sm">أخطاء ({invalidRows.length} صف)</h3>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {invalidRows.map(row => (
                  <div key={row.index} className="bg-red-50 rounded-lg p-2 text-xs">
                    <span className="font-bold text-red-700">الصف {row.index}: </span>
                    {row.errors.join(' | ')}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card padding="none">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm">معاينة ({validRows.length} شحنة)</h3>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">الاسم</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">الهاتف</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">المنطقة</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">COD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {validRows.map(row => (
                    <tr key={row.index}>
                      <td className="px-3 py-2 text-sm text-gray-800">{row.recipient_name}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{row.recipient_phone}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{row.zone_name}</td>
                      <td className="px-3 py-2 text-sm font-medium text-green-700">{row.cod_amount} ج</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setStep('upload'); setRows([]) }}>
              إلغاء
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
          <h2 className="text-2xl font-black text-gray-900 mb-4">اكتمل الاستيراد!</h2>
          <div className="flex justify-center gap-8 mb-6">
            <div>
              <p className="text-3xl font-black text-green-600">{importResult.success}</p>
              <p className="text-sm text-gray-500">شحنة مُضافة</p>
            </div>
            {importResult.failed > 0 && (
              <div>
                <p className="text-3xl font-black text-red-500">{importResult.failed}</p>
                <p className="text-sm text-gray-500">فشل</p>
              </div>
            )}
          </div>
          <Button onClick={() => { setStep('upload'); setRows([]); setImportResult(null) }}>
            استيراد دفعة جديدة
          </Button>
        </Card>
      )}
    </div>
  )
}
