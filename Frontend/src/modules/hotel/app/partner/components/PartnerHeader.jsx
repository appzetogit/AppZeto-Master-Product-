import React, { useState, useEffect } from 'react';
import { Menu, Wallet, Bell, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../../assets/rokologin-removebg-preview.png';
import PartnerSidebar from './PartnerSidebar';
import { hotelService } from '../../../services/apiService';
import walletService from '../../../services/walletService';

const PartnerHeader = ({ title, subtitle, showMenu = true }) => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);

    useEffect(() => {
        const fetchWallet = async () => {
            try {
                const walletData = await walletService.getWallet({ viewAs: 'partner' });
                if (walletData.success && walletData.wallet) {
                    setWalletBalance(walletData.wallet.balance);
                }
            } catch (error) {
                console.error('Failed to fetch wallet', error);
            }
        };

        const fetchNotifications = async () => {
            try {
                // Fetch Notifications
                const notifData = await hotelService.getNotifications(1, 1);
                if (notifData.success && notifData.meta) {
                    setUnreadCount(notifData.meta.unreadCount);
                }
            } catch (error) {
                console.error('Failed to fetch notifications', error);
            }
        };

        fetchWallet();
        fetchNotifications();
    }, []);

    return (
        <>
            <div className="flex items-center justify-between relative h-24 px-4 pt-2 bg-white/50 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-100/50">
                {showMenu ? (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-1.5 rounded-full bg-white hover:bg-gray-100 transition shadow-sm border border-gray-100"
                    >
                        <Menu size={18} className="text-[#003836]" />
                    </button>
                ) : (
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1.5 rounded-full bg-white hover:bg-gray-100 transition shadow-sm border border-gray-100"
                    >
                        <ChevronLeft size={18} className="text-[#003836]" />
                    </button>
                )}

                <div className="flex-1 flex justify-center items-center">
                    <img src={logo} alt="Rukko" className="h-20 object-contain drop-shadow-sm" />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/hotel/notifications')}
                        className="relative p-1.5 rounded-full bg-white hover:bg-gray-100 transition shadow-sm border border-gray-100"
                    >
                        <Bell size={18} className="text-[#003836]" />
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>

                    <button
                        onClick={() => navigate('/hotel/wallet')}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white border border-gray-100 shadow-sm active:scale-95 transition-transform"
                    >
                        <div className="w-5 h-5 bg-[#004F4D] rounded-full flex items-center justify-center">
                            <Wallet size={10} className="text-white" />
                        </div>
                        <div className="flex flex-col items-start leading-none mr-0.5">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wide">Wallet</span>
                            <span className="text-[10px] font-bold text-[#003836]">
                                {new Intl.NumberFormat('en-IN', {
                                    style: 'currency',
                                    currency: 'INR',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                }).format(walletBalance)}
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Render Sidebar Global to Header */}
            <PartnerSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </>
    );
};

export default PartnerHeader;
