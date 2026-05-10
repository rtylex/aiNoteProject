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
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const stepCards = stepsRef.current?.querySelectorAll('.step-card')
            stepCards?.forEach((card, index) => {
              setTimeout(() => {
                card.classList.add('animate-in')
              }, index * 500)
            })
            sectionObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2 }
    )

    if (stepsRef.current) {
      sectionObserver.observe(stepsRef.current)
    }

    return () => sectionObserver.disconnect()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <WelcomePopup />

      {/* Paper texture overlay */}
      <div className="fixed inset-0 paper-texture pointer-events-none -z-10" />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 pt-24 pb-20 md:pt-32 md:pb-28">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left - Text */}
              <div className="order-2 lg:order-1">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 mb-8">
                  <span className="stamp bg-olive/10 text-olive border-olive">Yapay Zeka</span>
                  <span className="text-sm text-ink-light font-mono-ui tracking-wide">Akademik çalışma asistanı</span>
                </div>

                {/* Main Heading */}
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-ink mb-6 leading-[1.05] font-display">
                  <span className="relative inline-block">
                    <TypewriterText
                      words={typewriterWords}
                      typingSpeed={70}
                      deletingSpeed={35}
                      pauseDuration={2500}
                    />
                  </span>
                </h1>

                {/* Subheading */}
                <p className="text-lg md:text-xl text-ink-light mb-10 max-w-lg leading-relaxed font-body">
                  PDF dosyalarınızı yükleyin, yapay zeka ile analiz edin ve sorularınıza anında cevap alın.
                  Öğrenmek hiç bu kadar kolay olmamıştı.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <Link href="/login">
                    <Button size="lg" className="bg-ink text-paper hover:bg-ink/90 px-8 h-14 text-sm font-medium paper-shadow transition-all hover:-translate-y-0.5 rounded-sm font-mono-ui tracking-wider uppercase">
                      Hemen Başla
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="#how-it-works">
                    <Button size="lg" variant="outline" className="px-8 h-14 text-sm font-medium border-ink/20 text-ink hover:bg-paper-dark hover:border-ink/30 group rounded-sm font-mono-ui tracking-wider uppercase">
                      <Play className="mr-2 h-4 w-4" />
                      Nasıl Çalışır?
                    </Button>
                  </Link>
                </div>

                {/* Mini stats */}
                <div className="flex items-center gap-6 text-sm text-ink-light font-mono-ui">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-olive" />
                    <span>Ücretsiz</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-olive" />
                    <span>Türkçe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-olive" />
                    <span>KVKK Uyumlu</span>
                  </div>
                </div>
              </div>

              {/* Right - Demo Card */}
              <div className="order-1 lg:order-2">
                <div className="relative">
                  {/* Decorative elements */}
                  <div className="absolute -top-6 -left-6 w-24 h-24 bg-terracotta/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-olive/10 rounded-full blur-2xl" />

                  {/* Main card */}
                  <div className="bg-paper-dark border border-parchment paper-shadow-lg rounded-sm p-6 md:p-8 relative paper-fold">
                    {/* Browser bar */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-parchment/50 border-b border-parchment mb-6">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-terracotta/40" />
                        <div className="w-2.5 h-2.5 rounded-full bg-gold/40" />
                        <div className="w-2.5 h-2.5 rounded-full bg-olive/40" />
                      </div>
                      <div className="flex-1 flex justify-center">
                        <div className="bg-paper border border-parchment px-4 py-1 text-xs text-ink-light font-mono-ui rounded-sm">
                          makine-ogrenmesi-notlari.pdf
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Left - PDF Preview */}
                      <div className="bg-paper rounded-sm p-5 border border-parchment">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-sm bg-terracotta/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-terracotta" />
                          </div>
                          <div>
                            <p className="font-medium text-ink text-sm font-display">Yapay Sinir Ağları</p>
                            <p className="text-xs text-ink-light font-mono-ui">Sayfa 12 / 48</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-2.5 bg-parchment rounded-sm w-full" />
                          <div className="h-2.5 bg-parchment rounded-sm w-5/6" />
                          <div className="h-2.5 bg-parchment rounded-sm w-4/5" />
                          <div className="h-2.5 bg-parchment rounded-sm w-full" />
                          <div className="h-2.5 bg-parchment rounded-sm w-3/4" />
                        </div>
                      </div>

                      {/* Right - Chat */}
                      <div className="space-y-4">
                        {/* AI Message */}
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-sm bg-ink flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-paper" />
                          </div>
                          <div className="bg-paper border border-parchment px-4 py-3 rounded-sm text-sm text-ink max-w-sm font-body">
                            Bu belgede geri yayılım kavramını anlatıyorum. Herhangi bir sorunuz var mı?
                          </div>
                        </div>

                        {/* User Message */}
                        <div className="flex gap-3 justify-end">
                          <div className="bg-ink px-4 py-3 rounded-sm text-sm text-paper max-w-sm font-body">
                            Geri yayılımı basit bir örnekle açıklayabilir misin?
                          </div>
                        </div>

                        {/* AI Response */}
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-sm bg-ink flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-paper" />
                          </div>
                          <div className="bg-paper border border-parchment px-4 py-3 rounded-sm text-sm text-ink max-w-sm font-body">
                            Tabii! Düşünün ki bir basketbol atışı yapıyorsunuz ve ıskaladınız. Geri yayılım, hatanızı geriye doğru izleyerek...
                            <span className="inline-block w-1.5 h-4 bg-terracotta ml-1 animate-pulse rounded-sm" />
                          </div>
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
        <section className="relative bg-paper-dark torn-edge-top torn-edge-bottom">
          <div className="absolute inset-0 paper-texture opacity-30 pointer-events-none" />

          <div className="relative container mx-auto px-4 py-16 md:py-24">
            {/* Editorial masthead style */}
            <div className="border-y-2 border-double border-ink/10 py-10 md:py-14">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x md:divide-parchment">
                {[
                  { value: '10K+', label: 'Aktif Kullanıcı', icon: 'users' },
                  { value: '50K+', label: 'Yüklenen Belge', icon: 'file' },
                  { value: '1M+', label: 'AI Sohbeti', icon: 'chat' },
                  { value: '4.9', label: 'Kullanıcı Puanı', icon: 'star' },
                ].map((stat, idx) => (
                  <div key={idx} className="text-center px-4 md:px-8 py-4">
                    {/* Stamp-like number */}
                    <div className="relative inline-block">
                      <span className="text-5xl md:text-7xl font-bold text-ink leading-none font-display tracking-tight">
                        {stat.value}
                      </span>
                      {/* Ink bleed effect */}
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-terracotta/40 rounded-full blur-[1px]" />
                    </div>

                    {/* Label with editorial line */}
                    <div className="mt-5 pt-3 border-t border-ink/10 mx-auto max-w-[120px]">
                      <span className="text-[10px] md:text-xs font-mono-ui tracking-[0.2em] uppercase text-ink-light">
                        {stat.label}
                      </span>
                    </div>

                    {/* Decorative index number */}
                    <div className="mt-3 text-[10px] font-mono-ui text-parchment tracking-widest">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom editorial note */}
            <div className="mt-8 text-center">
              <p className="text-xs font-mono-ui tracking-[0.3em] uppercase text-ink-light/60">
                ·&nbsp;&nbsp;Güncel veriler — 2025&nbsp;&nbsp;·
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 bg-paper scroll-mt-24 relative">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="stamp mb-4 inline-block">3 Adım</span>
              <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4 font-display">
                Başlamak Bu Kadar Kolay
              </h2>
              <p className="text-lg text-ink-light font-body">
                Karmaşık kurulumlar yok, sadece yükle ve konuşmaya başla.
              </p>
            </div>

            <div ref={stepsRef} className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Step 1 */}
              <div className="relative step-card opacity-0 translate-y-8 transition-all duration-700 ease-out [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0">
                <div className="bg-paper-dark rounded-sm p-8 border border-parchment h-full paper-shadow paper-fold relative">
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-gold/20 rounded-sm rotate-12 border border-gold/30 flex items-center justify-center">
                    <span className="text-gold font-mono-ui text-xs font-bold">01</span>
                  </div>
                  <div className="w-12 h-12 rounded-sm bg-terracotta/10 flex items-center justify-center mb-6">
                    <Upload className="w-6 h-6 text-terracotta" />
                  </div>
                  <h3 className="text-xl font-semibold text-ink mb-3 font-display">PDF Yükleyin</h3>
                  <p className="text-ink-light font-body">
                    Ders notlarınızı, kitaplarınızı veya herhangi bir PDF belgesini sürükleyip bırakın.
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ChevronRight className="w-8 h-8 text-parchment" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative step-card opacity-0 translate-y-8 transition-all duration-700 ease-out [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0" style={{ transitionDelay: '150ms' }}>
                <div className="bg-paper-dark rounded-sm p-8 border border-parchment h-full paper-shadow paper-fold relative">
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-olive/20 rounded-sm -rotate-6 border border-olive/30 flex items-center justify-center">
                    <span className="text-olive font-mono-ui text-xs font-bold">02</span>
                  </div>
                  <div className="w-12 h-12 rounded-sm bg-olive/10 flex items-center justify-center mb-6">
                    <Brain className="w-6 h-6 text-olive" />
                  </div>
                  <h3 className="text-xl font-semibold text-ink mb-3 font-display">AI Analiz Etsin</h3>
                  <p className="text-ink-light font-body">
                    Yapay zekamız belgenizi okur, anlar ve sorularınıza hazır hale getirir.
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ChevronRight className="w-8 h-8 text-parchment" />
                </div>
              </div>

              {/* Step 3 */}
              <div className="step-card opacity-0 translate-y-8 transition-all duration-700 ease-out [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0" style={{ transitionDelay: '300ms' }}>
                <div className="bg-paper-dark rounded-sm p-8 border border-parchment h-full paper-shadow paper-fold relative">
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-lavender/20 rounded-sm rotate-3 border border-lavender/30 flex items-center justify-center">
                    <span className="text-lavender font-mono-ui text-xs font-bold">03</span>
                  </div>
                  <div className="w-12 h-12 rounded-sm bg-lavender/10 flex items-center justify-center mb-6">
                    <MessageSquare className="w-6 h-6 text-lavender" />
                  </div>
                  <h3 className="text-xl font-semibold text-ink mb-3 font-display">Sohbet Edin</h3>
                  <p className="text-ink-light font-body">
                    Sorular sorun, özetler isteyin ve konuları derinlemesine keşfetmeye başlayın.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-paper-dark scroll-mt-24 relative">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="stamp mb-4 inline-block border-olive text-olive">Özellikler</span>
              <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4 font-display">
                Öğrenmeyi Kolaylaştıran Araçlar
              </h2>
              <p className="text-lg text-ink-light font-body">
                Her şey tek bir platformda, öğrenciler için tasarlandı.
              </p>
            </div>

            {/* Asymmetric 2x2 Grid */}
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {/* Card 1 - Akıllı Sohbet (Large) */}
              <div className="bg-paper rounded-sm p-8 border border-parchment paper-shadow hover:-translate-y-1 transition-all duration-300 paper-fold">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-sm bg-lavender/10 flex items-center justify-center">
                    <MessageSquare className="w-7 h-7 text-lavender" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-parchment" />
                </div>
                <h3 className="text-xl font-semibold text-ink mb-3 font-display">Akıllı Sohbet</h3>
                <p className="text-ink-light mb-6 leading-relaxed font-body">
                  Belgeleriniz hakkında doğal dilde sorular sorun. AI, içeriği anlayarak size en doğru cevapları verir.
                </p>
                <div className="inline-flex items-center gap-2 bg-olive/10 text-olive px-4 py-2 rounded-sm text-xs font-medium font-mono-ui tracking-wide">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Türkçe dil desteği</span>
                </div>
              </div>

              {/* Card 2 - Anlık Özetler */}
              <div className="bg-paper rounded-sm p-8 border border-parchment paper-shadow hover:-translate-y-1 transition-all duration-300 paper-fold">
                <div className="w-14 h-14 rounded-sm bg-gold/10 flex items-center justify-center mb-6">
                  <Zap className="w-7 h-7 text-gold" />
                </div>
                <h3 className="text-xl font-semibold text-ink mb-3 font-display">Anlık Özetler</h3>
                <p className="text-ink-light leading-relaxed font-body">
                  Uzun belgelerin özünü saniyeler içinde alın. Zaman kazanın, daha çok öğrenin.
                </p>
              </div>

              {/* Card 3 - Çoklu Doküman */}
              <div className="bg-paper rounded-sm p-8 border border-parchment paper-shadow hover:-translate-y-1 transition-all duration-300 paper-fold">
                <div className="w-14 h-14 rounded-sm bg-olive/10 flex items-center justify-center mb-6">
                  <FileText className="w-7 h-7 text-olive" />
                </div>
                <h3 className="text-xl font-semibold text-ink mb-3 font-display">Çoklu Doküman</h3>
                <p className="text-ink-light leading-relaxed font-body">
                  Birden fazla belgeyi aynı anda analiz edin ve karşılaştırmalı çalışmalar yapın.
                </p>
              </div>

              {/* Card 4 - Topluluk Kütüphanesi */}
              <div className="bg-paper rounded-sm p-8 border border-parchment paper-shadow hover:-translate-y-1 transition-all duration-300 paper-fold">
                <div className="w-14 h-14 rounded-sm bg-terracotta/10 flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-terracotta" />
                </div>
                <h3 className="text-xl font-semibold text-ink mb-3 font-display">Topluluk Kütüphanesi</h3>
                <p className="text-ink-light mb-6 leading-relaxed font-body">
                  Diğer öğrencilerin paylaştığı notlara erişin veya kendi notlarınızı toplulukla paylaşın.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-parchment text-ink-light px-3 py-1.5 rounded-sm text-xs font-mono-ui">Matematik</span>
                  <span className="bg-parchment text-ink-light px-3 py-1.5 rounded-sm text-xs font-mono-ui">Fizik</span>
                  <span className="bg-parchment text-ink-light px-3 py-1.5 rounded-sm text-xs font-mono-ui">Bilgisayar</span>
                  <span className="bg-parchment text-ink-light px-3 py-1.5 rounded-sm text-xs font-mono-ui">+50</span>
                </div>
              </div>
            </div>

            {/* Security Card - Full Width */}
            <div className="max-w-5xl mx-auto mt-6">
              <div className="bg-ink rounded-sm p-8 paper-shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 paper-texture opacity-20" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-sm bg-paper/10 flex items-center justify-center">
                      <Shield className="w-7 h-7 text-paper" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-paper mb-1 font-display">Güvenliğiniz Öncelikli</h3>
                      <p className="text-paper/70 font-body">
                        Belgeleriniz şifreli olarak saklanır ve sadece size özeldir.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-paper/80 font-mono-ui">
                      <CheckCircle2 className="w-4 h-4 text-olive" />
                      <span>256-bit SSL</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-paper/80 font-mono-ui">
                      <CheckCircle2 className="w-4 h-4 text-olive" />
                      <span>KVKK Uyumlu</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-ink relative overflow-hidden">
          <div className="absolute inset-0 paper-texture opacity-10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-paper/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-terracotta/10 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-paper/10 backdrop-blur-sm px-4 py-2 rounded-sm text-paper/90 text-sm mb-8 font-mono-ui tracking-wide">
                <Sparkles className="w-4 h-4 text-gold" />
                <span>Binlerce öğrenci zaten kullanıyor</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-bold text-paper mb-6 leading-tight font-display">
                Öğrenme şeklinizi <br className="hidden sm:block" />
                <span className="text-gold">değiştirmeye hazır mısınız?</span>
              </h2>

              <p className="text-lg text-paper/80 mb-10 max-w-2xl mx-auto font-body">
                BİTİG ile notlarınız akıllı bir öğrenme asistanına dönüşsün.
                Hemen ücretsiz başlayın.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button size="lg" className="bg-paper text-ink hover:bg-paper-dark px-10 h-14 text-base font-semibold paper-shadow rounded-sm group font-mono-ui tracking-wider uppercase">
                    Ücretsiz Başlayın
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-center gap-6 mt-8 text-paper/70 text-sm font-mono-ui">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-olive" />
                  <span>Kredi kartı gerektirmez</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-olive" />
                  <span>Anında erişim</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-paper-dark border-t border-parchment">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl font-bold text-ink tracking-tight">
                BİTİG
              </span>
              <span className="text-xs text-ink-light font-mono-ui tracking-wide">/bi·tig/ · Göktürkçe</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-ink-light font-body">
              <Link href="#" className="hover:text-ink transition-colors">Gizlilik</Link>
              <Link href="#" className="hover:text-ink transition-colors">Kullanım Şartları</Link>
              <Link href="#" className="hover:text-ink transition-colors">İletişim</Link>
            </div>
          </div>
          <div className="border-t border-parchment mt-8 pt-8 text-center text-sm text-ink-light font-mono-ui">
            2025 BİTİG. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  )
}
