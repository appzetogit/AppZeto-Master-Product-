import React, { useState, useRef } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Phone, Lock, ArrowRight, ShieldCheck } from "lucide-react"
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

  return (
    <div className="min-h-screen bg-[#0f1115] text-white flex items-center justify-center p-6 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-10 space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl shadow-xl shadow-white/5">
            A
          </div>
          <h1 className="text-3xl font-black tracking-tight">Access <span className="text-orange-500">AppZeto</span></h1>
          <p className="text-gray-400">One secure login for all services</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
            <motion.div
              initial={{ width: "50%" }}
              animate={{ width: step === 1 ? "50%" : "100%" }}
              className="h-full bg-gradient-to-r from-orange-500 to-blue-500"
            />
          </div>

          <form onSubmit={step === 1 ? handleSendOTP : handleVerifyOTP} className="space-y-6">
            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-500 ml-1">Phone Number</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="w-5 h-5 text-gray-600 group-focus-within:text-orange-500 transition-colors" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      maxLength={15}
                      className="block w-full pl-12 pr-4 py-4 bg-white/[0.05] border border-white/10 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all outline-none placeholder:text-gray-700"
                      placeholder="Enter mobile number"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">We will send you a 6-digit verification code</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-bold text-gray-500 ml-1">Verification Code</label>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-orange-500 font-bold hover:underline"
                    >
                      Change Number
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      className="block w-full pl-12 pr-4 py-4 bg-white/[0.05] border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all outline-none placeholder:text-gray-700 tracking-[0.5em]"
                      placeholder="••••"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-500 justify-center">
                  <ShieldCheck className="w-4 h-4" />
                  Sent to +91 {phoneNumber}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all ${
                loading
                  ? "bg-white/10 cursor-not-allowed"
                  : `bg-gradient-to-r ${step === 1 ? "from-orange-500 to-amber-500" : "from-blue-500 to-cyan-500"} hover:shadow-xl hover:shadow-orange-500/10 active:scale-95`
              }`}
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {step === 1 ? "Send OTP" : "Verify & Sign In"} <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-gray-600">
              By signing in, you agree to our <br />
              <button type="button" className="text-white font-bold hover:underline">Terms of Service</button> & <button type="button" className="text-white font-bold hover:underline">Privacy Policy</button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
