import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/apiService';
import logo from '../../assets/rokologin-removebg-preview.png';
import toast from 'react-hot-toast';

const HotelLoginPage = () => {
    const OTP_LENGTH = 4;
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(120);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userRaw = localStorage.getItem('user');
        const user = userRaw ? JSON.parse(userRaw) : null;
        if (token && user && user.role === 'partner' && user.partnerApprovalStatus === 'approved') {
            navigate('/hotel/dashboard', { replace: true });
        }
    }, [navigate]);

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
    }, [step, resendTimer === 0]);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');

        // Basic Phone Validation
        if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);
        try {
            await authService.sendOtp(phone, 'login', 'partner');
            setResendTimer(120);
            setCanResend(false);
            setStep(2);

        } catch (err) {
            if (err.isBlocked || err.response?.data?.isBlocked || err.status === 403) {
                setError(err.message || 'Your account has been blocked by admin. Please contact support.');
            } else {
                setError(err.message || 'Failed to send OTP');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOTPChange = (index, value) => {
        if (value.length > 1) return;
        if (!/^\d*$/.test(value)) return; // Only numbers

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < OTP_LENGTH - 1) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
        if (value === '' && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handleResendOTP = async () => {
        if (!canResend) return;

        try {
            setLoading(true);
            setError('');
            await authService.sendOtp(phone, 'login', 'partner');
            setResendTimer(120);
            setCanResend(false);
            setOtp(Array(OTP_LENGTH).fill('')); // Clear OTP
            toast.success('OTP sent successfully!');
        } catch (err) {
            setError(err.message || 'Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length !== OTP_LENGTH) {
            setError('Please enter complete OTP');
            return;
        }

        setLoading(true);
        try {
            await authService.verifyOtp({
                phone: phone,
                otp: otpString,
                role: 'partner'
            });

            // Trigger FCM token re-registration using the cached token from App.jsx
            try {
                window.dispatchEvent(new CustomEvent('fcm:register'));
            } catch (fcmError) {
                console.warn('[FCM] Could not dispatch register event', fcmError);
            }

            navigate('/hotel/dashboard');
        } catch (err) {
            if (err.isBlocked || err.response?.data?.isBlocked || err.status === 403) {
                setError(err.message || 'Your account has been blocked by admin. Please contact support.');
            } else {
                setError(err.message || 'Invalid OTP');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white text-[#003836] flex flex-col font-sans selection:bg-[#004F4D] selection:text-white">

            {/* Top Bar - Centered Logo */}
            <header className="px-6 pt-0 pb-2 flex justify-center items-center">
                <div className="flex items-center justify-center">
                    <img src={logo} alt="Rukkoin" className="h-28 w-auto object-contain" />
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 flex flex-col justify-center px-8 max-w-sm mx-auto w-full relative">

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 text-center space-y-1"
                >
                    <h1 className="text-xl font-bold text-[#003836]">Partner Login</h1>
                    <p className="text-gray-400 text-xs font-medium">Log in to manage your property</p>
                </motion.div>

                {/* Form Area */}
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1"
                        >
                            <form onSubmit={handleSendOTP} className="space-y-5">

                                <div>
                                    <label className="text-[#003836] font-bold text-[10px] uppercase tracking-wider block mb-1.5 ml-1">
                                        Mobile Number
                                    </label>
                                    <div className="flex items-center bg-gray-50/50 rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-[#004F4D]/10 focus-within:border-[#004F4D] transition-all h-12">
                                        <div className="pl-4 text-gray-500 font-bold border-r border-gray-100 pr-3 h-full flex items-center bg-gray-100/30">
                                            <span className="text-xs">+91</span>
                                        </div>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 10) setPhone(val);
                                            }}
                                            placeholder="Enter 10-digit number"
                                            className="flex-1 bg-transparent px-3 text-[#003836] font-bold placeholder:text-gray-300 outline-none w-full h-full text-sm"
                                            required
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-red-500 text-[10px] font-bold bg-red-50 py-2 px-3 rounded-lg border border-red-100">
                                        {error}
                                    </p>
                                )}

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#004F4D] text-white h-12 rounded-xl font-bold text-sm shadow-lg shadow-[#004F4D]/20 hover:shadow-[#004F4D]/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <>
                                                Continue <ArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1"
                        >
                            <div className="mb-6 bg-green-50/50 p-4 rounded-2xl border border-green-100 text-center">
                                <div className="w-10 h-10 bg-[#004F4D]/10 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <Shield size={20} className="text-[#004F4D]" />
                                </div>
                                <h2 className="text-base font-bold text-[#003836]">Enter OTP</h2>
                                <p className="text-gray-500 text-xs mt-1">
                                    Code sent to <span className="text-[#003836] font-bold">+91 {phone}</span>
                                </p>
                            </div>

                            <form onSubmit={handleVerifyOTP} className="space-y-6">
                                <div className="flex gap-2 justify-center">
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOTPChange(index, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Backspace' && !digit && index > 0) {
                                                    document.getElementById(`otp-${index - 1}`)?.focus();
                                                }
                                            }}
                                            className="w-10 h-12 bg-white border-2 border-gray-400 rounded-xl text-center text-[#003836] text-xl font-bold focus:border-[#004F4D] focus:ring-2 focus:ring-[#004F4D]/10 outline-none transition-all shadow-sm"
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>

                                <div className="text-center">
                                    {canResend ? (
                                        <p className="text-gray-400 text-xs font-bold">
                                            Didn't receive code?{' '}
                                            <button
                                                type="button"
                                                onClick={handleResendOTP}
                                                className="text-[#004F4D] hover:underline"
                                            >
                                                Resend OTP
                                            </button>
                                        </p>
                                    ) : (
                                        <p className="text-gray-400 text-xs font-bold">
                                            Resend OTP in{' '}
                                            <span className="text-[#004F4D] tabular-nums">
                                                {Math.floor(resendTimer / 60)}:{String(resendTimer % 60).padStart(2, '0')}
                                            </span>
                                        </p>
                                    )}
                                </div>

                                {error && (
                                    <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-lg border border-red-100">
                                        {error}
                                    </p>
                                )}

                                <div className="space-y-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#004F4D] text-white h-12 rounded-xl font-bold text-sm shadow-lg shadow-[#004F4D]/20 hover:shadow-[#004F4D]/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            'Verify & Login'
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="w-full text-gray-400 text-xs font-bold hover:text-[#004F4D] transition-colors"
                                    >
                                        Change Mobile Number
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <div className="py-8 text-center mt-auto">
                    <p className="text-gray-400 text-sm font-medium">
                        New to Rukkoo?{' '}
                        <button
                            onClick={() => navigate('/hotel/register')}
                            className="text-[#004F4D] font-bold hover:underline"
                        >
                            Register as a partner
                        </button>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default HotelLoginPage;
