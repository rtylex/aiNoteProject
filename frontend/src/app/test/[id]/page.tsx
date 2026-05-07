'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { QuestionCard } from '@/components/test/question-card'
import { TestResult } from '@/components/test/test-result'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Loader2, ArrowLeft, ClipboardList, Play, RotateCcw, Share2, Brain, Lightbulb, Clock, TrendingUp, ChevronRight } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { TestStats } from '@/components/test/test-stats'
import { TestAttemptHistory } from '@/components/test/test-attempt-history'
import { AiExplanationPanel } from '@/components/test/ai-explanation-panel'
import { DeleteTestDialog } from '@/components/test/delete-test-dialog'

interface Question {
  id: string
  question_text: string
  options: string[]
  order_num: number
}

interface TestData {
  id: string
  title: string
  total_questions: number
  completed: boolean
  score: number | null
  is_public: boolean
  created_at: string
  completed_at: string | null
  questions: Question[]
}

interface SubmittedQuestion {
  id: string
  question_text: string
  options: string[]
  correct_answer: string
  user_answer: string | null
  is_correct: boolean
  explanation: string
  order_num: number
}

interface SubmitResult {
  test_id: string
  score: number
  total: number
  percentage: number
  completed_at: string | null
  questions: SubmittedQuestion[]
}

interface Attempt {
  id: string
  score: number
  total_questions: number
  percentage: number
  created_at: string
}

interface TestStatsData {
  total_tests: number
  completed_tests: number
  total_questions_answered: number
  total_correct: number
  total_wrong: number
  total_empty: number
  average_percentage: number
}

