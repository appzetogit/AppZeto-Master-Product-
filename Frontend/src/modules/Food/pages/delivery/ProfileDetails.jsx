import { useRef, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Edit2, Eye, X, Loader2, User, Camera } from "lucide-react"
import BottomPopup from "@food/components/delivery/BottomPopup"
import { toast } from "sonner"
import { deliveryAPI } from "@food/api"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function ProfileDetails() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [vehicleNumber, setVehicleNumber] = useState("")
  const [showVehiclePopup, setShowVehiclePopup] = useState(false)
  const [vehicleInput, setVehicleInput] = useState("")
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [showBankDetailsPopup, setShowBankDetailsPopup] = useState(false)
  const [walletBalance, setWalletBalance] = useState(null)
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    panNumber: "",
  })
  const [bankDetailsErrors, setBankDetailsErrors] = useState({})
  const [isUpdatingBankDetails, setIsUpdatingBankDetails] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef(null)
  const [uploadTarget, setUploadTarget] = useState(null) // 'profilePhoto' only for instant picker
  const [showDocumentsEditPopup, setShowDocumentsEditPopup] = useState(false)
  const [docEditFiles, setDocEditFiles] = useState({ aadharPhoto: null, panPhoto: null, drivingLicensePhoto: null })
  const [isSubmittingDocs, setIsSubmittingDocs] = useState(false)
  const aadharInputRef = useRef(null)
  const panInputRef = useRef(null)
  const drivingLicenseInputRef = useRef(null)

  // Note: All alternate phone related code has been removed

  // Fetch profile data
  useEffect(() => {
    const parseWalletBalance = (response) => {
      const data = response?.data
      const wallet =
        (data?.success && data?.data?.wallet) ||
        data?.wallet ||
        data?.data ||
        data

      const possibleBalance =
        wallet?.totalBalance ||
        wallet?.balance ||
        wallet?.pocketBalance ||
        0

      return Number(possibleBalance) || 0
    }

    const fetchWalletBalance = async () => {
      try {
        const walletResponse = await deliveryAPI.getWallet()
        setWalletBalance(parseWalletBalance(walletResponse))
      } catch (error) {
        debugError("Error fetching wallet balance:", error)
      }
    }

    const fetchProfile = async () => {
      try {
        setLoading(true)
        const [profileResponse] = await Promise.allSettled([
          deliveryAPI.getProfile(),
          fetchWalletBalance()
        ])

        if (
          profileResponse?.status === "fulfilled" &&
          profileResponse?.value?.data?.success &&
          profileResponse?.value?.data?.data?.profile
        ) {
          const profileData = profileResponse.value.data.data.profile
          setProfile(profileData)
          setVehicleNumber(profileData?.vehicle?.number || "")
          setVehicleInput(profileData?.vehicle?.number || "")
          // Set bank details
          setBankDetails({
            accountHolderName: profileData?.documents?.bankDetails?.accountHolderName || "",
            accountNumber: profileData?.documents?.bankDetails?.accountNumber || "",
            ifscCode: profileData?.documents?.bankDetails?.ifscCode || "",
            bankName: profileData?.documents?.bankDetails?.bankName || "",
            panNumber: profileData?.documents?.pan?.number || "",
          })
        } else {
          throw new Error("Profile fetch failed")
        }
      } catch (error) {
        debugError("Error fetching profile:", error)
        
        // More detailed error handling
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          toast.error("Cannot connect to server. Please check if backend is running.")
        } else if (error.response?.status === 401) {
          toast.error("Session expired. Please login again.")
          // Optionally redirect to login
          setTimeout(() => {
            navigate("/delivery/login", { replace: true })
          }, 2000)
        } else {
          toast.error(error?.response?.data?.message || "Failed to load profile data")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [navigate])

  useEffect(() => {
    const refreshWalletBalance = async () => {
      try {
        const walletResponse = await deliveryAPI.getWallet()
        const data = walletResponse?.data
        const wallet =
          (data?.success && data?.data?.wallet) ||
          data?.wallet ||
          data?.data ||
          data
        const balance = Number(
          wallet?.totalBalance || wallet?.balance || wallet?.pocketBalance || 0
        ) || 0
        setWalletBalance(balance)
      } catch (error) {
        debugError("Error refreshing wallet balance:", error)
      }
    }

    window.addEventListener("deliveryWalletStateUpdated", refreshWalletBalance)
    return () => {
      window.removeEventListener("deliveryWalletStateUpdated", refreshWalletBalance)
    }
  }, [])

  const isAdminApproved = ["approved", "active"].includes(
    String(profile?.status || "").toLowerCase()
  )

  const getDocumentVerificationLabel = (doc) => {
    if (!doc?.document) return "Not uploaded"
    if (doc?.verified || isAdminApproved) return "Verified"
    return "Not verified"
  }

  const ratingValue = Number(profile?.metrics?.rating)
  const ratingCount = Number(profile?.metrics?.ratingCount || 0)
  const ratingDisplay = Number.isFinite(ratingValue)
    ? `${ratingValue.toFixed(1)} (${ratingCount})`
    : "-"

  const profileImageUrl = profile?.profileImage?.url || profile?.documents?.photo || null

  const refreshProfile = async () => {
    const response = await deliveryAPI.getProfile()
    if (response?.data?.success && response?.data?.data?.profile) {
      setProfile(response.data.data.profile)
    }
  }

  const clearDeliveryAuthLocal = () => {
    try {
      localStorage.removeItem("delivery_accessToken")
      localStorage.removeItem("delivery_refreshToken")
      localStorage.removeItem("delivery_authenticated")
      localStorage.removeItem("delivery_user")
    } catch (_) {}
  }

  const forceLogoutForReapproval = async () => {
    toast.message("Documents updated. Verification required again — please wait for admin approval.")
    try {
      await deliveryAPI.logout()
    } catch (_) {
      // ignore
    } finally {
      clearDeliveryAuthLocal()
      navigate("/delivery/login", { replace: true })
    }
  }

  const hasFlutterCamera = () =>
    typeof window !== "undefined" &&
    window.flutter_inappwebview &&
    typeof window.flutter_inappwebview.callHandler === "function"

  const openPicker = (target) => {
    setUploadTarget(target)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
      fileInputRef.current.click()
    }
  }

  const uploadViaFlutterCamera = async (target) => {
    if (!hasFlutterCamera()) return false
    try {
      setIsUploadingImage(true)
      const res = await window.flutter_inappwebview.callHandler("openCamera")
      if (!res?.success || !res?.base64) return false

      if (target !== "profilePhoto") {
        toast.error("Camera upload is available for profile photo only.")
        return false
      }

      const response = await deliveryAPI.updateProfilePhotoBase64({
        success: true,
        base64: res.base64,
        mimeType: res.mimeType || "image/jpeg",
        fileName: res.fileName || "camera.jpg",
      })

      if (response?.data?.success) {
        toast.success("Profile photo updated")
        await refreshProfile()
        return true
      }
      toast.error(response?.data?.message || "Failed to update photo")
      return false
    } catch (e) {
      debugError("Flutter camera upload failed:", e)
      toast.error("Failed to open camera")
      return false
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget) return
    // Only profile photo uses instant picker; documents use the Edit documents popup
    if (uploadTarget !== "profilePhoto") return
    try {
      setIsUploadingImage(true)
      const formData = new FormData()
      formData.append(uploadTarget, file)
      const response = await deliveryAPI.updateProfileMultipart(formData)
      if (response?.data?.success) {
        toast.success("Profile photo updated")
        await refreshProfile()
      } else {
        toast.error(response?.data?.message || "Update failed")
      }
    } catch (error) {
      debugError("Upload failed:", error)
      toast.error(error?.response?.data?.message || "Update failed")
    } finally {
      setIsUploadingImage(false)
      setUploadTarget(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDocEditFileChange = (field, file) => {
    setDocEditFiles((prev) => ({ ...prev, [field]: file || null }))
  }

  const submitDocumentsEdit = async () => {
    const hasAny = docEditFiles.aadharPhoto || docEditFiles.panPhoto || docEditFiles.drivingLicensePhoto
    if (!hasAny) {
      toast.error("Select at least one document to update")
      return
    }
    try {
      setIsSubmittingDocs(true)
      const formData = new FormData()
      if (docEditFiles.aadharPhoto) formData.append("aadharPhoto", docEditFiles.aadharPhoto)
      if (docEditFiles.panPhoto) formData.append("panPhoto", docEditFiles.panPhoto)
      if (docEditFiles.drivingLicensePhoto) formData.append("drivingLicensePhoto", docEditFiles.drivingLicensePhoto)
      const response = await deliveryAPI.updateProfileMultipart(formData)
      if (response?.data?.success) {
        const requiresReapproval = Boolean(response?.data?.data?.requiresReapproval)
        toast.success("Documents updated successfully")
        setShowDocumentsEditPopup(false)
        setDocEditFiles({ aadharPhoto: null, panPhoto: null, drivingLicensePhoto: null })
        if (aadharInputRef.current) aadharInputRef.current.value = ""
        if (panInputRef.current) panInputRef.current.value = ""
        if (drivingLicenseInputRef.current) drivingLicenseInputRef.current.value = ""
        if (requiresReapproval) {
          await forceLogoutForReapproval()
          return
        }
        await refreshProfile()
      } else {
        toast.error(response?.data?.message || "Update failed")
      }
    } catch (error) {
      debugError("Documents update failed:", error)
      toast.error(error?.response?.data?.message || "Update failed")
    } finally {
      setIsSubmittingDocs(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-4 border-b border-gray-200">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-medium">Profile</h1>
      </div>

      {/* Profile Picture Area */}
      <div className="relative w-full bg-gray-200 overflow-hidden flex items-center justify-center">
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt="Profile"
            className="w-full h-auto max-h-96 object-contain"
          />
        ) : (
          <div className="w-full h-64 flex items-center justify-center bg-gray-200">
            <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center">
              <User className="w-10 h-10 text-gray-500" />
            </div>
          </div>
        )}

        <button
          disabled={isUploadingImage}
          onClick={async () => {
            const used = await uploadViaFlutterCamera("profilePhoto")
            if (!used) openPicker("profilePhoto")
          }}
          className="absolute bottom-3 right-3 bg-black/80 text-white p-3 rounded-full shadow-lg hover:bg-black transition-colors disabled:opacity-60"
          title="Update profile photo"
        >
          {isUploadingImage ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Rider Details Section */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Rider details</h2>
          <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
            <div className="p-2 px-3 flex items-center justify-between">
              <p className="text-base text-gray-900">
                {`${profile?.name || "-"} (${profile?.deliveryId || "-"})`}
              </p>
            </div>
            <div className="divide-y divide-gray-200">
            <div className="p-2 px-3 flex items-center justify-between">
                <p className="text-sm text-gray-900">Zone</p>
                <p className="text-base text-gray-900">
                  {profile?.availability?.zones?.length > 0 ? "Assigned" : "Not assigned"}
                </p>
              </div>
            <div className="p-2 px-3 flex items-center justify-between">
                <p className="text-sm text-gray-900">City</p>
                <p className="text-base text-gray-900">
                  {profile?.location?.city || "N/A"}
                </p>
              </div>
            <div className="p-2 px-3 flex items-center justify-between">
                <p className="text-sm text-gray-900">Vehicle type</p>
                <p className="text-base text-gray-900 capitalize">
                  {profile?.vehicle?.type || "N/A"}
                </p>
              </div>
            <div className="p-2 px-3 flex items-center justify-between">
                <p className="text-sm text-gray-900">Vehicle number</p>
                {vehicleNumber ? (
                  <div className="flex items-center gap-2">
                    <p className="text-base text-gray-900">{vehicleNumber}</p>
                    <button
                      onClick={() => {
                        setVehicleInput(vehicleNumber)
                        setShowVehiclePopup(true)
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setVehicleInput("")
                      setShowVehiclePopup(true)
                    }}
                    className="flex items-center gap-2 text-green-600 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-medium text-gray-900">Documents</h2>
            <button
              onClick={() => {
                setDocEditFiles({ aadharPhoto: null, panPhoto: null, drivingLicensePhoto: null })
                setShowDocumentsEditPopup(true)
              }}
              className="text-green-600 font-medium text-sm flex items-center gap-1 hover:text-green-700"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit documents</span>
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
            {/* Aadhar Card */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-base font-medium text-gray-900">Aadhar Card</p>
                <p className="text-xs text-gray-500 mt-1">
                  {getDocumentVerificationLabel(profile?.documents?.aadhar)}
                </p>
              </div>
              {profile?.documents?.aadhar?.document && (
                <button
                  onClick={() => {
                    setSelectedDocument({
                      name: "Aadhar Card",
                      url: profile.documents.aadhar.document
                    })
                    setShowDocumentModal(true)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="View"
                >
                  <Eye className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>

            {/* PAN Card */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-base font-medium text-gray-900">PAN Card</p>
                <p className="text-xs text-gray-500 mt-1">
                  {getDocumentVerificationLabel(profile?.documents?.pan)}
                </p>
              </div>
              {profile?.documents?.pan?.document && (
                <button
                  onClick={() => {
                    setSelectedDocument({
                      name: "PAN Card",
                      url: profile.documents.pan.document
                    })
                    setShowDocumentModal(true)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="View"
                >
                  <Eye className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>

            {/* Driving License */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-base font-medium text-gray-900">Driving License</p>
                <p className="text-xs text-gray-500 mt-1">
                  {getDocumentVerificationLabel(profile?.documents?.drivingLicense)}
                </p>
              </div>
              {profile?.documents?.drivingLicense?.document && (
                <button
                  onClick={() => {
                    setSelectedDocument({
                      name: "Driving License",
                      url: profile.documents.drivingLicense.document
                    })
                    setShowDocumentModal(true)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="View"
                >
                  <Eye className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Edit documents popup – 1, 2 ya 3 docs select karke Update par hi upload + logout/reapproval */}
        <BottomPopup
          isOpen={showDocumentsEditPopup}
          onClose={() => {
            setShowDocumentsEditPopup(false)
            setDocEditFiles({ aadharPhoto: null, panPhoto: null, drivingLicensePhoto: null })
            if (aadharInputRef.current) aadharInputRef.current.value = ""
            if (panInputRef.current) panInputRef.current.value = ""
            if (drivingLicenseInputRef.current) drivingLicenseInputRef.current.value = ""
          }}
          title="Update documents"
          showCloseButton={true}
          closeOnBackdropClick={true}
          maxHeight="85vh"
        >
          <div className="space-y-4 pb-4">
            <p className="text-sm text-gray-600">
              Select 1, 2 or all 3 documents to update. After you click Update, your account will go for admin verification and you will be logged out until approved.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Card</label>
              <input
                ref={aadharInputRef}
                type="file"
                accept="image/*"
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700"
                onChange={(e) => handleDocEditFileChange("aadharPhoto", e.target.files?.[0])}
              />
              {docEditFiles.aadharPhoto && (
                <p className="text-xs text-green-600 mt-1">{docEditFiles.aadharPhoto.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN Card</label>
              <input
                ref={panInputRef}
                type="file"
                accept="image/*"
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700"
                onChange={(e) => handleDocEditFileChange("panPhoto", e.target.files?.[0])}
              />
              {docEditFiles.panPhoto && (
                <p className="text-xs text-green-600 mt-1">{docEditFiles.panPhoto.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driving License</label>
              <input
                ref={drivingLicenseInputRef}
                type="file"
                accept="image/*"
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700"
                onChange={(e) => handleDocEditFileChange("drivingLicensePhoto", e.target.files?.[0])}
              />
              {docEditFiles.drivingLicensePhoto && (
                <p className="text-xs text-green-600 mt-1">{docEditFiles.drivingLicensePhoto.name}</p>
              )}
            </div>
            <button
              onClick={submitDocumentsEdit}
              disabled={isSubmittingDocs || (!docEditFiles.aadharPhoto && !docEditFiles.panPhoto && !docEditFiles.drivingLicensePhoto)}
              className="w-full py-3 rounded-lg font-medium text-white bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmittingDocs ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update documents"
              )}
            </button>
          </div>
        </BottomPopup>

        {/* Personal Details Section */}
        <div>
          <h2 className="text-base font-medium text-gray-900 mb-3">Personal details</h2>
          <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
            <div className="p-2 px-3 flex items-center justify-between">
              <div className="w-full align-center flex content-center justify-between">
                <p className="text-sm text-gray-900 mb-1">Phone</p>
                <p className="text-base text-gray-900">
                  {profile?.phone || "N/A"}
                </p>
              </div>
            </div>
            <div className="p-2 px-3 flex items-center justify-between">
              <div className="w-full align-center flex content-center justify-between">
                <p className="text-sm text-gray-900 mb-1">Email</p>
                <p className="text-base text-gray-900">{profile?.email || "-"}</p>
              </div>
            </div>
            <div className="p-2 px-3 flex items-center justify-between">
              <div className="w-full align-center flex content-center justify-between">
                <p className="text-sm text-gray-900 mb-1">Aadhar Card Number</p>
                <p className="text-base text-gray-900">
                  {profile?.documents?.aadhar?.number || "-"}
                </p>
              </div>
            </div>
            <div className="p-2 px-3 flex items-center justify-between">
              <div className="w-full align-center flex content-center justify-between">
                <p className="text-sm text-gray-900 mb-1">Rating</p>
                <p className="text-base text-gray-900">
                  {ratingDisplay}
                </p>
              </div>
            </div>
            <div className="p-2 px-3 flex items-center justify-between">
              <div className="w-full align-center flex content-center justify-between">
                <p className="text-sm text-gray-900 mb-1">Wallet Balance</p>
                <p className="text-base text-gray-900">
                  ₹{Number(walletBalance || profile?.wallet?.balance || 0).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="p-2 px-3 flex items-center justify-between">
              <div className="w-full align-center flex content-center justify-between">
                <p className="text-sm text-gray-900 mb-1">Status</p>
                <p className="text-base text-gray-900 capitalize">
                  {profile?.status || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Bank details</h2>
            <button
              onClick={() => {
                setShowBankDetailsPopup(true)
                // Pre-fill form with existing data
                setBankDetails({
                  accountHolderName: profile?.documents?.bankDetails?.accountHolderName || "",
                  accountNumber: profile?.documents?.bankDetails?.accountNumber || "",
                  ifscCode: profile?.documents?.bankDetails?.ifscCode || "",
                  bankName: profile?.documents?.bankDetails?.bankName || "",
                  panNumber: profile?.documents?.pan?.number || "",
                })
                setBankDetailsErrors({})
              }}
              className="text-green-600 font-medium text-sm flex items-center gap-1 hover:text-green-700"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
            <div className="p-2 px-3 flex items-center justify-between">
              <div className="w-full align-center flex content-center justify-between">
                <p className="text-sm text-gray-900 mb-1">Account Holder Name</p>
                <p className="text-base text-gray-900">
                  {profile?.documents?.bankDetails?.accountHolderName || "-"}
                </p>
              </div>
            </div>
            <div className="p-2 px-3 flex items-center justify-between">
              <div className="w-full align-center flex content-center justify-between">
                <p className="text-sm text-gray-900 mb-1">Account Number</p>
                <p className="text-base text-gray-900">
                  {profile?.documents?.bankDetails?.accountNumber 
                    ? `****${profile.documents.bankDetails.accountNumber.slice(-4)}`
                    : "-"}
                </p>
              </div>
            </div>
            <div className="p-2 px-3 flex items-center justify-between">
              <div className="w-full align-center flex content-center justify-between">
                <p className="text-sm text-gray-900 mb-1">IFSC Code</p>
                <p className="text-base text-gray-900">
                  {profile?.documents?.bankDetails?.ifscCode || "-"}
                </p>
              </div>
            </div>
            <div className="p-2 px-3 flex items-center justify-between">
              <div className="w-full align-center flex content-center justify-between">
                <p className="text-sm text-gray-900 mb-1">Bank Name</p>
                <p className="text-base text-gray-900">
                  {profile?.documents?.bankDetails?.bankName || "-"}
                </p>
              </div>
            </div>
            <div className="p-2 px-3 flex items-center justify-between">
              <div className="w-full align-center flex content-center justify-between">
                <p className="text-sm text-gray-900 mb-1">Pan Card Number</p>
                <p className="text-base text-gray-900">
                  {profile?.documents?.pan?.number || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Number Popup */}
      <BottomPopup
        isOpen={showVehiclePopup}
        onClose={() => setShowVehiclePopup(false)}
        title={vehicleNumber ? "Edit Vehicle Number" : "Add Vehicle Number"}
        showCloseButton={true}
        closeOnBackdropClick={true}
        maxHeight="50vh"
      >
        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={vehicleInput}
              onChange={(e) => setVehicleInput(e.target.value)}
              placeholder="Enter vehicle number"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <button
            onClick={async () => {
              if (vehicleInput.trim()) {
                try {
                  await deliveryAPI.updateProfileDetails({
                    vehicle: { number: vehicleInput.trim() }
                  })
                  setVehicleNumber(vehicleInput.trim())
                  setShowVehiclePopup(false)
                  toast.success("Vehicle number updated successfully")
                  // Refetch profile
                  await refreshProfile()
                } catch (error) {
                  debugError("Error updating vehicle number:", error)
                  toast.error("Failed to update vehicle number")
                }
              } else {
                toast.error("Please enter a valid vehicle number")
              }
            }}
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            {vehicleNumber ? "Update" : "Add"}
          </button>
        </div>
      </BottomPopup>

      {/* Document Image Modal */}
      {showDocumentModal && selectedDocument && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowDocumentModal(false)
                setSelectedDocument(null)
              }}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            
            {/* Document Title */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{selectedDocument.name}</h3>
            </div>
            
            {/* Document Image */}
            <div className="p-4">
              <img
                src={selectedDocument.url}
                alt={selectedDocument.name}
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bank Details Edit Popup */}
      <BottomPopup
        isOpen={showBankDetailsPopup}
        onClose={() => {
          setShowBankDetailsPopup(false)
          setBankDetailsErrors({})
        }}
        title="Edit Bank Details"
        showCloseButton={true}
        closeOnBackdropClick={true}
        maxHeight="80vh"
      >
        <div className="space-y-4">
          {/* Account Holder Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Holder Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bankDetails.accountHolderName}
              onChange={(e) => {
                const value = e.target.value.replace(/[^A-Za-z\s.'-]/g, "")
                setBankDetails(prev => ({ ...prev, accountHolderName: value }))
                setBankDetailsErrors(prev => ({ ...prev, accountHolderName: "" }))
              }}
              placeholder="Enter account holder name"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                bankDetailsErrors.accountHolderName ? "border-red-500" : "border-gray-300"
              }`}
            />
            {bankDetailsErrors.accountHolderName && (
              <p className="text-red-500 text-xs mt-1">{bankDetailsErrors.accountHolderName}</p>
            )}
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bankDetails.accountNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '') // Only numbers
                setBankDetails(prev => ({ ...prev, accountNumber: value }))
                setBankDetailsErrors(prev => ({ ...prev, accountNumber: "" }))
              }}
              placeholder="Enter account number"
              maxLength={18}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                bankDetailsErrors.accountNumber ? "border-red-500" : "border-gray-300"
              }`}
            />
            {bankDetailsErrors.accountNumber && (
              <p className="text-red-500 text-xs mt-1">{bankDetailsErrors.accountNumber}</p>
            )}
          </div>

          {/* IFSC Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IFSC Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bankDetails.ifscCode}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') // Only uppercase letters and numbers
                setBankDetails(prev => ({ ...prev, ifscCode: value }))
                setBankDetailsErrors(prev => ({ ...prev, ifscCode: "" }))
              }}
              placeholder="Enter IFSC code"
              maxLength={11}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                bankDetailsErrors.ifscCode ? "border-red-500" : "border-gray-300"
              }`}
            />
            {bankDetailsErrors.ifscCode && (
              <p className="text-red-500 text-xs mt-1">{bankDetailsErrors.ifscCode}</p>
            )}
          </div>

          {/* Bank Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bankDetails.bankName}
              onChange={(e) => {
                const value = e.target.value.replace(/[^A-Za-z\s.'-]/g, "")
                setBankDetails(prev => ({ ...prev, bankName: value }))
                setBankDetailsErrors(prev => ({ ...prev, bankName: "" }))
              }}
              placeholder="Enter bank name"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                bankDetailsErrors.bankName ? "border-red-500" : "border-gray-300"
              }`}
            />
            {bankDetailsErrors.bankName && (
              <p className="text-red-500 text-xs mt-1">{bankDetailsErrors.bankName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PAN Card Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bankDetails.panNumber}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                setBankDetails(prev => ({ ...prev, panNumber: value }))
                setBankDetailsErrors(prev => ({ ...prev, panNumber: "" }))
              }}
              placeholder="ABCDE1234F"
              maxLength={10}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                bankDetailsErrors.panNumber ? "border-red-500" : "border-gray-300"
              }`}
            />
            {bankDetailsErrors.panNumber && (
              <p className="text-red-500 text-xs mt-1">{bankDetailsErrors.panNumber}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={async () => {
              // Validate
              const errors = {}
              const accountHolderName = bankDetails.accountHolderName.trim()
              const accountNumber = bankDetails.accountNumber.trim()
              const ifscCode = bankDetails.ifscCode.trim().toUpperCase()
              const bankName = bankDetails.bankName.trim()
              const panNumber = bankDetails.panNumber.trim().toUpperCase()

              if (!bankDetails.accountHolderName.trim()) {
                errors.accountHolderName = "Account holder name is required"
              } else if (!/^(?=.*[A-Za-z])[A-Za-z\s.'-]+$/.test(accountHolderName)) {
                errors.accountHolderName = "Account holder name must contain characters only"
              }
              if (!accountNumber) {
                errors.accountNumber = "Account number is required"
              } else if (!/^\d{9,18}$/.test(accountNumber)) {
                errors.accountNumber = "Account number must be between 9 and 18 digits"
              }
              if (!ifscCode) {
                errors.ifscCode = "IFSC code is required"
              } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
                errors.ifscCode = "Enter a valid IFSC code"
              }
              if (!bankName) {
                errors.bankName = "Bank name is required"
              } else if (!/^(?=.*[A-Za-z])[A-Za-z\s.'-]+$/.test(bankName)) {
                errors.bankName = "Bank name must contain characters only"
              }
              if (!panNumber) {
                errors.panNumber = "PAN card number is required"
              } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) {
                errors.panNumber = "Enter a valid PAN number"
              }

              if (Object.keys(errors).length > 0) {
                setBankDetailsErrors(errors)
                toast.error("Please fill all required fields correctly")
                return
              }

              setIsUpdatingBankDetails(true)
              try {
                await deliveryAPI.updateProfile({
                  documents: {
                    ...profile?.documents,
                    bankDetails: {
                      accountHolderName,
                      accountNumber,
                      ifscCode,
                      bankName
                    },
                    pan: {
                      ...profile?.documents?.pan,
                      number: panNumber,
                    },
                  }
                })
                toast.success("Bank details updated successfully")
                setShowBankDetailsPopup(false)
                // Refetch profile
                const response = await deliveryAPI.getProfile()
                if (response?.data?.success && response?.data?.data?.profile) {
                  setProfile(response.data.data.profile)
                }
              } catch (error) {
                debugError("Error updating bank details:", error)
                toast.error(error?.response?.data?.message || "Failed to update bank details")
              } finally {
                setIsUpdatingBankDetails(false)
              }
            }}
            disabled={isUpdatingBankDetails}
            className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${
              isUpdatingBankDetails
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#00B761] hover:bg-[#00A055]"
            }`}
          >
            {isUpdatingBankDetails ? "Updating..." : "Save Bank Details"}
          </button>
        </div>
      </BottomPopup>

    </div>
  )
}

