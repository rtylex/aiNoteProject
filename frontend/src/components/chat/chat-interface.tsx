'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, Zap, Lightbulb, FileText, GraduationCap, ListChecks, HelpCircle, BookOpen } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed'

interface Message {
    id: number | string
    sender: 'user' | 'ai'
    message: string
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
    { icon: FileText, label: 'Kısaca Özetle', prompt: 'Bu dokümanı kısaca 2-3 paragrafta özetle.', color: 'text-terracotta', bg: 'bg-terracotta/10' },
    { icon: BookOpen, label: 'Detaylı Özetle', prompt: 'Bu dokümanı detaylı bir şekilde özetle. Tüm önemli noktaları kapsa.', color: 'text-ink', bg: 'bg-ink/5' },
    { icon: ListChecks, label: 'Madde Madde', prompt: 'Bu dokümanın ana noktalarını madde madde listele.', color: 'text-olive', bg: 'bg-olive/10' },
    { icon: Lightbulb, label: 'Basitçe Açıkla', prompt: 'Bu konuyu basit ve anlaşılır bir şekilde açıkla.', color: 'text-gold', bg: 'bg-gold/10' },
    { icon: GraduationCap, label: 'Sınav Sorusu', prompt: 'Bu konudan 5 adet sınav sorusu hazırla. Cevaplarını da ver.', color: 'text-lavender', bg: 'bg-lavender/10' },
    { icon: HelpCircle, label: 'Çoktan Seçmeli', prompt: 'Bu konudan 5 adet çoktan seçmeli (A/B/C/D) soru hazırla. Doğru cevapları işaretle.', color: 'text-terracotta', bg: 'bg-terracotta/10' },
]

const markdownComponents: Components = {
    pre({ className = '', ...props }) {
        return (
            <div className="w-full overflow-x-auto my-2 rounded-sm bg-paper-dark shadow-inner border border-parchment">
                <pre
                    {...props}
                    className="p-3 text-[10px] sm:text-xs font-mono break-normal whitespace-pre"
                    style={{ lineHeight: '1.4' }}
                />
            </div>
        )
    },
    code({ node, inline, className = '', children, ...props }: any) {
        if (inline) {
            return (
                <code
                    {...props}
                    className="bg-parchment px-1.5 py-0.5 rounded-sm text-[0.8em] font-mono break-all"
                >
                    {children}
                </code>
            )
        }
        return (
            <code
                {...props}
                className="block w-full text-[10px] sm:text-xs font-mono break-all"
            >
                {children}
            </code>
        )
    },
    table({ className, ...props }) {
        return (
            <div className="w-full overflow-x-auto my-2 rounded-sm border border-parchment">
                <table className="w-full border-collapse text-[10px] sm:text-xs" {...props} />
            </div>
        )
    },
    th({ className, ...props }) {
        return (
            <th className="p-2 text-left border-b border-parchment bg-paper-dark font-semibold" {...props} />
        )
    },
    td({ className, ...props }) {
        return (
            <td className="p-2 text-left border-b border-parchment break-words" {...props} />
        )
    },
    img({ className, ...props }) {
        return (
            <img className="max-w-full h-auto rounded-sm my-2 block" {...props} alt={props.alt || ''} />
        )
    },
    h1({ children }) {
        return <h1 className="text-lg sm:text-xl font-bold mt-4 mb-2 break-words font-display">{children}</h1>
    },
    h2({ children }) {
        return <h2 className="text-base sm:text-lg font-bold mt-3 mb-2 break-words font-display">{children}</h2>
    },
    h3({ children }) {
        return <h3 className="text-sm sm:text-base font-bold mt-2 mb-1 break-words font-display">{children}</h3>
    },
    p({ children }) {
        return <p className="mb-2 last:mb-0 leading-relaxed break-words text-sm sm:text-base font-body">{children}</p>
    },
    ul({ children }) {
        return <ul className="my-2 pl-5 list-disc break-words text-sm sm:text-base font-body">{children}</ul>
    },
    ol({ children }) {
        return <ol className="my-2 pl-5 list-decimal break-words text-sm sm:text-base font-body">{children}</ol>
    },
    li({ children }) {
        return <li className="my-1 break-words font-body">{children}</li>
    },
    blockquote({ children }) {
        return <blockquote className="border-l-2 border-terracotta pl-3 my-2 italic opacity-80 break-words font-accent">{children}</blockquote>
    },
}

