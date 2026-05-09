'use client'

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    useCallback,
    type ReactNode
} from 'react'
import { API_BASE_URL } from '@/lib/api-config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type AiModel = 'deepseek' | 'gemma'

interface User {
    id: string
    email: string
    full_name: string | null
    role: string
}

interface AuthContextValue {
    user: User | null
    accessToken: string | null
    loading: boolean
    preferredModel: AiModel
    setPreferredModel: (model: AiModel) => void
    login: (email: string, password: string) => Promise<{ error?: string }>
    register: (email: string, password: string, fullName: string) => Promise<{ error?: string }>
    logout: () => void
}

const TOKEN_KEY = 'ainote_token'
const MODEL_KEY = 'preferredModel'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [preferredModel, setPreferredModel] = useState<AiModel>('deepseek')

    // On mount — check localStorage for saved model preference
    useEffect(() => {
        const saved = localStorage.getItem(MODEL_KEY) as AiModel
        if (saved === 'deepseek' || saved === 'gemma') {
            setPreferredModel(saved)
        }
    }, [])

    // On mount — check localStorage for an existing token and validate it
    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY)
        if (!token) {
            setLoading(false)
            return
        }

        // Validate token by calling /auth/me
        fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                if (res.ok) {
                    const data = await res.json()
                    setUser(data)
                    setAccessToken(token)
                    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=86400; SameSite=Lax`
                } else {
                    // Token is invalid — clean up
                    localStorage.removeItem(TOKEN_KEY)
                    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
                }
            })
            .catch(() => {
                localStorage.removeItem(TOKEN_KEY)
                document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
            })
            .finally(() => setLoading(false))
    }, [])

    // ------------------------------------------------------------------
    // login
    // ------------------------------------------------------------------
    const login = useCallback(async (email: string, password: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            if (!res.ok) {
                const err = await res.json()
                return { error: err.detail || 'Giriş başarısız' }
            }

            const data = await res.json()
            localStorage.setItem(TOKEN_KEY, data.access_token)
            document.cookie = `${TOKEN_KEY}=${data.access_token}; path=/; max-age=86400; SameSite=Lax`
            setAccessToken(data.access_token)
            setUser(data.user)
            return {}
        } catch {
            return { error: 'Sunucuya bağlanılamadı' }
        }
    }, [])

    // ------------------------------------------------------------------
    // register
    // ------------------------------------------------------------------
    const register = useCallback(async (email: string, password: string, fullName: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, full_name: fullName }),
            })

            if (!res.ok) {
                const err = await res.json()
                return { error: err.detail || 'Kayıt başarısız' }
            }

            const data = await res.json()
            localStorage.setItem(TOKEN_KEY, data.access_token)
            document.cookie = `${TOKEN_KEY}=${data.access_token}; path=/; max-age=86400; SameSite=Lax`
            setAccessToken(data.access_token)
            setUser(data.user)
            return {}
        } catch {
            return { error: 'Sunucuya bağlanılamadı' }
        }
    }, [])

    // ------------------------------------------------------------------
    // logout
    // ------------------------------------------------------------------
    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY)
        document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
        setAccessToken(null)
        setUser(null)
    }, [])

    // ------------------------------------------------------------------
    // model preference
    // ------------------------------------------------------------------
    const handleSetModel = useCallback((model: AiModel) => {
        setPreferredModel(model)
        localStorage.setItem(MODEL_KEY, model)
    }, [])

    const value = useMemo<AuthContextValue>(() => ({
        user,
        accessToken,
        loading,
        preferredModel,
        setPreferredModel: handleSetModel,
        login,
        register,
        logout,
    }), [user, accessToken, loading, preferredModel, handleSetModel, login, register, logout])

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
