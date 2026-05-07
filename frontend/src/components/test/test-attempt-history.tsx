'use client'

import { Clock, TrendingUp, RotateCcw } from 'lucide-react'

interface Attempt {
  id: string
  score: number
  total_questions: number
  percentage: number
  created_at: string
}

interface TestAttemptHistoryProps {
  attempts: Attempt[]
}

export function TestAttemptHistory({ attempts }: TestAttemptHistoryProps) {
  if (attempts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Henüz çözüm geçmişi yok
      </div>
    )
  }

  const bestAttempt = attempts.reduce((best, a) => a.percentage > best.percentage ? a : best, attempts[0])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RotateCcw className="w-4 h-4" />
          <span>{attempts.length} deneme</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
          <TrendingUp className="w-4 h-4" />
          <span>En yüksek: %{bestAttempt.percentage}</span>
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {attempts.map((attempt, idx) => (
          <div
            key={attempt.id}
            className="flex items-center justify-between p-3 bg-[#011133]/5 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-400 w-6">#{attempts.length - idx}</span>
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Clock className="w-3.5 h-3.5" />
                {attempt.created_at && new Date(attempt.created_at).toLocaleDateString('tr-TR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{attempt.score}/{attempt.total_questions}</span>
              <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                attempt.percentage >= 80 ? 'bg-green-100 text-green-700' :
                attempt.percentage >= 60 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                %{attempt.percentage}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
