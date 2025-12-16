'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Brain, Users, BarChart3, Mail } from 'lucide-react'

export default function IntroPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Starry background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
        {/* Stars effect */}
        <div className="stars absolute inset-0" style={{
          backgroundImage: `radial-gradient(2px 2px at 20px 30px, white, transparent),
                           radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
                           radial-gradient(1px 1px at 90px 40px, white, transparent),
                           radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.9), transparent),
                           radial-gradient(1px 1px at 230px 80px, white, transparent),
                           radial-gradient(2px 2px at 300px 150px, rgba(255,255,255,0.7), transparent),
                           radial-gradient(1px 1px at 370px 50px, white, transparent),
                           radial-gradient(2px 2px at 450px 180px, rgba(255,255,255,0.8), transparent),
                           radial-gradient(1px 1px at 520px 90px, white, transparent),
                           radial-gradient(2px 2px at 600px 130px, rgba(255,255,255,0.6), transparent)`,
          backgroundSize: '650px 200px'
        }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 min-h-screen flex flex-col items-center justify-center">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <span className="text-3xl font-bold tracking-wide text-cyan-300">yirik</span>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 px-4 py-2 rounded-full text-sm text-indigo-300 mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          AKADEMİK AR-GE
        </div>

        {/* Main Title */}
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-4 tracking-tight">
          AKADEMİK ZEKA
        </h1>
        <h2 className="text-4xl md:text-6xl font-bold text-center mb-8 tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            AI
          </span>
        </h2>

        {/* Description */}
        <p className="text-center text-gray-400 max-w-3xl mb-12 text-lg leading-relaxed">
          Akademik verilerle eğitilen yapay zeka dil modeli, öğrencilere çalışma süreçlerinde rehberlik
          ederken; entegre sosyal ağ yapısıyla tüm paydaşları tek bir ekosistemde buluşturur.
        </p>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 w-full max-w-4xl">
          {/* Card 1 */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-cyan-400">Yapay Zeka Asistanı</h3>
              <Brain className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-sm text-gray-400">
              Literatür taraması ve akademik dilde özel rehberlik.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-400">Sosyal Ekosistem</h3>
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-sm text-gray-400">
              Akademisyen ve öğrencilerin anlık iletişim kurabildiği güvenilir ağ.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-pink-500/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-pink-400">Akıllı Analiz</h3>
              <BarChart3 className="w-6 h-6 text-pink-400" />
            </div>
            <p className="text-sm text-gray-400">
              Eksikleri tespit eden adaptif deneme ve tekrar haritaları.
            </p>
          </div>
        </div>

        {/* Credits */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 mb-12 text-center">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">PROJE GELİŞTİRİCİSİ</p>
            <p className="text-lg font-semibold text-white">Emirhan Yirik</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">PROJE DANIŞMANI</p>
            <p className="text-lg font-semibold text-white">Dr. Öğr. Üyesi Doruk Ayberkin</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/home">
            <Button
              size="lg"
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-8 h-14 text-base font-semibold rounded-xl shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30 transition-all"
            >
              Sisteme Giriş Yap
            </Button>
          </Link>
          <Link href="mailto:info@yirik.site">
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 px-8 h-14 text-base font-medium rounded-xl"
            >
              <Mail className="mr-2 h-5 w-5" />
              İletişime Geç
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
