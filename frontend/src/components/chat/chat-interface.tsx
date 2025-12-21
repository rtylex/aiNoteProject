'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, Sparkles, Zap, ChevronDown, Star, Lightbulb, FileText, GraduationCap, ListChecks, HelpCircle, BookOpen } from 'lucide-react'
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

// Prompt templates for DeepSeek cache optimization
const PROMPT_TEMPLATES = [
    { icon: FileText, label: 'Kısaca Özetle', prompt: 'Bu dokümanı kısaca 2-3 paragrafta özetle.', color: 'text-blue-500' },
    { icon: BookOpen, label: 'Detaylı Özetle', prompt: 'Bu dokümanı detaylı bir şekilde özetle. Tüm önemli noktaları kapsa.', color: 'text-indigo-500' },
    { icon: ListChecks, label: 'Madde Madde', prompt: 'Bu dokümanın ana noktalarını madde madde listele.', color: 'text-emerald-500' },
    { icon: Lightbulb, label: 'Basitçe Açıkla', prompt: 'Bu konuyu basit ve anlaşılır bir şekilde açıkla.', color: 'text-amber-500' },
    { icon: GraduationCap, label: 'Sınav Sorusu', prompt: 'Bu konudan 5 adet sınav sorusu hazırla. Cevaplarını da ver.', color: 'text-purple-500' },
    { icon: HelpCircle, label: 'Çoktan Seçmeli', prompt: 'Bu konudan 5 adet çoktan seçmeli (A/B/C/D) soru hazırla. Doğru cevapları işaretle.', color: 'text-rose-500' },
]

const markdownComponents: Components = {
    pre({ className = '', ...props }) {
        return (
            <pre
                {...props}
                className="rounded-lg bg-muted/80 shadow-inner"
                style={{
                    width: '100%',
                    maxWidth: '100%',
                    padding: '12px',
                    margin: '8px 0',
                    overflow: 'auto',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
                    lineHeight: '1.4'
                }}
            />
        )
    },
    code({ node, inline, className = '', children, ...props }: any) {
        if (inline) {
            return (
                <code
                    {...props}
                    style={{
                        display: 'inline',
                        backgroundColor: 'rgba(0, 0, 0, 0.15)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.8em',
                        fontFamily: 'monospace',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word'
                    }}
                >
                    {children}
                </code>
            )
        }
        return (
            <code
                {...props}
                style={{
                    display: 'block',
                    width: '100%',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    overflowWrap: 'break-word'
                }}
            >
                {children}
            </code>
        )
    },
    table({ className, ...props }) {
        return (
            <div style={{ width: '100%', maxWidth: '100%', overflow: 'auto', margin: '8px 0', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }} {...props} />
            </div>
        )
    },
    th({ className, ...props }) {
        return (
            <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.1)', backgroundColor: 'rgba(0,0,0,0.05)', fontWeight: 600, wordBreak: 'break-word' }} {...props} />
        )
    },
    td({ className, ...props }) {
        return (
            <td style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.1)', wordBreak: 'break-word' }} {...props} />
        )
    },
    img({ className, ...props }) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', margin: '8px 0', display: 'block' }} {...props} alt={props.alt || ''} />
        )
    },
    h1({ children }) {
        return <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '12px 0 8px 0', wordBreak: 'break-word' }}>{children}</h1>
    },
    h2({ children }) {
        return <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '12px 0 8px 0', wordBreak: 'break-word' }}>{children}</h2>
    },
    h3({ children }) {
        return <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '10px 0 6px 0', wordBreak: 'break-word' }}>{children}</h3>
    },
    h4({ children }) {
        return <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '8px 0 4px 0', wordBreak: 'break-word' }}>{children}</h4>
    },
    h5({ children }) {
        return <h5 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '8px 0 4px 0', wordBreak: 'break-word' }}>{children}</h5>
    },
    h6({ children }) {
        return <h6 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '8px 0 4px 0', wordBreak: 'break-word' }}>{children}</h6>
    },
    p({ children }) {
        return <p style={{ margin: '0 0 8px 0', wordBreak: 'break-word', lineHeight: '1.5' }}>{children}</p>
    },
    strong({ children }) {
        return <strong style={{ fontWeight: 700, wordBreak: 'break-word' }}>{children}</strong>
    },
    em({ children }) {
        return <em style={{ fontStyle: 'italic', wordBreak: 'break-word' }}>{children}</em>
    },
    ul({ children }) {
        return <ul style={{ margin: '8px 0', paddingLeft: '20px', wordBreak: 'break-word' }}>{children}</ul>
    },
    ol({ children }) {
        return <ol style={{ margin: '8px 0', paddingLeft: '20px', wordBreak: 'break-word' }}>{children}</ol>
    },
    li({ children }) {
        return <li style={{ margin: '4px 0', wordBreak: 'break-word' }}>{children}</li>
    },
    blockquote({ children }) {
        return <blockquote style={{ borderLeft: '4px solid rgba(0,0,0,0.2)', paddingLeft: '12px', margin: '8px 0', fontStyle: 'italic', opacity: 0.8, wordBreak: 'break-word' }}>{children}</blockquote>
    },
    hr() {
        return <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid rgba(0,0,0,0.1)' }} />
    },
    a({ href, children }) {
        return <a href={href} style={{ color: '#3b82f6', textDecoration: 'underline', wordBreak: 'break-word' }} target="_blank" rel="noopener noreferrer">{children}</a>
    },
}

