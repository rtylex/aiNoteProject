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
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the document
                        <span className="font-semibold text-foreground"> &quot;{documentTitle}&quot; </span>
                        and all associated chat history.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => {
                        e.stopPropagation()
                        setOpen(false)
                    }}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        disabled={deleting}
                    >
                        {deleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}


