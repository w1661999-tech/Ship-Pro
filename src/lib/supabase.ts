import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

// Create untyped client to avoid complex generic type issues
// All table types are enforced at the component level via interface casting
export const supabase: SupabaseClient<any, 'public', any> = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Auth helpers
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: shipUser } = await supabase
    .from('ship_users')
    .select('*')
    .eq('auth_id', user.id)
    .single()
  
  return shipUser
}

export async function signUp(email: string, password: string, fullName: string, role: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  
  if (data.user) {
    const { error: profileError } = await supabase
      .from('ship_users')
      .insert({
        auth_id: data.user.id,
        full_name: fullName,
        email: email,
        role: role as 'admin' | 'merchant' | 'driver',
      })
    if (profileError) throw profileError
  }
  
  return data
}
