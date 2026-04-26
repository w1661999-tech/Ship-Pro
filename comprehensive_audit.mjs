import { chromium } from 'playwright'

const SITE = 'https://ship-pro-roan.vercel.app'
const ADMIN = { email: 'admin@shippro.eg', password: 'Admin@123456' }
const MERCHANT = { email: 'merchant@shippro.eg', password: 'Merchant@123' }
const DRIVER = { email: 'driver@shippro.eg', password: 'Driver@123' }

const results = []
const ok = (n, d='') => { results.push({ ok: true, n, d }); console.log(`✅ ${n}`, d) }
const fail = (n, d='') => { results.push({ ok: false, n, d }); console.log(`❌ ${n}`, d) }

async function login(page, creds) {
  await page.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(800)
  await page.fill('input[type="email"]', creds.email)
  await page.fill('input[type="password"]', creds.password)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(3500)
}

async function safeText(page, selector='main', timeout=8000) {
  try {
    let txt = ''
    try {
      const el = await page.locator(selector).first()
      await el.waitFor({ timeout })
      txt = await el.innerText()
    } catch {}
    if (!txt || txt.length < 30) {
      try { txt = await page.locator('body').innerText() } catch {}
    }
    return (txt || '').slice(0, 4000)
  } catch { return '' }
}

const browser = await chromium.launch({ headless: true })

// =============== ADMIN PORTAL ===============
console.log('\n========== ADMIN PORTAL ==========')
let ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
let page = await ctx.newPage()

await login(page, ADMIN)
if (page.url().includes('/admin')) ok('Admin login redirect')
else fail('Admin login redirect', 'url=' + page.url())

// Dashboard
await page.goto(`${SITE}/admin`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)
const dash = await safeText(page)
if (dash.includes('شحنة') || dash.includes('شحنات')) ok('Admin dashboard loads')
else fail('Admin dashboard loads')

// Shipments
await page.goto(`${SITE}/admin/shipments`)
await page.waitForTimeout(2500)
const ships = await safeText(page)
if (ships.includes('الشحنات') || ships.includes('بحث')) ok('Admin shipments page')
else fail('Admin shipments page')
if (ships.includes('تصدير')) ok('Excel export button visible')
else fail('Excel export button visible')

// Couriers
await page.goto(`${SITE}/admin/couriers`)
await page.waitForTimeout(2500)
const couriers = await safeText(page)
if (couriers.includes('مندوب') || couriers.includes('السائقين') || couriers.includes('المناديب')) ok('Admin couriers page')
else fail('Admin couriers page', couriers.slice(0, 100))

// Merchants
await page.goto(`${SITE}/admin/merchants`)
await page.waitForTimeout(2500)
const merch = await safeText(page)
if (merch.includes('تاجر') || merch.includes('التجار')) ok('Admin merchants page')
else fail('Admin merchants page')

// Pricing
await page.goto(`${SITE}/admin/pricing`)
await page.waitForTimeout(2500)
const pricing = await safeText(page)
if (pricing.includes('سعر') || pricing.includes('منطقة') || pricing.includes('المناطق') || pricing.includes('التسعير')) ok('Admin pricing/zones page')
else fail('Admin pricing/zones page')

// Finance
await page.goto(`${SITE}/admin/finance`)
await page.waitForTimeout(2500)
const fin = await safeText(page)
if (fin.includes('مالي') || fin.includes('معامل') || fin.includes('تسوي')) ok('Admin finance page')
else fail('Admin finance page')

// Collections
await page.goto(`${SITE}/admin/collections`)
await page.waitForTimeout(2500)
const coll = await safeText(page)
if (coll.includes('تحصيل') || coll.includes('مندوب')) ok('Admin collections page')
else fail('Admin collections page')

// Import
await page.goto(`${SITE}/admin/import`)
await page.waitForTimeout(2500)
const imp = await safeText(page)
if (imp.includes('استيراد') || imp.includes('Excel') || imp.includes('CSV')) ok('Admin import page')
else fail('Admin import page')

// Warehouses (NEW)
await page.goto(`${SITE}/admin/warehouses`)
await page.waitForTimeout(2500)
const wh = await safeText(page)
if (wh.includes('مخزن') || wh.includes('المخازن')) ok('Admin warehouses page (NEW)')
else fail('Admin warehouses page', wh.slice(0,100))
if (wh.includes('مخزن جديد') || wh.includes('رف جديد')) ok('WMS create buttons')
else fail('WMS create buttons')

// Tickets (NEW)
await page.goto(`${SITE}/admin/tickets`)
await page.waitForTimeout(2500)
const tk = await safeText(page)
if (tk.includes('تذكر') || tk.includes('الدعم')) ok('Admin tickets page (NEW)')
else fail('Admin tickets page')

// System (NEW)
await page.goto(`${SITE}/admin/system`)
await page.waitForTimeout(2500)
const sys = await safeText(page)
if (sys.includes('Migration') || sys.includes('قاعدة') || sys.includes('النظام')) ok('Admin system page (NEW)')
else fail('Admin system page')

// Notification bell
const bell = await page.locator('button:has(svg.lucide-bell), [aria-label*="notif" i], button[title*="Notif" i]').count()
if (bell > 0) ok('Notification bell present')
else fail('Notification bell')

await ctx.close()

// =============== MERCHANT PORTAL ===============
console.log('\n========== MERCHANT PORTAL ==========')
ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
page = await ctx.newPage()

await login(page, MERCHANT)
if (page.url().includes('/merchant')) ok('Merchant login redirect')
else fail('Merchant login redirect')

