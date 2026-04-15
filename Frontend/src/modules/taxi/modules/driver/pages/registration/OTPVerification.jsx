import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    getStoredDriverRegistrationSession,
    clearDriverRegistrationSession,
    saveDriverRegistrationSession,
    sendDriverLoginOtp,
    sendDriverOtp,
    verifyDriverLoginOtp,
    verifyDriverOtp,
} from '../../services/registrationService';

const unwrap = (response) => response?.data?.data || response?.data || response;

const OTPVerification = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [otp, setOtp] = useState(['', '', '', '']);
    const inputs = useRef([]);
    const [timer, setTimer] = useState(30);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const session = {
        ...getStoredDriverRegistrationSession(),
        ...(location.state || {}),
    };

    const phone = session.phone || '95898 14119';
    const role = session.role || 'driver';
    const registrationId = session.registrationId || '';
    const debugOtp = session.debugOtp || '';
    const isLoginFlow = Boolean(session.loginMode);

    useEffect(() => {
        if (debugOtp && /^\d{4}$/.test(String(debugOtp))) {
            setOtp(String(debugOtp).split(''));
        }

        const interval = setInterval(() => {
            setTimer(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [debugOtp]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 3) {
            inputs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1].focus();
        }
    };

    const handleVerify = async () => {
        if (otp.join('').length !== 4) {
            setError('Please enter a valid 4-digit OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (isLoginFlow) {
                const response = await verifyDriverLoginOtp({
                    phone,
                    otp: otp.join(''),
                });
                const payload = unwrap(response);

                const token = payload?.token;
                if (token) {
                    localStorage.setItem('token', token);
                    localStorage.setItem('driverToken', token);
                    const normalizedRole = String(role || 'driver').toLowerCase() === 'owner' ? 'owner' : 'driver';
                    localStorage.setItem('role', normalizedRole);
                }

                clearDriverRegistrationSession();
                const nextPath =
                    String(role || 'driver').toLowerCase() === 'owner'
                        ? '/taxi/driver/profile'
                        : '/taxi/driver/home';
                navigate(nextPath, { replace: true });
                return;
            }

            const response = await verifyDriverOtp({
                registrationId,
                phone,
                otp: otp.join(''),
            });
            const payload = unwrap(response);

            const nextState = saveDriverRegistrationSession({
                ...session,
                registrationId,
                phone,
                role,
                otpVerified: true,
                otpSession: payload?.session || null,
            });

            navigate('/taxi/driver/step-personal', { state: nextState });
        } catch (err) {
            setError(err?.message || 'OTP verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = isLoginFlow
                ? await sendDriverLoginOtp({ phone })
                : await sendDriverOtp({ phone, role });
            const payload = unwrap(response);
            const nextSession = payload?.session || {};

            saveDriverRegistrationSession({
                ...session,
                phone,
                role,
                registrationId: nextSession.registrationId || registrationId,
                debugOtp: nextSession.debugOtp || '',
                loginMode: isLoginFlow,
            });

            if (nextSession.debugOtp && /^\d{4}$/.test(String(nextSession.debugOtp))) {
                setOtp(String(nextSession.debugOtp).split(''));
            } else {
                setOtp(['', '', '', '']);
            }

            setTimer(30);
        } catch (err) {
            setError(err?.message || 'Unable to resend OTP');
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

            <main className="space-y-5 max-w-sm mx-auto">
                <div className="space-y-1.5 text-center">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                        Verify {role === 'owner' ? 'Owner' : 'Mobile'}
                    </h1>
                    <p className="text-[11px] font-bold text-slate-400 opacity-80 uppercase tracking-widest leading-relaxed">Identity Check for +91 {phone}</p>
                </div>

                    <div className="flex justify-between gap-1.5 py-4">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={el => inputs.current[index] = el}
                            type="tel"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className="w-11 h-14 bg-slate-50 rounded-xl text-center text-xl font-black text-slate-900 transition-all caret-taxi-primary focus:outline-none focus:ring-0"
                        />
                    ))}
                    </div>

                    {error && (
                        <p className="text-center text-[11px] font-bold text-rose-500">
                            {error}
                        </p>
                    )}

                <div className="text-center space-y-4 mt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        {timer > 0 ? (
                            `Resend Code in ${timer}s`
                        ) : (
                            <span
                                className="text-slate-900 underline underline-offset-4 decoration-slate-200 cursor-pointer"
                                onClick={handleResend}
                            >
                                Resend Now
                            </span>
                        )}
                    </p>

                    <button 
                        onClick={handleVerify}
                        disabled={loading || otp.join('').length !== 4}
                        className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-widest shadow-lg transition-all ${
                            otp.join('').length === 4 ? 'bg-slate-900 text-white shadow-slate-900/10' : 'bg-slate-100 text-slate-300 pointer-events-none'
                        }`}
                    >
                        {loading ? 'Verifying...' : 'Verify & Join'} <CheckCircle2 size={16} strokeWidth={3} />
                    </button>
                </div>

                <div className="pt-10 flex flex-col items-center gap-3 opacity-20 grayscale pointer-events-none">
                   <div className="flex items-center gap-2">
                      <ShieldAlert size={12} className="text-rose-500" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Security Checkpoint</p>
                   </div>
                   <div className="h-0.5 w-10 bg-slate-100 rounded-full" />
                </div>
            </main>
        </div>
    );
};

export default OTPVerification;
