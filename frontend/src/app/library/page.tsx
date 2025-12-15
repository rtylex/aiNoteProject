'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

import {
    BookOpen,
    Search,
    FolderOpen,
    FileText,
    ChevronRight,
    GraduationCap,
    Users,
    ArrowLeft,
    Library,
    Tags,
    CheckSquare,
    Square,
    X,
    MessageSquare
} from 'lucide-react'

interface Course {
    course_name: string
    topic_count: number
    document_count: number
}

interface Topic {
    topic: string
    document_count: number
}

interface Document {
    id: string
    title: string
    course_name: string | null
    topic: string | null
    document_type: string
    category_id: string | null
    category_name: string | null
    status: string
    created_at: string
}

interface Category {
    id: string
    name: string
    description: string | null
    document_count: number
}

type ViewMode = 'courses' | 'topics' | 'documents'
type LibraryTab = 'courses' | 'non_courses'

export default function LibraryPage() {
    const [activeTab, setActiveTab] = useState<LibraryTab>('courses')
    const [courses, setCourses] = useState<Course[]>([])
    const [topics, setTopics] = useState<Topic[]>([])
    const [documents, setDocuments] = useState<Document[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [nonCourseDocuments, setNonCourseDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<ViewMode>('courses')
    const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
    const { accessToken } = useAuth()
    const router = useRouter()

    // Multi-select state
    const [isSelectMode, setIsSelectMode] = useState(false)
    const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())
    const [selectedDocs, setSelectedDocs] = useState<Map<string, { title: string, category: string }>>(new Map())

    const fetchCourses = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/courses`)
            if (response.ok) {
                const data = await response.json()
                setCourses(data)
            }
        } catch (error) {
            console.error('Error fetching courses:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchTopics = useCallback(async (courseName: string) => {
        try {
            setLoading(true)
            const response = await fetch(
                `${API_BASE_URL}/api/v1/documents/courses/${encodeURIComponent(courseName)}/topics`
            )
            if (response.ok) {
                const data = await response.json()
                setTopics(data)
            }
        } catch (error) {
            console.error('Error fetching topics:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchDocuments = useCallback(async (courseName?: string, topic?: string) => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            params.append('document_type', 'course')
            if (courseName) params.append('course_name', courseName)
            if (topic) params.append('topic', topic)

            const response = await fetch(
                `${API_BASE_URL}/api/v1/documents/public?${params.toString()}`
            )
            if (response.ok) {
                const data = await response.json()
                setDocuments(data)
            }
        } catch (error) {
            console.error('Error fetching documents:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch(`${API_BASE_URL}/api/v1/documents/categories/list`)
            if (response.ok) {
                const data = await response.json()
                setCategories(data)
            }
        } catch (error) {
            console.error('Error fetching categories:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchNonCourseDocuments = useCallback(async (categoryId?: string) => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            params.append('document_type', 'non_course')
            if (categoryId) params.append('category_id', categoryId)

            const response = await fetch(
                `${API_BASE_URL}/api/v1/documents/public?${params.toString()}`
            )
            if (response.ok) {
                const data = await response.json()
                setNonCourseDocuments(data)
            }
        } catch (error) {
            console.error('Error fetching non-course documents:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (activeTab === 'courses') {
            fetchCourses()
        } else {
            fetchCategories()
        }
    }, [activeTab, fetchCourses, fetchCategories])

    const handleCourseClick = (courseName: string) => {
        setSelectedCourse(courseName)
        setViewMode('topics')
        fetchTopics(courseName)
    }

    const handleTopicClick = (topic: string) => {
        setSelectedTopic(topic)
        setViewMode('documents')
        fetchDocuments(selectedCourse!, topic)
    }

    const handleBackToTopics = () => {
        setSelectedTopic(null)
        setViewMode('topics')
        // Seçimi koruyoruz - sıfırlamıyoruz
        if (selectedCourse) {
            fetchTopics(selectedCourse)
        }
    }

    const handleBackToCourses = () => {
        setSelectedCourse(null)
        setSelectedTopic(null)
        setViewMode('courses')
        // Seçimi koruyoruz - sıfırlamıyoruz
        fetchCourses()
    }

    const handleCategoryClick = (category: Category) => {
        setSelectedCategory(category)
        fetchNonCourseDocuments(category.id)
    }

    const handleBackToCategories = () => {
        setSelectedCategory(null)
        setNonCourseDocuments([])
        // Seçimi koruyoruz - sıfırlamıyoruz
    }

    const handleTabChange = (tab: string) => {
        setActiveTab(tab as LibraryTab)
        setSearchQuery('')
        setViewMode('courses')
        setSelectedCourse(null)
        setSelectedTopic(null)
        setSelectedCategory(null)
        // Seçimi koruyoruz - tab değişikliğinde sıfırlamıyoruz
    }

    const toggleSelectMode = () => {
        if (isSelectMode) {
            // Seçim modunu kapatırken seçimleri temizle
            setSelectedDocIds(new Set())
            setSelectedDocs(new Map())
        }
        setIsSelectMode(!isSelectMode)
    }

    const removeSelectedDoc = (docId: string) => {
        setSelectedDocIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(docId)
            return newSet
        })
        setSelectedDocs(prev => {
            const newMap = new Map(prev)
            newMap.delete(docId)
            return newMap
        })
    }

    const toggleDocumentSelection = (doc: Document, isNonCourse: boolean, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        setSelectedDocIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(doc.id)) {
                newSet.delete(doc.id)
                setSelectedDocs(prevDocs => {
                    const newMap = new Map(prevDocs)
                    newMap.delete(doc.id)
                    return newMap
                })
            } else {
                if (newSet.size < 10) {
                    newSet.add(doc.id)
                    const category = isNonCourse
                        ? (doc.category_name || 'Ders Dışı')
                        : (doc.course_name ? `${doc.course_name}${doc.topic ? ` - ${doc.topic}` : ''}` : 'Ders')
                    setSelectedDocs(prevDocs => {
                        const newMap = new Map(prevDocs)
                        newMap.set(doc.id, { title: doc.title, category })
                        return newMap
                    })
                }
            }
            return newSet
        })
    }

    const handleStartMultiChat = () => {
        if (selectedDocIds.size < 2) return
        const idsParam = Array.from(selectedDocIds).join(',')
        router.push(`/multi-chat?ids=${idsParam}`)
    }

    const filteredCourses = courses.filter(c =>
        c.course_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredTopics = topics.filter(t =>
        t.topic.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredDocuments = documents.filter(d =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredNonCourseDocuments = nonCourseDocuments.filter(d =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const renderDocumentCard = (doc: Document, isNonCourse: boolean = false) => {
        const isSelected = selectedDocIds.has(doc.id)

        if (isSelectMode) {
            return (
                <div
                    key={doc.id}
                    onClick={(e) => toggleDocumentSelection(doc, isNonCourse, e)}
                    className={`cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                        }`}
                >
                    <Card className={`hover:shadow-xl transition-all duration-300 group bg-white/80 backdrop-blur-sm border-white/20 hover:-translate-y-1 h-full ${isSelected ? 'bg-indigo-50' : ''
                        }`}>
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                                <div className={`w-12 h-12 bg-gradient-to-br ${isNonCourse ? 'from-purple-500 to-pink-500' : 'from-green-500 to-teal-500'} rounded-lg flex items-center justify-center mb-3`}>
                                    <FileText className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSelected ? (
                                        <CheckSquare className="w-6 h-6 text-indigo-600" />
                                    ) : (
                                        <Square className="w-6 h-6 text-gray-400" />
                                    )}
                                </div>
                            </div>
                            <CardTitle className="text-lg font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                {doc.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isNonCourse && doc.category_name && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                    {doc.category_name}
                                </span>
                            )}
                            <div className="flex justify-between items-center mt-2 pt-4 border-t border-gray-100">
                                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
                                    AI ile Çalış
                                </span>
                                <span className="text-xs text-gray-400">
                                    {new Date(doc.created_at).toLocaleDateString('tr-TR', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        }

        return (
            <Link href={accessToken ? `/chat/${doc.id}` : '/login'} key={doc.id}>
                <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white/80 backdrop-blur-sm border-white/20 hover:-translate-y-1 h-full">
                    <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                            <div className={`w-12 h-12 bg-gradient-to-br ${isNonCourse ? 'from-purple-500 to-pink-500' : 'from-green-500 to-teal-500'} rounded-lg flex items-center justify-center mb-3`}>
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Users className="w-3 h-3" />
                                <span>Topluluk</span>
                            </div>
                        </div>
                        <CardTitle className="text-lg font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {doc.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isNonCourse && doc.category_name && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                {doc.category_name}
                            </span>
                        )}
                        <div className="flex justify-between items-center mt-2 pt-4 border-t border-gray-100">
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
                                AI ile Çalış
                            </span>
                            <span className="text-xs text-gray-400">
                                {new Date(doc.created_at).toLocaleDateString('tr-TR', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </Link>
        )
    }

    // Her zaman göster - kullanıcı istediği kategoriden seçim yapabilsin
    const showMultiSelectButton = true

    return (
        <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-white">
            <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

            <div className="container mx-auto py-10 px-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Topluluk Kütüphanesi
                        </h1>
                        <p className="text-gray-500 mt-2">
                            Topluluk tarafından paylaşılan notları keşfedin
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Multi-select toggle */}
                        {showMultiSelectButton && (
                            <Button
                                variant={isSelectMode ? "secondary" : "outline"}
                                onClick={toggleSelectMode}
                                className="flex items-center gap-2"
                            >
                                {isSelectMode ? (
                                    <>
                                        <X className="w-4 h-4" />
                                        Seçimi İptal Et
                                    </>
                                ) : (
                                    <>
                                        <CheckSquare className="w-4 h-4" />
                                        Çoklu Seçim
                                    </>
                                )}
                            </Button>
                        )}

                        {/* Search */}
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white/80 backdrop-blur-sm border-white/20"
                            />
                        </div>
                    </div>
                </div>

                {/* Floating Action Button for Multi-Chat */}
                {isSelectMode && selectedDocIds.size >= 2 && (
                    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
                        <Button
                            onClick={handleStartMultiChat}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-2xl px-8 py-6 text-lg rounded-full flex items-center gap-3"
                        >
                            <MessageSquare className="w-6 h-6" />
                            {selectedDocIds.size} Dökümanla AI Çalışması Başlat
                        </Button>
                    </div>
                )}

                {/* Sticky Panel for Selected Documents */}
                {isSelectMode && selectedDocs.size > 0 && (
                    <div className="fixed right-4 top-24 w-80 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-indigo-100 p-4 z-40 max-h-[60vh] overflow-hidden flex flex-col">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 flex-shrink-0">
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                            Seçilen Dökümanlar ({selectedDocs.size}/10)
                        </h3>
                        <div className="space-y-2 overflow-y-auto flex-1">
                            {Array.from(selectedDocs.entries()).map(([id, info]) => (
                                <div key={id} className="flex items-center justify-between p-2 bg-indigo-50 rounded-lg gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{info.title}</p>
                                        <p className="text-xs text-gray-500 truncate">{info.category}</p>
                                    </div>
                                    <button
                                        onClick={() => removeSelectedDoc(id)}
                                        className="flex-shrink-0 p-1 hover:bg-red-100 rounded transition-colors"
                                    >
                                        <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {selectedDocs.size > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex-shrink-0">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedDocIds(new Set())
                                        setSelectedDocs(new Map())
                                    }}
                                    className="w-full text-gray-600 hover:text-red-600"
                                >
                                    Tümünü Temizle
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Selection Info Banner */}
                {isSelectMode && (
                    <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                            <span className="text-indigo-800">
                                <strong>{selectedDocIds.size}</strong> / 10 döküman seçildi
                                {selectedDocIds.size < 2 && (
                                    <span className="text-indigo-500 ml-2">(En az 2 döküman seçin)</span>
                                )}
                            </span>
                        </div>
                        {selectedDocIds.size > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDocIds(new Set())}
                                className="text-indigo-600 hover:text-indigo-800"
                            >
                                Temizle
                            </Button>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
                    <TabsList className="bg-white/50">
                        <TabsTrigger value="courses" className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" />
                            Ders Dökümanları
                        </TabsTrigger>
                        <TabsTrigger value="non_courses" className="flex items-center gap-2">
                            <Library className="w-4 h-4" />
                            Ders Dışı Dökümanlar
                        </TabsTrigger>
                    </TabsList>

                    {/* Course Documents Tab */}
                    <TabsContent value="courses" className="mt-6">
                        {/* Breadcrumb for courses */}
                        {viewMode !== 'courses' && (
                            <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
                                <button
                                    onClick={handleBackToCourses}
                                    className="hover:text-indigo-600 transition-colors flex items-center gap-1"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Dersler
                                </button>
                                {selectedCourse && (
                                    <>
                                        <ChevronRight className="h-4 w-4" />
                                        <button
                                            onClick={handleBackToTopics}
                                            className={viewMode === 'documents' ? 'hover:text-indigo-600 transition-colors' : 'text-indigo-600 font-medium'}
                                        >
                                            {selectedCourse}
                                        </button>
                                    </>
                                )}
                                {selectedTopic && (
                                    <>
                                        <ChevronRight className="h-4 w-4" />
                                        <span className="text-indigo-600 font-medium">{selectedTopic}</span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Content */}
                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : (
                            <>
                                {/* Courses View */}
                                {viewMode === 'courses' && (
                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {filteredCourses.length === 0 ? (
                                            <Card className="col-span-full border-dashed border-2 bg-white/50 backdrop-blur-sm">
                                                <CardHeader className="text-center py-10">
                                                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <GraduationCap className="w-8 h-8 text-indigo-600" />
                                                    </div>
                                                    <CardTitle className="text-xl text-gray-600">Henüz paylaşılan ders yok</CardTitle>
                                                </CardHeader>
                                                <CardContent className="text-center pb-10">
                                                    <p className="text-gray-500 mb-4">
                                                        İlk notu paylaşan siz olun!
                                                    </p>
                                                    <Link href="/dashboard">
                                                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                                                            Not Yükle
                                                        </Button>
                                                    </Link>
                                                </CardContent>
                                            </Card>
                                        ) : (
                                            filteredCourses.map((course) => (
                                                <Card
                                                    key={course.course_name}
                                                    className="hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white/80 backdrop-blur-sm border-white/20 hover:-translate-y-1"
                                                    onClick={() => handleCourseClick(course.course_name)}
                                                >
                                                    <CardHeader className="pb-2">
                                                        <div className="flex items-start justify-between">
                                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mb-3">
                                                                <BookOpen className="w-6 h-6 text-white" />
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                                        </div>
                                                        <CardTitle className="text-lg font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                                                            {course.course_name}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                                            <div className="flex items-center gap-1">
                                                                <FolderOpen className="w-4 h-4" />
                                                                <span>{course.topic_count} konu</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <FileText className="w-4 h-4" />
                                                                <span>{course.document_count} not</span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Topics View */}
                                {viewMode === 'topics' && (
                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {filteredTopics.length === 0 ? (
                                            <Card className="col-span-full border-dashed border-2 bg-white/50 backdrop-blur-sm">
                                                <CardHeader className="text-center py-10">
                                                    <CardTitle className="text-xl text-gray-600">Bu derste henüz konu yok</CardTitle>
                                                </CardHeader>
                                            </Card>
                                        ) : (
                                            filteredTopics.map((topic) => (
                                                <Card
                                                    key={topic.topic}
                                                    className="hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white/80 backdrop-blur-sm border-white/20 hover:-translate-y-1"
                                                    onClick={() => handleTopicClick(topic.topic)}
                                                >
                                                    <CardHeader className="pb-2">
                                                        <div className="flex items-start justify-between">
                                                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-3">
                                                                <FolderOpen className="w-6 h-6 text-white" />
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                                        </div>
                                                        <CardTitle className="text-lg font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                                                            {topic.topic}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                                            <FileText className="w-4 h-4" />
                                                            <span>{topic.document_count} not</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Documents View */}
                                {viewMode === 'documents' && (
                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {filteredDocuments.length === 0 ? (
                                            <Card className="col-span-full border-dashed border-2 bg-white/50 backdrop-blur-sm">
                                                <CardHeader className="text-center py-10">
                                                    <CardTitle className="text-xl text-gray-600">Bu konuda henüz not yok</CardTitle>
                                                </CardHeader>
                                            </Card>
                                        ) : (
                                            filteredDocuments.map((doc) => renderDocumentCard(doc, false))
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </TabsContent>

                    {/* Non-Course Documents Tab */}
                    <TabsContent value="non_courses" className="mt-6">
                        {/* Breadcrumb for non-course */}
                        {selectedCategory && (
                            <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
                                <button
                                    onClick={handleBackToCategories}
                                    className="hover:text-indigo-600 transition-colors flex items-center gap-1"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Kategoriler
                                </button>
                                <ChevronRight className="h-4 w-4" />
                                <span className="text-indigo-600 font-medium">{selectedCategory.name}</span>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : !selectedCategory ? (
                            /* Categories View */
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {filteredCategories.length === 0 ? (
                                    <Card className="col-span-full border-dashed border-2 bg-white/50 backdrop-blur-sm">
                                        <CardHeader className="text-center py-10">
                                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Tags className="w-8 h-8 text-indigo-600" />
                                            </div>
                                            <CardTitle className="text-xl text-gray-600">Henüz kategori yok</CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-center pb-10">
                                            <p className="text-gray-500">
                                                Admin henüz ders dışı kategorileri oluşturmamış.
                                            </p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    filteredCategories.map((category) => (
                                        <Card
                                            key={category.id}
                                            className="hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white/80 backdrop-blur-sm border-white/20 hover:-translate-y-1"
                                            onClick={() => handleCategoryClick(category)}
                                        >
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-3">
                                                        <Tags className="w-6 h-6 text-white" />
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                                </div>
                                                <CardTitle className="text-lg font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                                                    {category.name}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {category.description && (
                                                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                                                        {category.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                                    <FileText className="w-4 h-4" />
                                                    <span>{category.document_count} döküman</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        ) : (
                            /* Non-Course Documents View */
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {filteredNonCourseDocuments.length === 0 ? (
                                    <Card className="col-span-full border-dashed border-2 bg-white/50 backdrop-blur-sm">
                                        <CardHeader className="text-center py-10">
                                            <CardTitle className="text-xl text-gray-600">Bu kategoride henüz döküman yok</CardTitle>
                                        </CardHeader>
                                    </Card>
                                ) : (
                                    filteredNonCourseDocuments.map((doc) => renderDocumentCard(doc, true))
                                )}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
