import React, { useEffect, useState } from 'react';
import { ArrowLeft, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    clearDriverRegistrationSession,
    saveDriverRegistrationSession,
    sendDriverLoginOtp,
    sendDriverOtp,
} from '../../services/registrationService';

import { useSettings } from '../../../../shared/context/SettingsContext';

const PhoneRegistration = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { settings } = useSettings();
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('driver');
    const [agreed, setAgreed] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isLoginPage = location.pathname === '/taxi/driver/login';
    const appName = settings.general?.app_name || 'App';

    useEffect(() => {
        clearDriverRegistrationSession();
    }, []);

    const handleSendOTP = async () => {
        if (phone.length !== 10) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        if (!agreed) {
            setError('Please accept the terms before continuing');
            return;
        }

        setLoading(true);
        setError('');

        try {
            clearDriverRegistrationSession();
            const response = isLoginPage
                ? await sendDriverLoginOtp({ phone })
                : await sendDriverOtp({ phone, role });
            const session = response?.data?.session || {};
            const nextState = saveDriverRegistrationSession({
                phone,
                role,
                registrationId: session.registrationId || '',
                debugOtp: session.debugOtp || '',
                loginMode: isLoginPage,
            });

            navigate('/taxi/driver/otp-verify', {
                state: nextState,
            });
        } catch (err) {
            setError(err?.message || 'Unable to send OTP right now');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans p-5 pt-8 select-none overflow-x-hidden">
            <header className="mb-6">
                <button 
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-900 active:scale-95 transition-transform"
                >
                    <ArrowLeft size={18} strokeWidth={2.5} />
                </button>
            </header>

            <main className="space-y-6 max-w-sm mx-auto">
                <div className="space-y-1.5">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                        {isLoginPage ? 'Driver Login' : `Join ${appName} ${role === 'owner' ? 'as Owner' : ''}`}
                    </h1>
                    <p className="text-[12px] font-bold text-slate-400 opacity-80 uppercase tracking-widest leading-relaxed">
                        {isLoginPage ? 'Enter your registered mobile number to receive OTP' : "Let's verify your mobile to get started"}
                    </p>
                </div>

                    <div className="space-y-5">
                        <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 transition-all shadow-sm">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 shadow-sm transition-all">
                            <Phone size={18} />
                        </div>
                        <div className="flex-1 space-y-0.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Mobile Number</label>
                            <div className="flex items-center">
                                <span className="text-[14px] font-black text-slate-400 mr-2">+91</span>
                                <input 
                                    type="tel" 
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="95898 14119"
                                    className="bg-transparent border-none p-0 text-[14px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200 w-full tracking-wider"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 px-1">
                        <input 
                            type="checkbox" 
                            checked={agreed}
                            onChange={() => setAgreed(!agreed)}
                            className="w-4 h-4 rounded-md border-slate-200 text-slate-950 focus:ring-0 mt-0.5 cursor-pointer"
                        />
                        <p className="text-[11px] font-bold text-slate-400 leading-tight">
                            I agree to <span className="text-slate-900 underline font-black">Terms</span> and <span className="text-slate-900 underline font-black">Privacy Policy</span>.
                        </p>
                    </div>

                    {error && (
                        <p className="px-1 text-[11px] font-bold text-rose-500">
                            {error}
                        </p>
                    )}

                    <button 
                        onClick={handleSendOTP}
                        disabled={loading || !agreed || phone.length !== 10}
                        className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-widest shadow-lg transition-all ${
                            agreed && phone.length === 10 ? 'bg-slate-900 text-white shadow-slate-900/10' : 'bg-slate-100 text-slate-300 pointer-events-none'
                        }`}
                    >
                        {loading ? 'Sending...' : 'Send OTP'}  <ArrowRight size={16} strokeWidth={3} />
                    </button>

                    <div className="pt-2">
                        <button 
                            onClick={() => setRole(role === 'driver' ? 'owner' : 'driver')}
                            className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-slate-900 transition-colors border border-dashed border-slate-200 hover:border-slate-900 group"
                        >
                            {isLoginPage ? (
                                <>Switch to <span className="text-slate-900 group-hover:underline">{role === 'driver' ? 'Owner' : 'Driver'}</span></>
                            ) : (
                                <>Login as a <span className="text-slate-900 group-hover:underline">{role === 'driver' ? 'Owner' : 'Driver'}</span></>
                            )}
                        </button>
                    </div>

                    {!isLoginPage && (
                        <button
                            onClick={() => navigate('/taxi/driver/login')}
                            className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 hover:text-white hover:bg-slate-900 transition-colors border border-slate-900 bg-white group"
                        >
                            Already have an account? Login
                        </button>
                    )}

                    {isLoginPage && (
                        <button
                            onClick={() => navigate('/taxi/driver/welcome')}
                            className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 hover:text-white hover:bg-slate-900 transition-colors border border-slate-900 bg-white group"
                        >
                            Signup
                        </button>
                    )}
                </div>

                <div className="pt-6 flex items-center justify-center gap-2.5 text-slate-300 grayscale opacity-30">
                    <ShieldCheck size={16} />
                    <p className="text-[9px] font-black uppercase tracking-widest">End-to-End Encrypted</p>
                </div>
            </main>
        </div>
    );
};

export default PhoneRegistration;
