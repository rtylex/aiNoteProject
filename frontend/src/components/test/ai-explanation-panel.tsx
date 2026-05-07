'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Brain, ChevronDown, ChevronUp } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AiExplanationPanelProps {
  testId: string
  questionId: string
  userAnswer: string | null
}

export function AiExplanationPanel({ testId, questionId, userAnswer }: AiExplanationPanelProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { accessToken } = useAuth()

  const handleExplain = async () => {
    if (!accessToken || explanation) {
      setOpen(!open)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/test/${testId}/explain`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question_id: questionId, user_answer: userAnswer })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Açıklama alınamadı')
      }

      const data = await res.json()
      setExplanation(data.explanation)
      setOpen(true)
    } catch (e) {
      if (e instanceof Error) setError(e.message)
      else setError('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExplain}
        disabled={loading}
        className="flex items-center gap-2 text-[#011133] border-[#011133]/20 hover:bg-[#011133]/5 rounded-xl"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Brain className="w-4 h-4" />
        )}
        {loading ? 'AI Düşünüyor...' : explanation ? (open ? 'Açıklamayı Gizle' : 'AI Açıklamasını Göster') : '🤖 AI\'dan Açıklama Al'}
        {explanation && (open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
      </Button>

      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {open && explanation && (
        <div className="mt-3 p-5 bg-gradient-to-br from-[#011133]/5 to-[#23335c]/5 border border-[#011133]/10 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#011133] to-[#23335c] flex items-center justify-center">
              <Brain className="w-4 h-4 text-[#f4f1e0]" />
            </div>
            <span className="text-sm font-semibold text-[#011133]">AI Detaylı Açıklama</span>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {explanation}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
