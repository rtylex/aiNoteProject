'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

import {
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    Users,
    TrendingUp,
    Loader2,
    ShieldAlert,
    ShieldCheck,
    UserCog,
    Globe,
    FolderPlus,
    Pencil,
    Trash2,
    Tags
} from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

interface AdminStats {
    pending_count: number
    approved_today_count: number
    total_documents: number
    total_public_documents: number
    total_users: number
}

interface PendingDocument {
    id: string
    title: string
    course_name: string | null
    topic: string | null
    user_id: string
    file_url: string
    created_at: string
    status: string
}

interface UserProfile {
    id: string
    user_id: string
    full_name: string | null
    email: string | null
    role: string
    created_at: string
}

interface Category {
    id: string
    name: string
    description: string | null
    is_active: boolean
    created_at: string
    document_count: number
}

type AccessState = 'loading' | 'denied' | 'granted' | 'setup_needed'

export default function AdminPage() {
    const [accessState, setAccessState] = useState<AccessState>('loading')
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([])
    const [communityDocs, setCommunityDocs] = useState<PendingDocument[]>([])
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [previewDoc, setPreviewDoc] = useState<PendingDocument | null>(null)
    const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<PendingDocument | null>(null)
    const [setupLoading, setSetupLoading] = useState(false)
    const [categories, setCategories] = useState<Category[]>([])
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '' })
    const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<Category | null>(null)
    const { accessToken } = useAuth()

    const checkAccess = useCallback(async () => {
        if (!accessToken) {
            setAccessState('denied')
            return
        }

        try {
            const setupResponse = await fetch(`${API_BASE_URL}/api/v1/setup/status`)

            if (!setupResponse.ok) {
                console.error('Setup status check failed:', setupResponse.status)
                setAccessState('setup_needed')
                return
            }

            const setupData = await setupResponse.json()

            if (setupData.setup_needed) {
                setAccessState('setup_needed')
                return
            }

            const response = await fetch(`${API_BASE_URL}/api/v1/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })

            if (response.ok) {
                setAccessState('granted')
                const data = await response.json()
                setStats(data)
            } else if (response.status === 403) {
                setAccessState('denied')
            } else {
                console.error('Admin stats check failed:', response.status)
                setAccessState('denied')
            }
        } catch (error) {
            console.error('Error checking access:', error)
            setAccessState('setup_needed')
        }
    }, [accessToken])

    const handleSetup = async () => {
        if (!accessToken) return
        setSetupLoading(true)

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/setup/make-me-admin`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })

            if (response.ok) {
                window.location.reload()
            } else {
                const data = await response.json()
                alert(data.detail || 'Kurulum başarısız')
            }
        } catch (error) {
            console.error('Setup error:', error)
            alert('Kurulum sırasında hata oluştu. Backend çalıştığından emin olun.')
        } finally {
            setSetupLoading(false)
        }
    }

    const fetchStats = useCallback(async () => {
        if (!accessToken) return
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            if (response.ok) {
                const data = await response.json()
                setStats(data)
            }
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }, [accessToken])

    const fetchPendingDocs = useCallback(async () => {
        if (!accessToken) return
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE_URL}/api/v1/admin/documents/pending`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            if (response.ok) {
                const data = await response.json()
                setPendingDocs(data)
            }
        } catch (error) {
            console.error('Error fetching pending docs:', error)
        } finally {
            setLoading(false)
        }
    }, [accessToken])

    const fetchUsers = useCallback(async () => {
        if (!accessToken) return
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            if (response.ok) {
                const data = await response.json()
                setUsers(data)
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        }
    }, [accessToken])

    const fetchCommunityDocs = useCallback(async () => {
        if (!accessToken) return
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/public?limit=100`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            if (response.ok) {
                const data = await response.json()
                setCommunityDocs(data)
            }
        } catch (error) {
            console.error('Error fetching community docs:', error)
        }
    }, [accessToken])

    const fetchCategories = useCallback(async () => {
        if (!accessToken) return
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/admin/categories?include_inactive=true`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            if (response.ok) {
                const data = await response.json()
                setCategories(data)
            }
        } catch (error) {
            console.error('Error fetching categories:', error)
        }
    }, [accessToken])

    useEffect(() => {
        checkAccess()
    }, [checkAccess])

    useEffect(() => {
        if (accessState === 'granted') {
            fetchPendingDocs()
            fetchUsers()
            fetchCommunityDocs()
            fetchCategories()
        }
    }, [accessState, fetchPendingDocs, fetchUsers, fetchCommunityDocs, fetchCategories])

    const handleApprove = async (docId: string) => {
        if (!accessToken) return
        setActionLoading(docId)
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/admin/documents/${docId}/approve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            if (response.ok) {
                setPendingDocs(prev => prev.filter(doc => doc.id !== docId))
                fetchStats()
            }
        } catch (error) {
            console.error('Error approving document:', error)
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async (docId: string) => {
        if (!accessToken) return
        if (!confirm('Bu belgeyi reddetmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
            return
        }
        setActionLoading(docId)
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/admin/documents/${docId}/reject`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            if (response.ok) {
                setPendingDocs(prev => prev.filter(doc => doc.id !== docId))
                fetchStats()
            }
        } catch (error) {
            console.error('Error rejecting document:', error)
        } finally {
            setActionLoading(null)
        }
    }

    const handleRoleChange = async (userId: string, newRole: string) => {
        if (!accessToken) return
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            })
            if (response.ok) {
                fetchUsers()
            }
        } catch (error) {
            console.error('Error updating role:', error)
        }
    }

    const handleDeleteClick = (doc: PendingDocument) => {
        setDeleteConfirmDoc(doc)
    }

    const openCategoryDialog = (category?: Category) => {
        if (category) {
            setEditingCategory(category)
            setCategoryForm({ name: category.name, description: category.description || '' })
        } else {
            setEditingCategory(null)
            setCategoryForm({ name: '', description: '' })
        }
        setCategoryDialogOpen(true)
    }

    const closeCategoryDialog = () => {
        setCategoryDialogOpen(false)
        setEditingCategory(null)
        setCategoryForm({ name: '', description: '' })
    }

    const handleSaveCategory = async () => {
        if (!accessToken || !categoryForm.name.trim()) return

        setActionLoading('category')
        try {
            const url = editingCategory
                ? `${API_BASE_URL}/api/v1/admin/categories/${editingCategory.id}`
                : `${API_BASE_URL}/api/v1/admin/categories`

            const response = await fetch(url, {
                method: editingCategory ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: categoryForm.name.trim(),
                    description: categoryForm.description.trim() || null
                })
            })

            if (response.ok) {
                fetchCategories()
                closeCategoryDialog()
            } else {
                const data = await response.json()
                alert(data.detail || 'İşlem başarısız')
            }
        } catch (error) {
            console.error('Error saving category:', error)
            alert('Hata oluştu')
        } finally {
            setActionLoading(null)
        }
    }

    const handleToggleCategoryActive = async (category: Category) => {
        if (!accessToken) return

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/admin/categories/${category.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: !category.is_active })
            })

            if (response.ok) {
                fetchCategories()
            }
        } catch (error) {
            console.error('Error toggling category:', error)
        }
    }

    const handleDeleteCategory = async () => {
        if (!accessToken || !deleteCategoryConfirm) return

        setActionLoading(deleteCategoryConfirm.id)
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/admin/categories/${deleteCategoryConfirm.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })

            if (response.ok) {
                fetchCategories()
                setDeleteCategoryConfirm(null)
            } else {
                const data = await response.json()
                alert(data.detail || 'Silme başarısız')
            }
        } catch (error) {
            console.error('Error deleting category:', error)
            alert('Hata oluştu')
        } finally {
            setActionLoading(null)
        }
    }

    const executeDeleteAdmin = async () => {
        if (!accessToken || !deleteConfirmDoc) return

        setActionLoading(deleteConfirmDoc.id)
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/${deleteConfirmDoc.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            if (response.ok) {
                setCommunityDocs(prev => prev.filter(doc => doc.id !== deleteConfirmDoc.id))
                fetchStats()
                setDeleteConfirmDoc(null)
            } else {
                const data = await response.json()
                alert(data.detail || 'Silme işlemi başarısız oldu')
            }
        } catch (error) {
            console.error('Error deleting document:', error)
            alert('Hata oluştu')
        } finally {
            setActionLoading(null)
        }
    }

    if (accessState === 'loading') {
        return (
            <div className="min-h-screen w-full pt-16 bg-paper relative">
                <div className="absolute inset-0 paper-texture pointer-events-none" />
                <div className="flex justify-center items-center py-40">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
                </div>
            </div>
        )
    }

    if (accessState === 'setup_needed') {
        return (
            <div className="min-h-screen w-full pt-16 bg-paper relative">
                <div className="absolute inset-0 paper-texture pointer-events-none" />
                <div className="container mx-auto py-20 px-4">
                    <Card className="max-w-md mx-auto bg-paper border-parchment paper-shadow-lg paper-texture">
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 bg-parchment rounded-sm flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-8 h-8 text-olive" />
                            </div>
                            <CardTitle className="text-xl font-display">İlk Admin Kurulumu</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <p className="text-ink-light font-body">
                                Sistemde henüz admin bulunmuyor. Kendinizi ilk admin olarak atamak için aşağıdaki butona tıklayın.
                            </p>
                            <Button
                                onClick={handleSetup}
                                disabled={setupLoading}
                                className="w-full bg-ink text-paper hover:bg-ink/90 font-mono-ui"
                            >
                                {setupLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Kuruluyor...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-4 h-4 mr-2" />
                                        Admin Olarak Ata
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    if (accessState === 'denied') {
        return (
            <div className="min-h-screen w-full pt-16 bg-paper relative">
                <div className="absolute inset-0 paper-texture pointer-events-none" />
                <div className="container mx-auto py-20 px-4">
                    <Card className="max-w-md mx-auto bg-paper border-parchment paper-shadow-lg paper-texture">
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 bg-terracotta/10 rounded-sm flex items-center justify-center mx-auto mb-4">
                                <ShieldAlert className="w-8 h-8 text-terracotta" />
                            </div>
                            <CardTitle className="text-xl text-terracotta font-display">Erişim Reddedildi</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-ink-light font-body">
                                Bu sayfaya erişim yetkiniz bulunmuyor. Admin yetkisi almak için sistem yöneticisi ile iletişime geçin.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full pt-16 bg-paper relative">
            <div className="absolute inset-0 paper-texture pointer-events-none -z-10" />

            <div className="container mx-auto py-10 px-4">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl font-bold text-ink font-display">
                        Yönetici Paneli
                    </h1>
                    <p className="text-ink-light mt-2 font-body">Topluluk belgelerini ve kullanıcıları yönetin</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
                    <Card className="bg-paper border-parchment paper-shadow paper-fold">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-ink-light font-mono-ui">
                                Onay Bekleyen
                            </CardTitle>
                            <Clock className="h-4 w-4 text-gold" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-ink font-display">
                                {stats?.pending_count ?? '-'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-paper border-parchment paper-shadow paper-fold">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-ink-light font-mono-ui">
                                Bugün Onaylanan
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-olive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-ink font-display">
                                {stats?.approved_today_count ?? '-'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-paper border-parchment paper-shadow paper-fold">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-ink-light font-mono-ui">
                                Toplam Belge
                            </CardTitle>
                            <FileText className="h-4 w-4 text-ink" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-ink font-display">
                                {stats?.total_documents ?? '-'}
                            </div>
                            <p className="text-xs text-ink-light mt-1 font-mono-ui">
                                {stats?.total_public_documents ?? 0} herkese açık
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-paper border-parchment paper-shadow paper-fold">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-ink-light font-mono-ui">
                                Toplam Kullanıcı
                            </CardTitle>
                            <Users className="h-4 w-4 text-lavender" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-ink font-display">
                                {stats?.total_users ?? '-'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="documents" className="space-y-4">
                    <TabsList className="bg-paper-dark w-full overflow-x-auto flex-nowrap scrollbar-hide border border-parchment rounded-sm">
                        <TabsTrigger value="documents" className="font-mono-ui text-xs tracking-wide">
                            <FileText className="w-4 h-4 mr-2" />
                            Onay Kuyruğu
                        </TabsTrigger>
                        <TabsTrigger value="community" className="font-mono-ui text-xs tracking-wide">
                            <Globe className="w-4 h-4 mr-2" />
                            Topluluk Kütüphanesi
                        </TabsTrigger>
                        <TabsTrigger value="categories" className="font-mono-ui text-xs tracking-wide">
                            <Tags className="w-4 h-4 mr-2" />
                            Kategoriler
                        </TabsTrigger>
                        <TabsTrigger value="users" className="font-mono-ui text-xs tracking-wide">
                            <UserCog className="w-4 h-4 mr-2" />
                            Kullanıcı Yönetimi
                        </TabsTrigger>
                    </TabsList>

                    {/* Documents Tab */}
                    <TabsContent value="documents">
                        <Card className="bg-paper border-parchment paper-shadow paper-fold">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-ink font-display">
                                            Onay Kuyruğu
                                        </CardTitle>
                                        <p className="text-sm text-ink-light mt-1 font-body">
                                            Herkese açık olarak paylaşılmak istenen belgeler
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { fetchStats(); fetchPendingDocs(); }}
                                        className="border-parchment font-mono-ui"
                                    >
                                        Yenile
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center items-center py-10">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
                                    </div>
                                ) : pendingDocs.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="w-16 h-16 bg-olive/10 rounded-sm flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-8 h-8 text-olive" />
                                        </div>
                                        <p className="text-ink-light font-body">Onay bekleyen belge yok</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingDocs.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-paper-dark border border-parchment rounded-sm hover:border-terracotta/30 transition-colors gap-3"
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-10 h-10 bg-ink/5 rounded-sm flex items-center justify-center flex-shrink-0">
                                                        <FileText className="w-5 h-5 text-ink" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-medium text-ink line-clamp-1 font-display">
                                                            {doc.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-sm text-ink-light flex-wrap">
                                                            {doc.course_name && (
                                                                <span className="bg-parchment text-ink px-2 py-0.5 rounded-sm text-xs font-mono-ui">
                                                                    {doc.course_name}
                                                                </span>
                                                            )}
                                                            {doc.topic && (
                                                                <span className="bg-lavender/10 text-lavender px-2 py-0.5 rounded-sm text-xs font-mono-ui">
                                                                    {doc.topic}
                                                                </span>
                                                            )}
                                                            <span className="text-ink-light font-mono-ui">
                                                                {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setPreviewDoc(doc)}
                                                        className="border-parchment font-mono-ui"
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        Önizle
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-olive hover:text-olive hover:bg-olive/10 border-parchment font-mono-ui"
                                                        onClick={() => handleApprove(doc.id)}
                                                        disabled={actionLoading === doc.id}
                                                    >
                                                        {actionLoading === doc.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                                Onayla
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-terracotta hover:text-terracotta hover:bg-terracotta/10 border-parchment font-mono-ui"
                                                        onClick={() => handleReject(doc.id)}
                                                        disabled={actionLoading === doc.id}
                                                    >
                                                        {actionLoading === doc.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <XCircle className="w-4 h-4 mr-1" />
                                                                Reddet
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Community Tab */}
                    <TabsContent value="community">
                        <Card className="bg-paper border-parchment paper-shadow paper-fold">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-ink font-display">
                                            Topluluk Kütüphanesi Yönetimi
                                        </CardTitle>
                                        <p className="text-sm text-ink-light mt-1 font-body">
                                            Yayında olan belgeleri yönetin ve gerekirse silin
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { fetchCommunityDocs(); }}
                                        className="border-parchment font-mono-ui"
                                    >
                                        Yenile
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {communityDocs.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-ink-light font-body">Yayında belge yok</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {communityDocs.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-paper-dark border border-parchment rounded-sm hover:border-terracotta/30 transition-colors gap-3"
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-10 h-10 bg-olive/10 rounded-sm flex items-center justify-center flex-shrink-0">
                                                        <Globe className="w-5 h-5 text-olive" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-medium text-ink line-clamp-1 font-display">
                                                            {doc.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-sm text-ink-light">
                                                            <span className="text-ink-light font-mono-ui">
                                                                {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setPreviewDoc(doc)}
                                                        className="border-parchment font-mono-ui"
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        İncele
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="bg-terracotta/10 text-terracotta hover:bg-terracotta/20 border-none shadow-none font-mono-ui"
                                                        onClick={() => handleDeleteClick(doc)}
                                                        disabled={actionLoading === doc.id}
                                                    >
                                                        {actionLoading === doc.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <XCircle className="w-4 h-4 mr-1" />
                                                                Sil
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Categories Tab */}
                    <TabsContent value="categories">
                        <Card className="bg-paper border-parchment paper-shadow paper-fold">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-ink font-display">
                                            Kategori Yönetimi
                                        </CardTitle>
                                        <p className="text-sm text-ink-light mt-1 font-body">
                                            Ders dışı dökümanlar için kategorileri yönetin
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={fetchCategories}
                                            className="border-parchment font-mono-ui"
                                        >
                                            Yenile
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => openCategoryDialog()}
                                            className="bg-ink text-paper hover:bg-ink/90 font-mono-ui"
                                        >
                                            <FolderPlus className="w-4 h-4 mr-2" />
                                            Yeni Kategori
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {categories.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="w-16 h-16 bg-parchment rounded-sm flex items-center justify-center mx-auto mb-4">
                                            <Tags className="w-8 h-8 text-ink-light" />
                                        </div>
                                        <p className="text-ink-light font-body">Henüz kategori eklenmemiş</p>
                                        <p className="text-sm text-ink-light mt-1 font-body">
                                            Ders dışı dökümanlar için kategori ekleyin
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {categories.map((category) => (
                                            <div
                                                key={category.id}
                                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-sm transition-colors gap-3 border ${category.is_active
                                                    ? 'bg-paper-dark border-parchment hover:border-terracotta/30'
                                                    : 'bg-paper border-parchment opacity-60'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={`w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0 ${category.is_active ? 'bg-ink/5' : 'bg-parchment'
                                                        }`}>
                                                        <Tags className={`w-5 h-5 ${category.is_active ? 'text-ink' : 'text-ink-light'
                                                            }`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-medium text-ink font-display">
                                                            {category.name}
                                                            {!category.is_active && (
                                                                <span className="ml-2 text-xs bg-parchment text-ink-light px-2 py-0.5 rounded-sm font-mono-ui">
                                                                    Pasif
                                                                </span>
                                                            )}
                                                        </h3>
                                                        {category.description && (
                                                            <p className="text-sm text-ink-light line-clamp-1 font-body">
                                                                {category.description}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-ink-light mt-1 font-mono-ui">
                                                            {category.document_count} döküman
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className="flex items-center gap-2 mr-4">
                                                        <Switch
                                                            checked={category.is_active}
                                                            onCheckedChange={() => handleToggleCategoryActive(category)}
                                                        />
                                                        <Label className="text-sm text-ink-light font-mono-ui">
                                                            {category.is_active ? 'Aktif' : 'Pasif'}
                                                        </Label>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openCategoryDialog(category)}
                                                        className="border-parchment"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-terracotta hover:text-terracotta hover:bg-terracotta/10 border-parchment"
                                                        onClick={() => setDeleteCategoryConfirm(category)}
                                                        disabled={category.document_count > 0}
                                                        title={category.document_count > 0 ? 'Döküman içeren kategoriler silinemez' : ''}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Users Tab */}
                    <TabsContent value="users">
                        <Card className="bg-paper border-parchment paper-shadow paper-fold">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-ink font-display">
                                            Kullanıcı Yönetimi
                                        </CardTitle>
                                        <p className="text-sm text-ink-light mt-1 font-body">
                                            Kullanıcı rollerini yönetin
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={fetchUsers}
                                        className="border-parchment font-mono-ui"
                                    >
                                        Yenile
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {users.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-ink-light font-body">Henüz kullanıcı yok</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {users.map((user) => (
                                            <div
                                                key={user.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-paper-dark border border-parchment rounded-sm gap-3"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0 ${user.role === 'admin' ? 'bg-lavender/10' :
                                                        user.role === 'teacher' ? 'bg-gold/10' :
                                                            'bg-parchment'
                                                        }`}>
                                                        {user.role === 'admin' ? (
                                                            <ShieldCheck className="w-5 h-5 text-lavender" />
                                                        ) : user.role === 'teacher' ? (
                                                            <UserCog className="w-5 h-5 text-gold" />
                                                        ) : (
                                                            <Users className="w-5 h-5 text-ink-light" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-medium text-ink truncate font-display">
                                                            {user.full_name || 'İsimsiz Kullanıcı'}
                                                        </h3>
                                                        <p className="text-xs text-ink-light truncate font-mono-ui">
                                                            {user.email || 'E-posta yok'} · {new Date(user.created_at).toLocaleDateString('tr-TR')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                    <span className={`text-xs px-2.5 py-1 rounded-sm font-medium font-mono-ui ${user.role === 'admin'
                                                        ? 'bg-lavender/10 text-lavender'
                                                        : user.role === 'teacher'
                                                            ? 'bg-gold/10 text-gold'
                                                            : 'bg-parchment text-ink-light'
                                                        }`}>
                                                        {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Öğretmen' : 'Kullanıcı'}
                                                    </span>
                                                    {user.role !== 'user' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs h-8 px-2 border-parchment font-mono-ui"
                                                            onClick={() => handleRoleChange(user.user_id, 'user')}
                                                        >
                                                            Kullanıcı
                                                        </Button>
                                                    )}
                                                    {user.role !== 'teacher' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-gold hover:text-gold hover:bg-gold/10 text-xs h-8 px-2 border-parchment font-mono-ui"
                                                            onClick={() => handleRoleChange(user.user_id, 'teacher')}
                                                        >
                                                            Öğretmen
                                                        </Button>
                                                    )}
                                                    {user.role !== 'admin' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-lavender hover:text-lavender hover:bg-lavender/10 text-xs h-8 px-2 border-parchment font-mono-ui"
                                                            onClick={() => handleRoleChange(user.user_id, 'admin')}
                                                        >
                                                            Admin
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Preview Dialog */}
            <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
                <DialogContent className="max-w-4xl h-[80vh] paper-texture">
                    <DialogHeader>
                        <DialogTitle className="font-display">{previewDoc?.title}</DialogTitle>
                        <DialogDescription className="font-body">
                            {previewDoc?.course_name && `${previewDoc.course_name}`}
                            {previewDoc?.topic && ` - ${previewDoc.topic}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 h-full min-h-0">
                        {previewDoc && (
                            <iframe
                                src={previewDoc.file_url.startsWith('http') 
                                    ? `${previewDoc.file_url}#toolbar=0` 
                                    : `${API_BASE_URL}${previewDoc.file_url}#toolbar=0`}
                                className="w-full h-[60vh] rounded-sm border border-parchment"
                                title="PDF Preview"
                            />
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setPreviewDoc(null)}
                            className="border-parchment font-mono-ui"
                        >
                            Kapat
                        </Button>
                        <Button
                            className="bg-olive text-paper hover:bg-olive/90 font-mono-ui"
                            onClick={() => {
                                if (previewDoc) {
                                    handleApprove(previewDoc.id)
                                    setPreviewDoc(null)
                                }
                            }}
                        >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Onayla
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (previewDoc) {
                                    handleReject(previewDoc.id)
                                    setPreviewDoc(null)
                                }
                            }}
                            className="bg-terracotta text-paper hover:bg-terracotta/90 font-mono-ui"
                        >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reddet
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmDoc} onOpenChange={() => setDeleteConfirmDoc(null)}>
                <DialogContent className="paper-texture">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-terracotta font-display">
                            <ShieldAlert className="w-5 h-5" />
                            Belgeyi Sil
                        </DialogTitle>
                        <DialogDescription className="font-body">
                            "{deleteConfirmDoc?.title}" başlıklı belgeyi silmek istediğinizden emin misiniz?
                            <br />
                            <span className="font-medium text-terracotta mt-2 block">
                                Bu işlem geri alınamaz ve belge kalıcı olarak silinir.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmDoc(null)}
                            disabled={!!actionLoading}
                            className="border-parchment font-mono-ui"
                        >
                            İptal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={executeDeleteAdmin}
                            disabled={!!actionLoading}
                            className="bg-terracotta text-paper hover:bg-terracotta/90 font-mono-ui"
                        >
                            {actionLoading === deleteConfirmDoc?.id ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Siliniyor...
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Evet, Sil
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Category Create/Edit Dialog */}
            <Dialog open={categoryDialogOpen} onOpenChange={closeCategoryDialog}>
                <DialogContent className="paper-texture">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-display">
                            <Tags className="w-5 h-5 text-ink" />
                            {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
                        </DialogTitle>
                        <DialogDescription className="font-body">
                            {editingCategory
                                ? 'Kategori bilgilerini güncelleyin'
                                : 'Ders dışı dökümanlar için yeni bir kategori oluşturun'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="category-name" className="font-mono-ui text-xs tracking-wide uppercase">Kategori Adı</Label>
                            <Input
                                id="category-name"
                                placeholder="Örn: Makale, Tez, Kitap..."
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                                className="bg-paper-dark border-parchment font-body"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category-desc" className="font-mono-ui text-xs tracking-wide uppercase">Açıklama (opsiyonel)</Label>
                            <Textarea
                                id="category-desc"
                                placeholder="Bu kategori hakkında kısa bir açıklama..."
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                                className="bg-paper-dark border-parchment font-body"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={closeCategoryDialog} className="border-parchment font-mono-ui">
                            İptal
                        </Button>
                        <Button
                            onClick={handleSaveCategory}
                            disabled={!categoryForm.name.trim() || actionLoading === 'category'}
                            className="bg-ink text-paper hover:bg-ink/90 font-mono-ui"
                        >
                            {actionLoading === 'category' ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Kaydediliyor...
                                </>
                            ) : (
                                editingCategory ? 'Güncelle' : 'Oluştur'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Category Delete Confirmation Dialog */}
            <Dialog open={!!deleteCategoryConfirm} onOpenChange={() => setDeleteCategoryConfirm(null)}>
                <DialogContent className="paper-texture">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-terracotta font-display">
                            <Trash2 className="w-5 h-5" />
                            Kategoriyi Sil
                        </DialogTitle>
                        <DialogDescription className="font-body">
                            &quot;{deleteCategoryConfirm?.name}&quot; kategorisini silmek istediğinizden emin misiniz?
                            <br />
                            <span className="font-medium text-terracotta mt-2 block">
                                Bu işlem geri alınamaz.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteCategoryConfirm(null)}
                            disabled={!!actionLoading}
                            className="border-parchment font-mono-ui"
                        >
                            İptal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteCategory}
                            disabled={!!actionLoading}
                            className="bg-terracotta text-paper hover:bg-terracotta/90 font-mono-ui"
                        >
                            {actionLoading === deleteCategoryConfirm?.id ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Siliniyor...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Evet, Sil
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
