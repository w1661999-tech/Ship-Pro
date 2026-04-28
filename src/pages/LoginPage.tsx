import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Truck, Eye, EyeOff, Loader2, Package, Search, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showDemo, setShowDemo] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      if (error) throw error

      if (data.user) {
        const { data: shipUser, error: userError } = await supabase
          .from('ship_users')
          .select('*')
          .eq('auth_id', data.user.id)
          .single()

        if (userError || !shipUser) {
          throw new Error('لم يتم العثور على بيانات المستخدم')
        }

        setUser(shipUser)

        if (shipUser.role === 'admin') navigate('/admin')
        else if (shipUser.role === 'merchant') navigate('/merchant')
        else if (shipUser.role === 'driver') navigate('/driver')
        else navigate('/admin')

        toast.success(`مرحباً ${shipUser.full_name}! 👋`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تسجيل الدخول'
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      } else if (msg.includes('Email not confirmed')) {
        toast.error('يرجى تأكيد البريد الإلكتروني أولاً')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const demoAccounts = [
    { role: 'مدير النظام', email: 'admin@shippro.eg', password: 'Admin@123456', color: '#3b82f6', icon: Shield, desc: 'لوحة التحكم الكاملة' },
    { role: 'تاجر', email: 'merchant@shippro.eg', password: 'Merchant@123', color: '#22c55e', icon: Package, desc: 'إدارة الشحنات والتسويات' },
    { role: 'مندوب توصيل', email: 'driver@shippro.eg', password: 'Driver@123', color: '#f97316', icon: Truck, desc: 'عمليات التوصيل والتحصيل' },
  ]

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e1b4b 100%)' }}
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-10 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #22c55e, transparent)' }} />
      </div>

      <div className="w-full max-w-md relative z-10" dir="rtl">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            <Truck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Ship Pro</h1>
          <p className="text-blue-300/70 text-sm mt-1">نظام الشحن الاحترافي لمصر</p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl p-7 shadow-2xl border"
          style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <h2 className="text-lg font-bold text-white mb-5 text-center">تسجيل الدخول إلى حسابك</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="example@shippro.eg"
                autoComplete="email"
                className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                dir="ltr"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 pl-11 text-white text-sm placeholder:text-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-bold py-3.5 rounded-xl text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg mt-1"
              style={{ background: loading ? 'rgba(59,130,246,0.7)' : 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'جارٍ تسجيل الدخول...' : 'دخول'}
            </button>
          </form>

          {/* Demo Accounts Toggle */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="w-full flex items-center justify-between text-sm text-blue-200/70 hover:text-blue-200 transition-colors"
            >
              <span>حسابات تجريبية للاستعراض</span>
              {showDemo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDemo && (
              <div className="mt-3 space-y-2">
                {demoAccounts.map(acc => {
                  const Icon = acc.icon
                  return (
                    <button
                      key={acc.role}
                      onClick={() => setForm({ email: acc.email, password: acc.password })}
                      className="w-full text-right rounded-xl px-3.5 py-2.5 transition-all flex items-center gap-3 group"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: acc.color + '20' }}
                      >
                        <Icon className="w-4 h-4" style={{ color: acc.color }} />
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-sm font-bold text-white">{acc.role}</p>
                        <p className="text-xs" style={{ color: acc.color + 'cc' }}>{acc.desc}</p>
                      </div>
                      <p className="text-xs text-blue-200/50 font-mono" dir="ltr">{acc.email}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Track Link */}
        <div className="mt-4 text-center">
          <Link
            to="/track"
            className="inline-flex items-center gap-2 text-sm text-blue-300/70 hover:text-blue-200 transition-colors"
          >
            <Search className="w-4 h-4" />
            تتبع شحنة بدون تسجيل دخول
          </Link>
        </div>

        <p className="text-center text-blue-300/30 text-xs mt-5">
          Ship Pro v2.0 © 2026 — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  )
}
