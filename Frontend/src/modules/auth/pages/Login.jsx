import React, { useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Phone, Lock, ArrowRight, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

export default function UnifiedOTPFastLogin() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState(1) // 1: Number, 2: OTP
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSendOTP = (e) => {
    e.preventDefault()
    if (phoneNumber.length < 10) {
      toast.error("Please enter a valid phone number")
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setStep(2)
      toast.success("OTP sent! (Hint: 1234)")
    }, 800)
  }

  const handleVerifyOTP = (e) => {
    if (e?.preventDefault) e.preventDefault()
    if (otp === "1234") {
      setLoading(true)
      setTimeout(() => {
        setLoading(false)
        toast.success("Login Successful!")
        
        // Mock global user authentication
        localStorage.setItem("user_authenticated", "true")
        localStorage.setItem("user_user", JSON.stringify({
          id: "654321",
          name: "Guest",
          phone: phoneNumber,
          role: "user"
        }))
        
        navigate("/")
      }, 1000)
    } else {
      toast.error("Invalid OTP. Try 1234")
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1115] text-white flex items-center justify-center p-6 overflow-hidden relative">
      {/* Dynamic Background */}
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
          {/* Progress Bar */}
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
                      maxLength={10}
                      className="block w-full pl-12 pr-4 py-4 bg-white/[0.05] border border-white/10 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all outline-none placeholder:text-gray-700"
                      placeholder="Enter mobile number"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">We will send you a 4-digit verification code</p>
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
                      onChange={(e) => {
                        const next = e.target.value.replace(/\D/g, "").slice(0, 4)
                        setOtp(next)
                        if (next.length === 4) {
                          handleVerifyOTP()
                        }
                      }}
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
                  : `bg-gradient-to-r ${step === 1 ? 'from-orange-500 to-amber-500' : 'from-blue-500 to-cyan-500'} hover:shadow-xl hover:shadow-orange-500/10 active:scale-95`
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
              <button className="text-white font-bold hover:underline">Terms of Service</button> & <button className="text-white font-bold hover:underline">Privacy Policy</button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
