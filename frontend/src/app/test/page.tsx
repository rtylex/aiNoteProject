'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ClipboardList, FileText, Clock, CheckCircle, XCircle,
  Loader2, ChevronRight, Play, RotateCcw, Brain,
  TrendingUp, AlertTriangle
} from 'lucide-react'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { TestStats } from '@/components/test/test-stats'
import { DeleteTestDialog } from '@/components/test/delete-test-dialog'

interface TestItem {
  id: string
  title: string
  document_id: string | null
  total_questions: number
  score: number | null
  completed: boolean
  is_public: boolean
  created_at: string
  completed_at: string | null
}

interface TestStatsData {
  total_tests: number
  completed_tests: number
  total_questions_answered: number
  total_correct: number
  total_wrong: number
  total_empty: number
  average_percentage: number
  trend: { test_title: string; percentage: number; created_at: string }[]
}

export default function TestsPage() {
  const { accessToken } = useAuth()
  const router = useRouter()
  const [tests, setTests] = useState<TestItem[]>([])
  const [stats, setStats] = useState<TestStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTests = useCallback(async () => {
    if (!accessToken) return
    try {
      setLoading(true)
      setError(null)

      const [testsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/test/`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch(`${API_BASE_URL}/api/v1/test/stats`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
      ])

      if (testsRes.ok) {
        const data = await testsRes.json()
        setTests(data)
      }
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message)
      else setError('Testler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { fetchTests() }, [fetchTests])

  const completedTests = tests.filter(t => t.completed)
  const inProgressTests = tests.filter(t => !t.completed)

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
            <span>Akıllı Test ve Analiz</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4 font-display">
            Testlerim
          </h1>
          <p className="text-ink-light text-lg max-w-xl mx-auto font-body">
            AI destekli testlerinizi çözün, analiz edin ve öğrenmeyi hızlandırın
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-ink" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-terracotta mb-4 font-body">{error}</p>
            <Button onClick={fetchTests} className="bg-ink text-paper hover:bg-ink/90 font-mono-ui">Tekrar Dene</Button>
          </div>
        ) : (
          <>
            {/* Stats */}
            {stats && stats.total_tests > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                <TestStats stats={stats} />
              </motion.div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="all" className="space-y-8">
              <TabsList className="bg-paper-dark border border-parchment p-1 rounded-sm mx-auto flex w-fit">
                <TabsTrigger value="all" className="rounded-sm px-6 py-2 text-ink-light data-[state=active]:bg-paper data-[state=active]:text-ink transition-all font-mono-ui text-xs tracking-wide">
                  Tümü {tests.length > 0 && <span className="ml-1.5 bg-parchment text-ink px-1.5 py-0.5 rounded-sm text-xs font-mono-ui">{tests.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="inprogress" className="rounded-sm px-6 py-2 text-ink-light data-[state=active]:bg-paper data-[state=active]:text-ink transition-all font-mono-ui text-xs tracking-wide">
                  <Clock className="w-3.5 h-3.5 mr-1.5" /> Devam Eden
                </TabsTrigger>
                <TabsTrigger value="completed" className="rounded-sm px-6 py-2 text-ink-light data-[state=active]:bg-paper data-[state=active]:text-ink transition-all font-mono-ui text-xs tracking-wide">
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Tamamlanan
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <TestGrid key="grid-all" tests={tests} onDelete={fetchTests} />
              </TabsContent>
              <TabsContent value="inprogress">
                <TestGrid key="grid-inprogress" tests={inProgressTests} onDelete={fetchTests} />
              </TabsContent>
              <TabsContent value="completed">
                <TestGrid key="grid-completed" tests={completedTests} onDelete={fetchTests} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}

function TestGrid({ tests, onDelete }: { tests: TestItem[]; onDelete: () => void }) {
  const router = useRouter()

  if (!tests || tests.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="max-w-lg mx-auto border-dashed border-2 border-parchment bg-paper/50">
          <CardHeader className="text-center py-14">
            <div className="w-20 h-20 bg-ink rounded-sm flex items-center justify-center mx-auto mb-6 paper-shadow-lg">
              <ClipboardList className="w-10 h-10 text-paper" />
            </div>
            <CardTitle className="text-2xl text-ink font-display">Henüz test yok</CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-10">
            <p className="text-ink-light mb-6 font-body">PDF dokümanlarınızdan veya kütüphaneden test oluşturun.</p>
            <Button onClick={() => router.push('/dashboard')} className="bg-ink text-paper hover:bg-ink/90 rounded-sm px-8 h-12 font-semibold font-mono-ui">
              Dökümanlarıma Git
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {tests.map((test, idx) => {
        const percentage = test.total_questions > 0
          ? Math.round((test.score || 0) / test.total_questions * 100)
          : 0
        const isPassing = percentage >= 60
        const isCompleted = test.completed

        return (
          <motion.div
            key={test.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
          >
            <Card className="group bg-paper rounded-sm border-parchment paper-shadow hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative paper-fold">
              {/* Top accent bar */}
              <div className={`h-1.5 ${
                isCompleted
                  ? isPassing ? 'bg-olive' : 'bg-terracotta'
                  : 'bg-gold'
              }`} />
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-sm flex items-center justify-center paper-shadow ${
                    isCompleted
                      ? isPassing ? 'bg-olive/20' : 'bg-terracotta/20'
                      : 'bg-gold/20'
                  }`}>
                    {isCompleted ? (
                      isPassing ? <CheckCircle className="w-6 h-6 text-olive" /> : <XCircle className="w-6 h-6 text-terracotta" />
                    ) : (
                      <Clock className="w-6 h-6 text-gold" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteTestDialog testId={test.id} testTitle={test.title} onDelete={onDelete} />
                  </div>
                </div>
                <CardTitle className="text-lg font-bold text-ink group-hover:text-terracotta truncate mt-3 font-display">
                  {test.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm font-mono-ui">
                  <span className="text-ink-light">{test.total_questions} soru</span>
                  {isCompleted && <span className="text-ink-light">%{percentage}</span>}
                </div>

                {isCompleted && (
                  <div className="w-full h-2 bg-parchment rounded-sm overflow-hidden">
                    <div className={`h-full rounded-sm transition-all ${
                      isPassing ? 'bg-olive' : 'bg-terracotta'
                    }`} style={{ width: `${percentage}%` }} />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Link href={`/test/${test.id}${isCompleted ? '?retry=true' : ''}`} className="flex-1">
                    <Button className={`w-full rounded-sm h-10 text-sm font-semibold font-mono-ui ${
                      isCompleted
                        ? 'bg-ink text-paper hover:bg-ink/90'
                        : 'bg-gold text-paper hover:bg-gold/90'
                    }`}>
                      {isCompleted ? <><RotateCcw className="w-4 h-4 mr-1.5" /> Tekrar Çöz</> : <><Play className="w-4 h-4 mr-1.5" /> Teste Başla</>}
                    </Button>
                  </Link>
                  <Link href={`/test/${test.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full rounded-sm h-10 text-sm border-parchment hover:border-ink hover:text-ink font-mono-ui">
                      <TrendingUp className="w-4 h-4 mr-1.5" /> Analiz
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
