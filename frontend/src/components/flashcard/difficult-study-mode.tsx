'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronLeft, ChevronRight, RotateCcw, Brain, Sparkles, Lightbulb, Trophy, ArrowLeft } from 'lucide-react'

interface DifficultCard {
  id: string
  front: string
  back: string
  extra_notes: string | null
  set_id: string
  set_title: string
  ease_factor: number
  last_reviewed: string | null
}

interface DifficultStudyModeProps {
  cards: DifficultCard[]
  onExit: () => void
}

export function DifficultStudyMode({ cards, onExit }: DifficultStudyModeProps) {
  const [shuffledCards, setShuffledCards] = useState<DifficultCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [shuffling, setShuffling] = useState(true)
  const [finished, setFinished] = useState(false)
  const { accessToken } = useAuth()
  const router = useRouter()

  // Shuffle cards on mount
  useEffect(() => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5)
    setShuffledCards(shuffled)
    const timer = setTimeout(() => setShuffling(false), 1800)
    return () => clearTimeout(timer)
  }, [cards])

  const handleReview = async (quality: number) => {
    if (!accessToken) return
    const currentCard = shuffledCards[currentIndex]

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

    if (currentIndex < shuffledCards.length - 1) {
      setIsFlipped(false)
      setCurrentIndex(prev => prev + 1)
    } else {
      setFinished(true)
    }
  }

  const handleRestart = () => {
    const reshuffled = [...shuffledCards].sort(() => Math.random() - 0.5)
    setShuffledCards(reshuffled)
    setCurrentIndex(0)
    setFinished(false)
    setIsFlipped(false)
    setShuffling(true)
    setTimeout(() => setShuffling(false), 1800)
  }

  if (finished) {
    return (
      <div className="text-center py-20 space-y-8">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className="w-24 h-24 bg-gradient-to-br from-[#f4f1e0] to-[#e7d9a8] rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-[#011133]/30"
        >
          <Trophy className="w-12 h-12 text-[#011133]" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-4xl font-bold text-[#f4f1e0] mb-3">Tebrikler!</h2>
          <p className="text-[#f4f1e0]/70 text-lg">
            {shuffledCards.length} zor kartın hepsini tekrar ettin.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center gap-4">
          <Button variant="outline" onClick={onExit} className="border-[#f4f1e0]/30 text-[#f4f1e0] hover:bg-[#f4f1e0]/10 hover:text-[#f4f1e0] rounded-full px-8 h-12">
            <ArrowLeft className="w-5 h-5 mr-2" /> Listeye Dön
          </Button>
          <Button onClick={handleRestart} className="bg-[#f4f1e0] text-[#011133] hover:bg-[#e7d9a8] rounded-full px-8 h-12 font-semibold">
            <RotateCcw className="w-5 h-5 mr-2" /> Tekrar Başla
          </Button>
        </motion.div>
      </div>
    )
  }

  if (shuffledCards.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-[#f4f1e0]/70">Zor kart bulunamadı.</p>
        <Button variant="outline" className="mt-4 border-[#f4f1e0]/30 text-[#f4f1e0] hover:bg-[#f4f1e0]/10" onClick={onExit}>Listeye Dön</Button>
      </div>
    )
  }

  const currentCard = shuffledCards[currentIndex]

  return (
    <div className="max-w-3xl mx-auto">
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
              {shuffledCards.slice(0, Math.min(shuffledCards.length, 6)).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-2xl border-2 border-[#f4f1e0]/20 bg-gradient-to-br from-[#1d2f5e] to-[#23335c] shadow-2xl"
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
                <span className="text-[#f4f1e0] font-bold text-lg flex items-center gap-2">
                  <Brain className="w-6 h-6" /> Zor Kartlar Hazırlanıyor...
                </span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`transition-opacity duration-500 ${shuffling ? 'opacity-0' : 'opacity-100'}`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={onExit} className="text-[#f4f1e0]/60 hover:text-[#f4f1e0] hover:bg-[#f4f1e0]/10 gap-2">
            <ArrowLeft className="w-4 h-4" /> Çık
          </Button>
          <span className="text-sm font-medium text-[#f4f1e0]/60">
            Zor Kart <span className="text-[#f4f1e0] font-bold text-lg">{currentIndex + 1}</span> / {shuffledCards.length}
          </span>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>

        <div className="w-full h-2 bg-[#f4f1e0]/10 rounded-full overflow-hidden mb-8">
          <motion.div
            className="h-full bg-gradient-to-r from-[#f4f1e0] to-[#e7d9a8]"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / shuffledCards.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Big Card */}
        <div className="relative mx-auto max-w-xl mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#23335c] via-[#3d4f7f] to-[#23335c] rounded-[2rem] blur opacity-30" />
          
          <div className="relative [perspective:1200px] h-[420px]">
            <motion.div
              className="relative w-full h-full [transform-style:preserve-3d] cursor-pointer"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.7, type: 'spring', stiffness: 200, damping: 20 }}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front */}
              <div className="absolute inset-0 [backface-visibility:hidden]">
                <div className="w-full h-full flex flex-col items-center justify-center p-10 bg-gradient-to-br from-[#e7ecf8] to-[#dce2f1] rounded-[1.5rem] shadow-2xl border border-white/50">
                  <span className="absolute top-5 left-5 bg-[#011133] text-[#f4f1e0] px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                    #{currentIndex + 1}
                  </span>
                  <span className="absolute top-5 right-5 text-xs text-[#23335c]/40 font-medium">
                    {currentCard.set_title}
                  </span>
                  <Brain className="w-8 h-8 text-[#23335c]/40 mb-6" />
                  <p className="text-2xl md:text-3xl font-bold text-[#011133] text-center leading-relaxed">{currentCard.front}</p>
                  <div className="absolute bottom-6 flex items-center gap-2 text-[#23335c]/50 text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Çevirmek için tıklayın</span>
                  </div>
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <div className="w-full h-full flex flex-col items-center justify-center p-10 bg-gradient-to-br from-[#011133] via-[#1d2f5e] to-[#23335c] rounded-[1.5rem] shadow-2xl border border-[#f4f1e0]/10">
                  <span className="absolute top-5 right-5 bg-[#f4f1e0]/10 text-[#f4f1e0]/70 px-3 py-1 rounded-full text-xs font-bold tracking-wide border border-[#f4f1e0]/20">
                    CEVAP
                  </span>
                  <p className="text-xl md:text-2xl font-medium text-[#f4f1e0] text-center leading-relaxed mb-6">{currentCard.back}</p>
                  
                  {currentCard.extra_notes && (
                    <div className="w-full max-w-sm mt-4 pt-4 border-t border-[#f4f1e0]/20">
                      <div className="flex items-center gap-2 text-[#f4f1e0]/60 text-xs mb-2">
                        <Lightbulb className="w-4 h-4" />
                        <span className="font-semibold uppercase tracking-wider">Ekstra Notlar</span>
                      </div>
                      <p className="text-sm text-[#f4f1e0]/80 leading-relaxed">{currentCard.extra_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Rating */}
        {!isFlipped ? (
          <div className="text-center text-sm text-[#f4f1e0]/40 py-2">
            Kartı çevirmek için üzerine tıklayın
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <p className="text-center text-sm font-medium text-[#f4f1e0]/80">Bu kartı ne kadar iyi biliyorsunuz?</p>
            <div className="grid grid-cols-5 gap-3 max-w-lg mx-auto">
              {[
                { q: 1, label: 'Tekrar', color: 'from-red-500 to-rose-600', hover: 'hover:shadow-red-500/40' },
                { q: 2, label: 'Zor', color: 'from-orange-500 to-amber-600', hover: 'hover:shadow-orange-500/40' },
                { q: 3, label: 'Orta', color: 'from-yellow-400 to-amber-500', hover: 'hover:shadow-yellow-500/40' },
                { q: 4, label: 'İyi', color: 'from-emerald-400 to-green-500', hover: 'hover:shadow-emerald-500/40' },
                { q: 5, label: 'Mükemmel', color: 'from-green-400 to-emerald-500', hover: 'hover:shadow-green-500/40' },
              ].map(({ q, label, color, hover }) => (
                <motion.button
                  key={q}
                  onClick={() => handleReview(q)}
                  className={`h-16 flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-gradient-to-b ${color} text-white font-bold shadow-lg ${hover} transition-all hover:scale-105 active:scale-95`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-xl">{q}</span>
                  <span className="text-[9px] uppercase tracking-wider opacity-90">{label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Nav Buttons */}
        <div className="flex justify-between max-w-lg mx-auto pt-6">
          <Button
            variant="ghost"
            onClick={() => { if (currentIndex > 0) { setCurrentIndex(prev => prev - 1); setIsFlipped(false); } }}
            disabled={currentIndex === 0}
            className="text-[#f4f1e0]/60 hover:text-[#f4f1e0] hover:bg-[#f4f1e0]/10"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
          </Button>
          <Button
            variant="ghost"
            onClick={() => { if (currentIndex < shuffledCards.length - 1) { setCurrentIndex(prev => prev + 1); setIsFlipped(false); } }}
            disabled={currentIndex === shuffledCards.length - 1}
            className="text-[#f4f1e0]/60 hover:text-[#f4f1e0] hover:bg-[#f4f1e0]/10"
          >
            Sonraki <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
