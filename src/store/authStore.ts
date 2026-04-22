import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ShipUser } from '@/types/database'

interface AuthState {
  user: ShipUser | null
  loading: boolean
  setUser: (user: ShipUser | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      setUser: (user) => set({ user, loading: false }),
      setLoading: (loading) => set({ loading }),
      logout: () => set({ user: null, loading: false }),
    }),
    {
      name: 'ship-pro-auth',
      // Only persist the user field, not loading
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // If user was persisted, show content immediately (loading=false)
          // useAuth will verify the session in background
          // If no user was persisted, set loading=true so useAuth can check
          if (state.user) {
            state.loading = false  // Show content immediately for persisted sessions
          } else {
            state.loading = true   // Need to check Supabase session
          }
        }
      },
    }
  )
)
