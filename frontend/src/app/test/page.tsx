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
    <div className="min-h-screen w-full pt-16 bg-gradient-to-b from-[#011133] via-[#1d2f5e] to-[#23335c]">
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
            <span>Akıllı Test ve Analiz</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#f4f1e0] mb-4">
            Testlerim
          </h1>
          <p className="text-[#f4f1e0]/60 text-lg max-w-xl mx-auto">
            AI destekli testlerinizi çözün, analiz edin ve öğrenmeyi hızlandırın
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[#f4f1e0]" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={fetchTests} className="bg-[#f4f1e0] text-[#011133] hover:bg-[#e7d9a8]">Tekrar Dene</Button>
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
              <TabsList className="bg-[#f4f1e0]/10 border border-[#f4f1e0]/20 p-1 rounded-full mx-auto flex w-fit">
                <TabsTrigger value="all" className="rounded-full px-6 py-2 text-[#f4f1e0]/70 data-[state=active]:bg-[#f4f1e0] data-[state=active]:text-[#011133] transition-all">
                  Tümü {tests.length > 0 && <span className="ml-1.5 bg-[#f4f1e0]/20 text-[#f4f1e0] data-[state=active]:bg-[#011133]/20 data-[state=active]:text-[#011133] px-1.5 py-0.5 rounded-full text-xs">{tests.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="inprogress" className="rounded-full px-6 py-2 text-[#f4f1e0]/70 data-[state=active]:bg-[#f4f1e0] data-[state=active]:text-[#011133] transition-all">
                  <Clock className="w-3.5 h-3.5 mr-1.5" /> Devam Eden
                </TabsTrigger>
                <TabsTrigger value="completed" className="rounded-full px-6 py-2 text-[#f4f1e0]/70 data-[state=active]:bg-[#f4f1e0] data-[state=active]:text-[#011133] transition-all">
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
        <Card className="max-w-lg mx-auto border-dashed border-2 border-[#f4f1e0]/20 bg-transparent">
          <CardHeader className="text-center py-14">
            <div className="w-20 h-20 bg-gradient-to-br from-[#f4f1e0] to-[#e7d9a8] rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <ClipboardList className="w-10 h-10 text-[#011133]" />
            </div>
            <CardTitle className="text-2xl text-[#f4f1e0]">Henüz test yok</CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-10">
            <p className="text-[#f4f1e0]/60 mb-6">PDF dokümanlarınızdan veya kütüphaneden test oluşturun.</p>
            <Button onClick={() => router.push('/dashboard')} className="bg-[#f4f1e0] text-[#011133] hover:bg-[#e7d9a8] rounded-full px-8 h-12 font-semibold">
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
            <Card className="group bg-white/95 backdrop-blur-sm rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 overflow-hidden relative">
              {/* Top accent bar */}
              <div className={`h-1.5 bg-gradient-to-r ${
                isCompleted
                  ? isPassing ? 'from-green-500 to-emerald-500' : 'from-red-400 to-rose-500'
                  : 'from-amber-400 to-orange-500'
              }`} />
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                    isCompleted
                      ? isPassing ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-red-400 to-rose-500'
                      : 'bg-gradient-to-br from-amber-400 to-orange-500'
                  }`}>
                    {isCompleted ? (
                      isPassing ? <CheckCircle className="w-6 h-6 text-white" /> : <XCircle className="w-6 h-6 text-white" />
                    ) : (
                      <Clock className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteTestDialog testId={test.id} testTitle={test.title} onDelete={onDelete} />
                  </div>
                </div>
                <CardTitle className="text-lg font-bold text-[#011133] group-hover:text-[#23335c] truncate mt-3">
                  {test.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{test.total_questions} soru</span>
                  {isCompleted && <span className="text-gray-400">%{percentage}</span>}
                </div>

                {isCompleted && (
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      isPassing ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'
                    }`} style={{ width: `${percentage}%` }} />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Link href={`/test/${test.id}${isCompleted ? '?retry=true' : ''}`} className="flex-1">
                    <Button className={`w-full rounded-xl h-10 text-sm font-semibold ${
                      isCompleted
                        ? 'bg-gradient-to-r from-[#011133] to-[#23335c] hover:from-[#0b1f4d] hover:to-[#2d3e6b] text-[#f4f1e0]'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                    }`}>
                      {isCompleted ? <><RotateCcw className="w-4 h-4 mr-1.5" /> Tekrar Çöz</> : <><Play className="w-4 h-4 mr-1.5" /> Teste Başla</>}
                    </Button>
                  </Link>
                  <Link href={`/test/${test.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full rounded-xl h-10 text-sm border-gray-200 hover:border-[#011133] hover:text-[#011133]">
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
