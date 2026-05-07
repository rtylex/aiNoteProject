'use client'

interface TestStatsProps {
  stats: {
    total_tests: number
    completed_tests: number
    total_questions_answered: number
    total_correct: number
    total_wrong: number
    total_empty: number
    average_percentage: number
  }
}

export function TestStats({ stats }: TestStatsProps) {
  if (!stats) return null;

  const radius = 36
  const circumference = 2 * Math.PI * radius
  const average_percentage = stats.average_percentage || 0
  const offset = circumference - (average_percentage / 100) * circumference

  const totalAnswered = (stats.total_correct || 0) + (stats.total_wrong || 0) + (stats.total_empty || 0)
  const correctPct = totalAnswered > 0 ? ((stats.total_correct || 0) / totalAnswered) * 100 : 0
  const wrongPct = totalAnswered > 0 ? ((stats.total_wrong || 0) / totalAnswered) * 100 : 0
  const emptyPct = totalAnswered > 0 ? ((stats.total_empty || 0) / totalAnswered) * 100 : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Average Score Circle */}
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 flex flex-col items-center justify-center">
        <div className="relative w-28 h-28 mb-3">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle
              cx="40" cy="40" r={radius} fill="none"
              stroke="url(#testProgressGradient)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="testProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#011133" />
                <stop offset="100%" stopColor="#23335c" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[#011133]">{stats.average_percentage}%</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Ortalama</span>
          </div>
        </div>
        <span className="text-sm text-gray-500">Ortalama Başarı</span>
      </div>

      {/* Total Tests */}
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-[#011133] mb-1">{stats.total_tests}</div>
        <div className="text-sm text-gray-500">Toplam Test</div>
        <div className="mt-2 text-xs text-gray-400">{stats.completed_tests} tamamlanan</div>
      </div>

      {/* Total Questions */}
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-[#011133] mb-1">{stats.total_questions_answered}</div>
        <div className="text-sm text-gray-500">Çözülen Soru</div>
      </div>

      {/* Correct/Wrong/Empty Distribution */}
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-gray-600">Doğru</span>
            </div>
            <span className="font-medium text-gray-800">{stats.total_correct}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${correctPct}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-gray-600">Yanlış</span>
            </div>
            <span className="font-medium text-gray-800">{stats.total_wrong}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full transition-all duration-700" style={{ width: `${wrongPct}%` }} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span className="text-gray-600">Boş</span>
            </div>
            <span className="font-medium text-gray-800">{stats.total_empty}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-400 rounded-full transition-all duration-700" style={{ width: `${emptyPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
