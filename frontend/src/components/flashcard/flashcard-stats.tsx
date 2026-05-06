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
  const statusColors: Record<string, string> = {
    new: 'bg-gray-400',
    learning: 'bg-yellow-400',
    review: 'bg-blue-400',
    mastered: 'bg-green-400'
  }

  const statusLabels: Record<string, string> = {
    new: 'Yeni',
    learning: 'Öğreniliyor',
    review: 'Tekrar',
    mastered: 'Ezberlendi'
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium text-gray-700">{cardCount} kart</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">{progress.new || 0} yeni</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">{progress.learning || 0} öğreniliyor</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">{progress.mastered || 0} ezberlendi</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-indigo-600">%{completionPercentage}</span>
          <span className="text-xs text-gray-400 ml-1">tamamlandı</span>
        </div>
      </div>
      
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-green-500 transition-all"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      <div className="flex gap-3 flex-wrap">
        {Object.entries(progress).map(([status, count]) => (
          count > 0 && (
            <div key={status} className="flex items-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
              <span className="text-gray-500">{statusLabels[status]}: {count}</span>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
