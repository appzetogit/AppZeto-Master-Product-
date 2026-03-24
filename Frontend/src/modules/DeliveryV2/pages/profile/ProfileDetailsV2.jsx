import { useRef, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { 
  ArrowLeft, Plus, Edit2, Eye, X, Loader2, User, Camera, 
  QrCode, Smartphone, Banknote, Shield, CheckCircle, 
  Info, AlertCircle, Copy, Check, MapPin, Truck, FileText
} from "lucide-react"
import BottomPopup from "@delivery/components/BottomPopup"
import { toast } from "sonner"
import { deliveryAPI } from "@food/api"
import { motion, AnimatePresence } from "framer-motion"

const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

/**
 * ProfileDetailsV2 - Betterised Premium UI for Delivery Partner Profile.
 */
export const ProfileDetailsV2 = () => {
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
    upiId: "",
    upiQrCode: null
  })
  const [upiQrFile, setUpiQrFile] = useState(null)
  const [upiQrPreview, setUpiQrPreview] = useState(null)
  const upiQrInputRef = useRef(null)

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

  // Fetch profile data
  useEffect(() => {
    const parseWalletBalance = (response) => {
      const data = response?.data
      const wallet = (data?.success && data?.data?.wallet) || data?.wallet || data?.data || data
      const possibleBalance = wallet?.totalBalance || wallet?.balance || wallet?.pocketBalance || 0
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
            upiId: profileData?.documents?.bankDetails?.upiId || "",
            upiQrCode: profileData?.documents?.bankDetails?.upiQrCode || null
          })
        } else {
          throw new Error("Profile fetch failed")
        }
      } catch (error) {
        debugError("Error fetching profile:", error)
        if (error.response?.status === 401) {
          toast.error("Session expired. Please login again.")
          setTimeout(() => {
            navigate("/food/delivery/login", { replace: true })
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

  const isAdminApproved = ["approved", "active"].includes(String(profile?.status || "").toLowerCase())

  const getDocumentVerificationLabel = (doc) => {
    if (!doc?.document) return "Not uploaded"
    if (doc?.verified || isAdminApproved) return "Verified"
    return "Pending Verification"
  }

  const ratingValue = Number(profile?.metrics?.rating)
  const ratingCount = Number(profile?.metrics?.ratingCount || 0)
  const ratingDisplay = Number.isFinite(ratingValue) ? `${ratingValue.toFixed(1)} (${ratingCount})` : "-"

  const profileImageUrl = profile?.profileImage?.url || profile?.documents?.photo || null

  const refreshProfile = async () => {
    const response = await deliveryAPI.getProfile()
    if (response?.data?.success && response?.data?.data?.profile) {
      setProfile(response.data.data.profile)
      const pd = response.data.data.profile
      setBankDetails({
        accountHolderName: pd?.documents?.bankDetails?.accountHolderName || "",
        accountNumber: pd?.documents?.bankDetails?.accountNumber || "",
        ifscCode: pd?.documents?.bankDetails?.ifscCode || "",
        bankName: pd?.documents?.bankDetails?.bankName || "",
        panNumber: pd?.documents?.pan?.number || "",
        upiId: pd?.documents?.bankDetails?.upiId || "",
        upiQrCode: pd?.documents?.bankDetails?.upiQrCode || null
      })
    }
  }

  const openPicker = (target) => {
    setUploadTarget(target)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
      fileInputRef.current.click()
    }
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget) return
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
      toast.error(error?.response?.data?.message || "Update failed")
    } finally {
      setIsUploadingImage(false)
      setUploadTarget(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleUpiQrSelected = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setUpiQrFile(file)
      setUpiQrPreview(URL.createObjectURL(file))
    }
  }

  const submitBankDetails = async () => {
    setIsUpdatingBankDetails(true)
    try {
      // Use standard JSON for bank details but add fields for UPI
      const payload = {
        documents: {
          ...profile?.documents,
          bankDetails: {
            ...profile?.documents?.bankDetails,
            accountHolderName: bankDetails.accountHolderName,
            accountNumber: bankDetails.accountNumber,
            ifscCode: bankDetails.ifscCode,
            bankName: bankDetails.bankName,
            upiId: bankDetails.upiId
          },
          pan: { ...profile?.documents?.pan, number: bankDetails.panNumber }
        }
      }

      // If there is a QR file, we need to send as FormData
      if (upiQrFile) {
        const formData = new FormData()
        formData.append('documents[bankDetails][accountHolderName]', bankDetails.accountHolderName)
        formData.append('documents[bankDetails][accountNumber]', bankDetails.accountNumber)
        formData.append('documents[bankDetails][ifscCode]', bankDetails.ifscCode)
        formData.append('documents[bankDetails][bankName]', bankDetails.bankName)
        formData.append('documents[bankDetails][upiId]', bankDetails.upiId)
        formData.append('upiQrCode', upiQrFile)
        formData.append('documents[pan][number]', bankDetails.panNumber)
        
        await deliveryAPI.updateBankDetailsMultipart(formData)
      } else {
        await deliveryAPI.updateProfile(payload)
      }

      toast.success("Bank details updated")
      setShowBankDetailsPopup(false)
      setUpiQrFile(null)
      setUpiQrPreview(null)
      await refreshProfile()
    } catch (error) {
      toast.error(error?.response?.data?.message || "Update failed")
    } finally {
      setIsUpdatingBankDetails(false)
    }
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
        toast.success("Documents updated successfully")
        setShowDocumentsEditPopup(false)
        setDocEditFiles({ aadharPhoto: null, panPhoto: null, drivingLicensePhoto: null })
        await refreshProfile()
      } else {
        toast.error(response?.data?.message || "Update failed")
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Update failed")
    } finally {
      setIsSubmittingDocs(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-poppins">
         <div className="flex flex-col items-center gap-4">
            <div className="relative">
               <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <User className="w-6 h-6 text-orange-500" />
               </div>
            </div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Initializing Profile...</p>
         </div>
      </div>
    )
  }

  const InfoCard = ({ icon: Icon, label, value, color = "blue", badge = null, onEdit = null }) => (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80 flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-${color}-50 flex items-center justify-center text-${color}-600 border border-${color}-100 transition-transform group-hover:scale-105`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">{label}</p>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-gray-900">{value || "—"}</h4>
            {badge}
          </div>
        </div>
      </div>
      {onEdit && (
        <button onClick={onEdit} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-orange-500 transition-all active:scale-90">
          <Edit2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FDFEFE] font-poppins pb-24">
      {/* ─── HEADER ─── */}
      <div className="fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-all active:scale-90">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-black text-black uppercase tracking-tight leading-none">Profile</h1>
        </div>
        <div className="bg-orange-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20">
          ID: {profile?.deliveryId || "..."}
        </div>
      </div>

      <div className="pt-20 px-4 space-y-6 max-w-lg mx-auto">
        {/* ─── PROFILE AVATAR BLOCK ─── */}
        <div className="relative group">
           <div className="w-32 h-32 rounded-[2.5rem] bg-gray-100 border-2 border-white shadow-2xl mx-auto overflow-hidden relative">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><User className="w-12 h-12 text-gray-300" /></div>
              )}
              {isUploadingImage && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
           </div>
           <button 
             onClick={() => openPicker("profilePhoto")}
             className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-black text-white p-3 rounded-2xl shadow-xl hover:bg-gray-900 transition-all active:scale-90 border-4 border-white"
           >
             <Camera className="w-5 h-5" />
           </button>
        </div>

        <div className="text-center pt-6">
           <h2 className="text-2xl font-black text-gray-900 leading-none">{profile?.name}</h2>
           <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2 mb-4">Delivery Partner • {profile?.location?.city}</p>
           
           <div className="flex items-center justify-center gap-2">
              <div className="bg-[#10B981]/10 text-[#10B981] px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border border-[#10B981]/20 flex items-center gap-2">
                 <CheckCircle className="w-4 h-4" /> {profile?.status}
              </div>
              <div className="bg-orange-500/10 text-orange-500 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border border-orange-500/20 flex items-center gap-2">
                 <Smartphone className="w-4 h-4" /> {profile?.phone}
              </div>
           </div>
        </div>

        {/* ─── RIDER STATS ─── */}
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rider Level</p>
              <h4 className="text-xl font-black text-gray-900">Champion</h4>
           </div>
           <div className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Rating</p>
              <h4 className="text-xl font-black text-gray-900">{ratingDisplay}</h4>
           </div>
        </div>

        {/* ─── VEHICLE SECTION ─── */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
             <h3 className="text-xs font-black text-gray-950 uppercase tracking-widest flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-400" /> Vehicle Assets
             </h3>
          </div>
          <InfoCard 
            icon={Truck} 
            label="Vehicle Details" 
            value={`${profile?.vehicle?.type || 'N/A'} • ${vehicleNumber}`} 
            color="orange"
            badge={!vehicleNumber && <span className="text-[9px] bg-red-50 text-red-500 px-1.5 rounded uppercase font-bold">Missing</span>}
            onEdit={() => { setVehicleInput(vehicleNumber); setShowVehiclePopup(true); }}
          />
        </section>

        {/* ─── BANK & PAYMENTS SECTION (ENHANCED) ─── */}
        <section>
           <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-xs font-black text-gray-950 uppercase tracking-widest flex items-center gap-2">
                 <Banknote className="w-4 h-4 text-gray-400" /> Bank & Payments
              </h3>
              <button onClick={() => setShowBankDetailsPopup(true)} className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline">Edit Details</button>
           </div>
           
           <div className="space-y-3">
              <div className="bg-[#121212] rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-colors" />
                 <div className="relative z-10">
                    <div className="flex justify-between items-start mb-10">
                       <div>
                          <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Bank Account</p>
                          <h4 className="text-lg font-bold tracking-tight">{bankDetails.bankName || "Link Account"}</h4>
                       </div>
                       <Banknote className="w-8 h-8 text-orange-500/50" />
                    </div>
                    <div className="flex justify-between items-end">
                       <div>
                          <p className="text-xs font-mono font-medium text-white/60 tracking-[0.2em]">
                             {bankDetails.accountNumber ? `•••• •••• •••• ${bankDetails.accountNumber.slice(-4)}` : "XXXX XXXX XXXX XXXX"}
                          </p>
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">{bankDetails.accountHolderName || "Account Holder"}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">IFSC Code</p>
                          <p className="text-sm font-black tracking-widest">{bankDetails.ifscCode || "—"}</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* UPI Section */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between group">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100 group-hover:scale-105 transition-transform">
                       <Smartphone className="w-7 h-7" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">UPI ID</p>
                       <h4 className="text-base font-black text-gray-900">{bankDetails.upiId || "Not added"}</h4>
                    </div>
                 </div>
                 {bankDetails.upiQrCode && (
                    <button 
                      onClick={() => { setSelectedDocument({ name: "UPI Scanner", url: bankDetails.upiQrCode }); setShowDocumentModal(true); }}
                      className="w-14 h-14 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-black hover:border-black/20 transition-all"
                    >
                       <QrCode className="w-6 h-6" />
                    </button>
                 )}
              </div>
           </div>
        </section>

        {/* ─── DOCUMENTS SECTION ─── */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
             <h3 className="text-xs font-black text-gray-950 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" /> Verification Docs
             </h3>
             <button 
               onClick={() => { setShowDocumentsEditPopup(true); }}
               className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
             >
               Edit Docs
             </button>
          </div>
          
          <div className="grid gap-3">
             {[
               { icon: FileText, label: "Aadhar Card", doc: profile?.documents?.aadhar },
               { icon: FileText, label: "PAN Card", doc: profile?.documents?.pan },
               { icon: Truck, label: "Driving License", doc: profile?.documents?.drivingLicense }
             ].map((item, i) => (
               <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400"><item.icon className="w-5 h-5" /></div>
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                        <p className="text-xs font-bold text-gray-600">{getDocumentVerificationLabel(item.doc)}</p>
                     </div>
                  </div>
                  {item.doc?.document && (
                    <button 
                      onClick={() => { setSelectedDocument({ name: item.label, url: item.doc.document }); setShowDocumentModal(true); }}
                      className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:text-black transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
               </div>
             ))}
          </div>
        </section>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

      {/* ─── MODALS ─── */}
      
      {/* Vehicle Popup */}
      <BottomPopup isOpen={showVehiclePopup} onClose={() => setShowVehiclePopup(false)} title="Vehicle Info">
         <div className="space-y-4 pb-4">
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
               <Truck className="w-8 h-8 text-orange-500" />
               <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Assigned Vehicle</p>
                  <input 
                    type="text" 
                    value={vehicleInput} 
                    onChange={(e) => setVehicleInput(e.target.value.toUpperCase())} 
                    placeholder="E.g. UP 80 AB 1234"
                    className="w-full bg-transparent text-xl font-black text-black outline-none border-b-2 border-transparent focus:border-orange-500 placeholder:text-gray-200"
                  />
               </div>
            </div>
            <button 
               onClick={async () => {
                 if (vehicleInput.trim()) {
                   try {
                     await deliveryAPI.updateProfileDetails({ vehicle: { number: vehicleInput.trim() } })
                     setVehicleNumber(vehicleInput.trim())
                     setShowVehiclePopup(false)
                     toast.success("Vehicle updated")
                     await refreshProfile()
                   } catch (e) { toast.error("Update failed") }
                 }
               }}
               className="w-full bg-black text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-gray-900 transition-all active:scale-95"
            >
               Save Changes
            </button>
         </div>
      </BottomPopup>

      {/* Bank Details Modal (Expanded with UPI) */}
      <BottomPopup 
        isOpen={showBankDetailsPopup} 
        onClose={() => setShowBankDetailsPopup(false)} 
        title="Bank & Payments"
        maxHeight="85vh"
      >
        <div className="space-y-5 pb-10">
          <div className="grid gap-4">
             {[
               { label: "Account Holder", key: "accountHolderName", icon: User },
               { label: "Account Number", key: "accountNumber", icon: Banknote },
               { label: "IFSC Code", key: "ifscCode", icon: Shield },
               { label: "Bank Name", key: "bankName", icon: MapPin },
               { label: "PAN Number", key: "panNumber", icon: FileText },
               { label: "UPI ID", key: "upiId", icon: Smartphone }
             ].map((field) => (
               <div key={field.key} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 group focus-within:border-orange-500/50 transition-all">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                     <field.icon className="w-3.5 h-3.5" /> {field.label}
                  </label>
                  <input 
                    type="text" 
                    value={bankDetails[field.key]} 
                    onChange={(e) => setBankDetails({...bankDetails, [field.key]: e.target.value})} 
                    className="w-full bg-transparent text-sm font-bold text-gray-950 outline-none"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
               </div>
             ))}

             {/* UPI Scanner Upload */}
             <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 flex flex-col items-center gap-4 text-center">
                <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">UPI Payment QR Scanner</p>
                
                {upiQrPreview || bankDetails.upiQrCode ? (
                  <div className="relative">
                    <img src={upiQrPreview || bankDetails.upiQrCode} alt="QR Preview" className="w-32 h-32 rounded-xl object-cover border-4 border-white shadow-xl" />
                    <button 
                      onClick={() => { setUpiQrFile(null); setUpiQrPreview(null); }}
                      className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-lg"
                    >
                       <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => upiQrInputRef.current?.click()}
                    className="w-32 h-32 bg-white rounded-xl border-2 border-dashed border-purple-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-purple-100/30 transition-all"
                  >
                     <QrCode className="w-8 h-8 text-purple-300" />
                     <span className="text-[9px] font-bold text-purple-400 uppercase">Upload Image</span>
                  </div>
                )}
                <input ref={upiQrInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpiQrSelected} />
                <p className="text-[9px] text-purple-400 font-medium">Upload your UPI QR code from Google Pay, PhonePe, etc. to receive easy payouts.</p>
             </div>
          </div>

          <button 
            onClick={submitBankDetails} 
            disabled={isUpdatingBankDetails} 
            className="w-full bg-black text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-gray-900 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isUpdatingBankDetails ? <><Loader2 className="w-5 h-5 animate-spin" /> saving...</> : "Update Systems"}
          </button>
        </div>
      </BottomPopup>

      {/* Legacy Documents Edit (Modernised) */}
      <BottomPopup isOpen={showDocumentsEditPopup} onClose={() => setShowDocumentsEditPopup(false)} title="Document Hub">
        <div className="space-y-4 pb-10">
          {[
            { label: "Aadhar Photo", key: "aadharPhoto" },
            { label: "PAN Photo", key: "panPhoto" },
            { label: "Driving License Photo", key: "drivingLicensePhoto" }
          ].map((doc) => (
             <div key={doc.key} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{doc.label}</p>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-orange-50 file:text-orange-500 hover:file:bg-orange-100"
                  onChange={(e) => setDocEditFiles(prev => ({ ...prev, [doc.key]: e.target.files?.[0] }))}
                />
             </div>
          ))}
          <button
            onClick={submitDocumentsEdit}
            disabled={isSubmittingDocs}
            className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all active:scale-95"
          >
            {isSubmittingDocs ? "Uploading..." : "Submit for Verification"}
          </button>
        </div>
      </BottomPopup>

      {/* Fullscreen Document Viewer */}
      <AnimatePresence>
        {showDocumentModal && selectedDocument && (
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex flex-col items-center p-6"
          >
             <div className="w-full flex justify-between items-center mb-10 pt-safe">
                <h3 className="text-white text-lg font-black uppercase tracking-widest">{selectedDocument.name}</h3>
                <button onClick={() => setShowDocumentModal(false)} className="bg-white/10 text-white p-3 rounded-2xl hover:bg-white/20 transition-all active:scale-90">
                   <X className="w-6 h-6" />
                </button>
             </div>
             <div className="flex-1 w-full flex items-center justify-center">
                <img src={selectedDocument.url} alt="Doc" className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl" />
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProfileDetailsV2
