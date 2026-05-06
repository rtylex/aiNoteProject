'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Loader2, BookOpen } from 'lucide-react'

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
  const { accessToken } = useAuth()
  const router = useRouter()

  const handleCreate = async () => {
    if (!accessToken) return
    setLoading(true)

    const isDocument = !!documentId
    const url = `${API_BASE_URL}/api/v1/flashcard/${isDocument ? 'generate' : 'generate-from-session'}`
    const body = isDocument 
      ? { document_id: documentId, card_count: cardCount }
      : { session_id: sessionId, card_count: cardCount }

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
        const err = await res.json()
        alert(err.detail || 'Bir hata oluştu')
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
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
        <BookOpen className="w-4 h-4" />
        Flashcard Oluştur
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Flashcard Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{title}</span> için flashcard seti oluştur.
            </div>
            <div className="space-y-2">
              <Label>Kart Sayısı</Label>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setCardCount(Math.max(5, cardCount - 1))}>-</Button>
                <Input 
                  type="number" 
                  value={cardCount} 
                  onChange={(e) => setCardCount(Math.min(50, Math.max(5, parseInt(e.target.value) || 5)))}
                  className="text-center"
                />
                <Button variant="outline" size="icon" onClick={() => setCardCount(Math.min(50, cardCount + 1))}>+</Button>
              </div>
              <p className="text-xs text-gray-400">Min: 5, Max: 50</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
              <Button onClick={handleCreate} disabled={loading} className="bg-gradient-to-r from-indigo-600 to-purple-600">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Seti Oluştur'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
