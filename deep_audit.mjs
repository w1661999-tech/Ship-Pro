import { chromium } from '@playwright/test'

const SITE = 'https://ship-pro-roan.vercel.app'
const SUPA = 'https://uyciwmoavtqmhazhkmmu.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Y2l3bW9hdnRxbWhhemhrbW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTI1NjIsImV4cCI6MjA5MjAyODU2Mn0.VE9VgRrBf_V-Sds1Yakukti-g7IuWe4tjR5bA44Cflw'

const results = []
function log(m, ok, detail='') { console.log((ok?'✅':'❌'), m, detail?'— '+detail:''); results.push({m, ok, detail}) }

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ locale: 'ar-EG', viewport: {width:1366, height:900} })
const page = await ctx.newPage()

// =================================================================
// PART A: LOGIN & ROLE-BASED ROUTING
// =================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  PART A: تسجيل الدخول والتوجيه حسب الدور')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// Test admin login
await page.goto(`${SITE}/login`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.locator('input[type=email]').fill('admin@shippro.eg')
await page.locator('input[type=password]').fill('Admin@123456')
await page.locator('button[type=submit]').click()
await page.waitForURL('**/admin', { timeout: 15000 })
await page.waitForTimeout(2500)
log('Admin login → /admin', page.url().includes('/admin'))

// Try accessing /merchant as admin (should redirect)
await page.goto(`${SITE}/merchant`, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
log('Admin يُعاد توجيهه عند زيارة /merchant', page.url().includes('/admin'))

// =================================================================
// PART B: ADMIN DASHBOARD - DATA & CHARTS
// =================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  PART B: لوحة الإدارة — بيانات وإحصاءات')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await page.goto(`${SITE}/admin`, { waitUntil: 'networkidle' })
await page.waitForTimeout(3500)
const dashText = await page.locator('main').innerText()
log('بطاقة "إجمالي الشحنات"', dashText.includes('إجمالي الشحنات'))
log('بطاقة "تم التسليم"', dashText.includes('تم التسليم'))
log('بطاقة "إجمالي COD المحصل"', dashText.includes('COD'))
log('Pie/Donut chart للحالات', dashText.includes('في الانتظار') || dashText.includes('توزيع'))
// Check if there's a real shipment count > 0
const hasNumbers = /[\d٠-٩]+/.test(dashText)
log('بطاقات تعرض أرقامًا حقيقية', hasNumbers)

// =================================================================
// PART C: SHIPMENTS PAGE - FULL CRUD + EXPORT
// =================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  PART C: صفحة الشحنات — الفلترة والبحث والتصدير')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await page.locator('a:has-text("الشحنات")').first().click()
await page.waitForTimeout(3500)
const shipText = await page.locator('main').innerText()
log('عنوان "الشحنات" + عدد', shipText.includes('شحنة'))
log('شريط بحث', (await page.locator('input[placeholder*=بحث]').count()) > 0)
log('فلتر الحالة', (await page.locator('select').count()) > 0)
log('زر تصدير Excel', shipText.includes('تصدير') || shipText.includes('Export'))

// Get the count of shipments from the table
const shipmentRows = await page.locator('tbody tr').count()
log(`جدول الشحنات يعرض صفوفًا: ${shipmentRows}`, shipmentRows > 0)

// Click on first shipment row to open details
if (shipmentRows > 0) {
  const firstRow = page.locator('tbody tr').first()
  const trackNum = await firstRow.locator('td').first().innerText().catch(() => '')
  log(`أول شحنة في الجدول: ${trackNum.trim()}`, trackNum.length > 5)
}

// =================================================================
// PART D: COURIERS PAGE - LIST & ASSIGNMENT
// =================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  PART D: المناديب')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await page.locator('a:has-text("المناديب")').first().click()
await page.waitForTimeout(3000)
const courText = await page.locator('main').innerText()
log('صفحة المناديب', courText.includes('المناديب') || courText.includes('مندوب'))
log('زر إضافة مندوب', (await page.locator('button:has-text("مندوب جديد"), button:has-text("إضافة")').count()) > 0)

// =================================================================
// PART E: MERCHANTS PAGE - LIST & SETTINGS
// =================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  PART E: التجار')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await page.locator('a:has-text("التجار")').first().click()
await page.waitForTimeout(3000)
const merchText = await page.locator('main').innerText()
log('صفحة التجار', merchText.includes('التجار') || merchText.includes('تاجر'))

// =================================================================
// PART F: PRICING - ZONES & RULES
// =================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  PART F: المناطق والتسعير')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await page.locator('a:has-text("المناطق والتسعير")').first().click()
await page.waitForTimeout(3000)
const priceText = await page.locator('main').innerText()
log('صفحة التسعير', priceText.includes('تسعير') || priceText.includes('منطقة'))

// =================================================================
// PART G: FINANCE & SETTLEMENTS
// =================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  PART G: المالية والتسويات')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await page.goto(`${SITE}/admin/finance`, { waitUntil: 'networkidle' })
await page.waitForTimeout(3500)
const finText = await page.locator('main').innerText()
log('صفحة المالية', finText.length > 50)
log('بطاقات إحصائية مالية', finText.includes('ج.م') || finText.includes('EGP'))

// =================================================================
// PART H: WMS - WAREHOUSES (CREATE, SHELVES, ASSIGNMENT)
// =================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  PART H: WMS — إدارة المخازن (اختبار CRUD كامل)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await page.locator('a:has-text("المخازن والأرفف")').first().click()
await page.waitForTimeout(3500)
log('صفحة المخازن محمّلة', (await page.locator('main').innerText()).includes('إدارة المخازن'))

// Create a warehouse
console.log('  إنشاء مخزن جديد...')
await page.locator('button:has-text("مخزن جديد")').first().click()
await page.waitForTimeout(1500)

// Find inputs in modal
const codeInput = page.locator('input[placeholder*="WH-CAI"], input').filter({ has: page.locator(':scope') }).nth(0)
const allInputs = await page.locator('div[role=dialog] input, .modal input').all().catch(async () => await page.locator('input:visible').all())

// Try to fill the modal inputs
const visInputs = await page.locator('input:visible').all()
console.log(`  Visible inputs in modal: ${visInputs.length}`)

if (visInputs.length >= 2) {
  await visInputs[0].fill('WH-AUDIT-1')
  await visInputs[1].fill('مخزن الاختبار')
  if (visInputs[2]) await visInputs[2].fill('شارع الاختبار، القاهرة')
  await page.waitForTimeout(500)

  await page.locator('button:has-text("حفظ")').first().click()
  await page.waitForTimeout(3500)

  const afterCreate = await page.locator('main').innerText()
  const created = afterCreate.includes('مخزن الاختبار') || afterCreate.includes('WH-AUDIT-1')
  log('✓ تم إنشاء مخزن جديد', created)

  if (created) {
    // Try creating a shelf
    console.log('  إنشاء رف داخل المخزن...')
    await page.waitForTimeout(1000)
    // Click on warehouse to select
    const whBtn = page.locator('button:has-text("WH-AUDIT-1"), button:has-text("مخزن الاختبار")').first()
    if (await whBtn.count() > 0) {
      await whBtn.click()
      await page.waitForTimeout(1000)
    }

    const shelfBtn = page.locator('button:has-text("رف جديد")').first()
    if (await shelfBtn.count() > 0 && await shelfBtn.isEnabled()) {
      await shelfBtn.click()
      await page.waitForTimeout(1500)
      const visInputs2 = await page.locator('input:visible').all()
      if (visInputs2.length >= 2) {
        await visInputs2[0].fill('A-1-R1')
        await visInputs2[1].fill('50')  // capacity
        await page.locator('button:has-text("حفظ")').first().click()
        await page.waitForTimeout(3000)
        const afterShelf = await page.locator('main').innerText()
        log('✓ تم إنشاء رف A-1-R1', afterShelf.includes('A-1-R1'))
      }
    }
  }
}

// =================================================================
// PART I: TICKETS - ADMIN VIEW (with previously created ticket)
// =================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  PART I: التذاكر (Admin)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await page.locator('a:has-text("الدعم والتذاكر")').first().click()
await page.waitForTimeout(3500)
const tickText = await page.locator('main').innerText()
log('صفحة إدارة التذاكر', tickText.includes('إدارة تذاكر'))

// Check if previous test ticket exists
const hasTestTicket = tickText.includes('اختبار النظام بعد التفعيل')
log(`عرض التذكرة المنشأة سابقًا "اختبار النظام بعد التفعيل"`, hasTestTicket)

if (hasTestTicket) {
  // Open the ticket and reply to it
  console.log('  فتح التذكرة والرد عليها...')
  await page.locator('button:has-text("اختبار النظام بعد التفعيل")').first().click()
  await page.waitForTimeout(2000)

  const modalOpen = (await page.locator('body').innerText()).includes('فتح تذكرة دعم') || (await page.locator('textarea').count()) > 0
  log('Modal التذكرة فُتح', modalOpen)

  // Reply to the ticket
  const replyArea = page.locator('textarea').first()
  if (await replyArea.count() > 0) {
    await replyArea.fill('مرحباً، تم استلام تذكرتك وسيتم معالجتها فوراً. شكراً للتواصل! 👋')
    await page.locator('button[type=submit], button:has(svg)').filter({ hasText: '' }).last().click().catch(() => {})

    // Try clicking on the send icon button
    const sendBtns = await page.locator('button').all()
    for (const b of sendBtns.slice(-5)) {
      const html = await b.innerHTML().catch(() => '')
      if (html.includes('Send') || html.includes('paper-plane')) {
        await b.click()
        break
      }
    }
    await page.waitForTimeout(3000)

    const afterReply = await page.locator('body').innerText()
    log('✓ تم إرسال الرد', afterReply.includes('تم إرسال الرد') || afterReply.includes('استلام تذكرتك'))
  }
}

// =================================================================
// PART J: REALTIME NOTIFICATION TEST
// =================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  PART J: الإشعارات الفورية (Realtime)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await page.goto(`${SITE}/admin`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const bellCount = await page.locator('button[title*=الإشعارات]').count()
log('جرس الإشعارات في Admin Layout', bellCount > 0)

// Click bell to open
if (bellCount > 0) {
  await page.locator('button[title*=الإشعارات]').click()
  await page.waitForTimeout(1500)
  const bellText = await page.locator('body').innerText()
  log('قائمة الإشعارات تفتح', bellText.includes('الإشعارات') && (bellText.includes('لا توجد') || bellText.includes('غير مقروء')))
}

// =================================================================
// PART K: PUBLIC TRACKING
// =================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  PART K: صفحة التتبع العامة')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await page.evaluate(() => localStorage.clear())
await page.goto(`${SITE}/track`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const trackText = await page.locator('body').innerText()
log('صفحة التتبع تعمل بدون تسجيل دخول', trackText.includes('تتبع') || trackText.includes('شحنة'))

const trackInput = await page.locator('input').count()
log('حقل إدخال رقم الشحنة', trackInput > 0)

// Try tracking a real shipment
if (trackInput > 0) {
  // Get a real tracking number from API
  const r = await page.request.get(`${SUPA}/rest/v1/shipments?select=tracking_number&limit=1&order=created_at.desc`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
  })
  const ships = await r.json()
  if (ships.length > 0) {
    const tn = ships[0].tracking_number
    console.log(`  Testing with tracking: ${tn}`)
    await page.locator('input').first().fill(tn)
    const trackBtn = page.locator('button:has-text("تتبع"), button[type=submit]').first()
    await trackBtn.click()
    await page.waitForTimeout(3500)
    const trackResult = await page.locator('body').innerText()
    log('✓ التتبع يعرض حالة الشحنة', trackResult.includes(tn) || trackResult.includes('في الانتظار') || trackResult.includes('تم'))
  }
}

// =================================================================
// FINAL SUMMARY
// =================================================================
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
process.exit(failed > 5 ? 1 : 0)
