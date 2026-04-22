import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, TextArea } from '@/components/ui/Input'
import { formatCurrency, generateTrackingNumber } from '@/utils/helpers'
import { useNavigate } from 'react-router-dom'
import { Package, CheckCircle, AlertCircle } from 'lucide-react'
import type { Zone, PricingRule } from '@/types/database'
import toast from 'react-hot-toast'

// ─── Egyptian phone validation ─────────────────────────────────────────
const EGYPT_PHONE_REGEX = /^(010|011|012|015)\d{8}$/

function validateEgyptPhone(phone: string): string | null {
  const cleaned = phone.replace(/\s+/g, '').replace(/-/g, '')
  if (!cleaned) return 'رقم الهاتف مطلوب'
  if (!/^\d+$/.test(cleaned)) return 'يجب أن يحتوي الرقم على أرقام فقط'
  if (cleaned.length !== 11) return 'يجب أن يتكون الرقم من 11 رقماً'
  if (!EGYPT_PHONE_REGEX.test(cleaned)) return 'يجب أن يبدأ الرقم بـ 010 أو 011 أو 012 أو 015'
  return null
}

interface FormErrors {
  recipient_name?: string
  recipient_phone?: string
  recipient_address?: string
  zone_id?: string
  cod_amount?: string
}

export default function AddShipmentPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [zones, setZones] = useState<Zone[]>([])
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [pricingRule, setPricingRule] = useState<PricingRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [form, setForm] = useState({
    recipient_name: '',
    recipient_phone: '',
    recipient_phone2: '',
    recipient_address: '',
    recipient_notes: '',
    product_description: '',
    zone_id: '',
    weight: '1',
    quantity: '1',
    is_fragile: false,
    payment_method: 'cod',
    cod_amount: '0',
  })

  const [calculated, setCalculated] = useState({ delivery_fee: 0, cod_fee: 0, return_fee: 0, total: 0 })

  useEffect(() => {
    if (!user) return
    supabase.from('merchants').select('id').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setMerchantId(data.id)
    })
    supabase.from('zones').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setZones(data || []))
  }, [user])

  useEffect(() => {
    if (!form.zone_id) return
    const weight = parseFloat(form.weight) || 0
    supabase.from('pricing_rules')
      .select('*')
      .eq('zone_id', form.zone_id)
      .eq('is_active', true)
      .lte('weight_from', weight)
      .gte('weight_to', weight)
      .single()
      .then(({ data }) => {
        if (!data) {
          supabase.from('pricing_rules').select('*').eq('zone_id', form.zone_id).eq('is_active', true).order('weight_to', { ascending: false }).limit(1).single().then(({ data: fallback }) => {
            setPricingRule(fallback)
          })
        } else {
          setPricingRule(data)
        }
      })
  }, [form.zone_id, form.weight])

  useEffect(() => {
    if (!pricingRule) return
    const codAmount = parseFloat(form.cod_amount) || 0
    const weight = parseFloat(form.weight) || 1
    const basePrice = pricingRule.base_price
    const extraWeight = Math.max(0, weight - pricingRule.weight_from)
    const deliveryFee = basePrice + extraWeight * pricingRule.extra_kg_price
    const codFee = form.payment_method === 'cod' ? codAmount * (pricingRule.cod_fee_pct / 100) : 0
    const returnFee = pricingRule.return_fee
    setCalculated({ delivery_fee: deliveryFee, cod_fee: codFee, return_fee: returnFee, total: deliveryFee + codFee })
  }, [pricingRule, form.cod_amount, form.weight, form.payment_method])

  // ─── Real-time validation ─────────────────────────────────────────────
  function validateField(name: string, value: string): string | undefined {
    switch (name) {
      case 'recipient_name':
        if (!value.trim()) return 'اسم المستلم مطلوب'
        if (value.trim().length < 3) return 'الاسم يجب أن يكون 3 أحرف على الأقل'
        return undefined
      case 'recipient_phone': {
        const err = validateEgyptPhone(value)
        return err || undefined
      }
      case 'recipient_address':
        if (!value.trim()) return 'عنوان التسليم مطلوب'
        if (value.trim().length < 10) return 'يرجى كتابة العنوان بالتفصيل (المحافظة - الحي - الشارع)'
        return undefined
      case 'zone_id':
        if (!value) return 'يرجى اختيار منطقة التوصيل'
        return undefined
      case 'cod_amount':
        if (form.payment_method === 'cod') {
          const amount = parseFloat(value)
          if (isNaN(amount) || amount < 0) return 'يجب أن يكون المبلغ رقماً موجباً'
        }
        return undefined
      default:
        return undefined
    }
  }

  function handleChange(name: string, value: string | boolean) {
    setForm(f => ({ ...f, [name]: value }))
    if (touched[name] && typeof value === 'string') {
      const err = validateField(name, value)
      setErrors(prev => ({ ...prev, [name]: err }))
    }
  }

  function handleBlur(name: string, value: string) {
    setTouched(prev => ({ ...prev, [name]: true }))
    const err = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: err }))
  }

  function validateAll(): FormErrors {
    const newErrors: FormErrors = {}
    const fields: Array<keyof FormErrors> = ['recipient_name', 'recipient_phone', 'recipient_address', 'zone_id']
    for (const field of fields) {
      const val = form[field as keyof typeof form] as string
      const err = validateField(field, val)
      if (err) newErrors[field] = err
    }
    if (form.payment_method === 'cod') {
      const err = validateField('cod_amount', form.cod_amount)
      if (err) newErrors.cod_amount = err
    }
    return newErrors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Mark all required fields as touched
    setTouched({ recipient_name: true, recipient_phone: true, recipient_address: true, zone_id: true, cod_amount: true })

    const validationErrors = validateAll()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      const firstError = Object.values(validationErrors)[0]
      toast.error(firstError || 'يرجى تصحيح الأخطاء أولاً', { duration: 4000 })
      return
    }

    if (!merchantId) { toast.error('لم يتم ربط الحساب بتاجر'); return }

    setSaving(true)
    try {
      const trackingNumber = generateTrackingNumber()
      const { error } = await supabase.from('shipments').insert({
        tracking_number: trackingNumber,
        merchant_id: merchantId,
        zone_id: form.zone_id,
        recipient_name: form.recipient_name,
        recipient_phone: form.recipient_phone.replace(/\s+/g, ''),
        recipient_phone2: form.recipient_phone2 || null,
        recipient_address: form.recipient_address,
        recipient_notes: form.recipient_notes || null,
        product_description: form.product_description || null,
        weight: parseFloat(form.weight) || 1,
        quantity: parseInt(form.quantity) || 1,
        is_fragile: form.is_fragile,
        payment_method: form.payment_method as 'cod' | 'prepaid' | 'card',
        cod_amount: parseFloat(form.cod_amount) || 0,
        delivery_fee: calculated.delivery_fee,
        cod_fee: calculated.cod_fee,
        return_fee: calculated.return_fee,
        status: 'pending',
        attempts: 0,
      }).select().single()

      if (error) throw error

      setSuccess(trackingNumber)
      toast.success('تم إضافة الشحنة بنجاح! 🎉', { duration: 5000 })

      // Reset form
      setForm(prev => ({
        ...prev,
        recipient_name: '', recipient_phone: '', recipient_phone2: '',
        recipient_address: '', recipient_notes: '', product_description: '',
        cod_amount: '0', is_fragile: false,
      }))
      setErrors({})
      setTouched({})
    } catch (err: unknown) {
      console.error('Shipment creation error:', err)
      toast.error('فشل إضافة الشحنة، يرجى المحاولة مرة أخرى')
    } finally {
      setSaving(false)
    }
  }

  // ─── Error field component ────────────────────────────────────────────
  function FieldError({ error }: { error?: string }) {
    if (!error) return null
    return (
      <div
        className="flex items-center gap-1.5 mt-1 text-red-600"
        role="alert"
        data-testid="field-error"
        aria-live="polite"
      >
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-xs font-medium">{error}</span>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900">إضافة شحنة جديدة</h1>
        <p className="text-gray-500 text-sm">أدخل بيانات الشحنة لإنشاء طلب توصيل</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-800">تم إنشاء الشحنة بنجاح!</p>
            <p className="text-sm text-green-600">رقم التتبع: <span className="font-mono font-bold">{success}</span></p>
          </div>
          <button
            onClick={() => navigate('/merchant/waybills')}
            className="mr-auto text-sm text-green-700 hover:underline"
          >
            طباعة البوليصة
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Recipient Info */}
        <Card>
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            بيانات المستلم
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Recipient Name */}
              <div>
                <Input
                  label="اسم المستلم"
                  required
                  value={form.recipient_name}
                  onChange={e => handleChange('recipient_name', e.target.value)}
                  onBlur={e => handleBlur('recipient_name', e.target.value)}
                  placeholder="محمد أحمد"
                  className={errors.recipient_name && touched.recipient_name ? 'border-red-400 focus:ring-red-300' : ''}
                  data-testid="input-recipient-name"
                />
                <FieldError error={touched.recipient_name ? errors.recipient_name : undefined} />
              </div>

              {/* Phone */}
              <div>
                <Input
                  label="رقم الهاتف"
                  required
                  type="tel"
                  pattern="^(010|011|012|015)\d{8}$"
                  value={form.recipient_phone}
                  onChange={e => handleChange('recipient_phone', e.target.value)}
                  onBlur={e => handleBlur('recipient_phone', e.target.value)}
                  dir="ltr"
                  placeholder="01012345678"
                  maxLength={11}
                  className={errors.recipient_phone && touched.recipient_phone ? 'border-red-400 focus:ring-red-300' : ''}
                  data-testid="input-recipient-phone"
                  aria-required="true"
                  aria-invalid={!!errors.recipient_phone}
                  aria-describedby="phone-hint phone-error"
                />
                <p id="phone-hint" className="text-xs text-gray-400 mt-0.5">يبدأ بـ 010 أو 011 أو 012 أو 015</p>
                <FieldError error={touched.recipient_phone ? errors.recipient_phone : undefined} />
                {touched.recipient_phone && errors.recipient_phone && (
                  <span id="phone-error" className="sr-only">{errors.recipient_phone}</span>
                )}
              </div>
            </div>

            <Input
              label="هاتف بديل (اختياري)"
              type="tel"
              value={form.recipient_phone2}
              onChange={e => handleChange('recipient_phone2', e.target.value)}
              dir="ltr"
              placeholder="01098765432"
              maxLength={11}
            />

            {/* Address */}
            <div>
              <Input
                label="عنوان التسليم"
                required
                value={form.recipient_address}
                onChange={e => handleChange('recipient_address', e.target.value)}
                onBlur={e => handleBlur('recipient_address', e.target.value)}
                placeholder="المحافظة - الحي - الشارع - رقم العقار"
                className={errors.recipient_address && touched.recipient_address ? 'border-red-400 focus:ring-red-300' : ''}
                data-testid="input-recipient-address"
              />
              <FieldError error={touched.recipient_address ? errors.recipient_address : undefined} />
            </div>

            <TextArea
              label="ملاحظات التسليم"
              value={form.recipient_notes}
              onChange={e => handleChange('recipient_notes', e.target.value)}
              rows={2}
              placeholder="أمام بوابة المبنى..."
            />
          </div>
        </Card>

        {/* Shipment Details */}
        <Card>
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            تفاصيل الشحنة
          </h3>
          <div className="space-y-4">
            {/* Zone select */}
            <div>
              <Select
                label="منطقة التوصيل"
                required
                options={zones.map(z => ({ value: z.id, label: z.name }))}
                value={form.zone_id}
                onChange={e => {
                  handleChange('zone_id', e.target.value)
                  handleBlur('zone_id', e.target.value)
                }}
                placeholder="اختر المنطقة..."
                data-testid="select-zone"
              />
              <FieldError error={touched.zone_id ? errors.zone_id : undefined} />
            </div>

            <Input
              label="وصف المنتج"
              value={form.product_description}
              onChange={e => handleChange('product_description', e.target.value)}
              placeholder="ملابس، إلكترونيات..."
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="الوزن (كجم)"
                type="number"
                step="0.1"
                min="0.1"
                value={form.weight}
                onChange={e => handleChange('weight', e.target.value)}
              />
              <Input
                label="الكمية"
                type="number"
                min="1"
                value={form.quantity}
                onChange={e => handleChange('quantity', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="fragile"
                checked={form.is_fragile}
                onChange={e => handleChange('is_fragile', e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <label htmlFor="fragile" className="text-sm font-medium text-gray-700">قابل للكسر ⚠️</label>
            </div>
          </div>
        </Card>

        {/* Payment */}
        <Card>
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            طريقة الدفع
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="طريقة الدفع">
              {[
                { value: 'cod', label: 'الدفع عند الاستلام', icon: '💵' },
                { value: 'prepaid', label: 'مدفوع مسبقاً', icon: '✅' },
                { value: 'card', label: 'بطاقة ائتمان', icon: '💳' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={form.payment_method === opt.value}
                  onClick={() => handleChange('payment_method', opt.value)}
                  className={`p-3 rounded-xl border-2 text-center text-sm font-medium transition-all ${
                    form.payment_method === opt.value
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xl mb-1">{opt.icon}</div>
                  <div className="text-xs">{opt.label}</div>
                </button>
              ))}
            </div>

            {form.payment_method === 'cod' && (
              <div>
                <Input
                  label="مبلغ الاستلام (COD)"
                  type="number"
                  min="0"
                  value={form.cod_amount}
                  onChange={e => handleChange('cod_amount', e.target.value)}
                  onBlur={e => handleBlur('cod_amount', e.target.value)}
                  hint="المبلغ الذي سيتم تحصيله من المستلم"
                  data-testid="input-cod-amount"
                />
                <FieldError error={touched.cod_amount ? errors.cod_amount : undefined} />
              </div>
            )}
          </div>
        </Card>

        {/* Pricing Summary */}
        {pricingRule && (
          <Card className="bg-gray-50 border-dashed">
            <h3 className="font-bold text-gray-700 mb-3">ملخص التسعير</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">رسوم التوصيل</span>
                <span className="font-semibold">{formatCurrency(calculated.delivery_fee)}</span>
              </div>
              {calculated.cod_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">رسوم COD ({pricingRule.cod_fee_pct}%)</span>
                  <span className="font-semibold">{formatCurrency(calculated.cod_fee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">رسوم الإرجاع (في حالة الإرجاع)</span>
                <span className="font-semibold text-orange-600">{formatCurrency(calculated.return_fee)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                <span>الإجمالي المستحق</span>
                <span className="text-green-600">{formatCurrency(calculated.total)}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          loading={saving}
          size="lg"
          className="w-full"
          icon={<Package className="w-5 h-5" />}
          data-testid="btn-submit-shipment"
        >
          إضافة الشحنة
        </Button>
      </form>
    </div>
  )
}