const normalizeMessage = (text: string) => {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\n{4,}/g, '\n\n\n');
};

const bubbleWidthStyle = { maxWidth: 'min(640px, calc(100% - 2rem))' };

export function ChatInterface({ documentId, sessionId, isFullWidth = false }: { documentId: string, sessionId?: string, isFullWidth?: boolean }) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId)
    const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('completed')
    const bottomRef = useRef<HTMLDivElement>(null)
    const { accessToken, preferredModel } = useAuth()

    const [showLimitModal, setShowLimitModal] = useState(false)
    const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null)

    const [showModelError, setShowModelError] = useState(false)
    const [modelError, setModelError] = useState<ModelError | null>(null)

    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false)
    const templateDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
                setShowTemplateDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const bubbleMaxWidth = isFullWidth ? 'min(900px, calc(100% - 2rem))' : 'min(560px, calc(100% - 2rem))';
    const containerMaxWidth = isFullWidth ? 'max-w-4xl' : 'max-w-[560px]';

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    useEffect(() => {
        if (!documentId || !accessToken) return

        let intervalId: NodeJS.Timeout | null = null

        const checkDocumentStatus = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                })
                if (res.ok) {
                    const doc = await res.json()
                    setDocumentStatus(doc.status as DocumentStatus)

                    if (doc.status === 'completed' || doc.status === 'failed') {
                        if (intervalId) {
                            clearInterval(intervalId)
                            intervalId = null
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to check document status", e)
            }
        }

        checkDocumentStatus()
        intervalId = setInterval(checkDocumentStatus, 2000)

        return () => {
            if (intervalId) clearInterval(intervalId)
        }
    }, [documentId, accessToken])

    useEffect(() => {
        const fetchHistory = async () => {
            if (!documentId || !accessToken) return

            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/chat/history/${documentId}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                })

                if (res.ok) {
                    const data = await res.json()
                    if (data.session_id) {
                        setCurrentSessionId(data.session_id)
                        setMessages(data.messages.map((msg: { id: string; sender: 'user' | 'ai'; message: string }) => ({
                            id: msg.id,
                            sender: msg.sender,
                            message: msg.message
                        })))
                    }
                }
            } catch (e) {
                console.error("Failed to fetch history", e)
            }
        }

        fetchHistory()
    }, [documentId, accessToken])

    const handleSend = async (promptOverride?: string) => {
        const messageToSend = promptOverride || input
        if (!messageToSend.trim() || !accessToken) return

        const userMsg: Message = { id: Date.now(), sender: 'user', message: messageToSend }
        const sentMessage = messageToSend
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    document_id: documentId,
                    message: sentMessage,
                    session_id: currentSessionId,
                    model: preferredModel
                })
            })

            if (res.status === 429) {
                const errorData = await res.json()
                setLimitInfo({
                    remaining: 0,
                    limit: errorData.detail?.limit || 5
                })
                setShowLimitModal(true)
                setMessages(prev => prev.filter(m => m.id !== userMsg.id))
                setInput(sentMessage)
                return
            }

            if (res.status === 503) {
                const errorData = await res.json()
                setModelError({
                    model: errorData.detail?.model || preferredModel,
                    message: errorData.detail?.message || 'Bu model şu anda kullanılamıyor'
                })
                setShowModelError(true)
                setMessages(prev => prev.filter(m => m.id !== userMsg.id))
                setInput(sentMessage)
                return
            }

            if (!res.ok) {
                const errorData = await res.json()
                console.error("Backend Error:", errorData)
                throw new Error(typeof errorData.detail === 'string' ? errorData.detail : errorData.detail?.message || 'Failed to send message')
            }

            const data = await res.json()
            setCurrentSessionId(data.session_id)

            const aiMsg: Message = { id: Date.now() + 1, sender: 'ai', message: data.message }
            setMessages(prev => [...prev, aiMsg])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleTemplateClick = (prompt: string) => {
        handleSend(prompt)
    }

    return (
        <div className="flex flex-col h-full bg-paper min-w-0">
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
                            <Button
                                className="w-full bg-ink text-paper hover:bg-ink/90 font-mono-ui"
                                onClick={() => setShowLimitModal(false)}
                            >
                                Tamam
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Model Error Modal */}
            {showModelError && modelError && (
                <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
                    <Card className="max-w-md w-full animate-in fade-in zoom-in duration-200 paper-texture">
                        <CardHeader className="text-center pb-2">
                            <div className="w-16 h-16 bg-parchment rounded-sm flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-ink-light" />
                            </div>
                            <CardTitle className="text-xl text-ink font-display">Model Kullanılamıyor</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <p className="text-ink-light font-body">
                                <span className="font-bold">{modelError.model}</span> modeli şu anda kullanılamıyor.
                            </p>
                            <div className="bg-parchment/50 border border-parchment rounded-sm p-4">
                                <p className="text-sm text-ink-light font-body">
                                    Farklı bir model seçerek devam edebilirsiniz.
                                </p>
                            </div>
                            <Button
                                className="w-full bg-ink text-paper hover:bg-ink/90 font-mono-ui"
                                onClick={() => setShowModelError(false)}
                            >
                                Tamam
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex-1 overflow-hidden relative">
                <ScrollArea className="h-full p-3 md:p-4 min-w-0">
                    <div className="space-y-4 max-w-full mx-auto pb-4 min-w-0">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                                {(documentStatus === 'pending' || documentStatus === 'processing') ? (
                                    <>
                                        <Loader2 className="h-8 w-8 animate-spin text-ink mb-4" />
                                        <p className="text-lg font-medium text-ink-light font-display">Doküman hazırlanıyor...</p>
                                        <p className="text-sm text-ink-light font-body">İşlem tamamlandığında sohbete başlayabilirsiniz.</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-terracotta/10 rounded-sm flex items-center justify-center mb-4">
                                            <Lightbulb className="w-8 h-8 text-terracotta" />
                                        </div>
                                        <p className="text-lg font-medium mb-2 font-display">Bu dokümanla ne yapmak istersin?</p>
                                        <p className="text-sm text-ink-light mb-6 font-body">Hazır şablonlardan birini seç veya kendi sorunuzu yazın.</p>

                                        {/* Prompt Templates Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg">
                                            {PROMPT_TEMPLATES.map((template, index) => (
                                                <motion.button
                                                    key={index}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    onClick={() => handleTemplateClick(template.prompt)}
                                                    className={`flex flex-col items-center gap-2 p-3 rounded-sm border border-parchment ${template.bg} hover:bg-paper-dark hover:border-terracotta/30 transition-all duration-200 text-left group`}
                                                >
                                                    <template.icon className={`w-5 h-5 ${template.color} group-hover:scale-110 transition-transform`} />
                                                    <span className="text-xs font-medium text-center font-mono-ui">{template.label}</span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {messages.map((msg) => {
                            const displayMessage = normalizeMessage(msg.message);
                            return (
                                <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex w-full gap-3 min-w-0 ${containerMaxWidth} ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <Avatar className="h-8 w-8 mt-1 shrink-0">
                                            <AvatarFallback className={msg.sender === 'user' ? 'bg-ink text-paper font-mono-ui' : 'bg-parchment text-ink-light font-mono-ui'}>
                                                {msg.sender === 'user' ? 'S' : 'AI'}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0" style={{ maxWidth: bubbleMaxWidth }}>
                                            <div className={`w-full min-w-0 p-4 rounded-sm shadow-sm overflow-x-hidden overflow-y-visible ${msg.sender === 'user'
                                                ? 'bg-ink text-paper'
                                                : 'bg-paper-dark border border-parchment'
                                                }`}>
                                                {msg.sender === 'ai' ? (
                                                    <div className="w-full min-w-0 overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                                        <style>{`
                                                            [data-ai-content] h1, [data-ai-content] h2, [data-ai-content] h3, [data-ai-content] h4 {
                                                                margin-top: 12px;
                                                                margin-bottom: 8px;
                                                                word-break: break-word;
                                                                overflow-wrap: break-word;
                                                            }
                                                            [data-ai-content] p {
                                                                margin-bottom: 8px;
                                                                word-break: break-word;
                                                                overflow-wrap: break-word;
                                                                line-height: 1.5;
                                                            }
                                                            [data-ai-content] pre {
                                                                width: 100% !important;
                                                                max-width: 100% !important;
                                                                overflow-x: auto !important;
                                                                overflow-y: visible !important;
                                                                word-break: break-all !important;
                                                                white-space: pre-wrap !important;
                                                                margin: 8px 0 !important;
                                                                padding: 12px !important;
                                                            }
                                                            [data-ai-content] code {
                                                                word-break: break-word !important;
                                                                overflow-wrap: break-word !important;
                                                            }
                                                            [data-ai-content] table {
                                                                width: 100%;
                                                                border-collapse: collapse;
                                                                margin: 8px 0;
                                                                min-width: 0;
                                                            }
                                                            [data-ai-content] th, [data-ai-content] td {
                                                                padding: 6px 8px;
                                                                word-break: break-word;
                                                                overflow-wrap: break-word;
                                                                max-width: 0;
                                                                min-width: 0;
                                                            }
                                                            [data-ai-content] strong, [data-ai-content] b {
                                                                word-break: break-word;
                                                                overflow-wrap: break-word;
                                                            }
                                                            [data-ai-content] img {
                                                                max-width: 100%;
                                                                height: auto;
                                                                display: block;
                                                                margin: 8px 0;
                                                            }
                                                        `}</style>
                                                        <div data-ai-content style={{ fontSize: '0.875rem', wordBreak: 'break-word' }}>
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                                                {displayMessage}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="whitespace-pre-wrap break-words overflow-hidden font-body">{displayMessage}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="flex gap-3 max-w-[85%]">
                                    <Avatar className="h-8 w-8 mt-1">
                                        <AvatarFallback className="bg-parchment text-ink-light font-mono-ui">AI</AvatarFallback>
                                    </Avatar>
                                    <div className="bg-paper-dark border border-parchment p-4 rounded-sm flex items-center gap-3">
                                        <div className="w-2 h-2 bg-terracotta rounded-full ink-drop-1" />
                                        <div className="w-2 h-2 bg-terracotta rounded-full ink-drop-2" />
                                        <div className="w-2 h-2 bg-terracotta rounded-full ink-drop-3" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                </ScrollArea>
            </div >

            <div className="p-4 bg-paper border-t border-parchment">
                <div className="max-w-full mx-auto">
                    {(documentStatus === 'pending' || documentStatus === 'processing') ? (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <div className="flex items-center gap-3 text-ink-light">
                                <Loader2 className="h-5 w-5 animate-spin text-ink" />
                                <span className="text-sm font-medium font-display">
                                    Doküman hazırlanıyor...
                                </span>
                            </div>
                            <p className="text-xs text-ink-light font-body">
                                Doküman işleniyor, birkaç saniye içinde sohbete başlayabilirsiniz.
                            </p>
                        </div>
                    ) : documentStatus === 'failed' ? (
                        <div className="flex flex-col items-center gap-2 py-4">
                            <p className="text-sm text-terracotta font-medium font-display">
                                Doküman işlenirken bir hata oluştu.
                            </p>
                            <p className="text-xs text-ink-light font-body">
                                Lütfen dokümanı tekrar yüklemeyi deneyin.
                            </p>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="relative flex items-center gap-2">
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

                                <div className="relative flex-1">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Doküman hakkında bir soru sor..."
                                        disabled={loading}
                                        className="pr-20 py-6 rounded-sm shadow-sm border-parchment bg-paper-dark focus-visible:ring-terracotta/20 font-body"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={loading || !input.trim()}
                                        size="sm"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm px-4 bg-ink text-paper hover:bg-ink/90 font-mono-ui"
                                    >
                                        Gönder
                                    </Button>
                                </div>
                            </form>
                            <p className="text-xs text-center text-ink-light mt-2 font-body">
                                AI hatalar yapabilir. Önemli bilgileri kontrol edin.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div >
    )
}
