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
    DialogTrigger,
} from '@/components/ui/dialog'
import { Minus, Plus, ClipboardList, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

interface CreateTestModalProps {
    documentId?: string
    sessionId?: string
    documentTitle?: string
    sessionTitle?: string
    suggestedQuestionCount?: number
}

export function CreateTestModal({ documentId, sessionId, documentTitle, sessionTitle, suggestedQuestionCount = 15 }: CreateTestModalProps) {
    const [open, setOpen] = useState(false)
    const [questionCount, setQuestionCount] = useState(suggestedQuestionCount)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { accessToken } = useAuth()
    const router = useRouter()

    const minCount = 5
    const maxCount = 30

    const title = documentTitle || sessionTitle || "Seçili Döküman"

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
        if (!accessToken) return

        setLoading(true)
        setError(null)

        try {
            let response: Response

            if (sessionId) {
                response = await fetch(`${API_BASE_URL}/api/v1/test/generate-from-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        question_count: questionCount
                    })
                })
            } else if (documentId) {
                response = await fetch(`${API_BASE_URL}/api/v1/test/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        document_id: documentId,
                        question_count: questionCount
                    })
                })
            } else {
                throw new Error("Neither documentId nor sessionId provided")
            }

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Test oluşturulamadı')
            }

            const result = await response.json()

            setOpen(false)
            router.push(`/test/${result.test_id}`)
            router.refresh()

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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                    <ClipboardList className="w-4 h-4" />
                    Test Oluştur
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] bg-white/95 backdrop-blur-xl border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-white" />
                        </div>
                        Test Oluştur
                    </DialogTitle>
                    <DialogDescription className="text-gray-500">
                        PDF içeriğinden yapay zeka destekli çoktan seçmeli test oluştur
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6">
                    <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-500 mb-1">Döküman</p>
                        <p className="font-semibold text-indigo-900 truncate">{title}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-700">Soru Sayısı</p>
                                <p className="text-sm text-gray-500">AI tarafından önerilen: {suggestedQuestionCount}</p>
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
                        disabled={loading}
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
    )
}