// Dashboard
await page.goto(`${SITE}/merchant`)
await page.waitForTimeout(2500)
const mDash = await safeText(page)
if (mDash.length > 50) ok('Merchant dashboard')
else fail('Merchant dashboard')

// Shipments
await page.goto(`${SITE}/merchant/shipments`)
await page.waitForTimeout(2500)
const mShips = await safeText(page)
if (mShips.includes('شحن') || mShips.includes('بحث')) ok('Merchant shipments')
else fail('Merchant shipments')

// Add shipment
await page.goto(`${SITE}/merchant/add-shipment`)
await page.waitForTimeout(2500)
const addS = await safeText(page)
if (addS.includes('شحنة') || addS.includes('إضافة')) ok('Add shipment page')
else fail('Add shipment page')

// Import
await page.goto(`${SITE}/merchant/import`)
await page.waitForTimeout(2500)
const mImp = await safeText(page)
if (mImp.includes('استيراد') || mImp.includes('Excel')) ok('Merchant import page')
else fail('Merchant import page')

// Waybills (with thermal sizes)
await page.goto(`${SITE}/merchant/waybills`)
await page.waitForTimeout(2500)
const wb = await safeText(page)
if (wb.includes('بوليصة') || wb.includes('بوالص')) ok('Merchant waybills page')
else fail('Merchant waybills page')

// Finance
await page.goto(`${SITE}/merchant/finance`)
await page.waitForTimeout(2500)
const mFin = await safeText(page)
if (mFin.includes('رصيد') || mFin.includes('مالي') || mFin.includes('تسوي')) ok('Merchant finance page')
else fail('Merchant finance page')

// Tickets (NEW)
await page.goto(`${SITE}/merchant/tickets`)
await page.waitForTimeout(2500)
const mTk = await safeText(page)
if (mTk.includes('تذكر') || mTk.includes('الدعم')) ok('Merchant tickets page (NEW)')
else fail('Merchant tickets page')

await ctx.close()

// =============== DRIVER PORTAL ===============
console.log('\n========== DRIVER PORTAL ==========')
ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
page = await ctx.newPage()

await login(page, DRIVER)
if (page.url().includes('/driver')) ok('Driver login redirect')
else fail('Driver login redirect')

await page.goto(`${SITE}/driver`)
await page.waitForTimeout(2500)
const dDash = await safeText(page)
if (dDash.length > 30) ok('Driver dashboard')
else fail('Driver dashboard')

await page.goto(`${SITE}/driver/shipments`)
await page.waitForTimeout(2500)
const dShips = await safeText(page)
if (dShips.includes('شحن') || dShips.length > 50) ok('Driver shipments')
else fail('Driver shipments')

await page.goto(`${SITE}/driver/collections`)
await page.waitForTimeout(2500)
const dColl = await safeText(page)
if (dColl.includes('تحصيل') || dColl.length > 30) ok('Driver collections')
else fail('Driver collections')

await ctx.close()

// =============== PUBLIC TRACKING ===============
console.log('\n========== PUBLIC TRACKING ==========')
ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
page = await ctx.newPage()
await page.goto(`${SITE}/track`)
await page.waitForTimeout(2000)
const trk = await safeText(page)
if (trk.includes('تتبع') || trk.includes('شحنة')) ok('Public tracking page')
else fail('Public tracking page')

await page.goto(`${SITE}/login`)
await page.waitForTimeout(1500)
const lg = await safeText(page)
if (lg.includes('تسجيل') || lg.includes('Ship Pro')) ok('Login page renders')
else fail('Login page renders')

await ctx.close()

// =============== API ENDPOINTS ===============
console.log('\n========== API ENDPOINTS ==========')
const r1 = await fetch(`${SITE}/api/admin/migrate`)
const j1 = await r1.json()
if (j1.ok && j1.enterprise_migration_applied) ok('GET /api/admin/migrate OK', `tables=${Object.keys(j1.tables||{}).length}`)
else fail('GET /api/admin/migrate', JSON.stringify(j1).slice(0,150))

const r2 = await fetch(`${SITE}/api/admin/migrate`, { method: 'POST' })
if (r2.status === 401) ok('Migrate endpoint protected (401 without token)')
else fail('Migrate endpoint protection', `got ${r2.status}`)

// =============== HTTP HEALTH ===============
console.log('\n========== HTTP HEALTH ==========')
const routes = ['/', '/login', '/track', '/admin', '/admin/shipments', '/admin/warehouses',
  '/admin/tickets', '/admin/system', '/admin/finance', '/admin/couriers', '/admin/merchants',
  '/admin/pricing', '/admin/collections', '/admin/import',
  '/merchant', '/merchant/shipments', '/merchant/add-shipment', '/merchant/waybills',
  '/merchant/finance', '/merchant/tickets', '/merchant/import',
  '/driver', '/driver/shipments', '/driver/collections']
let httpPass = 0
for (const r of routes) {
  const x = await fetch(`${SITE}${r}`)
  if (x.status === 200) httpPass++
}
if (httpPass === routes.length) ok(`All ${routes.length} routes HTTP 200`)
else fail(`HTTP routes ${httpPass}/${routes.length}`)

await browser.close()

// =============== SUMMARY ===============
const passed = results.filter(r => r.ok).length
const failed = results.filter(r => !r.ok).length
const total = results.length
console.log('\n' + '='.repeat(50))
console.log(`SUMMARY: ${passed}/${total} passed (${(passed/total*100).toFixed(1)}%)`)
console.log('='.repeat(50))
if (failed) {
  console.log('\nFailed checks:')
  results.filter(r => !r.ok).forEach(r => console.log('  ❌', r.n, r.d))
}
process.exit(failed > 0 ? 1 : 0)
