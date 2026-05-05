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
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

interface DeleteTestDialogProps {
    testId: string
    testTitle: string
    onDelete: (id: string) => void
}

export function DeleteTestDialog({ testId, testTitle, onDelete }: DeleteTestDialogProps) {
    const [open, setOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const { accessToken } = useAuth()

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        setDeleting(true)
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/test/${testId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            if (response.ok) {
                onDelete(testId)
                setOpen(false)
            }
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
                    className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
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
                    <AlertDialogTitle>Testi Sil</AlertDialogTitle>
                    <AlertDialogDescription>
                        Bu işlem geri alınamaz.
                        <span className="font-semibold text-foreground"> &quot;{testTitle}&quot; </span>
                        testi ve tüm soruları kalıcı olarak silinecektir.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => {
                        e.stopPropagation()
                        setOpen(false)
                    }}>İptal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        disabled={deleting}
                    >
                        {deleting ? "Siliniyor..." : "Sil"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}