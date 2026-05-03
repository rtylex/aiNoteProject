'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Quote, Sparkles, ScrollText, BookOpenCheck, Star } from 'lucide-react'

type Props = {
    activeTab: 'login' | 'register'
}

const testimonials = [
    {
        name: 'Zeynep K.',
        role: 'Tıp Fakültesi, 3. Sınıf',
        avatar: 'ZK',
        rating: 5,
        text: 'Sınav haftası tam bir kabustu. BİTİG sayesinde 400 sayfalık ders notlarımı saatler içinde özetleyip soru-cevap yapabildim. Hayat kurtarıcı.'
    },
    {
        name: 'Ahmet Y.',
        role: 'Yazılım Mühendisliği',
        avatar: 'AY',
        rating: 5,
        text: 'Akademik makaleleri Türkçe açıklayan bir asistan arıyordum. BİTİG bunu yapıyor, üstelik kaynak göstererek. Artık vazgeçemiyorum.'
    },
    {
        name: 'Elif D.',
        role: 'Hukuk Fakültesi',
        avatar: 'ED',
        rating: 5,
        text: 'Ders notlarımı yükledim, sınava hazırlanırken sorular sordum. Cevaplar kendi notlarımdan geliyor, uydurma değil. Bu güveni veren tek araç.'
    },
    {
        name: 'Mehmet S.',
        role: 'Doktora Öğrencisi',
        avatar: 'MS',
        rating: 5,
        text: 'Tezim için onlarca PDF taramam gerekiyordu. BİTİG ile çoklu doküman analizi yaparak haftalarca süren işi günlere indirdim.'
    }
]

