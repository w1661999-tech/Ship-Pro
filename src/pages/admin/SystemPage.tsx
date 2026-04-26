import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  Settings, CheckCircle, AlertTriangle, Copy, ExternalLink,
  Loader2, Database, Zap, Eye, EyeOff, Key
} from 'lucide-react'
import toast from 'react-hot-toast'

interface SchemaStatus {
  ok: boolean
  enterprise_migration_applied: boolean
  partially_applied: boolean
  tables: Record<string, boolean>
  bootstrap_installed: boolean
  bootstrap_sql: string | null
  dashboard_sql_editor: string
  database_settings: string
}

const MCP_TOKEN = 'sk_mcp_ship_pro_2026_main_production_token_v1_7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c'

export default function SystemPage() {
  const [status, setStatus] = useState<SchemaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [showOneClick, setShowOneClick] = useState(false)
  const [dbPassword, setDbPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [applying, setApplying] = useState(false)

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

  const applyMigration = async () => {
    if (!dbPassword || dbPassword.length < 6) {
      toast.error('يرجى إدخال كلمة مرور قاعدة البيانات')
      return
    }
    setApplying(true)
    try {
      const res = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MCP_TOKEN}`,
        },
        body: JSON.stringify({
          migrationFile: '20260423_enterprise_modules',
          dbPassword,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success('🎉 تم تطبيق Migration بنجاح! جميع الموديولات الجديدة جاهزة للعمل')
        setShowOneClick(false)
        setDbPassword('')
        // Refresh status
        await load()
      } else {
        toast.error('فشل التطبيق: ' + (data.error || 'خطأ غير معروف'))
      }
    } catch (e) {
      toast.error('فشل الاتصال: ' + (e as Error).message)
    }
    setApplying(false)
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
                : 'بعض الجداول الضرورية غير موجودة بعد. اضغط الزر أدناه للتفعيل بنقرة واحدة.'}
            </p>
          </div>
          <Button variant="secondary" onClick={load}>
            تحديث
          </Button>
        </div>
      </Card>

      {/* One-click apply (highlighted) */}
      {!isFullyApplied && (
        <Card className="border-2 border-blue-300 bg-gradient-to-l from-blue-50 to-indigo-50">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-blue-900 mb-1">تفعيل Migration بنقرة واحدة ⚡</h3>
              <p className="text-sm text-blue-800 mb-3">
                أسرع وأسهل طريقة: أدخل كلمة مرور قاعدة البيانات (Database Password) ثم اضغط "تطبيق". لن يتم تخزين كلمة المرور في أي مكان.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => setShowOneClick(true)}>
                  <Zap className="w-4 h-4 ml-1" />
                  تفعيل الآن
                </Button>
                <a
                  href={status.database_settings}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 px-3 py-2 border border-blue-300 rounded-lg bg-white"
                >
                  <Key className="w-4 h-4" />
                  أين أجد كلمة المرور؟
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </Card>
      )}

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

      {/* Manual instructions (fallback) */}
      {!isFullyApplied && (
        <Card>
          <h3 className="font-bold text-gray-900 mb-3">طريقة بديلة (يدوية)</h3>

          <div className="space-y-4">
            <div className="border-r-4 border-gray-300 pr-4">
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

            <div className="border-r-4 border-gray-300 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="info">خطوة 2</Badge>
                <h4 className="font-bold">انسخ محتوى ملف الـ Migration</h4>
              </div>
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

            <div className="border-r-4 border-gray-300 pr-4">
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
                ستظهر الجداول الجديدة بعلامة ✓ خضراء، وستعمل جميع الموديولات الجديدة.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* One-click modal */}
      {showOneClick && (
        <Modal isOpen onClose={() => setShowOneClick(false)} title="تفعيل Migration بنقرة واحدة">
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
              <strong>كلمة مرور قاعدة البيانات</strong> تجدها في:
              <br />
              Supabase Dashboard → Project Settings → Database → Connection string
              <br />
              <a
                href={status.database_settings}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold mt-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                فتح صفحة Database Settings
              </a>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                كلمة مرور قاعدة البيانات <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={dbPassword}
                  onChange={e => setDbPassword(e.target.value)}
                  placeholder="paste your DB password here"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ⚠️ كلمة المرور تُرسل لمرة واحدة فقط ولا يتم تخزينها.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowOneClick(false)} disabled={applying}>
                إلغاء
              </Button>
              <Button onClick={applyMigration} disabled={applying || dbPassword.length < 6}>
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-1" />
                    جارٍ التطبيق...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 ml-1" />
                    تطبيق Migration الآن
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
