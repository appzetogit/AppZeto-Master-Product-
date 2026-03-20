import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2 } from "lucide-react"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Input } from "@food/components/ui/input"
import { Button } from "@food/components/ui/button"
import { authAPI } from "@food/api"
import { setAuthData as setUserAuthData } from "@food/utils/auth"

export default function OTP() {
  const navigate = useNavigate()
  const [otp, setOtp] = useState(["", "", "", ""]) // exactly 4 digits
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [authData, setAuthData] = useState(null)
  const [showNameInput, setShowNameInput] = useState(false)
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState("")
  const [verifiedOtp, setVerifiedOtp] = useState("")
  const [contactInfo, setContactInfo] = useState("")
  const [contactType, setContactType] = useState("phone")
  const inputRefs = useRef([])
  const submittingRef = useRef(false)

  useEffect(() => {
    // Redirect to home if already authenticated
    const isAuthenticated = localStorage.getItem("user_authenticated") === "true"
    if (isAuthenticated) {
      navigate("/food/user", { replace: true })
      return
    }

    // Get auth data from sessionStorage
    const stored = sessionStorage.getItem("userAuthData")
    if (!stored) {
      // No auth data, redirect to sign in
      navigate("/user/auth/login", { replace: true })
      return
    }
    const data = JSON.parse(stored)
    setAuthData(data)

    // Handle both phone and email
    if (data.method === "email" && data.email) {
      setContactType("email")
      setContactInfo(data.email)
    } else if (data.phone) {
      setContactType("phone")
      // Extract and format phone number for display
      const phoneMatch = data.phone?.match(/(\+\d+)\s*(.+)/)
      if (phoneMatch) {
        const formattedPhone = `${phoneMatch[1]}-${phoneMatch[2].replace(/\D/g, "")}`
        setContactInfo(formattedPhone)
      } else {
        setContactInfo(data.phone || "")
      }

      // OTP auto-fill removed - user must manually enter OTP
    }

    // Start resend timer (60 seconds)
    setResendTimer(60)
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0] && !showNameInput) {
      inputRefs.current[0].focus()
    }
  }, [showNameInput])

  const handleChange = (index, value) => {
    // Only allow digits; OTP is exactly 4 digits
    if (value && !/^\d$/.test(value)) {
      return
    }

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError("")

    // Auto-focus next input (4 boxes only)
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 4 digits are entered
    if (!showNameInput && newOtp.slice(0, 4).every((digit) => digit !== "")) {
      handleVerify(newOtp.slice(0, 4).join(""))
    }
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace") {
      if (otp[index]) {
        // If current input has value, clear it
        const newOtp = [...otp]
        newOtp[index] = ""
        setOtp(newOtp)
      } else if (index > 0) {
        // If current input is empty, move to previous and clear it
        inputRefs.current[index - 1]?.focus()
        const newOtp = [...otp]
        newOtp[index - 1] = ""
        setOtp(newOtp)
      }
    }
    // Handle paste (4 digits only)
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, "").slice(0, 4).split("")
        const newOtp = [...otp]
        digits.forEach((digit, i) => {
          if (i < 4) newOtp[i] = digit
        })
        setOtp(newOtp)
        if (!showNameInput && digits.length === 4) {
          handleVerify(newOtp.slice(0, 4).join(""))
        } else {
          inputRefs.current[Math.min(digits.length, 3)]?.focus()
        }
      })
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text")
    const digits = pastedData.replace(/\D/g, "").slice(0, 4).split("")
    const newOtp = [...otp]
    digits.forEach((digit, i) => {
      if (i < 4) newOtp[i] = digit
    })
    setOtp(newOtp)
    if (!showNameInput && digits.length === 4) {
      handleVerify(newOtp.slice(0, 4).join(""))
    } else {
      inputRefs.current[Math.min(digits.length, 3)]?.focus()
    }
  }

  const handleVerify = async (otpValue = null) => {
    if (showNameInput) return
    if (submittingRef.current) return

    const code = (otpValue || otp.join("")).replace(/\D/g, "")
    const code4 = code.slice(0, 4)
    if (code4.length !== 4) {
      setError("OTP must be exactly 4 digits")
      return
    }

    submittingRef.current = true
    setIsLoading(true)
    setError("")

    try {
      const phone = authData?.method === "phone" ? authData.phone : null
      const email = authData?.method === "email" ? authData.email : null
      const purpose = authData?.isSignUp ? "register" : "login"
      const providedName = authData?.isSignUp ? authData?.name || null : null
      const referralCode = authData?.referralCode || null

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

      const response = await authAPI.verifyOTP(
        phone,
        code4,
        purpose,
        providedName,
        email,
        "user",
        null,
        referralCode,
        fcmToken,
        platform
      )
      const data = response?.data?.data || response?.data || {}

      const accessToken = data.accessToken
      const refreshToken = data.refreshToken ?? null
      const user = data.user

      if (!accessToken || !user) {
        throw new Error("Invalid response from server")
      }
      if (!refreshToken) {
        throw new Error("Invalid response from server: missing refresh token")
      }

      // Clear auth data from sessionStorage
      sessionStorage.removeItem("userAuthData")

      setUserAuthData("user", accessToken, user, refreshToken)

      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new Event("userAuthChanged"))

      setSuccess(true)

      // Redirect to user home after short delay
      setTimeout(() => {
        navigate("/food/user")
      }, 500)
    } catch (err) {
      const status = err?.response?.status
      let message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to verify OTP. Please try again."
      if (status === 401) {
        // Friendlier copy for deactivated users or auth errors
        if (/deactivat(ed|e)/i.test(String(message))) {
          message = "Your account is deactivated. Please contact support."
        } else {
          message = "Invalid or expired code, or account not active."
        }
      }
      setError(message)
    } finally {
      setIsLoading(false)
      submittingRef.current = false
    }
  }

  const handleSubmitName = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError("Name is required")
      return
    }

    if (trimmedName.length < 2) {
      setNameError("Name must be at least 2 characters")
      return
    }

    if (!verifiedOtp) {
      setError("OTP verification step missing. Please request a new OTP.")
      return
    }

    setIsLoading(true)
    setError("")
    setNameError("")

    try {
      const phone = authData?.method === "phone" ? authData.phone : null
      const email = authData?.method === "email" ? authData.email : null
      const purpose = authData?.isSignUp ? "register" : "login"
      const referralCode = authData?.referralCode || null

      // Second call with name to auto-register and login
      const response = await authAPI.verifyOTP(
        phone,
        verifiedOtp,
        purpose,
        trimmedName,
        email,
        "user",
        null,
        referralCode,
      )
      const data = response?.data?.data || response?.data || {}

      const accessToken = data.accessToken
      const refreshToken = data.refreshToken ?? null
      const user = data.user

      if (!accessToken || !user) {
        throw new Error("Invalid response from server")
      }
      if (!refreshToken) {
        throw new Error("Invalid response from server: missing refresh token")
      }

      sessionStorage.removeItem("userAuthData")

      setUserAuthData("user", accessToken, user, refreshToken)

      window.dispatchEvent(new Event("userAuthChanged"))

      setSuccess(true)

      setTimeout(() => {
        navigate("/food/user")
      }, 500)
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to complete registration. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0 || isLoading) return

    setIsLoading(true)
    setError("")

    try {
      const phone = authData?.method === "phone" ? authData.phone : null
      const email = authData?.method === "email" ? authData.email : null
      const purpose = authData?.isSignUp ? "register" : "login"

      // Call backend to resend OTP
      await authAPI.sendOTP(phone, purpose, email)
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to resend OTP. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
    }

    // Reset timer to 60 seconds
    setResendTimer(60)
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    setOtp(["", "", "", ""])
    setShowNameInput(false)
    setName("")
    setNameError("")
    setVerifiedOtp("")
    inputRefs.current[0]?.focus()
  }

  if (!authData) {
    return null
  }

  return (
    <AnimatedPage className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="relative flex items-center justify-center py-4 px-4 md:py-6 md:px-6 lg:px-8 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => navigate("/user/auth/login")}
          className="absolute left-4 md:left-6 lg:left-8 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 md:h-6 md:w-6 text-black dark:text-white" />
        </button>
        <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-black dark:text-white">OTP Verification</h1>
      </div>

      {/* Main Content */}
      <div className="flex flex-col justify-center px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 pt-8 sm:pt-12 md:pt-16 lg:pt-20 pb-12 sm:pb-16 md:pb-20">
        <div className="max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto w-full space-y-8 md:space-y-10 lg:space-y-12">
          {/* Message */}
          <div className="text-center space-y-2 md:space-y-3">
            <p className="text-base md:text-lg lg:text-xl text-black dark:text-white">
              {showNameInput
                ? "You're almost done! Please tell us your name to complete registration."
                : contactType === "email"
                  ? "We have sent a verification code to"
                  : "We have sent a verification code to"}
            </p>
            {!showNameInput && (
              <p className="text-base md:text-lg lg:text-xl text-black dark:text-white font-medium">
                {contactInfo}
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-500 text-center">
              {error}
            </p>
          )}

          {/* OTP Input Fields */}
          {!showNameInput && (
            <>
              <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-5">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    disabled={isLoading}
                    aria-label={`OTP digit ${index + 1} of 4`}
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 text-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold p-0 border-2 border-black dark:border-gray-600 rounded-lg focus-visible:ring-2 focus-visible:ring-[#EB590E] focus-visible:border-[#EB590E] dark:focus-visible:border-[#EB590E] bg-white dark:bg-[#1a1a1a] text-black dark:text-white transition-all"
                  />
                ))}
              </div>

              {/* Resend Section */}
              <div className="text-center space-y-1 md:space-y-2">
                <p className="text-sm md:text-base text-black dark:text-white">
                  Didn't get the {contactType === "email" ? "email" : "SMS"}?
                </p>
                {resendTimer > 0 ? (
                  <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
                    Resend {contactType === "email" ? "email" : "SMS"} in {resendTimer}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isLoading}
                    className="text-sm md:text-base text-[#EB590E] hover:text-[#D94F0C] dark:text-[#EB590E] dark:hover:text-[#D94F0C] disabled:opacity-50 transition-colors font-medium"
                  >
                    Resend {contactType === "email" ? "email" : "SMS"}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Name Input (shown only after OTP verified and user is new) */}
          {showNameInput && (
            <div className="space-y-4 md:space-y-5">
              <div className="space-y-2">
                <label className="block text-sm md:text-base font-medium text-black dark:text-white text-left">
                  Full name
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (nameError) setNameError("")
                  }}
                  disabled={isLoading}
                  placeholder="Enter your name"
                  className={`h-11 md:h-14 text-base md:text-lg border-2 ${nameError ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                    } bg-white dark:bg-[#1a1a1a] text-black dark:text-white rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[#EB590E]`}
                />
                {nameError && (
                  <p className="text-xs md:text-sm text-red-500 text-left">
                    {nameError}
                  </p>
                )}
              </div>

              <Button
                onClick={handleSubmitName}
                disabled={isLoading}
                className="w-full h-11 md:h-14 bg-[#EB590E] hover:bg-[#D94F0C] text-white font-semibold text-base md:text-lg rounded-lg transition-all hover:shadow-lg active:scale-[0.98]"
              >
                {isLoading ? "Continuing..." : "Continue"}
              </Button>
            </div>
          )}

          {/* Loading Spinner */}
          {isLoading && !showNameInput && (
            <div className="flex justify-center pt-4">
              <Loader2 className="h-6 w-6 text-[#EB590E] animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Go back to login methods */}
      <div className="pt-4 md:pt-6 mt-auto px-6 md:px-8 lg:px-12 text-center pb-8 md:pb-12">
        <button
          type="button"
          onClick={() => navigate("/user/auth/login")}
          className="text-sm md:text-base text-[#EB590E] hover:text-[#D94F0C] hover:underline transition-colors font-medium"
        >
          Go back to login methods
        </button>
      </div>
    </AnimatedPage>
  )
}
