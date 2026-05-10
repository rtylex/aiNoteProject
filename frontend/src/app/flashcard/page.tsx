'use client'
import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { BookOpen, Play, Edit, Loader2, Brain, AlertTriangle, RotateCcw, Flame } from 'lucide-react'
import { DeleteFlashcardDialog } from '@/components/flashcard/delete-flashcard-dialog'
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
  difficult_count: number
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
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [accessToken])

  useEffect(() => { fetchSets() }, [fetchSets])

  return (
    <div className="min-h-screen w-full pt-16 bg-paper relative">
      <div className="absolute inset-0 paper-texture pointer-events-none -z-10" />
      
      <div className="relative container mx-auto py-12 px-4">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-parchment/50 px-4 py-2 rounded-sm text-ink-light text-sm mb-6 border border-parchment font-mono-ui tracking-wide">
            <Brain className="w-4 h-4 text-terracotta" />
            <span>Akıllı Çalışma Kartları</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4 font-display">
            Flashcard'larım
          </h1>
          <p className="text-ink-light text-lg max-w-xl mx-auto font-body">
            AI destekli çalışma kartlarınızı yönetin, tekrar edin ve öğrenmeyi hızlandırın
          </p>
        </motion.div>

        <Tabs defaultValue="sets" className="space-y-8">
          <TabsList className="bg-paper-dark border border-parchment p-1 rounded-sm mx-auto flex w-fit">
            <TabsTrigger value="sets" className="rounded-sm px-6 py-2 text-ink-light data-[state=active]:bg-paper data-[state=active]:text-ink transition-all font-mono-ui text-xs tracking-wide">
              Setlerim {sets.length > 0 && <span className="ml-1.5 bg-parchment text-ink px-1.5 py-0.5 rounded-sm text-xs font-mono-ui">{sets.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="difficult" className="rounded-sm px-6 py-2 text-ink-light data-[state=active]:bg-paper data-[state=active]:text-ink transition-all font-mono-ui text-xs tracking-wide">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Tekrarlarım
            </TabsTrigger>
          </TabsList>

          {/* Sets Tab */}
          <TabsContent value="sets">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-ink" />
              </div>
            ) : sets.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="max-w-lg mx-auto border-dashed border-2 border-parchment bg-paper/50">
                  <CardHeader className="text-center py-14">
                    <div className="w-20 h-20 bg-ink rounded-sm flex items-center justify-center mx-auto mb-6 paper-shadow-lg">
                      <BookOpen className="w-10 h-10 text-paper" />
                    </div>
                    <CardTitle className="text-2xl text-ink font-display">Henüz flashcard seti yok</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center pb-10">
                    <p className="text-ink-light mb-6 font-body">Dökümanlarınızdan veya çoklu çalışmalarınızdan flashcard oluşturun.</p>
                    <Button onClick={() => router.push('/dashboard')} className="bg-ink text-paper hover:bg-ink/90 rounded-sm px-8 h-12 font-semibold font-mono-ui">
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
                    <Card className="group bg-paper rounded-sm border-parchment paper-shadow hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative paper-fold">
                      {/* Top accent bar */}
                      <div className="h-1.5 bg-ink" />
                      <CardHeader className="pb-3 pt-5">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-sm bg-ink flex items-center justify-center paper-shadow">
                            <BookOpen className="w-6 h-6 text-paper" />
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-parchment" onClick={(e) => { e.stopPropagation(); router.push(`/flashcard/${set.id}`); }}>
                              <Edit className="w-4 h-4 text-ink-light hover:text-ink" />
                            </Button>
                            <div onClick={(e) => e.stopPropagation()}>
                              <DeleteFlashcardDialog setId={set.id} title={set.title} onDelete={fetchSets} />
                            </div>
                          </div>
                        </div>
                        <CardTitle className="text-lg font-bold text-ink group-hover:text-terracotta truncate mt-3 font-display">
                          {set.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm font-mono-ui">
                          <span className="text-ink-light">{set.card_count} kart</span>
                          <span className="text-ink-light">{set.completion_percentage}% tamamlandı</span>
                        </div>
                        <div className="w-full h-2 bg-parchment rounded-sm overflow-hidden">
                          <div className="h-full bg-olive rounded-sm transition-all" style={{ width: `${set.completion_percentage}%` }} />
                        </div>
                        {(set.progress.new + set.progress.learning) > 0 && (
                          <div className="inline-flex items-center gap-1.5 bg-terracotta/10 text-terracotta px-3 py-1.5 rounded-sm text-xs font-medium font-mono-ui">
                            <RotateCcw className="w-3 h-3" />
                            Bugün {set.progress.new + set.progress.learning} kart tekrar edilecek
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button onClick={() => router.push(`/flashcard/${set.id}?mode=study`)} className="flex-1 bg-ink text-paper hover:bg-ink/90 rounded-sm h-10 text-sm font-semibold font-mono-ui">
                            <Play className="w-4 h-4 mr-1.5" /> Çalış
                          </Button>
                          <Button onClick={() => router.push(`/flashcard/${set.id}`)} variant="outline" size="sm" className="flex-1 rounded-sm h-10 text-sm border-parchment hover:border-ink hover:text-ink font-mono-ui">
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

          {/* Tekrarlarım Tab - Set based */}
          <TabsContent value="difficult">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-ink" />
              </div>
            ) : sets.filter(s => s.difficult_count > 0).length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
                <div className="w-20 h-20 bg-olive/20 rounded-sm flex items-center justify-center mx-auto mb-6 paper-shadow-lg">
                  <Brain className="w-10 h-10 text-olive" />
                </div>
                <h3 className="text-2xl font-bold text-ink mb-2 font-display">Harika!</h3>
                <p className="text-ink-light max-w-md mx-auto font-body">Şu anda zorlandığınız bir kart yok. Tüm kartları iyi biliyorsunuz.</p>
              </motion.div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sets
                  .sort((a, b) => b.difficult_count - a.difficult_count)
                  .map((set, idx) => (
                  <motion.div
                    key={set.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                  >
                    <Card className="group bg-paper rounded-sm border-parchment paper-shadow hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative paper-fold">
                      <div className="h-1.5 bg-terracotta" />
                      <CardHeader className="pb-3 pt-5">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-sm bg-terracotta/10 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-terracotta" />
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-parchment" onClick={(e) => { e.stopPropagation(); router.push(`/flashcard/${set.id}`); }}>
                              <Edit className="w-4 h-4 text-ink-light hover:text-ink" />
                            </Button>
                          </div>
                        </div>
                        <CardTitle className="text-lg font-bold text-ink group-hover:text-terracotta truncate mt-3 font-display">
                          {set.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm font-mono-ui">
                          <span className="text-ink-light">{set.card_count} kart</span>
                          <span className={`font-bold ${set.difficult_count > 0 ? 'text-terracotta' : 'text-ink-light'}`}>
                            {set.difficult_count} zor
                          </span>
                        </div>
                        <div className="w-full h-2 bg-parchment rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-terracotta rounded-sm transition-all"
                            style={{
                              width: `${set.card_count > 0 ? (set.difficult_count / set.card_count) * 100 : 0}%`
                            }}
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          {set.difficult_count > 0 && (
                            <Button
                              onClick={() => router.push(`/flashcard/${set.id}?mode=difficult`)}
                              className="flex-1 bg-terracotta text-paper hover:bg-terracotta/90 rounded-sm h-10 text-sm font-semibold font-mono-ui"
                            >
                              <Flame className="w-4 h-4 mr-1.5" /> Zor Soruları Tekrar Et
                            </Button>
                          )}
                          <Button
                            onClick={() => router.push(`/flashcard/${set.id}?mode=full`)}
                            variant="outline"
                            size="sm"
                            className={`rounded-sm h-10 text-sm border-parchment hover:border-ink hover:text-ink font-mono-ui ${set.difficult_count === 0 ? 'flex-1' : ''}`}
                          >
                            <RotateCcw className="w-4 h-4 mr-1.5" /> Genel Tekrar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
