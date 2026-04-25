import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowRight, Loader2, Shield } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/rokologin-removebg-preview.png';
import { authService } from '../../services/apiService';
import toast from 'react-hot-toast';

const UserLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [step, setStep] = useState(1); // 1: Enter Phone, 2: Enter OTP
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(120);
    const [canResend, setCanResend] = useState(false);

    // Pre-fill phone if coming from signup
    useEffect(() => {
        if (location.state?.phone) {
            setPhone(location.state.phone);
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
    }, [step, resendTimer === 0]);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (phone.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        try {
            setLoading(true);
            await authService.sendOtp(phone, 'login');
            setResendTimer(120);
            setCanResend(false);
            setStep(2);
        } catch (err) {
            // Check if account doesn't exist or is blocked
            if (err.isBlocked || err.response?.data?.isBlocked || err.status === 403) {
                setError(err.message || 'Your account has been blocked by admin. Please contact support.');
            } else if (err.requiresRegistration || err.response?.data?.requiresRegistration || err.status === 404) {
                setError('Account not found. Redirecting to signup...');
                setTimeout(() => {
                    navigate('/signup', { state: { phone } });
                }, 1500);
            } else {
                setError(err.message || 'Failed to send OTP');
            }
            console.error('Send OTP Error:', err);
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
            await authService.sendOtp(phone, 'login');
            setResendTimer(120);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']); // Clear OTP
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
        if (otpString.length !== 6) {
            setError('Please enter complete OTP');
            return;
        }

        try {
            setLoading(true);
            await authService.verifyOtp({ phone, otp: otpString });

            // Trigger FCM token re-registration in App.jsx using the cached token
            // This avoids requesting permission again and ensures the token is saved for the now-logged-in user
            try {
                window.dispatchEvent(new CustomEvent('fcm:register'));
            } catch (fcmError) {
                console.warn('[FCM] Could not dispatch register event', fcmError);
            }

            // Redirect back to the page the user was trying to access, or home
            const redirectTo = location.state?.from?.pathname || '/';
            navigate(redirectTo, { replace: true });
        } catch (err) {
            // Check if account is blocked or not found
            if (err.isBlocked || err.response?.data?.isBlocked || err.status === 403) {
                setError(err.message || 'Your account has been blocked by admin. Please contact support.');
            } else if (err.requiresRegistration || err.response?.data?.requiresRegistration || err.status === 404) {
                setError('Account not found. Redirecting to signup...');
                setTimeout(() => {
                    navigate('/signup', { state: { phone } });
                }, 1500);
            } else {
                setError(err.message || 'Verification failed');
            }
            console.error('Verify OTP Error:', err);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-6">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm relative z-10"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.1 }}
                        className="inline-block mb-6"
                    >
                        <img src={logo} alt="Rukkoo.in" className="w-40 h-auto object-contain" />
                    </motion.div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Welcome Back</h1>
                    <p className="text-gray-400 text-xs font-medium mt-1">Login to continue your journey</p>
                </div>

                {/* Main Card */}
                <div className=" p-2">
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <form onSubmit={handleSendOTP} className="space-y-6">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 block ml-1">
                                            Phone Number
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                                <Phone size={18} />
                                            </div>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="9876543210"
                                                maxLength={10}
                                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all font-bold text-gray-800 text-lg placeholder:text-gray-300 shadow-sm"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-lg"
                                        >
                                            {error}
                                        </motion.p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            <>
                                                Send OTP
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
                                <div className="text-center mb-4">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <Shield size={18} className="text-emerald-600" />
                                    </div>
                                    <h2 className="text-base font-black text-gray-900 tracking-tight">Enter OTP</h2>
                                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                                        Code sent to <span className="text-gray-900 font-bold">+91 {phone}</span>
                                    </p>
                                </div>

                                <form onSubmit={handleVerifyOTP} className="space-y-6">
                                    {/* OTP Input */}
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

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-red-500 text-[10px] font-bold text-center bg-red-50 py-2 rounded-lg"
                                        >
                                            {error}
                                        </motion.p>
                                    )}

                                    <div className="space-y-3">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-2xl font-black text-sm shadow-md shadow-gray-900/10 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                                            className="w-full text-gray-400 text-[10px] font-bold hover:text-emerald-600 transition-colors"
                                        >
                                            Change Number
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-400 text-xs mt-8 font-medium">
                    New to Rukkoo.in?{' '}
                    <button
                        onClick={() => navigate('/signup')}
                        className="text-emerald-600 font-bold hover:underline"
                    >
                        Create Account
                    </button>
                </p>
            </motion.div>
        </div>
    );
};

export default UserLogin;
