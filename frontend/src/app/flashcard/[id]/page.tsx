'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { ArrowLeft, BookOpen, Share2, Play, Loader2, Lightbulb, Clock, AlertTriangle } from 'lucide-react'
import { FlashcardStats } from '@/components/flashcard/flashcard-stats'
import { StudyMode } from '@/components/flashcard/study-mode'
import { AddCardModal } from '@/components/flashcard/add-card-modal'
import { DeleteFlashcardDialog } from '@/components/flashcard/delete-flashcard-dialog'
import { Switch } from '@/components/ui/switch'

interface FlashcardSetDetail {
  id: string
  title: string
  description: string | null
  card_count: number
  is_public: boolean
  created_at: string
  progress: { new: number; learning: number; review: number; mastered: number }
  completion_percentage: number
  cards: {
    id: string
    front: string
    back: string
    extra_notes: string | null
    order: number
    status: string
    last_reviewed: string | null
    review_count?: number
    avg_quality?: number | null
    ease_factor?: number
  }[]
}

export default function FlashcardDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { accessToken } = useAuth()
  const [setDetail, setSetDetail] = useState<FlashcardSetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const setId = params.id as string
  const isStudyMode = searchParams.get('mode') === 'study'

  const fetchSet = async () => {
    if (!accessToken) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/flashcard/${setId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSetDetail(data)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchSet() }, [setId, accessToken])

  const handleToggleShare = async () => {
    if (!accessToken || !setDetail) return
    setSharing(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/flashcard/${setId}/share`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_public: !setDetail.is_public })
      })
      if (res.ok) setSetDetail(prev => prev ? { ...prev, is_public: !prev.is_public } : null)
    } catch (e) { console.error(e) }
    finally { setSharing(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex justify-center items-center bg-paper relative">
        <div className="absolute inset-0 paper-texture pointer-events-none" />
        <Loader2 className="w-10 h-10 animate-spin text-ink" />
      </div>
    )
  }

  if (!setDetail) {
    return (
      <div className="min-h-screen pt-16 flex justify-center items-center bg-paper relative">
        <div className="absolute inset-0 paper-texture pointer-events-none" />
        <p className="text-ink-light font-body">Set bulunamadı.</p>
      </div>
    )
  }

  if (isStudyMode) {
    return (
      <div className="min-h-screen w-full pt-16 bg-paper py-10 px-4 relative">
        <div className="absolute inset-0 paper-texture pointer-events-none -z-10" />
        <div className="relative container mx-auto max-w-6xl">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => router.push(`/flashcard/${setId}`)} className="gap-2 text-ink-light hover:text-ink hover:bg-parchment font-mono-ui">
              <ArrowLeft className="w-4 h-4" /> Geri
            </Button>
            <h1 className="text-xl font-bold text-ink font-display">{setDetail.title}</h1>
          </div>
          <StudyMode setId={setId} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full pt-16 bg-paper relative">
      <div className="absolute inset-0 paper-texture pointer-events-none -z-10" />
      
      <div className="relative container mx-auto py-10 px-4 max-w-5xl">
        {/* Back button */}
        <Button variant="ghost" onClick={() => router.push('/flashcard')} className="gap-2 mb-6 text-ink-light hover:text-ink hover:bg-parchment font-mono-ui">
          <ArrowLeft className="w-4 h-4" /> Flashcard'larıma Dön
        </Button>

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-ink rounded-sm p-8 md:p-10 mb-8 paper-shadow-lg overflow-hidden text-paper"
        >
          <div className="absolute inset-0 paper-texture opacity-10" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-sm bg-paper flex items-center justify-center paper-shadow">
                <BookOpen className="w-7 h-7 text-ink" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-paper/10 px-4 py-2 rounded-sm border border-paper/20">
                  <Share2 className="w-4 h-4 text-paper/70" />
                  <span className="text-sm text-paper/80 font-mono-ui">Paylaş</span>
                  <Switch checked={setDetail.is_public} onCheckedChange={handleToggleShare} disabled={sharing} />
                </div>
                <DeleteFlashcardDialog setId={setId} title={setDetail.title} onDelete={() => router.push('/flashcard')} />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-paper mb-2 font-display">{setDetail.title}</h1>
            {setDetail.description && <p className="text-paper/60 font-body">{setDetail.description}</p>}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <FlashcardStats
            progress={setDetail.progress}
            completionPercentage={setDetail.completion_percentage}
            cardCount={setDetail.card_count}
          />
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-3 my-8">
          <Button onClick={() => router.push(`/flashcard/${setId}?mode=study`)} className="bg-ink text-paper hover:bg-ink/90 rounded-sm h-11 px-6 font-semibold paper-shadow font-mono-ui">
            <Play className="w-4 h-4 mr-2" /> Çalışmaya Başla
          </Button>
          <Button onClick={() => router.push(`/flashcard/${setId}?mode=difficult`)} variant="outline" className="border-terracotta/30 text-terracotta hover:bg-terracotta/10 rounded-sm h-11 px-6 font-semibold font-mono-ui">
            <AlertTriangle className="w-4 h-4 mr-2" /> Zor Kartları Çalış
          </Button>
          <AddCardModal setId={setId} onAdded={fetchSet} />
          {(setDetail.progress.learning + setDetail.progress.new) > 0 && (
            <div className="flex items-center gap-2 bg-parchment text-ink px-4 py-2 rounded-sm text-sm border border-parchment font-mono-ui">
              <Clock className="w-4 h-4" />
              Bugün {setDetail.progress.learning + setDetail.progress.new} kart tekrar edilecek
            </div>
          )}
        </motion.div>

        {/* Cards List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-ink mb-6 flex items-center gap-2 font-display">
            <Lightbulb className="w-5 h-5 text-terracotta" /> Kartlar
          </h2>
          {setDetail.cards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="group bg-paper rounded-sm p-6 paper-shadow border border-parchment hover:border-terracotta/30 transition-all paper-fold"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-ink text-paper w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold font-mono-ui">{card.order}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-sm font-medium font-mono-ui ${
                      card.status === 'new' ? 'bg-parchment text-ink-light' :
                      card.status === 'learning' ? 'bg-gold/10 text-gold border border-gold/20' :
                      card.status === 'review' ? 'bg-lavender/10 text-lavender border border-lavender/20' :
                      'bg-olive/10 text-olive border border-olive/20'
                    }`}>
                      {card.status === 'new' ? 'Yeni' :
                       card.status === 'learning' ? 'Öğreniliyor' :
                       card.status === 'review' ? 'Tekrar' : 'Ezberlendi'}
                    </span>
                    {card.review_count !== undefined && card.review_count > 0 && (
                      <span className="text-xs text-ink-light font-mono-ui bg-parchment px-2 py-1 rounded-sm">
                        {card.review_count} kez tekrar
                      </span>
                    )}
                    {card.avg_quality !== null && card.avg_quality !== undefined && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-sm font-mono-ui ${
                        card.avg_quality <= 2
                          ? 'bg-red-500/10 text-red-500'
                          : card.avg_quality <= 3.5
                          ? 'bg-yellow-500/10 text-yellow-600'
                          : 'bg-olive/10 text-olive'
                      }`}>
                        ort: {card.avg_quality}
                      </span>
                    )}
                    {card.last_reviewed && (
                      <span className="text-xs text-ink-light flex items-center gap-1 font-mono-ui">
                        <Clock className="w-3 h-3" /> {new Date(card.last_reviewed).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-ink-light font-semibold uppercase tracking-wider mb-1 font-mono-ui">Ön</p>
                      <p className="text-ink font-semibold font-body">{card.front}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-light font-semibold uppercase tracking-wider mb-1 font-mono-ui">Arka</p>
                      <p className="text-ink-light font-body">{card.back}</p>
                    </div>
                  </div>
                  {card.extra_notes && (
                    <div className="mt-4 pt-4 border-t border-parchment">
                      <p className="text-xs text-ink-light font-semibold uppercase tracking-wider mb-1 flex items-center gap-1 font-mono-ui">
                        <Lightbulb className="w-3 h-3" /> Ekstra Notlar
                      </p>
                      <p className="text-sm text-ink-light leading-relaxed font-body">{card.extra_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
