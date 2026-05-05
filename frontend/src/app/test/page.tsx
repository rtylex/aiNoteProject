'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList, FileText, Clock, CheckCircle, XCircle, Loader2, ChevronRight } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

interface TestItem {
    id: string
    title: string
    document_id: string | null
    total_questions: number
    score: number | null
    completed: boolean
    is_public: boolean
    created_at: string
    completed_at: string | null
}

export default function TestsPage() {
    const { accessToken } = useAuth()
    const [tests, setTests] = useState<TestItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchTests = useCallback(async () => {
        if (!accessToken) return

        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`${API_BASE_URL}/api/v1/test/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })

            if (!response.ok) {
                throw new Error('Testler yüklenemedi')
            }

            const data = await response.json()
            setTests(data)
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message)
            } else {
                setError('Testler yüklenirken bir hata oluştu')
            }
        } finally {
            setLoading(false)
        }
    }, [accessToken])

    useEffect(() => {
        fetchTests()
    }, [fetchTests])

    const completedTests = tests.filter(t => t.completed)
    const inProgressTests = tests.filter(t => !t.completed)

    return (
        <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-white">
            <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

            <div className="container mx-auto py-10 px-4">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Testlerim
                        </h1>
                        <p className="text-gray-500 mt-2">Oluşturduğunuz testleri görüntüleyin ve çözün</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-500 mb-4">{error}</p>
                        <Button onClick={fetchTests}>Tekrar Dene</Button>
                    </div>
                ) : tests.length === 0 ? (
                    <Card className="border-dashed border-2 bg-white/50">
                        <CardHeader className="text-center py-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ClipboardList className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle className="text-xl text-gray-600">Henüz test yok</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center pb-10">
                            <p className="text-gray-500 mb-4">PDF dokümanlarınızdan test oluşturmak için dashboard&apos;a gidin.</p>
                            <Link href="/dashboard">
                                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                                    Dashboard&apos;a Git
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {inProgressTests.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-amber-500" />
                                    Devam Eden Testler
                                </h2>
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {inProgressTests.map((test) => (
                                        <Card key={test.id} className="hover:shadow-xl transition-all bg-white/80 backdrop-blur-sm hover:-translate-y-1">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center mb-3">
                                                        <ClipboardList className="w-6 h-6 text-white" />
                                                    </div>
                                                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                                                        Devam Ediyor
                                                    </span>
                                                </div>
                                                <CardTitle className="text-lg font-semibold text-gray-800 truncate">
                                                    {test.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                                    <div className="flex items-center gap-1">
                                                        <FileText className="w-4 h-4" />
                                                        <span>{test.total_questions} soru</span>
                                                    </div>
                                                </div>
                                                <Link href={`/test/${test.id}`}>
                                                    <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                                                        Teste Devam Et
                                                    </Button>
                                                </Link>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {completedTests.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    Tamamlanan Testler ({completedTests.length})
                                </h2>
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {completedTests.map((test) => {
                                        const percentage = test.total_questions > 0
                                            ? Math.round((test.score || 0) / test.total_questions * 100)
                                            : 0
                                        const isPassing = percentage >= 60

                                        return (
                                            <Card key={test.id} className="hover:shadow-xl transition-all bg-white/80 backdrop-blur-sm hover:-translate-y-1">
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-start justify-between">
                                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${
                                                            isPassing ? 'bg-gradient-to-br from-green-400 to-emerald-500' : 'bg-gradient-to-br from-red-400 to-rose-500'
                                                        }`}>
                                                            {isPassing ? (
                                                                <CheckCircle className="w-6 h-6 text-white" />
                                                            ) : (
                                                                <XCircle className="w-6 h-6 text-white" />
                                                            )}
                                                        </div>
                                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                            isPassing ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                            %{percentage}
                                                        </span>
                                                    </div>
                                                    <CardTitle className="text-lg font-semibold text-gray-800 truncate">
                                                        {test.title}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                                        <div className="flex items-center gap-1">
                                                            <FileText className="w-4 h-4" />
                                                            <span>{test.total_questions} soru</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span>{test.score || 0} doğru</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Link href={`/test/${test.id}?retry=true`} className="flex-1">
                                                            <Button variant="outline" className="w-full">
                                                                Tekrar Çöz
                                                            </Button>
                                                        </Link>
                                                        <Link href={`/test/${test.id}`}>
                                                            <Button variant="ghost" size="icon">
                                                                <ChevronRight className="w-5 h-5" />
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}