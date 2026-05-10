'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Loader2, ChevronLeft, ChevronRight, RotateCcw,
  Brain, Sparkles, Lightbulb, Zap, BookOpen,
  TrendingUp, AlertCircle, CheckCircle2
} from 'lucide-react'

interface StudyCard {
  id: string
  front: string
  back: string
  extra_notes: string | null
  order: number
  status: string
  interval: number
  repetitions: number
  review_count?: number
  avg_quality?: number | null
}

type ReviewMode = 'normal' | 'weak' | 'full'
type RatingMap = Record<string, number>

interface SessionStats {
  excellent: number
  good: number
  medium: number
  hard: number
  again: number
}

export function StudyMode({ setId }: { setId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { accessToken } = useAuth()

  /* ─── State ─── */
  const [allCards, setAllCards] = useState<StudyCard[]>([])
  const [cards, setCards] = useState<StudyCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [shuffling, setShuffling] = useState(true)
  const [ratings, setRatings] = useState<RatingMap>({})
  const [stats, setStats] = useState<SessionStats>({
    excellent: 0, good: 0, medium: 0, hard: 0, again: 0,
  })
  const [reviewMode, setReviewMode] = useState<ReviewMode>('normal')

  /* ─── Fetch Functions ─── */
  const fetchStudyCards = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/flashcard/${setId}/study`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data: StudyCard[] = await res.json()
        setAllCards(data)
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

  const fetchDifficultCards = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/flashcard/${setId}/difficult`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data: StudyCard[] = await res.json()
        setCards(data)
        setReviewMode('weak')
        resetSession()
        setShuffling(true)
        setTimeout(() => setShuffling(false), 1800)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [setId, accessToken])

  const fetchAllCards = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/flashcard/${setId}/all`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data: StudyCard[] = await res.json()
        setCards(data)
        setReviewMode('full')
        resetSession()
        setShuffling(true)
        setTimeout(() => setShuffling(false), 1800)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [setId, accessToken])

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'difficult') {
      fetchDifficultCards()
    } else if (mode === 'full') {
      fetchAllCards()
    } else {
      fetchStudyCards()
    }
  }, [fetchStudyCards, fetchDifficultCards, fetchAllCards, searchParams])

  useEffect(() => {
    if (cards.length > 0) {
      const timer = setTimeout(() => setShuffling(false), 1800)
      return () => clearTimeout(timer)
    }
  }, [cards])

  /* ─── Helpers ─── */
  const resetSession = () => {
    setCurrentIndex(0)
    setFinished(false)
    setIsFlipped(false)
    setRatings({})
    setStats({ excellent: 0, good: 0, medium: 0, hard: 0, again: 0 })
  }

  const startWeakReview = () => {
    fetchDifficultCards()
  }

  const startFullReview = () => {
    fetchAllCards()
  }

  const startNormalReview = () => {
    fetchStudyCards()
    setReviewMode('normal')
    resetSession()
  }

  /* ─── Review ─── */
  const handleReview = async (quality: number) => {
    if (!accessToken) return
    const currentCard = cards[currentIndex]

    // Backend'e gönder
    try {
      await fetch(`${API_BASE_URL}/api/v1/flashcard/card/${currentCard.id}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quality }),
      })
    } catch (e) {
      console.error(e)
    }

    // Lokal puan + istatistik kaydet
    setRatings((prev) => ({ ...prev, [currentCard.id]: quality }))
    setStats((prev) => {
      const next = { ...prev }
      if (quality === 5) next.excellent += 1
      else if (quality === 4) next.good += 1
      else if (quality === 3) next.medium += 1
      else if (quality === 2) next.hard += 1
      else next.again += 1
      return next
    })

    if (currentIndex < cards.length - 1) {
      setIsFlipped(false)
      setCurrentIndex((p) => p + 1)
    } else {
      setFinished(true)
    }
  }

  /* ─── Mini badge color ─── */
  const getRatingBadge = (cardId: string) => {
    const q = ratings[cardId]
    if (q === undefined) return null
    if (q <= 2) return <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
    if (q === 3) return <TrendingUp className="w-3 h-3 text-yellow-500 shrink-0" />
    return <CheckCircle2 className="w-3 h-3 text-olive shrink-0" />
  }

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-ink" />
      </div>
    )
  }

  /* ─── Empty ─── */
  if (cards.length === 0 && !finished) {
    return (
      <div className="text-center py-20">
        <p className="text-ink-light font-body">
          Şu anda tekrar edilecek kart yok.
        </p>
        <Button
          variant="outline"
          className="mt-4 border-ink/20 text-ink hover:bg-parchment rounded-sm"
          onClick={() => router.push(`/flashcard/${setId}`)}
        >
          Sete Dön
        </Button>
      </div>
    )
  }

  /* ─── Finished Screen ─── */
  if (finished) {
    const weakCount = Object.values(ratings).filter((q) => q <= 2).length
    const totalRated = Object.keys(ratings).length

    return (
      <div className="text-center py-12 space-y-8">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className="w-24 h-24 bg-gold rounded-full flex items-center justify-center mx-auto paper-shadow-lg"
        >
          <Sparkles className="w-12 h-12 text-ink" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-ink mb-2 font-display">
            {reviewMode === 'weak' ? 'Zayıf Kart Tekrarı Bitti!' : 'Çalışma Tamamlandı!'}
          </h2>
          <p className="text-ink-light text-lg font-body">
            {reviewMode === 'weak'
              ? 'Zayıf kartlarınızı tekrar gözden geçirdiniz.'
              : 'Bugünlük tekrar edilecek kartların hepsini bitirdiniz.'}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-3 gap-4 max-w-lg mx-auto"
        >
          {[
            {
              icon: CheckCircle2,
              color: 'bg-olive/10 text-olive border-olive/20',
              value: stats.excellent + stats.good,
              label: 'İyi / Mükemmel',
            },
            {
              icon: TrendingUp,
              color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
              value: stats.medium,
              label: 'Orta',
            },
            {
              icon: AlertCircle,
              color: 'bg-red-500/10 text-red-600 border-red-500/20',
              value: stats.hard + stats.again,
              label: 'Zor / Tekrar',
            },
          ].map((s, i) => (
            <div
              key={i}
              className={`bg-paper rounded-sm border p-4 flex flex-col items-center gap-2 ${s.color}`}
            >
              <s.icon className="w-6 h-6" />
              <span className="text-2xl font-bold text-ink font-display">{s.value}</span>
              <span className="text-[10px] uppercase tracking-wider font-mono-ui text-ink-light">
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-3"
        >
          <Button
            variant="outline"
            onClick={() => router.push('/flashcard')}
            className="border-ink/20 text-ink hover:bg-parchment hover:text-ink rounded-sm px-6 h-12 font-mono-ui"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Flashcard'larıma Dön
          </Button>

          {weakCount > 0 && (
            <Button
              onClick={startWeakReview}
              className="bg-terracotta text-paper hover:bg-terracotta/90 rounded-sm px-6 h-12 font-semibold paper-shadow font-mono-ui tracking-wide"
            >
              <Zap className="w-4 h-4 mr-2" />
              Zayıf Kartları Tekrarla ({weakCount})
            </Button>
          )}

          {totalRated > 0 && (
            <Button
              onClick={startFullReview}
              className="bg-ink text-paper hover:bg-ink/90 rounded-sm px-6 h-12 font-semibold paper-shadow font-mono-ui tracking-wide"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Tüm Kartları Tekrarla
            </Button>
          )}
        </motion.div>
      </div>
    )
  }

  const currentCard = cards[currentIndex]

  /* ─── Main Study UI ─── */
  return (
    <div className="max-w-6xl mx-auto">
      {/* Shuffle */}
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
                    x: [0, i % 2 === 0 ? -120 : 120, 0],
                    y: [0, i % 3 === 0 ? -80 : 80, 0],
                    rotate: [0, i % 2 === 0 ? -15 : 15, 0],
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
                  <Brain className="w-6 h-6 text-terracotta" />
                  Kartlar Hazırlanıyor...
                </span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`transition-opacity duration-500 ${shuffling ? 'opacity-0' : 'opacity-100'}`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {reviewMode !== 'normal' && (
              <span className="stamp bg-terracotta/10 text-terracotta border-terracotta text-[10px] py-0.5">
                {reviewMode === 'weak' ? 'Zayıf Tekrar' : 'Genel Tekrar'}
              </span>
            )}
            <span className="text-sm font-medium text-ink-light font-mono-ui">
              Kart{' '}
              <span className="text-ink font-bold text-lg font-display">
                {currentIndex + 1}
              </span>{' '}
              / {cards.length}
            </span>
          </div>
          <div className="w-40 h-2 bg-parchment rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-terracotta"
              initial={{ width: 0 }}
              animate={{
                width: `${((currentIndex + 1) / cards.length) * 100}%`,
              }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          {/* Left Mini List */}
          <div className="hidden lg:flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
            {cards.map((card, idx) => {
              const isDone = idx < currentIndex
              const isActive = idx === currentIndex
              const badge = getRatingBadge(card.id)

              return (
                <motion.button
                  key={card.id}
                  onClick={() => {
                    if (!isFlipped) {
                      setCurrentIndex(idx)
                      setIsFlipped(false)
                    }
                  }}
                  className={`text-left p-3 rounded-sm border transition-all text-sm cursor-pointer relative overflow-hidden ${
                    isActive
                      ? 'bg-paper border-terracotta/40 text-ink paper-shadow'
                      : isDone
                      ? 'bg-paper-dark border-parchment text-ink-light/60'
                      : 'bg-paper-dark border-parchment text-ink-light hover:bg-parchment hover:text-ink'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Done indicator stripe */}
                  {isDone && (
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                        (ratings[card.id] ?? 3) <= 2
                          ? 'bg-red-400'
                          : ratings[card.id] === 3
                          ? 'bg-yellow-400'
                          : 'bg-olive'
                      }`}
                    />
                  )}

                  <div className="flex items-center gap-2 mb-1 pl-1">
                    <span
                      className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold font-mono-ui shrink-0 ${
                        isActive
                          ? 'bg-terracotta text-paper'
                          : isDone
                          ? 'bg-parchment text-ink-light'
                          : 'bg-parchment text-ink-light'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate font-medium font-body flex-1">
                      {card.front.substring(0, 28)}…
                    </span>
                    {badge}
                  </div>
                  {/* Review stats */}
                  {card.review_count !== undefined && card.review_count > 0 && (
                    <div className="flex items-center gap-2 pl-6 text-[10px] text-ink-light/60 font-mono-ui">
                      <span>{card.review_count} kez tekrar</span>
                      {card.avg_quality !== null && card.avg_quality !== undefined && (
                        <span className={`px-1.5 py-0.5 rounded-sm ${
                          card.avg_quality <= 2
                            ? 'bg-red-500/10 text-red-500'
                            : card.avg_quality <= 3.5
                            ? 'bg-yellow-500/10 text-yellow-600'
                            : 'bg-olive/10 text-olive'
                        }`}>
                          ort: {card.avg_quality}
                        </span>
                      )}
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>

          {/* Right: Big Card */}
          <div className="space-y-6">
            <div className="relative mx-auto max-w-xl">
              <div className="absolute -inset-1 bg-terracotta/10 rounded-sm blur opacity-30" />

              <div className="relative [perspective:1200px] h-[420px]">
                <motion.div
                  className="relative w-full h-full [transform-style:preserve-3d] cursor-pointer"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{
                    duration: 0.7,
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                  }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* Front */}
                  <div className="absolute inset-0 [backface-visibility:hidden]">
                    <div className="w-full h-full flex flex-col items-center justify-center p-10 bg-paper rounded-sm paper-shadow-lg border border-parchment">
                      <span className="absolute top-5 left-5 bg-ink text-paper px-3 py-1 rounded-sm text-xs font-bold tracking-wide font-mono-ui">
                        KART #{currentIndex + 1}
                      </span>
                      <Brain className="w-8 h-8 text-terracotta/40 mb-6" />
                      <p className="text-2xl md:text-3xl font-bold text-ink text-center leading-relaxed font-display">
                        {currentCard.front}
                      </p>
                      {/* Review stats on card */}
                      {currentCard.review_count !== undefined && currentCard.review_count > 0 && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-ink-light font-mono-ui">
                          <span className="bg-parchment px-2 py-1 rounded-sm">
                            {currentCard.review_count} kez tekrar
                          </span>
                          {currentCard.avg_quality !== null && currentCard.avg_quality !== undefined && (
                            <span className={`px-2 py-1 rounded-sm ${
                              currentCard.avg_quality <= 2
                                ? 'bg-red-500/10 text-red-500'
                                : currentCard.avg_quality <= 3.5
                                ? 'bg-yellow-500/10 text-yellow-600'
                                : 'bg-olive/10 text-olive'
                            }`}>
                              ort: {currentCard.avg_quality}
                            </span>
                          )}
                        </div>
                      )}
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
                      <p className="text-xl md:text-2xl font-medium text-paper text-center leading-relaxed mb-6 font-body">
                        {currentCard.back}
                      </p>

                      {currentCard.extra_notes && (
                        <div className="w-full max-w-sm mt-4 pt-4 border-t border-paper/20">
                          <div className="flex items-center gap-2 text-paper/60 text-xs mb-2 font-mono-ui">
                            <Lightbulb className="w-4 h-4" />
                            <span className="font-semibold uppercase tracking-wider">
                              Ekstra Notlar
                            </span>
                          </div>
                          <p className="text-sm text-paper/80 leading-relaxed font-body">
                            {currentCard.extra_notes}
                          </p>
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
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <p className="text-center text-sm font-medium text-ink-light font-body">
                  Bu kartı ne kadar iyi biliyorsunuz?
                </p>
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
                      <span className="text-[9px] uppercase tracking-wider opacity-90 font-mono-ui">
                        {label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Nav */}
            <div className="flex justify-between max-w-lg mx-auto pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  if (currentIndex > 0) {
                    setCurrentIndex((p) => p - 1)
                    setIsFlipped(false)
                  }
                }}
                disabled={currentIndex === 0}
                className="text-ink-light hover:text-ink hover:bg-parchment rounded-sm font-mono-ui"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (currentIndex < cards.length - 1) {
                    setCurrentIndex((p) => p + 1)
                    setIsFlipped(false)
                  }
                }}
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
