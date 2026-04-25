import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, Mail, ArrowRight, Eye, EyeOff, AlertTriangle } from 'lucide-react';

const AdminLoginPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            setError('Please fill all fields');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        // Simulate authentication
        setTimeout(() => {
            // Mock credentials check
            if (formData.email === 'admin@rukkoo.in' && formData.password === 'admin123') {
                navigate('/hotel/admin/dashboard');
            } else {
                setError('Invalid credentials. Try admin@rukkoo.in / admin123');
                setLoading(false);
            }
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">

            {/* Login Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-2xl shadow-red-500/30"
                    >
                        <Shield size={40} className="text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-black text-white mb-1">Admin Portal</h1>
                    <p className="text-slate-400 text-sm">Rukkoo.in Master Control</p>
                </div>

                {/* Form Card */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Email Input */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                Admin Email
                            </label>
                            <div className="flex items-center bg-slate-900/50 rounded-xl border border-slate-600 overflow-hidden focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/30 transition-all">
                                <div className="pl-4">
                                    <Mail size={20} className="text-slate-500" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="admin@rukkoo.in"
                                    className="flex-1 bg-transparent px-4 py-4 text-white font-medium placeholder:text-slate-600 outline-none"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                Password
                            </label>
                            <div className="flex items-center bg-slate-900/50 rounded-xl border border-slate-600 overflow-hidden focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/30 transition-all">
                                <div className="pl-4">
                                    <Lock size={20} className="text-slate-500" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="flex-1 bg-transparent px-4 py-4 text-white font-medium placeholder:text-slate-600 outline-none"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="pr-4 text-slate-500 hover:text-slate-400"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl"
                            >
                                <AlertTriangle size={16} />
                                {error}
                            </motion.div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 disabled:opacity-50 hover:from-red-700 hover:to-red-800 active:scale-[0.98] transition-all"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Access Dashboard <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Forgot Password */}
                    <div className="mt-6 text-center">
                        <button className="text-sm text-slate-500 hover:text-red-400 transition-colors">
                            Forgot password?
                        </button>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-6 text-center">
                    <p className="text-slate-600 text-xs flex items-center justify-center gap-2">
                        <Lock size={12} />
                        Secured with 256-bit SSL encryption
                    </p>
                </div>

                {/* Demo Credentials */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 bg-slate-800/30 border border-slate-700/50 rounded-xl p-4"
                >
                    <p className="text-xs text-slate-500 text-center mb-2">Demo Credentials</p>
                    <div className="text-center text-slate-400 text-sm font-mono">
                        <p>Email: <span className="text-white">admin@rukkoo.in</span></p>
                        <p>Password: <span className="text-white">admin123</span></p>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default AdminLoginPage;
