'use client'

import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL } from '@/lib/api-config'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, PanelLeftClose, RefreshCw } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useAuth } from '@/lib/auth-context'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
    documentId: string
    onHide?: () => void
    onLoadComplete?: () => void
}

export function PDFViewer({ documentId, onHide, onLoadComplete }: PDFViewerProps) {
    const [fileUrl, setFileUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pdfError, setPdfError] = useState<boolean>(false)
    const [pdfLoading, setPdfLoading] = useState<boolean>(true) // PDF Document yükleme durumu
    const [numPages, setNumPages] = useState<number>(0)
    const [pageNumber, setPageNumber] = useState<number>(1)
    const [scale, setScale] = useState<number>(1.0)
    const [rotation, setRotation] = useState<number>(0)
    const { accessToken } = useAuth()

    const fetchDocument = useCallback(async (signal?: AbortSignal) => {
        if (!documentId) return

        // Wait for accessToken to be available
        if (!accessToken) {
            console.warn("Access token not available yet")
            return
        }

        try {
            setLoading(true)
            setError(null)
            setPdfError(false)

            const res = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                signal
            })

            if (!res.ok) {
                const errorData = await res.text()
                console.error(`API Error (${res.status}):`, errorData)
                throw new Error(`Failed to fetch document: ${res.status}`)
            }

            const data = await res.json()
            setFileUrl(data.file_url)
            setError(null)
        } catch (err) {
            // Don't set error if request was aborted
            if (err instanceof DOMException && err.name === 'AbortError') {
                return
            }
            console.error("Document fetch error:", err)
            setError("Belge yüklenemedi. Lütfen tekrar deneyin.")
            setFileUrl(null)
        } finally {
            setLoading(false)
        }
    }, [documentId, accessToken])

    useEffect(() => {
        const controller = new AbortController()
        fetchDocument(controller.signal)

        return () => {
            controller.abort()
        }
    }, [fetchDocument])

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages)
        setPageNumber(1)
        setPdfError(false)
        setPdfLoading(false)
        onLoadComplete?.()
    }

    function onDocumentLoadError(error: Error) {
        console.error("PDF load error:", error)
        setPdfError(true)
        setPdfLoading(false)
    }

    const changePage = (offset: number) => {
        setPageNumber(prevPageNumber => Math.min(Math.max(1, prevPageNumber + offset), numPages))
    }

    const changeScale = (delta: number) => {
        setScale(prevScale => Math.min(Math.max(0.5, prevScale + delta), 2.5))
    }

    // API yükleniyor veya fileUrl henüz gelmedi ise loading göster
    if (loading || !fileUrl) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
                <style>{`
                    @keyframes spin-gradient {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes pulse-ring {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                    .spinner-gradient {
                        animation: spin-gradient 2s linear infinite;
                    }
                    .pulse-ring {
                        animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    }
                `}</style>
                <div className="flex flex-col items-center gap-6">
                    {/* Animated Spinner */}
                    <div className="relative w-16 h-16">
                        {/* Outer ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-500 spinner-gradient"></div>
                        {/* Middle ring */}
                        <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-purple-500 border-l-purple-500 spinner-gradient" style={{ animationDirection: 'reverse' }}></div>
                        {/* Inner circle */}
                        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                        </div>
                    </div>

                    {/* Text with gradient */}
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                            PDF Yükleniyor
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Lütfen bekleyin...
                        </p>
                    </div>

                    {/* Progress dots */}
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                </div>
            </div>
        )
    }

    // Sadece gerçek bir hata varsa hata ekranını göster
    // fileUrl henüz yüklenmediyse ama hata da yoksa, loading gösterilecek
    if (error || pdfError) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                        {error || (pdfError ? "PDF dosyası yüklenemedi" : "PDF yüklenemedi")}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs text-center">
                        {pdfError
                            ? "PDF sunucuya erişilemiyor. Bağlantınızı kontrol edin."
                            : "Ağ bağlantınızı kontrol edip tekrar deneyin."}
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchDocument(undefined)}
                        className="mt-2"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Tekrar Dene
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full w-full flex flex-col bg-gray-100/50">
            <div className="flex items-center justify-between p-2 border-b bg-white shadow-sm z-10">
                <div className="flex items-center gap-2">
                    {onHide && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onHide}
                            className="h-8 w-8 mr-2 text-muted-foreground hover:text-foreground"
                            title="PDF&apos;i Gizle"
                        >
                            <PanelLeftClose className="h-4 w-4" />
                        </Button>
                    )}
                    <div className="h-4 w-px bg-border mr-2" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => changePage(-1)}
                        disabled={pageNumber <= 1}
                        className="h-8 w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[3rem] text-center">
                        {pageNumber} / {numPages || '--'}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => changePage(1)}
                        disabled={pageNumber >= numPages}
                        className="h-8 w-8"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => changeScale(-0.1)}
                        className="h-8 w-8"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[3rem] text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => changeScale(0.1)}
                        className="h-8 w-8"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRotation(prev => (prev + 90) % 360)}
                        className="h-8 w-8"
                    >
                        <RotateCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto flex justify-center p-4 bg-gray-100/50">
                <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                        <div className="flex flex-col items-center gap-4 mt-10">
                            <style>{`
                                @keyframes spin-gradient {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                                .spinner-gradient {
                                    animation: spin-gradient 2s linear infinite;
                                }
                            `}</style>
                            <div className="relative w-12 h-12">
                                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-500 spinner-gradient"></div>
                                <div className="absolute inset-1 rounded-full border-2 border-transparent border-b-purple-500 border-l-purple-500 spinner-gradient" style={{ animationDirection: 'reverse' }}></div>
                            </div>
                            <span className="text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                                Sayfalar hazırlanıyor...
                            </span>
                        </div>
                    }
                    error={
                        <div className="mt-10 flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-foreground">PDF yüklenirken hata oluştu</p>
                        </div>
                    }
                    className="shadow-lg"
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        rotate={rotation}
                        className="bg-white shadow-md"
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                    />
                </Document>
            </div>
        </div>
    )
}

