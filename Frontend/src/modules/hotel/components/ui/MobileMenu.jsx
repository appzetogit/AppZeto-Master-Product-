import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Wallet, Heart, Gift, HelpCircle, FileText, Shield, ChevronRight, LogOut, Settings, BookOpen, Building, Briefcase, Bell, Edit3 } from 'lucide-react';
import logo from '../../assets/rokologin-removebg-preview.png';
import { userService } from '../../services/apiService';
import { isWebView } from '../../utils/deviceDetect';

import { useNavigate } from 'react-router-dom';

const MobileMenu = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    const user = React.useMemo(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) return null;
        try {
            return JSON.parse(savedUser);
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }, []);

    useEffect(() => {
        // Fetch unread count whenever menu opens
        if (isOpen && user) {
            const fetchUnread = async () => {
                try {
                    const data = await userService.getNotifications(1, 1);
                    if (data.success && data.meta) {
                        setUnreadCount(data.meta.unreadCount);
                    }
                } catch (error) {
                    console.error('Error fetching unread count', error);
                }
            };
            fetchUnread();
        }
    }, [isOpen, user]);

    // Disable body scroll when sidebar is open
    useEffect(() => {
        if (isOpen) {
            // Save current scroll position
            const scrollY = window.scrollY;

            // Apply styles to prevent scrolling
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scroll position
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';

            // Restore scroll position
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }

        // Cleanup on unmount
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Grouped Menu Items
    const bookingItems = [
        { icon: BookOpen, label: 'My Bookings', path: '/hotel/bookings' },
        { icon: Heart, label: 'Saved Places', path: '/hotel/saved-places' },
        { icon: Wallet, label: 'View Wallet', path: '/hotel/wallet' },
    ];

    const growthItems = [
        { icon: Gift, label: 'Refer & Earn', path: '/hotel/refer' },
        ...(!isWebView() ? [{ icon: BookOpen, label: 'Blogs', path: '/hotel/blogs' }] : []),
    ];

    const settingItems = [
        { icon: Bell, label: 'Notifications', path: '/hotel/notifications', badge: unreadCount > 0 ? unreadCount : null },
        { icon: Settings, label: 'Settings', path: '/hotel/settings' },
        { icon: HelpCircle, label: 'Need Help?', path: '/hotel/support' },
    ];

    const legalItems = [
        { icon: Shield, label: 'Privacy Policy', path: '/hotel/legal' },
        { icon: FileText, label: 'Terms & Conditions', path: '/hotel/legal' },
    ];

    const handleNavigation = (path) => {
        if (path) {
            navigate(path);
            onClose();
        }
    };

    const MenuItem = ({ icon: Icon, label, path, badge }) => (
        <button
            onClick={() => handleNavigation(path)}
            className="flex items-center gap-4 w-full p-2.5 hover:bg-gray-50 rounded-xl transition-all group active:scale-95"
        >
            <div className="w-8 h-8 rounded-full bg-surface/5 flex items-center justify-center group-hover:bg-surface/10 transition-colors">
                <Icon size={16} className="text-surface" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-700 text-sm">{label}</span>

            {badge && (
                <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mr-2">
                    {badge}
                </div>
            )}

            <ChevronRight size={14} className="text-gray-300 group-hover:text-surface transition-colors" />
        </button>
    );

    const handleLogout = () => {
        localStorage.clear();
        onClose();
        navigate('/hotel/user/login');
    };

    const handleEditProfile = () => {
        navigate('/hotel/profile/edit');
        onClose();
    };

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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
                        style={{ pointerEvents: 'auto' }}
                    />

                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'tween', ease: 'circOut', duration: 0.4 }}
                        className="fixed top-0 left-0 h-full w-[85%] max-w-[300px] bg-white z-[101] overflow-y-auto overscroll-contain md:hidden shadow-2xl"
                        style={{ touchAction: 'pan-y' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 pb-2">
                            <img src={logo} alt="Rukko" className="h-20 object-contain" />
                            <button onClick={onClose} className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition border border-gray-100">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="px-5 mb-4">
                            {user ? (
                                <div className="bg-gradient-to-br from-surface to-emerald-700 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 backdrop-blur-sm">
                                                <User size={22} className="text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-base leading-tight">{user.name}</h3>
                                                <p className="text-[11px] text-white/80 mt-0.5">{user.phone}</p>
                                            </div>
                                        </div>
                                        <button onClick={handleEditProfile} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm">
                                            <Edit3 size={14} className="text-white" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-surface rounded-2xl p-4 text-white shadow-lg shadow-surface/20 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/20">
                                            <User size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base leading-tight">Guest User</h3>
                                            <p className="text-[10px] text-white/70">Sign in for better experience</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => handleNavigation('/hotel/user/login')} className="flex-1 py-2 bg-white text-surface text-xs font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-colors">Login</button>
                                        <button onClick={() => handleNavigation('/hotel/user/signup')} className="flex-1 py-2 bg-white/10 text-white border border-white/20 text-xs font-bold rounded-lg hover:bg-white/20 transition-colors">Signup</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-5 space-y-4 pb-10">
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">Travel & Stays</h4>
                                <div className="flex flex-col gap-1">{bookingItems.map((item, idx) => <MenuItem key={idx} {...item} />)}</div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">Grow with Rukko</h4>
                                <div className="flex flex-col gap-1">{growthItems.map((item, idx) => <MenuItem key={idx} {...item} />)}</div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">App Settings</h4>
                                <div className="flex flex-col gap-1">{settingItems.map((item, idx) => <MenuItem key={idx} {...item} />)}</div>
                            </div>

                            <div className="pt-2 border-t border-gray-100">
                                {legalItems.map((item, idx) => (
                                    <button key={idx} onClick={() => handleNavigation(item.path)} className="flex items-center gap-3 w-full p-2 hover:text-surface transition-colors">
                                        <span className="text-xs font-medium text-gray-400 hover:text-surface">{item.label}</span>
                                    </button>
                                ))}
                                {user && (
                                    <button onClick={handleLogout} className="mt-4 flex items-center gap-2 text-red-500 font-medium text-xs px-2 hover:opacity-80">
                                        <LogOut size={14} /> Log Out
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MobileMenu;
