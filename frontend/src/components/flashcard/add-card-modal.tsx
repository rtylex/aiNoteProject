'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { Plus, Loader2, BookOpen } from 'lucide-react'

interface AddCardModalProps {
  setId: string
  onAdded?: () => void
}

export function AddCardModal({ setId, onAdded }: AddCardModalProps) {
  const [open, setOpen] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [extraNotes, setExtraNotes] = useState('')
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
        body: JSON.stringify({ front, back, extra_notes: extraNotes || null })
      })

      if (res.ok) {
        setFront('')
        setBack('')
        setExtraNotes('')
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
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="flex items-center gap-2 rounded-sm border-ink/20 text-ink hover:bg-parchment hover:border-ink/30 font-mono-ui"
      >
        <Plus className="w-4 h-4" />
        Kart Ekle
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto bg-paper !top-[5vh] !translate-y-0">
          <DialogHeader>
            <div className="w-12 h-12 rounded-sm bg-terracotta/10 flex items-center justify-center mb-4 mx-auto">
              <BookOpen className="w-6 h-6 text-terracotta" />
            </div>
            <DialogTitle className="text-center text-xl text-ink font-display">Yeni Kart Ekle</DialogTitle>
            <DialogDescription className="text-center text-ink-light font-body">
              Sete manuel olarak yeni kart ekleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-ink font-semibold text-sm font-mono-ui">Ön Yüz (Soru/Terim)</Label>
              <Textarea
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="Soruyu veya terimi yazın..."
                rows={3}
                className="rounded-sm border-parchment bg-paper-dark focus-visible:border-terracotta focus-visible:ring-terracotta/20 font-body"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-ink font-semibold text-sm font-mono-ui">Arka Yüz (Cevap/Tanım)</Label>
              <Textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="Cevabı veya tanımı yazın..."
                rows={3}
                className="rounded-sm border-parchment bg-paper-dark focus-visible:border-terracotta focus-visible:ring-terracotta/20 font-body"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-ink font-semibold text-sm font-mono-ui">Ekstra Notlar (İpucu/Formül)</Label>
              <Textarea
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder="Ek ipucu, formül veya açıklama..."
                rows={2}
                className="rounded-sm border-parchment bg-paper-dark focus-visible:border-terracotta focus-visible:ring-terracotta/20 font-body"
              />
              <p className="text-xs text-ink-light/60 font-mono-ui">Opsiyonel — kartı çevirince gösterilir</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                className="rounded-sm text-ink-light hover:text-ink hover:bg-parchment font-mono-ui"
              >
                İptal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !front.trim() || !back.trim()}
                className="bg-ink text-paper hover:bg-ink/90 rounded-sm px-6 h-11 font-semibold paper-shadow font-mono-ui tracking-wide"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ekle'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
