import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Settings, CheckCircle, AlertTriangle, Copy, ExternalLink, Loader2, Database } from 'lucide-react'
import toast from 'react-hot-toast'

interface SchemaStatus {
  ok: boolean
  enterprise_migration_applied: boolean
  partially_applied: boolean
  tables: Record<string, boolean>
  bootstrap_installed: boolean
  bootstrap_sql: string | null
  dashboard_sql_editor: string
}

export default function SystemPage() {
  const [status, setStatus] = useState<SchemaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/migrate')
      const data = await res.json()
      setStatus(data)
    } catch (e) {
      toast.error('فشل في الحصول على حالة النظام')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success('تم النسخ إلى الحافظة')
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!status) {
    return (
      <Card>
        <p className="text-center text-gray-500">تعذر تحميل حالة النظام</p>
      </Card>
    )
  }

  const isFullyApplied = status.enterprise_migration_applied

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          إعدادات النظام وقاعدة البيانات
        </h1>
        <p className="text-sm text-gray-500 mt-1">مراقبة حالة الـ schema وإدارة الـ migrations</p>
      </div>

      {/* Overall Status */}
      <Card className={`border-2 ${isFullyApplied ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-start gap-3">
          {isFullyApplied ? (
            <CheckCircle className="w-10 h-10 text-green-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-10 h-10 text-amber-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h2 className={`text-lg font-black ${isFullyApplied ? 'text-green-800' : 'text-amber-800'}`}>
              {isFullyApplied
                ? 'جميع الموديولات المؤسسية مفعّلة ✓'
                : 'يحتاج النظام إلى تطبيق Migration'}
            </h2>
            <p className={`text-sm mt-1 ${isFullyApplied ? 'text-green-700' : 'text-amber-700'}`}>
              {isFullyApplied
                ? 'الجداول الإضافية (Tickets, WMS, Notifications, Audit, Webhooks) جاهزة للعمل.'
                : 'بعض الجداول الضرورية غير موجودة بعد. اتبع الخطوات أدناه لتفعيلها.'}
            </p>
          </div>
          <Button variant="secondary" onClick={load}>
            <Loader2 className="w-4 h-4 ml-1" />
            تحديث
          </Button>
        </div>
      </Card>

      {/* Tables status */}
      <Card>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          حالة الجداول الجديدة
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(status.tables).map(([name, exists]) => (
            <div key={name} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              exists ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              {exists ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
              <code className={`text-xs font-mono ${exists ? 'text-green-800' : 'text-red-800'}`} dir="ltr">{name}</code>
            </div>
          ))}
        </div>
      </Card>

      {/* Step-by-step instructions if migration needed */}
      {!isFullyApplied && (
        <Card>
          <h3 className="font-bold text-gray-900 mb-3">خطوات تطبيق الـ Migration</h3>

          <div className="space-y-4">
            <div className="border-r-4 border-blue-500 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="info">خطوة 1</Badge>
                <h4 className="font-bold">افتح Supabase SQL Editor</h4>
              </div>
              <a
                href={status.dashboard_sql_editor}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                فتح المحرر في Supabase Dashboard
              </a>
            </div>

            <div className="border-r-4 border-blue-500 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="info">خطوة 2</Badge>
                <h4 className="font-bold">انسخ محتوى ملف الـ Migration</h4>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                الملف موجود في المستودع على الرابط:
              </p>
              <a
                href="https://github.com/w1661999-tech/Ship-Pro/blob/main/supabase/migrations/20260423_enterprise_modules.sql"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                عرض الملف على GitHub
              </a>
              <p className="text-xs text-gray-500 mt-2">
                اضغط على زر <strong>Raw</strong> في GitHub ثم انسخ كامل المحتوى.
              </p>
            </div>

            <div className="border-r-4 border-blue-500 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="info">خطوة 3</Badge>
                <h4 className="font-bold">الصقه في المحرر واضغط Run</h4>
              </div>
              <p className="text-sm text-gray-600">
                سيتم إنشاء 11 جدول جديد + 6 enums + 20+ RLS policy + تفعيل Realtime.
              </p>
            </div>

            <div className="border-r-4 border-green-500 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="success">خطوة 4</Badge>
                <h4 className="font-bold">ارجع لهذه الصفحة واضغط "تحديث"</h4>
              </div>
              <p className="text-sm text-gray-600">
                ستظهر الجداول الجديدة بعلامة ✓ خضراء، وستعمل جميع الموديولات الجديدة (تذاكر، مخازن، إشعارات).
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Advanced: bootstrap + programmatic migration */}
      {!status.bootstrap_installed && !isFullyApplied && (
        <Card className="bg-gray-50">
          <h3 className="font-bold text-gray-900 mb-2">طريقة بديلة متقدمة (للمطورين)</h3>
          <p className="text-sm text-gray-600 mb-3">
            إذا كنت ترغب في تطبيق migrations مستقبلية برمجياً عبر API، شغّل هذا الـ bootstrap SQL مرة واحدة:
          </p>
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto" dir="ltr">
              {status.bootstrap_sql}
            </pre>
            {status.bootstrap_sql && (
              <button
                onClick={() => copy(status.bootstrap_sql!, 'bootstrap')}
                className="absolute top-2 left-2 bg-white/10 hover:bg-white/20 text-white p-1.5 rounded"
                title="نسخ"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div>
          {copied === 'bootstrap' && <p className="text-xs text-green-600 mt-1">تم النسخ!</p>}
        </Card>
      )}
    </div>
  )
}
