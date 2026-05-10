'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, Suspense } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Loader2, FileText, ArrowLeft, Sparkles, Edit2, Check, X, AlertCircle, Zap, Lightbulb, BookOpen, ListChecks, GraduationCap, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
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

interface ModelError {
    model: string
    message: string
}

const PROMPT_TEMPLATES = [
    { icon: FileText, label: 'Kısaca Özetle', prompt: 'Bu dokümanları kısaca 2-3 paragrafta özetle.', color: 'text-terracotta' },
    { icon: BookOpen, label: 'Detaylı Özetle', prompt: 'Bu dokümanları detaylı bir şekilde özetle. Tüm önemli noktaları kapsa.', color: 'text-ink' },
    { icon: ListChecks, label: 'Madde Madde', prompt: 'Bu dokümanların ana noktalarını madde madde listele.', color: 'text-olive' },
    { icon: Lightbulb, label: 'Basitçe Açıkla', prompt: 'Bu konuları basit ve anlaşılır bir şekilde açıkla.', color: 'text-gold' },
    { icon: GraduationCap, label: 'Sınav Sorusu', prompt: 'Bu konulardan 5 adet sınav sorusu hazırla. Cevaplarını da ver.', color: 'text-lavender' },
    { icon: HelpCircle, label: 'Çoktan Seçmeli', prompt: 'Bu konulardan 5 adet çoktan seçmeli (A/B/C/D) soru hazırla. Doğru cevapları işaretle.', color: 'text-terracotta' },
]

function MultiChatContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [documents, setDocuments] = useState<DocumentInfo[]>([])
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingDocs, setIsLoadingDocs] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)
    const { accessToken, preferredModel } = useAuth()

    const [sessionId, setSessionId] = useState<string | null>(null)
    const [sessionTitle, setSessionTitle] = useState('')
    const [showNameModal, setShowNameModal] = useState(false)
    const [tempTitle, setTempTitle] = useState('')
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [editTitle, setEditTitle] = useState('')

    const [showLimitModal, setShowLimitModal] = useState(false)
    const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null)

    const [showModelError, setShowModelError] = useState(false)
    const [modelError, setModelError] = useState<ModelError | null>(null)

    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false)
    const templateDropdownRef = useRef<HTMLDivElement>(null)

    const [showMobileDocs, setShowMobileDocs] = useState(false)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
                setShowTemplateDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const existingSessionId = searchParams.get('session')
        const idsParam = searchParams.get('ids')

        if (existingSessionId && accessToken) {
            loadExistingSession(existingSessionId)
        } else if (idsParam && accessToken) {
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

    const handleSend = async (promptOverride?: string) => {
        const messageToSend = promptOverride || input
        if (!messageToSend.trim() || isLoading || !sessionId) return

        const userMessage: Message = {
            id: Date.now(),
            sender: 'user',
            message: messageToSend
        }

        const sentMessage = messageToSend
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
                body: JSON.stringify({ message: sentMessage, model: preferredModel })
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
                const errorData = await response.json()
                setLimitInfo({
                    remaining: 0,
                    limit: errorData.detail?.limit || 5
                })
                setShowLimitModal(true)
                setMessages(prev => prev.filter(m => m.id !== userMessage.id))
                setInput(sentMessage)
            } else if (response.status === 503) {
                const errorData = await response.json()
                setModelError({
                    model: errorData.detail?.model || preferredModel,
                    message: errorData.detail?.message || 'Bu model şu anda kullanılamıyor'
                })
                setShowModelError(true)
                setMessages(prev => prev.filter(m => m.id !== userMessage.id))
                setInput(sentMessage)
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

    const handleTemplateClick = (prompt: string) => {
        handleSend(prompt)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    if (showNameModal) {
        return (
            <div className="min-h-screen pt-16 flex items-center justify-center bg-paper relative">
                <div className="absolute inset-0 paper-texture pointer-events-none" />
                <Card className="max-w-md w-full mx-4 paper-texture paper-shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-display">
                            <Sparkles className="w-5 h-5 text-terracotta" />
                            Çoklu Çalışmaya İsim Ver
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-ink-light font-body">
                            {documents.length} döküman seçtiniz. Bu çalışmaya bir isim verin.
                        </p>
                        <Input
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            placeholder="Örn: Yapay Zeka Dersi Notları"
                            autoFocus
                            onKeyPress={(e) => e.key === 'Enter' && createSession()}
                            className="bg-paper-dark border-parchment font-body"
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 border-parchment font-mono-ui"
                                onClick={() => router.push('/dashboard')}
                            >
                                İptal
                            </Button>
                            <Button
                                className="flex-1 bg-ink text-paper hover:bg-ink/90 font-mono-ui"
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
            <div className="min-h-screen pt-16 flex items-center justify-center bg-paper relative">
                <div className="absolute inset-0 paper-texture pointer-events-none" />
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-ink mx-auto mb-4" />
                    <p className="text-ink-light font-display">Yükleniyor...</p>
                </div>
            </div>
        )
    }

    if (documents.length < 2) {
        return (
            <div className="min-h-screen pt-16 flex items-center justify-center bg-paper relative">
                <div className="absolute inset-0 paper-texture pointer-events-none" />
                <Card className="max-w-md w-full mx-4 paper-texture">
                    <CardHeader>
                        <CardTitle className="text-terracotta font-display">Hata</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-ink-light mb-4 font-body">
                            Çoklu döküman çalışması için en az 2 döküman gereklidir.
                        </p>
                        <Link href="/dashboard">
                            <Button className="w-full bg-ink text-paper hover:bg-ink/90 font-mono-ui">Dashboard&apos;a Dön</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen pt-16 bg-paper relative">
            <div className="absolute inset-0 paper-texture pointer-events-none -z-10" />

            {/* Limit Warning Modal */}
            {showLimitModal && (
                <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
                    <Card className="max-w-md w-full animate-in fade-in zoom-in duration-200 paper-texture">
                        <CardHeader className="text-center pb-2">
                            <div className="w-16 h-16 bg-gold/20 rounded-sm flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-gold" />
                            </div>
                            <CardTitle className="text-xl text-ink font-display">Günlük Limit Doldu</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <p className="text-ink-light font-body">
                                Günlük <span className="font-bold text-terracotta">{limitInfo?.limit || 5}</span> sorgu hakkınızı kullandınız.
                            </p>
                            <div className="bg-parchment/50 border border-parchment rounded-sm p-4">
                                <p className="text-sm text-ink-light font-body">
                                    Limitiniz <strong>yarın gece yarısı</strong> sıfırlanacak.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-parchment font-mono-ui"
                                    onClick={() => setShowLimitModal(false)}
                                >
                                    Tamam
                                </Button>
                                <Button
                                    className="flex-1 bg-ink text-paper hover:bg-ink/90 font-mono-ui"
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
            <div className="border-b border-parchment bg-paper/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="hover:bg-parchment">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        {isEditingTitle ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="max-w-xs bg-paper-dark border-parchment font-body"
                                    autoFocus
                                />
                                <Button size="icon" variant="ghost" onClick={updateSessionTitle}>
                                    <Check className="w-4 h-4 text-olive" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)}>
                                    <X className="w-4 h-4 text-terracotta" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-ink flex items-center gap-2 font-display">
                                    <Sparkles className="w-5 h-5 text-terracotta" />
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
                                        <Edit2 className="w-4 h-4 text-ink-light" />
                                    </Button>
                                )}
                            </div>
                        )}
                        <p className="text-sm text-ink-light font-mono-ui">{documents.length} döküman seçili</p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Mobile - Selected Documents Toggle */}
                    <div className="lg:hidden">
                        <Button 
                            variant="outline" 
                            className="w-full flex justify-between items-center bg-paper border-parchment font-mono-ui"
                            onClick={() => setShowMobileDocs(!showMobileDocs)}
                        >
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-terracotta" />
                                <span className="font-medium">Seçili Dökümanlar ({documents.length})</span>
                            </div>
                            {showMobileDocs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        
                        <AnimatePresence>
                            {showMobileDocs && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden mt-2"
                                >
                                    <Card className="border-parchment">
                                        <CardContent className="space-y-2 p-4 max-h-[30vh] overflow-y-auto">
                                            {documents.map((doc, index) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center gap-3 p-2 rounded-sm bg-paper-dark border border-parchment"
                                                >
                                                    <div className="w-6 h-6 rounded-sm bg-ink flex items-center justify-center text-paper text-xs font-bold shrink-0 font-mono-ui">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-ink truncate font-display">
                                                            {doc.title}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Sidebar - Selected Documents (Desktop) */}
                    <div className="hidden lg:block lg:col-span-1">
                        <Card className="sticky top-24 bg-paper border-parchment paper-shadow-lg paper-fold">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-ink-light flex items-center gap-2 font-mono-ui">
                                    <FileText className="w-4 h-4" />
                                    Seçili Dökümanlar
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                                {documents.map((doc, index) => (
                                    <div
                                        key={doc.id}
                                        className="flex items-center gap-3 p-3 rounded-sm bg-paper-dark border border-parchment hover:border-terracotta/30 transition-all"
                                    >
                                        <div className="w-8 h-8 rounded-sm bg-ink flex items-center justify-center text-paper text-sm font-bold shrink-0 font-mono-ui">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-ink truncate font-display">
                                                {doc.title}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Chat Area */}
                    <div className="lg:col-span-3">
                        <Card className="h-[calc(100dvh-180px)] flex flex-col overflow-hidden border-parchment">
                            {/* Messages */}
                            <ScrollArea className="flex-1 p-4 min-h-0" ref={scrollRef}>
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                                        <div className="w-20 h-20 bg-ink rounded-sm flex items-center justify-center mb-6">
                                            <Sparkles className="w-10 h-10 text-paper" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-ink mb-2 font-display">
                                            {sessionTitle}
                                        </h2>
                                        <p className="text-ink-light max-w-md mb-6 font-body">
                                            Seçtiğiniz {documents.length} döküman üzerinden soru sorabilirsiniz.
                                            AI, tüm kaynaklardaki bilgileri birleştirerek size kapsamlı cevaplar verecek.
                                        </p>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            <Button variant="outline" size="sm" onClick={() => setInput("Bu dökümanları karşılaştır")} className="border-parchment font-mono-ui text-xs">
                                                Karşılaştır
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setInput("Bu konuları özetle")} className="border-parchment font-mono-ui text-xs">
                                                Özetle
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setInput("Ortak noktaları ve farklılıkları göster")} className="border-parchment font-mono-ui text-xs">
                                                Benzerlikler/Farklılıklar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {messages.map((msg) => (
                                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-sm px-4 py-3 ${msg.sender === 'user'
                                                    ? 'bg-ink text-paper'
                                                    : 'bg-paper-dark border border-parchment text-ink'
                                                    }`}>
                                                    {msg.sender === 'ai' ? (
                                                        <div className="prose prose-sm max-w-none overflow-hidden break-words font-body">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {msg.message}
                                                            </ReactMarkdown>
                                                        </div>
                                                    ) : (
                                                        <p className="font-body">{msg.message}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {isLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-paper-dark border border-parchment rounded-sm px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 bg-terracotta rounded-full ink-drop-1" />
                                                        <div className="w-2 h-2 bg-terracotta rounded-full ink-drop-2" />
                                                        <div className="w-2 h-2 bg-terracotta rounded-full ink-drop-3" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>

                            {/* Input Area */}
                            <div className="border-t border-parchment p-4 bg-paper/50">
                                <div className="flex gap-2 items-center">
                                    <div className="flex items-center gap-2 rounded-sm border border-parchment bg-paper-dark px-3 py-2 text-sm font-medium text-ink-light font-mono-ui">
                                        <Zap className={`w-4 h-4 ${preferredModel === 'gemma' ? 'text-lavender' : 'text-olive'}`} />
                                        <span className="hidden sm:inline">{preferredModel === 'deepseek' ? 'DeepSeek' : 'Gemma'}</span>
                                    </div>

                                    <div className="relative shrink-0" ref={templateDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                                            className="group rounded-sm p-2 bg-paper-dark border border-parchment transition-all hover:bg-parchment/50 hover:border-terracotta/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40"
                                            aria-label="Şablonlar"
                                            aria-expanded={showTemplateDropdown}
                                            aria-haspopup="menu"
                                        >
                                            <Lightbulb
                                                size={18}
                                                className="text-gold group-hover:text-gold/80 transition-colors"
                                                strokeWidth={2}
                                            />
                                        </button>

                                        <AnimatePresence>
                                            {showTemplateDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                                    className="absolute left-0 bottom-full mb-2 w-56 rounded-sm border border-parchment bg-paper py-1.5 paper-shadow-lg z-50"
                                                    role="menu"
                                                >
                                                    {PROMPT_TEMPLATES.map((template, index) => (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            onClick={() => {
                                                                handleTemplateClick(template.prompt)
                                                                setShowTemplateDropdown(false)
                                                            }}
                                                            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-ink transition-all hover:bg-paper-dark font-body"
                                                            role="menuitem"
                                                        >
                                                            <template.icon className={`w-4 h-4 ${template.color}`} />
                                                            <span>{template.label}</span>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Tüm dökümanlardan soru sorun..."
                                        disabled={isLoading || !sessionId}
                                        className="flex-1 bg-paper-dark border-parchment font-body"
                                    />
                                    <Button
                                        onClick={() => handleSend()}
                                        disabled={!input.trim() || isLoading || !sessionId}
                                        className="bg-ink text-paper hover:bg-ink/90 font-mono-ui"
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
            <div className="min-h-screen pt-16 flex items-center justify-center bg-paper relative">
                <div className="absolute inset-0 paper-texture pointer-events-none" />
                <Loader2 className="w-12 h-12 animate-spin text-ink" />
            </div>
        }>
            <MultiChatContent />
        </Suspense>
    )
}
