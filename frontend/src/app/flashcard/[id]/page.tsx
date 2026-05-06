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
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-b from-[#011133] via-[#1d2f5e] to-[#23335c]">
        <Loader2 className="w-10 h-10 animate-spin text-[#f4f1e0]" />
      </div>
    )
  }

  if (!setDetail) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-b from-[#011133] via-[#1d2f5e] to-[#23335c]">
        <p className="text-[#f4f1e0]/60">Set bulunamadı.</p>
      </div>
    )
  }

  if (isStudyMode) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#011133] via-[#1d2f5e] to-[#23335c] py-10 px-4">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(244,241,224,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,241,224,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="relative container mx-auto max-w-6xl">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => router.push(`/flashcard/${setId}`)} className="gap-2 text-[#f4f1e0]/70 hover:text-[#f4f1e0] hover:bg-[#f4f1e0]/10">
              <ArrowLeft className="w-4 h-4" /> Geri
            </Button>
            <h1 className="text-xl font-bold text-[#f4f1e0]">{setDetail.title}</h1>
          </div>
          <StudyMode setId={setId} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#011133] via-[#1d2f5e] to-[#23335c]">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(244,241,224,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,241,224,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      <div className="relative container mx-auto py-10 px-4 max-w-5xl">
        {/* Back button */}
        <Button variant="ghost" onClick={() => router.push('/flashcard')} className="gap-2 mb-6 text-[#f4f1e0]/70 hover:text-[#f4f1e0] hover:bg-[#f4f1e0]/10">
          <ArrowLeft className="w-4 h-4" /> Flashcard'larıma Dön
        </Button>

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-r from-[#1d2f5e] to-[#23335c] rounded-3xl p-8 md:p-10 mb-8 border border-[#f4f1e0]/10 shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f4f1e0]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f4f1e0] to-[#e7d9a8] flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-[#011133]" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-[#f4f1e0]/10 px-4 py-2 rounded-full border border-[#f4f1e0]/20">
                  <Share2 className="w-4 h-4 text-[#f4f1e0]/70" />
                  <span className="text-sm text-[#f4f1e0]/80">Paylaş</span>
                  <Switch checked={setDetail.is_public} onCheckedChange={handleToggleShare} disabled={sharing} />
                </div>
                <DeleteFlashcardDialog setId={setId} title={setDetail.title} onDelete={() => router.push('/flashcard')} />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#f4f1e0] mb-2">{setDetail.title}</h1>
            {setDetail.description && <p className="text-[#f4f1e0]/60">{setDetail.description}</p>}
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
          <Button onClick={() => router.push(`/flashcard/${setId}?mode=study`)} className="bg-gradient-to-r from-[#011133] to-[#23335c] hover:from-[#0b1f4d] hover:to-[#2d3e6b] text-[#f4f1e0] rounded-xl h-11 px-6 font-semibold shadow-lg">
            <Play className="w-4 h-4 mr-2" /> Çalışmaya Başla
          </Button>
          <AddCardModal setId={setId} onAdded={fetchSet} />
          {(setDetail.progress.learning + setDetail.progress.new) > 0 && (
            <div className="flex items-center gap-2 bg-[#f4f1e0]/10 text-[#f4f1e0]/80 px-4 py-2 rounded-xl text-sm border border-[#f4f1e0]/20">
              <Clock className="w-4 h-4" />
              Bugün {setDetail.progress.learning + setDetail.progress.new} kart tekrar edilecek
            </div>
          )}
        </motion.div>

        {/* Cards List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#f4f1e0] mb-6 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-[#f4f1e0]/60" /> Kartlar
          </h2>
          {setDetail.cards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="group bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.06)] hover:shadow-[0_4px_30px_rgb(0,0,0,0.1)] transition-all border-l-4 border-[#011133] hover:translate-x-1"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-[#011133] text-[#f4f1e0] w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold">{card.order}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      card.status === 'new' ? 'bg-slate-100 text-slate-600' :
                      card.status === 'learning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      card.status === 'review' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                      {card.status === 'new' ? 'Yeni' :
                       card.status === 'learning' ? 'Öğreniliyor' :
                       card.status === 'review' ? 'Tekrar' : 'Ezberlendi'}
                    </span>
                    {card.last_reviewed && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(card.last_reviewed).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Ön</p>
                      <p className="text-[#011133] font-semibold">{card.front}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Arka</p>
                      <p className="text-gray-600">{card.back}</p>
                    </div>
                  </div>
                  {card.extra_notes && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-[#23335c]/60 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" /> Ekstra Notlar
                      </p>
                      <p className="text-sm text-gray-500 leading-relaxed">{card.extra_notes}</p>
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
