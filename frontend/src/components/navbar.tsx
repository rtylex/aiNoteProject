'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BookOpen, LogOut, Library, Shield, Menu, X, Home, FolderOpen, Users } from 'lucide-react'
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Aktif link stilini belirle
    const getLinkClassName = (href: string) => {
        const isActive = pathname === href || (href === '/dashboard' && pathname?.startsWith('/dashboard'))
        return `px-4 py-1.5 text-sm font-medium rounded-full transition-all ${isActive
            ? 'bg-violet-100 text-violet-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`
    }

    const getMobileLinkClassName = (href: string) => {
        const isActive = pathname === href || (href === '/dashboard' && pathname?.startsWith('/dashboard'))
        return `flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl transition-all ${isActive
            ? 'bg-violet-100 text-violet-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false)
    }, [pathname])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.replace('/login')
        router.refresh()
    }

    return (
        <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100">
            <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                {/* Logo - Sol */}
                <Link href="/" className="flex items-center group">
                    <Image
                        src="/YIRIKAI.png"
                        alt="YirikAI Logo"
                        width={120}
                        height={40}
                        className="group-hover:scale-105 transition-transform object-contain"
                        priority
                    />
                </Link>

                {/* Orta Menü - Pill şeklinde (Desktop) */}
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
                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Menü"
                    >
                        {mobileMenuOpen ? (
                            <X className="h-6 w-6" />
                        ) : (
                            <Menu className="h-6 w-6" />
                        )}
                    </button>

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
                        <Link href="/login" className="hidden sm:block">
                            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-6 h-10 text-sm font-medium shadow-md hover:shadow-lg transition-all rounded-full">
                                Giriş Yap
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-16 bg-white z-40 animate-in slide-in-from-top duration-200">
                    <nav className="container mx-auto px-4 py-6 flex flex-col gap-2">
                        {user ? (
                            <>
                                <Link
                                    href="/"
                                    className={getMobileLinkClassName('/')}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Home className="h-5 w-5" />
                                    Ana Sayfa
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className={getMobileLinkClassName('/dashboard')}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <FolderOpen className="h-5 w-5" />
                                    Kütüphanem
                                </Link>
                                <Link
                                    href="/library"
                                    className={getMobileLinkClassName('/library')}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Users className="h-5 w-5" />
                                    Topluluk
                                </Link>
                                {isAdmin && (
                                    <Link
                                        href="/admin"
                                        className={getMobileLinkClassName('/admin')}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Shield className="h-5 w-5" />
                                        Admin Paneli
                                    </Link>
                                )}
                                <div className="border-t border-gray-100 my-4" />
                                <button
                                    onClick={() => {
                                        handleLogout()
                                        setMobileMenuOpen(false)
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <LogOut className="h-5 w-5" />
                                    Çıkış Yap
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/"
                                    className={getMobileLinkClassName('/')}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Home className="h-5 w-5" />
                                    Ana Sayfa
                                </Link>
                                <Link
                                    href="#features"
                                    className={getMobileLinkClassName('#features')}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Özellikler
                                </Link>
                                <Link
                                    href="#how-it-works"
                                    className={getMobileLinkClassName('#how-it-works')}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Nasıl Çalışır
                                </Link>
                                <div className="border-t border-gray-100 my-4" />
                                <Link
                                    href="/login"
                                    className="w-full"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white h-12 text-base font-medium shadow-md rounded-xl">
                                        Giriş Yap
                                    </Button>
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            )}
        </header>
    )
}

