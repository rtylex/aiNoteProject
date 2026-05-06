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
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="flex items-center gap-2 rounded-xl border-[#011133]/20 hover:border-[#011133] hover:bg-[#011133]/5 text-[#011133]">
        <Plus className="w-4 h-4" />
        Kart Ekle
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-gradient-to-b from-white to-[#e7ecf8] border-0 rounded-3xl shadow-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#011133] to-[#23335c] flex items-center justify-center mb-4 mx-auto">
              <BookOpen className="w-6 h-6 text-[#f4f1e0]" />
            </div>
            <DialogTitle className="text-center text-xl text-[#011133]">Yeni Kart Ekle</DialogTitle>
            <DialogDescription className="text-center text-gray-500">
              Sete manuel olarak yeni kart ekleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#011133] font-semibold text-sm">Ön Yüz (Soru/Terim)</Label>
              <Textarea value={front} onChange={(e) => setFront(e.target.value)} placeholder="Soruyu veya terimi yazın..." rows={3} className="rounded-xl border-gray-200 focus:border-[#011133] focus:ring-[#011133]/20" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#011133] font-semibold text-sm">Arka Yüz (Cevap/Tanım)</Label>
              <Textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Cevabı veya tanımı yazın..." rows={3} className="rounded-xl border-gray-200 focus:border-[#011133] focus:ring-[#011133]/20" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#011133] font-semibold text-sm">Ekstra Notlar (İpucu/Formül)</Label>
              <Textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} placeholder="Ek ipucu, formül veya açıklama..." rows={2} className="rounded-xl border-gray-200 focus:border-[#011133] focus:ring-[#011133]/20 bg-[#f8fafc]" />
              <p className="text-xs text-gray-400">Opsiyonel — kartı çevirince gösterilir</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl text-gray-500 hover:text-[#011133]">İptal</Button>
              <Button onClick={handleSubmit} disabled={loading || !front.trim() || !back.trim()} className="bg-gradient-to-r from-[#011133] to-[#23335c] hover:from-[#0b1f4d] hover:to-[#2d3e6b] text-[#f4f1e0] rounded-xl px-6 h-11 font-semibold shadow-lg">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ekle'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
