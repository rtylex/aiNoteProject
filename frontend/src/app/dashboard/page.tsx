'use client'

import { useCallback, useEffect, useState } from 'react'
import { UploadModal } from '@/components/documents/upload-modal'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { DeleteDocumentDialog } from '@/components/documents/delete-document-dialog'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { CheckSquare, Square, X, MessageSquare, Sparkles, Trash2, Edit2, ChevronRight, FileText, Clock } from 'lucide-react'
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

    // Multi-select state
    const [isSelectMode, setIsSelectMode] = useState(false)
    const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())

    // Delete session dialog state
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

    useEffect(() => {
        const controller = new AbortController()
        fetchDocuments(controller.signal)
        fetchMultiSessions()
        return () => controller.abort()
    }, [fetchDocuments, fetchMultiSessions])

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
        <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-white">
            <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

            <div className="container mx-auto py-10 px-4">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Kütüphanem
                        </h1>
                        <p className="text-gray-500 mt-2">AI destekli belgelerinizi yönetin</p>
                    </div>
                    <UploadModal />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-white/50">
                        <TabsTrigger value="documents" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Dökümanlarım
                        </TabsTrigger>
                        <TabsTrigger value="multi-sessions" className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Çoklu Çalışmalarım
                            {multiSessions.length > 0 && (
                                <span className="ml-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                                    {multiSessions.length}
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
                                    className="flex items-center gap-2"
                                >
                                    {isSelectMode ? (
                                        <><X className="w-4 h-4" />Seçimi İptal Et</>
                                    ) : (
                                        <><CheckSquare className="w-4 h-4" />Çoklu Seçim</>
                                    )}
                                </Button>
                            )}
                        </div>

                        {/* Floating Action Button */}
                        {isSelectMode && selectedDocIds.size >= 2 && (
                            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
                                <Button
                                    onClick={handleStartMultiChat}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-2xl px-8 py-6 text-lg rounded-full flex items-center gap-3"
                                >
                                    <MessageSquare className="w-6 h-6" />
                                    {selectedDocIds.size} Dökümanla AI Çalışması Başlat
                                </Button>
                            </div>
                        )}

                        {/* Selection Info */}
                        {isSelectMode && (
                            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                                    <span className="text-indigo-800">
                                        <strong>{selectedDocIds.size}</strong> / 10 döküman seçildi
                                        {selectedDocIds.size < 2 && <span className="text-indigo-500 ml-2">(En az 2 döküman seçin)</span>}
                                    </span>
                                </div>
                                {selectedDocIds.size > 0 && (
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDocIds(new Set())} className="text-indigo-600">
                                        Temizle
                                    </Button>
                                )}
                            </div>
                        )}

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {loading ? (
                                <div className="col-span-full flex justify-center items-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : error ? (
                                <div className="col-span-full text-center py-20 text-red-500">
                                    <p>{error}</p>
                                    <Button variant="outline" onClick={() => fetchDocuments(undefined)} className="mt-4">Tekrar Dene</Button>
                                </div>
                            ) : documents.length === 0 ? (
                                <Card className="col-span-full border-dashed border-2 bg-white/50">
                                    <CardHeader className="text-center py-10">
                                        <CardTitle className="text-xl text-gray-600">Henüz belge yok</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center pb-10">
                                        <p className="text-gray-500 mb-4">AI ile sohbet etmeye başlamak için ilk PDF&apos;inizi yükleyin.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                documents.map((doc) => (
                                    <div key={doc.id} className="relative">
                                        {isSelectMode && doc.status === 'completed' ? (
                                            <div
                                                onClick={(e) => toggleDocumentSelection(doc.id, e)}
                                                className={`cursor-pointer transition-all duration-200 ${selectedDocIds.has(doc.id) ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                                            >
                                                <Card className={`hover:shadow-xl transition-all group bg-white/80 backdrop-blur-sm hover:-translate-y-1 ${selectedDocIds.has(doc.id) ? 'bg-indigo-50' : ''}`}>
                                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                                        <div className="space-y-1 pr-8 min-w-0 flex-1">
                                                            <CardTitle className="truncate text-lg font-semibold text-gray-800 group-hover:text-indigo-600">{doc.title}</CardTitle>
                                                            <p className="text-xs text-gray-400">PDF Belgesi</p>
                                                        </div>
                                                        {selectedDocIds.has(doc.id) ? <CheckSquare className="w-6 h-6 text-indigo-600" /> : <Square className="w-6 h-6 text-gray-400" />}
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${doc.status === 'completed' ? 'bg-green-100 text-green-700' : doc.status === 'processing' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                                                                {doc.status === 'completed' ? 'Tamamlandı' : doc.status === 'processing' ? 'İşleniyor' : doc.status}
                                                            </span>
                                                            <span className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('tr-TR')}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        ) : (
                                            <Link href={`/chat/${doc.id}`}>
                                                <Card className="hover:shadow-xl transition-all cursor-pointer group bg-white/80 backdrop-blur-sm hover:-translate-y-1">
                                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                                        <div className="space-y-1 pr-8 min-w-0 flex-1">
                                                            <CardTitle className="truncate text-lg font-semibold text-gray-800 group-hover:text-indigo-600">{doc.title}</CardTitle>
                                                            <p className="text-xs text-gray-400">PDF Belgesi</p>
                                                        </div>
                                                        {!isSelectMode && <DeleteDocumentDialog documentId={doc.id} documentTitle={doc.title} onDelete={handleDelete} />}
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${doc.status === 'completed' ? 'bg-green-100 text-green-700' : doc.status === 'processing' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                                                                {doc.status === 'completed' ? 'Tamamlandı' : doc.status === 'processing' ? 'İşleniyor' : doc.status}
                                                            </span>
                                                            <span className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('tr-TR')}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    {/* Multi-Sessions Tab */}
                    <TabsContent value="multi-sessions">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {loadingSessions ? (
                                <div className="col-span-full flex justify-center items-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : multiSessions.length === 0 ? (
                                <Card className="col-span-full border-dashed border-2 bg-white/50">
                                    <CardHeader className="text-center py-10">
                                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Sparkles className="w-8 h-8 text-white" />
                                        </div>
                                        <CardTitle className="text-xl text-gray-600">Henüz çoklu çalışma yok</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center pb-10">
                                        <p className="text-gray-500 mb-4">Dökümanlarınızı seçip "Çoklu Seçim" ile AI çalışması başlatın.</p>
                                        <Button onClick={() => setActiveTab('documents')} variant="outline">
                                            Dökümanlarıma Git
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                multiSessions.map((session) => (
                                    <Card key={session.id} className="hover:shadow-xl transition-all group bg-white/80 backdrop-blur-sm hover:-translate-y-1 relative">
                                        <Link href={`/multi-chat?session=${session.id}`}>
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mb-3">
                                                        <Sparkles className="w-6 h-6 text-white" />
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                                                </div>
                                                <CardTitle className="text-lg font-semibold text-gray-800 group-hover:text-indigo-600 truncate">
                                                    {session.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                                    <div className="flex items-center gap-1">
                                                        <FileText className="w-4 h-4" />
                                                        <span>{session.document_count} döküman</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <MessageSquare className="w-4 h-4" />
                                                        <span>{session.message_count} mesaj</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span>Son güncelleme: {new Date(session.updated_at).toLocaleDateString('tr-TR')}</span>
                                                </div>
                                            </CardContent>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
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
                </Tabs>

                {/* Delete Session Confirmation Dialog */}
                <AlertDialog open={deleteSessionDialog.open} onOpenChange={(open) => setDeleteSessionDialog(prev => ({ ...prev, open }))}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Çalışmayı Sil</AlertDialogTitle>
                            <AlertDialogDescription>
                                Bu işlem geri alınamaz.
                                <span className="font-semibold text-foreground"> "{deleteSessionDialog.sessionTitle}" </span>
                                çalışması ve tüm mesaj geçmişi kalıcı olarak silinecektir.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteSessionDialog({ open: false, sessionId: null, sessionTitle: '' })}>
                                İptal
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => deleteSessionDialog.sessionId && handleDeleteSession(deleteSessionDialog.sessionId)}
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
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
