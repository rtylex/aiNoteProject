'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronLeft, ChevronRight, RotateCcw, Brain, Sparkles, Lightbulb } from 'lucide-react'

interface StudyCard {
  id: string
  front: string
  back: string
  extra_notes: string | null
  order: number
  status: string
  interval: number
  repetitions: number
}

interface StudyModeProps {
  setId: string
}

export function StudyMode({ setId }: StudyModeProps) {
  const [cards, setCards] = useState<StudyCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [shuffling, setShuffling] = useState(true)
  const { accessToken } = useAuth()
  const router = useRouter()

  const fetchStudyCards = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/flashcard/${setId}/study`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCards(data)
        if (data.length === 0) {
          setFinished(true)
          setShuffling(false)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [setId, accessToken])

  useEffect(() => {
    fetchStudyCards()
  }, [fetchStudyCards])

  useEffect(() => {
    if (cards.length > 0) {
      const timer = setTimeout(() => setShuffling(false), 1800)
      return () => clearTimeout(timer)
    }
  }, [cards])

  const handleReview = async (quality: number) => {
    if (!accessToken) return
    const currentCard = cards[currentIndex]
    try {
      await fetch(`${API_BASE_URL}/api/v1/flashcard/card/${currentCard.id}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quality })
      })
    } catch (e) {
      console.error(e)
    }

    if (currentIndex < cards.length - 1) {
      setIsFlipped(false)
      setCurrentIndex(prev => prev + 1)
    } else {
      setFinished(true)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-ink" />
      </div>
    )
  }

  if (finished) {
    return (
      <div className="text-center py-20 space-y-8">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className="w-24 h-24 bg-gold rounded-full flex items-center justify-center mx-auto paper-shadow-lg"
        >
          <Sparkles className="w-12 h-12 text-ink" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-4xl font-bold text-ink mb-3 font-display">Çalışma Tamamlandı!</h2>
          <p className="text-ink-light text-lg font-body">Bugünlük tekrar edilecek kartların hepsini bitirdiniz.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => router.push('/flashcard')} className="border-ink/20 text-ink hover:bg-parchment hover:text-ink rounded-sm px-8 h-12 font-mono-ui">
            Flashcard'larıma Dön
          </Button>
          <Button onClick={() => { setCurrentIndex(0); setFinished(false); setIsFlipped(false); fetchStudyCards(); }} className="bg-ink text-paper hover:bg-ink/90 rounded-sm px-8 h-12 font-semibold paper-shadow font-mono-ui">
            <RotateCcw className="w-5 h-5 mr-2" /> Tekrar Başla
          </Button>
        </motion.div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-ink-light font-body">Şu anda tekrar edilecek kart yok. Kartları öğrenmeye başlayın!</p>
        <Button variant="outline" className="mt-4 border-ink/20 text-ink hover:bg-parchment rounded-sm" onClick={() => router.push(`/flashcard/${setId}`)}>Sete Dön</Button>
      </div>
    )
  }

  const currentCard = cards[currentIndex]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Shuffle Animation */}
      <AnimatePresence>
        {shuffling && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative w-72 h-44">
              {cards.slice(0, Math.min(cards.length, 6)).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-sm border-2 border-parchment bg-paper-dark paper-shadow"
                  initial={{ x: 0, y: 0, rotate: 0, scale: 1 }}
                  animate={{
                    x: [0, (i % 2 === 0 ? -120 : 120), 0],
                    y: [0, (i % 3 === 0 ? -80 : 80), 0],
                    rotate: [0, (i % 2 === 0 ? -15 : 15), 0],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.1,
                    repeat: 1,
                    repeatType: 'reverse',
                  }}
                />
              ))}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <span className="text-ink font-bold text-lg flex items-center gap-2 font-display">
                  <Brain className="w-6 h-6 text-terracotta" /> Kartlar Hazırlanıyor...
                </span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`transition-opacity duration-500 ${shuffling ? 'opacity-0' : 'opacity-100'}`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm font-medium text-ink-light font-mono-ui">
            Kart <span className="text-ink font-bold text-lg font-display">{currentIndex + 1}</span> / {cards.length}
          </span>
          <div className="flex items-center gap-3">
            <div className="w-40 h-2 bg-parchment rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-terracotta"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-8">
          {/* Left: Mini Card List */}
          <div className="hidden lg:flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {cards.map((card, idx) => (
              <motion.button
                key={card.id}
                onClick={() => { if (!isFlipped) { setCurrentIndex(idx); setIsFlipped(false); } }}
                className={`text-left p-3 rounded-sm border transition-all text-sm cursor-pointer ${
                  idx === currentIndex
                    ? 'bg-paper border-terracotta/40 text-ink paper-shadow'
                    : idx < currentIndex
                    ? 'bg-paper-dark border-parchment text-ink-light/50'
                    : 'bg-paper-dark border-parchment text-ink-light hover:bg-parchment hover:text-ink'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold font-mono-ui ${
                    idx === currentIndex ? 'bg-terracotta text-paper' : 'bg-parchment text-ink-light'
                  }`}>{idx + 1}</span>
                  <span className="truncate font-medium font-body">{card.front.substring(0, 30)}...</span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Right: Big Active Card */}
          <div className="space-y-6">
            {/* Big Card */}
            <div className="relative mx-auto max-w-xl">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-terracotta/10 rounded-sm blur opacity-30" />
              
              <div className="relative [perspective:1200px] h-[420px]">
                <motion.div
                  className="relative w-full h-full [transform-style:preserve-3d] cursor-pointer"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.7, type: 'spring', stiffness: 200, damping: 20 }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* Front */}
                  <div className="absolute inset-0 [backface-visibility:hidden]">
                    <div className="w-full h-full flex flex-col items-center justify-center p-10 bg-paper rounded-sm paper-shadow-lg border border-parchment">
                      <span className="absolute top-5 left-5 bg-ink text-paper px-3 py-1 rounded-sm text-xs font-bold tracking-wide font-mono-ui">
                        KART #{currentIndex + 1}
                      </span>
                      <Brain className="w-8 h-8 text-terracotta/40 mb-6" />
                      <p className="text-2xl md:text-3xl font-bold text-ink text-center leading-relaxed font-display">{currentCard.front}</p>
                      <div className="absolute bottom-6 flex items-center gap-2 text-ink-light text-sm font-body">
                        <Sparkles className="w-4 h-4" />
                        <span>Çevirmek için tıklayın</span>
                      </div>
                    </div>
                  </div>

                  {/* Back */}
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="w-full h-full flex flex-col items-center justify-center p-10 bg-ink rounded-sm paper-shadow-lg border border-parchment">
                      <span className="absolute top-5 right-5 bg-paper/10 text-paper/70 px-3 py-1 rounded-sm text-xs font-bold tracking-wide border border-paper/20 font-mono-ui">
                        CEVAP
                      </span>
                      <p className="text-xl md:text-2xl font-medium text-paper text-center leading-relaxed mb-6 font-body">{currentCard.back}</p>
                      
                      {currentCard.extra_notes && (
                        <div className="w-full max-w-sm mt-4 pt-4 border-t border-paper/20">
                          <div className="flex items-center gap-2 text-paper/60 text-xs mb-2 font-mono-ui">
                            <Lightbulb className="w-4 h-4" />
                            <span className="font-semibold uppercase tracking-wider">Ekstra Notlar</span>
                          </div>
                          <p className="text-sm text-paper/80 leading-relaxed font-body">{currentCard.extra_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Rating */}
            {!isFlipped ? (
              <div className="text-center text-sm text-ink-light py-2 font-body">
                Kartı çevirmek için üzerine tıklayın
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <p className="text-center text-sm font-medium text-ink-light font-body">Bu kartı ne kadar iyi biliyorsunuz?</p>
                <div className="grid grid-cols-5 gap-3 max-w-lg mx-auto">
                  {[
                    { q: 1, label: 'Tekrar', color: 'bg-red-500 hover:bg-red-600' },
                    { q: 2, label: 'Zor', color: 'bg-orange-500 hover:bg-orange-600' },
                    { q: 3, label: 'Orta', color: 'bg-yellow-500 hover:bg-yellow-600' },
                    { q: 4, label: 'İyi', color: 'bg-emerald-500 hover:bg-emerald-600' },
                    { q: 5, label: 'Mükemmel', color: 'bg-green-500 hover:bg-green-600' },
                  ].map(({ q, label, color }) => (
                    <motion.button
                      key={q}
                      onClick={() => handleReview(q)}
                      className={`h-16 flex flex-col items-center justify-center gap-0.5 rounded-sm ${color} text-white font-bold shadow-lg transition-all hover:scale-105 active:scale-95`}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="text-xl">{q}</span>
                      <span className="text-[9px] uppercase tracking-wider opacity-90 font-mono-ui">{label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Nav Buttons */}
            <div className="flex justify-between max-w-lg mx-auto pt-2">
              <Button
                variant="ghost"
                onClick={() => { if (currentIndex > 0) { setCurrentIndex(prev => prev - 1); setIsFlipped(false); } }}
                disabled={currentIndex === 0}
                className="text-ink-light hover:text-ink hover:bg-parchment rounded-sm font-mono-ui"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
              </Button>
              <Button
                variant="ghost"
                onClick={() => { if (currentIndex < cards.length - 1) { setCurrentIndex(prev => prev + 1); setIsFlipped(false); } }}
                disabled={currentIndex === cards.length - 1}
                className="text-ink-light hover:text-ink hover:bg-parchment rounded-sm font-mono-ui"
              >
                Sonraki <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
