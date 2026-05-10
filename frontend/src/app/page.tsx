'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  MessageSquare,
  Shield,
  Zap,
  FileText,
  Brain,
  Users,
  Sparkles,
  ChevronRight,
  Play,
  Upload,
  Star,
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

/* ─── Color token maps (static for Tailwind) ─── */
const COLOR_MAP: Record<string, { text: string; bg: string }> = {
  olive: { text: 'text-olive', bg: 'bg-olive/10' },
  terracotta: { text: 'text-terracotta', bg: 'bg-terracotta/10' },
  lavender: { text: 'text-lavender', bg: 'bg-lavender/10' },
  gold: { text: 'text-gold', bg: 'bg-gold/10' },
}

const STAGGER_DELAY = 80

export default function Home() {
  const stepsRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const heroCardRef = useRef<HTMLDivElement>(null)

  /* ─── Scroll-triggered stagger (Skill §7: stagger-sequence) ─── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = entry.target.querySelectorAll<HTMLElement>('.reveal-item')
            cards.forEach((card, index) => {
              setTimeout(() => {
                card.style.opacity = '1'
                card.style.transform = 'translateY(0)'
              }, index * STAGGER_DELAY)
            })
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    )

    if (stepsRef.current) observer.observe(stepsRef.current)
    if (featuresRef.current) observer.observe(featuresRef.current)

    return () => observer.disconnect()
  }, [])

  /* ─── Hero card 3D tilt (Skill §7: parallax-subtle) ─── */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroCardRef.current) return
    const rect = heroCardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height
    setMousePos({ x: x * 4, y: y * -4 })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: 0, y: 0 })
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
                <div className="inline-flex items-center gap-2 mb-8 reveal-item opacity-0 translate-y-4 transition-all duration-500">
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
                  <Link href="/login" className="reveal-item opacity-0 translate-y-4" style={{ transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1) 100ms' }}>
                    <Button size="lg" className="bg-ink text-paper hover:bg-ink/90 px-8 h-14 text-sm font-medium paper-shadow transition-all hover:-translate-y-0.5 hover:shadow-lg rounded-sm font-mono-ui tracking-wider uppercase active:scale-[0.97]">
                      Hemen Başla
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="#how-it-works" className="reveal-item opacity-0 translate-y-4" style={{ transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1) 200ms' }}>
                    <Button size="lg" variant="outline" className="px-8 h-14 text-sm font-medium border-ink/20 text-ink hover:bg-paper-dark hover:border-ink/30 group rounded-sm font-mono-ui tracking-wider uppercase active:scale-[0.97]">
                      <Play className="mr-2 h-4 w-4" />
                      Nasıl Çalışır?
                    </Button>
                  </Link>
                </div>

                {/* Mini stats — Touch target ≥44px (Skill §2) */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-ink-light font-mono-ui">
                  {[
                    { icon: CheckCircle2, text: 'Ücretsiz' },
                    { icon: CheckCircle2, text: 'Türkçe' },
                    { icon: CheckCircle2, text: 'KVKK Uyumlu' }
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-parchment/50 transition-colors cursor-default"
                      style={{ minHeight: 44 }}
                    >
                      <item.icon className="w-5 h-5 text-olive shrink-0" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right - Demo Card with 3D tilt */}
              <div className="order-1 lg:order-2" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                <div className="relative" style={{ perspective: '1000px' }}>
                  {/* Decorative glow orbs */}
                  <div className="absolute -top-8 -left-8 w-32 h-32 bg-terracotta/15 rounded-full blur-3xl transition-transform duration-700"
                    style={{ transform: `translate(${mousePos.x * 2}px, ${mousePos.y * 2}px)` }} />
                  <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-olive/15 rounded-full blur-3xl transition-transform duration-700"
                    style={{ transform: `translate(${mousePos.x * -2}px, ${mousePos.y * -2}px)` }} />

                  {/* Main card */}
                  <div
                    ref={heroCardRef}
                    className="bg-paper-dark border border-parchment paper-shadow-lg rounded-sm p-6 md:p-8 relative paper-fold transition-transform duration-200 ease-out will-change-transform"
                    style={{
                      transform: `rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg)`,
                      transformStyle: 'preserve-3d'
                    }}
                  >
                    {/* Browser bar */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-parchment/50 border-b border-parchment mb-6 rounded-t-sm">
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
                      {/* PDF Preview */}
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
                          {[100, 83, 80, 100, 75].map((w, i) => (
                            <div key={i} className="h-2.5 bg-parchment rounded-sm" style={{ width: `${w}%` }} />
                          ))}
                        </div>
                      </div>

                      {/* Chat preview */}
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-sm bg-ink flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-paper" />
                          </div>
                          <div className="bg-paper border border-parchment px-4 py-3 rounded-sm text-sm text-ink max-w-sm font-body">
                            Bu belgede geri yayılım kavramını anlatıyorum. Herhangi bir sorunuz var mı?
                          </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                          <div className="bg-ink px-4 py-3 rounded-sm text-sm text-paper max-w-sm font-body">
                            Geri yayılımı basit bir örnekle açıklayabilir misin?
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-sm bg-ink flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-paper" />
                          </div>
                          <div className="bg-paper border border-parchment px-4 py-3 rounded-sm text-sm text-ink max-w-sm font-body">
                            Tabii! Düşünün ki bir basketbol atışı yapıyorsunuz ve ıskaladınız...
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

        {/* Stats Section — Editorial masthead with icons */}
        <section className="relative bg-paper-dark torn-edge-top torn-edge-bottom overflow-hidden">
          <div className="absolute inset-0 paper-texture opacity-30 pointer-events-none" />

          <div className="relative container mx-auto px-4 py-16 md:py-24">
            <div className="border-y-2 border-double border-ink/10 py-10 md:py-14">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x md:divide-parchment">
                {[
                  { value: '10K+', label: 'Aktif Kullanıcı', icon: Users, color: 'olive' },
                  { value: '50K+', label: 'Yüklenen Belge', icon: FileText, color: 'terracotta' },
                  { value: '1M+', label: 'AI Sohbeti', icon: MessageSquare, color: 'lavender' },
                  { value: '4.9', label: 'Kullanıcı Puanı', icon: Star, color: 'gold' },
                ].map((stat, idx) => {
                  const c = COLOR_MAP[stat.color]
                  return (
                    <div
                      key={idx}
                      className="text-center px-4 md:px-8 py-4 group cursor-default"
                      style={{ minHeight: 160 }}
                    >
                      {/* Icon with paper circle */}
                      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full ${c.bg} mb-4 transition-transform duration-200 group-hover:scale-110`}>
                        <stat.icon className={`w-7 h-7 ${c.text}`} strokeWidth={1.5} />
                      </div>

                      {/* Stamp-like number */}
                      <div className="relative inline-block">
                        <span className="text-5xl md:text-7xl font-bold text-ink leading-none font-display tracking-tight">
                          {stat.value}
                        </span>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-terracotta/40 rounded-full blur-[1px]" />
                      </div>

                      {/* Label */}
                      <div className="mt-5 pt-3 border-t border-ink/10 mx-auto max-w-[140px]">
                        <span className="text-[10px] md:text-xs font-mono-ui tracking-[0.2em] uppercase text-ink-light">
                          {stat.label}
                        </span>
                      </div>

                      {/* Decorative index */}
                      <div className="mt-3 text-[10px] font-mono-ui text-parchment tracking-widest">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

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
              <span className="stamp mb-4 inline-block reveal-item opacity-0 translate-y-4 transition-all duration-500">3 Adım</span>
              <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4 font-display reveal-item opacity-0 translate-y-4 transition-all duration-500" style={{ transitionDelay: '80ms' }}>
                Başlamak Bu Kadar Kolay
              </h2>
              <p className="text-lg text-ink-light font-body reveal-item opacity-0 translate-y-4 transition-all duration-500" style={{ transitionDelay: '160ms' }}>
                Karmaşık kurulumlar yok, sadece yükle ve konuşmaya başla.
              </p>
            </div>

            <div ref={stepsRef} className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { num: '01', icon: Upload, color: 'terracotta', title: 'PDF Yükleyin', desc: 'Ders notlarınızı, kitaplarınızı veya herhangi bir PDF belgesini sürükleyip bırakın.', rotate: 12 },
                { num: '02', icon: Brain, color: 'olive', title: 'AI Analiz Etsin', desc: 'Yapay zekamız belgenizi okur, anlar ve sorularınıza hazır hale getirir.', rotate: -6 },
                { num: '03', icon: MessageSquare, color: 'lavender', title: 'Sohbet Edin', desc: 'Sorular sorun, özetler isteyin ve konuları derinlemesine keşfetmeye başlayın.', rotate: 3 }
              ].map((step, idx) => {
                const c = COLOR_MAP[step.color]
                return (
                  <div
                    key={idx}
                    className="relative group"
                    style={{ minHeight: 260 }}
                  >
                    {/* Arrow between cards */}
                    {idx < 2 && (
                      <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                        <ChevronRight className="w-8 h-8 text-parchment group-hover:text-terracotta/40 transition-colors duration-300" />
                      </div>
                    )}

                    <div
                      className={`bg-paper-dark rounded-sm p-8 border border-parchment h-full paper-shadow paper-fold relative transition-all duration-200 active:scale-[0.97] group-hover:-translate-y-1 group-hover:shadow-lg group-hover:border-terracotta/20 ${c.bg}`}
                      style={{ willChange: 'transform' }}
                    >
                      {/* Sticky note corner */}
                      <div
                        className="absolute -top-3 -right-3 w-10 h-10 bg-gold/20 rounded-sm border border-gold/30 flex items-center justify-center paper-shadow transition-transform duration-200 group-hover:rotate-0"
                        style={{ transform: `rotate(${step.rotate}deg)` }}
                      >
                        <span className="text-gold font-mono-ui text-xs font-bold">{step.num}</span>
                      </div>

                      <div className={`w-12 h-12 rounded-sm ${c.bg} flex items-center justify-center mb-6 transition-transform duration-200 group-hover:scale-105`}>
                        <step.icon className={`w-6 h-6 ${c.text}`} />
                      </div>

                      <h3 className="text-xl font-semibold text-ink mb-3 font-display">{step.title}</h3>
                      <p className="text-ink-light font-body leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
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

            {/* Asymmetric 2x2 Grid with stagger */}
            <div ref={featuresRef} className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto items-stretch">
              {[
                {
                  icon: MessageSquare,
                  iconColor: 'text-lavender',
                  iconBg: 'bg-lavender/10',
                  title: 'Akıllı Sohbet',
                  desc: 'Belgeleriniz hakkında doğal dilde sorular sorun. AI, içeriği anlayarak size en doğru cevapları verir.',
                  badge: { text: 'Türkçe dil desteği', icon: CheckCircle2, color: 'bg-olive/10 text-olive' }
                },
                {
                  icon: Zap,
                  iconColor: 'text-gold',
                  iconBg: 'bg-gold/10',
                  title: 'Anlık Özetler',
                  desc: 'Uzun belgelerin özünü saniyeler içinde alın. Zaman kazanın, daha çok öğrenin.'
                },
                {
                  icon: FileText,
                  iconColor: 'text-olive',
                  iconBg: 'bg-olive/10',
                  title: 'Çoklu Doküman',
                  desc: 'Birden fazla belgeyi aynı anda analiz edin ve karşılaştırmalı çalışmalar yapın.'
                },
                {
                  icon: Users,
                  iconColor: 'text-terracotta',
                  iconBg: 'bg-terracotta/10',
                  title: 'Topluluk Kütüphanesi',
                  desc: 'Diğer öğrencilerin paylaştığı notlara erişin veya kendi notlarınızı toplulukla paylaşın.',
                  tags: ['Matematik', 'Fizik', 'Bilgisayar', '+50']
                }
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="bg-paper rounded-sm p-8 border border-parchment paper-shadow reveal-item opacity-0 translate-y-6 transition-all duration-300 cursor-default group h-full flex flex-col"
                  style={{
                    willChange: 'transform, box-shadow',
                    transitionDelay: `${idx * STAGGER_DELAY}ms`
                  }}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-14 h-14 rounded-sm ${feature.iconBg} flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}>
                      <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                    </div>
                    <ArrowRight className="w-5 h-5 text-parchment group-hover:text-terracotta group-hover:translate-x-1 transition-all duration-200" />
                  </div>

                  <h3 className="text-xl font-semibold text-ink mb-3 font-display group-hover:text-terracotta transition-colors duration-200">
                    {feature.title}
                  </h3>
                  <p className="text-ink-light mb-6 leading-relaxed font-body flex-grow">
                    {feature.desc}
                  </p>

                  {feature.badge && (
                    <div className={`inline-flex items-center gap-2 ${feature.badge.color} px-4 py-2 rounded-sm text-xs font-medium font-mono-ui tracking-wide mt-auto`}>
                      <feature.badge.icon className="w-4 h-4" />
                      <span>{feature.badge.text}</span>
                    </div>
                  )}

                  {feature.tags && (
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {feature.tags.map((tag) => (
                        <span key={tag} className="bg-parchment text-ink-light px-3 py-1.5 rounded-sm text-xs font-mono-ui group-hover:bg-paper-dark group-hover:text-ink transition-colors duration-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Security Card */}
            <div className="max-w-5xl mx-auto mt-6">
              <div className="bg-ink rounded-sm p-8 paper-shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 paper-texture opacity-20" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-sm bg-paper/10 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
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
                  <Button size="lg" className="bg-paper text-ink hover:bg-paper-dark px-10 h-14 text-base font-semibold paper-shadow rounded-sm group font-mono-ui tracking-wider uppercase transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]">
                    Ücretsiz Başlayın
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-paper/70 text-sm font-mono-ui">
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
              <span className="text-xs text-ink-light font-mono-ui tracking-wide select-none" aria-hidden="true">
                𐰋𐰃𐱅𐰃𐰏 /bi·tig/
              </span>
            </div>
            <div className="flex items-center gap-8 text-sm text-ink-light font-body">
              {['Gizlilik', 'Kullanım Şartları', 'İletişim'].map((link) => (
                <Link
                  key={link}
                  href="#"
                  className="relative hover:text-ink transition-colors duration-200 group"
                >
                  {link}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-terracotta transition-all duration-200 group-hover:w-full" />
                </Link>
              ))}
            </div>
          </div>
          <div className="border-t border-parchment mt-8 pt-8 text-center text-sm text-ink-light font-mono-ui">
            © 2025 BİTİG. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  )
}
