'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FlashcardFlipProps {
  front: string
  back: string
  extra_notes?: string | null
  cardNumber?: number
  totalCards?: number
  className?: string
}

export function FlashcardFlip({ front, back, extra_notes, cardNumber, totalCards, className }: FlashcardFlipProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  return (
    <div
      className={cn("relative w-full cursor-pointer [perspective:1200px]", className)}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      {/* Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#23335c] via-[#3d4f7f] to-[#23335c] rounded-[1.5rem] blur opacity-20 transition-opacity duration-500 group-hover:opacity-40" />
      
      <div className={cn(
        "relative w-full transition-transform duration-700 [transform-style:preserve-3d]",
        isFlipped && "[transform:rotateY(180deg)]"
      )}>
        {/* Front */}
        <div className="relative [backface-visibility:hidden]">
          <div className="w-full min-h-[280px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#e7ecf8] to-[#dce2f1] rounded-[1.5rem] shadow-xl border border-white/60">
            {(cardNumber && totalCards) && (
              <span className="absolute top-4 left-4 bg-[#011133] text-[#f4f1e0] px-3 py-1 rounded-full text-xs font-bold">
                KART #{cardNumber} / {totalCards}
              </span>
            )}
            <p className="text-xl md:text-2xl font-bold text-[#011133] text-center leading-relaxed">{front}</p>
            <p className="absolute bottom-4 text-xs text-[#23335c]/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#23335c]/30 animate-pulse" />
              Çevirmek için tıklayın
            </p>
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="w-full min-h-[280px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#011133] via-[#1d2f5e] to-[#23335c] rounded-[1.5rem] shadow-xl border border-[#f4f1e0]/10">
            <span className="absolute top-4 right-4 bg-[#f4f1e0]/10 text-[#f4f1e0]/60 px-3 py-1 rounded-full text-xs font-bold border border-[#f4f1e0]/20">
              CEVAP
            </span>
            <p className="text-lg md:text-xl font-medium text-[#f4f1e0] text-center leading-relaxed mb-4">{back}</p>
            {extra_notes && (
              <div className="w-full max-w-sm mt-2 pt-4 border-t border-[#f4f1e0]/15">
                <p className="text-xs text-[#f4f1e0]/50 font-semibold uppercase tracking-wider mb-1">Ekstra Notlar</p>
                <p className="text-sm text-[#f4f1e0]/70 leading-relaxed">{extra_notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
