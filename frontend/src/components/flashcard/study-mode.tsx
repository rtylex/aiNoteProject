'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { Loader2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface StudyModeProps {
  setId: string
}

export function StudyMode({ setId }: StudyModeProps) {
  const [cards, setCards] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const { accessToken } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchStudyCards()
  }, [setId])

  const fetchStudyCards = async () => {
    if (!accessToken) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/flashcard/${setId}/study`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCards(data)
        if (data.length === 0) setFinished(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (finished) {
    return (
      <div className="text-center py-20 space-y-6">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <RotateCcw className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Çalışma Tamamlandı!</h2>
        <p className="text-gray-500">Bugünlük tekrar edilecek kartların hepsini bitirdiniz.</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => router.push('/flashcard')}>Flashcard'larıma Dön</Button>
          <Button onClick={() => { setCurrentIndex(0); setFinished(false); setIsFlipped(false); fetchStudyCards(); }}>Tekrar Başla</Button>
        </div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Şu anda tekrar edilecek kart yok. Kartları öğrenmeye başlayın!</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push(`/flashcard/${setId}`)}>Sete Dön</Button>
      </div>
    )
  }

  const currentCard = cards[currentIndex]

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>Kart {currentIndex + 1}/{cards.length}</span>
        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card Flip */}
      <div 
        className="relative w-full h-80 cursor-pointer [perspective:1000px]"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`
          relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]
          ${isFlipped ? '[transform:rotateY(180deg)]' : ''}
        `}>
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
              <p className="text-xl font-medium text-gray-800 text-center leading-relaxed">{currentCard.front}</p>
              <p className="absolute bottom-4 text-xs text-gray-400">Çevirmek için tıklayın</p>
            </div>
          </div>
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg border border-indigo-100">
              <p className="text-lg text-gray-700 text-center leading-relaxed">{currentCard.back}</p>
            </div>
          </div>
        </div>
      </div>

      {!isFlipped ? (
        <div className="text-center text-sm text-gray-400">
          Kartı çevirmek için üzerine tıklayın
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-center text-sm font-medium text-gray-600">Bu kartı ne kadar iyi biliyorsunuz?</p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((q) => (
              <Button
                key={q}
                variant="outline"
                onClick={() => handleReview(q)}
                className={`h-14 flex flex-col items-center justify-center gap-1 transition-all ${
                  q <= 2 ? 'hover:bg-red-50 hover:border-red-300 hover:text-red-700' : 
                  q === 3 ? 'hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700' : 
                  'hover:bg-green-50 hover:border-green-300 hover:text-green-700'
                }`}
              >
                <span className="text-lg font-bold">{q}</span>
                <span className="text-[10px] uppercase tracking-wide">
                  {q === 1 ? 'Tekrar' : q === 2 ? 'Zor' : q === 3 ? 'Orta' : q === 4 ? 'İyi' : 'Mükemmel'}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button 
          variant="ghost" 
          onClick={() => { if (currentIndex > 0) { setCurrentIndex(prev => prev - 1); setIsFlipped(false); } }}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => { if (currentIndex < cards.length - 1) { setCurrentIndex(prev => prev + 1); setIsFlipped(false); } }}
          disabled={currentIndex === cards.length - 1}
        >
          Sonraki <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
