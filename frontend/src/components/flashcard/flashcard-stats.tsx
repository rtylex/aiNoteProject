'use client'

interface FlashcardStatsProps {
  progress: {
    new: number
    learning: number
    review: number
    mastered: number
  }
  completionPercentage: number
  cardCount: number
}

export function FlashcardStats({ progress, completionPercentage, cardCount }: FlashcardStatsProps) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (completionPercentage / 100) * circumference

  const statusConfig = [
    { key: 'new', label: 'Yeni', color: '#94a3b8', bg: 'bg-slate-400' },
    { key: 'learning', label: 'Öğreniliyor', color: '#f59e0b', bg: 'bg-amber-400' },
    { key: 'review', label: 'Tekrar', color: '#3b82f6', bg: 'bg-blue-400' },
    { key: 'mastered', label: 'Ezberlendi', color: '#22c55e', bg: 'bg-green-400' },
  ]

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 md:p-8">
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Circular Progress */}
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40" cy="40" r={radius}
              fill="none" stroke="#e2e8f0" strokeWidth="8"
            />
            <circle
              cx="40" cy="40" r={radius}
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#011133" />
                <stop offset="100%" stopColor="#23335c" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-[#011133]">{completionPercentage}%</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Tamamlandı</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-4 w-full">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">Toplam Kart</span>
            <span className="font-bold text-[#011133] text-lg">{cardCount}</span>
          </div>
          {statusConfig.map(({ key, label, color }) => {
            const count = progress[key as keyof typeof progress] || 0
            const pct = cardCount > 0 ? (count / cardCount) * 100 : 0
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-gray-600">{label}</span>
                  </div>
                  <span className="font-medium text-gray-800">{count}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
