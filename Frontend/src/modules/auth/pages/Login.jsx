import React, { useState, useRef } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Phone, Lock, ArrowRight, ShieldCheck, Mail, Globe, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { authAPI } from "@food/api"
import { setAuthData } from "@food/utils/auth"

export default function UnifiedOTPFastLogin() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const navigate = useNavigate()
  const submitting = useRef(false)

  const normalizedPhone = () => {
    const digits = String(phoneNumber).replace(/\D/g, "").slice(-15)
    return digits.length >= 8 ? digits : ""
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    const phone = normalizedPhone()
    if (phone.length < 8) {
      toast.error("Please enter a valid phone number (at least 8 digits)")
      return
    }
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    try {
      await authAPI.sendOTP(phoneNumber, "login", null)
      setOtpSent(true)
      setStep(2)
      toast.success("OTP sent! Check your phone.")
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to send OTP."
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    const phone = normalizedPhone()
    const otpDigits = String(otp).replace(/\D/g, "").slice(0, 4)
    if (otpDigits.length !== 4) {
      toast.error("Please enter the 4-digit OTP")
      return
    }
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    try {
      // Try to get FCM token before verifying OTP
      let fcmToken = null;
      let platform = "web";
      try {
        if (typeof window !== "undefined") {
          if (window.flutter_inappwebview) {
            platform = "mobile";
            const handlerNames = ["getFcmToken", "getFCMToken", "getPushToken", "getFirebaseToken"];
            for (const handlerName of handlerNames) {
              try {
                const t = await window.flutter_inappwebview.callHandler(handlerName, { module: "user" });
                if (t && typeof t === "string" && t.length > 20) {
                  fcmToken = t.trim();
                  break;
                }
              } catch (e) {}
            }
          } else {
            fcmToken = localStorage.getItem("fcm_web_registered_token_user") || null;
          }
        }
      } catch (e) {
        console.warn("Failed to get FCM token during login", e);
      }

      const response = await authAPI.verifyOTP(phoneNumber, otpDigits, "login", null, null, "user", null, null, fcmToken, platform)
      const data = response?.data?.data || response?.data || {}
      const accessToken = data.accessToken
      const refreshToken = data.refreshToken || null
      const user = data.user

      if (!accessToken || !user) {
        throw new Error("Invalid response from server")
      }

      setAuthData("user", accessToken, user, refreshToken)
      toast.success("Login successful!")
      navigate("/food/user", { replace: true })
    } catch (err) {
      const status = err?.response?.status
      let msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Invalid OTP. Please try again."
      if (status === 401) {
        if (/deactivat(ed|e)/i.test(String(msg))) {
          msg = "Your account is deactivated. Please contact support."
        } else {
          msg = "Invalid or expired code, or account not active."
        }
      }
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  // Service images (served from public folder)
  const foodIcon = "/super-app/food.png"
  const taxiIcon = "/super-app/taxi.png"
  const groceryIcon = "/super-app/grocery.png"
  const hotelIcon = "/super-app/hotel.png"

  const services = [
    { id: 'food', name: 'Food Delivery', icon: foodIcon, label: 'Zomato', color: 'bg-red-500', shadow: 'shadow-red-200' },
    { id: 'taxi', name: 'Taxi', icon: taxiIcon, label: 'Taxi', color: 'bg-yellow-400', shadow: 'shadow-yellow-200' },
    { id: 'grocery', name: 'Quick Commerce', icon: groceryIcon, label: 'Blinkit', color: 'bg-green-500', shadow: 'shadow-green-200' },
    { id: 'hotels', name: 'Hotels', icon: hotelIcon, label: 'Hotels', color: 'bg-blue-500', shadow: 'shadow-blue-200' },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col pt-0 sm:pt-0">
      {/* Top Banner section - Zomato Red */}
      <div className="w-full bg-[#CB202D] dark:bg-[#b01c27] rounded-b-[2.5rem] p-10 md:p-14 text-center text-white relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-white/5 opacity-50 blur-3xl rounded-full -top-1/2 -left-1/4 animate-pulse" />
        <div className="absolute right-0 bottom-0 w-32 h-32 md:w-48 md:h-48 opacity-10 pointer-events-none">
           <svg viewBox="0 0 200 200" fill="currentColor">
              <path d="M100 0C44.8 0 0 44.8 0 100s44.8 100 100 100 100-44.8 100-100S155.2 0 100 0zm0 180c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"/>
           </svg>
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl"
          >
             <span className="text-[#CB202D] text-3xl font-black">A</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-black tracking-tight mb-2"
          >
            AppZeto <span className="text-white/80 font-normal">Food</span>
          </motion.h1>
          <p className="text-xs md:text-base font-bold text-white/90 tracking-[0.2em] uppercase">
            Taste the best, forget the rest
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-[480px] mx-auto w-full p-6 sm:p-8 flex flex-col justify-center -mt-8 relative z-20">
        {/* Main Card */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-8 md:p-12 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-none border border-gray-50 dark:border-gray-800">
           <div className="text-center mb-10 space-y-2">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Login or Signup</h2>
              <div className="h-1 w-12 bg-[#CB202D] mx-auto rounded-full" />
           </div>

          <form onSubmit={step === 1 ? handleSendOTP : handleVerifyOTP} className="space-y-8">
            {step === 1 ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                      <Phone className="w-5 h-5 text-gray-400 group-focus-within:text-[#CB202D] transition-colors" />
                    </div>
                    <div className="absolute left-8 inset-y-0 flex items-center pointer-events-none">
                       <span className="text-sm font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-800 pr-3">+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      autoFocus
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      maxLength={15}
                      className="block w-full pl-20 pr-4 py-3 bg-transparent text-gray-900 dark:text-white border-b-2 border-gray-100 dark:border-gray-800 focus:border-[#CB202D] outline-none transition-all placeholder:text-gray-300 font-bold text-lg"
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  We will send success notifications and order updates via SMS
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="space-y-4">
                   <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                      <div className="w-10 h-10 bg-[#CB202D]/10 rounded-full flex items-center justify-center">
                         <ShieldCheck className="w-5 h-5 text-[#CB202D]" />
                      </div>
                      <div className="flex-1">
                         <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-none mb-1">Sent to</p>
                         <p className="text-sm font-black text-gray-900 dark:text-white">+91 {phoneNumber}</p>
                      </div>
                      <button type="button" onClick={() => setStep(1)} className="text-xs text-[#CB202D] font-black underline cursor-pointer">Edit</button>
                   </div>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-[#CB202D] transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      autoFocus
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      className="block w-full pl-10 pr-4 py-3 bg-transparent text-gray-900 dark:text-white border-b-2 border-gray-100 dark:border-gray-800 focus:border-[#CB202D] outline-none transition-all placeholder:text-gray-300 font-bold tracking-[1.5em] text-2xl"
                      placeholder="••••"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all relative overflow-hidden shadow-xl ${
                loading
                  ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50"
                  : "bg-[#CB202D] hover:bg-[#b01c27] text-white hover:shadow-2xl hover:shadow-[#CB202D]/30 active:scale-[0.98] hover:-translate-y-0.5"
              }`}
            >
              {loading ? (
                <Loader2 className="w-7 h-7 animate-spin mx-auto text-white" />
              ) : (
                step === 1 ? "Get Verification Code" : "Continue"
              )}
            </button>
          </form>

          {/* Social login divider */}
          <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100 dark:border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-[#1a1a1a] px-4 text-gray-400 font-black tracking-widest">or</span>
              </div>
          </div>

          <div className="flex justify-center gap-6">
             <button className="w-14 h-14 rounded-full border border-gray-100 dark:border-gray-800 flex items-center justify-center group hover:bg-gray-50 dark:hover:bg-gray-900 transition-all">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.14-4.53z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                </svg>
             </button>
             <button className="w-14 h-14 rounded-full border border-gray-100 dark:border-gray-800 flex items-center justify-center group hover:bg-gray-50 dark:hover:bg-gray-900 transition-all">
                <Mail className="w-6 h-6 text-gray-400 group-hover:text-[#CB202D] transition-colors" />
             </button>
          </div>
        </div>

        <div className="mt-12 text-center space-y-4">
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
             By continuing, you agree to our <br />
             <span className="text-gray-900 dark:text-white underline cursor-pointer">Terms of Service</span> & <span className="text-gray-900 dark:text-white underline cursor-pointer">Privacy Policy</span>
           </p>
        </div>
      </div>
    </div>
  )
}
