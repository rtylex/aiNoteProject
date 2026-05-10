'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChatInterface } from '@/components/chat/chat-interface'
import dynamic from 'next/dynamic'

const PDFViewer = dynamic(() => import('@/components/documents/pdf-viewer').then(mod => mod.PDFViewer), {
    ssr: false,
    loading: () => null
})
import { Button } from "@/components/ui/button"
import { PanelLeftOpen } from 'lucide-react'

interface ChatLayoutProps {
    documentId: string
}

export function ChatLayout({ documentId }: ChatLayoutProps) {
    const [showPdf, setShowPdf] = useState(true)
    const [pdfLoaded, setPdfLoaded] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 768) {
                setShowPdf(false)
            } else {
                setShowPdf(true)
            }
        }
        
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const handlePdfLoadComplete = useCallback(() => {
        setPdfLoaded(true)
    }, [])

    return (
        <div className="flex h-[calc(100dvh-4rem)] pt-16 overflow-hidden bg-paper">
            {/* PDF Viewer Section */}
            <div className={`transition-all duration-300 ease-in-out ${showPdf ? 'md:w-1/2 border-r border-parchment' : 'w-0'} overflow-hidden relative min-w-0 hidden md:block`}>
                <div className="h-full w-full">
                    <PDFViewer documentId={documentId} onHide={() => setShowPdf(false)} onLoadComplete={handlePdfLoadComplete} />
                </div>
            </div>

            {/* Chat Interface Section */}
            <div className={`flex-1 flex flex-col h-full min-w-0 transition-all duration-300 w-full ${showPdf ? 'md:w-1/2' : 'md:w-full'}`}>
                {!pdfLoaded ? (
                    <div className="h-full w-full flex items-center justify-center bg-paper">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative w-12 h-12">
                                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-ink border-r-ink animate-spin"></div>
                                <div className="absolute inset-1 rounded-full border-2 border-transparent border-b-terracotta border-l-terracotta animate-spin" style={{ animationDirection: 'reverse' }}></div>
                            </div>
                            <p className="text-sm font-medium text-ink font-display">
                                Doküman hazırlanıyor...
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {!showPdf && (
                            <div className="p-4 border-b border-parchment flex justify-start">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowPdf(true)}
                                    className="gap-2 border-parchment font-mono-ui text-xs"
                                >
                                    <PanelLeftOpen className="h-4 w-4" />
                                    PDF&apos;i Göster
                                </Button>
                            </div>
                        )}
                        <div className="flex-1 overflow-hidden min-w-0">
                            <ChatInterface documentId={documentId} isFullWidth={!showPdf} />
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
