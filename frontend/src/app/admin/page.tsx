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

    // Check admin access
    const checkAccess = useCallback(async () => {
        if (!accessToken) {
            setAccessState('denied')
            return
        }

        try {
            // First check if setup is needed
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

            // Try to access admin stats (will fail if not admin)
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
            // If we can't reach the backend, show setup_needed so user can try
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
                // Refresh the page to properly load admin state
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

    // Category CRUD functions
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

    // Loading state
    if (accessState === 'loading') {
        return (
            <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-white">

                <div className="flex justify-center items-center py-40">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </div>
        )
    }

    // Setup needed state
    if (accessState === 'setup_needed') {
        return (
            <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-white">

                <div className="container mx-auto py-20 px-4">
                    <Card className="max-w-md mx-auto bg-white/80 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-8 h-8 text-indigo-600" />
                            </div>
                            <CardTitle className="text-xl">İlk Admin Kurulumu</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <p className="text-gray-500">
                                Sistemde henüz admin bulunmuyor. Kendinizi ilk admin olarak atamak için aşağıdaki butona tıklayın.
                            </p>
                            <Button
                                onClick={handleSetup}
                                disabled={setupLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
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

    // Access denied state
    if (accessState === 'denied') {
        return (
            <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-white">

                <div className="container mx-auto py-20 px-4">
                    <Card className="max-w-md mx-auto bg-white/80 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldAlert className="w-8 h-8 text-red-600" />
                            </div>
                            <CardTitle className="text-xl text-red-600">Erişim Reddedildi</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-gray-500">
                                Bu sayfaya erişim yetkiniz bulunmuyor. Admin yetkisi almak için sistem yöneticisi ile iletişime geçin.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // Admin dashboard
    return (
        <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-white">
            <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />



            <div className="container mx-auto py-10 px-4">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Yönetici Paneli
                    </h1>
                    <p className="text-gray-500 mt-2">Topluluk belgelerini ve kullanıcıları yönetin</p>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
                    <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                                Onay Bekleyen
                            </CardTitle>
                            <Clock className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-800">
                                {stats?.pending_count ?? '-'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                                Bugün Onaylanan
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-800">
                                {stats?.approved_today_count ?? '-'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                                Toplam Belge
                            </CardTitle>
                            <FileText className="h-4 w-4 text-indigo-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-800">
                                {stats?.total_documents ?? '-'}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                {stats?.total_public_documents ?? 0} herkese açık
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                                Toplam Kullanıcı
                            </CardTitle>
                            <Users className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-800">
                                {stats?.total_users ?? '-'}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs for Documents and Users */}
                <Tabs defaultValue="documents" className="space-y-4">
                    <TabsList className="bg-white/50">
                        <TabsTrigger value="documents">
                            <FileText className="w-4 h-4 mr-2" />
                            Onay Kuyruğu
                        </TabsTrigger>
                        <TabsTrigger value="community">
                            <Globe className="w-4 h-4 mr-2" />
                            Topluluk Kütüphanesi
                        </TabsTrigger>
                        <TabsTrigger value="categories">
                            <Tags className="w-4 h-4 mr-2" />
                            Kategoriler
                        </TabsTrigger>
                        <TabsTrigger value="users">
                            <UserCog className="w-4 h-4 mr-2" />
                            Kullanıcı Yönetimi
                        </TabsTrigger>
                    </TabsList>

                    {/* Documents Tab */}
                    <TabsContent value="documents">
                        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-gray-800">
                                            Onay Kuyruğu
                                        </CardTitle>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Herkese açık olarak paylaşılmak istenen belgeler
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { fetchStats(); fetchPendingDocs(); }}
                                    >
                                        Yenile
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center items-center py-10">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    </div>
                                ) : pendingDocs.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-8 h-8 text-green-600" />
                                        </div>
                                        <p className="text-gray-500">Onay bekleyen belge yok</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingDocs.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                                        <FileText className="w-5 h-5 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-gray-800 line-clamp-1">
                                                            {doc.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                                            {doc.course_name && (
                                                                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-xs">
                                                                    {doc.course_name}
                                                                </span>
                                                            )}
                                                            {doc.topic && (
                                                                <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs">
                                                                    {doc.topic}
                                                                </span>
                                                            )}
                                                            <span className="text-gray-400">
                                                                {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setPreviewDoc(doc)}
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        Önizle
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
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
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-gray-800">
                                            Topluluk Kütüphanesi Yönetimi
                                        </CardTitle>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Yayında olan belgeleri yönetin ve gerekirse silin
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { fetchCommunityDocs(); }}
                                    >
                                        Yenile
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {communityDocs.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500">Yayında belge yok</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {communityDocs.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                        <Globe className="w-5 h-5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-gray-800 line-clamp-1">
                                                            {doc.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                                            <span className="text-gray-400">
                                                                {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setPreviewDoc(doc)}
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        İncele
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="bg-red-50 text-red-600 hover:bg-red-100 border-none shadow-none"
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
                        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-gray-800">
                                            Kategori Yönetimi
                                        </CardTitle>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Ders dışı dökümanlar için kategorileri yönetin
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={fetchCategories}
                                        >
                                            Yenile
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => openCategoryDialog()}
                                            className="bg-indigo-600 hover:bg-indigo-700"
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
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Tags className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500">Henüz kategori eklenmemiş</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Ders dışı dökümanlar için kategori ekleyin
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {categories.map((category) => (
                                            <div
                                                key={category.id}
                                                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${category.is_active
                                                    ? 'bg-gray-50 hover:bg-gray-100'
                                                    : 'bg-gray-100/50 opacity-60'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.is_active ? 'bg-indigo-100' : 'bg-gray-200'
                                                        }`}>
                                                        <Tags className={`w-5 h-5 ${category.is_active ? 'text-indigo-600' : 'text-gray-400'
                                                            }`} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-gray-800">
                                                            {category.name}
                                                            {!category.is_active && (
                                                                <span className="ml-2 text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">
                                                                    Pasif
                                                                </span>
                                                            )}
                                                        </h3>
                                                        {category.description && (
                                                            <p className="text-sm text-gray-500 line-clamp-1">
                                                                {category.description}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {category.document_count} döküman
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2 mr-4">
                                                        <Switch
                                                            checked={category.is_active}
                                                            onCheckedChange={() => handleToggleCategoryActive(category)}
                                                        />
                                                        <Label className="text-sm text-gray-500">
                                                            {category.is_active ? 'Aktif' : 'Pasif'}
                                                        </Label>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openCategoryDialog(category)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-semibold text-gray-800">
                                            Kullanıcı Yönetimi
                                        </CardTitle>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Kullanıcı rollerini yönetin
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={fetchUsers}
                                    >
                                        Yenile
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {users.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500">Henüz kullanıcı yok</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {users.map((user) => (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${user.role === 'admin' ? 'bg-purple-100' :
                                                        user.role === 'teacher' ? 'bg-blue-100' :
                                                            'bg-gray-100'
                                                        }`}>
                                                        {user.role === 'admin' ? (
                                                            <ShieldCheck className="w-5 h-5 text-purple-600" />
                                                        ) : user.role === 'teacher' ? (
                                                            <UserCog className="w-5 h-5 text-blue-600" />
                                                        ) : (
                                                            <Users className="w-5 h-5 text-gray-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-gray-800">
                                                            {user.full_name || 'İsimsiz Kullanıcı'}
                                                        </h3>
                                                        <p className="text-xs text-gray-400">
                                                            {user.email || 'E-posta yok'} • {new Date(user.created_at).toLocaleDateString('tr-TR')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${user.role === 'admin'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : user.role === 'teacher'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Öğretmen' : 'Kullanıcı'}
                                                    </span>
                                                    {user.role !== 'user' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleRoleChange(user.user_id, 'user')}
                                                        >
                                                            Kullanıcı Yap
                                                        </Button>
                                                    )}
                                                    {user.role !== 'teacher' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => handleRoleChange(user.user_id, 'teacher')}
                                                        >
                                                            Öğretmen Yap
                                                        </Button>
                                                    )}
                                                    {user.role !== 'admin' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                                            onClick={() => handleRoleChange(user.user_id, 'admin')}
                                                        >
                                                            Admin Yap
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
                <DialogContent className="max-w-4xl h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>{previewDoc?.title}</DialogTitle>
                        <DialogDescription>
                            {previewDoc?.course_name && `${previewDoc.course_name}`}
                            {previewDoc?.topic && ` - ${previewDoc.topic}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 h-full min-h-0">
                        {previewDoc && (
                            <iframe
                                src={`${previewDoc.file_url}#toolbar=0`}
                                className="w-full h-[60vh] rounded-lg border"
                                title="PDF Preview"
                            />
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setPreviewDoc(null)}
                        >
                            Kapat
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
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
                        >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reddet
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmDoc} onOpenChange={() => setDeleteConfirmDoc(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <ShieldAlert className="w-5 h-5" />
                            Belgeyi Sil
                        </DialogTitle>
                        <DialogDescription>
                            "{deleteConfirmDoc?.title}" başlıklı belgeyi silmek istediğinizden emin misiniz?
                            <br />
                            <span className="font-medium text-red-600 mt-2 block">
                                Bu işlem geri alınamaz ve belge kalıcı olarak silinir.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmDoc(null)}
                            disabled={!!actionLoading}
                        >
                            İptal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={executeDeleteAdmin}
                            disabled={!!actionLoading}
                            className="bg-red-600 hover:bg-red-700"
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Tags className="w-5 h-5 text-indigo-600" />
                            {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? 'Kategori bilgilerini güncelleyin'
                                : 'Ders dışı dökümanlar için yeni bir kategori oluşturun'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="category-name">Kategori Adı</Label>
                            <Input
                                id="category-name"
                                placeholder="Örn: Makale, Tez, Kitap..."
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category-desc">Açıklama (opsiyonel)</Label>
                            <Textarea
                                id="category-desc"
                                placeholder="Bu kategori hakkında kısa bir açıklama..."
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={closeCategoryDialog}>
                            İptal
                        </Button>
                        <Button
                            onClick={handleSaveCategory}
                            disabled={!categoryForm.name.trim() || actionLoading === 'category'}
                            className="bg-indigo-600 hover:bg-indigo-700"
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="w-5 h-5" />
                            Kategoriyi Sil
                        </DialogTitle>
                        <DialogDescription>
                            &quot;{deleteCategoryConfirm?.name}&quot; kategorisini silmek istediğinizden emin misiniz?
                            <br />
                            <span className="font-medium text-red-600 mt-2 block">
                                Bu işlem geri alınamaz.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteCategoryConfirm(null)}
                            disabled={!!actionLoading}
                        >
                            İptal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteCategory}
                            disabled={!!actionLoading}
                            className="bg-red-600 hover:bg-red-700"
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
