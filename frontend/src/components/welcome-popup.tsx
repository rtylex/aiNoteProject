'use client'

import { useState } from 'react'
import { X, BookOpen, Users, BarChart3 } from 'lucide-react'

export default function WelcomePopup() {
    const [isOpen, setIsOpen] = useState(true)

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-3xl mx-4 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden font-[family-name:var(--font-orbitron)]">
                {/* Close Button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800/50"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="px-8 py-10 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-800/80 rounded-full border border-slate-600/50 mb-6">
                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                        <span className="text-xs font-medium text-slate-300 tracking-wider">AKADEMİK AR-GE</span>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wide mb-2">
                        AKADEMİK ZEKA
                    </h1>
                    <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500 bg-clip-text text-transparent mb-6">
                        AI
                    </h2>

                    {/* Description */}
                    <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto mb-10 leading-relaxed">
                        Akademik verilerle eğitilen yapay zeka dil modeli, öğrencilere çalışma süreçlerinde rehberlik
                        ederken; entegre sosyal ağ yapısıyla tüm paydaşları tek bir ekosistemde buluşturur.
                    </p>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                        {/* Card 1 */}
                        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-5 border border-slate-700/50 text-left">
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-white font-semibold">Yapay Zeka Asistanı</h3>
                                <BookOpen className="w-5 h-5 text-slate-500" />
                            </div>
                            <p className="text-slate-500 text-xs leading-relaxed">
                                Literatür taraması ve akademik dilde özel rehberlik.
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-5 border border-slate-700/50 text-left">
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-white font-semibold">Sosyal Ekosistem</h3>
                                <Users className="w-5 h-5 text-slate-500" />
                            </div>
                            <p className="text-slate-500 text-xs leading-relaxed">
                                Akademisyen ve öğrencilerin anlık iletişim kurabildiği güvenilir ağ.
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-5 border border-slate-700/50 text-left">
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-white font-semibold">Akıllı Analiz</h3>
                                <BarChart3 className="w-5 h-5 text-slate-500" />
                            </div>
                            <p className="text-slate-500 text-xs leading-relaxed">
                                Eksikleri tespit eden adaptif deneme ve tekrar haritaları.
                            </p>
                        </div>
                    </div>

                    {/* Credits */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 pt-6 border-t border-slate-800">
                        <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Proje Geliştiricisi</p>
                            <p className="text-lg font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                Emirhan Yirik
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Proje Danışmanı</p>
                            <p className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                Dr. Öğr. Üyesi Doruk Ayberkin
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
