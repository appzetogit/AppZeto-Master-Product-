import React, { useState } from 'react';
import { ArrowLeft, Gift, ArrowRight, Tag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    getStoredDriverRegistrationSession,
    saveDriverReferral,
    saveDriverRegistrationSession,
} from '../../services/registrationService';

const StepReferral = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const session = {
        ...getStoredDriverRegistrationSession(),
        ...(location.state || {}),
    };
    const [referral, setReferral] = useState(session.referralCode || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleNext = async (skip = false) => {
        setLoading(true);
        setError('');

        try {
            const response = await saveDriverReferral({
                registrationId: session.registrationId,
                phone: session.phone,
                referralCode: skip ? '' : referral,
            });

            const nextState = saveDriverRegistrationSession({
                ...session,
                referralCode: skip ? '' : referral,
                referralSession: response?.data?.session || null,
            });

            navigate('/taxi/driver/step-vehicle', { state: nextState });
        } catch (err) {
            setError(err?.message || 'Unable to save referral code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans p-5 pt-8 select-none overflow-x-hidden pb-10">
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
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Got a Code?</h1>
                    <p className="text-[11px] font-bold text-slate-400 opacity-80 uppercase tracking-widest leading-relaxed">Enter referral for joining bonus</p>
                </div>

                {error && (
                    <p className="text-[11px] font-bold text-rose-500">{error}</p>
                )}

                <div className="space-y-5">
                    <div className="bg-slate-50 p-5 rounded-[2.5rem] flex items-center gap-4 transition-all shadow-sm">
                        <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm transition-all">
                            <Tag size={18} />
                        </div>
                        <div className="flex-1 space-y-0.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Referral Code</label>
                            <input 
                                value={referral}
                                onChange={(e) => setReferral(e.target.value.toUpperCase())}
                                placeholder="ZETO-BONUS-9080"
                                className="w-full bg-transparent border-none p-0 text-[14px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200 tracking-widest uppercase"
                            />
                        </div>
                    </div>

                    <div className="bg-amber-50/50 p-4 rounded-2xl flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm transition-all">
                            <Gift size={18} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 leading-snug">
                            Unlock <span className="text-amber-600 font-black">₹500 Bonus</span> after first 10 rides.
                        </p>
                    </div>

                    <div className="space-y-3 pt-2">
                        <button 
                            onClick={() => handleNext(false)}
                            disabled={loading || !referral}
                            className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-widest shadow-lg transition-all ${
                                referral ? 'bg-slate-900 text-white shadow-slate-900/10' : 'bg-slate-100 text-slate-300 pointer-events-none'
                            }`}
                        >
                            {loading ? 'Saving...' : 'Apply Code'} <ArrowRight size={16} strokeWidth={3} />
                        </button>
                        
                        <button 
                            onClick={() => handleNext(true)}
                            disabled={loading}
                            className="w-full h-10 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                        >
                            Skip for now
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StepReferral;
