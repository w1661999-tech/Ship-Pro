import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const { user, loading, setUser, setLoading, logout } = useAuthStore()

  useEffect(() => {
    let mounted = true

    // If user is already in store (from Zustand persist), start verification
    // WITHOUT setting loading=true (avoids spinner flash for persisted sessions)
    const hasPersistedUser = !!user
    if (!hasPersistedUser) {
      setLoading(true)
    }

    // Race: either Supabase responds within 10s or we force no-session
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('[useAuth] Supabase getSession timeout – treating as no session')
        setUser(null)
        setLoading(false)
      }
    }, 10000)

    // Get initial session to verify if user is still valid
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeoutId)
      if (!mounted) return

      if (session?.user) {
        // Session exists – fetch user profile (only if different from cached)
        if (!user || user.auth_id !== session.user.id) {
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
          // Same user, just confirm session
          setLoading(false)
        }
      } else {
        // No session → clear user, stop loading
        setUser(null)
        setLoading(false)
      }
    }).catch(() => {
      clearTimeout(timeoutId)
      if (mounted) {
        setUser(null)
        setLoading(false)
      }
    })

    // Listen for auth state changes (login/logout events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT' || !session) {
        logout()
        return
      }

      if (session?.user) {
        const { data: shipUser } = await supabase
          .from('ship_users')
          .select('*')
          .eq('auth_id', session.user.id)
          .single()

        if (!mounted) return
        if (shipUser) {
          setUser(shipUser)
        } else {
          setUser(null)
        }
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { user, loading, isAuthenticated: !!user }
}
