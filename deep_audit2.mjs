import { chromium } from '@playwright/test'

const SITE = 'https://ship-pro-roan.vercel.app'
const SUPA = 'https://uyciwmoavtqmhazhkmmu.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Y2l3bW9hdnRxbWhhemhrbW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTI1NjIsImV4cCI6MjA5MjAyODU2Mn0.VE9VgRrBf_V-Sds1Yakukti-g7IuWe4tjR5bA44Cflw'

const results = []
function log(m, ok, d='') { console.log((ok?'✅':'❌'),m,d?'— '+d:''); results.push({m,ok,d}) }

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ locale: 'ar-EG', viewport: {width:1366, height:900} })
const page = await ctx.newPage()
page.setDefaultTimeout(20000)

async function safeText(sel = 'main') {
  try { return await page.locator(sel).innerText({ timeout: 10000 }) }
  catch { return '' }
}
async function safeGoto(url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(3000)
}

// ============ A. LOGIN ============
console.log('\n━━━━ A. تسجيل الدخول ━━━━')
await safeGoto(`${SITE}/login`)
await page.locator('input[type=email]').fill('admin@shippro.eg')
await page.locator('input[type=password]').fill('Admin@123456')
await page.locator('button[type=submit]').click()
await page.waitForURL('**/admin', { timeout: 15000 }).catch(() => {})
await page.waitForTimeout(2500)
log('Admin login', page.url().includes('/admin'))

// ============ B. DASHBOARD ============
console.log('\n━━━━ B. لوحة التحكم — البيانات ━━━━')
await safeGoto(`${SITE}/admin`)
const dash = await safeText()
log('"إجمالي الشحنات"', dash.includes('إجمالي الشحنات'))
log('"تم التسليم اليوم"', dash.includes('تم التسليم اليوم'))
log('"معدل التسليم"', dash.includes('معدل التسليم'))
log('"إجمالي COD المحصَّل"', dash.includes('COD'))
log('"إيرادات اليوم"', dash.includes('إيرادات'))
log('"الشحنات خلال 7 أيام" chart', dash.includes('الشحنات خلال 7 أيام'))
const has44 = dash.includes('٤٤') || dash.includes('44')
log('عدد الشحنات الفعلي = 44', has44)

// ============ C. SHIPMENTS ============
console.log('\n━━━━ C. الشحنات — عمليات شاملة ━━━━')
await safeGoto(`${SITE}/admin/shipments`)
const ship = await safeText()
log('صفحة الشحنات', ship.includes('شحنة') || ship.includes('Shipments'))
log('شريط البحث', (await page.locator('input[placeholder*=بحث]').count()) > 0)
log('فلتر الحالة', (await page.locator('select').count()) > 0)
log('زر تصدير Excel', ship.includes('تصدير'))
const rows = await page.locator('tbody tr').count()
log(`جدول يعرض ${rows} صف`, rows > 0)

// Test search
const searchInput = page.locator('input[placeholder*=بحث]').first()
if (await searchInput.count() > 0) {
  await searchInput.fill('SP')
  await page.waitForTimeout(2500)
  const filteredRows = await page.locator('tbody tr').count()
  log('البحث يعمل ويفلتر النتائج', filteredRows > 0)
  await searchInput.fill('')
}

// ============ D. COURIERS ============
console.log('\n━━━━ D. المناديب ━━━━')
await safeGoto(`${SITE}/admin/couriers`)
const cour = await safeText()
log('صفحة المناديب', cour.length > 50)
log('بطاقات/جدول المناديب', cour.includes('مندوب') || cour.includes('سائق'))

// ============ E. MERCHANTS ============
console.log('\n━━━━ E. التجار ━━━━')
await safeGoto(`${SITE}/admin/merchants`)
const merch = await safeText()
log('صفحة التجار', merch.length > 50)
log('بيانات التجار', merch.includes('متجر') || merch.includes('تاجر'))

// ============ F. PRICING/ZONES ============
console.log('\n━━━━ F. التسعير والمناطق ━━━━')
await safeGoto(`${SITE}/admin/pricing`)
const pr = await safeText()
log('صفحة التسعير', pr.length > 50)
log('عرض المناطق', pr.includes('القاهرة') || pr.includes('منطقة'))

// ============ G. FINANCE ============
console.log('\n━━━━ G. المالية ━━━━')
await safeGoto(`${SITE}/admin/finance`)
const fn = await safeText()
log('صفحة المالية', fn.length > 50)
log('عرض ج.م', fn.includes('ج.م') || fn.includes('EGP'))

await safeGoto(`${SITE}/admin/collections`)
const col = await safeText()
log('صفحة تحصيلات المناديب', col.length > 50)

await safeGoto(`${SITE}/admin/import`)
const imp = await safeText()
log('صفحة استيراد الشحنات', imp.length > 50 && imp.includes('استيراد'))

// ============ H. WMS ============
console.log('\n━━━━ H. WMS ━━━━')
await safeGoto(`${SITE}/admin/warehouses`)
const wh = await safeText()
log('صفحة المخازن', wh.includes('إدارة المخازن'))
log('بطاقات إحصائية', wh.includes('المخازن') && wh.includes('الأرفف'))

// ============ I. TICKETS ============
console.log('\n━━━━ I. التذاكر ━━━━')
await safeGoto(`${SITE}/admin/tickets`)
const tk = await safeText()
log('صفحة التذاكر', tk.includes('تذاكر'))
log('فلاتر الحالة', tk.includes('مفتوحة'))

