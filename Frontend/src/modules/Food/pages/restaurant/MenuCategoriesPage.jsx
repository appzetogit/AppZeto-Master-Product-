import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import useRestaurantBackNavigation from "@food/hooks/useRestaurantBackNavigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Plus,
  X,
  Edit2,
  Trash2,
  GripVertical,
  Loader2,
  Eye,
  EyeOff,
  Upload
} from "lucide-react"
import { restaurantAPI, uploadAPI } from "@food/api"
import { toast } from "sonner"
import { ImageSourcePicker } from "@food/components/ImageSourcePicker"
import { isFlutterBridgeAvailable } from "@food/utils/imageUploadUtils"

const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function MenuCategoriesPage() {
  const navigate = useNavigate()
  const goBack = useRestaurantBackNavigation()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    image: '',
    isActive: true,
    sortOrder: 0,
  })
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false)
  const fileInputRef = useRef(null)

  // Fetch categories
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await restaurantAPI.getAllCategories({ includePending: true })
      if (response.data.success) {
        const all = response.data.data.categories || []
        const own = all.filter((c) => Boolean(c?.restaurantId))
        setCategories(own)
      }
    } catch (error) {
      debugError('Error fetching categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      type: '',
      image: '',
      isActive: true,
      sortOrder: 0,
    })
    setSelectedImageFile(null)
    setImagePreview(null)
    setUploadingImage(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setShowAddModal(true)
  }

  const handleEditCategory = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name || '',
      type: category.type || '',
      image: category.image || '',
      isActive: category.isActive !== false,
      sortOrder: Number.isFinite(Number(category.sortOrder)) ? Number(category.sortOrder) : 0,
    })
    setSelectedImageFile(null)
    setImagePreview(category.image || null)
    setUploadingImage(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setShowAddModal(true)
  }

  const handleImageFileChange = (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size exceeds 5MB limit.")
      return
    }
    setSelectedImageFile(file)
    try {
      setImagePreview(URL.createObjectURL(file))
    } catch {
      setImagePreview(null)
    }
  }

  const handleImageClick = () => {
    if (isFlutterBridgeAvailable()) {
      setIsPhotoPickerOpen(true)
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      let imageUrl = formData.image && String(formData.image).trim() ? String(formData.image).trim() : ""

      if (selectedImageFile) {
        setUploadingImage(true)
        const res = await uploadAPI.uploadMedia(selectedImageFile, { folder: "food/categories" })
        const url = res?.data?.data?.url || res?.data?.url
        if (url) imageUrl = String(url)
      }

      const categoryData = {
        name: formData.name.trim(),
        type: String(formData.type || "").trim(),
        image: imageUrl,
        isActive: formData.isActive !== false,
        sortOrder: Number.isFinite(Number(formData.sortOrder)) ? Number(formData.sortOrder) : 0,
      }

      if (editingCategory) {
        await restaurantAPI.updateCategory(editingCategory._id || editingCategory.id, categoryData)
        toast.success('Category updated successfully')
      } else {
        await restaurantAPI.createCategory(categoryData)
        toast.success('Category created successfully')
      }
      setShowAddModal(false)
      fetchCategories()
    } catch (error) {
      debugError('Error saving category:', error)
      toast.error(error.response?.data?.message || 'Failed to save category')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDeleteCategory = async (category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return
    try {
      await restaurantAPI.deleteCategory(category._id || category.id)
      toast.success('Category deleted successfully')
      fetchCategories()
    } catch (error) {
      toast.error('Failed to delete category')
    }
  }

  const handleToggleActive = async (category) => {
    try {
      await restaurantAPI.updateCategory(category._id || category.id, { isActive: !category.isActive })
      fetchCategories()
    } catch (error) {
      toast.error('Failed to update category')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={goBack} className="p-1 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Menu Categories</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <button onClick={handleAddCategory} className="w-full py-3 px-4 bg-black text-white rounded-lg font-semibold flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Add Category
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <motion.div key={category._id || category.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-xs text-gray-400">Items: {category.itemCount || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleActive(category)} className="p-2 rounded-lg bg-gray-100">{category.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                  <button onClick={() => handleEditCategory(category)} className="p-2 rounded-lg bg-blue-100 text-blue-700"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteCategory(category)} className="p-2 rounded-lg bg-red-100 text-red-700" disabled={category.itemCount > 0}><Trash2 className="w-4 h-4" /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-black/50 z-50" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 p-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between mb-4"><h2 className="text-lg font-bold">Category Details</h2><button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button></div>
              <div className="space-y-4">
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Category Name" className="w-full p-3 border rounded-lg" />
                <div className="flex items-center gap-3">
                  {imagePreview && <img src={imagePreview} className="w-16 h-16 rounded-lg object-cover" />}
                  <button type="button" onClick={handleImageClick} className="px-4 py-2 border rounded-lg flex items-center gap-2"><Upload className="w-4 h-4" /> Upload Image</button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleImageFileChange(e.target.files?.[0])} />
                </div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isActive} onChange={() => setFormData(p => ({ ...p, isActive: !p.isActive }))} /> Active</label>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 border rounded-lg">Cancel</button>
                <button onClick={handleSaveCategory} disabled={uploadingImage} className="flex-1 py-3 bg-black text-white rounded-lg">{uploadingImage ? "Uploading..." : "Save"}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ImageSourcePicker
        isOpen={isPhotoPickerOpen}
        onClose={() => setIsPhotoPickerOpen(false)}
        onFileSelect={handleImageFileChange}
        title="Category Image"
        description="Choose how to upload your category image"
        fileNamePrefix="category-photo"
        galleryInputRef={fileInputRef}
      />
    </div>
  )
}
