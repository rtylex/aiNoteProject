'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
            {/* Logo (sadece mobilde, lg’de sağ panelde gösteriliyor) */}
            <div className="flex lg:hidden justify-center mb-6">
                <Link href="/">
                    <Image
                        src="/bitigAcikTema.png"
                        alt="BİTİG"
                        width={140}
                        height={45}
                        className="object-contain"
                        priority
                    />
                </Link>
            </div>

            <div className="text-center lg:text-left mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-[#011133] to-[#2a3f6f] bg-clip-text text-transparent">
                    {activeTab === 'login' ? 'Tekrar hoş geldiniz' : 'BİTİG’e katıl'}
                </h1>
                <p className="text-sm text-gray-500 mt-2">
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
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#eef1f8] p-1 rounded-full h-11">
                    <TabsTrigger
                        value="login"
                        className="rounded-full text-sm data-[state=active]:bg-white data-[state=active]:text-[#011133] data-[state=active]:shadow-sm transition-all"
                    >
                        Giriş Yap
                    </TabsTrigger>
                    <TabsTrigger
                        value="register"
                        className="rounded-full text-sm data-[state=active]:bg-white data-[state=active]:text-[#011133] data-[state=active]:shadow-sm transition-all"
                    >
                        Kayıt Ol
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-posta</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="isim@ornek.com"
                                    className="pl-10 h-11 bg-white"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Şifre</Label>
                                <button
                                    type="button"
                                    className="text-xs text-[#23335c] hover:text-[#011133] transition-colors"
                                >
                                    Şifremi unuttum
                                </button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    className="pl-10 h-11 bg-white"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full h-11 bg-gradient-to-r from-[#011133] to-[#2a3f6f] hover:from-[#0b1f4d] hover:to-[#31497d] text-[#f4f1e0] font-medium rounded-xl shadow-lg shadow-[#011133]/15 transition-all"
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
                    <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="register-name">Ad Soyad</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="register-name"
                                    type="text"
                                    placeholder="Adınız Soyadınız"
                                    className="pl-10 h-11 bg-white"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="register-email">E-posta</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="register-email"
                                    type="email"
                                    placeholder="isim@ornek.com"
                                    className="pl-10 h-11 bg-white"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="register-password">Şifre</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="register-password"
                                        type="password"
                                        placeholder="En az 6 karakter"
                                        className="pl-10 h-11 bg-white"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="register-confirm-password">Tekrar</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="register-confirm-password"
                                        type="password"
                                        placeholder="Şifre tekrar"
                                        className="pl-10 h-11 bg-white"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="p-3 text-sm text-green-700 bg-green-50 rounded-lg border border-green-100">
                                {success}
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="w-full h-11 bg-gradient-to-r from-[#23335c] to-[#011133] hover:from-[#2d3f6d] hover:to-[#0b1f4d] text-[#f4f1e0] font-medium rounded-xl shadow-lg shadow-[#011133]/15 transition-all"
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

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-8">
                <ShieldCheck className="w-3.5 h-3.5" />
                AI güvenliği ile korunmaktadır · KVKK uyumlu
            </div>
        </div>
    )
}
