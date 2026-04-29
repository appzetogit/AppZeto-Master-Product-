import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import useRestaurantBackNavigation from "@food/hooks/useRestaurantBackNavigation"
import { motion, AnimatePresence } from "framer-motion"
import Lenis from "lenis"
import {
  ArrowLeft,
  Edit,
  Pencil,
  Plus,
  MapPin,
  Clock,
  Star,
  ChevronRight,
  X,
  Trash2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@food/components/ui/dialog"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { restaurantAPI } from "@food/api"
import { toast } from "sonner"
import { ImageSourcePicker } from "@food/components/ImageSourcePicker"
import { isFlutterBridgeAvailable, convertBase64ToFile } from "@food/utils/imageUploadUtils"

const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


const CUISINES_STORAGE_KEY = "restaurant_cuisines"

export default function OutletInfo() {
  const navigate = useNavigate()
  const goBack = useRestaurantBackNavigation()
  
  // State management
  const [restaurantData, setRestaurantData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [restaurantName, setRestaurantName] = useState("")
  const [isPureVeg, setIsPureVeg] = useState(false)
  const [cuisineTags, setCuisineTags] = useState("")
  const [address, setAddress] = useState("")
  const [primaryPhone, setPrimaryPhone] = useState("")
  const [ownerInfo, setOwnerInfo] = useState({ name: "", phone: "", email: "" })
  const [legalInfo, setLegalInfo] = useState({ fssai: "", gst: "", pan: "" })
  const [bankInfo, setBankInfo] = useState({ account: "", type: "", holder: "", ifsc: "" })
  const [mainImage, setMainImage] = useState("https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=400&fit=crop")
  const [thumbnailImage, setThumbnailImage] = useState("https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop")
  const [coverImages, setCoverImages] = useState([])
  const [showEditNameDialog, setShowEditNameDialog] = useState(false)
  const [editNameValue, setEditNameValue] = useState("")
  const [restaurantId, setRestaurantId] = useState("")
  const [restaurantMongoId, setRestaurantMongoId] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageType, setImageType] = useState(null)
  const [uploadingCount, setUploadingCount] = useState(0)
  
  const profileImageInputRef = useRef(null)
  const menuImageInputRef = useRef(null)
  const [activePicker, setActivePicker] = useState(null) // { type: 'profile' | 'cover', ref: any, title: string, multiple: boolean }

  // Format address from location object
  const formatAddress = (location) => {
    if (!location) return ""
    
    const parts = []
    if (location.addressLine1) parts.push(location.addressLine1.trim())
    if (location.addressLine2) parts.push(location.addressLine2.trim())
    if (location.area) parts.push(location.area.trim())
    if (location.city) {
      const city = location.city.trim()
      // Only add city if it's not already included in area
      if (!location.area || !location.area.includes(city)) {
        parts.push(city)
      }
    }
    if (location.landmark) parts.push(location.landmark.trim())
    
    return parts.join(", ") || ""
  }

  // Fetch restaurant data on mount
  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        setLoading(true)
        const response = await restaurantAPI.getCurrentRestaurant()
        const data = response?.data?.data?.restaurant || response?.data?.restaurant
        if (data) {
          setRestaurantData(data)
          
          // Set restaurant name
          setRestaurantName(data.restaurantName || data.name || "")
          setIsPureVeg(data.pureVegRestaurant || false)
          
          // Set restaurant ID
          setRestaurantId(data.restaurantId || data.id || "")
          const mongoId = String(data.id || data._id || "")
          setRestaurantMongoId(mongoId)
          
          // Format and set address
          const formattedAddress = formatAddress(data.location || data)
          setAddress(formattedAddress)
          setPrimaryPhone(data.primaryContactNumber || data.ownerPhone || "")
          
          // Set Owner Info
          setOwnerInfo({
            name: data.ownerName || "",
            phone: data.ownerPhone || "",
            email: data.ownerEmail || ""
          })

          // Set Legal Info
          setLegalInfo({
            fssai: data.fssaiNumber || "",
            gst: data.gstNumber || "",
            pan: data.panNumber || ""
          })

          // Set Bank Info
          setBankInfo({
            account: data.accountNumber || "",
            type: data.accountType || "",
            holder: data.accountHolderName || "",
            ifsc: data.ifscCode || ""
          })
          
          // Format cuisines
          if (data.cuisines && Array.isArray(data.cuisines)) {
            setCuisineTags(data.cuisines.join(", "))
          }
          
          // Set images
          if (data.profileImage?.url) {
            setThumbnailImage(data.profileImage.url)
          } else if (typeof data.profileImage === 'string') {
            setThumbnailImage(data.profileImage)
          }

          if (data.coverImages && Array.isArray(data.coverImages) && data.coverImages.length > 0) {
            const formattedCovers = data.coverImages.map(img => typeof img === 'string' ? { url: img } : img)
            setCoverImages(formattedCovers)
            setMainImage(formattedCovers[0].url)
          } else if (data.menuImages && Array.isArray(data.menuImages) && data.menuImages.length > 0) {
            const formattedMenus = data.menuImages.map(img => typeof img === 'string' ? { url: img } : img)
            setCoverImages(formattedMenus)
            setMainImage(formattedMenus[0].url)
          } else {
            setCoverImages([])
          }
        }
      } catch (error) {
        if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNABORTED' && !error.message?.includes('timeout')) {
          debugError("Error fetching restaurant data:", error)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurantData()

    // Listen for updates from edit pages
    const handleCuisinesUpdate = () => {
      fetchRestaurantData()
    }
    const handleAddressUpdate = () => {
      fetchRestaurantData()
    }

    window.addEventListener("cuisinesUpdated", handleCuisinesUpdate)
    window.addEventListener("addressUpdated", handleAddressUpdate)
    
    return () => {
      window.removeEventListener("cuisinesUpdated", handleCuisinesUpdate)
      window.removeEventListener("addressUpdated", handleAddressUpdate)
    }
  }, [])

  // Lenis smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  // Handle profile image replacement
  const handleProfileImageReplace = async (file) => {
    if (!file) return

    try {
      setUploadingImage(true)
      setImageType('profile')

      // Upload image to Cloudinary
      const uploadResponse = await restaurantAPI.uploadProfileImage(file)
      const uploadedImage = uploadResponse?.data?.data?.profileImage

      if (uploadedImage) {
        if (uploadedImage.url) {
          setThumbnailImage(uploadedImage.url)
        }
        
        // Refresh restaurant data
        const response = await restaurantAPI.getCurrentRestaurant()
        const data = response?.data?.data?.restaurant || response?.data?.restaurant
        if (data) {
          setRestaurantData(data)
          if (data.profileImage?.url) {
            setThumbnailImage(data.profileImage.url)
          }
        }
      }
    } catch (error) {
      debugError("Error uploading profile image:", error)
      toast.error("Failed to upload image. Please try again.")
    } finally {
      setUploadingImage(false)
      setImageType(null)
    }
  }

  // Handle multiple cover images addition
  const handleCoverImageAdd = async (files) => {
    if (!files || (Array.isArray(files) && files.length === 0)) return
    const fileArray = Array.isArray(files) ? files : [files]

    try {
      setUploadingImage(true)
      setImageType('menu')
      setUploadingCount(fileArray.length)

      // Get current images
      const currentResponse = await restaurantAPI.getCurrentRestaurant()
      const currentData = currentResponse?.data?.data?.restaurant || currentResponse?.data?.restaurant
      const existingImages = currentData?.menuImages && Array.isArray(currentData.menuImages)
        ? currentData.menuImages.map(img => ({
            url: img.url,
            publicId: img.publicId
          }))
        : []

      const uploadedImageData = []
      const failedUploads = []
      
      for (let i = 0; i < fileArray.length; i++) {
        try {
          const uploadResponse = await restaurantAPI.uploadMenuImage(fileArray[i])
          const uploadedImage = uploadResponse?.data?.data?.menuImage
          if (uploadedImage?.url) {
            uploadedImageData.push({
              url: uploadedImage.url,
              publicId: uploadedImage.publicId || null
            })
          }
        } catch (error) {
          failedUploads.push({ fileName: fileArray[i]?.name || "image", error: error.message })
        }
      }

      if (uploadedImageData.length > 0) {
        const allImages = [...existingImages]
        uploadedImageData.forEach(uploaded => {
          if (!allImages.find(img => img.url === uploaded.url)) {
            allImages.push(uploaded)
          }
        })

        try {
          await restaurantAPI.updateProfile({ menuImages: allImages })
          toast.success(`Successfully uploaded ${uploadedImageData.length} image(s)`)
        } catch (updateError) {
          toast.error("Images uploaded but failed to save.")
        }

        setCoverImages(allImages)
        if (allImages.length > 0) setMainImage(allImages[0].url)
      }
    } catch (error) {
      toast.error("Failed to upload images.")
    } finally {
      setUploadingImage(false)
      setImageType(null)
      setUploadingCount(0)
    }
  }

  const handleImageClick = (type, ref, title, multiple = false) => {
    if (isFlutterBridgeAvailable()) {
      setActivePicker({ type, ref, title, multiple })
    } else {
      ref.current?.click()
    }
  }

  // Handle cover image deletion
  const handleCoverImageDelete = async (indexToDelete) => {
    if (!window.confirm("Are you sure you want to delete this cover image?")) return

    try {
      setUploadingImage(true)
      setImageType('menu')

      const updatedImages = coverImages.filter((_, index) => index !== indexToDelete)
      const menuImagesForBackend = updatedImages.map(img => ({
        url: img.url,
        publicId: img.publicId || null
      }))

      await restaurantAPI.updateProfile({ menuImages: menuImagesForBackend })
      setCoverImages(updatedImages)
      if (indexToDelete === 0 && updatedImages.length > 0) {
        setMainImage(updatedImages[0].url)
      } else if (updatedImages.length === 0) {
        setMainImage("https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=400&fit=crop")
      }
      toast.success("Image deleted successfully")
    } catch (error) {
      toast.error("Failed to delete image.")
    } finally {
      setUploadingImage(false)
      setImageType(null)
    }
  }

  // Handle edit name dialog
  const handleOpenEditDialog = () => {
    setEditNameValue(restaurantName)
    setShowEditNameDialog(true)
  }

  const handleSaveName = async () => {
    const newName = editNameValue.trim()
    if (!newName) return
    try {
      await restaurantAPI.updateProfile({ name: newName })
      setRestaurantName(newName)
      setShowEditNameDialog(false)
      toast.success("Name updated successfully")
    } catch (error) {
      toast.error("Failed to update name")
    }
  }

  return (
    <>
      <div className="min-h-screen bg-white overflow-x-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <button onClick={goBack} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-900" />
              </button>
              <h1 className="text-lg font-bold text-gray-900">Outlet info</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900 font-normal">
                Restaurant id: {loading ? "Loading..." : (restaurantMongoId && restaurantMongoId.length >= 5 ? restaurantMongoId.slice(-5) : (restaurantId || "N/A"))}
              </span>
            </div>
          </div>
        </div>

        {/* Main Image Section */}
        <div className="relative w-full h-[200px] overflow-visible">
          <img src={mainImage} alt="Restaurant banner" className="w-full h-full object-cover" />
          
          <button
            onClick={() => handleImageClick('cover', menuImageInputRef, "Add Cover Image", true)}
            disabled={uploadingImage}
            className="absolute bottom-4 right-4 bg-black/90 hover:bg-black px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium text-white transition-colors shadow-lg z-20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>{uploadingImage && imageType === 'menu' ? `Uploading ${uploadingCount}...` : 'Add image'}</span>
          </button>
          <input
            ref={menuImageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleCoverImageAdd(Array.from(e.target.files || []))}
          />
          
          {/* Cover Images Gallery */}
          {coverImages.length > 0 && (
            <div className="absolute bottom-16 right-4 flex gap-2.5 z-10">
              {coverImages.slice(0, 4).map((img, index) => (
                <div
                  key={index}
                  className={`relative w-14 h-14 rounded-xl border-2 overflow-hidden bg-gray-200 shadow-md transition-all ${
                    mainImage === img.url ? "border-black scale-105" : "border-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setMainImage(img.url)}
                    className="w-full h-full"
                  >
                    <img src={img.url} alt={`Cover ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCoverImageDelete(index); }}
                    disabled={uploadingImage}
                    className="absolute top-1 right-1 bg-red-500/95 hover:bg-red-600 p-1 rounded-full transition-colors z-10"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {coverImages.length > 4 && (
                <div className="w-14 h-14 rounded-xl border-2 border-white bg-black/70 flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-bold">+{coverImages.length - 4}</span>
                </div>
              )}
            </div>
          )}

          {/* Thumbnail Section */}
          <div className="absolute bottom-0 left-4 -mb-[45px] flex flex-col gap-2 shrink-0 z-10">
            <div className="relative w-[70px] h-[70px] rounded overflow-hidden">
              <img src={thumbnailImage} alt="Restaurant thumbnail" className="w-full h-full rounded-xl object-cover" />
            </div>
            <button
              onClick={() => handleImageClick('profile', profileImageInputRef, "Update Profile Photo")}
              disabled={uploadingImage}
              className="text-blue-600 text-sm font-semibold hover:text-blue-700 transition-colors text-left"
            >
              {uploadingImage && imageType === 'profile' ? 'Uploading...' : 'Edit photo'}
            </button>
            <input
              ref={profileImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleProfileImageReplace(e.target.files?.[0])}
            />
          </div>
        </div>

        {/* Info Sections */}
        <div className="px-4 pb-20 space-y-6">
          {/* Basic Information */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Basic Information</h3>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium mb-1">Restaurant Name</p>
                  <p className="text-base font-bold text-gray-900">{restaurantName || "N/A"}</p>
                </div>
                <button onClick={handleOpenEditDialog} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <Pencil className="w-4 h-4 text-blue-600" />
                </button>
              </div>
              
              <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium mb-1">Cuisines</p>
                  <p className="text-sm font-semibold text-gray-800">{cuisineTags || "Not selected"}</p>
                </div>
                <button onClick={() => navigate("/food/restaurant/edit-cuisines")} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <Pencil className="w-4 h-4 text-blue-600" />
                </button>
              </div>

              <div className="p-4 flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium mb-1">Food Type</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 border-2 ${isPureVeg ? "border-green-600" : "border-red-600"} flex items-center justify-center p-0.5`}>
                      <div className={`w-full h-full rounded-full ${isPureVeg ? "bg-green-600" : "bg-red-600"}`} />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{isPureVeg ? "Pure Veg" : "Veg & Non-Veg"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Location & Contact */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Location & Contact</h3>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-xs text-gray-400 font-medium">Outlet Address</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-relaxed">{address || "Address not set"}</p>
                </div>
                <button onClick={() => navigate("/food/restaurant/edit-address")} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <Pencil className="w-4 h-4 text-blue-600" />
                </button>
              </div>

              <div className="p-4 flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium mb-1">Primary Contact</p>
                  <p className="text-sm font-bold text-gray-800">{primaryPhone || "N/A"}</p>
                </div>
                <button onClick={() => navigate("/food/restaurant/phone")} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <Pencil className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
          </section>

          {/* Owner Details */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Owner Details</h3>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium mb-1">Owner Name</p>
                  <p className="text-sm font-bold text-gray-800">{ownerInfo.name || "N/A"}</p>
                </div>
                <button onClick={() => navigate("/food/restaurant/edit-owner")} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <Pencil className="w-4 h-4 text-blue-600" />
                </button>
              </div>
              
              <div className="p-4 border-b border-gray-100">
                <p className="text-xs text-gray-400 font-medium mb-1">Owner Phone</p>
                <p className="text-sm font-semibold text-gray-800">{ownerInfo.phone || "N/A"}</p>
              </div>

              <div className="p-4">
                <p className="text-xs text-gray-400 font-medium mb-1">Owner Email</p>
                <p className="text-sm font-semibold text-gray-800">{ownerInfo.email || "N/A"}</p>
              </div>
            </div>
          </section>

          {/* Legal & Compliance */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Legal & Compliance</h3>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium mb-1">FSSAI License</p>
                  <p className="text-sm font-bold text-gray-800">{legalInfo.fssai || "Not provided"}</p>
                </div>
                <button onClick={() => navigate("/food/restaurant/fssai")} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <Pencil className="w-4 h-4 text-blue-600" />
                </button>
              </div>

              <div className="p-4 border-b border-gray-100">
                <p className="text-xs text-gray-400 font-medium mb-1">GST Number</p>
                <p className="text-sm font-bold text-gray-800">{legalInfo.gst || "Not provided"}</p>
              </div>

              <div className="p-4">
                <p className="text-xs text-gray-400 font-medium mb-1">PAN Number</p>
                <p className="text-sm font-bold text-gray-800">{legalInfo.pan || "Not provided"}</p>
              </div>
            </div>
          </section>

          {/* Operational Settings */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Operational</h3>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-xs text-gray-400 font-medium">Outlet Timings</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {restaurantData?.openingTime && restaurantData?.closingTime 
                      ? `${restaurantData.openingTime} - ${restaurantData.closingTime}` 
                      : "Timings not set"}
                  </p>
                </div>
                <button onClick={() => navigate("/food/restaurant/outlet-timings")} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <Pencil className="w-4 h-4 text-blue-600" />
                </button>
              </div>

              <div className="p-4">
                <p className="text-xs text-gray-400 font-medium mb-1">Service Zone</p>
                <p className="text-sm font-semibold text-gray-800">{restaurantData?.zoneId?.name || "Not assigned"}</p>
              </div>
            </div>
          </section>

          {/* Bank Account */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Bank Account</h3>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium mb-1">Account Number</p>
                  <p className="text-sm font-bold text-gray-800">{bankInfo.account || "Not provided"}</p>
                </div>
                <button onClick={() => navigate("/food/restaurant/update-bank-details")} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <Pencil className="w-4 h-4 text-blue-600" />
                </button>
              </div>

              <div className="p-4 border-b border-gray-100">
                <p className="text-xs text-gray-400 font-medium mb-1">Account Holder</p>
                <p className="text-sm font-semibold text-gray-800">{bankInfo.holder || "N/A"}</p>
              </div>

              <div className="p-4">
                <p className="text-xs text-gray-400 font-medium mb-1">IFSC Code</p>
                <p className="text-sm font-bold text-gray-800 uppercase">{bankInfo.ifsc || "N/A"}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Dialog open={showEditNameDialog} onOpenChange={setShowEditNameDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-xl w-[90%]">
          <DialogHeader className="p-4 border-b border-gray-100"><DialogTitle className="text-lg font-bold">Edit restaurant name</DialogTitle></DialogHeader>
          <div className="p-4"><Input value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)} placeholder="Enter restaurant name" className="w-full" /></div>
          <DialogFooter className="p-4 bg-gray-50 flex flex-row gap-3">
            <Button variant="outline" onClick={() => setShowEditNameDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveName} disabled={!editNameValue.trim()} className="bg-blue-600 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageSourcePicker
        isOpen={!!activePicker}
        onClose={() => setActivePicker(null)}
        onFileSelect={(file) => {
          if (activePicker?.type === 'profile') {
            handleProfileImageReplace(file)
          } else {
            handleCoverImageAdd(file)
          }
        }}
        title={activePicker?.title}
        description={`Choose how to upload your ${activePicker?.type} photo`}
        fileNamePrefix={`outlet-${activePicker?.type}`}
        galleryInputRef={activePicker?.ref}
      />
    </>
  )
}
