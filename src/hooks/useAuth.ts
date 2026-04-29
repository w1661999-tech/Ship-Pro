import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

/**
 * Auth bootstrap hook.
 *
 * IMPORTANT FIX (2026-04-29):
 *  - Before, this hook used a hard 10s timeout that on expiry called
 *    setUser(null), which forcibly logged the user out mid-session.
 *    On slow networks or while a long-running modal interaction was in
 *    progress (Add Merchant / Add Courier / Add Zone), this caused:
 *      • Modal silently closing
 *      • Redirect to /login
 *      • Loss of unsaved data
 *      • The user perception that "nothing got saved"
 *  - Now we ONLY clear loading state on timeout if there is no persisted
 *    user. We never auto-logout an already-authenticated user just
 *    because getSession was slow. The Supabase client itself has its own
 *    auto-refresh; if the session is truly invalid, onAuthStateChange
 *    will fire SIGNED_OUT and we will log out at that moment.
 */
export function useAuth() {
  const { user, loading, setUser, setLoading, logout } = useAuthStore()

  useEffect(() => {
    let mounted = true

    // Show spinner only when no persisted session exists
    const hasPersistedUser = !!user
    if (!hasPersistedUser) {
      setLoading(true)
    }

    // Soft timeout: only release the loading spinner if Supabase is slow.
    // Does NOT log the user out — that was the previous bug.
    const timeoutId = setTimeout(() => {
      if (mounted && !hasPersistedUser) {
        console.warn('[useAuth] getSession is slow – releasing spinner; keeping current user')
        setLoading(false)
      }
    }, 8000)

    // Verify / hydrate session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeoutId)
      if (!mounted) return

      if (session?.user) {
        // Already-cached user matches → fast path, no DB roundtrip
        if (user && user.auth_id === session.user.id) {
          setLoading(false)
          return
        }
        // Otherwise fetch profile
        const { data: shipUser, error } = await supabase
          .from('ship_users')
          .select('*')
          .eq('auth_id', session.user.id)
          .single()

        if (!mounted) return
        if (error || !shipUser) {
          setUser(null)
        } else {
          setUser(shipUser)
        }
      } else {
        // No session AND no persisted user → real anonymous state
        if (!hasPersistedUser) {
          setUser(null)
        }
        setLoading(false)
      }
    }).catch((err) => {
      clearTimeout(timeoutId)
      if (mounted) {
        console.warn('[useAuth] getSession error:', err?.message || err)
        // DO NOT logout on transient errors — only stop the spinner
        setLoading(false)
      }
    })

    // Real auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        logout()
        return
      }

      if (event === 'TOKEN_REFRESHED') {
        // Just keep current user, no DB roundtrip needed
        return
      }

      if (session?.user) {
        // Avoid redundant fetch if same user
        if (user && user.auth_id === session.user.id) return

        const { data: shipUser } = await supabase
          .from('ship_users')
          .select('*')
          .eq('auth_id', session.user.id)
          .single()

        if (!mounted) return
        if (shipUser) {
          setUser(shipUser)
        }
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { user, loading, isAuthenticated: !!user }
}
