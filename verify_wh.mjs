import { chromium } from 'playwright'
const SITE = 'https://ship-pro-roan.vercel.app'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await ctx.newPage()

// Capture console errors
const errors = []
page.on('pageerror', e => errors.push('PAGE_ERR: ' + e.message))
page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE_ERR: ' + msg.text().slice(0, 200)) })

await page.goto(`${SITE}/login`)
await page.waitForTimeout(1500)
await page.fill('input[type="email"]', 'admin@shippro.eg')
await page.fill('input[type="password"]', 'Admin@123456')
await page.click('button[type="submit"]')
await page.waitForTimeout(4000)

await page.goto(`${SITE}/admin/warehouses`, { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(8000)

const url = page.url()
const html = await page.content()
const mainTxt = await page.locator('main').first().innerText().catch(()=>'NO_MAIN')
const bodyTxt = await page.locator('body').innerText().catch(()=>'')

console.log('URL:', url)
console.log('Main text length:', mainTxt.length)
console.log('Main text sample:', mainTxt.slice(0, 300))
console.log('Body has مخزن:', bodyTxt.includes('مخزن'))
console.log('Body has أرفف:', bodyTxt.includes('أرفف'))
console.log('HTML length:', html.length)
console.log('HTML has WarehousePage chunk:', html.includes('WarehousePage'))
console.log('Errors:', errors.slice(0, 5))

await browser.close()
