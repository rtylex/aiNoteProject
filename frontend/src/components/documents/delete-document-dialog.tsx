'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useState } from "react"

interface DeleteDocumentDialogProps {
    documentId: string
    documentTitle: string
    onDelete: (id: string) => Promise<void>
}

export function DeleteDocumentDialog({ documentId, documentTitle, onDelete }: DeleteDocumentDialogProps) {
    const [open, setOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        setDeleting(true)
        try {
            await onDelete(documentId)
            setOpen(false)
        } catch (error) {
            console.error("Delete failed", error)
        } finally {
            setDeleting(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 hover:bg-red-50 hover:text-red-600"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setOpen(true)
                    }}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent 
                onClick={(e) => e.stopPropagation()}
                className="max-w-md"
            >
                <AlertDialogHeader className="text-center pb-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Trash2 className="w-8 h-8 text-white" />
                    </div>
                    <AlertDialogTitle className="text-xl text-gray-800">
                        Dökümanı Silmek İstiyor musunuz?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-600 mt-3">
                        Bu işlem <span className="font-semibold text-indigo-600">geri alınamaz</span>. 
                        <span className="font-medium text-gray-800"> &quot;{documentTitle}&quot; </span>
                        dökümanı ve tüm sohbet geçmişi kalıcı olarak silinecektir.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                    <AlertDialogCancel 
                        onClick={(e) => {
                            e.stopPropagation()
                            setOpen(false)
                        }}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-0"
                    >
                        İptal
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25"
                        disabled={deleting}
                    >
                        {deleting ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                </svg>
                                Siliniyor...
                            </span>
                        ) : (
                            "Sil"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}


