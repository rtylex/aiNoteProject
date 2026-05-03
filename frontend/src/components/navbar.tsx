'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BookOpen, LogOut, Library, Shield, Menu, X, Home, FolderOpen, Users } from 'lucide-react'
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
    const { user, accessToken, logout } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [isAdmin, setIsAdmin] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const navRef = useRef<HTMLElement | null>(null)
    const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
    const [activeDesktopHref, setActiveDesktopHref] = useState('/')
    const [desktopIndicator, setDesktopIndicator] = useState({
        left: 0,
        width: 0,
        opacity: 0
    })

    const desktopLinks = user
        ? [
            { href: '/', label: 'Ana Sayfa' },
            { href: '/dashboard', label: 'Kütüphanem' },
            { href: '/library', label: 'Topluluk' }
        ]
        : [
            { href: '/', label: 'Ana Sayfa' },
            { href: '#features', label: 'Özellikler' },
            { href: '#how-it-works', label: 'Nasıl Çalışır' }
        ]

    // Desktop link stilini belirle
    const getLinkClassName = (href: string) => {
        const isActive = activeDesktopHref === href
        return `relative z-10 px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${isActive
            ? 'text-[#011133]'
            : 'text-gray-600 hover:text-gray-900'
            }`
    }

    const getMobileLinkClassName = (href: string) => {
        const isActive = pathname === href || (href === '/dashboard' && pathname?.startsWith('/dashboard'))
        return `flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl transition-all ${isActive
            ? 'bg-[#d9dff0] text-[#011133]'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`
    }

    const syncDesktopActiveHref = () => {
        if (user) {
            if (pathname?.startsWith('/dashboard')) {
                setActiveDesktopHref('/dashboard')
                return
            }
            if (pathname === '/library') {
                setActiveDesktopHref('/library')
                return
            }
            setActiveDesktopHref('/')
            return
        }

        // Landing sayfasında hash linkler de aktif görünsün
        if (pathname === '/' && typeof window !== 'undefined') {
            const hash = window.location.hash
            if (hash === '#features' || hash === '#how-it-works') {
                setActiveDesktopHref(hash)
                return
            }
        }
        setActiveDesktopHref('/')
    }

    const updateDesktopIndicator = () => {
        const navElement = navRef.current
        const activeLink = linkRefs.current[activeDesktopHref]

        if (!navElement || !activeLink) {
            setDesktopIndicator((prev) => ({ ...prev, opacity: 0 }))
            return
        }

        const navRect = navElement.getBoundingClientRect()
        const linkRect = activeLink.getBoundingClientRect()

        setDesktopIndicator({
            left: linkRect.left - navRect.left,
            width: linkRect.width,
            opacity: 1
        })
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

    useEffect(() => {
        syncDesktopActiveHref()
    }, [pathname, user])

    useEffect(() => {
        if (!user && pathname === '/') {
            const handleHashChange = () => syncDesktopActiveHref()
            window.addEventListener('hashchange', handleHashChange)
            return () => window.removeEventListener('hashchange', handleHashChange)
        }
    }, [user, pathname])

    useEffect(() => {
        const rafId = requestAnimationFrame(() => updateDesktopIndicator())
        const handleResize = () => updateDesktopIndicator()

        window.addEventListener('resize', handleResize)
        return () => {
            cancelAnimationFrame(rafId)
            window.removeEventListener('resize', handleResize)
        }
    }, [activeDesktopHref, desktopLinks.length])

    const handleLogout = () => {
        logout()
        router.replace('/login')
        router.refresh()
    }

    return (
        <header className="sticky top-0 z-[999] w-full transition-all duration-300">
            {/* backdrop-blur only on top bar — if it wraps the header, fixed mobile menu collapses (zero height CB) */}
            <div className="border-b border-gray-200/50 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
            <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                {/* Logo - Sol */}
                <Link href="/" className="flex items-center group">
                    <Image
                        src="/bitigAcikTema.png"
                        alt="YirikAI Logo"
                        width={140}
                        height={45}
                        className="block dark:hidden group-hover:scale-105 transition-transform object-contain"
                        priority
                    />
                    <Image
                        src="/bitigKapali (2).png"
                        alt="YirikAI Logo"
                        width={140}
                        height={45}
                        className="hidden dark:block group-hover:scale-105 transition-transform object-contain"
                        priority
                    />
                </Link>

                {/* Orta Menü - Pill şeklinde (Desktop) */}
                <nav
                    ref={navRef}
                    aria-label="Ana navigasyon"
                    className="hidden md:flex relative items-center bg-gray-50/50 backdrop-blur-sm rounded-full px-2 py-1.5 border border-gray-200/50 shadow-sm"
                >
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1.5 bottom-1.5 rounded-full bg-[#d9dff0] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-300 ease-out motion-reduce:transition-none"
                        style={{
                            width: `${desktopIndicator.width}px`,
                            transform: `translateX(${desktopIndicator.left}px)`,
                            opacity: desktopIndicator.opacity
                        }}
                    />
                    {user ? (
                        <>
                            <Link
                                href="/"
                                className={getLinkClassName('/')}
                                aria-current={activeDesktopHref === '/' ? 'page' : undefined}
                                ref={(el) => {
                                    linkRefs.current['/'] = el
                                }}
                            >
                                Ana Sayfa
                            </Link>
                            <Link
                                href="/dashboard"
                                className={getLinkClassName('/dashboard')}
                                aria-current={activeDesktopHref === '/dashboard' ? 'page' : undefined}
                                ref={(el) => {
                                    linkRefs.current['/dashboard'] = el
                                }}
                            >
                                Kütüphanem
                            </Link>
                            <Link
                                href="/library"
                                className={getLinkClassName('/library')}
                                aria-current={activeDesktopHref === '/library' ? 'page' : undefined}
                                ref={(el) => {
                                    linkRefs.current['/library'] = el
                                }}
                            >
                                Topluluk
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/"
                                className={getLinkClassName('/')}
                                aria-current={activeDesktopHref === '/' ? 'page' : undefined}
                                ref={(el) => {
                                    linkRefs.current['/'] = el
                                }}
                                onClick={() => setActiveDesktopHref('/')}
                            >
                                Ana Sayfa
                            </Link>
                            <Link
                                href="#features"
                                className={getLinkClassName('#features')}
                                ref={(el) => {
                                    linkRefs.current['#features'] = el
                                }}
                                onClick={() => setActiveDesktopHref('#features')}
                            >
                                Özellikler
                            </Link>
                            <Link
                                href="#how-it-works"
                                className={getLinkClassName('#how-it-works')}
                                ref={(el) => {
                                    linkRefs.current['#how-it-works'] = el
                                }}
                                onClick={() => setActiveDesktopHref('#how-it-works')}
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
                                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:ring-2 hover:ring-[#d9dff0] transition-all">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                                        <AvatarFallback className="bg-gradient-to-br from-[#011133] to-[#23335c] text-[#f4f1e0] text-sm font-medium">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.full_name || 'Kullanıcı'}</p>
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
                            <Button className="bg-gradient-to-r from-[#011133] to-[#23335c] hover:from-[#0b1f4d] hover:to-[#2d3e6b] text-[#f4f1e0] px-6 h-10 text-sm font-medium shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 rounded-full">
                                Giriş Yap
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-16 bg-white dark:bg-slate-950 z-[1000] animate-in slide-in-from-top duration-200 overflow-y-auto">
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
                                    <Button className="w-full bg-gradient-to-r from-[#011133] to-[#23335c] hover:from-[#0b1f4d] hover:to-[#2d3e6b] text-[#f4f1e0] h-12 text-base font-medium shadow-md rounded-xl">
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

