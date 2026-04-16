import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Users, Building2, Calendar, Wallet,
    Settings, Bell, Search, LogOut, Menu, X, DollarSign, ClipboardCheck, Star, Tag, FileText, MessageSquare, CircleHelp, Home
} from 'lucide-react';

import logo from '../../../assets/rokologin-removebg-preview.png';
import useAdminStore from '../store/adminStore';
import toast from 'react-hot-toast';
import adminService from '../../../services/adminService';

const AdminLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const logout = useAdminStore(state => state.logout);

    // Notifications State
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const notifRef = useRef(null);

    useEffect(() => {
        loadNotifications();
        // Close dropdown when clicking outside
        function handleClickOutside(event) {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await adminService.getNotifications(1, 5); // Fetch top 5 for dropdown
            if (data.success) {
                setNotifications(data.notifications);
                setUnreadCount(data.meta.unreadCount);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleViewAll = async () => {
        setIsNotifOpen(false);
        // Mark all as read when going to view all? The user requirement says "click view all -> redirect to received tab -> status change to read".
        // We can do marking read on the page itself or here. Let's do it here for smoother UX or let the page handle it.
        // Requirement: "View all notifications option ho uspr click krne pr recieved notification ki tab pr redirect ho jaye admin and all the unread notifications ka status change hoke read ho jaye"
        try {
            await adminService.markAllNotificationsRead();
            setUnreadCount(0); // Optimistic update
            navigate('/hotel/admin/notifications');
        } catch (err) {
            navigate('/hotel/admin/notifications');
        }
    };

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/admin/login', { replace: true });
    };

    const ADMIN_MODULES = [
        { key: 'food', label: 'Food', path: '/admin/food', active: location.pathname.startsWith('/admin/food') },
        { key: 'quick', label: 'Quick', path: '/admin/quick-commerce', active: location.pathname.startsWith('/admin/quick-commerce') },
        { key: 'taxi', label: 'Taxi', path: '/taxi/admin/dashboard', active: location.pathname.startsWith('/taxi/admin') || location.pathname.startsWith('/admin/taxi') },
        { key: 'hotel', label: 'Hotel', path: '/hotel/admin/dashboard', active: location.pathname.startsWith('/hotel/admin') || location.pathname.startsWith('/admin/hotel') },
    ];

    const MENU_ITEMS = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/hotel/admin/dashboard' },
        { icon: Users, label: 'User Management', path: '/hotel/admin/users' },
        { icon: Building2, label: 'Partner Management', path: '/hotel/admin/partners' },
        { icon: Home, label: 'Property Management', path: '/hotel/admin/properties' },
        { icon: Calendar, label: 'Bookings', path: '/hotel/admin/bookings' },
        { icon: Bell, label: 'Notifications', path: '/hotel/admin/notifications', badge: unreadCount > 0 },
        { icon: Wallet, label: 'Finance & Payouts', path: '/hotel/admin/finance' },
        { icon: Tag, label: 'Offers & Coupons', path: '/hotel/admin/offers' },
        { icon: FileText, label: 'Legal & Content', path: '/hotel/admin/legal' },
        { icon: MessageSquare, label: 'Contact Messages', path: '/hotel/admin/contact-messages' },
        { icon: CircleHelp, label: 'FAQs', path: '/hotel/admin/faqs' },
        { icon: Settings, label: 'Settings', path: '/hotel/admin/settings' },
    ];

    return (
        <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 260 : 80 }}
                className="bg-black text-white flex flex-col h-full border-r border-gray-800 shadow-2xl z-20 transition-all duration-300 relative"
            >
                <div className="py-2 flex items-center justify-center bg-white border-b border-gray-800 transition-all duration-300">
                    <img
                        src={logo}
                        alt="Rukkoo.in"
                        className={`object-contain transition-all duration-300 ${isSidebarOpen ? 'h-20 w-auto' : 'h-10 w-10'}`}
                    />
                </div>

                {isSidebarOpen ? (
                    <div className="px-3 pt-4 pb-2 border-b border-gray-800">
                        <p className="px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                            Switch Module
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            {ADMIN_MODULES.map((module) => (
                                <button
                                    key={module.key}
                                    type="button"
                                    onClick={() => navigate(module.path)}
                                    className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all ${module.active
                                        ? 'bg-white text-black shadow-sm'
                                        : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white'
                                        }`}
                                >
                                    {module.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="px-2 pt-4 pb-2 border-b border-gray-800">
                        <div className="flex flex-col items-center gap-2">
                            {ADMIN_MODULES.map((module) => (
                                <button
                                    key={module.key}
                                    type="button"
                                    onClick={() => navigate(module.path)}
                                    className={`w-11 h-9 rounded-lg text-[10px] font-bold uppercase transition-all ${module.active
                                        ? 'bg-white text-black shadow-sm'
                                        : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white'
                                        }`}
                                    title={module.label}
                                >
                                    {module.label.slice(0, 1)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
                    {MENU_ITEMS.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative text-sm font-medium ${isActive
                                    ? 'bg-white text-black shadow-lg shadow-gray-900/10'
                                    : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} className={`shrink-0 ${isActive ? 'text-black' : 'text-gray-400 group-hover:text-white'}`} />
                                {isSidebarOpen && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="whitespace-nowrap flex-1 truncate"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                                {item.badge && isSidebarOpen && (
                                    <span className="ml-auto w-2 h-2 bg-red-500 rounded-full shrink-0"></span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / Toggle */}
                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-900 text-gray-400 hover:text-white transition-colors"
                    >
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <button
                        onClick={handleLogout}
                        className={`mt-2 w-full flex items-center gap-3 p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors ${!isSidebarOpen && 'justify-center'}`}
                    >
                        <LogOut size={20} />
                        {isSidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <h1 className="text-xl font-bold text-gray-800">
                            Rukkoo.in Admin
                        </h1>
                        <div className="hidden md:flex items-center relative max-w-md w-full ml-8">
                            <Search size={16} className="absolute left-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users, bookings, hotels..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4" ref={notifRef}>
                        <div className="relative">
                            <button
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                                )}
                            </button>

                            {/* Dropdown */}
                            <AnimatePresence>
                                {isNotifOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 origin-top-right"
                                    >
                                        <div className="p-3 border-b flex justify-between items-center bg-gray-50/50">
                                            <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
                                            {unreadCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{unreadCount} New</span>}
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {notifications.length > 0 ? (
                                                notifications.slice(0, 3).map((n) => (
                                                    <div key={n._id} className={`p-3 border-b hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
                                                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{n.title}</p>
                                                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>
                                                        <span className="text-[10px] text-gray-400 mt-1 block">{new Date(n.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-gray-400 text-sm">No notifications</div>
                                            )}
                                        </div>
                                        <div className="p-2 border-t bg-gray-50">
                                            <button
                                                onClick={handleViewAll}
                                                className="w-full text-center text-xs font-bold text-black hover:underline py-1"
                                            >
                                                View All Notifications
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                            A
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 relative scroll-smooth bg-gray-50/50">
                    <div className="max-w-[1600px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
