'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Mail, Lock, UserPlus, LogIn, User } from 'lucide-react'

export default function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            router.push('/')
            router.refresh()
        }
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        // Validate full name
        if (!fullName.trim()) {
            setError('Ad Soyad alanı zorunludur')
            setLoading(false)
            return
        }

        // Validate password confirmation
        if (password !== confirmPassword) {
            setError('Şifreler eşleşmiyor')
            setLoading(false)
            return
        }

        // Validate password length
        if (password.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır')
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName.trim()
                }
            }
        })

        if (error) {
            setError(error.message)
        } else {
            setSuccess('Onay bağlantısı e-posta adresinize gönderildi.')
            // Clear form
            setFullName('')
            setPassword('')
            setConfirmPassword('')
        }
        setLoading(false)
    }

    return (
        <Card className="w-[400px] border-none shadow-2xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Tekrar Hoşgeldiniz
                </CardTitle>
                <CardDescription>
                    AI çalışma alanınıza erişmek için bilgilerinizi girin
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="login">Giriş Yap</TabsTrigger>
                        <TabsTrigger value="register">Kayıt Ol</TabsTrigger>
                    </TabsList>

                    <TabsContent value="login">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">E-posta</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="isim@ornek.com"
                                        className="pl-10"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Şifre</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        className="pl-10"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            {error && (
                                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-100">
                                    {error}
                                </div>
                            )}
                            <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                                Giriş Yap
                            </Button>
                        </form>
                    </TabsContent>

                    <TabsContent value="register">
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="register-name">Ad Soyad</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="register-name"
                                        type="text"
                                        placeholder="Adınız Soyadınız"
                                        className="pl-10"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="register-email">E-posta</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="register-email"
                                        type="email"
                                        placeholder="isim@ornek.com"
                                        className="pl-10"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="register-password">Şifre</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="register-password"
                                        type="password"
                                        placeholder="En az 6 karakter"
                                        className="pl-10"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="register-confirm-password">Şifre Tekrar</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="register-confirm-password"
                                        type="password"
                                        placeholder="Şifrenizi tekrar girin"
                                        className="pl-10"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            {error && (
                                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-100">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md border border-green-100">
                                    {success}
                                </div>
                            )}
                            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                Hesap Oluştur
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter className="flex justify-center text-xs text-gray-500">
                AI Güvenliği ile Korunmaktadır
            </CardFooter>
        </Card>
    )
}
