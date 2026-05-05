'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { QuestionCard } from '@/components/test/question-card'
import { TestResult } from '@/components/test/test-result'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

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

export default function TestPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const retryMode = searchParams.get('retry') === 'true'

    const testId = params.id as string
    const { accessToken } = useAuth()

    const [testData, setTestData] = useState<TestData | null>(null)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    const fetchTest = useCallback(async () => {
        if (!accessToken || !testId) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/test/${testId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Test yüklenemedi')
            }

            const data = await response.json()
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

            if (retryMode && data.completed) {
                setAnswers({})
                setCurrentIndex(0)
                setSubmitResult(null)
            }

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError('Test yüklenirken bir hata oluştu')
            }
        } finally {
            setLoading(false)
        }
    }, [accessToken, testId, retryMode])

    useEffect(() => {
        fetchTest()
    }, [fetchTest])

    const handleAnswerSelect = (questionId: string, answer: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }))
    }

    const handleNext = () => {
        if (testData && currentIndex < testData.questions.length - 1) {
            setCurrentIndex(currentIndex + 1)
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1)
        }
    }

    const handleSubmit = async () => {
        if (!accessToken || !testId) return

        const answerList = Object.entries(answers).map(([question_id, answer]) => ({
            question_id,
            answer
        }))

        if (answerList.length === 0) {
            alert('En az bir soru cevaplamalısınız')
            return
        }

        setSubmitting(true)

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/test/${testId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ answers: answerList })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Test gönderilemedi')
            }

            const result = await response.json()
            setSubmitResult(result)

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError('Test gönderilirken bir hata oluştu')
            }
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-500">Test yükleniyor...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button onClick={() => router.push('/dashboard')}>
                        Dashboard&apos;a Dön
                    </Button>
                </div>
            </div>
        )
    }

    if (submitResult) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4">
                <div className="container mx-auto">
                    <TestResult
                        testId={submitResult.test_id}
                        score={submitResult.score}
                        total={submitResult.total}
                        percentage={submitResult.percentage}
                        questions={submitResult.questions}
                    />
                </div>
            </div>
        )
    }

    if (!testData || testData.questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">Test bulunamadı veya soru yok</p>
                    <Button onClick={() => router.push('/dashboard')}>
                        Dashboard&apos;a Dön
                    </Button>
                </div>
            </div>
        )
    }

    const currentQuestion = testData.questions[currentIndex]
    const answeredCount = Object.keys(answers).length
    const allAnswered = answeredCount === testData.questions.length

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4">
            <div className="container mx-auto">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-gray-800">{testData.title}</h1>
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
                        className="flex items-center gap-2"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Önceki
                    </Button>

                    {currentIndex === testData.questions.length - 1 ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || answeredCount === 0}
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Gönderiliyor...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Testi Bitir ({answeredCount}/{testData.questions.length})
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNext}
                            className="flex items-center gap-2"
                        >
                            Sonraki
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                <div className="text-center mt-6">
                    <p className="text-sm text-gray-500">
                        {answeredCount} / {testData.questions.length} soru cevaplandı
                    </p>
                </div>
            </div>
        </div>
    )
}