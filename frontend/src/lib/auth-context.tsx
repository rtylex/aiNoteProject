'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthContextValue {
    user: User | null
    session: Session | null
    accessToken: string | null
    loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        const loadSession = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase.auth.getSession()
                if (!isMounted) return

                // If there's a refresh token error, clear the session
                if (error) {
                    console.error('Session error:', error.message)
                    // Sign out to clear invalid tokens
                    await supabase.auth.signOut()
                    setSession(null)
                } else {
                    setSession(data.session ?? null)
                }
            } catch (err) {
                console.error('Failed to load session:', err)
                setSession(null)
            }
            setLoading(false)
        }

        loadSession()

        const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (!isMounted) return

            // Handle token refresh errors
            if (event === 'TOKEN_REFRESHED' && !newSession) {
                console.warn('Token refresh failed, signing out')
                supabase.auth.signOut()
            }

            setSession(newSession)
        })

        return () => {
            isMounted = false
            listener.subscription.unsubscribe()
        }
    }, [])

    const value = useMemo<AuthContextValue>(() => ({
        user: session?.user ?? null,
        session,
        accessToken: session?.access_token ?? null,
        loading,
    }), [session, loading])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}


