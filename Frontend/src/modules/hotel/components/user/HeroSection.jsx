import React, { useState, useEffect } from 'react';
import { Search, Menu, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/rokologin-removebg-preview.png';
import MobileMenu from '../../components/ui/MobileMenu';
import { useNavigate } from 'react-router-dom';
import walletService from '../../services/walletService';

const HeroSection = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isSticky, setIsSticky] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);

    const placeholders = [
        "Search in Bucharest...",
        "Find luxury hotels...",
        "Book villas in Bali...",
        "Couple friendly stays...",
        "Search near Red Square..."
    ];

    useEffect(() => {
        const fetchWallet = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (user) {
                    const walletData = await walletService.getWallet();
                    if (walletData.success && walletData.wallet) {
                        setWalletBalance(walletData.wallet.balance);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch wallet', error);
            }
        };
        fetchWallet();
    }, []);

    // Placeholder Rotation
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [placeholders.length]);

    // Scroll Listener for Sticky & Header Logic
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            setIsSticky(scrollY > 80);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSearchClick = () => {
        navigate('/hotel/search');
    };

    return (
        <section className={`relative w-full px-5 pt-4 pb-2 flex flex-col gap-4 md:gap-6 md:pt-8 md:pb-10 bg-transparent transition-all duration-300`}>

            {/* 1. Header Row (Hides on Scroll) */}
            <div className={`flex md:hidden items-center justify-between relative h-24 transition-all duration-300 ${isSticky ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100 mb-0'}`}>
                {/* Menu Button */}
                <button
                    onClick={() => setIsMenuOpen(true)}
                    className="p-1.5 rounded-full bg-white/40 hover:bg-white/60 transition shadow-sm"
                >
                    <Menu size={18} className="text-surface" />
                </button>

                {/* Logo */}
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <img
                        src={logo}
                        alt="Rukko Logo"
                        className="h-20 object-contain drop-shadow-sm"
                    />
                </div>

                {/* Wallet Balance Display */}
                <button
                    onClick={() => navigate('/hotel/wallet')}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/50 backdrop-blur-sm border border-white/40 shadow-sm active:scale-95 transition-transform"
                >
                    <div className="w-5 h-5 bg-surface rounded-full flex items-center justify-center">
                        <Wallet size={10} className="text-white" />
                    </div>
                    <div className="flex flex-col items-start leading-none mr-0.5">
                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wide">Wallet</span>
                        <span className="text-[10px] font-bold text-surface">
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

            {/* 2. Search Bar - Sticky Logic */}
            <div className={`
                 w-full transition-all duration-300 z-50
                 ${isSticky ? 'fixed top-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-xl shadow-md border-b border-surface/5' : 'relative'}
            `}>
                <div
                    onClick={handleSearchClick}
                    className={`
                    w-full 
                    bg-white
                    ${isSticky ? 'h-10 rounded-full shadow-inner bg-gray-100/50 mx-auto max-w-7xl' : 'h-11 md:h-14 rounded-xl md:rounded-2xl shadow-sm border border-surface/5'}
                    flex items-center 
                    px-3 md:px-4
                    gap-2 md:gap-3
                    relative
                    overflow-hidden
                    cursor-pointer
                    transition-all duration-300
                `}>
                    <Search size={18} className="text-gray-400 z-10 md:w-6 md:h-6" />

                    <div className="flex-1 h-full flex items-center bg-transparent outline-none text-surface font-medium z-20 relative text-xs md:text-sm">
                        {/* Input simulated via div/text */}
                    </div>

                    <div className="absolute left-9 right-10 md:left-12 md:right-12 h-full flex items-center pointer-events-none z-0">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={placeholderIndex}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="text-gray-400 font-normal text-xs md:text-sm absolute w-full truncate"
                            >
                                {placeholders[placeholderIndex]}
                            </motion.span>
                        </AnimatePresence>
                    </div>

                    {/* Filter Icon */}
                    <button className="p-1 rounded-lg bg-surface/5 z-10">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#004F4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="6" x2="20" y2="6"></line>
                            <line x1="4" y1="12" x2="20" y2="12"></line>
                            <line x1="4" y1="18" x2="12" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Placeholder Spacer only when sticky to prevent content jump */}
            {isSticky && (
                <div className="h-11 w-full md:h-14"></div>
            )}

            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        </section>
    );
};

export default HeroSection;
