'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { QuestionCard } from '@/components/test/question-card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, ClipboardList, RotateCcw, Share2, Lightbulb, ChevronRight, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { AiExplanationPanel } from '@/components/test/ai-explanation-panel'

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

export default function TestPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const retryMode = searchParams.get('retry') === 'true'

  const testId = params.id as string
  const { accessToken } = useAuth()

  const [testData, setTestData] = useState<TestData | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'correct' | 'wrong'>('wrong')
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null)

  const fetchTest = useCallback(async () => {
    if (!accessToken || !testId) return
    setLoading(true)
    setError(null)

    try {
      const [testRes, attemptsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/test/${testId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch(`${API_BASE_URL}/api/v1/test/${testId}/attempts`, {
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
      <div className="min-h-screen pt-16 flex justify-center items-center bg-paper relative">
        <div className="absolute inset-0 paper-texture pointer-events-none" />
        <Loader2 className="w-10 h-10 animate-spin text-ink" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-16 flex justify-center items-center bg-paper relative">
        <div className="absolute inset-0 paper-texture pointer-events-none" />
        <div className="text-center">
          <p className="text-terracotta mb-4 font-body">{error}</p>
          <Button onClick={() => router.push('/dashboard')} className="bg-ink text-paper hover:bg-ink/90 font-mono-ui">Dashboard'a Dön</Button>
        </div>
      </div>
    )
  }

  if (!testData || testData.questions.length === 0) {
    return (
      <div className="min-h-screen pt-16 flex justify-center items-center bg-paper relative">
        <div className="absolute inset-0 paper-texture pointer-events-none" />
        <div className="text-center">
          <p className="text-ink-light mb-4 font-body">Test bulunamadı veya soru yok</p>
          <Button onClick={() => router.push('/dashboard')} className="bg-ink text-paper hover:bg-ink/90 font-mono-ui">Dashboard'a Dön</Button>
        </div>
      </div>
    )
  }

  // RESULT VIEW
  if (submitResult) {
    const wrongQuestions = submitResult.questions.filter(q => !q.is_correct)
    const correctQuestions = submitResult.questions.filter(q => q.is_correct)
    const percentage = submitResult.percentage

    const filteredQuestions = activeTab === 'all' ? submitResult.questions :
      activeTab === 'correct' ? correctQuestions :
      wrongQuestions

    const getGradeEmoji = (pct: number) => {
      if (pct >= 90) return '🌟'
      if (pct >= 80) return '🎉'
      if (pct >= 70) return '👏'
      if (pct >= 60) return '💪'
      return '📚'
    }
    const getGradeText = (pct: number) => {
      if (pct >= 90) return 'Mükemmel!'
      if (pct >= 80) return 'Çok İyi!'
      if (pct >= 70) return 'İyi!'
      if (pct >= 60) return 'Başarılı'
      return 'Geliştirilmeli'
    }

    const toggleQuestion = (questionId: string) => {
      setOpenQuestionId(prev => prev === questionId ? null : questionId)
    }

    return (
      <div className="min-h-screen w-full pt-16 bg-paper relative">
        <div className="absolute inset-0 paper-texture pointer-events-none -z-10" />
        <div className="relative container mx-auto py-10 px-4 max-w-6xl">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => router.push('/test')} className="gap-2 mb-8 text-ink-light hover:text-ink hover:bg-parchment rounded-sm font-mono-ui">
            <ArrowLeft className="w-4 h-4" /> Testlerime Dön
          </Button>

          {/* Hero Banner with Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-ink rounded-sm p-8 md:p-12 mb-10 paper-shadow-lg overflow-hidden text-center text-paper"
          >
            <div className="absolute inset-0 paper-texture opacity-10" />
            <div className="relative z-10">
              <div className="text-6xl md:text-7xl mb-4">{getGradeEmoji(percentage)}</div>
              <h1 className="text-3xl md:text-4xl font-bold text-paper mb-2 font-display">Test Tamamlandı!</h1>
              <p className="text-xl text-paper/60 mb-8 font-body">{getGradeText(percentage)}</p>

              {/* Score Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                <div className="bg-paper/10 backdrop-blur-sm rounded-sm p-5 border border-paper/10">
                  <div className="text-3xl md:text-4xl font-bold text-paper font-display">{submitResult.score}</div>
                  <div className="text-sm text-paper/60 mt-1 font-mono-ui">Doğru</div>
                </div>
                <div className="bg-paper/10 backdrop-blur-sm rounded-sm p-5 border border-paper/10">
                  <div className="text-3xl md:text-4xl font-bold text-terracotta font-display">{submitResult.total - submitResult.score}</div>
                  <div className="text-sm text-paper/60 mt-1 font-mono-ui">Yanlış</div>
                </div>
                <div className="bg-paper/10 backdrop-blur-sm rounded-sm p-5 border border-paper/10">
                  <div className="text-3xl md:text-4xl font-bold text-paper font-display">{submitResult.total}</div>
                  <div className="text-sm text-paper/60 mt-1 font-mono-ui">Toplam</div>
                </div>
                <div className="bg-paper rounded-sm p-5 paper-shadow">
                  <div className="text-3xl md:text-4xl font-bold text-ink font-display">%{percentage}</div>
                  <div className="text-sm text-ink-light mt-1 font-mono-ui">Başarı</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-center mt-8 flex-wrap">
                <Link href={`/test/${testId}?retry=true`}>
                  <Button className="bg-paper text-ink hover:bg-paper-dark rounded-sm px-6 h-11 font-semibold paper-shadow font-mono-ui">
                    <RotateCcw className="w-4 h-4 mr-2" /> Testi Tekrar Çöz
                  </Button>
                </Link>
                <Button variant="outline" className="border-paper/20 text-paper hover:bg-paper/10 rounded-sm px-6 h-11 font-mono-ui" onClick={handleToggleShare}>
                  <Share2 className="w-4 h-4 mr-2" /> Paylaş
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Questions Detail with Tabs + Accordion */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-ink mb-2 flex items-center gap-2 font-display">
              <Lightbulb className="w-6 h-6 text-terracotta" /> Soru Detayları
            </h2>
            <p className="text-ink-light font-body">İncelemek istediğiniz soruyu seçin</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 bg-paper-dark border border-parchment rounded-sm p-1.5 w-fit">
            {[
              { key: 'all', label: 'Tümü', count: submitResult.questions.length },
              { key: 'correct', label: 'Doğru', count: correctQuestions.length },
              { key: 'wrong', label: 'Yanlış', count: wrongQuestions.length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key as any); setOpenQuestionId(null) }}
                className={`px-5 py-2 rounded-sm text-sm font-medium transition-all font-mono-ui ${
                  activeTab === tab.key
                    ? 'bg-paper text-ink paper-shadow'
                    : 'text-ink-light hover:text-ink hover:bg-parchment/50'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-sm text-xs font-mono-ui ${
                  activeTab === tab.key ? 'bg-parchment text-ink' : 'bg-parchment text-ink-light'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Accordion List */}
          <div className="space-y-3">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-olive/20 rounded-sm flex items-center justify-center mx-auto mb-4 paper-shadow">
                  <CheckCircle className="w-8 h-8 text-olive" />
                </div>
                <h3 className="text-xl font-bold text-ink mb-2 font-display">
                  {activeTab === 'wrong' ? 'Harika! Yanlış Soru Yok' : 'Bu Sekmede Soru Yok'}
                </h3>
                <p className="text-ink-light font-body">
                  {activeTab === 'wrong' ? 'Tüm soruları doğru cevapladınız!' : 'Başka bir sekme seçin.'}
                </p>
              </div>
            ) : (
              filteredQuestions.map((q) => {
                const isOpen = openQuestionId === q.id
                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-paper rounded-sm border border-parchment paper-shadow overflow-hidden paper-fold ${
                      q.is_correct ? 'border-l-2 border-olive' : 'border-l-2 border-terracotta'
                    }`}
                  >
                    {/* Accordion Header */}
                    <button
                      onClick={() => toggleQuestion(q.id)}
                      className={`w-full px-5 py-4 flex items-center justify-between text-left transition-colors ${
                        isOpen ? (q.is_correct ? 'bg-olive/5' : 'bg-terracotta/5') : 'hover:bg-paper-dark'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0 ${
                          q.is_correct ? 'bg-olive text-paper' : 'bg-terracotta text-paper'
                        }`}>
                          {q.is_correct ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-ink font-display">Soru {q.order_num}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-sm font-medium font-mono-ui ${
                            q.is_correct ? 'bg-olive/10 text-olive' : 'bg-terracotta/10 text-terracotta'
                          }`}>
                            {q.is_correct ? 'Doğru' : q.user_answer ? 'Yanlış' : 'Boş'}
                          </span>
                          {!q.is_correct && (
                            <span className="ml-2 text-xs text-ink-light font-mono-ui">
                              Doğru: <span className="font-semibold text-olive">{q.correct_answer}</span>
                              {q.user_answer && <span> | Siz: <span className="font-semibold text-terracotta">{q.user_answer}</span></span>}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-5 h-5 text-ink-light" />
                      </div>
                    </button>

                    {/* Accordion Content */}
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="px-5 pb-5"
                      >
                        <div className="pt-2 border-t border-parchment">
                          <p className="text-ink font-semibold text-base mb-4 mt-4 leading-relaxed font-display">{q.question_text}</p>

                          {/* Options */}
                          <div className="space-y-2 mb-4">
                            {q.options.map((opt, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx)
                              const isCorrect = letter === q.correct_answer
                              const isUserWrong = letter === q.user_answer && !q.is_correct
                              return (
                                <div
                                  key={letter}
                                  className={`flex items-center gap-3 p-3 rounded-sm border-2 ${
                                    isCorrect ? 'border-olive bg-olive/5' :
                                    isUserWrong ? 'border-terracotta/40 bg-terracotta/5' :
                                    'border-parchment bg-paper-dark'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-sm flex items-center justify-center text-sm font-bold font-mono-ui ${
                                    isCorrect ? 'bg-olive text-paper' :
                                    isUserWrong ? 'bg-terracotta text-paper' :
                                    'bg-parchment text-ink-light'
                                  }`}>
                                    {letter}
                                  </div>
                                  <span className={`flex-1 text-sm font-body ${
                                    isCorrect ? 'text-olive font-medium' :
                                    isUserWrong ? 'text-terracotta' :
                                    'text-ink-light'
                                  }`}>
                                    {opt.replace(/^[A-D]\)\s*/, '')}
                                  </span>
                                  {isCorrect && <CheckCircle className="w-4 h-4 text-olive" />}
                                  {isUserWrong && <XCircle className="w-4 h-4 text-terracotta" />}
                                </div>
                              )
                            })}
                          </div>

                          {/* Explanation */}
                          {q.explanation && (
                            <div className={`p-3 rounded-sm mb-3 text-sm font-body ${
                              q.is_correct ? 'bg-olive/5 border border-olive/20 text-olive' : 'bg-terracotta/5 border border-terracotta/20 text-terracotta'
                            }`}>
                              <span className="font-semibold">Açıklama: </span>{q.explanation}
                            </div>
                          )}

                          {/* AI Explanation for wrong answers */}
                          {!q.is_correct && (
                            <AiExplanationPanel testId={testId} questionId={q.id} userAnswer={q.user_answer} />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )
              })
            )}
          </div>
        </div>
      </div>
    )
  }

  // TEST TAKING VIEW
  const currentQuestion = testData.questions[currentIndex]
  const answeredCount = Object.keys(answers).length

  return (
    <div className="min-h-screen w-full pt-16 bg-paper relative">
      <div className="absolute inset-0 paper-texture pointer-events-none -z-10" />
      <div className="relative container mx-auto py-10 px-4 max-w-5xl">
        <Button variant="ghost" onClick={() => router.push('/test')} className="gap-2 mb-6 text-ink-light hover:text-ink hover:bg-parchment font-mono-ui">
          <ArrowLeft className="w-4 h-4" /> Testlerime Dön
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
                <ClipboardList className="w-7 h-7 text-ink" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-paper mb-2 font-display">{testData.title}</h1>
            <p className="text-paper/60 font-body">{testData.total_questions} soru</p>
          </div>
        </motion.div>

        {/* Question Navigation */}
        <div className="bg-paper rounded-sm p-4 mb-6 paper-shadow border border-parchment">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-ink-light font-mono-ui">Soru Navigasyonu</span>
            <span className="text-sm text-ink font-semibold font-mono-ui">{answeredCount}/{testData.questions.length} cevaplandı</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {testData.questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-10 h-10 rounded-sm text-sm font-bold transition-all font-mono-ui ${
                  idx === currentIndex
                    ? 'bg-ink text-paper paper-shadow'
                    : answers[q.id]
                      ? 'bg-olive/10 text-olive border border-olive/20'
                      : 'bg-parchment text-ink-light hover:bg-paper-dark'
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
            className="flex items-center gap-2 rounded-sm border-parchment text-ink hover:bg-paper-dark font-mono-ui"
          >
            Önceki
          </Button>

          {currentIndex === testData.questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
              className="flex items-center gap-2 bg-ink text-paper hover:bg-ink/90 rounded-sm h-11 px-6 font-semibold paper-shadow font-mono-ui"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Testi Bitir ({answeredCount}/{testData.questions.length})
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="flex items-center gap-2 bg-terracotta text-paper hover:bg-terracotta/90 rounded-sm h-11 px-6 font-semibold paper-shadow font-mono-ui"
            >
              Sonraki <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
