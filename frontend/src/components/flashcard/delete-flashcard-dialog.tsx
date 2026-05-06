'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2, Loader2 } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

interface DeleteFlashcardDialogProps {
  setId?: string
  cardId?: string
  title: string
  onDelete?: () => void
}

export function DeleteFlashcardDialog({ setId, cardId, title, onDelete }: DeleteFlashcardDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { accessToken } = useAuth()

  const handleDelete = async () => {
    if (!accessToken) return
    setLoading(true)

    const url = setId 
      ? `${API_BASE_URL}/api/v1/flashcard/${setId}`
      : `${API_BASE_URL}/api/v1/flashcard/card/${cardId}`

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })

      if (res.ok) {
        setOpen(false)
        onDelete?.()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500" onClick={() => setOpen(true)}>
        <Trash2 className="w-4 h-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Trash2 className="w-8 h-8 text-white" />
            </div>
            <AlertDialogTitle className="text-xl text-gray-800">
              {setId ? 'Seti Sil' : 'Kartı Sil'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 mt-3">
              Bu işlem <span className="font-semibold text-indigo-600">geri alınamaz</span>.
              <span className="font-medium text-gray-800"> &quot;{title}&quot; </span>
              {setId ? 'seti ve tüm kartları kalıcı olarak silinecektir.' : 'kalıcı olarak silinecektir.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-0">İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
