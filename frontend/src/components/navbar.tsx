'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BookOpen, LogOut, Library, Shield, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from '@/lib/auth-context'
import { API_BASE_URL } from '@/lib/api-config'

export function Navbar() {
    const { user, accessToken } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [isAdmin, setIsAdmin] = useState(false)

    // Aktif link stilini belirle
    const getLinkClassName = (href: string) => {
        const isActive = pathname === href || (href === '/dashboard' && pathname?.startsWith('/dashboard'))
        return `px-4 py-1.5 text-sm font-medium rounded-full transition-all ${isActive
            ? 'bg-violet-100 text-violet-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`
    }

    useEffect(() => {
        if (!user || !accessToken) return

        const checkRole = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/admin/me`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                })
                if (res.ok) {
                    const data = await res.json()
                    setIsAdmin(data.role === 'admin')
                }
            } catch (error) {
                console.error('Error checking role:', error)
            }
        }

        checkRole()
    }, [user, accessToken])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.replace('/login')
        router.refresh()
    }

    return (
        <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100">
            <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                {/* Logo - Sol */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                        <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                        YirikAI
                    </span>
                </Link>

                {/* Orta Menü - Pill şeklinde */}
                <nav className="hidden md:flex items-center bg-gray-50 rounded-full px-2 py-1.5 border border-gray-100">
                    {user ? (
                        <>
                            <Link
                                href="/"
                                className={getLinkClassName('/')}
                            >
                                Ana Sayfa
                            </Link>
                            <Link
                                href="/dashboard"
                                className={getLinkClassName('/dashboard')}
                            >
                                Kütüphanem
                            </Link>
                            <Link
                                href="/library"
                                className={getLinkClassName('/library')}
                            >
                                Topluluk
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/"
                                className={getLinkClassName('/')}
                            >
                                Ana Sayfa
                            </Link>
                            <Link
                                href="#features"
                                className={getLinkClassName('#features')}
                            >
                                Özellikler
                            </Link>
                            <Link
                                href="#how-it-works"
                                className={getLinkClassName('#how-it-works')}
                            >
                                Nasıl Çalışır
                            </Link>
                        </>
                    )}
                </nav>

                {/* Sağ Taraf - Profil veya Giriş Yap */}
                <div className="flex items-center gap-3">
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:ring-2 hover:ring-violet-100 transition-all">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                                        <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email ?? 'avatar'} />
                                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-medium">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || 'Kullanıcı'}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/library" className="cursor-pointer">
                                        <Library className="mr-2 h-4 w-4" />
                                        <span>Topluluk Kütüphanesi</span>
                                    </Link>
                                </DropdownMenuItem>
                                {isAdmin && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/admin" className="cursor-pointer">
                                            <Shield className="mr-2 h-4 w-4" />
                                            <span>Admin Paneli</span>
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Çıkış Yap</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Link href="/login">
                            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-6 h-10 text-sm font-medium shadow-md hover:shadow-lg transition-all rounded-full">
                                Giriş Yap
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    )
}