// ============ J. SYSTEM ============
console.log('\n━━━━ J. إعدادات النظام ━━━━')
await safeGoto(`${SITE}/admin/system`)
const sys = await safeText()
log('صفحة إعدادات النظام', sys.includes('إعدادات النظام'))
log('Migration applied banner', sys.includes('جميع الموديولات المؤسسية مفعّلة'))
log('5 جداول خضراء', !sys.includes('غير موجود'))

// ============ K. BELL NOTIFICATIONS ============
console.log('\n━━━━ K. جرس الإشعارات ━━━━')
await safeGoto(`${SITE}/admin`)
const bellBtn = page.locator('button[title*=الإشعارات]').first()
log('جرس الإشعارات موجود', (await bellBtn.count()) > 0)
if (await bellBtn.count() > 0) {
  await bellBtn.click()
  await page.waitForTimeout(1500)
  const bellPanel = await page.locator('body').innerText()
  log('قائمة الإشعارات تفتح', bellPanel.includes('الإشعارات'))
  await page.keyboard.press('Escape')
}

// ============ L. MERCHANT PORTAL ============
console.log('\n━━━━ L. بوابة التاجر ━━━━')
await page.evaluate(() => localStorage.clear())
await safeGoto(`${SITE}/login`)
await page.locator('input[type=email]').fill('merchant@shippro.eg')
await page.locator('input[type=password]').fill('Merchant@123456')
await page.locator('button[type=submit]').click()
await page.waitForURL('**/merchant', { timeout: 15000 }).catch(() => {})
await page.waitForTimeout(2500)
log('Merchant login', page.url().includes('/merchant'))

const md = await safeText()
log('Dashboard التاجر', md.length > 50)

// Check finance
await safeGoto(`${SITE}/merchant/finance`)
const mfin = await safeText()
log('المالية للتاجر تعرض رصيد', mfin.includes('الرصيد') || mfin.includes('ج.م'))
log('سجل التسويات', mfin.includes('تسوية') || mfin.includes('سجل'))

// Check shipments
await safeGoto(`${SITE}/merchant/shipments`)
const msh = await safeText()
log('شحنات التاجر', msh.length > 50)

// Waybills with paper size selector
await safeGoto(`${SITE}/merchant/waybills`)
const mwb = await safeText()
log('بوالص الشحن', mwb.includes('بوالص'))
const sels = await page.locator('select').count()
log('قائمة حجم البوليصة', sels > 0)
if (sels > 0) {
  const opts = await page.locator('select').first().locator('option').allTextContents()
  log('A4 + thermal options', opts.length === 3 && opts.some(o => o.includes('A4')))
}

// Tickets
await safeGoto(`${SITE}/merchant/tickets`)
const mtk = await safeText()
log('تذاكر التاجر', mtk.includes('الدعم'))

// ============ M. DRIVER PORTAL ============
console.log('\n━━━━ M. تطبيق المندوب ━━━━')
await page.evaluate(() => localStorage.clear())
await safeGoto(`${SITE}/login`)
await page.locator('input[type=email]').fill('driver@shippro.eg')
await page.locator('input[type=password]').fill('Driver@123456')
await page.locator('button[type=submit]').click()
await page.waitForURL('**/driver', { timeout: 15000 }).catch(() => {})
await page.waitForTimeout(2500)
log('Driver login', page.url().includes('/driver'))

const dd = await safeText()
log('Dashboard المندوب', dd.length > 30)

await safeGoto(`${SITE}/driver/shipments`)
const dsh = await safeText()
log('شحنات المندوب', dsh.length > 30)

await safeGoto(`${SITE}/driver/collections`)
const dcol = await safeText()
log('تحصيلات المندوب', dcol.length > 30)

// ============ N. PUBLIC TRACKING ============
console.log('\n━━━━ N. التتبع العام ━━━━')
await page.evaluate(() => localStorage.clear())
await safeGoto(`${SITE}/track`)
const tr = await safeText('body')
log('صفحة التتبع', tr.length > 50)
const trInput = await page.locator('input').count()
log('حقل رقم التتبع', trInput > 0)

// Track real shipment
const r = await page.request.get(`${SUPA}/rest/v1/shipments?select=tracking_number&limit=1`, {
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
})
const ships = await r.json()
if (ships && ships[0]) {
  const tn = ships[0].tracking_number
  console.log(`  Test tracking: ${tn}`)
  await page.locator('input').first().fill(tn)
  await page.locator('button[type=submit], button:has-text("تتبع"), button:has-text("بحث")').first().click()
  await page.waitForTimeout(3500)
  const result = await safeText('body')
  log('نتيجة التتبع تظهر بيانات', result.includes(tn) || result.includes('تسلسل') || result.includes('في الانتظار'))
}

// ============ O. RLS SECURITY ============
console.log('\n━━━━ O. اختبار أمني — RLS ━━━━')
// Try accessing tickets with anon key (should fail)
const tickResp = await page.request.get(`${SUPA}/rest/v1/tickets?select=*&limit=5`, {
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
})
const tickData = await tickResp.json()
log('RLS يحمي tickets من anon', Array.isArray(tickData) && tickData.length === 0)

// API endpoint
const api = await page.request.get(`${SITE}/api/admin/migrate`)
const apiData = await api.json()
log('API status check', api.status() === 200)
log('enterprise_migration_applied', apiData.enterprise_migration_applied === true)
log('all 5 tables exist', Object.values(apiData.tables).every(v => v))

// ============ SUMMARY ============
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
const passed = results.filter(r=>r.ok).length
const failed = results.length - passed
console.log(`✅ ناجح: ${passed} / ${results.length}`)
console.log(`📊 نسبة النجاح: ${(passed/results.length*100).toFixed(1)}%`)
if (failed > 0) {
  console.log('\nالفاشلة:')
  results.filter(r=>!r.ok).forEach(r => console.log('  -', r.m))
}

await browser.close()
