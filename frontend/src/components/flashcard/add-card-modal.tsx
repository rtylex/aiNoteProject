'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { Plus, Loader2 } from 'lucide-react'

interface AddCardModalProps {
  setId: string
  onAdded?: () => void
}

export function AddCardModal({ setId, onAdded }: AddCardModalProps) {
  const [open, setOpen] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [loading, setLoading] = useState(false)
  const { accessToken } = useAuth()

  const handleSubmit = async () => {
    if (!accessToken || !front.trim() || !back.trim()) return
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/flashcard/${setId}/cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ front, back })
      })

      if (res.ok) {
        setFront('')
        setBack('')
        setOpen(false)
        onAdded?.()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Kart Ekle
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Kart Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ön Yüz (Soru/Terim)</Label>
              <Textarea value={front} onChange={(e) => setFront(e.target.value)} placeholder="Soruyu veya terimi yazın..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Arka Yüz (Cevap/Tanım)</Label>
              <Textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Cevabı veya tanımı yazın..." rows={4} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
              <Button onClick={handleSubmit} disabled={loading || !front.trim() || !back.trim()} className="bg-gradient-to-r from-indigo-600 to-purple-600">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ekle'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
