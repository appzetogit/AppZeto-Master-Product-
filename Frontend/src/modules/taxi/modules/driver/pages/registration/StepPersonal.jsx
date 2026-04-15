import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Phone, Lock, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    getStoredDriverRegistrationSession,
    saveDriverPersonalDetails,
    saveDriverRegistrationSession,
} from '../../services/registrationService';

const StepPersonal = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const session = {
        ...getStoredDriverRegistrationSession(),
        ...(location.state || {}),
    };
    const phone = session.phone || '95898 14119';
    const registrationId = session.registrationId || '';
    const role = session.role || 'driver';

    const [formData, setFormData] = useState({
        fullName: session.fullName || '',
        email: session.email || '',
        gender: session.gender || '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleContinue = async () => {
        if (formData.fullName && formData.email && formData.gender && formData.password) {
            setLoading(true);
            setError('');

            try {
                const { password: _password, ...safeFormData } = formData;
                const response = await saveDriverPersonalDetails({
                    registrationId,
                    phone,
                    ...formData,
                });

                const nextState = saveDriverRegistrationSession({
                    ...session,
                    registrationId,
                    phone,
                    role,
                    ...safeFormData,
                    personalSession: response?.data?.session || null,
                });

                navigate('/taxi/driver/step-referral', { state: nextState });
            } catch (err) {
                setError(err?.message || 'Unable to save personal details');
            } finally {
                setLoading(false);
            }
        } else {
            setError('Please fill all required details');
        }
    };

    const genders = ['Male', 'Female', 'Other'];

    return (
        <div className="min-h-screen bg-white font-sans p-5 pt-8 select-none overflow-x-hidden pb-32">
            <header className="mb-6">
                <button onClick={() => navigate(-1)} className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-900 active:scale-95 transition-transform">
                    <ArrowLeft size={18} strokeWidth={2.5} />
                </button>
            </header>

            <main className="space-y-6 max-w-sm mx-auto">
                <div className="space-y-1.5">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Personal Details</h1>
                    <p className="text-[11px] font-bold text-slate-400 opacity-80 uppercase tracking-widest leading-relaxed">Tell us more about yourself</p>
                </div>

                {error && (
                    <p className="text-[11px] font-bold text-rose-500">{error}</p>
                )}

                <div className="space-y-3.5">
                    {/* Full Name */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl flex items-center gap-3 transition-all shadow-sm">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-300">
                            <User size={16} />
                        </div>
                        <div className="flex-1 space-y-0.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                            <input 
                                value={formData.fullName}
                                onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                                placeholder="Hritik Raghuwanshi"
                                className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200"
                            />
                        </div>
                    </div>

                    {/* Mobile Number (Read-only) */}
                    <div className="bg-slate-100/50 p-3.5 rounded-2xl flex items-center gap-3 opacity-60">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-300 shadow-sm transition-all">
                            <Phone size={16} />
                        </div>
                        <div className="flex-1 space-y-0.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mobile</label>
                            <p className="text-[13px] font-black text-slate-950">+91 {phone}</p>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl flex items-center gap-3 transition-all shadow-sm">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-300">
                            <Mail size={16} />
                        </div>
                        <div className="flex-1 space-y-0.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                            <input 
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                placeholder="hritik@redigo.in"
                                className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200"
                            />
                        </div>
                    </div>

                    {/* Gender Selection */}
                    <div className="space-y-2 pt-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Gender</label>
                        <div className="grid grid-cols-3 gap-2">
                            {genders.map((g) => (
                                <button
                                    key={g}
                                    onClick={() => setFormData(p => ({ ...p, gender: g }))}
                                    className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        formData.gender === g 
                                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                                        : 'bg-white border border-slate-100 text-slate-400 hover:border-slate-300'
                                    }`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Password */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl flex items-center gap-3 transition-all shadow-sm">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-300">
                            <Lock size={16} />
                        </div>
                        <div className="flex-1 space-y-0.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                            <input 
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                                placeholder="********"
                                className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200"
                            />
                        </div>
                    </div>
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-50">
                    <button 
                        onClick={handleContinue}
                        disabled={loading}
                        className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-widest shadow-lg transition-all ${
                            formData.fullName && formData.email && formData.gender && formData.password 
                            ? 'bg-slate-900 text-white shadow-slate-900/10' 
                            : 'bg-slate-100 text-slate-300 pointer-events-none'
                        }`}
                    >
                        {loading ? 'Saving...' : 'Continue'} <ChevronRight size={16} strokeWidth={3} />
                    </button>
                </div>
            </main>
        </div>
    );
};

export default StepPersonal;
