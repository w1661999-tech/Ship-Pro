import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const sql = readFileSync('./supabase/migrations/20260423_enterprise_modules.sql', 'utf8')
console.log(`Loaded migration: ${sql.length} chars`)

const EMAIL = 'w1661999@gmail.com'
const PASS = 'Basel.1611'

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-blink-features=AutomationControlled']
})
const ctx = await browser.newContext({
  locale: 'en-US',
  viewport: { width: 1366, height: 900 },
})
const page = await ctx.newPage()

console.log('1. Open Supabase sign-in page...')
await page.goto('https://supabase.com/dashboard/sign-in', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(3000)
console.log('   URL:', page.url())
await page.screenshot({ path: '/tmp/sb-1.png' })

console.log('2. Look for Email/Password fields directly...')
// Look for email input
const emailInput = page.locator('input[type="email"], input[name="email"]').first()
const emailCount = await emailInput.count()
console.log('   Email input count:', emailCount)

if (emailCount > 0) {
  await emailInput.fill(EMAIL)
  const passInput = page.locator('input[type="password"]').first()
  await passInput.fill(PASS)
  await page.screenshot({ path: '/tmp/sb-2.png' })

  console.log('3. Submit...')
  const signInBtn = page.locator('button[type="submit"]:has-text("Sign in"), button:has-text("Sign In")').first()
  await signInBtn.click()
  await page.waitForTimeout(7000)
  console.log('   URL after sign in:', page.url())

  const bodyText = await page.locator('body').innerText().catch(() => '')
  console.log('   Body preview:', bodyText.slice(0, 350).replace(/\n/g, ' | '))
  await page.screenshot({ path: '/tmp/sb-3.png' })

  // Check if we got an MFA prompt or success
  if (page.url().includes('mfa') || bodyText.toLowerCase().includes('verify') || bodyText.toLowerCase().includes('code')) {
    console.log('   ⚠️ MFA required - need user input')
  } else if (page.url().includes('/dashboard') && !page.url().includes('sign-in')) {
    console.log('   ✅ Logged in! Going to SQL editor...')
    await page.goto('https://supabase.com/dashboard/project/uyciwmoavtqmhazhkmmu/sql/new', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })
    await page.waitForTimeout(7000)
    await page.screenshot({ path: '/tmp/sb-sql-editor.png', fullPage: true })

    // Try to paste SQL into the editor
    console.log('4. Find Monaco SQL editor...')
    // Monaco editor uses a textarea with class "inputarea"
    const editor = page.locator('.monaco-editor textarea, .view-line').first()
    const editorCount = await editor.count()
    console.log('   Monaco editor instances:', editorCount)

    if (editorCount > 0) {
      // Click into the editor first
      await page.locator('.monaco-editor').first().click()
      await page.waitForTimeout(500)
      // Use clipboard paste
      await page.evaluate(async (s) => {
        await navigator.clipboard.writeText(s)
      }, sql).catch(() => {})

      // Try keyboard paste
      await page.keyboard.press('Control+a')
      await page.keyboard.press('Delete')
      await page.keyboard.type(sql.slice(0, 200))  // Type first 200 chars to verify
      await page.waitForTimeout(1500)
      await page.screenshot({ path: '/tmp/sb-pasted.png' })
    }
  }
}

await browser.close()
