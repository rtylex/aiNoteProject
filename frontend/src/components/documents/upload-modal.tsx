'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { supabase } from '@/lib/supabase/client'
import {
    UploadCloud,
    FileText,
    Loader2,
    Plus,
    Globe,
    Lock,
    ChevronRight,
    ChevronLeft,
    BookOpen,
    FolderOpen,
    GraduationCap,
    Library,
    AlertTriangle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/lib/api-config'
import { useAuth } from '@/lib/auth-context'

// New simplified step flow: file -> visibility -> (if public) type -> metadata
type UploadStep = 'file' | 'visibility' | 'type' | 'metadata'
type DocumentType = 'course' | 'non_course'

interface Category {
    id: string
    name: string
    description: string | null
}

interface CourseSuggestions {
    courses: string[]
    topics: string[]
    course_topics: Record<string, string[]>
}

export function UploadModal() {
    const [file, setFile] = useState<File | null>(null)
    const [documentType, setDocumentType] = useState<DocumentType>('course')
    const [courseName, setCourseName] = useState('')
    const [topic, setTopic] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [categories, setCategories] = useState<Category[]>([])
    const [visibility, setVisibility] = useState<'private' | 'public'>('private')
    const [uploading, setUploading] = useState(false)
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<UploadStep>('file')
    const [userRole, setUserRole] = useState<string>('user')
    const [suggestions, setSuggestions] = useState<CourseSuggestions>({ courses: [], topics: [], course_topics: {} })
    const [showCourseDropdown, setShowCourseDropdown] = useState(false)
    const [showTopicDropdown, setShowTopicDropdown] = useState(false)
    const router = useRouter()
    const { accessToken } = useAuth()

    // Fetch categories, user role, and suggestions when modal opens
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/documents/categories/list`)
                if (response.ok) {
                    const data = await response.json()
                    setCategories(data)
                }
            } catch (error) {
                console.error('Error fetching categories:', error)
            }
        }

        const fetchUserRole = async () => {
            if (!accessToken) return
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/admin/me`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                if (response.ok) {
                    const data = await response.json()
                    setUserRole(data.role || 'user')
                }
            } catch (error) {
                console.error('Error fetching user role:', error)
            }
        }

        const fetchSuggestions = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/documents/suggestions/all`)
                if (response.ok) {
                    const data = await response.json()
                    setSuggestions(data)
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error)
            }
        }

        if (open) {
            fetchCategories()
            fetchUserRole()
            fetchSuggestions()
        }
    }, [open, accessToken])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleUpload = async () => {
        if (!file || !accessToken) return

        setUploading(true)

        try {
            const sanitizedName = file.name
                .replace(/[^a-zA-Z0-9.-]/g, '_')
                .replace(/_{2,}/g, '_')

            const filename = `${Date.now()}-${sanitizedName}`
            const { data, error } = await supabase.storage
                .from('course_materials')
                .upload(filename, file)

            if (error) {
                console.error('Upload error:', error)
                alert('Yükleme başarısız oldu')
                setUploading(false)
                return
            }

            const { data: publicUrlData } = supabase.storage
                .from('course_materials')
                .getPublicUrl(data.path)

            const fileUrl = publicUrlData.publicUrl

            const response = await fetch(`${API_BASE_URL}/api/v1/documents/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    title: file.name,
                    file_url: fileUrl,
                    document_type: visibility === 'private' ? 'course' : documentType,
                    course_name: visibility === 'public' && documentType === 'course' ? (courseName || null) : null,
                    topic: visibility === 'public' && documentType === 'course' ? (topic || null) : null,
                    category_id: visibility === 'public' && documentType === 'non_course' ? (categoryId || null) : null,
                    visibility: visibility
                })
            })

            if (!response.ok) {
                throw new Error('Backend processing failed')
            }

            const result = await response.json()

            // Reset form
            resetForm()

            // If public, show message about pending approval
            if (visibility === 'public') {
                alert('Notunuz başarıyla yüklendi! Admin onayından sonra topluluk kütüphanesinde görünecektir.')
                router.push('/dashboard')
            } else {
                router.push(`/chat/${result.id}`)
            }
            router.refresh()

        } catch (e) {
            console.error(e)
            alert('Yükleme veya işleme sırasında bir hata oluştu')
        } finally {
            setUploading(false)
        }
    }

    const resetForm = () => {
        setFile(null)
        setDocumentType('course')
        setCourseName('')
        setTopic('')
        setCategoryId('')
        setVisibility('private')
        setStep('file')
        setOpen(false)
    }

    const canProceedToVisibility = file !== null
    const canProceedToType = true
    const canProceedToMetadata = true
    const canUploadPrivate = file !== null
    const canUploadPublic = file !== null && (documentType === 'course' || categoryId) && !(visibility === 'public' && documentType === 'course' && userRole === 'user')

    // Determine total steps based on visibility
    const getTotalSteps = () => visibility === 'private' ? 2 : 4

    const renderStepIndicator = () => {
        const currentStep = step as string // Avoid TypeScript narrowing issues

        // For private visibility, show only 2 steps
        if (visibility === 'private') {
            return (
                <div className="flex items-center justify-center gap-2 mb-6">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'file' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                        1
                    </div>
                    <div className="w-6 h-0.5 bg-indigo-100" />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'visibility' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                        2
                    </div>
                </div>
            )
        }

        // For public visibility, show all 4 steps
        return (
            <div className="flex items-center justify-center gap-2 mb-6">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'file' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                    1
                </div>
                <div className="w-6 h-0.5 bg-indigo-100" />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'visibility' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                    2
                </div>
                <div className="w-6 h-0.5 bg-indigo-100" />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'type' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                    3
                </div>
                <div className="w-6 h-0.5 bg-indigo-100" />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'metadata' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                    4
                </div>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) resetForm()
        }}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Belge Yükle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-xl border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {step === 'file' && 'Dosya Seç'}
                        {step === 'visibility' && 'Paylaşım Ayarı'}
                        {step === 'type' && 'Döküman Türü'}
                        {step === 'metadata' && (documentType === 'course' ? 'Ders Bilgileri' : 'Kategori Seç')}
                    </DialogTitle>
                    <DialogDescription className="text-center text-gray-500">
                        {step === 'file' && 'PDF dosyanızı yükleyin'}
                        {step === 'visibility' && 'Notunuzu kimlerle paylaşmak istiyorsunuz?'}
                        {step === 'type' && 'Bu döküman ne türde?'}
                        {step === 'metadata' && (documentType === 'course' ? 'Ders adı ve konu bilgilerini girin' : 'Dökümanınız için bir kategori seçin')}
                    </DialogDescription>
                </DialogHeader>

                {renderStepIndicator()}

                <div className="py-4">
                    {/* Step 1: File Upload */}
                    {step === 'file' && (
                        <div className="flex items-center justify-center w-full">
                            <Label
                                htmlFor="dropzone-file"
                                className="flex flex-col items-center justify-center w-full h-64 border-2 border-indigo-100 border-dashed rounded-2xl cursor-pointer bg-indigo-50/50 hover:bg-indigo-50 transition-colors"
                            >
                                {file ? (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                                            <FileText className="w-8 h-8 text-indigo-600" />
                                        </div>
                                        <p className="mb-2 text-sm font-semibold text-gray-700 truncate max-w-[200px]">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mt-4 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                setFile(null)
                                            }}
                                        >
                                            Dosyayı Kaldır
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                                            <UploadCloud className="w-8 h-8 text-indigo-600" />
                                        </div>
                                        <p className="mb-2 text-sm text-gray-500">
                                            <span className="font-semibold text-indigo-600">Yüklemek için tıklayın</span> veya sürükleyip bırakın
                                        </p>
                                        <p className="text-xs text-gray-400">Sadece PDF (Maks. 50MB)</p>
                                    </div>
                                )}
                                <Input
                                    id="dropzone-file"
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </Label>
                        </div>
                    )}

                    {/* Step 2: Visibility Selection (NOW SECOND!) */}
                    {step === 'visibility' && (
                        <div className="space-y-4">
                            <div
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${visibility === 'private'
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                onClick={() => setVisibility('private')}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${visibility === 'private' ? 'bg-indigo-600' : 'bg-gray-100'}`}>
                                        <Lock className={`w-5 h-5 ${visibility === 'private' ? 'text-white' : 'text-gray-500'}`} />
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold ${visibility === 'private' ? 'text-indigo-600' : 'text-gray-700'}`}>
                                            Sadece Ben
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Bu not sadece size özel olacak. Kişisel çalışmalarınız için ideal.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${visibility === 'public'
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                onClick={() => setVisibility('public')}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${visibility === 'public' ? 'bg-indigo-600' : 'bg-gray-100'}`}>
                                        <Globe className={`w-5 h-5 ${visibility === 'public' ? 'text-white' : 'text-gray-500'}`} />
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold ${visibility === 'public' ? 'text-indigo-600' : 'text-gray-700'}`}>
                                            Toplulukla Paylaş
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Diğer öğrenciler de bu notla AI destekli çalışabilir. Admin onayı gerektirir.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Document Type Selection (ONLY FOR PUBLIC) */}
                    {step === 'type' && (
                        <div className="space-y-4">
                            <div
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${documentType === 'course'
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                onClick={() => setDocumentType('course')}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${documentType === 'course' ? 'bg-indigo-600' : 'bg-gray-100'}`}>
                                        <GraduationCap className={`w-5 h-5 ${documentType === 'course' ? 'text-white' : 'text-gray-500'}`} />
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold ${documentType === 'course' ? 'text-indigo-600' : 'text-gray-700'}`}>
                                            Ders Dökümanı
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Ders notları, slaytlar, ödevler ve sınav dökümanları
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${documentType === 'non_course'
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                onClick={() => setDocumentType('non_course')}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${documentType === 'non_course' ? 'bg-indigo-600' : 'bg-gray-100'}`}>
                                        <Library className={`w-5 h-5 ${documentType === 'non_course' ? 'text-white' : 'text-gray-500'}`} />
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold ${documentType === 'non_course' ? 'text-indigo-600' : 'text-gray-700'}`}>
                                            Ders Dışı Döküman
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Makaleler, kitaplar, tezler ve diğer akademik kaynaklar
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Warning for regular users about course document restrictions */}
                            {documentType === 'course' && userRole === 'user' && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-red-700">
                                            Ders dökümanı paylaşımı kısıtlı
                                        </p>
                                        <p className="text-sm text-red-600 mt-1">
                                            Topluluk kütüphanesine ders dökümanı yüklemek için öğretmen veya admin rolüne sahip olmanız gerekmektedir.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Metadata - Course Information */}
                    {step === 'metadata' && documentType === 'course' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="courseName" className="text-sm font-medium text-gray-700">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-indigo-600" />
                                        Ders Adı
                                    </div>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="courseName"
                                        placeholder="Örn: CS101, Fizik, Matematik"
                                        value={courseName}
                                        onChange={(e) => setCourseName(e.target.value)}
                                        onFocus={() => setShowCourseDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowCourseDropdown(false), 200)}
                                        className="bg-white"
                                        autoComplete="off"
                                    />
                                    {showCourseDropdown && suggestions.courses.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            <div className="p-2 text-xs text-gray-500 border-b bg-gray-50">
                                                Mevcut Dersler ({suggestions.courses.length})
                                            </div>
                                            {suggestions.courses
                                                .filter(c => c.toLowerCase().includes(courseName.toLowerCase()))
                                                .map((course, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2"
                                                        onMouseDown={() => {
                                                            setCourseName(course)
                                                            setShowCourseDropdown(false)
                                                        }}
                                                    >
                                                        <GraduationCap className="w-4 h-4 text-indigo-500" />
                                                        {course}
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400">
                                    {suggestions.courses.length > 0
                                        ? `${suggestions.courses.length} mevcut ders bulundu. Listeden seçebilir veya yeni girebilirsiniz.`
                                        : 'Ders adını girmeniz önerilir'}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="topic" className="text-sm font-medium text-gray-700">
                                    <div className="flex items-center gap-2">
                                        <FolderOpen className="w-4 h-4 text-purple-600" />
                                        Konu
                                    </div>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="topic"
                                        placeholder="Örn: Algoritmalar, Termodinamik, Türev"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        onFocus={() => setShowTopicDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowTopicDropdown(false), 200)}
                                        className="bg-white"
                                        autoComplete="off"
                                    />
                                    {showTopicDropdown && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {/* Show topics for selected course first */}
                                            {courseName && suggestions.course_topics[courseName] && (
                                                <>
                                                    <div className="p-2 text-xs text-gray-500 border-b bg-indigo-50">
                                                        "{courseName}" dersi için konular
                                                    </div>
                                                    {suggestions.course_topics[courseName]
                                                        .filter(t => t.toLowerCase().includes(topic.toLowerCase()))
                                                        .map((t, idx) => (
                                                            <button
                                                                key={`course-${idx}`}
                                                                type="button"
                                                                className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 transition-colors flex items-center gap-2"
                                                                onMouseDown={() => {
                                                                    setTopic(t)
                                                                    setShowTopicDropdown(false)
                                                                }}
                                                            >
                                                                <FolderOpen className="w-4 h-4 text-purple-500" />
                                                                {t}
                                                            </button>
                                                        ))}
                                                </>
                                            )}
                                            {/* Show all topics */}
                                            {suggestions.topics.length > 0 && (
                                                <>
                                                    <div className="p-2 text-xs text-gray-500 border-b bg-gray-50">
                                                        Tüm Konular ({suggestions.topics.length})
                                                    </div>
                                                    {suggestions.topics
                                                        .filter(t => t.toLowerCase().includes(topic.toLowerCase()))
                                                        .slice(0, 10)
                                                        .map((t, idx) => (
                                                            <button
                                                                key={`all-${idx}`}
                                                                type="button"
                                                                className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 transition-colors flex items-center gap-2"
                                                                onMouseDown={() => {
                                                                    setTopic(t)
                                                                    setShowTopicDropdown(false)
                                                                }}
                                                            >
                                                                <FolderOpen className="w-4 h-4 text-gray-400" />
                                                                {t}
                                                            </button>
                                                        ))}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400">
                                    {courseName && suggestions.course_topics[courseName]
                                        ? `Bu ders için ${suggestions.course_topics[courseName].length} mevcut konu var.`
                                        : 'Notunuzun hangi konuyla ilgili olduğunu belirtin'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Category Selection for non-course documents */}
                    {step === 'metadata' && documentType === 'non_course' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">
                                    <div className="flex items-center gap-2">
                                        <Library className="w-4 h-4 text-indigo-600" />
                                        Kategori Seçin
                                    </div>
                                </Label>
                                {categories.length === 0 ? (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="text-sm text-amber-700">
                                            Henüz kategori oluşturulmamış. Lütfen admin ile iletişime geçin.
                                        </p>
                                    </div>
                                ) : (
                                    <Select value={categoryId} onValueChange={setCategoryId}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Bir kategori seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <p className="text-xs text-gray-400">
                                    Dökümanınızın türünü en iyi tanımlayan kategoriyi seçin
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2">
                    {step !== 'file' && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (step === 'metadata') setStep('type')
                                else if (step === 'type') setStep('visibility')
                                else if (step === 'visibility') setStep('file')
                            }}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Geri
                        </Button>
                    )}

                    {step === 'file' && (
                        <Button
                            onClick={() => setStep('visibility')}
                            disabled={!canProceedToVisibility}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                        >
                            Devam Et
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    )}

                    {step === 'visibility' && visibility === 'private' && (
                        <Button
                            onClick={handleUpload}
                            disabled={!canUploadPrivate || uploading}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Yükleniyor...
                                </>
                            ) : (
                                <>
                                    <UploadCloud className="w-4 h-4 mr-1" />
                                    Yükle ve Başla
                                </>
                            )}
                        </Button>
                    )}

                    {step === 'visibility' && visibility === 'public' && (
                        <Button
                            onClick={() => setStep('type')}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                        >
                            Devam Et
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    )}

                    {step === 'type' && (
                        <Button
                            onClick={() => setStep('metadata')}
                            disabled={documentType === 'course' && userRole === 'user'}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                        >
                            Devam Et
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    )}

                    {step === 'metadata' && (
                        <Button
                            onClick={handleUpload}
                            disabled={!canUploadPublic || uploading}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Yükleniyor...
                                </>
                            ) : (
                                <>
                                    <UploadCloud className="w-4 h-4 mr-1" />
                                    Yükle ve Paylaş
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
