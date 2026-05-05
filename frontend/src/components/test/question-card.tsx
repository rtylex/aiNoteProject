'use client'

import { CheckCircle, Circle, XCircle } from 'lucide-react'

interface QuestionCardProps {
    questionNumber: number
    totalQuestions: number
    questionText: string
    options: string[]
    selectedAnswer: string | null
    onAnswerSelect: (answer: string) => void
    showResult?: boolean
    correctAnswer?: string
    isCorrect?: boolean
    explanation?: string
}

export function QuestionCard({
    questionNumber,
    totalQuestions,
    questionText,
    options,
    selectedAnswer,
    onAnswerSelect,
    showResult = false,
    correctAnswer,
    isCorrect,
    explanation
}: QuestionCardProps) {
    const getOptionClass = (option: string, index: number) => {
        const letter = String.fromCharCode(65 + index)

        if (showResult && correctAnswer) {
            if (letter === correctAnswer) {
                return 'border-green-500 bg-green-50 text-green-700'
            }
            if (letter === selectedAnswer && letter !== correctAnswer) {
                return 'border-red-500 bg-red-50 text-red-700'
            }
        }

        if (selectedAnswer === letter) {
            return 'border-indigo-500 bg-indigo-50 text-indigo-700'
        }

        return 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
    }

    const getOptionIcon = (option: string, index: number) => {
        const letter = String.fromCharCode(65 + index)

        if (showResult && correctAnswer) {
            if (letter === correctAnswer) {
                return <CheckCircle className="w-5 h-5 text-green-500" />
            }
            if (letter === selectedAnswer && letter !== correctAnswer) {
                return <XCircle className="w-5 h-5 text-red-500" />
            }
        }

        if (selectedAnswer === letter) {
            return <CheckCircle className="w-5 h-5 text-indigo-500" />
        }

        return <Circle className="w-5 h-5 text-gray-400" />
    }

    const progressPercent = (questionNumber / totalQuestions) * 100

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">
                        Soru {questionNumber} / {totalQuestions}
                    </span>
                    <span className="text-sm font-medium text-indigo-600">
                        {Math.round(progressPercent)}%
                    </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6 leading-relaxed">
                    {questionText}
                </h2>

                <div className="space-y-3">
                    {options.map((option, index) => {
                        const letter = String.fromCharCode(65 + index)
                        return (
                            <button
                                key={letter}
                                onClick={() => !showResult && onAnswerSelect(letter)}
                                disabled={showResult}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${getOptionClass(option, index)}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                                    showResult && correctAnswer
                                        ? letter === correctAnswer
                                            ? 'bg-green-500 text-white'
                                            : letter === selectedAnswer
                                                ? 'bg-red-500 text-white'
                                                : 'bg-gray-100 text-gray-600'
                                        : selectedAnswer === letter
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {letter}
                                </div>
                                <span className="flex-1 font-medium">{option.replace(/^[A-D]\)\s*/, '')}</span>
                                {getOptionIcon(option, index)}
                            </button>
                        )
                    })}
                </div>
            </div>

            {showResult && explanation && (
                <div className={`rounded-xl p-4 ${
                    isCorrect ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
                }`}>
                    <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCorrect ? 'bg-green-100' : 'bg-amber-100'
                        }`}>
                            {isCorrect ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <span className="text-sm font-bold text-amber-600">!</span>
                            )}
                        </div>
                        <div>
                            <p className={`font-semibold mb-1 ${
                                isCorrect ? 'text-green-700' : 'text-amber-700'
                            }`}>
                                {isCorrect ? 'Doğru Cevap!' : 'Açıklama'}
                            </p>
                            <p className={`text-sm ${
                                isCorrect ? 'text-green-600' : 'text-amber-600'
                            }`}>
                                {explanation}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}