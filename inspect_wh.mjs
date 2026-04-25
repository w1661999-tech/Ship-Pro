import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ locale: 'ar-EG' })
const page = await ctx.newPage()

const net = []
page.on('response', async r => {
  if (r.url().includes('supabase.co/rest/v1/') && r.url().includes('warehouses')) {
    const text = await r.text().catch(() => '')
    net.push(`${r.status()} ${r.url().slice(-80)} -> ${text.slice(0, 200)}`)
  }
})

await page.goto('https://ship-pro-roan.vercel.app/login')
await page.waitForTimeout(1500)
await page.locator('input[type="email"]').fill('admin@shippro.eg')
await page.locator('input[type="password"]').fill('Admin@123456')
await page.locator('button[type="submit"]').click()
await page.waitForURL('**/admin', { timeout: 15000 })
await page.waitForTimeout(1500)

console.log('Navigating to /admin/warehouses...')
await page.goto('https://ship-pro-roan.vercel.app/admin/warehouses', { waitUntil: 'networkidle' })
await page.waitForTimeout(5000)

const mainText = await page.locator('main').innerText().catch(() => '')
console.log('\n=== MAIN TEXT ===')
console.log(mainText)
console.log('\n=== NETWORK ===')
net.forEach(n => console.log('  ', n))

await browser.close()
