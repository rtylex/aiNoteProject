'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { X, BookOpen, Users, BarChart3, LogIn } from 'lucide-react'

const POPUP_SHOWN_KEY = 'yirikai_welcome_shown'

export default function WelcomePopup() {
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Check if popup was already shown in this browser
        const wasShown = localStorage.getItem(POPUP_SHOWN_KEY)
        if (!wasShown) {
            setIsOpen(true)
        }
    }, [])

    const handleClose = () => {
        // Mark as shown in localStorage
        localStorage.setItem(POPUP_SHOWN_KEY, 'true')
        setIsOpen(false)
    }

    const handleLogin = () => {
        // Mark as shown and redirect to login
        localStorage.setItem(POPUP_SHOWN_KEY, 'true')
        setIsOpen(false)
        router.push('/login')
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl border border-slate-700/50 shadow-2xl font-[family-name:var(--font-orbitron)]">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 md:top-4 md:right-4 p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800/50 z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="px-4 py-6 md:px-8 md:py-10 text-center">
                    {/* Logo */}
                    <div className="flex justify-center mb-4 md:mb-6">
                        <div className="bg-white/95 rounded-2xl px-6 py-3 shadow-lg">
                            <Image
                                src="/YIRIKAI.png"
                                alt="YirikAI Logo"
                                width={180}
                                height={60}
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 bg-slate-800/80 rounded-full border border-slate-600/50 mb-4 md:mb-6">
                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                        <span className="text-[10px] md:text-xs font-medium text-slate-300 tracking-wider">AKADEMİK AR-GE</span>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white tracking-wide mb-1 md:mb-2">
                        AKADEMİK ZEKA
                    </h1>
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500 bg-clip-text text-transparent mb-4 md:mb-6">
                        AI
                    </h2>

                    {/* Description */}
                    <p className="text-slate-400 text-xs md:text-base max-w-xl mx-auto mb-6 md:mb-8 leading-relaxed px-2">
                        Akademik verilerle eğitilen yapay zeka dil modeli, öğrencilere çalışma süreçlerinde rehberlik
                        ederken; entegre sosyal ağ yapısıyla tüm paydaşları tek bir ekosistemde buluşturur.
                    </p>

                    {/* Login Button */}
                    <button
                        onClick={handleLogin}
                        className="inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 mb-6 md:mb-10"
                    >
                        <LogIn className="w-5 h-5" />
                        <span className="text-sm md:text-base">Sisteme Giriş Yap</span>
                    </button>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-10">
                        {/* Card 1 */}
                        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-4 md:p-5 border border-slate-700/50 text-left">
                            <div className="flex items-start justify-between mb-2 md:mb-3">
                                <h3 className="text-white font-semibold text-sm md:text-base">Yapay Zeka Asistanı</h3>
                                <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-slate-500 flex-shrink-0" />
                            </div>
                            <p className="text-slate-500 text-[11px] md:text-xs leading-relaxed">
                                Literatür taraması ve akademik dilde özel rehberlik.
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-4 md:p-5 border border-slate-700/50 text-left">
                            <div className="flex items-start justify-between mb-2 md:mb-3">
                                <h3 className="text-white font-semibold text-sm md:text-base">Sosyal Ekosistem</h3>
                                <Users className="w-4 h-4 md:w-5 md:h-5 text-slate-500 flex-shrink-0" />
                            </div>
                            <p className="text-slate-500 text-[11px] md:text-xs leading-relaxed">
                                Akademisyen ve öğrencilerin anlık iletişim kurabildiği güvenilir ağ.
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-4 md:p-5 border border-slate-700/50 text-left">
                            <div className="flex items-start justify-between mb-2 md:mb-3">
                                <h3 className="text-white font-semibold text-sm md:text-base">Akıllı Analiz</h3>
                                <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-slate-500 flex-shrink-0" />
                            </div>
                            <p className="text-slate-500 text-[11px] md:text-xs leading-relaxed">
                                Eksikleri tespit eden adaptif deneme ve tekrar haritaları.
                            </p>
                        </div>
                    </div>

                    {/* Credits */}
                    <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-16 pt-4 md:pt-6 border-t border-slate-800">
                        <div className="text-center">
                            <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider mb-1">Proje Geliştiricisi</p>
                            <p className="text-base md:text-lg font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                Emirhan Yirik
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider mb-1">Proje Danışmanı</p>
                            <p className="text-base md:text-lg font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                Dr. Öğr. Üyesi Doruk Ayberkin
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
