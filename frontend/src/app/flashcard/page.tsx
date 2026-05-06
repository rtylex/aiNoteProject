'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, Play, Edit, Loader2 } from 'lucide-react'
import { DeleteFlashcardDialog } from '@/components/flashcard/delete-flashcard-dialog'

interface FlashcardSet {
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
}

export default function FlashcardPage() {
  const [sets, setSets] = useState<FlashcardSet[]>([])
  const [loading, setLoading] = useState(true)
  const { accessToken } = useAuth()
  const router = useRouter()

  const fetchSets = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/flashcard/`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSets(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    fetchSets()
  }, [fetchSets])

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-white">
      <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Flashcard'larım
            </h1>
            <p className="text-gray-500 mt-2">Çalışma kartlarınızı yönetin ve tekrar edin</p>
          </div>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Kütüphaneme Dön
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : sets.length === 0 ? (
          <Card className="col-span-full border-dashed border-2 bg-white/50">
            <CardHeader className="text-center py-10">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl text-gray-600">Henüz flashcard seti yok</CardTitle>
            </CardHeader>
            <CardContent className="text-center pb-10">
              <p className="text-gray-500 mb-4">Dökümanlarınızdan veya çoklu çalışmalarınızdan flashcard oluşturun.</p>
              <Button onClick={() => router.push('/dashboard')} className="bg-gradient-to-r from-indigo-600 to-purple-600">
                Dökümanlarıma Git
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sets.map((set) => (
              <Card key={set.id} className="hover:shadow-xl transition-all group bg-white/80 backdrop-blur-sm hover:-translate-y-1 relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mb-3">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); router.push(`/flashcard/${set.id}`); }}>
                        <Edit className="w-4 h-4 text-gray-400 hover:text-indigo-600" />
                      </Button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DeleteFlashcardDialog setId={set.id} title={set.title} onDelete={fetchSets} />
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-800 group-hover:text-indigo-600 truncate">
                    {set.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span>{set.card_count} kart</span>
                    <span>·</span>
                    <span>%{set.completion_percentage} tamamlandı</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-green-500"
                      style={{ width: `${set.completion_percentage}%` }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => router.push(`/flashcard/${set.id}?mode=study`)}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-1" /> Çalış
                    </Button>
                    <Button 
                      onClick={() => router.push(`/flashcard/${set.id}`)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" /> Düzenle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
