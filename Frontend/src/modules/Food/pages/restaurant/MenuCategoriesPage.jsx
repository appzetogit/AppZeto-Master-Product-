import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
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
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function MenuCategoriesPage() {
  const navigate = useNavigate()
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
        // This page is for managing the restaurant's own categories only.
        // Backend includePending=true ensures only this restaurant's pending categories are included,
        // so filtering by restaurantId safely hides admin/global categories.
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

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PNG, JPG, JPEG, or WEBP.")
      return
    }
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
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

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      let imageUrl =
        formData.image && String(formData.image).trim()
          ? String(formData.image).trim()
          : ""

      // Upload image if a file was selected.
      if (selectedImageFile) {
        setUploadingImage(true)
        const res = await uploadAPI.uploadMedia(selectedImageFile, { folder: "food/categories" })
        const url = res?.data?.data?.url || res?.data?.url
        if (url) imageUrl = String(url)
      }

      // Payload aligned to Backend FoodCategory model.
      const categoryData = {
        name: formData.name.trim(),
        type: String(formData.type || "").trim(),
        image: imageUrl,
        isActive: formData.isActive !== false,
        sortOrder: Number.isFinite(Number(formData.sortOrder)) ? Number(formData.sortOrder) : 0,
      }

      if (editingCategory) {
        // Update existing category
        await restaurantAPI.updateCategory(editingCategory._id || editingCategory.id, categoryData)
        toast.success('Category updated successfully')
      } else {
        // Create new category
        await restaurantAPI.createCategory(categoryData)
        toast.success('Category created successfully')
      }
      setShowAddModal(false)
      fetchCategories()
    } catch (error) {
      debugError('Error saving category:', error)
      if (error.code === 'ERR_NETWORK') {
        toast.error('Network error. Please check if backend server is running.')
      } else {
        toast.error(error.response?.data?.message || error.message || 'Failed to save category')
      }
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDeleteCategory = async (category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await restaurantAPI.deleteCategory(category._id || category.id)
      toast.success('Category deleted successfully')
      fetchCategories()
    } catch (error) {
      debugError('Error deleting category:', error)
      toast.error(error.response?.data?.message || 'Failed to delete category')
    }
  }

  const handleToggleActive = async (category) => {
    try {
      await restaurantAPI.updateCategory(category._id || category.id, {
        isActive: !category.isActive
      })
      toast.success(`Category ${!category.isActive ? 'activated' : 'deactivated'}`)
      fetchCategories()
    } catch (error) {
      debugError('Error toggling category:', error)
      toast.error('Failed to update category')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Menu Categories</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Add Category Button */}
        <button
          onClick={handleAddCategory}
          className="w-full py-3 px-4 bg-black text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>

        {/* Categories List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No categories yet</p>
            <p className="text-sm text-gray-400">Add your first category to organize your menu items</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <motion.div
                key={category._id || category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{category.name}</h3>
                      {category.isApproved === false && (
                        <span className="text-[10px] px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-full font-medium">
                          Pending approval
                        </span>
                      )}
                      {!category.isActive && (
                        <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full font-medium">Deactivated</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Items: {category.itemCount || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(category)}
                    className={`p-2 rounded-lg transition-all ${category.isActive
                        ? 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-100'
                        : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                      }`}
                    title={category.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {category.isActive ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    title="Delete"
                    disabled={category.itemCount > 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Category Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Starters, Main Course, Desserts"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    maxLength={100}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Category type (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      placeholder="e.g., Food, Beverages"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Sort order (optional)
                    </label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData({ ...formData, sortOrder: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Lower numbers appear first.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Category image (optional)
                    </label>
                    {(imagePreview || formData.image) && (
                      <div className="mb-3">
                        <img
                          src={imagePreview || formData.image}
                          alt="Category preview"
                          className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleImageFileChange}
                        className="hidden"
                        id="restaurant-category-image"
                      />
                      <label
                        htmlFor="restaurant-category-image"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        {imagePreview ? "Change image" : "Upload image"}
                      </label>
                      <input
                        type="url"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        placeholder="...or paste image URL"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Active</p>
                      <p className="text-[11px] text-gray-500">Hidden categories won’t be listed by default.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, isActive: !p.isActive }))}
                      className={`h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${
                        formData.isActive
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {formData.isActive ? "Active" : "Inactive"}
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-4 py-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  disabled={uploadingImage}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-colors ${
                    uploadingImage
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  {uploadingImage ? "Uploading..." : (editingCategory ? 'Update' : 'Create')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}


