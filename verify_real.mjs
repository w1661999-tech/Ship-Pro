import { chromium } from 'playwright'

const SITE = 'https://ship-pro-roan.vercel.app'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await ctx.newPage()

// Login as admin
await page.goto(`${SITE}/login`)
await page.waitForTimeout(1500)
await page.fill('input[type="email"]', 'admin@shippro.eg')
await page.fill('input[type="password"]', 'Admin@123456')
await page.click('button[type="submit"]')
await page.waitForTimeout(5000)
console.log('After admin login URL:', page.url())

// Click on warehouses link from sidebar (deep test)
await page.goto(`${SITE}/admin`)
await page.waitForTimeout(3500)
const link = page.locator('a:has-text("المخازن"), a:has-text("الأرفف")').first()
const linkCount = await link.count()
console.log('Warehouses link in sidebar:', linkCount)
if (linkCount > 0) {
  await link.click()
  await page.waitForTimeout(5000)
  const url = page.url()
  const txt = await page.locator('main').first().innerText().catch(()=>'')
  console.log('Warehouses URL:', url)
  console.log('Warehouses text length:', txt.length)
  console.log('Has مخزن جديد:', txt.includes('مخزن جديد'))
  console.log('Has رف جديد:', txt.includes('رف جديد'))
  console.log('Sample:', txt.slice(0, 200))
}

// Test system page directly with longer wait
await page.goto(`${SITE}/admin/system`, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(5000)
const sysTxt = await page.locator('main').first().innerText().catch(()=>'')
console.log('\nSystem page text length:', sysTxt.length)
console.log('Has Migration:', sysTxt.includes('Migration'))
console.log('Has قاعدة:', sysTxt.includes('قاعدة'))
console.log('Sample:', sysTxt.slice(0, 200))

// Login page directly
await ctx.clearCookies()
await page.goto(`${SITE}/login`)
await page.waitForTimeout(3000)
const loginTxt = await page.locator('body').innerText().catch(()=>'')
console.log('\nLogin page text length:', loginTxt.length)
console.log('Has Ship Pro:', loginTxt.includes('Ship Pro'))
console.log('Has تسجيل:', loginTxt.includes('تسجيل'))
console.log('Sample:', loginTxt.slice(0, 200))

await browser.close()
