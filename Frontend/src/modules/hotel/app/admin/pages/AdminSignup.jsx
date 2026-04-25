import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Lock, Mail, User, KeyRound } from 'lucide-react';
import AdminAuthLayout from '../layouts/AdminAuthLayout';

const AdminSignup = () => {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

    const onSubmit = async (data) => {
        // Simulate API call for now
        console.log("Signup Data:", data);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        navigate('/hotel/admin/dashboard');
    };

    return (
        <AdminAuthLayout
            title="Request Access"
            subtitle="Create your administrative credentials."
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                {/* Full Name */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 block uppercase tracking-wider">Full Name</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                            <User size={16} />
                        </div>
                        <input
                            type="text"
                            {...register('name', { required: 'Name is required' })}
                            className={`block w-full pl-9 pr-3 py-2.5 border ${errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-black'} rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-sm`}
                            placeholder="John Doe"
                        />
                    </div>
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 block uppercase tracking-wider">Email Address</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                            <Mail size={16} />
                        </div>
                        <input
                            type="email"
                            {...register('email', {
                                required: 'Email is required',
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: "Invalid email"
                                }
                            })}
                            className={`block w-full pl-9 pr-3 py-2.5 border ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-black'} rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-sm`}
                            placeholder="admin@rukkoo.in"
                        />
                    </div>
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 block uppercase tracking-wider">Password</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                            <Lock size={16} />
                        </div>
                        <input
                            type="password"
                            {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 chars' } })}
                            className={`block w-full pl-9 pr-3 py-2.5 border ${errors.password ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-black'} rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-sm`}
                            placeholder="••••••••"
                        />
                    </div>
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                </div>

                {/* Secret Key (Security) */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 block uppercase tracking-wider">Admin Secret Key</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                            <KeyRound size={16} />
                        </div>
                        <input
                            type="password"
                            {...register('secretKey', { required: 'Secret key is required for admin access' })}
                            className={`block w-full pl-9 pr-3 py-2.5 border ${errors.secretKey ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-black'} rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-sm`}
                            placeholder="Internal Use Only"
                        />
                    </div>
                    {errors.secretKey && <p className="text-xs text-red-500 mt-1">{errors.secretKey.message}</p>}
                </div>

                {/* Submit */}
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-black text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all flex items-center justify-center shadow-lg mt-2 disabled:opacity-70"
                >
                    {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : "Create Account"}
                </motion.button>
            </form>

            <div className="mt-5 text-center">
                <p className="text-sm text-gray-500">
                    Already have access?{' '}
                    <Link to="/admin/login" className="font-semibold text-black hover:underline">
                        Sign In
                    </Link>
                </p>
            </div>
        </AdminAuthLayout>
    );
};

export default AdminSignup;
