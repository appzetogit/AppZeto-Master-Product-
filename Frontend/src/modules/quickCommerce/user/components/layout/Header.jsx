import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Heart, User, MapPin } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useLocation as useAppLocation } from "../../context/LocationContext";
import { useSettings } from '@core/context/SettingsContext';
import LocationDrawer from '../shared/LocationDrawer';

const Header = () => {
    const { settings } = useSettings();
    const { count: wishlistCount } = useWishlist();
    const { cartCount } = useCart();
    const location = useLocation();
    const path = location.pathname.replace(/^\/quick(?:-commerce(?:\/user)?)?/, '') || '/';
    const isProductDetailPage = path.startsWith('/product');
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const { currentLocation, refreshLocation } = useAppLocation();

    return (
        <header className="fixed top-0 left-0 right-0 z-[220] px-4 pt-4 md:pt-8">
            <div className="container mx-auto max-w-6xl">
                {/* Mobile Top Row: Location & Profile */}
                <div className="md:hidden flex items-center justify-between mb-4 px-2 animate-in slide-in-from-top duration-500">
                    <button
                        type="button"
                        data-lenis-prevent
                        data-lenis-prevent-touch
                        onClick={() => {
                            refreshLocation();
                            setIsLocationOpen(true);
                        }}
                        className="flex items-center gap-3 cursor-pointer active:scale-95 transition-transform border-0 bg-transparent p-0 text-left"
                    >
                        <div className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-sm">
                            <MapPin size={22} className="text-white fill-current" />
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                                {currentLocation.time}
                            </span>
                            <div className="flex items-center gap-1 font-black text-white text-base">
                                <span className="max-w-[150px] truncate">{currentLocation.name}</span> <span className="text-[10px] opacity-70">▼</span>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Main Header Capsule */}
                <div className="hidden md:flex px-4 md:px-8 h-18 bg-white/95 backdrop-blur-sm rounded-full shadow-2xl items-center justify-between border border-white/20">
                    {/* Logo */}
                    <div className="flex items-center gap-6 mr-4 md:mr-12">
                        <Link
                            to="/quick"
                            className={`flex items-center gap-1 ${isProductDetailPage ? 'hidden md:flex' : 'flex'}`}
                        >
                            <span className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: settings?.primaryColor || 'var(--primary)' }}>{settings?.appName || 'App'}</span>
                        </Link>

                        {/* Location Selector (Desktop ONLY) */}
                        <button
                            type="button"
                            data-lenis-prevent
                            data-lenis-prevent-touch
                            onClick={() => {
                                refreshLocation();
                                setIsLocationOpen(true);
                            }}
                            className="hidden md:flex items-center gap-2 pl-6 border-l border-slate-200 cursor-pointer active:scale-95 transition-transform border-0 bg-transparent p-0"
                        >
                            <div className="flex flex-col items-start leading-none group">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 group-hover:text-[var(--primary)] transition-colors">
                                    Delivery in {currentLocation.time}
                                </span>
                                <div className="flex items-center gap-1 font-bold text-slate-700 text-sm group-hover:text-[var(--primary)] transition-colors">
                                    <span className="max-w-[150px] truncate">{currentLocation.name}</span> <MapPin size={14} className="fill-current" />
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to="/quick" className="text-sm font-medium transition-colors hover:text-[var(--primary)]">Home</Link>

                        <Link to="/quick/categories" className="text-sm font-medium transition-colors hover:text-[var(--primary)]">Categories</Link>
                        <Link to="/quick/offers" className="text-sm font-medium transition-colors hover:text-[var(--primary)]">Offers</Link>
                    </nav>

                    {/* Desktop Right Icons */}
                    <div className="hidden md:flex items-center gap-4">
                        <Link to="/quick/wishlist" className="relative flex items-center justify-center p-2 hover:bg-slate-50 rounded-full transition-colors group">
                            <Heart className="h-6 w-6 text-slate-600 group-hover:text-[var(--primary)] transition-colors" />
                            {wishlistCount > 0 && (
                                <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-[#0c831f] text-[10px] font-bold text-white flex items-center justify-center border-2 border-white shadow-sm animate-in zoom-in duration-300">
                                    {wishlistCount}
                                </span>
                            )}
                        </Link>

                        <Link to="/quick/checkout" id="header-cart-icon" className="relative flex items-center justify-center p-2 hover:bg-slate-50 rounded-full transition-colors group">
                            <ShoppingCart className="h-6 w-6 text-slate-600 group-hover:text-[var(--primary)] transition-colors" />
                            {cartCount > 0 && (
                                <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-[#0c831f] text-[10px] font-bold text-white flex items-center justify-center border-2 border-white shadow-sm animate-in zoom-in duration-300">
                                    {cartCount}
                                </span>
                            )}
                        </Link>

                        <Link to="/quick/profile" className="flex items-center justify-center">
                            <User className="h-6 w-6 text-slate-600 hover:text-[var(--primary)] transition-colors" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Location Selection Drawer */}
            <LocationDrawer
                isOpen={isLocationOpen}
                onClose={() => setIsLocationOpen(false)}
            />
        </header>
    );
};

export default Header;
