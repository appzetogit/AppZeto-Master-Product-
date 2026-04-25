import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, ArrowRight, User, CheckCircle } from 'lucide-react';
import { authService } from '../../services/apiService';
import toast, { Toaster } from 'react-hot-toast';

const UserSignupPage = () => {
    const navigate = useNavigate();
    const [signupMethod, setSignupMethod] = useState('phone'); // phone | email
    const [step, setStep] = useState('input'); // input | otp
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(120); // 2 minutes = 120 seconds
    const [canResend, setCanResend] = useState(false);

    // Timer countdown effect
    useEffect(() => {
        let interval;
        if (step === 'otp' && resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [step, resendTimer]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            setFormData({ ...formData, [name]: value.replace(/\D/g, '').slice(0, 10) });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        console.log("Attempting to send OTP...", { formData, signupMethod });

        // Validation
        if (!formData.name.trim()) {
            setError('Please enter your full name');
            return;
        }
        if (signupMethod === 'phone' && formData.phone.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }
        if (signupMethod === 'email' && !formData.email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        setError('');
        setLoading(true);

        try {
            // Currently backend only supports phone OTP. 
            if (signupMethod === 'email') {
                throw new Error("Email signup is coming soon. Please use Phone.");
            }

            console.log("Calling authService.sendOtp with:", formData.phone);
            // Pass 'register' type to backend for signup flow
            await authService.sendOtp(formData.phone, 'register', 'user');
            console.log("OTP sent successfully");
            setResendTimer(120); // Reset timer to 2 minutes
            setCanResend(false); // Disable resend button
            setStep('otp');
        } catch (err) {
            console.error("Signup Error:", err);
            setError(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            document.getElementById(`signup-otp-${index + 1}`).focus();
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const otpValue = otp.join('');
        if (otpValue.length !== 6) {
            setError('Please enter complete OTP');
            return;
        }
        setError('');
        setLoading(true);

        try {
            await authService.verifyOtp({
                phone: formData.phone,
                otp: otpValue,
                name: formData.name,
                email: formData.email // Optional if collected
            });
            navigate('/');
        } catch (err) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`signup-otp-${index - 1}`).focus();
        }
    };

    const handleResendOtp = async () => {
        if (!canResend) return;

        setError('');
        setLoading(true);

        try {
            // Pass 'register' type to backend for signup flow
            await authService.sendOtp(formData.phone, 'register', 'user');
            setResendTimer(120);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']); // Clear OTP inputs
            toast.success('OTP sent successfully!');
        } catch (err) {
            console.error("Resend OTP Error:", err);
            setError(err.message || 'Failed to resend OTP');
            toast.error(err.message || 'Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F4F4] flex flex-col items-center justify-center p-4 font-sans">
            <Toaster position="top-center" />

            {/* Header Section */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                <p className="text-gray-500">Join thousands of happy travelers</p>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative">
                <div className="p-8">

                    {step === 'input' ? (
                        <>
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Sign Up</h2>

                            <form onSubmit={handleSendOtp}>
                                {/* Full Name */}
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Full Name
                                    </label>
                                    <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all bg-white">
                                        <User className="text-gray-400 mr-3" size={20} />
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="John Doe"
                                            className="flex-1 outline-none text-gray-900 font-medium placeholder:text-gray-300"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setSignupMethod('phone')}
                                        className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${signupMethod === 'phone' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <Phone size={18} /> Phone
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSignupMethod('email')}
                                        className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${signupMethod === 'email' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <Mail size={18} /> Email
                                    </button>
                                </div>

                                {/* Contact Input */}
                                <div className="mb-8">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        {signupMethod === 'phone' ? 'Phone Number' : 'Email Address'}
                                    </label>
                                    <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all bg-white">
                                        {signupMethod === 'phone' ? (
                                            <>
                                                <Phone className="text-gray-400 mr-3" size={20} />
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    placeholder="9876543210"
                                                    className="flex-1 outline-none text-gray-900 font-medium placeholder:text-gray-300"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <Mail className="text-gray-400 mr-3" size={20} />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    placeholder="john@example.com"
                                                    className="flex-1 outline-none text-gray-900 font-medium placeholder:text-gray-300"
                                                />
                                            </>
                                        )}
                                    </div>
                                    {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#009688] hover:bg-[#00796B] text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>Continue <ArrowRight size={20} /></>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Phone</h2>
                            <p className="text-gray-500 text-sm mb-8">
                                Enter the code sent to <span className="font-bold text-gray-800">+91 {formData.phone}</span>
                            </p>

                            <form onSubmit={handleRegister}>
                                <div className="flex gap-2 justify-center mb-8 px-4">
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`signup-otp-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-12 h-14 border border-gray-200 rounded-xl text-center text-2xl font-bold text-gray-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all bg-gray-50"
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>
                                {error && <p className="text-red-500 text-xs text-center font-medium mb-4">{error}</p>}

                                <div className="text-center mb-6">
                                    <p className="text-gray-500 text-sm">
                                        {canResend ? (
                                            <>
                                                Didn't receive code?{' '}
                                                <button
                                                    type="button"
                                                    onClick={handleResendOtp}
                                                    className="text-teal-600 font-bold hover:underline"
                                                >
                                                    Resend OTP
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                Resend OTP in{' '}
                                                <span className="text-teal-600 font-bold">
                                                    {Math.floor(resendTimer / 60)}:{String(resendTimer % 60).padStart(2, '0')}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#009688] hover:bg-[#00796B] text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>Create Account <CheckCircle size={20} /></>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStep('input')}
                                    className="w-full mt-4 text-gray-400 text-sm font-semibold hover:text-gray-600"
                                >
                                    Back to Details
                                </button>
                            </form>
                        </>
                    )}

                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
                <p className="text-gray-500 text-sm">
                    Already have an account?{' '}
                    <button onClick={() => navigate('/login')} className="text-teal-600 font-bold hover:underline">
                        Login
                    </button>
                </p>
            </div>

        </div>
    );
};

export default UserSignupPage;
