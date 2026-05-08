'use client'
import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { BookOpen, Play, Edit, Loader2, Brain, AlertTriangle, ChevronRight, RotateCcw, Flame, TrendingDown, Clock } from 'lucide-react'
import { DeleteFlashcardDialog } from '@/components/flashcard/delete-flashcard-dialog'
import { DifficultStudyMode } from '@/components/flashcard/difficult-study-mode'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FlashcardSet {
  id: string
  title: string
  description: string | null
  card_count: number
  is_public: boolean
  created_at: string
  progress: { new: number; learning: number; review: number; mastered: number }
  completion_percentage: number
}

interface DifficultCard {
  id: string
  front: string
  back: string
  extra_notes: string | null
  set_id: string
  set_title: string
  ease_factor: number
  last_reviewed: string
}

export default function FlashcardPage() {
  const [sets, setSets] = useState<FlashcardSet[]>([])
  const [difficultCards, setDifficultCards] = useState<DifficultCard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDifficult, setLoadingDifficult] = useState(false)
  const [isStudyingDifficult, setIsStudyingDifficult] = useState(false)
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
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [accessToken])

  const fetchDifficult = useCallback(async () => {
    if (!accessToken) return
    setLoadingDifficult(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/flashcard/reviews/difficult`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setDifficultCards(data)
      }
    } catch (e) { console.error(e) }
    finally { setLoadingDifficult(false) }
  }, [accessToken])

  useEffect(() => { fetchSets() }, [fetchSets])

  return (
    <div className="min-h-screen w-full pt-16 bg-gradient-to-b from-[#011133] via-[#1d2f5e] to-[#23335c]">
      {/* Subtle grid pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(244,241,224,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,241,224,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      <div className="relative container mx-auto py-12 px-4">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-[#f4f1e0]/10 backdrop-blur-sm px-4 py-2 rounded-full text-[#f4f1e0]/80 text-sm mb-6 border border-[#f4f1e0]/20">
            <Brain className="w-4 h-4" />
            <span>Akıllı Çalışma Kartları</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#f4f1e0] mb-4">
            Flashcard'larım
          </h1>
          <p className="text-[#f4f1e0]/60 text-lg max-w-xl mx-auto">
            AI destekli çalışma kartlarınızı yönetin, tekrar edin ve öğrenmeyi hızlandırın
          </p>
        </motion.div>

        <Tabs defaultValue="sets" className="space-y-8">
          <TabsList className="bg-[#f4f1e0]/10 border border-[#f4f1e0]/20 p-1 rounded-full mx-auto flex w-fit">
            <TabsTrigger value="sets" className="rounded-full px-6 py-2 text-[#f4f1e0]/70 data-[state=active]:bg-[#f4f1e0] data-[state=active]:text-[#011133] transition-all">
              Setlerim {sets.length > 0 && <span className="ml-1.5 bg-[#f4f1e0]/20 text-[#f4f1e0] data-[state=active]:bg-[#011133]/20 data-[state=active]:text-[#011133] px-1.5 py-0.5 rounded-full text-xs">{sets.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="difficult" onClick={fetchDifficult} className="rounded-full px-6 py-2 text-[#f4f1e0]/70 data-[state=active]:bg-[#f4f1e0] data-[state=active]:text-[#011133] transition-all">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Tekrarlarım
            </TabsTrigger>
          </TabsList>

          {/* Sets Tab */}
          <TabsContent value="sets">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-[#f4f1e0]" />
              </div>
            ) : sets.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="max-w-lg mx-auto border-dashed border-2 border-[#f4f1e0]/20 bg-transparent">
                  <CardHeader className="text-center py-14">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#f4f1e0] to-[#e7d9a8] rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                      <BookOpen className="w-10 h-10 text-[#011133]" />
                    </div>
                    <CardTitle className="text-2xl text-[#f4f1e0]">Henüz flashcard seti yok</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center pb-10">
                    <p className="text-[#f4f1e0]/60 mb-6">Dökümanlarınızdan veya çoklu çalışmalarınızdan flashcard oluşturun.</p>
                    <Button onClick={() => router.push('/dashboard')} className="bg-[#f4f1e0] text-[#011133] hover:bg-[#e7d9a8] rounded-full px-8 h-12 font-semibold">
                      Dökümanlarıma Git
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sets.map((set, idx) => (
                  <motion.div
                    key={set.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                  >
                    <Card className="group bg-white/95 backdrop-blur-sm rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 overflow-hidden relative">
                      {/* Top accent bar */}
                      <div className="h-1.5 bg-gradient-to-r from-[#011133] via-[#23335c] to-[#3d4f7f]" />
                      <CardHeader className="pb-3 pt-5">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#011133] to-[#23335c] flex items-center justify-center shadow-lg">
                            <BookOpen className="w-6 h-6 text-[#f4f1e0]" />
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); router.push(`/flashcard/${set.id}`); }}>
                              <Edit className="w-4 h-4 text-gray-400 hover:text-[#011133]" />
                            </Button>
                            <div onClick={(e) => e.stopPropagation()}>
                              <DeleteFlashcardDialog setId={set.id} title={set.title} onDelete={fetchSets} />
                            </div>
                          </div>
                        </div>
                        <CardTitle className="text-lg font-bold text-[#011133] group-hover:text-[#23335c] truncate mt-3">
                          {set.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{set.card_count} kart</span>
                          <span className="text-gray-400">{set.completion_percentage}% tamamlandı</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#011133] to-[#23335c] rounded-full transition-all" style={{ width: `${set.completion_percentage}%` }} />
                        </div>
                        {/* Due count badge */}
                        {(set.progress.new + set.progress.learning) > 0 && (
                          <div className="inline-flex items-center gap-1.5 bg-[#011133]/5 text-[#011133] px-3 py-1.5 rounded-full text-xs font-medium">
                            <RotateCcw className="w-3 h-3" />
                            Bugün {set.progress.new + set.progress.learning} kart tekrar edilecek
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button onClick={() => router.push(`/flashcard/${set.id}?mode=study`)} className="flex-1 bg-gradient-to-r from-[#011133] to-[#23335c] hover:from-[#0b1f4d] hover:to-[#2d3e6b] text-[#f4f1e0] rounded-xl h-10 text-sm font-semibold">
                            <Play className="w-4 h-4 mr-1.5" /> Çalış
                          </Button>
                          <Button onClick={() => router.push(`/flashcard/${set.id}`)} variant="outline" size="sm" className="flex-1 rounded-xl h-10 text-sm border-gray-200 hover:border-[#011133] hover:text-[#011133]">
                            <Edit className="w-4 h-4 mr-1.5" /> Düzenle
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Difficult Cards Tab */}
          <TabsContent value="difficult">
            {isStudyingDifficult ? (
              <DifficultStudyMode 
                cards={difficultCards} 
                onExit={() => { setIsStudyingDifficult(false); fetchDifficult(); }} 
              />
            ) : loadingDifficult ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-[#f4f1e0]" />
              </div>
            ) : difficultCards.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[#f4f1e0] mb-2">Harika!</h3>
                <p className="text-[#f4f1e0]/60 max-w-md mx-auto">Şu anda zorlandığınız bir kart yok. Tüm kartları iyi biliyorsunuz.</p>
              </motion.div>
            ) : (
              <div className="max-w-3xl mx-auto">
                {/* Summary */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-[#1d2f5e]/80 to-[#23335c]/80 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-[#f4f1e0]/10"
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#f4f1e0]/10 flex items-center justify-center">
                        <Flame className="w-6 h-6 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-[#f4f1e0] font-bold text-xl">{difficultCards.length} zor kart</p>
                        <p className="text-[#f4f1e0]/60 text-sm">Tekrar etmeyi bekliyor</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-[#f4f1e0]/70">
                        <TrendingDown className="w-4 h-4" />
                        <span>Ort. zorluk: {(difficultCards.reduce((acc, c) => acc + c.ease_factor, 0) / difficultCards.length).toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#f4f1e0]/70">
                        <Clock className="w-4 h-4" />
                        <span>{new Set(difficultCards.map(c => c.set_id)).size} farklı set</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Big CTA Button */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
                  <Button 
                    onClick={() => setIsStudyingDifficult(true)}
                    className="w-full h-16 bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 hover:from-orange-600 hover:via-red-600 hover:to-rose-700 text-white rounded-2xl text-lg font-bold shadow-xl shadow-red-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Flame className="w-6 h-6 mr-3" />
                    Zor Kartları Çalışmaya Başla
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>

                {/* Preview List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#f4f1e0]/60 uppercase tracking-wider mb-4">Zorlandığınız Kartlar</h3>
                  {difficultCards.map((card, idx) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.06)] hover:shadow-[0_4px_30px_rgb(0,0,0,0.1)] transition-all border-l-4 border-orange-400 hover:translate-x-1"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-[#23335c]/60 bg-[#011133]/5 px-2.5 py-1 rounded-full">{card.set_title}</span>
                            {card.last_reviewed && (
                              <span className="text-xs text-gray-400">{new Date(card.last_reviewed).toLocaleDateString('tr-TR')}</span>
                            )}
                          </div>
                          <p className="text-[#011133] font-semibold mb-1 truncate">{card.front}</p>
                          <p className="text-gray-500 text-sm truncate">{card.back}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            card.ease_factor <= 1.5 ? 'bg-red-100 text-red-700' :
                            card.ease_factor <= 2.0 ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            Zorluk: {card.ease_factor.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