const normalizeMessage = (text: string) => {
    // Only normalize Windows line endings and excessive blank lines
    // DO NOT remove single newlines - they are important for markdown formatting
    return text
        .replace(/\r\n/g, '\n')           // Windows → Unix line endings
        .replace(/\n{4,}/g, '\n\n\n');    // Max 3 consecutive newlines
};

const bubbleWidthStyle = { maxWidth: 'min(640px, calc(100% - 2rem))' };

export function ChatInterface({ documentId, sessionId, isFullWidth = false }: { documentId: string, sessionId?: string, isFullWidth?: boolean }) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId)
    const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('completed')
    const bottomRef = useRef<HTMLDivElement>(null)
    const { accessToken } = useAuth()

    // Limit modal state
    const [showLimitModal, setShowLimitModal] = useState(false)
    const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null)

    // Model error state
    const [showModelError, setShowModelError] = useState(false)
    const [modelError, setModelError] = useState<ModelError | null>(null)

    // Template dropdown state
    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false)
    const templateDropdownRef = useRef<HTMLDivElement>(null)

    // AI Model selection - default to DeepSeek (economic)
    const [selectedModel, setSelectedModel] = useState<'gemini' | 'deepseek'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('yirik-ai-model')
            return (saved === 'gemini' || saved === 'deepseek') ? saved : 'deepseek'
        }
        return 'deepseek'
    })
    const [showModelDropdown, setShowModelDropdown] = useState(false)
    const modelDropdownRef = useRef<HTMLDivElement>(null)

    // Save model preference to localStorage
    useEffect(() => {
        localStorage.setItem('yirik-ai-model', selectedModel)
    }, [selectedModel])

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
                setShowModelDropdown(false)
            }
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

    // Check document status and poll if processing
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

                    // Stop polling if document is ready or failed
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

        // Initial check
        checkDocumentStatus()

        // Poll every 2 seconds if not completed
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
                    model: selectedModel
                })
            })

            if (res.status === 429) {
                // Rate limit exceeded - show popup
                const errorData = await res.json()
                setLimitInfo({
                    remaining: 0,
                    limit: errorData.detail?.limit || 5
                })
                setShowLimitModal(true)
                // Remove the user message since it wasn't processed
                setMessages(prev => prev.filter(m => m.id !== userMsg.id))
                setInput(sentMessage) // Restore the input
                return
            }

            if (res.status === 503) {
                // Model unavailable - show error modal
                const errorData = await res.json()
                setModelError({
                    model: errorData.detail?.model || selectedModel,
                    message: errorData.detail?.message || 'Bu model şu anda kullanılamıyor'
                })
                setShowModelError(true)
                // Remove the user message since it wasn't processed
                setMessages(prev => prev.filter(m => m.id !== userMsg.id))
                setInput(sentMessage) // Restore the input
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

    // Handle template click
    const handleTemplateClick = (prompt: string) => {
        handleSend(prompt)
    }

    return (
        <div className="flex flex-col h-full bg-background min-w-0">
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
                                Günlük <span className="font-bold text-primary">{limitInfo?.limit || 5}</span> sorgu hakkınızı kullandınız.
                            </p>
                            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
                                <p className="text-sm text-orange-700">
                                    🕐 Limitiniz <strong>yarın gece yarısı</strong> sıfırlanacak.
                                </p>
                            </div>
                            <p className="text-sm text-gray-500">
                                Daha fazla sorgu hakkı için premium plana geçebilirsiniz.
                            </p>
                            <Button
                                className="w-full"
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="max-w-md w-full animate-in fade-in zoom-in duration-200">
                        <CardHeader className="text-center pb-2">
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle className="text-xl text-gray-800">Model Kullanılamıyor</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <p className="text-gray-600">
                                <span className="font-bold">{modelError.model}</span> modeli şu anda kullanılamıyor.
                            </p>
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-600">
                                    💡 Farklı bir model seçerek devam edebilirsiniz.
                                </p>
                            </div>
                            <Button
                                className="w-full"
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
                                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                                        <p className="text-lg font-medium text-muted-foreground">Doküman hazırlanıyor...</p>
                                        <p className="text-sm text-muted-foreground">OCR işlemi tamamlandığında sohbete başlayabilirsiniz.</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-4">
                                            <Lightbulb className="w-8 h-8 text-primary" />
                                        </div>
                                        <p className="text-lg font-medium mb-2">Bu dokümanla ne yapmak istersin?</p>
                                        <p className="text-sm text-muted-foreground mb-6">Hazır şablonlardan birini seç veya kendi sorunuzu yazın.</p>

                                        {/* Prompt Templates Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg">
                                            {PROMPT_TEMPLATES.map((template, index) => (
                                                <motion.button
                                                    key={index}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    onClick={() => handleTemplateClick(template.prompt)}
                                                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-background/80 hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 text-left group"
                                                >
                                                    <template.icon className={`w-5 h-5 ${template.color} group-hover:scale-110 transition-transform`} />
                                                    <span className="text-xs font-medium text-center">{template.label}</span>
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
                                            <AvatarFallback className={msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                                                {msg.sender === 'user' ? 'S' : 'AI'}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0" style={{ maxWidth: bubbleMaxWidth }}>
                                            <div className={`w-full min-w-0 p-4 rounded-2xl shadow-sm overflow-x-hidden overflow-y-visible ${msg.sender === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                : 'bg-muted/50 border rounded-tl-none'
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
                                                    <p className="whitespace-pre-wrap break-words overflow-hidden">{displayMessage}</p>
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
                                        <AvatarFallback className="bg-muted">AI</AvatarFallback>
                                    </Avatar>
                                    <div className="bg-muted/50 border p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                                        <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                </ScrollArea>
            </div >

            <div className="p-4 bg-background border-t">
                <div className="max-w-full mx-auto">
                    {(documentStatus === 'pending' || documentStatus === 'processing') ? (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                <span className="text-sm font-medium">
                                    Doküman hazırlanıyor...
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                OCR işlemi devam ediyor, birkaç saniye içinde sohbete başlayabilirsiniz.
                            </p>
                        </div>
                    ) : documentStatus === 'failed' ? (
                        <div className="flex flex-col items-center gap-2 py-4">
                            <p className="text-sm text-destructive font-medium">
                                Doküman işlenirken bir hata oluştu.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Lütfen dokümanı tekrar yüklemeyi deneyin.
                            </p>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="relative flex items-center gap-2">
                                {/* Model Selection Dropdown */}
                                <div className="relative shrink-0" ref={modelDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                                        className="flex items-center gap-2 rounded-xl border border-border/30 bg-background/80 px-3 py-2 text-sm font-medium text-foreground/80 transition hover:border-border/50 hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                        aria-label="AI model seç"
                                        aria-expanded={showModelDropdown}
                                        aria-haspopup="listbox"
                                    >
                                        {selectedModel === 'deepseek' ? (
                                            <Zap className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <Sparkles className="w-4 h-4 text-violet-500" />
                                        )}
                                        <span className="hidden sm:inline">
                                            {selectedModel === 'deepseek' ? 'DeepSeek' : 'Gemini'}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-foreground/50 transition-transform duration-200 ${showModelDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {showModelDropdown && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                                className="absolute left-0 bottom-full mb-2 w-48 rounded-xl border border-border/40 bg-background/95 py-1.5 shadow-lg backdrop-blur-xl z-50"
                                                role="listbox"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedModel('deepseek')
                                                        setShowModelDropdown(false)
                                                    }}
                                                    className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-all ${selectedModel === 'deepseek'
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                                                        : 'text-foreground/80 hover:bg-muted/50'
                                                        }`}
                                                    role="option"
                                                    aria-selected={selectedModel === 'deepseek'}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Zap className="w-4 h-4" />
                                                        <div className="text-left">
                                                            <div className="font-medium">DeepSeek</div>
                                                            <div className="text-xs opacity-60">Ekonomik</div>
                                                        </div>
                                                    </div>
                                                    {selectedModel === 'deepseek' && (
                                                        <Star className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedModel('gemini')
                                                        setShowModelDropdown(false)
                                                    }}
                                                    className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-all ${selectedModel === 'gemini'
                                                        ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
                                                        : 'text-foreground/80 hover:bg-muted/50'
                                                        }`}
                                                    role="option"
                                                    aria-selected={selectedModel === 'gemini'}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4" />
                                                        <div className="text-left">
                                                            <div className="font-medium">Gemini</div>
                                                            <div className="text-xs opacity-60">Yüksek Kalite</div>
                                                        </div>
                                                    </div>
                                                    {selectedModel === 'gemini' && (
                                                        <Star className="w-3.5 h-3.5 text-violet-500 fill-violet-500" />
                                                    )}
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Template Dropdown Button */}
                                <div className="relative shrink-0" ref={templateDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                                        className="group rounded-xl p-2 bg-background/80 border border-border/30 transition-all hover:bg-muted/50 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                        aria-label="Şablonlar"
                                        aria-expanded={showTemplateDropdown}
                                        aria-haspopup="menu"
                                    >
                                        <Lightbulb
                                            size={18}
                                            className="text-amber-500 group-hover:text-amber-600 transition-colors"
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
                                                className="absolute left-0 bottom-full mb-2 w-56 rounded-xl border border-border/40 bg-background/95 py-1.5 shadow-lg backdrop-blur-xl z-50"
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
                                                        className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-foreground/80 transition-all hover:bg-muted/50"
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
                                        className="pr-20 py-6 rounded-full shadow-sm border-muted-foreground/20 focus-visible:ring-primary/20"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={loading || !input.trim()}
                                        size="sm"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-4"
                                    >
                                        Gönder
                                    </Button>
                                </div>
                            </form>
                            <p className="text-xs text-center text-muted-foreground mt-2">
                                AI hatalar yapabilir. Önemli bilgileri kontrol edin.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div >
    )
}




