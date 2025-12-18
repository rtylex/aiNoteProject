'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  MessageSquare,
  Shield,
  Zap,
  BookOpen,
  FileText,
  Brain,
  Users,
  Sparkles,
  ChevronRight,
  Play,
  Upload,
  Search,
  CheckCircle2
} from 'lucide-react'
import { TypewriterText } from '@/components/typewriter-text'
import WelcomePopup from '@/components/welcome-popup'

const typewriterWords = [
  'Belgelerinizle Konuşun',
  'Notlarınızı Özetleyin',
  'Sorularınıza Cevap Alın',
  'PDF\'lerinizi Analiz Edin',
  'Derslerinizi Anlayın'
]

export default function Home() {
  const stepsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Bölüm görünür olduğunda animasyonu başlatan observer
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Bölüm görünür olduğunda kartları sırayla animasyonla göster
            const stepCards = stepsRef.current?.querySelectorAll('.step-card')
            stepCards?.forEach((card, index) => {
              setTimeout(() => {
                card.classList.add('animate-in')
              }, index * 500) // Her kart 500ms arayla
            })
            // Bir kez tetiklendikten sonra izlemeyi durdur
            sectionObserver.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.2 // Bölümün %20'si görünür olduğunda tetikle
      }
    )

    if (stepsRef.current) {
      sectionObserver.observe(stepsRef.current)
    }

    return () => sectionObserver.disconnect()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      {/* Welcome Popup */}
      <WelcomePopup />

      {/* Subtle grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 pt-20 pb-32">
          <div className="max-w-5xl mx-auto">
            {/* Badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Yeni nesil yapay zeka destekli öğrenme platformu</span>
              </div>
            </div>

            {/* Main Heading with Typewriter Effect */}
            <h1 className="text-center text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-8 leading-[1.1] min-h-[160px] md:min-h-[180px] flex items-center justify-center">
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600">
                  <TypewriterText
                    words={typewriterWords}
                    typingSpeed={70}
                    deletingSpeed={35}
                    pauseDuration={2500}
                  />
                </span>
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-indigo-200" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M0,8 Q50,0 100,8 T200,8" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-center text-lg md:text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
              PDF dosyalarınızı yükleyin, yapay zeka ile analiz edin ve sorularınıza anında cevap alın. Öğrenmek hiç bu kadar kolay olmamıştı.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
              <Link href="/login">
                <Button size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 h-14 text-base font-medium shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 rounded-full">
                  Hemen Başla
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="px-8 h-14 text-base font-medium border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300 group rounded-full">
                  <Play className="mr-2 h-4 w-4 text-violet-500 group-hover:text-violet-600" />
                  Nasıl Çalışır?
                </Button>
              </Link>
            </div>

            {/* Hero Visual - Bento Style */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl blur-3xl -z-10" />

              {/* Main demo card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/50 overflow-hidden">
                {/* Browser bar */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                    <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                    <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-white border border-gray-200 px-4 py-1.5 rounded-lg text-xs text-gray-500 font-mono">
                      makine-ogrenmesi-notlari.pdf
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left - PDF Preview */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Yapay Sinir Ağları</p>
                          <p className="text-xs text-gray-400">Sayfa 12 / 48</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>

                    {/* Right - Chat */}
                    <div className="space-y-4">
                      {/* AI Message */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-md text-sm text-gray-700 max-w-sm">
                          Bu belgede geri yayılım (backpropagation) kavramını anlatıyorum. Herhangi bir sorunuz var mı?
                        </div>
                      </div>

                      {/* User Message */}
                      <div className="flex gap-3 justify-end">
                        <div className="bg-gray-900 px-4 py-3 rounded-2xl rounded-tr-md text-sm text-white max-w-sm">
                          Geri yayılımı basit bir örnekle açıklayabilir misin?
                        </div>
                      </div>

                      {/* AI Response */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-md text-sm text-gray-700 max-w-sm">
                          Tabii! Düşünün ki bir basketbol atışı yapıyorsunuz ve ıskaladınız. Geri yayılım, hatanızı geriye doğru izleyerek...
                          <span className="inline-block w-2 h-4 bg-violet-500 ml-1 animate-pulse rounded-sm"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-gray-200 bg-white">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">10K+</div>
                <div className="text-sm text-gray-500">Aktif Kullanıcı</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">50K+</div>
                <div className="text-sm text-gray-500">Yüklenen Belge</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">1M+</div>
                <div className="text-sm text-gray-500">AI Sohbeti</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">4.9</div>
                <div className="text-sm text-gray-500">Kullanıcı Puanı</div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Üç Adımda Başlayın
              </h2>
              <p className="text-lg text-gray-500">
                Karmaşık kurulumlar yok, sadece yükle ve konuşmaya başla.
              </p>
            </div>

            <div ref={stepsRef} className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Step 1 */}
              <div className="relative step-card opacity-0 translate-y-8 transition-all duration-700 ease-out [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0" style={{ transitionDelay: '0ms' }}>
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 h-full">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mb-6">
                    <Upload className="w-6 h-6 text-violet-600" />
                  </div>
                  <div className="text-sm font-medium text-violet-600 mb-2">Adım 1</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">PDF Yükleyin</h3>
                  <p className="text-gray-500">
                    Ders notlarınızı, kitaplarınızı veya herhangi bir PDF belgesini sürükleyip bırakın.
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ChevronRight className="w-8 h-8 text-gray-300" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative step-card opacity-0 translate-y-8 transition-all duration-700 ease-out [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0" style={{ transitionDelay: '150ms' }}>
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 h-full">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-6">
                    <Brain className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="text-sm font-medium text-indigo-600 mb-2">Adım 2</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Analiz Etsin</h3>
                  <p className="text-gray-500">
                    Yapay zekamız belgenizi okur, anlar ve sorularınıza hazır hale getirir.
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ChevronRight className="w-8 h-8 text-gray-300" />
                </div>
              </div>

              {/* Step 3 */}
              <div className="step-card opacity-0 translate-y-8 transition-all duration-700 ease-out [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0" style={{ transitionDelay: '300ms' }}>
                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 h-full">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-6">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-sm font-medium text-purple-600 mb-2">Adım 3</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Sohbet Edin</h3>
                  <p className="text-gray-500">
                    Sorular sorun, özetler isteyin ve konuları derinlemesine keşfetmeye başlayın.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features - Floating Island Style */}
        <section id="features" className="py-24 bg-[#fafafa]">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Öğrenmeyi Kolaylaştıran Özellikler
              </h2>
              <p className="text-lg text-gray-500">
                Her şey tek bir platformda, öğrenciler için tasarlandı.
              </p>
            </div>

            {/* Floating Island Cards - 2x2 Grid */}
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">

              {/* Card 1 - Akıllı Sohbet (Large) */}
              <div className="animate-float-1 bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.1)] transition-shadow duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center">
                    <MessageSquare className="w-7 h-7 text-violet-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Akıllı Sohbet</h3>
                <p className="text-gray-500 mb-6 leading-relaxed">
                  Belgeleriniz hakkında doğal dilde sorular sorun. AI, içeriği anlayarak size en doğru cevapları verir.
                </p>
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Türkçe dil desteği</span>
                </div>
              </div>

              {/* Card 2 - Anlık Özetler */}
              <div className="animate-float-2 bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.1)] transition-shadow duration-300">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-6">
                  <Zap className="w-7 h-7 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Anlık Özetler</h3>
                <p className="text-gray-500 leading-relaxed">
                  Uzun belgelerin özünü saniyeler içinde alın. Zaman kazanın, daha çok öğrenin.
                </p>
              </div>

              {/* Card 3 - Çoklu Doküman */}
              <div className="animate-float-3 bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.1)] transition-shadow duration-300">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6">
                  <FileText className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Çoklu Doküman</h3>
                <p className="text-gray-500 leading-relaxed">
                  Birden fazla belgeyi aynı anda analiz edin ve karşılaştırmalı çalışmalar yapın.
                </p>
              </div>

              {/* Card 4 - Topluluk Kütüphanesi */}
              <div className="animate-float-4 bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.1)] transition-shadow duration-300">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-rose-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Topluluk Kütüphanesi</h3>
                <p className="text-gray-500 mb-6 leading-relaxed">
                  Diğer öğrencilerin paylaştığı notlara erişin veya kendi notlarınızı toplulukla paylaşın.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm">Matematik</span>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm">Fizik</span>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm">Bilgisayar</span>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm">+50</span>
                </div>
              </div>

            </div>

            {/* Security Card - Full Width Floating */}
            <div className="max-w-5xl mx-auto mt-6">
              <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.15)]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">Güvenliğiniz Öncelikli</h3>
                      <p className="text-gray-400">
                        Belgeleriniz şifreli olarak saklanır ve sadece size özeldir. Kurumsal düzeyde güvenlik.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>256-bit SSL</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>KVKK Uyumlu</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white/90 text-sm mb-8">
                <Sparkles className="w-4 h-4" />
                <span>Binlerce öğrenci zaten kullanıyor</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Öğrenme şeklinizi <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">değiştirmeye hazır mısınız?</span>
              </h2>

              <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
                YirikAI ile notlarınız akıllı bir öğrenme asistanına dönüşsün.
                Hemen ücretsiz başlayın.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button size="lg" className="bg-white text-indigo-700 hover:bg-gray-100 px-10 h-14 text-base font-semibold shadow-xl shadow-black/20 rounded-full group">
                    Ücretsiz Başlayın
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-center gap-6 mt-8 text-white/70 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Kredi kartı gerektirmez</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Anında erişim</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">YirikAI</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-500">
              <Link href="#" className="hover:text-gray-900 transition-colors">Gizlilik</Link>
              <Link href="#" className="hover:text-gray-900 transition-colors">Kullanım Şartları</Link>
              <Link href="#" className="hover:text-gray-900 transition-colors">İletişim</Link>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-400">
            2025 YirikAI. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  )
}
