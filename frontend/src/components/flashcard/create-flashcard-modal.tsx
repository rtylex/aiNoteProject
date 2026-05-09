'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Loader2, BookOpen, Sparkles, Minus, Plus } from 'lucide-react'

interface CreateFlashcardModalProps {
  documentId?: string
  documentTitle?: string
  sessionId?: string
  sessionTitle?: string
}

export function CreateFlashcardModal({ documentId, documentTitle, sessionId, sessionTitle }: CreateFlashcardModalProps) {
  const [open, setOpen] = useState(false)
  const [cardCount, setCardCount] = useState(20)
  const [loading, setLoading] = useState(false)
  const { accessToken, preferredModel } = useAuth()
  const router = useRouter()

  const handleCreate = async () => {
    if (!accessToken) return
    setLoading(true)

    const isDocument = !!documentId
    const url = `${API_BASE_URL}/api/v1/flashcard/${isDocument ? 'generate' : 'generate-from-session'}`
    const body = isDocument 
      ? { document_id: documentId, card_count: cardCount, model: preferredModel }
      : { session_id: sessionId, card_count: cardCount, model: preferredModel }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/flashcard/${data.set_id}`)
      } else {
        let msg = 'Bir hata oluştu'
        try {
          const contentType = res.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const err = await res.json()
            msg = err.detail || JSON.stringify(err)
          } else {
            const text = await res.text()
            msg = text ? `Sunucu hatası (${res.status}): ${text.substring(0, 200)}` : `Sunucu hatası (${res.status})`
          }
        } catch { msg = `Sunucu hatası (${res.status})` }
        alert(msg)
      }
    } catch (e) {
      console.error(e)
      alert('Bir hata oluştu')
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  const title = documentTitle || sessionTitle || 'Flashcard Seti'

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="flex items-center gap-2 rounded-xl border-[#011133]/20 hover:border-[#011133] hover:bg-[#011133]/5 text-[#011133]">
        <BookOpen className="w-4 h-4" />
        Flashcard Oluştur
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-gradient-to-b from-white to-[#e7ecf8] border-0 rounded-3xl shadow-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#011133] to-[#23335c] flex items-center justify-center mb-4 mx-auto">
              <Sparkles className="w-6 h-6 text-[#f4f1e0]" />
            </div>
            <DialogTitle className="text-center text-xl text-[#011133]">Flashcard Oluştur</DialogTitle>
            <DialogDescription className="text-center text-gray-500">
              AI ile <span className="font-semibold text-[#23335c]">{title}</span> için otomatik flashcard seti oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-[#011133] font-semibold">Kart Sayısı</Label>
              <div className="flex items-center gap-4 justify-center">
                <Button variant="outline" size="icon" onClick={() => setCardCount(Math.max(5, cardCount - 1))} className="rounded-xl h-10 w-10 border-[#011133]/20 hover:border-[#011133]">
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="w-20 h-14 bg-gradient-to-b from-[#011133] to-[#23335c] rounded-xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-[#f4f1e0]">{cardCount}</span>
                </div>
                <Button variant="outline" size="icon" onClick={() => setCardCount(Math.min(50, cardCount + 1))} className="rounded-xl h-10 w-10 border-[#011133]/20 hover:border-[#011133]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 text-center">Min: 5, Max: 50</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl text-gray-500 hover:text-[#011133]">İptal</Button>
              <Button onClick={handleCreate} disabled={loading} className="bg-gradient-to-r from-[#011133] to-[#23335c] hover:from-[#0b1f4d] hover:to-[#2d3e6b] text-[#f4f1e0] rounded-xl px-6 h-11 font-semibold shadow-lg">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Seti Oluştur'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
