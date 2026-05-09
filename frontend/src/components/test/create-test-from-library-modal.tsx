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
import { Minus, Plus, ClipboardList, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

interface CreateTestFromLibraryModalProps {
    documentIds: string[]
    documentTitles: string[]
    onSuccess?: (testId: string) => void
}

export function CreateTestFromLibraryModal({ documentIds, documentTitles, onSuccess }: CreateTestFromLibraryModalProps) {
    const [open, setOpen] = useState(false)
    const [questionCount, setQuestionCount] = useState(15)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [warning, setWarning] = useState<string | null>(null)
    const { accessToken, preferredModel } = useAuth()
    const router = useRouter()

    const minCount = 5
    const maxCount = 30
    const isSingleDocument = documentIds.length === 1

    const handleDecrement = () => {
        if (questionCount > minCount) {
            setQuestionCount(questionCount - 1)
        }
    }

    const handleIncrement = () => {
        if (questionCount < maxCount) {
            setQuestionCount(questionCount + 1)
        }
    }

    const handleCreateTest = async () => {
        if (!accessToken || documentIds.length < 1) return

        setLoading(true)
        setError(null)
        setWarning(null)

        try {
            const response = await fetch(
                isSingleDocument
                    ? `${API_BASE_URL}/api/v1/test/generate`
                    : `${API_BASE_URL}/api/v1/test/generate-from-library`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify(
                        isSingleDocument
                            ? { document_id: documentIds[0], question_count: questionCount, model: preferredModel }
                            : { document_ids: documentIds, question_count: questionCount, model: preferredModel }
                    )
                }
            )

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Test oluşturulamadı')
            }

            const result = await response.json()

            if (result.warning) {
                setWarning(result.warning)
            }

            setOpen(false)

            if (onSuccess) {
                onSuccess(result.test_id)
            } else {
                router.push(`/test/${result.test_id}`)
                router.refresh()
            }

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError('Test oluşturulurken bir hata oluştu')
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
                className="flex items-center gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 w-full"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpen(true)
                }}
            >
                <ClipboardList className="w-4 h-4" />
                Test Oluştur
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-xl border-none shadow-2xl z-50">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                                <ClipboardList className="w-5 h-5 text-white" />
                            </div>
                            {isSingleDocument ? 'Dökümandan Test Oluştur' : 'Kütüphaneden Test Oluştur'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            {isSingleDocument
                                ? 'Seçili dökümandan yapay zeka destekli çoktan seçmeli test oluştur'
                                : 'Seçili dökümanlardan yapay zeka destekli çoktan seçmeli test oluştur'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6">
                        <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                            <p className="text-sm text-gray-500 mb-2">
                                {isSingleDocument ? 'Seçili Döküman' : `Seçili Dökümanlar (${documentIds.length})`}
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {documentTitles.slice(0, isSingleDocument ? 1 : 5).map((title, index) => (
                                    <p key={index} className="text-sm font-medium text-indigo-900 truncate">
                                        {isSingleDocument ? title : `${index + 1}. ${title}`}
                                    </p>
                                ))}
                                {!isSingleDocument && documentTitles.length > 5 && (
                                    <p className="text-sm text-indigo-600">...ve {documentTitles.length - 5} döküman daha</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-700">Soru Sayısı</p>
                                    <p className="text-sm text-gray-500">Önerilen: 15</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleDecrement}
                                        disabled={questionCount <= minCount}
                                        className="w-10 h-10 rounded-full"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </Button>
                                    <span className="text-2xl font-bold text-indigo-600 w-12 text-center">
                                        {questionCount}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleIncrement}
                                        disabled={questionCount >= maxCount}
                                        className="w-10 h-10 rounded-full"
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
                        >
                            İptal
                        </Button>
                        <Button
                            onClick={handleCreateTest}
                            disabled={loading || documentIds.length < 1}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Oluşturuluyor...
                                </>
                            ) : (
                                <>
                                    <ClipboardList className="mr-2 h-4 w-4" />
                                    Testi Oluştur
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}