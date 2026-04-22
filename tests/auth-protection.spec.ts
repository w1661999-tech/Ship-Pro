/**
 * Test Suite: Admin Route Protection
 * اختبار حماية مسارات الإدمن
 *
 * Tests verify that:
 * 1. Unauthorized users cannot view admin content
 * 2. Wrong-role users are redirected to their own portal
 * 3. Admin users can access the admin portal
 */
import { test, expect, Page, BrowserContext } from '@playwright/test'
import { request as playwrightRequest } from '@playwright/test'

const BASE = 'http://localhost:3000'
const SUPABASE_URL = 'https://uyciwmoavtqmhazhkmmu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5Y2l3bW9hdnRxbWhhemhrbW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTI1NjIsImV4cCI6MjA5MjAyODU2Mn0.VE9VgRrBf_V-Sds1Yakukti-g7IuWe4tjR5bA44Cflw'

const MERCHANT_EMAIL = 'merchant@shippro.eg'
const MERCHANT_PASSWORD = 'Merchant@123456'
const ADMIN_EMAIL = 'admin@shippro.eg'
const ADMIN_PASSWORD = 'Admin@123456'

/**
 * Sign in via Supabase REST API and get access token
 */
async function supabaseSignIn(email: string, password: string): Promise<{ access_token: string; refresh_token: string } | null> {
  const apiContext = await playwrightRequest.newContext()
  try {
    const response = await apiContext.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      data: { email, password }
    })
    if (response.ok()) {
      const data = await response.json()
      return { access_token: data.access_token, refresh_token: data.refresh_token }
    }
    return null
  } finally {
    await apiContext.dispose()
  }
}

/**
 * Sign out via Supabase REST API using access token
 */
async function supabaseSignOut(accessToken: string): Promise<void> {
  const apiContext = await playwrightRequest.newContext()
  try {
    await apiContext.post(`${SUPABASE_URL}/auth/v1/logout`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {}
    })
  } catch (_) {}
  finally {
    await apiContext.dispose()
  }
}

/**
 * Get ship_user record by email
 */