export default function TestPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const retryMode = searchParams.get('retry') === 'true'

  const testId = params.id as string
  const { accessToken } = useAuth()

  const [testData, setTestData] = useState<TestData | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [stats, setStats] = useState<TestStatsData | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  const fetchTest = useCallback(async () => {
    if (!accessToken || !testId) return
    setLoading(true)
    setError(null)

    try {
      const [testRes, attemptsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/test/${testId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch(`${API_BASE_URL}/api/v1/test/${testId}/attempts`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch(`${API_BASE_URL}/api/v1/test/stats`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
      ])

      if (testRes.ok) {
        const data = await testRes.json()
        setTestData(data)

        if (data.completed && !retryMode) {
          setSubmitResult({
            test_id: data.id,
            score: data.score || 0,
            total: data.total_questions,
            percentage: data.total_questions > 0 ? Math.round((data.score || 0) / data.total_questions * 100) : 0,
            completed_at: data.completed_at,
            questions: data.questions.map((q: any) => ({
              id: q.id,
              question_text: q.question_text,
              options: q.options,
              correct_answer: q.correct_answer || '',
              user_answer: q.user_answer || null,
              is_correct: q.is_correct ?? null,
              explanation: q.explanation || '',
              order_num: q.order_num || 0
            }))
          })
        }
      }
      if (attemptsRes.ok) {
        const data = await attemptsRes.json()
        setAttempts(data)
      }
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message)
      else setError('Test yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [accessToken, testId, retryMode])

  useEffect(() => { fetchTest() }, [fetchTest])

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleNext = () => {
    if (testData && currentIndex < testData.questions.length - 1) setCurrentIndex(currentIndex + 1)
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  const handleSubmit = async () => {
    if (!accessToken || !testId) return
    const answerList = Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }))
    if (answerList.length === 0) { alert('En az bir soru cevaplamalısınız'); return }

    setSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/test/${testId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ answers: answerList })
      })
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || 'Test gönderilemedi') }
      const result = await response.json()
      setSubmitResult(result)
      setAttempts(prev => [{
        id: Date.now().toString(),
        score: result.score,
        total_questions: result.total,
        percentage: result.percentage,
        created_at: new Date().toISOString()
      }, ...prev])
    } catch (err) {
      if (err instanceof Error) setError(err.message)
      else setError('Test gönderilirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleShare = async () => {
    if (!accessToken || !testData) return
    setSharing(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/test/${testId}/share`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !testData.is_public })
      })
      if (res.ok) setTestData(prev => prev ? { ...prev, is_public: !prev.is_public } : null)
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

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-b from-[#011133] via-[#1d2f5e] to-[#23335c]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard')} className="bg-[#f4f1e0] text-[#011133]">Dashboard'a Dön</Button>
        </div>
      </div>
    )
  }

  if (!testData || testData.questions.length === 0) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-b from-[#011133] via-[#1d2f5e] to-[#23335c]">
        <div className="text-center">
          <p className="text-[#f4f1e0]/60 mb-4">Test bulunamadı veya soru yok</p>
          <Button onClick={() => router.push('/dashboard')} className="bg-[#f4f1e0] text-[#011133]">Dashboard'a Dön</Button>
        </div>
      </div>
    )
  }

  // RESULT VIEW
  if (submitResult) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#011133] via-[#1d2f5e] to-[#23335c]">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(244,241,224,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,241,224,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="relative container mx-auto py-10 px-4 max-w-5xl">
          <Button variant="ghost" onClick={() => router.push('/test')} className="gap-2 mb-6 text-[#f4f1e0]/70 hover:text-[#f4f1e0] hover:bg-[#f4f1e0]/10">
            <ArrowLeft className="w-4 h-4" /> Testlerime Dön
          </Button>

          <TestResult
            testId={submitResult.test_id}
            score={submitResult.score}
            total={submitResult.total}
            percentage={submitResult.percentage}
            questions={submitResult.questions}
          />

          {/* AI Explanation for wrong answers */}
          <div className="mt-12 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-[#011133] mb-6 flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#011133]/60" /> AI Detaylı Analiz
            </h2>
            <div className="space-y-4">
              {submitResult.questions.filter(q => !q.is_correct).map((q) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.06)] border-l-4 border-red-400"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">Soru {q.order_num}</span>
                    <span className="text-xs text-gray-400">Doğru: {q.correct_answer} | Siz: {q.user_answer || 'Boş'}</span>
                  </div>
                  <p className="text-[#011133] font-medium mb-4">{q.question_text}</p>
                  <AiExplanationPanel testId={testId} questionId={q.id} userAnswer={q.user_answer} />
                </motion.div>
              ))}
              {submitResult.questions.filter(q => !q.is_correct).length === 0 && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#011133]">Tebrikler!</h3>
                  <p className="text-gray-500">Tüm soruları doğru cevapladınız. AI analizi gerekmiyor.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // TEST TAKING VIEW
  const currentQuestion = testData.questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === testData.questions.length

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#011133] via-[#1d2f5e] to-[#23335c]">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(244,241,224,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,241,224,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="relative container mx-auto py-10 px-4 max-w-5xl">
        <Button variant="ghost" onClick={() => router.push('/test')} className="gap-2 mb-6 text-[#f4f1e0]/70 hover:text-[#f4f1e0] hover:bg-[#f4f1e0]/10">
          <ArrowLeft className="w-4 h-4" /> Testlerime Dön
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
                <ClipboardList className="w-7 h-7 text-[#011133]" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#f4f1e0] mb-2">{testData.title}</h1>
            <p className="text-[#f4f1e0]/60">{testData.total_questions} soru</p>
          </div>
        </motion.div>

        {/* Question Navigation */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 mb-6 shadow-[0_4px_20px_rgb(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Soru Navigasyonu</span>
            <span className="text-sm text-[#011133] font-semibold">{answeredCount}/{testData.questions.length} cevaplandı</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {testData.questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                  idx === currentIndex
                    ? 'bg-gradient-to-r from-[#011133] to-[#23335c] text-[#f4f1e0] shadow-lg'
                    : answers[q.id]
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        <QuestionCard
          questionNumber={currentIndex + 1}
          totalQuestions={testData.questions.length}
          questionText={currentQuestion.question_text}
          options={currentQuestion.options}
          selectedAnswer={answers[currentQuestion.id] || null}
          onAnswerSelect={(answer) => handleAnswerSelect(currentQuestion.id, answer)}
        />

        <div className="flex justify-between items-center mt-8 max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 rounded-xl border-[#f4f1e0]/20 text-[#f4f1e0] hover:bg-[#f4f1e0]/10"
          >
            Önceki
          </Button>

          {currentIndex === testData.questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-[#011133] to-[#23335c] hover:from-[#0b1f4d] hover:to-[#2d3e6b] text-[#f4f1e0] rounded-xl h-11 px-6 font-semibold shadow-lg"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Testi Bitir ({answeredCount}/{testData.questions.length})
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="flex items-center gap-2 bg-[#f4f1e0] text-[#011133] hover:bg-[#e7d9a8] rounded-xl h-11 px-6 font-semibold"
            >
              Sonraki <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
