import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, User, Building, List,
    CreditCard, History, Shield,
    FileText, HelpCircle, LogOut,
    LayoutDashboard,
    ChevronRight, Wallet, Bell, Settings, Edit3, Info, Phone, Calendar
} from 'lucide-react';
import usePartnerStore from '../store/partnerStore';
import logo from '../../../assets/rokologin-removebg-preview.png';

const PartnerSidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { formData } = usePartnerStore();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Disable body scroll when sidebar is open
    useEffect(() => {
        if (isOpen) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleNavigation = (path) => {
        if (path) {
            navigate(path);
            onClose();
        }
    };

    const handleLogout = () => {
        // Clear everything
        localStorage.clear();
        usePartnerStore.getState().resetForm();
        onClose();
        navigate('/hotel/login');
    };

    const MenuItem = ({ icon: Icon, label, path, badge }) => (
        <button
            onClick={() => handleNavigation(path)}
            className="flex items-center gap-4 w-full p-2.5 hover:bg-gray-50 rounded-xl transition-all group active:scale-95"
        >
            <div className="w-8 h-8 rounded-full bg-[#004F4D]/5 flex items-center justify-center group-hover:bg-[#004F4D]/10 transition-colors">
                <Icon size={16} className="text-[#004F4D]" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-700 text-sm">{label}</span>
            {badge && (
                <span className="text-[10px] font-bold bg-[#004F4D] text-white px-2 py-0.5 rounded-full">
                    {badge}
                </span>
            )}
            <ChevronRight size={14} className="text-gray-300 group-hover:text-[#004F4D] transition-colors" />
        </button>
    );

    const menuGroups = [
        {
            title: 'Overview',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/hotel/partner-dashboard' },
            ]
        },
        {
            title: 'Growth & Finance',
            items: [
                { icon: Wallet, label: 'Wallet', path: '/hotel/wallet' },
                { icon: History, label: 'Booking History', path: '/hotel/bookings' },
            ]
        },
        {
            title: 'Management',
            items: [
                { icon: Building, label: 'My Properties', path: '/hotel/properties' },
                { icon: Calendar, label: 'Manage Inventory', path: '/hotel/inventory-properties' },
                { icon: List, label: 'Reviews & Ratings', path: '/hotel/reviews' },
                { icon: Bell, label: 'Notifications', path: '/hotel/notifications' },
            ]
        },
        {
            title: 'Support & Legal',
            items: [
                { icon: HelpCircle, label: 'Help & Support', path: '/hotel/support' },
                { icon: FileText, label: 'Terms & Conditions', path: '/hotel/terms' },
                { icon: Shield, label: 'Privacy Policy', path: '/hotel/privacy' },
                { icon: Info, label: 'About Rukko Partner', path: '/hotel/about' },
                { icon: Phone, label: 'Contact Rukko Team', path: '/hotel/contact' },
                { icon: Settings, label: 'Settings', path: '/hotel/settings' },
            ]
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000]"
                        style={{ pointerEvents: 'auto' }}
                    />

                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'tween', ease: 'circOut', duration: 0.4 }}
                        className="fixed top-0 left-0 h-[100dvh] w-[85%] max-w-[300px] bg-white z-[2001] overflow-y-auto overscroll-contain shadow-2xl"
                        style={{ touchAction: 'pan-y' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 pb-2">
                            <img src={logo} alt="Rukko" className="h-[38px] object-contain" />
                            <button onClick={onClose} className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition border border-gray-100">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="px-5 mb-6">
                            <div className="bg-gradient-to-br from-[#004F4D] to-teal-700 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 backdrop-blur-sm overflow-hidden">
                                            {user.profileImage ? (
                                                <img src={user.profileImage} className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={22} className="text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <h3 className="font-bold text-base leading-tight truncate">
                                                {user.name || formData?.full_name || formData?.owner_name || 'Partner'}
                                            </h3>
                                            <p className="text-[10px] text-white/80 mt-0.5 truncate">
                                                {user.email || formData?.email || 'Manage Account'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleNavigation('/hotel/profile')}
                                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
                                    >
                                        <Edit3 size={14} className="text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 space-y-5 pb-32">
                            {menuGroups.map((group, idx) => (
                                <div key={idx}>
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">
                                        {group.title}
                                    </h4>
                                    <div className="flex flex-col gap-1">
                                        {group.items.map((item, idy) => <MenuItem key={idy} {...item} />)}
                                    </div>
                                </div>
                            ))}

                            <div className="pt-2 border-t border-gray-100">
                                <button onClick={handleLogout} className="mt-2 flex items-center gap-2 text-red-500 font-medium text-xs px-2 hover:opacity-80">
                                    <LogOut size={14} /> Log Out
                                </button>
                                <p className="text-[10px] text-gray-400 mt-4 px-2">
                                    Partner App • v1.0.0
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default PartnerSidebar;