export default function LoginSidePanel({ activeTab }: Props) {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        if (activeTab !== 'login') return
        const id = setInterval(() => {
            setIndex((prev) => (prev + 1) % testimonials.length)
        }, 6000)
        return () => clearInterval(id)
    }, [activeTab])

    return (
        <div className="relative w-full h-full bg-gradient-to-br from-[#011133] via-[#0b1f4d] to-[#23335c] text-[#f4f1e0] overflow-hidden">
            {/* Dekoratif arka plan */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(244,241,224,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,241,224,0.06)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)]" />
            <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#f4f1e0]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-[#23335c]/40 blur-3xl" />

            {/* Logo */}
            <div className="relative z-10 flex items-center justify-between px-10 pt-10">
                <Image
                    src="/bitigKapali (2).png"
                    alt="BİTİG"
                    width={140}
                    height={45}
                    className="object-contain opacity-95"
                    priority
                />
                <div className="hidden xl:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-[#d6dcec]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f4f1e0] animate-pulse" />
                    Yapay zekâ destekli akademik asistan
                </div>
            </div>

            {/* İçerik – ekranı tam doldurur, kayma yok */}
            <div className="relative z-10 h-full flex items-center px-10 xl:px-16">
                {/* LOGIN: Yorumlar */}
                <div
                    className={`absolute inset-0 px-10 xl:px-16 flex flex-col justify-center transition-all duration-500 ease-out ${activeTab === 'login'
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 -translate-y-4 pointer-events-none'
                        }`}
                    aria-hidden={activeTab !== 'login'}
                >
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] tracking-wider uppercase text-[#bfc6d9] mb-6">
                            <Star className="w-3.5 h-3.5 text-[#f4f1e0]" />
                            Öğrenci Yorumları
                        </div>
                        <h2 className="text-3xl xl:text-4xl font-semibold leading-tight mb-3">
                            Binlerce öğrenci<br />
                            <span className="text-[#cdd5ea]">BİTİG ile çalışıyor.</span>
                        </h2>
                        <p className="text-[#aab3cc] text-sm xl:text-base mb-10 max-w-md">
                            Notlarınızı yükleyin, sorularınıza dayanaklı cevaplar alın. İşte topluluğumuzdan birkaç ses.
                        </p>

                        {/* Yorum Kartı */}
                        <div className="relative">
                            <Quote className="absolute -top-4 -left-2 w-10 h-10 text-[#f4f1e0]/15" />
                            <div className="relative rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 xl:p-7 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] min-h-[220px]">
                                {testimonials.map((t, i) => (
                                    <div
                                        key={t.name}
                                        className={`absolute inset-0 p-6 xl:p-7 flex flex-col justify-between transition-all duration-500 ease-out ${i === index
                                            ? 'opacity-100 translate-y-0'
                                            : 'opacity-0 translate-y-3 pointer-events-none'
                                            }`}
                                        aria-hidden={i !== index}
                                    >
                                        <div>
                                            <div className="flex items-center gap-1 mb-3">
                                                {Array.from({ length: t.rating }).map((_, s) => (
                                                    <Star
                                                        key={s}
                                                        className="w-4 h-4 text-[#f4f1e0] fill-[#f4f1e0]"
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-[#e8ecf7] text-[15px] xl:text-base leading-relaxed">
                                                “{t.text}”
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-5">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f4f1e0] to-[#cdd5ea] text-[#011133] font-semibold flex items-center justify-center text-sm shadow-md">
                                                {t.avatar}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-[#f4f1e0]">{t.name}</p>
                                                <p className="text-xs text-[#9aa6c8]">{t.role}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Noktalar */}
                        <div className="flex items-center gap-2 mt-6">
                            {testimonials.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setIndex(i)}
                                    aria-label={`Yorum ${i + 1}`}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-[#f4f1e0]' : 'w-2 bg-white/25 hover:bg-white/40'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Mini istatistikler */}
                        <div className="grid grid-cols-3 gap-4 mt-10 max-w-md">
                            <div>
                                <p className="text-2xl font-semibold text-[#f4f1e0]">10K+</p>
                                <p className="text-[11px] text-[#9aa6c8] uppercase tracking-wider mt-1">
                                    Öğrenci
                                </p>
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-[#f4f1e0]">50K+</p>
                                <p className="text-[11px] text-[#9aa6c8] uppercase tracking-wider mt-1">
                                    Belge
                                </p>
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-[#f4f1e0]">4.9★</p>
                                <p className="text-[11px] text-[#9aa6c8] uppercase tracking-wider mt-1">
                                    Memnuniyet
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* REGISTER: BİTİG marka hikayesi */}
                <div
                    className={`absolute inset-0 px-10 xl:px-16 flex flex-col justify-center transition-all duration-500 ease-out ${activeTab === 'register'
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                        }`}
                    aria-hidden={activeTab !== 'register'}
                >
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] tracking-wider uppercase text-[#bfc6d9] mb-6">
                            <ScrollText className="w-3.5 h-3.5 text-[#f4f1e0]" />
                            Adın Hikayesi
                        </div>

                        <div className="flex items-baseline gap-4 mb-3">
                            <h2 className="text-5xl xl:text-6xl font-bold tracking-wide text-[#f4f1e0]">
                                BİTİG
                            </h2>
                            <span className="text-sm xl:text-base text-[#9aa6c8] italic">
                                /bi·tig/
                            </span>
                        </div>

                        <p className="text-[#cdd5ea] text-base xl:text-lg leading-relaxed mb-2">
                            <span className="text-[#f4f1e0] font-medium">Göktürkçe</span> bir kelime.
                        </p>
                        <p className="text-[#aab3cc] text-sm xl:text-base leading-relaxed mb-8 max-w-md">
                            “Yazıt, kitabe, yazılı belge” anlamına gelir. Orhun Yazıtları’nda da geçen bu kelime,
                            bilginin nesilden nesile aktarılmasının en eski sembollerinden biridir.
                        </p>

                        {/* Runik dekor */}
                        <div className="relative rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 xl:p-7 mb-6 overflow-hidden">
                            <div
                                aria-hidden="true"
                                className="font-serif text-3xl xl:text-4xl tracking-[0.4em] text-[#f4f1e0]/50 select-none whitespace-nowrap"
                            >
                                𐰋𐰃𐱅𐰃𐰏
                            </div>
                            <p className="text-xs text-[#9aa6c8] mt-3 tracking-wider uppercase">
                                Eski Türk yazısıyla &quot;BİTİG&quot;
                            </p>
                        </div>

                        {/* Bridge: dünden bugüne */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpenCheck className="w-4 h-4 text-[#f4f1e0]" />
                                    <p className="text-sm font-semibold text-[#f4f1e0]">Dün</p>
                                </div>
                                <p className="text-xs text-[#aab3cc] leading-relaxed">
                                    Taşa kazınan bilgi, gelecek nesillere bırakılan miras.
                                </p>
                            </div>
                            <div className="rounded-xl bg-[#f4f1e0]/10 border border-[#f4f1e0]/20 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-[#f4f1e0]" />
                                    <p className="text-sm font-semibold text-[#f4f1e0]">Bugün</p>
                                </div>
                                <p className="text-xs text-[#e8ecf7] leading-relaxed">
                                    Yapay zekâ ile okunan, anlaşılan ve paylaşılan bilgi.
                                </p>
                            </div>
                        </div>

                        <p className="text-[#9aa6c8] text-xs xl:text-sm mt-8 max-w-md leading-relaxed">
                            Aramıza katılın; notlarınız bir <span className="text-[#f4f1e0]">bitig</span>’e,
                            kalıcı ve anlamlı bir bilgi kaynağına dönüşsün.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
