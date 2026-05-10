'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Mail, Lock, UserPlus, LogIn, User, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useEffect } from 'react'

type Props = {
    activeTab: 'login' | 'register'
    onTabChange: (tab: 'login' | 'register') => void
}

export default function LoginForm({ activeTab, onTabChange }: Props) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const router = useRouter()
    const { login, register, user, loading: authLoading } = useAuth()

    useEffect(() => {
        if (user && !authLoading) {
            router.push('/dashboard')
        }
    }, [user, authLoading, router])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        const result = await login(email, password)

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            setLoading(false)
            router.replace('/dashboard')
            router.refresh()
        }
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        if (!fullName.trim()) {
            setError('Ad Soyad alanı zorunludur')
            setLoading(false)
            return
        }

        if (password !== confirmPassword) {
            setError('Şifreler eşleşmiyor')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır')
            setLoading(false)
            return
        }

        const result = await register(email, password, fullName.trim())

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            setSuccess('Kayıt başarılı! Yönlendiriliyorsunuz...')
            setLoading(false)
            router.replace('/dashboard')
            router.refresh()
        }
    }

    return (
        <div className="w-full max-w-md">
            {/* Logo (sadece mobilde) */}
            <div className="flex lg:hidden justify-center mb-6">
                <Link href="/">
                    <span className="font-display text-3xl font-bold text-ink tracking-tight">
                        BİTİG
                    </span>
                </Link>
            </div>

            <div className="text-center lg:text-left mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-display">
                    {activeTab === 'login' ? 'Tekrar hoş geldiniz' : 'BİTİG\'e katıl'}
                </h1>
                <p className="text-sm text-ink-light mt-2 font-body">
                    {activeTab === 'login'
                        ? 'AI çalışma alanınıza erişmek için bilgilerinizi girin.'
                        : 'Birkaç saniyede ücretsiz hesap oluşturun.'}
                </p>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={(v) => onTabChange(v as 'login' | 'register')}
                className="w-full"
            >
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-paper-dark p-1 rounded-sm h-11 border border-parchment">
                    <TabsTrigger
                        value="login"
                        className="rounded-sm text-xs font-mono-ui tracking-wider uppercase data-[state=active]:bg-paper data-[state=active]:text-ink data-[state=active]:shadow-sm transition-all"
                    >
                        Giriş Yap
                    </TabsTrigger>
                    <TabsTrigger
                        value="register"
                        className="rounded-sm text-xs font-mono-ui tracking-wider uppercase data-[state=active]:bg-paper data-[state=active]:text-ink data-[state=active]:shadow-sm transition-all"
                    >
                        Kayıt Ol
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="font-mono-ui text-xs tracking-wider uppercase text-ink-light">E-posta</Label>
                            <div className="relative">
                                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-light" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="isim@ornek.com"
                                    className="pl-8 h-11 bg-transparent border-0 border-b border-parchment rounded-none focus-visible:ring-0 focus-visible:border-terracotta font-body"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="font-mono-ui text-xs tracking-wider uppercase text-ink-light">Şifre</Label>
                                <button
                                    type="button"
                                    className="text-xs text-terracotta hover:text-terracotta/80 transition-colors font-mono-ui"
                                >
                                    Şifremi unuttum
                                </button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-light" />
                                <Input
                                    id="password"
                                    type="password"
                                    className="pl-8 h-11 bg-transparent border-0 border-b border-parchment rounded-none focus-visible:ring-0 focus-visible:border-terracotta font-body"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        {error && (
                            <div className="p-3 text-sm text-terracotta bg-terracotta/10 rounded-sm border border-terracotta/20 font-body">
                                {error}
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full h-11 bg-ink text-paper hover:bg-ink/90 font-medium rounded-sm paper-shadow transition-all font-mono-ui tracking-wider uppercase"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <LogIn className="mr-2 h-4 w-4" />
                            )}
                            Giriş Yap
                        </Button>
                    </form>
                </TabsContent>

                <TabsContent value="register" className="mt-0">
                    <form onSubmit={handleSignUp} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="register-name" className="font-mono-ui text-xs tracking-wider uppercase text-ink-light">Ad Soyad</Label>
                            <div className="relative">
                                <User className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-light" />
                                <Input
                                    id="register-name"
                                    type="text"
                                    placeholder="Adınız Soyadınız"
                                    className="pl-8 h-11 bg-transparent border-0 border-b border-parchment rounded-none focus-visible:ring-0 focus-visible:border-terracotta font-body"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="register-email" className="font-mono-ui text-xs tracking-wider uppercase text-ink-light">E-posta</Label>
                            <div className="relative">
                                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-light" />
                                <Input
                                    id="register-email"
                                    type="email"
                                    placeholder="isim@ornek.com"
                                    className="pl-8 h-11 bg-transparent border-0 border-b border-parchment rounded-none focus-visible:ring-0 focus-visible:border-terracotta font-body"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="register-password" className="font-mono-ui text-xs tracking-wider uppercase text-ink-light">Şifre</Label>
                                <div className="relative">
                                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-light" />
                                    <Input
                                        id="register-password"
                                        type="password"
                                        placeholder="En az 6 karakter"
                                        className="pl-8 h-11 bg-transparent border-0 border-b border-parchment rounded-none focus-visible:ring-0 focus-visible:border-terracotta font-body"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="register-confirm-password" className="font-mono-ui text-xs tracking-wider uppercase text-ink-light">Tekrar</Label>
                                <div className="relative">
                                    <Lock className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-light" />
                                    <Input
                                        id="register-confirm-password"
                                        type="password"
                                        placeholder="Şifre tekrar"
                                        className="pl-8 h-11 bg-transparent border-0 border-b border-parchment rounded-none focus-visible:ring-0 focus-visible:border-terracotta font-body"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        {error && (
                            <div className="p-3 text-sm text-terracotta bg-terracotta/10 rounded-sm border border-terracotta/20 font-body">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="p-3 text-sm text-olive bg-olive/10 rounded-sm border border-olive/20 font-body">
                                {success}
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full h-11 bg-ink text-paper hover:bg-ink/90 font-medium rounded-sm paper-shadow transition-all font-mono-ui tracking-wider uppercase"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UserPlus className="mr-2 h-4 w-4" />
                            )}
                            Hesap Oluştur
                        </Button>
                    </form>
                </TabsContent>
            </Tabs>

            <div className="flex items-center justify-center gap-2 text-xs text-ink-light mt-8 font-mono-ui">
                <ShieldCheck className="w-3.5 h-3.5" />
                AI güvenliği ile korunmaktadır · KVKK uyumlu
            </div>
        </div>
    )
}
