import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';

const AdminAuthLayout = ({ children, title, subtitle }) => {
    const bgRef = useRef(null);

    useEffect(() => {
        // Subtle background animation
        gsap.to(bgRef.current, {
            backgroundPosition: '100% 100%',
            duration: 20,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
        });
    }, []);

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 relative overflow-hidden font-sans text-gray-900">
            {/* Abstract Background */}
            <div
                ref={bgRef}
                className="absolute inset-0 z-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat"
            ></div>

            <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200"></div>

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100"
            >
                {/* Header Section */}
                <div className="bg-black px-8 py-8 text-center relative overflow-hidden">
                    {/* Decorative shine */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-500 to-transparent opacity-50"></div>

                    <h2 className="text-2xl font-bold text-white tracking-wide uppercase">{title}</h2>
                    {subtitle && (
                        <p className="mt-2 text-gray-400 text-sm">{subtitle}</p>
                    )}
                </div>

                {/* Content Section */}
                <div className="p-8">
                    {children}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-400">© 2026 Admin Control Panel. Secure System.</p>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminAuthLayout;