async function getShipUser(accessToken: string, email: string): Promise<any | null> {
  const apiContext = await playwrightRequest.newContext()
  try {
    const response = await apiContext.get(
      `${SUPABASE_URL}/rest/v1/ship_users?select=*&email=eq.${encodeURIComponent(email)}&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    )
    if (response.ok()) {
      const data = await response.json()
      return data[0] || null
    }
    return null
  } finally {
    await apiContext.dispose()
  }
}

/**
 * Prepare a browser context with a specific user session already logged in.
 * This bypasses the login form and directly injects the Supabase session.
 */
async function createContextWithSession(
  browser: any,
  accessToken: string,
  refreshToken: string,
  shipUser: any
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE,
          localStorage: [
            {
              name: `sb-uyciwmoavtqmhazhkmmu-auth-token`,
              value: JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: 'bearer',
                expires_in: 3600,
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: { id: shipUser?.auth_id || '' }
              })
            },
            {
              name: 'ship-pro-auth',
              value: JSON.stringify({ state: { user: shipUser }, version: 0 })
            }
          ]
        }
      ]
    },
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
  })
  const page = await context.newPage()
  return { context, page }
}

/**
 * Create a completely empty browser context (no session)
 */
async function createEmptyContext(browser: any): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
  })
  const page = await context.newPage()
  return { context, page }
}

test.describe('🔒 Admin Route Protection', () => {

  /**
   * Test 1: Unauthenticated user must NOT see admin content
   * Uses a completely empty browser context → no Supabase session
   */
  test('unauthenticated user trying /admin – must NOT see admin content', async ({ browser }) => {
    const { context, page } = await createEmptyContext(browser)

    try {
      // Navigate to /admin with no session
      await page.goto(`${BASE}/admin`, { waitUntil: 'load', timeout: 30000 })

      // Wait for React auth check (getSession returns null → redirect to /login)
      // Give up to 12s (includes Supabase timeout in useAuth)
      try {
        await page.waitForURL(/login/, { timeout: 12000 })
        const url = page.url()
        console.log(`[Unauthenticated] Correctly redirected to: ${url}`)
        expect(url).toContain('/login')
      } catch (_) {
        // Fallback: check page content
        const url = page.url()
        const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '')
        console.log(`[Unauthenticated] URL: ${url}`)
        console.log(`[Unauthenticated] Body: ${bodyText.substring(0, 300)}`)

        // Check if admin-specific content is NOT visible
        const showsAdminContent =
          bodyText.includes('لوحة التحكم الرئيسية') ||
          bodyText.includes('إدارة الكوريرز') ||
          bodyText.includes('إدارة التجار') ||
          bodyText.includes('التقارير المالية')

        console.log(`[Unauthenticated] Shows admin content: ${showsAdminContent}`)
        // Either on login page OR not showing admin content
        expect(!showsAdminContent).toBe(true)
      }

      console.log('✅ Unauthenticated user cannot see admin content')
    } finally {
      await context.close()
    }
  })

  /**
   * Test 2: Merchant cannot see admin content when navigating to /admin
   * Uses injected merchant session → navigates to /admin → must be blocked
   */
  test('merchant cannot see admin content when navigating to /admin', async ({ browser }) => {
    // Login via API to get tokens
    const tokens = await supabaseSignIn(MERCHANT_EMAIL, MERCHANT_PASSWORD)
    expect(tokens).not.toBeNull()
    
    const shipUser = await getShipUser(tokens!.access_token, MERCHANT_EMAIL)
    console.log(`[Merchant] ShipUser: ${JSON.stringify(shipUser)}`)
    expect(shipUser).not.toBeNull()
    expect(shipUser.role).toBe('merchant')

    const { context, page } = await createContextWithSession(
      browser,
      tokens!.access_token,
      tokens!.refresh_token,
      shipUser
    )

    try {
      // Navigate directly to /admin while logged in as merchant
      await page.goto(`${BASE}/admin`, { waitUntil: 'load', timeout: 30000 })

      // Wait for ProtectedRoute to redirect merchant away from /admin
      try {
        await page.waitForURL(/merchant|login/, { timeout: 10000 })
      } catch (_) {
        await page.waitForTimeout(3000)
      }

      const url = page.url()
      const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '')
      console.log(`[Merchant /admin attempt] Final URL: ${url}`)

      // Must NOT be showing admin-specific management content
      const showsAdminOnlyContent =
        bodyText.includes('إدارة الكوريرز') ||
        bodyText.includes('إدارة التجار') ||
        bodyText.includes('التسعير والمناطق')

      // Either redirected OR not showing admin-only content
      const isCorrect = url.includes('/merchant') || url.includes('/login') || !showsAdminOnlyContent
      console.log(`[Merchant] Shows admin content: ${showsAdminOnlyContent}, isCorrect: ${isCorrect}`)
      expect(isCorrect).toBe(true)

      console.log('✅ Merchant correctly blocked from admin content')
    } finally {
      // Sign out to invalidate the server session
      await supabaseSignOut(tokens!.access_token)
      await context.close()
    }
  })

  /**
   * Test 3: Admin can access /admin dashboard
   * Uses injected admin session → navigates to /admin → must be accessible
   */
  test('admin login lands on /admin dashboard', async ({ browser }) => {
    // Login via API to get tokens
    const tokens = await supabaseSignIn(ADMIN_EMAIL, ADMIN_PASSWORD)
    expect(tokens).not.toBeNull()

    const shipUser = await getShipUser(tokens!.access_token, ADMIN_EMAIL)
    console.log(`[Admin] ShipUser: ${JSON.stringify(shipUser)}`)
    expect(shipUser).not.toBeNull()
    expect(shipUser.role).toBe('admin')

    const { context, page } = await createContextWithSession(
      browser,
      tokens!.access_token,
      tokens!.refresh_token,
      shipUser
    )

    try {
      // Navigate directly to /admin dashboard
      await page.goto(`${BASE}/admin`, { waitUntil: 'load', timeout: 30000 })

      // Wait for page to fully load (not a spinner/redirect)
      try {
        await page.waitForFunction(
          () => !document.body.innerText.includes('جارٍ تحميل النظام'),
          { timeout: 15000 }
        )
      } catch (_) {}

      const url = page.url()
      const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '')
      console.log(`[Admin] URL: ${url}`)
      console.log(`[Admin] Body preview: ${bodyText.substring(0, 200)}`)

      expect(url).toContain('/admin')
      console.log('✅ Admin successfully accessed admin portal')
    } finally {
      await supabaseSignOut(tokens!.access_token)
      await context.close()
    }
  })
})
