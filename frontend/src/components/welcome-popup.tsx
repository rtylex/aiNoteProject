'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, BookOpen, Users, BarChart3, LogIn } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function WelcomePopup() {
    const [isOpen, setIsOpen] = useState(true)
    const router = useRouter()
    const { user, loading } = useAuth()

    useEffect(() => {
        if (user && !loading) {
            setIsOpen(false)
        }
    }, [user, loading])

    const handleClose = () => {
        setIsOpen(false)
    }

    const handleLogin = () => {
        setIsOpen(false)
        router.push('/login')
    }

    if (loading || user) return null
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden bg-paper rounded-sm border border-parchment paper-shadow-lg">
                {/* Paper texture overlay */}
                <div className="absolute inset-0 paper-texture pointer-events-none" />
                
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 md:top-4 md:right-4 p-2 text-ink-light hover:text-ink transition-colors rounded-sm hover:bg-parchment z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="relative z-10 px-4 py-6 md:px-8 md:py-10 text-center">
                    {/* Logo */}
                    <div className="flex justify-center mb-4 md:mb-6">
                        <span className="font-display text-5xl md:text-6xl font-bold text-ink tracking-tight">
                            BİTİG
                        </span>
                    </div>

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 bg-parchment/80 rounded-sm border border-parchment mb-4 md:mb-6">
                        <span className="w-2 h-2 bg-terracotta rounded-full animate-pulse"></span>
                        <span className="text-[10px] md:text-xs font-medium text-ink-light tracking-wider font-mono-ui uppercase">Akademik AR-GE</span>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-ink tracking-wide mb-1 md:mb-2 font-display">
                        AKADEMİK ZEKA
                    </h1>
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-terracotta mb-4 md:mb-6 font-display">
                        AI
                    </h2>

                    {/* Description */}
                    <p className="text-ink-light text-xs md:text-base max-w-xl mx-auto mb-6 md:mb-8 leading-relaxed px-2 font-body">
                        Akademik verilerle eğitilen yapay zeka dil modeli, öğrencilere çalışma süreçlerinde rehberlik
                        ederken; entegre sosyal ağ yapısıyla tüm paydaşları tek bir ekosistemde buluşturur.
                    </p>

                    {/* Login Button */}
                    <button
                        onClick={handleLogin}
                        className="inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-3.5 bg-ink hover:bg-ink/90 text-paper font-semibold rounded-sm paper-shadow-lg transition-all transform hover:scale-105 mb-6 md:mb-10 font-mono-ui tracking-wide uppercase"
                    >
                        <LogIn className="w-5 h-5" />
                        <span className="text-sm md:text-base">Sisteme Giriş Yap</span>
                    </button>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-10">
                        {/* Card 1 */}
                        <div className="bg-paper-dark rounded-sm p-4 md:p-5 border border-parchment text-left paper-fold">
                            <div className="flex items-start justify-between mb-2 md:mb-3">
                                <h3 className="text-ink font-semibold text-sm md:text-base font-display">Yapay Zeka Asistanı</h3>
                                <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-terracotta flex-shrink-0" />
                            </div>
                            <p className="text-ink-light text-[11px] md:text-xs leading-relaxed font-body">
                                Literatür taraması ve akademik dilde özel rehberlik.
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-paper-dark rounded-sm p-4 md:p-5 border border-parchment text-left paper-fold">
                            <div className="flex items-start justify-between mb-2 md:mb-3">
                                <h3 className="text-ink font-semibold text-sm md:text-base font-display">Sosyal Ekosistem</h3>
                                <Users className="w-4 h-4 md:w-5 md:h-5 text-olive flex-shrink-0" />
                            </div>
                            <p className="text-ink-light text-[11px] md:text-xs leading-relaxed font-body">
                                Akademisyen ve öğrencilerin anlık iletişim kurabildiği güvenilir ağ.
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-paper-dark rounded-sm p-4 md:p-5 border border-parchment text-left paper-fold">
                            <div className="flex items-start justify-between mb-2 md:mb-3">
                                <h3 className="text-ink font-semibold text-sm md:text-base font-display">Akıllı Analiz</h3>
                                <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-lavender flex-shrink-0" />
                            </div>
                            <p className="text-ink-light text-[11px] md:text-xs leading-relaxed font-body">
                                Eksikleri tespit eden adaptif deneme ve tekrar haritaları.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
