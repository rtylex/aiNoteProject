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
import { CreateTestFromLibraryModal } from '@/components/test/create-test-from-library-modal'
import { CreateFlashcardFromLibraryModal } from '@/components/flashcard/create-flashcard-from-library-modal'

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
    MessageSquare,
    ClipboardList
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
        if (selectedCourse) {
            fetchTopics(selectedCourse)
        }
    }

    const handleBackToCourses = () => {
        setSelectedCourse(null)
        setSelectedTopic(null)
        setViewMode('courses')
        fetchCourses()
    }

    const handleCategoryClick = (category: Category) => {
        setSelectedCategory(category)
        fetchNonCourseDocuments(category.id)
    }

    const handleBackToCategories = () => {
        setSelectedCategory(null)
        setNonCourseDocuments([])
    }

    const handleTabChange = (tab: string) => {
        setActiveTab(tab as LibraryTab)
        setSearchQuery('')
        setViewMode('courses')
        setSelectedCourse(null)
        setSelectedTopic(null)
        setSelectedCategory(null)
    }

    const toggleSelectMode = () => {
        if (isSelectMode) {
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
                    className={`cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-terracotta ring-offset-2' : ''
                        }`}
                >
                    <Card className={`hover:shadow-xl transition-all duration-300 group bg-paper border-parchment hover:-translate-y-1 h-full ${isSelected ? 'bg-parchment/50' : ''
                        }`}>
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                                <div className={`w-12 h-12 rounded-sm flex items-center justify-center mb-3 ${isNonCourse ? 'bg-lavender/10' : 'bg-olive/10'}`}>
                                    <FileText className={`w-6 h-6 ${isNonCourse ? 'text-lavender' : 'text-olive'}`} />
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSelected ? (
                                        <CheckSquare className="w-6 h-6 text-terracotta" />
                                    ) : (
                                        <Square className="w-6 h-6 text-parchment" />
                                    )}
                                </div>
                            </div>
                            <CardTitle className="text-lg font-semibold text-ink group-hover:text-terracotta transition-colors line-clamp-2 font-display">
                                {doc.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isNonCourse && doc.category_name && (
                                <span className="text-xs bg-lavender/10 text-lavender px-2 py-0.5 rounded-sm font-mono-ui">
                                    {doc.category_name}
                                </span>
                            )}
                            <div className="flex justify-between items-center mt-2 pt-4 border-t border-parchment">
                                <span className="text-xs px-2.5 py-1 rounded-sm font-medium bg-olive/10 text-olive font-mono-ui">
                                    AI ile Çalış
                                </span>
                                <span className="text-xs text-ink-light font-mono-ui">
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
            <Card className="hover:shadow-xl transition-all duration-300 group bg-paper border-parchment hover:-translate-y-1 h-full paper-fold">
                <Link href={accessToken ? `/chat/${doc.id}` : '/login'} className="block">
                    <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                            <div className={`w-12 h-12 rounded-sm flex items-center justify-center mb-3 ${isNonCourse ? 'bg-lavender/10' : 'bg-olive/10'}`}>
                                <FileText className={`w-6 h-6 ${isNonCourse ? 'text-lavender' : 'text-olive'}`} />
                            </div>
                            <div className="flex items-center gap-1 text-xs text-ink-light font-mono-ui">
                                <Users className="w-3 h-3" />
                                <span>Topluluk</span>
                            </div>
                        </div>
                        <CardTitle className="text-lg font-semibold text-ink group-hover:text-terracotta transition-colors line-clamp-2 font-display">
                            {doc.title}
                        </CardTitle>
                    </CardHeader>
                </Link>
                <CardContent>
                    {isNonCourse && doc.category_name && (
                        <span className="text-xs bg-lavender/10 text-lavender px-2 py-0.5 rounded-sm font-mono-ui">
                            {doc.category_name}
                        </span>
                    )}
                    <div className="flex justify-between items-center mt-2 pt-4 border-t border-parchment">
                        <span className="text-xs px-2.5 py-1 rounded-sm font-medium bg-olive/10 text-olive font-mono-ui">
                            AI ile Çalış
                        </span>
                        <span className="text-xs text-ink-light font-mono-ui">
                            {new Date(doc.created_at).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })}
                        </span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-parchment flex flex-col gap-2">
                        <CreateTestFromLibraryModal
                            documentIds={[doc.id]}
                            documentTitles={[doc.title]}
                        />
                        <CreateFlashcardFromLibraryModal
                            documentIds={[doc.id]}
                            documentTitles={[doc.title]}
                        />
                    </div>
                </CardContent>
            </Card>
        )
    }

    const showMultiSelectButton = true

    return (
        <div className="min-h-screen w-full pt-16 bg-paper relative">
            <div className="absolute inset-0 paper-texture pointer-events-none -z-10" />

            <div className="container mx-auto py-10 px-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-ink font-display">
                            Topluluk Kütüphanesi
                        </h1>
                        <p className="text-ink-light mt-2 font-body">
                            Topluluk tarafından paylaşılan notları keşfedin
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {showMultiSelectButton && (
                            <Button
                                variant={isSelectMode ? "secondary" : "outline"}
                                onClick={toggleSelectMode}
                                className="flex items-center gap-2 font-mono-ui text-xs tracking-wide"
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

                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-light" />
                            <Input
                                placeholder="Ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-paper border-parchment"
                            />
                        </div>
                    </div>
                </div>

                {/* Sticky Panel for Selected Documents */}
                {isSelectMode && selectedDocs.size > 0 && (
                    <div className="fixed right-4 top-24 w-80 bg-paper paper-shadow-lg border border-parchment p-4 z-40 max-h-[60vh] overflow-hidden flex flex-col rounded-sm">
                        <h3 className="font-semibold text-ink mb-3 flex items-center gap-2 flex-shrink-0 font-display">
                            <CheckSquare className="w-4 h-4 text-terracotta" />
                            Seçilen Dökümanlar ({selectedDocs.size}/10)
                        </h3>
                        <div className="space-y-2 overflow-y-auto flex-1">
                            {Array.from(selectedDocs.entries()).map(([id, info]) => (
                                <div key={id} className="flex items-center justify-between p-2 bg-parchment/50 rounded-sm gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-ink truncate font-display">{info.title}</p>
                                        <p className="text-xs text-ink-light truncate font-mono-ui">{info.category}</p>
                                    </div>
                                    <button
                                        onClick={() => removeSelectedDoc(id)}
                                        className="flex-shrink-0 p-1 hover:bg-terracotta/10 rounded-sm transition-colors"
                                    >
                                        <X className="w-4 h-4 text-ink-light hover:text-terracotta" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {selectedDocs.size > 0 && (
                            <div className="mt-3 pt-3 border-t border-parchment flex-shrink-0 space-y-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedDocIds(new Set())
                                        setSelectedDocs(new Map())
                                    }}
                                    className="w-full text-ink-light hover:text-terracotta font-mono-ui"
                                >
                                    Tümünü Temizle
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleStartMultiChat}
                                    disabled={selectedDocIds.size < 2}
                                    className="w-full border-ink/20 text-ink hover:bg-paper-dark hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed font-mono-ui"
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Chatbot ile Çalış
                                </Button>
                                {accessToken && (
                                    <CreateTestFromLibraryModal
                                        documentIds={Array.from(selectedDocIds)}
                                        documentTitles={Array.from(selectedDocs.values()).map(v => v.title)}
                                    />
                                )}
                                {accessToken && (
                                    <CreateFlashcardFromLibraryModal
                                        documentIds={Array.from(selectedDocIds)}
                                        documentTitles={Array.from(selectedDocs.values()).map(v => v.title)}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Selection Info Banner */}
                {isSelectMode && (
                    <div className="mb-6 p-4 bg-parchment/50 border border-parchment rounded-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CheckSquare className="w-5 h-5 text-olive" />
                            <span className="text-ink font-body">
                                <strong>{selectedDocIds.size}</strong> / 10 döküman seçildi
                                {selectedDocIds.size < 2 && (
                                    <span className="text-ink-light ml-2">(En az 2 döküman seçin)</span>
                                )}
                            </span>
                        </div>
                        {selectedDocIds.size > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDocIds(new Set())}
                                className="text-terracotta hover:text-terracotta/80 font-mono-ui"
                            >
                                Temizle
                            </Button>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
                    <TabsList className="bg-paper-dark w-full overflow-x-auto flex-nowrap scrollbar-hide border border-parchment rounded-sm">
                        <TabsTrigger value="courses" className="flex items-center gap-2 font-mono-ui text-xs tracking-wide">
                            <GraduationCap className="w-4 h-4" />
                            Ders Dökümanları
                        </TabsTrigger>
                        <TabsTrigger value="non_courses" className="flex items-center gap-2 font-mono-ui text-xs tracking-wide">
                            <Library className="w-4 h-4" />
                            Ders Dışı Dökümanlar
                        </TabsTrigger>
                    </TabsList>

                    {/* Course Documents Tab */}
                    <TabsContent value="courses" className="mt-6">
                        {/* Breadcrumb for courses */}
                        {viewMode !== 'courses' && (
                            <div className="flex items-center gap-2 mb-6 text-sm text-ink-light font-mono-ui">
                                <button
                                    onClick={handleBackToCourses}
                                    className="hover:text-terracotta transition-colors flex items-center gap-1"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Dersler
                                </button>
                                {selectedCourse && (
                                    <>
                                        <ChevronRight className="h-4 w-4" />
                                        <button
                                            onClick={handleBackToTopics}
                                            className={viewMode === 'documents' ? 'hover:text-terracotta transition-colors' : 'text-terracotta font-medium'}
                                        >
                                            {selectedCourse}
                                        </button>
                                    </>
                                )}
                                {selectedTopic && (
                                    <>
                                        <ChevronRight className="h-4 w-4" />
                                        <span className="text-terracotta font-medium">{selectedTopic}</span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Content */}
                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
                            </div>
                        ) : (
                            <>
                                {/* Courses View */}
                                {viewMode === 'courses' && (
                                    <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {filteredCourses.length === 0 ? (
                                            <Card className="col-span-full border-dashed border-2 border-parchment bg-paper/50">
                                                <CardHeader className="text-center py-10">
                                                    <div className="w-16 h-16 bg-parchment rounded-sm flex items-center justify-center mx-auto mb-4">
                                                        <GraduationCap className="w-8 h-8 text-ink-light" />
                                                    </div>
                                                    <CardTitle className="text-xl text-ink-light font-display">Henüz paylaşılan ders yok</CardTitle>
                                                </CardHeader>
                                                <CardContent className="text-center pb-10">
                                                    <p className="text-ink-light mb-4 font-body">
                                                        İlk notu paylaşan siz olun!
                                                    </p>
                                                    <Link href="/dashboard">
                                                        <Button className="bg-ink text-paper hover:bg-ink/90 font-mono-ui">Not Yükle</Button>
                                                    </Link>
                                                </CardContent>
                                            </Card>
                                        ) : (
                                            filteredCourses.map((course) => (
                                                <Card
                                                    key={course.course_name}
                                                    className="hover:shadow-xl transition-all duration-300 cursor-pointer group bg-paper border-parchment hover:-translate-y-1 paper-fold"
                                                    onClick={() => handleCourseClick(course.course_name)}
                                                >
                                                    <CardHeader className="pb-2">
                                                        <div className="flex items-start justify-between">
                                                            <div className="w-12 h-12 bg-ink rounded-sm flex items-center justify-center mb-3">
                                                                <BookOpen className="w-6 h-6 text-paper" />
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-parchment group-hover:text-terracotta transition-colors" />
                                                        </div>
                                                        <CardTitle className="text-lg font-semibold text-ink group-hover:text-terracotta transition-colors font-display">
                                                            {course.course_name}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="flex items-center gap-4 text-sm text-ink-light font-mono-ui">
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
                                    <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {filteredTopics.length === 0 ? (
                                            <Card className="col-span-full border-dashed border-2 border-parchment bg-paper/50">
                                                <CardHeader className="text-center py-10">
                                                    <CardTitle className="text-xl text-ink-light font-display">Bu derste henüz konu yok</CardTitle>
                                                </CardHeader>
                                            </Card>
                                        ) : (
                                            filteredTopics.map((topic) => (
                                                <Card
                                                    key={topic.topic}
                                                    className="hover:shadow-xl transition-all duration-300 cursor-pointer group bg-paper border-parchment hover:-translate-y-1 paper-fold"
                                                    onClick={() => handleTopicClick(topic.topic)}
                                                >
                                                    <CardHeader className="pb-2">
                                                        <div className="flex items-start justify-between">
                                                            <div className="w-12 h-12 bg-lavender/10 rounded-sm flex items-center justify-center mb-3">
                                                                <FolderOpen className="w-6 h-6 text-lavender" />
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-parchment group-hover:text-terracotta transition-colors" />
                                                        </div>
                                                        <CardTitle className="text-lg font-semibold text-ink group-hover:text-terracotta transition-colors font-display">
                                                            {topic.topic}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="flex items-center gap-1 text-sm text-ink-light font-mono-ui">
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
                                    <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {filteredDocuments.length === 0 ? (
                                            <Card className="col-span-full border-dashed border-2 border-parchment bg-paper/50">
                                                <CardHeader className="text-center py-10">
                                                    <CardTitle className="text-xl text-ink-light font-display">Bu konuda henüz not yok</CardTitle>
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
                            <div className="flex items-center gap-2 mb-6 text-sm text-ink-light font-mono-ui">
                                <button
                                    onClick={handleBackToCategories}
                                    className="hover:text-terracotta transition-colors flex items-center gap-1"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Kategoriler
                                </button>
                                <ChevronRight className="h-4 w-4" />
                                <span className="text-terracotta font-medium">{selectedCategory.name}</span>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
                            </div>
                        ) : !selectedCategory ? (
                            /* Categories View */
                            <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {filteredCategories.length === 0 ? (
                                    <Card className="col-span-full border-dashed border-2 border-parchment bg-paper/50">
                                        <CardHeader className="text-center py-10">
                                            <div className="w-16 h-16 bg-parchment rounded-sm flex items-center justify-center mx-auto mb-4">
                                                <Tags className="w-8 h-8 text-ink-light" />
                                            </div>
                                            <CardTitle className="text-xl text-ink-light font-display">Henüz kategori yok</CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-center pb-10">
                                            <p className="text-ink-light font-body">
                                                Admin henüz ders dışı kategorileri oluşturmamış.
                                            </p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    filteredCategories.map((category) => (
                                        <Card
                                            key={category.id}
                                            className="hover:shadow-xl transition-all duration-300 cursor-pointer group bg-paper border-parchment hover:-translate-y-1 paper-fold"
                                            onClick={() => handleCategoryClick(category)}
                                        >
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="w-12 h-12 bg-lavender/10 rounded-sm flex items-center justify-center mb-3">
                                                        <Tags className="w-6 h-6 text-lavender" />
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-parchment group-hover:text-terracotta transition-colors" />
                                                </div>
                                                <CardTitle className="text-lg font-semibold text-ink group-hover:text-terracotta transition-colors font-display">
                                                    {category.name}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {category.description && (
                                                    <p className="text-sm text-ink-light mb-2 line-clamp-2 font-body">
                                                        {category.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-1 text-sm text-ink-light font-mono-ui">
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
                            <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {filteredNonCourseDocuments.length === 0 ? (
                                    <Card className="col-span-full border-dashed border-2 border-parchment bg-paper/50">
                                        <CardHeader className="text-center py-10">
                                            <CardTitle className="text-xl text-ink-light font-display">Bu kategoride henüz döküman yok</CardTitle>
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
