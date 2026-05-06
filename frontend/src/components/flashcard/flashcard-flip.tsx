'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface FlashcardFlipProps {
  front: string
  back: string
  className?: string
}

export function FlashcardFlip({ front, back, className }: FlashcardFlipProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  return (
    <div 
      className={cn("relative w-full h-80 cursor-pointer [perspective:1000px]", className)}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={cn(
        "relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]",
        isFlipped && "[transform:rotateY(180deg)]"
      )}>
        {/* Front */}
        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
          <div className="w-full h-full flex items-center justify-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
            <p className="text-xl font-medium text-gray-800 text-center leading-relaxed">{front}</p>
          </div>
        </div>
        
        {/* Back */}
        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg border border-indigo-100">
            <p className="text-lg text-gray-700 text-center leading-relaxed">{back}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
