'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Minus, Plus, BookOpen, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

interface CreateFlashcardFromLibraryModalProps {
    documentIds: string[]
    documentTitles: string[]
    onSuccess?: (setId: string) => void
}

export function CreateFlashcardFromLibraryModal({ documentIds, documentTitles, onSuccess }: CreateFlashcardFromLibraryModalProps) {
    const [open, setOpen] = useState(false)
    const [cardCount, setCardCount] = useState(20)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [warning, setWarning] = useState<string | null>(null)
    const { accessToken } = useAuth()
    const router = useRouter()

    const minCount = 5
    const maxCount = 50
    const isSingleDocument = documentIds.length === 1

    const handleDecrement = () => {
        if (cardCount > minCount) {
            setCardCount(cardCount - 1)
        }
    }

    const handleIncrement = () => {
        if (cardCount < maxCount) {
            setCardCount(cardCount + 1)
        }
    }

    const handleCreateFlashcards = async () => {
        if (!accessToken || documentIds.length < 1) return

        setLoading(true)
        setError(null)
        setWarning(null)

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/v1/flashcard/generate-from-library`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        document_ids: documentIds,
                        card_count: cardCount
                    })
                }
            )

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Flashcard oluşturulamadı')
            }

            const result = await response.json()

            if (result.warning) {
                setWarning(result.warning)
            }

            setOpen(false)

            if (onSuccess) {
                onSuccess(result.set_id)
            } else {
                router.push(`/flashcard/${result.set_id}`)
                router.refresh()
            }

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError('Flashcard oluşturulurken bir hata oluştu')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-[#011133] border-[#011133]/20 hover:bg-[#011133]/5 w-full"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpen(true)
                }}
            >
                <BookOpen className="w-4 h-4" />
                Flashcard Oluştur
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[500px] bg-gradient-to-b from-white to-[#e7ecf8] border-0 rounded-3xl shadow-2xl z-50">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-[#011133]">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#011133] to-[#23335c] rounded-lg flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-[#f4f1e0]" />
                            </div>
                            {isSingleDocument ? 'Dökümandan Flashcard Oluştur' : 'Kütüphaneden Flashcard Oluştur'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            {isSingleDocument
                                ? 'Seçili dökümandan yapay zeka destekli çalışma kartı oluştur'
                                : 'Seçili dökümanlardan yapay zeka destekli çalışma kartı oluştur'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6">
                        <div className="bg-[#011133]/5 rounded-lg p-4 mb-6">
                            <p className="text-sm text-gray-500 mb-2">
                                {isSingleDocument ? 'Seçili Döküman' : `Seçili Dökümanlar (${documentIds.length})`}
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {documentTitles.slice(0, isSingleDocument ? 1 : 5).map((title, index) => (
                                    <p key={index} className="text-sm font-medium text-[#011133] truncate">
                                        {isSingleDocument ? title : `${index + 1}. ${title}`}
                                    </p>
                                ))}
                                {!isSingleDocument && documentTitles.length > 5 && (
                                    <p className="text-sm text-[#23335c]">...ve {documentTitles.length - 5} döküman daha</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-[#011133]">Kart Sayısı</p>
                                    <p className="text-sm text-gray-500">Önerilen: 20</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleDecrement}
                                        disabled={cardCount <= minCount}
                                        className="w-10 h-10 rounded-full border-[#011133]/20 hover:border-[#011133]"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </Button>
                                    <span className="text-2xl font-bold text-[#011133] w-12 text-center">
                                        {cardCount}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleIncrement}
                                        disabled={cardCount >= maxCount}
                                        className="w-10 h-10 rounded-full border-[#011133]/20 hover:border-[#011133]"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 text-center">
                                Min: {minCount}, Max: {maxCount}
                            </p>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {warning && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-700">{warning}</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                            className="rounded-xl"
                        >
                            İptal
                        </Button>
                        <Button
                            onClick={handleCreateFlashcards}
                            disabled={loading || documentIds.length < 1}
                            className="bg-gradient-to-r from-[#011133] to-[#23335c] hover:from-[#0b1f4d] hover:to-[#2d3e6b] text-[#f4f1e0] rounded-xl"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Oluşturuluyor...
                                </>
                            ) : (
                                <>
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    Seti Oluştur
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
