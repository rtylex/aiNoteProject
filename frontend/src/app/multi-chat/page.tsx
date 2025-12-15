'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, Suspense } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Loader2, FileText, ArrowLeft, Sparkles, Edit2, Check, X, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

interface Message {
    id: number | string
    sender: 'user' | 'ai'
    message: string
}

interface DocumentInfo {
    id: string
    title: string
}

interface LimitInfo {
    remaining: number
    limit: number
}

function MultiChatContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [documents, setDocuments] = useState<DocumentInfo[]>([])
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingDocs, setIsLoadingDocs] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)
    const { accessToken } = useAuth()

    // Session state
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [sessionTitle, setSessionTitle] = useState('')
    const [showNameModal, setShowNameModal] = useState(false)
    const [tempTitle, setTempTitle] = useState('')
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [editTitle, setEditTitle] = useState('')

    // Limit modal state
    const [showLimitModal, setShowLimitModal] = useState(false)
    const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null)

    // Check for existing session or new documents
    useEffect(() => {
        const existingSessionId = searchParams.get('session')
        const idsParam = searchParams.get('ids')

        if (existingSessionId && accessToken) {
            // Load existing session
            loadExistingSession(existingSessionId)
        } else if (idsParam && accessToken) {
            // New session - show name modal
            const ids = idsParam.split(',')
            fetchDocumentInfo(ids)
            setShowNameModal(true)
        }
    }, [searchParams, accessToken])

    const loadExistingSession = async (id: string) => {
        setIsLoadingDocs(true)
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/chat/multi-document/session/${id}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            if (response.ok) {
                const data = await response.json()
                setSessionId(id)
                setSessionTitle(data.title)
                setDocuments(data.documents)
                setMessages(data.messages.map((m: { id: string; sender: 'user' | 'ai'; message: string }) => ({
                    id: m.id,
                    sender: m.sender,
                    message: m.message
                })))
            } else {
                router.push('/dashboard')
            }
        } catch (error) {
            console.error('Error loading session:', error)
            router.push('/dashboard')
        } finally {
            setIsLoadingDocs(false)
        }
    }

    const fetchDocumentInfo = async (ids: string[]) => {
        setIsLoadingDocs(true)
        try {
            const docInfos: DocumentInfo[] = []
            for (const id of ids) {
                const response = await fetch(`${API_BASE_URL}/api/v1/documents/${id}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                if (response.ok) {
                    const doc = await response.json()
                    docInfos.push({ id: doc.id, title: doc.title })
                }
            }
            setDocuments(docInfos)
        } catch (error) {
            console.error('Error fetching document info:', error)
        } finally {
            setIsLoadingDocs(false)
        }
    }

    const createSession = async () => {
        if (!tempTitle.trim() || documents.length < 2) return

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/chat/multi-document/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    title: tempTitle,
                    document_ids: documents.map(d => d.id)
                })
            })

            if (response.ok) {
                const data = await response.json()
                setSessionId(data.id)
                setSessionTitle(data.title)
                setShowNameModal(false)
                // Update URL to include session ID
                router.replace(`/multi-chat?session=${data.id}`)
            }
        } catch (error) {
            console.error('Error creating session:', error)
        }
    }

    const updateSessionTitle = async () => {
        if (!sessionId || !editTitle.trim()) return

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/chat/multi-document/session/${sessionId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ title: editTitle })
            })

            if (response.ok) {
                setSessionTitle(editTitle)
                setIsEditingTitle(false)
            }
        } catch (error) {
            console.error('Error updating title:', error)
        }
    }

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading || !sessionId) return

        const userMessage: Message = {
            id: Date.now(),
            sender: 'user',
            message: input
        }

        const sentMessage = input
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/chat/multi-document/session/${sessionId}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ message: sentMessage })
            })

            if (response.ok) {
                const data = await response.json()
                const aiMessage: Message = {
                    id: Date.now() + 1,
                    sender: 'ai',
                    message: data.message
                }
                setMessages(prev => [...prev, aiMessage])
            } else if (response.status === 429) {
                // Rate limit exceeded - show popup
                const errorData = await response.json()
                setLimitInfo({
                    remaining: 0,
                    limit: errorData.detail?.limit || 5
                })
                setShowLimitModal(true)
                // Remove the user message since it wasn't processed
                setMessages(prev => prev.filter(m => m.id !== userMessage.id))
                setInput(sentMessage) // Restore the input
            } else {
                const errorData = await response.json()
                const aiMessage: Message = {
                    id: Date.now() + 1,
                    sender: 'ai',
                    message: `Hata: ${typeof errorData.detail === 'string' ? errorData.detail : errorData.detail?.message || 'Bir hata oluştu'}`
                }
                setMessages(prev => [...prev, aiMessage])
            }
        } catch (error) {
            console.error('Error sending message:', error)
            const aiMessage: Message = {
                id: Date.now() + 1,
                sender: 'ai',
                message: 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.'
            }
            setMessages(prev => [...prev, aiMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Name Modal
    if (showNameModal) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-white">
                <Card className="max-w-md w-full mx-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                            Çoklu Çalışmaya İsim Ver
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600">
                            {documents.length} döküman seçtiniz. Bu çalışmaya bir isim verin.
                        </p>
                        <Input
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            placeholder="Örn: Yapay Zeka Dersi Notları"
                            autoFocus
                            onKeyPress={(e) => e.key === 'Enter' && createSession()}
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => router.push('/dashboard')}
                            >
                                İptal
                            </Button>
                            <Button
                                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600"
                                onClick={createSession}
                                disabled={!tempTitle.trim()}
                            >
                                Oluştur
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (isLoadingDocs) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-white">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-600">Yükleniyor...</p>
                </div>
            </div>
        )
    }

    if (documents.length < 2) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-white">
                <Card className="max-w-md w-full mx-4">
                    <CardHeader>
                        <CardTitle className="text-red-600">Hata</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600 mb-4">
                            Çoklu döküman çalışması için en az 2 döküman gereklidir.
                        </p>
                        <Link href="/dashboard">
                            <Button className="w-full">Dashboard&apos;a Dön</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-white">
            {/* Limit Warning Modal */}
            {showLimitModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="max-w-md w-full animate-in fade-in zoom-in duration-200">
                        <CardHeader className="text-center pb-2">
                            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle className="text-xl text-gray-800">Günlük Limit Doldu</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <p className="text-gray-600">
                                Günlük <span className="font-bold text-indigo-600">{limitInfo?.limit || 5}</span> sorgu hakkınızı kullandınız.
                            </p>
                            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
                                <p className="text-sm text-orange-700">
                                    🕐 Limitiniz <strong>yarın gece yarısı</strong> sıfırlanacak.
                                </p>
                            </div>
                            <p className="text-sm text-gray-500">
                                Daha fazla sorgu hakkı için premium plana geçebilirsiniz.
                            </p>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowLimitModal(false)}
                                >
                                    Tamam
                                </Button>
                                <Button
                                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600"
                                    onClick={() => router.push('/dashboard')}
                                >
                                    Dashboard'a Dön
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Header */}
            <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        {isEditingTitle ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="max-w-xs"
                                    autoFocus
                                />
                                <Button size="icon" variant="ghost" onClick={updateSessionTitle}>
                                    <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)}>
                                    <X className="w-4 h-4 text-red-600" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-indigo-600" />
                                    {sessionTitle || 'Çoklu Döküman Çalışması'}
                                </h1>
                                {sessionId && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                            setEditTitle(sessionTitle)
                                            setIsEditingTitle(true)
                                        }}
                                    >
                                        <Edit2 className="w-4 h-4 text-gray-400" />
                                    </Button>
                                )}
                            </div>
                        )}
                        <p className="text-sm text-gray-500">{documents.length} döküman seçili</p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar - Selected Documents */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-24">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-gray-500">
                                    Seçili Dökümanlar
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {documents.map((doc, index) => (
                                    <div
                                        key={doc.id}
                                        className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">
                                                {doc.title}
                                            </p>
                                        </div>
                                        <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Chat Area */}
                    <div className="lg:col-span-3">
                        <Card className="h-[calc(100vh-180px)] flex flex-col overflow-hidden">
                            {/* Messages */}
                            <ScrollArea className="flex-1 p-4 min-h-0" ref={scrollRef}>
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-6">
                                            <Sparkles className="w-10 h-10 text-white" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                            {sessionTitle}
                                        </h2>
                                        <p className="text-gray-500 max-w-md mb-6">
                                            Seçtiğiniz {documents.length} döküman üzerinden soru sorabilirsiniz.
                                            AI, tüm kaynaklardaki bilgileri birleştirerek size kapsamlı cevaplar verecek.
                                        </p>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            <Button variant="outline" size="sm" onClick={() => setInput("Bu dökümanları karşılaştır")}>
                                                Karşılaştır
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setInput("Bu konuları özetle")}>
                                                Özetle
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setInput("Ortak noktaları ve farklılıkları göster")}>
                                                Benzerlikler/Farklılıklar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {messages.map((msg) => (
                                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.sender === 'user'
                                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                                                    : 'bg-white border border-gray-200 text-gray-800'
                                                    }`}>
                                                    {msg.sender === 'ai' ? (
                                                        <div className="prose prose-sm max-w-none overflow-hidden break-words">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {msg.message}
                                                            </ReactMarkdown>
                                                        </div>
                                                    ) : (
                                                        <p>{msg.message}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {isLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                                        <span className="text-gray-500">Düşünüyor...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>

                            {/* Input Area */}
                            <div className="border-t p-4 bg-white/50">
                                <div className="flex gap-2">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Tüm dökümanlardan soru sorun..."
                                        disabled={isLoading || !sessionId}
                                    />
                                    <Button
                                        onClick={handleSend}
                                        disabled={!input.trim() || isLoading || !sessionId}
                                        className="bg-gradient-to-r from-indigo-600 to-purple-600"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function MultiChatPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-white">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
            </div>
        }>
            <MultiChatContent />
        </Suspense>
    )
}
