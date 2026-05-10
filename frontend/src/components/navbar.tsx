'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BookOpen, LogOut, Library, Shield, Menu, X, Home, FolderOpen, Users, ClipboardList } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/lib/auth-context'
import { API_BASE_URL } from '@/lib/api-config'

type NavbarMode = 'full' | 'hidden' | 'compact'

export function Navbar() {
    const { user, accessToken, logout, preferredModel, setPreferredModel } = useAuth()
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

    const [navbarMode, setNavbarMode] = useState<NavbarMode>('full')
    const lastScrollY = useRef(0)
    const ticking = useRef(false)

    const desktopLinks = user
        ? [
            { href: '/', label: 'Ana Sayfa' },
            { href: '/dashboard', label: 'Kütüphanem' },
            { href: '/flashcard', label: 'Flashcard' },
            { href: '/test', label: 'Testlerim' },
            { href: '/library', label: 'Topluluk' }
        ]
        : [
            { href: '/', label: 'Ana Sayfa' },
            { href: '#features', label: 'Özellikler' },
            { href: '#how-it-works', label: 'Nasıl Çalışır' }
        ]

    const getLinkClassName = (href: string) => {
        const isActive = activeDesktopHref === href
        return `relative z-10 px-4 py-1.5 text-xs font-medium tracking-wider uppercase transition-colors font-mono-ui ${isActive
            ? 'text-ink'
            : 'text-ink-light hover:text-ink'
            }`
    }

    const getMobileLinkClassName = (href: string) => {
        const isActive = pathname === href || (href === '/dashboard' && pathname?.startsWith('/dashboard')) || (href === '/flashcard' && pathname?.startsWith('/flashcard')) || (href === '/test' && pathname?.startsWith('/test'))
        return `flex items-center gap-3 px-4 py-3 text-base font-medium rounded-sm transition-all font-mono-ui tracking-wide ${isActive
            ? 'bg-parchment text-ink border-l-2 border-terracotta'
            : 'text-ink-light hover:text-ink hover:bg-paper-dark'
            }`
    }

    const syncDesktopActiveHref = () => {
        if (user) {
            if (pathname?.startsWith('/dashboard')) {
                setActiveDesktopHref('/dashboard')
                return
            }
            if (pathname?.startsWith('/flashcard')) {
                setActiveDesktopHref('/flashcard')
                return
            }
            if (pathname?.startsWith('/test')) {
                setActiveDesktopHref('/test')
                return
            }
            if (pathname === '/library') {
                setActiveDesktopHref('/library')
                return
            }
            setActiveDesktopHref('/')
            return
        }

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

    useEffect(() => {
        const handleScroll = () => {
            if (ticking.current) return

            ticking.current = true
            requestAnimationFrame(() => {
                const currentScrollY = window.scrollY
                const delta = currentScrollY - lastScrollY.current

                if (Math.abs(delta) < 10) {
                    ticking.current = false
                    return
                }

                if (currentScrollY < 10) {
                    setNavbarMode('full')
                } else if (delta > 0 && currentScrollY > 80) {
                    setNavbarMode('hidden')
                } else if (delta < 0) {
                    setNavbarMode('compact')
                }

                lastScrollY.current = currentScrollY
                ticking.current = false
            })
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

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

    const PillLinks = useCallback(() => (
        <nav
            ref={navRef}
            aria-label="Ana navigasyon"
            className="hidden md:flex relative items-center bg-paper-dark/80 backdrop-blur-sm rounded-full px-2 py-1.5 border border-parchment shadow-sm"
        >
            <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1.5 bottom-1.5 rounded-full bg-parchment transition-all duration-300 ease-out"
                style={{
                    width: `${desktopIndicator.width}px`,
                    transform: `translateX(${desktopIndicator.left}px)`,
                    opacity: desktopIndicator.opacity
                }}
            />
            {user ? (
                <>
                    <Link href="/" className={getLinkClassName('/')} ref={(el) => { linkRefs.current['/'] = el }}>Ana Sayfa</Link>
                    <Link href="/dashboard" className={getLinkClassName('/dashboard')} ref={(el) => { linkRefs.current['/dashboard'] = el }}>Kütüphanem</Link>
                    <Link href="/flashcard" className={getLinkClassName('/flashcard')} ref={(el) => { linkRefs.current['/flashcard'] = el }}>Flashcard</Link>
                    <Link href="/test" className={getLinkClassName('/test')} ref={(el) => { linkRefs.current['/test'] = el }}>Testlerim</Link>
                    <Link href="/library" className={getLinkClassName('/library')} ref={(el) => { linkRefs.current['/library'] = el }}>Topluluk</Link>
                </>
            ) : (
                <>
                    <Link href="/" className={getLinkClassName('/')} ref={(el) => { linkRefs.current['/'] = el }} onClick={() => setActiveDesktopHref('/')}>Ana Sayfa</Link>
                    <Link href="#features" className={getLinkClassName('#features')} ref={(el) => { linkRefs.current['#features'] = el }} onClick={() => setActiveDesktopHref('#features')}>Özellikler</Link>
                    <Link href="#how-it-works" className={getLinkClassName('#how-it-works')} ref={(el) => { linkRefs.current['#how-it-works'] = el }} onClick={() => setActiveDesktopHref('#how-it-works')}>Nasıl Çalışır</Link>
                </>
            )}
        </nav>
    ), [user, activeDesktopHref, desktopIndicator])

    return (
        <>
            {/* ========== FULL NAVBAR ========== */}
            <header
                className={`fixed top-0 left-0 right-0 z-[999] transition-all duration-500 ease-out will-change-transform ${
                    navbarMode === 'full' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
                }`}
            >
                <div className="border-b border-parchment bg-paper/80 backdrop-blur-xl">
                    <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                        {/* Logo */}
                        <Link href="/" className="flex items-center group">
                            <span className="font-display text-2xl font-bold text-ink tracking-tight group-hover:text-terracotta transition-colors">
                                BİTİG
                            </span>
                        </Link>

                        {/* Pill Menu */}
                        <PillLinks />

                        {/* Right Side */}
                        <div className="flex items-center gap-3">
                            <button
                                className="md:hidden relative p-2 text-ink-light hover:text-ink hover:bg-paper-dark rounded-sm transition-colors z-[1100]"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-label="Menü"
                            >
                                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>

                            {user ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:ring-2 hover:ring-parchment transition-all">
                                            <Avatar className="h-10 w-10 border-2 border-parchment paper-shadow">
                                                <AvatarFallback className="bg-ink text-paper text-sm font-medium font-mono-ui">
                                                    {user.email?.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56 bg-paper border-parchment paper-shadow" align="end" forceMount>
                                        <DropdownMenuLabel className="font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-medium leading-none font-display">{user.full_name || 'Kullanıcı'}</p>
                                                <p className="text-xs leading-none text-muted-foreground font-mono-ui">{user.email}</p>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-parchment" />
                                        <DropdownMenuItem asChild>
                                            <Link href="/library" className="cursor-pointer font-body"><Library className="mr-2 h-4 w-4" /><span>Topluluk Kütüphanesi</span></Link>
                                        </DropdownMenuItem>
                                        {isAdmin && (
                                            <DropdownMenuItem asChild>
                                                <Link href="/admin" className="cursor-pointer font-body"><Shield className="mr-2 h-4 w-4" /><span>Admin Paneli</span></Link>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator className="bg-parchment" />
                                        <div className="px-2 py-2">
                                            <p className="text-xs font-semibold text-ink-light mb-2 font-mono-ui uppercase tracking-wider">AI Modeli</p>
                                            <div className="flex bg-paper-dark rounded-sm p-1 border border-parchment">
                                                <button
                                                    type="button"
                                                    className={`flex-1 text-xs py-1.5 rounded-sm transition-all font-mono-ui ${preferredModel === 'deepseek' ? 'bg-paper shadow-sm font-medium text-ink border border-parchment' : 'text-ink-light hover:bg-parchment/50'}`}
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreferredModel('deepseek'); }}
                                                >
                                                    Basic
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`flex-1 text-xs py-1.5 rounded-sm transition-all font-mono-ui ${preferredModel === 'gemma' ? 'bg-paper shadow-sm font-medium text-terracotta border border-parchment' : 'text-ink-light hover:bg-parchment/50'}`}
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreferredModel('gemma'); }}
                                                >
                                                    Premium
                                                </button>
                                            </div>
                                        </div>
                                        <DropdownMenuSeparator className="bg-parchment" />
                                        <DropdownMenuItem onClick={handleLogout} className="text-terracotta cursor-pointer font-body">
                                            <LogOut className="mr-2 h-4 w-4" /><span>Çıkış Yap</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <Link href="/login" className="hidden sm:block">
                                    <Button className="bg-ink text-paper hover:bg-ink/90 px-6 h-10 text-xs font-medium paper-shadow transition-all duration-200 rounded-sm font-mono-ui tracking-wider uppercase">
                                        Giriş Yap
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ========== COMPACT NAVBAR ========== */}
            <header
                className={`fixed top-3 left-1/2 z-[998] transition-all duration-500 ease-out will-change-transform ${
                    navbarMode === 'compact'
                        ? '-translate-x-1/2 translate-y-0 opacity-100'
                        : '-translate-x-1/2 -translate-y-24 opacity-0 pointer-events-none'
                }`}
            >
                <div className="bg-paper/95 backdrop-blur-xl border border-parchment rounded-full px-2 py-1.5 paper-shadow-lg">
                    <PillLinks />
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-[64px] bg-paper z-[1000] animate-in slide-in-from-top duration-200 overflow-y-auto overflow-x-hidden paper-texture">
                    <nav className="container mx-auto px-4 py-6 flex flex-col gap-2">
                        {user ? (
                            <>
                                <Link href="/" className={getMobileLinkClassName('/')} onClick={() => setMobileMenuOpen(false)}><Home className="h-5 w-5" />Ana Sayfa</Link>
                                <Link href="/dashboard" className={getMobileLinkClassName('/dashboard')} onClick={() => setMobileMenuOpen(false)}><FolderOpen className="h-5 w-5" />Kütüphanem</Link>
                                <Link href="/flashcard" className={getMobileLinkClassName('/flashcard')} onClick={() => setMobileMenuOpen(false)}><BookOpen className="h-5 w-5" />Flashcard</Link>
                                <Link href="/test" className={getMobileLinkClassName('/test')} onClick={() => setMobileMenuOpen(false)}><ClipboardList className="h-5 w-5" />Testlerim</Link>
                                <Link href="/library" className={getMobileLinkClassName('/library')} onClick={() => setMobileMenuOpen(false)}><Users className="h-5 w-5" />Topluluk</Link>
                                {isAdmin && <Link href="/admin" className={getMobileLinkClassName('/admin')} onClick={() => setMobileMenuOpen(false)}><Shield className="h-5 w-5" />Admin Paneli</Link>}
                                <div className="border-t border-parchment my-4" />
                                <button onClick={() => { handleLogout(); setMobileMenuOpen(false) }} className="flex items-center gap-3 px-4 py-3 text-base font-medium text-terracotta hover:bg-terracotta/10 rounded-sm transition-all font-mono-ui">
                                    <LogOut className="h-5 w-5" />Çıkış Yap
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/" className={getMobileLinkClassName('/')} onClick={() => setMobileMenuOpen(false)}><Home className="h-5 w-5" />Ana Sayfa</Link>
                                <Link href="#features" className={getMobileLinkClassName('#features')} onClick={() => setMobileMenuOpen(false)}>Özellikler</Link>
                                <Link href="#how-it-works" className={getMobileLinkClassName('#how-it-works')} onClick={() => setMobileMenuOpen(false)}>Nasıl Çalışır</Link>
                                <div className="border-t border-parchment my-4" />
                                <Link href="/login" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                                    <Button className="w-full bg-ink text-paper hover:bg-ink/90 h-12 text-base font-medium paper-shadow rounded-sm font-mono-ui tracking-wider uppercase">Giriş Yap</Button>
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            )}
        </>
    )
}
