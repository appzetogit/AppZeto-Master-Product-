import React, { useEffect, useRef } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, Tag } from 'lucide-react';
import gsap from 'gsap';
import PartnerHeader from '../components/PartnerHeader';

const NotificationItem = ({ notif }) => {
    const iconMap = {
        success: <CheckCircle size={18} className="text-green-600" />,
        alert: <AlertCircle size={18} className="text-red-600" />,
        info: <Info size={18} className="text-blue-600" />,
        promo: <Tag size={18} className="text-orange-600" />,
    };

    const bgMap = {
        success: 'bg-green-50',
        alert: 'bg-red-50',
        info: 'bg-blue-50',
        promo: 'bg-orange-50',
    };

    return (
        <div className={`notification-item p-4 rounded-2xl mb-3 flex gap-4 transition-colors ${notif.read ? 'bg-white' : 'bg-gray-50 border border-gray-200'}`}>
            <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${bgMap[notif.type]}`}>
                {iconMap[notif.type]}
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm font-bold ${notif.read ? 'text-gray-700' : 'text-[#003836]'}`}>{notif.title}</h4>
                    <span className="text-[10px] font-medium text-gray-400">{notif.time}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-2">
                    {notif.desc}
                </p>
                {!notif.read && (
                    <button className="text-[10px] font-bold text-[#004F4D] border-b border-[#004F4D]/20 hover:border-[#004F4D] transition-colors">Mark as Read</button>
                )}
            </div>
            {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
            )}
        </div>
    );
};

const PartnerNotifications = () => {
    const listRef = useRef(null);

    const notifications = [
        { id: 1, type: 'alert', title: 'Action Required: Update KYC', desc: 'Your business pan card verification is pending. Please re-upload clearer image.', time: '2h ago', read: false },
        { id: 2, type: 'success', title: 'Payout Processed', desc: '₹15,000 has been transferred to your HDFC Bank account ending in 8821.', time: 'Yesterday', read: true },
        { id: 3, type: 'info', title: 'New Review Received', desc: 'Arjun Mehta rated your property 5 stars! "Excellent stay, loved the food."', time: '1d ago', read: false },
        { id: 4, type: 'promo', title: 'Boost Your Visibility', desc: 'Get 20% more bookings this weekend by opting into our "Monsoon Sale".', time: '3d ago', read: true },
    ];

    useEffect(() => {
        if (listRef.current) {
            gsap.fromTo(listRef.current.children,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.1, duration: 0.4, ease: 'power2.out' }
            );
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <PartnerHeader title="Notifications" subtitle="Alerts & updates" />

            <main className="max-w-3xl mx-auto px-4 pt-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-[#003836] text-lg">Recent</h3>
                    <button className="text-xs font-bold text-gray-400 hover:text-[#004F4D] transition-colors">Mark all read</button>
                </div>

                <div ref={listRef}>
                    {notifications.length > 0 ? (
                        notifications.map(n => <NotificationItem key={n.id} notif={n} />)
                    ) : (
                        <div className="text-center py-20 opacity-50">
                            <Bell size={40} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-sm font-bold text-gray-400">No new notifications</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PartnerNotifications;
