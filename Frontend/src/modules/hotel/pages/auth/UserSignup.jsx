import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, ArrowRight, Loader2, Shield, User, Gift } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/rokologin-removebg-preview.png';
import { authService } from '../../services/apiService';
import toast from 'react-hot-toast';

const UserSignup = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [step, setStep] = useState(1); // 1: Enter Details, 2: Enter OTP
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        referralCode: ''
    });
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(120);
    const [canResend, setCanResend] = useState(false);

    // Pre-fill phone if coming from login or capture referral code
    useEffect(() => {
        if (location.state?.phone) {
            setFormData(prev => ({ ...prev, phone: location.state.phone }));
        }

        // Check for stored referral code
        const storedCode = localStorage.getItem('referralCode');
        if (storedCode && !formData.referralCode) {
            console.log(`[REFERRAL_DEBUG] Found stored code in localStorage: ${storedCode}`);
            setFormData(prev => ({ ...prev, referralCode: storedCode }));
        }
    }, [location]);

    // Timer countdown effect
    useEffect(() => {
        let interval;
        if (step === 2 && resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        } else if (resendTimer === 0) {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [step, resendTimer === 0]); // Re-run when step changes or timer hits 0

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name || formData.name.length < 3) {
            setError('Please enter your full name');
            return;
        }

        if (formData.phone.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        try {
            setLoading(true);
            await authService.sendOtp(formData.phone, 'register', 'user', formData.email);
            setResendTimer(120);
            setCanResend(false);
            setStep(2);
        } catch (err) {
            // Check if account already exists
            const errorMessage = err.message || '';
            const isDuplicate = err.requiresLogin || err.status === 409 || errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('already registered');

            if (isDuplicate) {
                setError(`${errorMessage} Redirecting to login...`);
                setTimeout(() => {
                    navigate('/login', { state: { phone: formData.phone } });
                }, 2000);
            } else {
                setError(errorMessage || 'Failed to send OTP');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOTPChange = (index, value) => {
        if (value.length > 1) return;
        if (!/^\d*$/.test(value)) return; // Only allow numbers

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleResendOTP = async () => {
        if (!canResend) return;

        try {
            setLoading(true);
            setError('');
            await authService.sendOtp(formData.phone, 'register');
            setResendTimer(120);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']); // Clear OTP
            toast.success('OTP sent successfully!');
        } catch (err) {
            setError(err.message || 'Failed to resend OTP');
            toast.error(err.message || 'Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Please enter complete OTP');
            return;
        }

        try {
            setLoading(true);
            // Send name (required), phone, otp, and email (optional)
            const payload = {
                phone: formData.phone,
                otp: otpString,
                name: formData.name,
                email: formData.email || undefined, // Only send if provided
                referralCode: formData.referralCode || undefined
            };
            console.log(`[REFERRAL_DEBUG] Verifying OTP with payload:`, payload);
            await authService.verifyOtp(payload);

            // Register FCM token for newly created user
            try {
                window.dispatchEvent(new CustomEvent('fcm:register'));
            } catch (fcmErr) {
                console.warn('[FCM] Could not dispatch register event after signup', fcmErr);
            }

            // Clear stored referral code after successful use
            console.log(`[REFERRAL_DEBUG] Registration successful, clearing localStorage referralCode`);
            localStorage.removeItem('referralCode');
            const redirectTo = location.state?.from?.pathname || '/';
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                        className="inline-block mb-4"
                    >
                        <img src={logo} alt="Rukkoo.in" className="w-32 h-auto" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
                    <p className="text-gray-500 mt-2">Join thousands of happy travelers</p>
                </div>

                <motion.div
                    layout
                    className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100"
                >
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h2 className="text-xl font-bold text-gray-900 mb-6">Sign Up</h2>

                                <form onSubmit={handleSendOTP} className="space-y-5">
                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="John Doe"
                                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Phone Number <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="9876543210"
                                                maxLength={10}
                                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Email (Optional) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address <span className="text-gray-400 text-xs">(Optional)</span>
                                        </label>
                                        <div className="relative">
                                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="you@example.com"
                                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Referral Code (Optional) */}
                                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                        <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                                            Referral Code <span className="text-emerald-400">(Optional)</span>
                                        </label>
                                        <div className="relative">
                                            <Gift size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                                            <input
                                                type="text"
                                                value={formData.referralCode}
                                                onChange={(e) => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
                                                placeholder="FRIEND100"
                                                className="w-full pl-12 pr-4 py-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-emerald-200 font-bold tracking-widest text-emerald-900"
                                            />
                                            {formData.referralCode && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold">₹100 OFF</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-emerald-600/70 mt-2 font-medium">Use a friend's code to get ₹100 off your first stay!</p>
                                    </div>

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-red-500 text-sm"
                                        >
                                            {error}
                                        </motion.p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            <>
                                                Continue
                                                <ArrowRight size={20} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="text-center mb-6">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Shield size={22} className="text-emerald-600" />
                                    </div>
                                    <h2 className="text-lg font-black text-gray-900 tracking-tight">Verify OTP</h2>
                                    <p className="text-[11px] text-gray-500 mt-1 font-medium">
                                        Code sent to <span className="text-gray-900 font-bold">+91 {formData.phone}</span>
                                    </p>
                                </div>

                                <form onSubmit={handleVerifyOTP} className="space-y-6">
                                    <div className="flex gap-1.5 justify-center">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                id={`otp-${index}`}
                                                type="tel"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOTPChange(index, e.target.value)}
                                                className="w-10 h-12 text-center text-lg font-black border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all bg-gray-50/50"
                                            />
                                        ))}
                                    </div>

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-red-500 text-sm text-center"
                                        >
                                            {error}
                                        </motion.p>
                                    )}

                                    <div className="text-center">
                                        {canResend ? (
                                            <p className="text-gray-500 text-[11px] font-bold">
                                                Didn't receive code?{' '}
                                                <button
                                                    type="button"
                                                    onClick={handleResendOTP}
                                                    className="text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                                                >
                                                    Resend OTP
                                                </button>
                                            </p>
                                        ) : (
                                            <p className="text-gray-500 text-[11px] font-bold">
                                                Resend OTP in{' '}
                                                <span className="text-emerald-600 font-black tabular-nums">
                                                    {Math.floor(resendTimer / 60)}:{String(resendTimer % 60).padStart(2, '0')}
                                                </span>
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loading ? (
                                                <Loader2 size={20} className="animate-spin" />
                                            ) : (
                                                'Create Account'
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="w-full text-gray-400 text-[11px] font-bold hover:text-emerald-600 transition-colors"
                                        >
                                            Change details
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Already have an account?{' '}
                    <button
                        onClick={() => navigate('/login')}
                        className="text-emerald-600 font-medium hover:underline"
                    >
                        Login
                    </button>
                </p>
            </motion.div >
        </div >
    );
};

export default UserSignup;
