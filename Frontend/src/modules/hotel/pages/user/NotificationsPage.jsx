import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Calendar, Tag, Info, Trash2, CheckCircle, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../../services/apiService';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedNotif, setSelectedNotif] = useState(null);

    useEffect(() => {
        const event = new CustomEvent('rukkoo:slider', { detail: !!selectedNotif });
        window.dispatchEvent(event);
    }, [selectedNotif]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // First mark all as read
                await userService.markAllNotificationsRead();
                // Then fetch the latest list (which should now be entirely read, but we need the content)
                await fetchNotifications();
            } catch (err) {
                console.warn(err); // Non-blocking
                fetchNotifications();
            }
        };
        init();
    }, []);

    const fetchNotifications = async () => {
        try {
            // No strict need to set loading here if handled in init, but safe to keep
            const data = await userService.getNotifications(1, 100);
            if (data.success) {
                setNotifications(data.notifications);
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectionMode = () => {
        if (isSelectionMode) {
            setSelectedIds([]); // Clear selection when exiting
        }
        setIsSelectionMode(!isSelectionMode);
    };

    const toggleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const selectAll = () => {
        if (selectedIds.length === notifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n._id));
        }
    };

    const deleteSelected = async () => {
        if (selectedIds.length === 0) return;

        if (!window.confirm(`Delete ${selectedIds.length} notification(s)?`)) return;

        try {
            await userService.deleteNotifications(selectedIds);
            toast.success('Notifications deleted');
            // Remove from local state
            setNotifications(notifications.filter(n => !selectedIds.includes(n._id)));
            setSelectedIds([]);
            if (notifications.length - selectedIds.length === 0) {
                setIsSelectionMode(false);
            }
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'booking': return <Calendar size={20} />;
            case 'offer': return <Tag size={20} />;
            default: return <Info size={20} />;
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'booking': return "bg-green-100 text-green-600";
            case 'offer': return "bg-purple-100 text-purple-600";
            default: return "bg-blue-100 text-blue-600";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-surface text-white p-6 pb-8 rounded-b-[30px] shadow-lg sticky top-0 z-30">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold">Notifications</h1>
                    </div>

                    {notifications.length > 0 && (
                        <button
                            onClick={toggleSelectionMode}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isSelectionMode ? 'bg-white text-surface' : 'bg-white/10 text-white'}`}
                        >
                            {isSelectionMode ? 'Cancel' : 'Select'}
                        </button>
                    )}
                </div>

                <div className="flex items-end justify-between">
                    <div>
                        <h2 className="text-2xl font-black">Recent Updates</h2>
                        <p className="text-sm text-white/70">
                            {notifications.length} {notifications.length === 1 ? 'Notification' : 'Notifications'}
                        </p>
                    </div>

                    {/* Delete Action Bar */}
                    <AnimatePresence>
                        {isSelectionMode && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="flex gap-3"
                            >
                                <button
                                    onClick={selectAll}
                                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 backdrop-blur-sm"
                                    title="Select All"
                                >
                                    {selectedIds.length === notifications.length ? <CheckCircle size={18} /> : <Circle size={18} />}
                                </button>
                                {selectedIds.length > 0 && (
                                    <button
                                        onClick={deleteSelected}
                                        className="p-2 bg-red-500 rounded-full hover:bg-red-600 shadow-lg text-white"
                                        title="Delete Selected"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="px-5 pt-4 relative z-10 space-y-4 pb-24">
                {loading ? (
                    <div className="flex justify-center pt-20">
                        <div className="animate-spin w-8 h-8 border-4 border-surface border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <>
                        <AnimatePresence>
                            {notifications.map((notif, index) => (
                                <motion.div
                                    key={notif._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, height: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => {
                                        if (isSelectionMode) {
                                            toggleSelect(notif._id);
                                        } else {
                                            setSelectedNotif(notif);
                                        }
                                    }}
                                    className={`
                                        bg-white rounded-2xl p-4 shadow-sm border flex gap-4 relative overflow-hidden transition-all cursor-pointer
                                        ${isSelectionMode && selectedIds.includes(notif._id) ? 'border-surface bg-gray-50' : 'border-gray-100'}
                                    `}
                                >
                                    {/* Selection Checkbox */}
                                    {isSelectionMode && (
                                        <div className="flex items-center justify-center">
                                            <div className={`
                                                w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                                ${selectedIds.includes(notif._id) ? 'bg-surface border-surface' : 'border-gray-300'}
                                            `}>
                                                {selectedIds.includes(notif._id) && <CheckCircle size={12} className="text-white" />}
                                            </div>
                                        </div>
                                    )}

                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(notif.type)}`}>
                                        {getIcon(notif.type || 'general')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className={`font-bold text-sm truncate pr-2 ${notif.isRead ? 'text-gray-600' : 'text-surface'}`}>
                                                {notif.title}
                                            </h3>
                                            {!notif.isRead && !isSelectionMode && (
                                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-3">{notif.body}</p>
                                        <span className="text-[10px] text-gray-400 mt-2 block font-medium">
                                            {new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {notifications.length === 0 && (
                            <div className="text-center pt-20 opacity-50">
                                <Bell size={48} className="text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 font-bold">No new notifications</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Notification Full Text Bottom Sheet Modal */}
            <AnimatePresence>
                {selectedNotif && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedNotif(null)}
                            className="fixed inset-0 bg-black/50 z-50"
                        />
                        {/* Bottom Sheet */}
                        <motion.div
                            key="sheet"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
                        >
                            {/* Drag Handle */}
                            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />

                            {/* Icon + Close */}
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(selectedNotif.type)}`}>
                                    {getIcon(selectedNotif.type || 'general')}
                                </div>
                                <button
                                    onClick={() => setSelectedNotif(null)}
                                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Title */}
                            <h3 className="text-base font-black text-gray-900 mb-3 leading-snug">
                                {selectedNotif.title}
                            </h3>

                            {/* Divider */}
                            <div className="h-px bg-gray-100 mb-4" />

                            {/* Full Body */}
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                {selectedNotif.body}
                            </p>

                            {/* Timestamp */}
                            <div className="mt-5 flex items-center gap-2 text-xs text-gray-400 font-medium">
                                <span>
                                    {new Date(selectedNotif.createdAt).toLocaleDateString()} • {new Date(selectedNotif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationsPage;
