import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ShieldCheck } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { restaurantAPI } from "@food/api"
import { useCompanyName } from "@food/hooks/useCompanyName"

const DEFAULT_COUNTRY_CODE = "+91"

export default function RestaurantLogin() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem("restaurantLoginPhone")
    return {
      phone: saved || "",
    }
  })
  const [error, setError] = useState("")
  const [isSending, setIsSending] = useState(false)

  const validatePhone = (phone) => {
    if (!phone || phone.trim() === "") return "Phone number is required"

    const digitsOnly = phone.replace(/\D/g, "")
    if (digitsOnly.length < 7) return "Phone number must be at least 7 digits"
    if (digitsOnly.length > 15) return "Phone number is too long"

    if (digitsOnly.length !== 10) return "Indian phone number must be 10 digits"
    if (!["6", "7", "8", "9"].includes(digitsOnly[0])) {
      return "Invalid Indian mobile number"
    }

    return ""
  }

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10)
    setFormData((prev) => ({ ...prev, phone: value }))
    sessionStorage.setItem("restaurantLoginPhone", value)

    if (error) {
      setError(validatePhone(value))
    }
  }

  const handleSendOTP = async () => {
    const phoneError = validatePhone(formData.phone)
    setError(phoneError)
    if (phoneError) return

    const fullPhone = `${DEFAULT_COUNTRY_CODE} ${formData.phone}`.trim()

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

  const isValidPhone = !validatePhone(formData.phone)

  return (
    <div className="h-[100dvh] bg-white flex flex-col font-sans overflow-hidden">
      <div className="relative h-[240px] sm:h-[300px] w-full bg-[#ef4f5f] overflow-hidden">
        <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute top-20 -right-10 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-white/5" />

        <div className="absolute bottom-0 w-full h-[100px] bg-white rounded-t-[100px] shadow-[0_-20px_40px_rgba(0,0,0,0.05)]" />
      </div>

      <div className="flex-1 flex flex-col items-center px-4 sm:px-8 -mt-12 sm:-mt-16 z-10 overflow-hidden">
        <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-slate-50 mb-4 sm:mb-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#ef4f5f] rounded-2xl mx-auto flex items-center justify-center transform rotate-12 shadow-lg mb-1">
              <ShieldCheck className="w-8 h-8 text-white -rotate-12" />
            </div>
          </div>
        </div>

        <div className="text-center space-y-1.5 sm:space-y-2 mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight lowercase">
            {companyName}
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">
            Partner Login
          </p>
        </div>

        <div className="w-full max-w-[400px] flex-1 flex flex-col justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="block w-full text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] sm:tracking-[0.3em] ml-1">
                Registered Mobile Number
              </label>

              <div className="flex items-center gap-2 h-14 sm:h-16 bg-slate-50 border border-slate-100 rounded-[32px] px-2 focus-within:border-[#ef4f5f]/30 focus-within:ring-4 focus-within:ring-[#ef4f5f]/5 transition-all">
                <div className="w-24 h-12 rounded-2xl flex items-center px-4">
                  <span className="font-bold text-slate-900">{DEFAULT_COUNTRY_CODE}</span>
                </div>

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
              className={`w-full h-14 sm:h-16 rounded-[32px] font-black text-base sm:text-lg tracking-widest uppercase transition-all duration-300 ${
                isValidPhone && !isSending
                  ? "bg-[#ef4f5f] hover:bg-[#d63a4a] text-white shadow-lg shadow-[#ef4f5f]/20 transform active:scale-[0.98]"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isSending ? "Processing..." : "Continue"}
            </Button>
          </div>

          <div className="text-center pt-4 pb-2">
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

      <div className="py-3 text-center">
        <p className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase">
          &copy; {new Date().getFullYear()} {companyName.toUpperCase()} PARTNER
        </p>
      </div>
    </div>
  )
}
