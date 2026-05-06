'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { ArrowLeft, BookOpen, Share2, Play, Loader2 } from 'lucide-react'
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
  progress: {
    new: number
    learning: number
    review: number
    mastered: number
  }
  completion_percentage: number
  cards: {
    id: string
    front: string
    back: string
    order: number
    status: string
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
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSet()
  }, [setId, accessToken])

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
      if (res.ok) {
        setSetDetail(prev => prev ? { ...prev, is_public: !prev.is_public } : null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSharing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!setDetail) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-gray-500">Set bulunamadı.</p>
      </div>
    )
  }

  if (isStudyMode) {
    return (
      <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-white py-10 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => router.push(`/flashcard/${setId}`)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Geri
            </Button>
            <h1 className="text-xl font-bold text-gray-800">{setDetail.title}</h1>
          </div>
          <StudyMode setId={setId} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-white">
      <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      <div className="container mx-auto py-10 px-4 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => router.push('/flashcard')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Geri
          </Button>
          <h1 className="text-3xl font-bold text-gray-800 truncate">{setDetail.title}</h1>
        </div>

        <div className="space-y-6 mb-8">
          <FlashcardStats 
            progress={setDetail.progress} 
            completionPercentage={setDetail.completion_percentage}
            cardCount={setDetail.card_count}
          />
          
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => router.push(`/flashcard/${setId}?mode=study`)} className="bg-gradient-to-r from-indigo-600 to-purple-600">
              <Play className="w-4 h-4 mr-2" /> Çalışmaya Başla
            </Button>
            <AddCardModal setId={setId} onAdded={fetchSet} />
            <div className="flex items-center gap-2 ml-auto">
              <Share2 className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Toplulukla Paylaş</span>
              <Switch 
                checked={setDetail.is_public} 
                onCheckedChange={handleToggleShare}
                disabled={sharing}
              />
            </div>
            <DeleteFlashcardDialog setId={setId} title={setDetail.title} onDelete={() => router.push('/flashcard')} />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Kartlar</h2>
          {setDetail.cards.map((card) => (
            <div key={card.id} className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-1">Ön</p>
                  <p className="text-gray-800 font-medium mb-3">{card.front}</p>
                  <p className="text-sm text-gray-400 mb-1">Arka</p>
                  <p className="text-gray-600">{card.back}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    card.status === 'new' ? 'bg-gray-100 text-gray-600' :
                    card.status === 'learning' ? 'bg-yellow-100 text-yellow-700' :
                    card.status === 'review' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {card.status === 'new' ? 'Yeni' :
                     card.status === 'learning' ? 'Öğreniliyor' :
                     card.status === 'review' ? 'Tekrar' : 'Ezberlendi'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
