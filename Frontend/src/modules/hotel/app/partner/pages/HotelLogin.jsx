import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, ArrowRight, Loader2, Shield, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../services/apiService';
import logo from '../../../assets/rokologin-removebg-preview.png';

const HotelLogin = () => {
    const OTP_LENGTH = 4;
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [method, setMethod] = useState('phone');
    const [contact, setContact] = useState('');
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Handle auto-scroll on input focus for webview keyboard
    React.useEffect(() => {
        const handleFocusIn = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        };

        window.addEventListener('focusin', handleFocusIn);
        return () => window.removeEventListener('focusin', handleFocusIn);
    }, []);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (method === 'phone' && contact.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }
        if (method === 'email' && !contact.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            // Use authService
            await authService.sendOtp(contact, 'login', 'partner');
            setStep(2);

        } catch (err) {
            setError(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleOTPChange = (index, value) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < OTP_LENGTH - 1) {
            document.getElementById(`otp-${index + 1}`)?.focus();
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
                phone: method === 'phone' ? contact : undefined, // Currently backend focuses on phone for OTP, email flow might need distinct check if supported
                email: method === 'email' ? contact : undefined,
                otp: otpString,
                role: 'partner'
            });
            navigate('/hotel/dashboard');
        } catch (err) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#003836] via-[#004F4D] to-[#006663] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md z-10"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                        className="inline-block mb-4"
                    >
                        <img src={logo} alt="Rukkoo Hub Partner" className="w-32 h-auto" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white">Partner Login</h1>
                    <p className="text-teal-100 mt-2">Access your hotel dashboard</p>
                </div>

                {/* Main Card */}
                <motion.div
                    layout
                    className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20"
                >
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h2 className="text-xl font-bold text-gray-900 mb-6">Login with OTP</h2>

                                {/* Method Toggle */}
                                <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setMethod('phone')}
                                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${method === 'phone'
                                            ? 'bg-[#004F4D] text-white shadow-md'
                                            : 'text-gray-500'
                                            }`}
                                    >
                                        <Phone size={16} className="inline mr-2" />
                                        Phone
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMethod('email')}
                                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${method === 'email'
                                            ? 'bg-[#004F4D] text-white shadow-md'
                                            : 'text-gray-500'
                                            }`}
                                    >
                                        <Mail size={16} className="inline mr-2" />
                                        Email
                                    </button>
                                </div>

                                <form onSubmit={handleSendOTP} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {method === 'phone' ? 'Phone Number' : 'Email Address'}
                                        </label>
                                        <div className="relative">
                                            {method === 'phone' ? (
                                                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            ) : (
                                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            )}
                                            <input
                                                type={method === 'phone' ? 'tel' : 'email'}
                                                value={contact}
                                                onChange={(e) => setContact(e.target.value)}
                                                placeholder={method === 'phone' ? '9876543210' : 'partner@hotel.com'}
                                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#004F4D] focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
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
                                        className="w-full bg-[#004F4D] text-white py-3 rounded-xl font-bold shadow-lg hover:bg-[#003836] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Shield size={32} className="text-[#004F4D]" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">Enter OTP</h2>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Code sent to {method === 'phone' ? `+91 ${contact}` : contact}
                                    </p>
                                </div>

                                <form onSubmit={handleVerifyOTP} className="space-y-6">
                                    <div className="flex gap-2 justify-center">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                id={`otp-${index}`}
                                                type="text"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOTPChange(index, e.target.value)}
                                                className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-400 rounded-xl focus:border-[#004F4D] focus:ring-2 focus:ring-teal-200 outline-none transition-all"
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

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#004F4D] text-white py-3 rounded-xl font-bold shadow-lg hover:bg-[#003836] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            'Verify & Login'
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="w-full text-gray-500 text-sm hover:text-gray-700"
                                    >
                                        Change {method === 'phone' ? 'number' : 'email'}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Footer */}
                <p className="text-center text-teal-100 text-sm mt-6">
                    New partner?{' '}
                    <button
                        onClick={() => navigate('/hotel/join')}
                        className="text-white font-bold hover:underline"
                    >
                        Register Your Property
                    </button>
                </p>
            </motion.div>
        </div>
    );
};

export default HotelLogin;
