'use client'

import { useCallback, useEffect, useState } from 'react'
import { UploadModal } from '@/components/documents/upload-modal'
import { CreateTestModal } from '@/components/test/create-test-modal'
import { DeleteTestDialog } from '@/components/test/delete-test-dialog'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { DeleteDocumentDialog } from '@/components/documents/delete-document-dialog'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { CheckSquare, Square, X, MessageSquare, Sparkles, Trash2, Edit2, ChevronRight, FileText, Clock, ClipboardList, BookOpen, Play } from 'lucide-react'
import { CreateFlashcardModal } from '@/components/flashcard/create-flashcard-modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

interface Document {
    id: string
    title: string
    status: string
    created_at: string
}

interface MultiSession {
    id: string
    title: string
    document_count: number
    documents: { id: string; title: string }[]
    created_at: string
    updated_at: string
    message_count: number
}

export default function DashboardPage() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [multiSessions, setMultiSessions] = useState<MultiSession[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingSessions, setLoadingSessions] = useState(true)
    const { accessToken } = useAuth()
    const router = useRouter()

    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<string>('documents')

    const [tests, setTests] = useState<any[]>([])
    const [loadingTests, setLoadingTests] = useState(false)

    const [flashcardSets, setFlashcardSets] = useState<any[]>([])
    const [loadingFlashcards, setLoadingFlashcards] = useState(false)

    const [isSelectMode, setIsSelectMode] = useState(false)
    const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())

    const [deleteSessionDialog, setDeleteSessionDialog] = useState<{ open: boolean, sessionId: string | null, sessionTitle: string }>({ open: false, sessionId: null, sessionTitle: '' })
    const [deletingSession, setDeletingSession] = useState(false)

    const fetchDocuments = useCallback(async (signal?: AbortSignal) => {
        if (!accessToken) return
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`${API_BASE_URL}/api/v1/documents/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                signal
            })

            if (response.ok) {
                const data = await response.json()
                setDocuments(data)
            } else {
                throw new Error('Belgeler yüklenirken bir hata oluştu.')
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return
            }
            console.error('Error fetching documents:', error)
            if (error instanceof Error && error.message === 'Failed to fetch') {
                setError('Sunucuya erişilemiyor. Lütfen backend servisinin çalıştığından emin olun.')
            } else {
                setError('Belgeler yüklenemedi. Lütfen tekrar deneyin.')
            }
        } finally {
            setLoading(false)
        }
    }, [accessToken])

    const fetchMultiSessions = useCallback(async () => {
        if (!accessToken) return
        try {
            setLoadingSessions(true)
            const response = await fetch(`${API_BASE_URL}/api/v1/chat/multi-document/sessions`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            if (response.ok) {
                const data = await response.json()
                setMultiSessions(data)
            }
        } catch (error) {
            console.error('Error fetching multi-sessions:', error)
        } finally {
            setLoadingSessions(false)
        }
    }, [accessToken])

    const fetchTests = useCallback(async () => {
        if (!accessToken) return
        try {
            setLoadingTests(true)
            const response = await fetch(`${API_BASE_URL}/api/v1/test/`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            if (response.ok) {
                const data = await response.json()
                setTests(data)
            }
        } catch (error) {
            console.error('Error fetching tests:', error)
        } finally {
            setLoadingTests(false)
        }
    }, [accessToken])

    const fetchFlashcardSets = useCallback(async () => {
        if (!accessToken) return
        try {
            setLoadingFlashcards(true)
            const response = await fetch(`${API_BASE_URL}/api/v1/flashcard/`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            if (response.ok) {
                const data = await response.json()
                setFlashcardSets(data)
            }
        } catch (error) {
            console.error('Error fetching flashcards:', error)
        } finally {
            setLoadingFlashcards(false)
        }
    }, [accessToken])

    useEffect(() => {
        const controller = new AbortController()
        fetchDocuments(controller.signal)
        fetchMultiSessions()
        if (activeTab === 'tests') {
            fetchTests()
        }
        if (activeTab === 'flashcards') {
            fetchFlashcardSets()
        }
        return () => controller.abort()
    }, [fetchDocuments, fetchMultiSessions, fetchTests, fetchFlashcardSets, activeTab])

    const handleDelete = async (id: string) => {
        if (!accessToken) return
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/documents/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            if (res.ok) {
                setDocuments(prev => prev.filter(doc => doc.id !== id))
                setSelectedDocIds(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(id)
                    return newSet
                })
            }
        } catch (error) {
            console.error("Error deleting document:", error)
        }
    }

    const handleDeleteSession = async (sessionId: string) => {
        if (!accessToken) return
        setDeletingSession(true)
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/chat/multi-document/session/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            if (res.ok) {
                setMultiSessions(prev => prev.filter(s => s.id !== sessionId))
                setDeleteSessionDialog({ open: false, sessionId: null, sessionTitle: '' })
            }
        } catch (error) {
            console.error("Error deleting session:", error)
        } finally {
            setDeletingSession(false)
        }
    }

    const toggleSelectMode = () => {
        setIsSelectMode(!isSelectMode)
        if (isSelectMode) setSelectedDocIds(new Set())
    }

    const toggleDocumentSelection = (docId: string, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setSelectedDocIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(docId)) {
                newSet.delete(docId)
            } else if (newSet.size < 10) {
                newSet.add(docId)
            }
            return newSet
        })
    }

    const handleStartMultiChat = () => {
        if (selectedDocIds.size < 2) return
        const idsParam = Array.from(selectedDocIds).join(',')
        router.push(`/multi-chat?ids=${idsParam}`)
    }

    const completedDocs = documents.filter(d => d.status === 'completed')

    return (
        <div className="min-h-screen w-full pt-16 bg-paper relative">
            <div className="absolute inset-0 paper-texture pointer-events-none -z-10" />

            <div className="container mx-auto py-10 px-4">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-bold text-ink font-display">
                            Kütüphanem
                        </h1>
                        <p className="text-ink-light mt-2 font-body">AI destekli belgelerinizi yönetin</p>
                    </div>
                    <UploadModal />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-paper-dark w-full overflow-x-auto flex-nowrap scrollbar-hide border border-parchment rounded-sm">
                        <TabsTrigger value="documents" className="flex items-center gap-2 font-mono-ui text-xs tracking-wide">
                            <FileText className="w-4 h-4" />
                            Dökümanlarım
                        </TabsTrigger>
                        <TabsTrigger value="multi-sessions" className="flex items-center gap-2 font-mono-ui text-xs tracking-wide">
                            <Sparkles className="w-4 h-4" />
                            Çoklu Çalışmalarım
                            {multiSessions.length > 0 && (
                                <span className="ml-1 bg-parchment text-ink px-2 py-0.5 rounded-sm text-xs font-mono-ui">
                                    {multiSessions.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="tests" className="flex items-center gap-2 font-mono-ui text-xs tracking-wide">
                            <ClipboardList className="w-4 h-4" />
                            Testlerim
                        </TabsTrigger>
                        <TabsTrigger value="flashcards" className="flex items-center gap-2 font-mono-ui text-xs tracking-wide">
                            <BookOpen className="w-4 h-4" />
                            Flashcard'larım
                            {flashcardSets.length > 0 && (
                                <span className="ml-1 bg-parchment text-ink px-2 py-0.5 rounded-sm text-xs font-mono-ui">
                                    {flashcardSets.length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* Documents Tab */}
                    <TabsContent value="documents">
                        <div className="flex justify-end mb-4">
                            {completedDocs.length >= 2 && (
                                <Button
                                    variant={isSelectMode ? "secondary" : "outline"}
                                    onClick={toggleSelectMode}
                                    className="flex items-center gap-2 font-mono-ui text-xs tracking-wide"
                                >
                                    {isSelectMode ? (
                                        <><X className="w-4 h-4" />Seçimi İptal Et</>
                                    ) : (
                                        <><CheckSquare className="w-4 h-4" />Çoklu Seçim</>
                                    )}
                                </Button>
                            )}
                        </div>

                        {isSelectMode && selectedDocIds.size >= 2 && (
                            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
                                <Button
                                    onClick={handleStartMultiChat}
                                    className="bg-ink text-paper hover:bg-ink/90 paper-shadow px-8 py-6 text-lg rounded-sm flex items-center gap-3 font-mono-ui tracking-wide"
                                >
                                    <MessageSquare className="w-6 h-6" />
                                    {selectedDocIds.size} Dökümanla AI Çalışması Başlat
                                </Button>
                            </div>
                        )}

                        {isSelectMode && (
                            <div className="mb-6 p-4 bg-parchment/50 border border-parchment rounded-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckSquare className="w-5 h-5 text-olive" />
                                    <span className="text-ink font-body">
                                        <strong>{selectedDocIds.size}</strong> / 10 döküman seçildi
                                        {selectedDocIds.size < 2 && <span className="text-ink-light ml-2">(En az 2 döküman seçin)</span>}
                                    </span>
                                </div>
                                {selectedDocIds.size > 0 && (
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDocIds(new Set())} className="text-terracotta font-mono-ui">
                                        Temizle
                                    </Button>
                                )}
                            </div>
                        )}

                        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {loading ? (
                                <div className="col-span-full flex justify-center items-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
                                </div>
                            ) : error ? (
                                <div className="col-span-full text-center py-20 text-terracotta font-body">
                                    <p>{error}</p>
                                    <Button variant="outline" onClick={() => fetchDocuments(undefined)} className="mt-4">Tekrar Dene</Button>
                                </div>
                            ) : documents.length === 0 ? (
                                <Card className="col-span-full border-dashed border-2 border-parchment bg-paper/50">
                                    <CardHeader className="text-center py-10">
                                        <CardTitle className="text-xl text-ink-light font-display">Henüz belge yok</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center pb-10">
                                        <p className="text-ink-light mb-4 font-body">AI ile sohbet etmeye başlamak için ilk PDF&apos;inizi yükleyin.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                documents.map((doc) => (
                                    <div key={doc.id} className="relative">
                                        {isSelectMode && doc.status === 'completed' ? (
                                            <div
                                                onClick={(e) => toggleDocumentSelection(doc.id, e)}
                                                className={`cursor-pointer transition-all duration-200 ${selectedDocIds.has(doc.id) ? 'ring-2 ring-terracotta ring-offset-2' : ''}`}
                                            >
                                                <Card className={`hover:shadow-xl transition-all group bg-paper hover:-translate-y-1 ${selectedDocIds.has(doc.id) ? 'bg-parchment/50' : ''}`}>
                                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                                        <div className="space-y-1 pr-8 min-w-0 flex-1">
                                                            <CardTitle className="truncate text-lg font-semibold text-ink group-hover:text-terracotta font-display">{doc.title}</CardTitle>
                                                            <p className="text-xs text-ink-light font-mono-ui">PDF Belgesi</p>
                                                        </div>
                                                        {selectedDocIds.has(doc.id) ? <CheckSquare className="w-6 h-6 text-terracotta" /> : <Square className="w-6 h-6 text-parchment" />}
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-parchment">
                                                            <span className={`text-xs px-2.5 py-1 rounded-sm font-medium font-mono-ui ${doc.status === 'completed' ? 'bg-olive/10 text-olive' : doc.status === 'processing' ? 'bg-gold/10 text-gold' : 'bg-parchment text-ink-light'}`}>
                                                                {doc.status === 'completed' ? 'Tamamlandı' : doc.status === 'processing' ? 'İşleniyor' : doc.status}
                                                            </span>
                                                            <span className="text-xs text-ink-light font-mono-ui">{new Date(doc.created_at).toLocaleDateString('tr-TR')}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        ) : (
                                            <Card className="hover:shadow-xl transition-all group bg-paper hover:-translate-y-1">
                                                <Link href={`/chat/${doc.id}`}>
                                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                                        <div className="space-y-1 pr-8 min-w-0 flex-1">
                                                            <CardTitle className="truncate text-lg font-semibold text-ink group-hover:text-terracotta font-display">{doc.title}</CardTitle>
                                                            <p className="text-xs text-ink-light font-mono-ui">PDF Belgesi</p>
                                                        </div>
                                                        {!isSelectMode && <DeleteDocumentDialog documentId={doc.id} documentTitle={doc.title} onDelete={handleDelete} />}
                                                    </CardHeader>
                                                </Link>
                                                <CardContent>
                                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-parchment">
                                                        <span className={`text-xs px-2.5 py-1 rounded-sm font-medium font-mono-ui ${doc.status === 'completed' ? 'bg-olive/10 text-olive' : doc.status === 'processing' ? 'bg-gold/10 text-gold' : 'bg-parchment text-ink-light'}`}>
                                                            {doc.status === 'completed' ? 'Tamamlandı' : doc.status === 'processing' ? 'İşleniyor' : doc.status}
                                                        </span>
                                                        <span className="text-xs text-ink-light font-mono-ui">{new Date(doc.created_at).toLocaleDateString('tr-TR')}</span>
                                                    </div>
                                                    {doc.status === 'completed' && (
                                                        <div className="mt-4 pt-4 border-t border-parchment flex flex-col gap-2">
                                                            <CreateTestModal documentId={doc.id} documentTitle={doc.title} />
                                                            <CreateFlashcardModal documentId={doc.id} documentTitle={doc.title} />
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    {/* Multi-Sessions Tab */}
                    <TabsContent value="multi-sessions">
                        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {loadingSessions ? (
                                <div className="col-span-full flex justify-center items-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
                                </div>
                            ) : multiSessions.length === 0 ? (
                                <Card className="col-span-full border-dashed border-2 border-parchment bg-paper/50">
                                    <CardHeader className="text-center py-10">
                                        <div className="w-16 h-16 bg-ink rounded-sm flex items-center justify-center mx-auto mb-4">
                                            <Sparkles className="w-8 h-8 text-paper" />
                                        </div>
                                        <CardTitle className="text-xl text-ink-light font-display">Henüz çoklu çalışma yok</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center pb-10">
                                        <p className="text-ink-light mb-4 font-body">Dökümanlarınızı seçip &quot;Çoklu Seçim&quot; ile AI çalışması başlatın.</p>
                                        <Button onClick={() => setActiveTab('documents')} variant="outline">
                                            Dökümanlarıma Git
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                multiSessions.map((session) => (
                                    <Card key={session.id} className="hover:shadow-xl transition-all group bg-paper hover:-translate-y-1 relative paper-fold">
                                        <Link href={`/multi-chat?session=${session.id}`}>
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="w-12 h-12 bg-ink rounded-sm flex items-center justify-center mb-3">
                                                        <Sparkles className="w-6 h-6 text-paper" />
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-parchment group-hover:text-terracotta" />
                                                </div>
                                                <CardTitle className="text-lg font-semibold text-ink group-hover:text-terracotta truncate font-display">
                                                    {session.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex items-center gap-4 text-sm text-ink-light mb-3 font-mono-ui">
                                                    <div className="flex items-center gap-1">
                                                        <FileText className="w-4 h-4" />
                                                        <span>{session.document_count} döküman</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <MessageSquare className="w-4 h-4" />
                                                        <span>{session.message_count} mesaj</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-ink-light font-mono-ui">
                                                    <Clock className="w-3 h-3" />
                                                    <span>Son güncelleme: {new Date(session.updated_at).toLocaleDateString('tr-TR')}</span>
                                                </div>
                                            </CardContent>
                                        </Link>
                                        <div className="px-6 pb-4 flex flex-col gap-2">
                                            <CreateFlashcardModal sessionId={session.id} sessionTitle={session.title} />
                                            <CreateTestModal sessionId={session.id} sessionTitle={session.title} suggestedQuestionCount={15} />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-ink-light hover:text-terracotta"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setDeleteSessionDialog({ open: true, sessionId: session.id, sessionTitle: session.title })
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    {/* Tests Tab */}
                    <TabsContent value="tests">
                        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {loadingTests ? (
                                <div className="col-span-full flex justify-center items-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
                                </div>
                            ) : tests.length === 0 ? (
                                <Card className="col-span-full border-dashed border-2 border-parchment bg-paper/50">
                                    <CardHeader className="text-center py-10">
                                        <div className="w-16 h-16 bg-ink rounded-sm flex items-center justify-center mx-auto mb-4">
                                            <ClipboardList className="w-8 h-8 text-paper" />
                                        </div>
                                        <CardTitle className="text-xl text-ink-light font-display">Henüz test yok</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center pb-10">
                                        <p className="text-ink-light mb-4 font-body">Dökümanlarınızdan test oluşturmak için Dökümanlarım sekmesine gidin.</p>
                                        <Button onClick={() => setActiveTab('documents')} variant="outline">
                                            Dökümanlarıma Git
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                tests.map((test) => {
                                    const percentage = test.total_questions > 0 && test.score !== null
                                        ? Math.round((test.score || 0) / test.total_questions * 100)
                                        : null

                                    return (
                                        <Card key={test.id} className="hover:shadow-xl transition-all group bg-paper hover:-translate-y-1 relative paper-fold">
                                            <Link href={`/test/${test.id}`}>
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-start justify-between">
                                                        <div className={`w-12 h-12 rounded-sm flex items-center justify-center mb-3 ${
                                                            test.completed
                                                                ? (percentage !== null && percentage >= 60
                                                                    ? 'bg-olive/20'
                                                                    : 'bg-terracotta/20')
                                                                : 'bg-gold/20'
                                                        }`}>
                                                            {test.completed ? (
                                                                percentage !== null && percentage >= 60 ? (
                                                                    <CheckSquare className="w-6 h-6 text-olive" />
                                                                ) : (
                                                                    <X className="w-6 h-6 text-terracotta" />
                                                                )
                                                            ) : (
                                                                <ClipboardList className="w-6 h-6 text-gold" />
                                                            )}
                                                        </div>
                                                        {test.completed && percentage !== null && (
                                                            <span className={`text-xs px-2 py-1 rounded-sm font-medium font-mono-ui ${
                                                                percentage >= 60 ? 'bg-olive/10 text-olive' : 'bg-terracotta/10 text-terracotta'
                                                            }`}>
                                                                %{percentage}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <CardTitle className="text-lg font-semibold text-ink group-hover:text-terracotta truncate font-display">
                                                        {test.title}
                                                    </CardTitle>
                                                </CardHeader>
                                            </Link>
                                            <CardContent>
                                                <div className="flex items-center gap-4 text-sm text-ink-light mb-4 font-mono-ui">
                                                    <div className="flex items-center gap-1">
                                                        <FileText className="w-4 h-4" />
                                                        <span>{test.total_questions} soru</span>
                                                    </div>
                                                    {test.completed && test.score !== null && (
                                                        <div className="flex items-center gap-1">
                                                            <span>{test.score} doğru</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-ink-light font-mono-ui">
                                                        {new Date(test.created_at).toLocaleDateString('tr-TR')}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {test.completed && (
                                                            <Link href={`/test/${test.id}?retry=true`}>
                                                                <Button variant="outline" size="sm" className="text-xs h-7 font-mono-ui">
                                                                    Tekrar Çöz
                                                                </Button>
                                                            </Link>
                                                        )}
                                                        <DeleteTestDialog
                                                            testId={test.id}
                                                            testTitle={test.title}
                                                            onDelete={(id) => setTests(prev => prev.filter(t => t.id !== id))}
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })
                            )}
                        </div>
                    </TabsContent>

                    {/* Flashcards Tab */}
                    <TabsContent value="flashcards">
                        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {loadingFlashcards ? (
                                <div className="col-span-full flex justify-center items-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
                                </div>
                            ) : flashcardSets.length === 0 ? (
                                <Card className="col-span-full border-dashed border-2 border-parchment bg-paper/50">
                                    <CardHeader className="text-center py-10">
                                        <div className="w-16 h-16 bg-ink rounded-sm flex items-center justify-center mx-auto mb-4">
                                            <BookOpen className="w-8 h-8 text-paper" />
                                        </div>
                                        <CardTitle className="text-xl text-ink-light font-display">Henüz flashcard seti yok</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center pb-10">
                                        <p className="text-ink-light mb-4 font-body">Dökümanlarınızdan veya çoklu çalışmalarınızdan flashcard oluşturun.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                flashcardSets.map((set) => (
                                    <Card key={set.id} className="hover:shadow-xl transition-all group bg-paper hover:-translate-y-1 relative paper-fold">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-start justify-between">
                                                <div className="w-12 h-12 bg-ink rounded-sm flex items-center justify-center mb-3">
                                                    <BookOpen className="w-6 h-6 text-paper" />
                                                </div>
                                            </div>
                                            <CardTitle className="text-lg font-semibold text-ink group-hover:text-terracotta truncate font-display">
                                                {set.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center gap-4 text-sm text-ink-light mb-3 font-mono-ui">
                                                <span>{set.card_count} kart</span>
                                                <span>·</span>
                                                <span>%{set.completion_percentage} tamamlandı</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-parchment rounded-sm overflow-hidden mb-4">
                                                <div 
                                                    className="h-full bg-olive"
                                                    style={{ width: `${set.completion_percentage}%` }}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    onClick={() => router.push(`/flashcard/${set.id}?mode=study`)}
                                                    className="flex-1 bg-ink text-paper hover:bg-ink/90 font-mono-ui"
                                                    size="sm"
                                                >
                                                    <Play className="w-4 h-4 mr-1" /> Çalış
                                                </Button>
                                                <Button 
                                                    onClick={() => router.push(`/flashcard/${set.id}`)}
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 font-mono-ui"
                                                >
                                                    <Edit2 className="w-4 h-4 mr-1" /> Düzenle
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Delete Session Confirmation Dialog */}
                <AlertDialog open={deleteSessionDialog.open} onOpenChange={(open) => setDeleteSessionDialog(prev => ({ ...prev, open }))}>
                    <AlertDialogContent className="max-w-md paper-texture">
                        <AlertDialogHeader className="text-center pb-2">
                            <div className="w-16 h-16 bg-terracotta/20 rounded-sm flex items-center justify-center mx-auto mb-4 paper-shadow">
                                <Trash2 className="w-8 h-8 text-terracotta" />
                            </div>
                            <AlertDialogTitle className="text-xl text-ink font-display">
                                Çoklu Çalışmayı Sil
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-ink-light mt-3 font-body">
                                Bu işlem <span className="font-semibold text-terracotta">geri alınamaz</span>.
                                <span className="font-medium text-ink"> &quot;{deleteSessionDialog.sessionTitle}&quot; </span>
                                çalışması ve tüm mesaj geçmişi kalıcı olarak silinecektir.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-3">
                            <AlertDialogCancel 
                                onClick={() => setDeleteSessionDialog({ open: false, sessionId: null, sessionTitle: '' })}
                                className="flex-1 bg-paper-dark hover:bg-parchment text-ink border-parchment font-mono-ui"
                            >
                                İptal
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => deleteSessionDialog.sessionId && handleDeleteSession(deleteSessionDialog.sessionId)}
                                className="flex-1 bg-terracotta hover:bg-terracotta/90 text-paper paper-shadow font-mono-ui"
                                disabled={deletingSession}
                            >
                                {deletingSession ? "Siliniyor..." : "Sil"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}
