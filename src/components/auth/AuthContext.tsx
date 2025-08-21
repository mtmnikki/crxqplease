/**
 * Authentication context for ClinicalRxQ
 * Now powered by Supabase Auth for real email+password authentication.
 * - Replaces temporary local stub with supabase-js session handling.
 * - Persists login via supabase-js and listens for auth state changes.
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { MemberAccount } from '../../services/api/types'

/**
 * Shape of AuthContext
 */
interface AuthContextValue {
  member: MemberAccount | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

/**
 * Default context value
 */
const AuthContext = createContext<AuthContextValue>({
  member: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
})

/**
 * Build a MemberAccount from a Supabase session (minimal mapping for now).
 * - In phase 2, you can join with a public "profiles" table keyed by auth.uid().
 */
function memberFromSession(session: import('@supabase/supabase-js').Session | null): MemberAccount | null {
  const user = session?.user
  if (!user) return null
  const email = user.email || ''
  const pharmacyName =
    (user.user_metadata && (user.user_metadata.pharmacyName as string)) ||
    (user.user_metadata && (user.user_metadata.pharmacy as string)) ||
    'ClinicalRxQ Member'
  const subscriptionStatus =
    (user.user_metadata && (user.user_metadata.subscriptionStatus as string)) || 'Active'

  const m: MemberAccount = {
    id: user.id,
    pharmacyName,
    email,
    subscriptionStatus: subscriptionStatus as any,
    lastLoginISO: new Date().toISOString(),
  }
  return m
}

/**
 * Provider wrapping the app
 * - Bootstraps session on mount.
 * - Subscribes to onAuthStateChange to keep the context in sync with Supabase.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [member, setMember] = useState<MemberAccount | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load existing session on mount
  useEffect(() => {
    let isActive = true

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Supabase getSession error:', error.message)
        }
        const sess = data?.session ?? null
        if (!isActive) return
        setMember(memberFromSession(sess))
        setToken(sess?.access_token || null)
      } catch (e) {
        console.error('Error loading Supabase session:', e)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    bootstrap()

    // Subscribe to auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, sess) => {
      setMember(memberFromSession(sess))
      setToken(sess?.access_token || null)
    })

    return () => {
      isActive = false
      subscription.subscription?.unsubscribe()
    }
  }, [])

  /**
   * Handles user login via Supabase Auth (email/password).
   */
  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // Surface a concise error; caller can present toast/inline message.
      throw new Error(error.message || 'Unable to sign in')
    }
    const sess = data.session
    setMember(memberFromSession(sess))
    setToken(sess?.access_token || null)
  }

  /**
   * Logs out the current user via Supabase Auth.
   */
  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Supabase signOut error:', error.message)
    }
    setMember(null)
    setToken(null)
  }

  const value = useMemo(
    () => ({
      member,
      token,
      loading,
      login,
      logout,
    }),
    [member, token, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to access auth context
 */
export const useAuth = () => useContext(AuthContext)
