'use client'

import { useState, useCallback } from 'react'
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

    const handlePdfLoadComplete = useCallback(() => {
        setPdfLoaded(true)
    }, [])

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
            {/* PDF Viewer Section - her zaman render edilir */}
            <div className={`transition-all duration-300 ease-in-out ${showPdf ? 'w-1/2 border-r' : 'w-0'} overflow-hidden relative min-w-0`}>
                <div className="h-full w-full">
                    <PDFViewer documentId={documentId} onHide={() => setShowPdf(false)} onLoadComplete={handlePdfLoadComplete} />
                </div>
            </div>

            {/* Chat Interface Section - PDF yüklenene kadar loading göster */}
            <div className={`flex-1 flex flex-col h-full min-w-0 transition-all duration-300 ${showPdf ? 'w-1/2' : 'w-full'}`}>
                {!pdfLoaded ? (
                    // PDF yüklenirken sağ tarafta da loading göster
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative w-12 h-12">
                                <style>{`
                                    @keyframes spin-gradient {
                                        0% { transform: rotate(0deg); }
                                        100% { transform: rotate(360deg); }
                                    }
                                    .spinner-gradient {
                                        animation: spin-gradient 2s linear infinite;
                                    }
                                `}</style>
                                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-500 spinner-gradient"></div>
                                <div className="absolute inset-1 rounded-full border-2 border-transparent border-b-purple-500 border-l-purple-500 spinner-gradient" style={{ animationDirection: 'reverse' }}></div>
                            </div>
                            <p className="text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                                Doküman hazırlanıyor...
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {!showPdf && (
                            <div className="p-4 border-b flex justify-start">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowPdf(true)}
                                    className="gap-2"
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

