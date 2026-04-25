import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, Mail, ArrowRight, Shield } from 'lucide-react';
import { authService } from '../../services/apiService';

const UserLoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loginMethod, setLoginMethod] = useState('phone'); // phone | email
    const [step, setStep] = useState('input'); // input | otp
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSendOtp = async (e) => {
        e.preventDefault();
        console.log("Login: Attempting to send OTP...", { phone, loginMethod });

        // Validation
        if (loginMethod === 'phone' && phone.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }
        if (loginMethod === 'email' && !email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        setError('');
        setLoading(true);

        try {
            // Currently backend only supports phone OTP. 
            // For email, we might need backend update, but let's try standard flow or mock for now if needed.
            if (loginMethod === 'email') {
                throw new Error("Email login is coming soon. Please use Phone.");
            }

            console.log("Calling authService.sendOtp...");
            await authService.sendOtp(phone);
            setStep('otp');
        } catch (err) {
            console.error("Login Error:", err);
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
            document.getElementById(`otp-${index + 1}`).focus();
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const otpValue = otp.join('');
        if (otpValue.length !== 6) {
            setError('Please enter complete OTP');
            return;
        }
        setError('');
        setLoading(true);

        try {
            await authService.verifyOtp({ phone, otp: otpValue });
            // Re-register FCM token now that user is logged in
            try { window.dispatchEvent(new CustomEvent('fcm:register')); } catch (_) { }
            const redirectTo = location.state?.from?.pathname || '/';
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`).focus();
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F4F4] flex flex-col items-center justify-center p-4 font-sans">

            {/* Header / Logo Section */}
            <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                    <span className="text-2xl font-black text-teal-800 flex items-center gap-1">
                        RUKKO <span className="text-teal-600 bg-teal-100 px-1 rounded">in</span>
                    </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                <p className="text-gray-500">Login to continue your journey</p>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative">
                <div className="p-8">

                    {step === 'input' ? (
                        <>
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Login with OTP</h2>

                            {/* Tabs */}
                            <div className="flex bg-gray-100 p-1 rounded-xl mb-8">
                                <button
                                    onClick={() => setLoginMethod('phone')}
                                    className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${loginMethod === 'phone' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <Phone size={18} /> Phone
                                </button>
                                <button
                                    onClick={() => setLoginMethod('email')}
                                    className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${loginMethod === 'email' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <Mail size={18} /> Email
                                </button>
                            </div>

                            <form onSubmit={handleSendOtp}>
                                <div className="mb-8">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        {loginMethod === 'phone' ? 'Phone Number' : 'Email Address'}
                                    </label>
                                    <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all bg-white">
                                        {loginMethod === 'phone' ? (
                                            <>
                                                <Phone className="text-gray-400 mr-3" size={20} />
                                                <input
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                    placeholder="9876543210"
                                                    className="flex-1 outline-none text-gray-900 font-medium placeholder:text-gray-300"
                                                    autoFocus
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <Mail className="text-gray-400 mr-3" size={20} />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="john@example.com"
                                                    className="flex-1 outline-none text-gray-900 font-medium placeholder:text-gray-300"
                                                    autoFocus
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
                                        <>Send OTP <ArrowRight size={20} /></>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Verify OTP</h2>
                            <p className="text-gray-500 text-sm mb-8">
                                Enter the code sent to <span className="font-bold text-gray-800">+91 {phone}</span>
                            </p>

                            <form onSubmit={handleVerifyOtp}>
                                <div className="flex gap-2 justify-center mb-8">
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`otp-${index}`}
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
                                {error && <p className="text-red-500 text-xs mt-[-20px] mb-6 text-center font-medium">{error}</p>}

                                <div className="text-center mb-6">
                                    <p className="text-gray-400 text-sm">
                                        Didn't receive code?{' '}
                                        <button
                                            type="button"
                                            onClick={handleSendOtp}
                                            className="text-teal-600 font-bold hover:underline"
                                        >
                                            Resend
                                        </button>
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
                                        <>Verify & Login <ArrowRight size={20} /></>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStep('input')}
                                    className="w-full mt-4 text-gray-400 text-sm font-semibold hover:text-gray-600"
                                >
                                    Change Phone Number
                                </button>
                            </form>
                        </>
                    )}

                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
                <p className="text-gray-500 text-sm">
                    New to Rukkoo.in?{' '}
                    <button onClick={() => navigate('/signup')} className="text-teal-600 font-bold hover:underline">
                        Create Account
                    </button>
                </p>
            </div>

        </div>
    );
};

export default UserLoginPage;
