'use client'

import { Trophy, CheckCircle, XCircle, Share2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ResultQuestion {
    id: string
    question_text: string
    options: string[]
    correct_answer: string
    user_answer: string | null
    is_correct: boolean
    explanation: string
    order_num: number
}

interface TestResultProps {
    testId: string
    score: number
    total: number
    percentage: number
    questions: ResultQuestion[]
    isPublic?: boolean
}

export function TestResult({ testId, score, total, percentage, questions, isPublic = false }: TestResultProps) {
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

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 text-center">
                <div className="text-6xl mb-4">{getGradeEmoji(percentage)}</div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Test Tamamlandı!</h1>
                <p className="text-xl text-gray-500 mb-6">{getGradeText(percentage)}</p>

                <div className="inline-flex items-center gap-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-indigo-600">{score}</div>
                        <div className="text-sm text-gray-500">Doğru</div>
                    </div>
                    <div className="w-px h-12 bg-gray-300" />
                    <div className="text-center">
                        <div className="text-4xl font-bold text-gray-600">{total - score}</div>
                        <div className="text-sm text-gray-500">Yanlış</div>
                    </div>
                    <div className="w-px h-12 bg-gray-300" />
                    <div className="text-center">
                        <div className="text-4xl font-bold text-purple-600">{percentage}%</div>
                        <div className="text-sm text-gray-500">Başarı</div>
                    </div>
                </div>

                <div className="flex gap-3 justify-center">
                    <Link href={`/test/${testId}?retry=true`}>
                        <Button variant="outline" className="flex items-center gap-2">
                            <RotateCcw className="w-4 h-4" />
                            Testi Tekrar Çöz
                        </Button>
                    </Link>
                    {!isPublic && (
                        <Button variant="outline" className="flex items-center gap-2">
                            <Share2 className="w-4 h-4" />
                            Paylaş
                        </Button>
                    )}
                </div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-4">Soru Detayları</h2>
            <div className="space-y-4">
                {questions.map((q) => (
                    <div
                        key={q.id}
                        className={`rounded-xl p-5 ${
                            q.is_correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                q.is_correct ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                                {q.is_correct ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-600" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                        q.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                        Soru {q.order_num}
                                    </span>
                                    {!q.is_correct && q.correct_answer && (
                                        <span className="text-xs text-gray-500">
                                            Doğru Cevap: <span className="font-semibold text-green-600">{q.correct_answer}</span>
                                        </span>
                                    )}
                                </div>
                                <p className="font-medium text-gray-800 mb-3">{q.question_text}</p>
                                {q.explanation && (
                                    <div className={`text-sm p-3 rounded-lg ${
                                        q.is_correct ? 'bg-green-100/50 text-green-700' : 'bg-red-100/50 text-red-700'
                                    }`}>
                                        <span className="font-medium">Açıklama: </span>
                                        {q.explanation}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}