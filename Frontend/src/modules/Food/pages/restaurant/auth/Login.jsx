import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, Phone, ShieldCheck } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@food/components/ui/select"
import { Button } from "@food/components/ui/button"
import { restaurantAPI } from "@food/api"
import { useCompanyName } from "@food/hooks/useCompanyName"

const countryCodes = [
  { code: "+91", country: "IN", flag: "🇮🇳" },
]

export default function RestaurantLogin() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const DEFAULT_COUNTRY_CODE = "+91"
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem("restaurantLoginPhone")
    return {
      phone: saved || "",
      countryCode: DEFAULT_COUNTRY_CODE,
    }
  })
  const [error, setError] = useState("")
  const [isSending, setIsSending] = useState(false)

  const selectedCountry = countryCodes.find((c) => c.code === formData.countryCode) || countryCodes[0]

  const validatePhone = (phone, countryCode) => {
    if (!phone || phone.trim() === "") return "Phone number is required"

    const digitsOnly = phone.replace(/\D/g, "")
    if (digitsOnly.length < 7) return "Phone number must be at least 7 digits"
    if (digitsOnly.length > 15) return "Phone number is too long"

    if (countryCode === "+91") {
      if (digitsOnly.length !== 10) return "Indian phone number must be 10 digits"
      if (!["6", "7", "8", "9"].includes(digitsOnly[0])) {
        return "Invalid Indian mobile number"
      }
    }

    return ""
  }

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10)
    setFormData((prev) => ({ ...prev, phone: value }))
    sessionStorage.setItem("restaurantLoginPhone", value)

    if (error) {
      setError(validatePhone(value, formData.countryCode))
    }
  }

  const handleCountryCodeChange = (value) => {
    setFormData((prev) => ({ ...prev, countryCode: value }))
    if (formData.phone) {
      setError(validatePhone(formData.phone, value))
    }
  }

  const handleSendOTP = async () => {
    const phoneError = validatePhone(formData.phone, formData.countryCode)
    setError(phoneError)
    if (phoneError) return

    const fullPhone = `${formData.countryCode} ${formData.phone}`.trim()

    try {
      setIsSending(true)
      await restaurantAPI.sendOTP(fullPhone, "login")

      const authData = {
        method: "phone",
        phone: fullPhone,
        isSignUp: false,
        module: "restaurant",
      }
      sessionStorage.setItem("restaurantAuthData", JSON.stringify(authData))
      navigate("/food/restaurant/otp")
    } catch (apiErr) {
      const message =
        apiErr?.response?.data?.message ||
        apiErr?.response?.data?.error ||
        "Failed to send OTP. Please try again."
      setError(message)
    } finally {
      setIsSending(false)
    }
  }

  const isValidPhone = !validatePhone(formData.phone, formData.countryCode)

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Curved Header Background */}
      <div className="relative h-[300px] w-full bg-[#ef4f5f] overflow-hidden">
        {/* Abstract Circles like in the image */}
        <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute top-20 -right-10 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-white/5" />
        
        {/* The dominant curve */}
        <div className="absolute bottom-0 w-full h-[100px] bg-white rounded-t-[100px] shadow-[0_-20px_40px_rgba(0,0,0,0.05)]" />
      </div>

      <div className="flex-1 flex flex-col items-center px-8 -mt-16 z-10">
        {/* Central Logo / Branding */}
        <div className="w-32 h-32 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-slate-50 mb-6">
          <div className="text-center">
             <div className="w-16 h-16 bg-[#ef4f5f] rounded-2xl mx-auto flex items-center justify-center transform rotate-12 shadow-lg mb-1">
                <ShieldCheck className="w-8 h-8 text-white -rotate-12" />
             </div>
          </div>
        </div>

        <div className="text-center space-y-2 mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight lowercase">
            {companyName}
          </h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Partner Digital Login
          </p>
        </div>

        <div className="w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Registered Mobile Number</label>
              
              <div className="flex items-center gap-2 h-16 bg-slate-50 border border-slate-100 rounded-[32px] px-2 focus-within:border-[#ef4f5f]/30 focus-within:ring-4 focus-within:ring-[#ef4f5f]/5 transition-all">
                <Select value={formData.countryCode} onValueChange={handleCountryCodeChange}>
                  <SelectTrigger className="w-24 h-12 border-none bg-transparent shadow-none focus:ring-0">
                    <SelectValue>
                      <span className="font-bold text-slate-900">{formData.countryCode}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-100">
                    {countryCodes.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="w-[1px] h-6 bg-slate-200" />
                
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Mobile number"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="flex-1 h-full bg-transparent border-0 outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none text-lg font-bold text-slate-900 placeholder-slate-300 px-4"
                />
              </div>

              {error && (
                <p className="text-[#ef4f5f] text-xs font-bold italic ml-4 animate-bounce">
                  {error}
                </p>
              )}
            </div>

            <Button
              onClick={handleSendOTP}
              disabled={!isValidPhone || isSending}
              className={`w-full h-16 rounded-[32px] font-black text-lg tracking-widest uppercase transition-all duration-300 ${
                isValidPhone && !isSending
                  ? "bg-[#ef4f5f] hover:bg-[#d63a4a] text-white shadow-lg shadow-[#ef4f5f]/20 transform active:scale-[0.98]"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isSending ? "Processing..." : "Continue"}
            </Button>
          </div>

          <div className="text-center pt-8">
            <p className="text-slate-400 text-xs font-medium">
              By logging in, you agree to our <br />
              <button
                type="button"
                onClick={() => navigate("/food/restaurant/terms")}
                className="bg-transparent border-0 p-0 text-[#ef4f5f] font-bold hover:underline cursor-pointer"
              >
                Terms
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() => navigate("/food/restaurant/privacy")}
                className="bg-transparent border-0 p-0 text-[#ef4f5f] font-bold hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
            </p>
          </div>
        </div>
      </div>

      <div className="pb-8 text-center">
          <p className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase">
            &copy; {new Date().getFullYear()} {companyName.toUpperCase()} PARTNER
          </p>
      </div>
    </div>
  )
}
