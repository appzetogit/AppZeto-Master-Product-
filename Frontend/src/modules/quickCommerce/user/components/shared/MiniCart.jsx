import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Lottie from 'lottie-react';
import { useCart } from '../../context/CartContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import shoppingCartAnimation from "@/assets/lottie/shopping-cart.json";
import {
    getQuickCartPath,
    isEmbeddedQuickPath,
} from '../../utils/routes';

const MiniCart = ({
    position = "center",
    linkTo,
    className = "",
}) => {
    const { cart, cartCount } = useCart();
    const location = useLocation();

    // Show up to 2 product images
    const displayItems = cart.slice(0, 2);

    const path = location.pathname.replace(/\/$/, '') || '/';
    const normalizedQuickPath =
        path.replace(/^\/quick(?:-commerce(?:\/user)?)?/, '') || '/';
    const isEmbedded = isEmbeddedQuickPath(path);
    const resolvedLinkTo = linkTo || getQuickCartPath(path);

    // Hide MiniCart on checkout page, order details page, profile page, wallet, transactions, wishlist, addresses, support, privacy, and about page
    const isCheckoutPage = isEmbedded ? path === '/food/user/cart' : normalizedQuickPath === '/checkout';
    const isOrderDetailsPage = isEmbedded ? false : normalizedQuickPath.startsWith('/orders');
    const isProfilePage = isEmbedded ? false : normalizedQuickPath === '/profile';
    const isWalletPage = isEmbedded ? false : normalizedQuickPath === '/wallet';
    const isTransactionsPage = isEmbedded ? false : normalizedQuickPath === '/transactions';
    const isWishlistPage = isEmbedded ? false : normalizedQuickPath.startsWith('/wishlist');
    const isAddressesPage = isEmbedded ? false : normalizedQuickPath.startsWith('/addresses');
    const isSupportPage = isEmbedded ? false : normalizedQuickPath.startsWith('/support');
    const isPrivacyPage = isEmbedded ? false : normalizedQuickPath.startsWith('/privacy');
    const isAboutPage = isEmbedded ? false : normalizedQuickPath.startsWith('/about');
    const isBottomRight = position === "bottom-right";

    return (
        <AnimatePresence>
            {cartCount > 0 && !isCheckoutPage && !isOrderDetailsPage && !isProfilePage && !isWalletPage && !isTransactionsPage && !isWishlistPage && !isAddressesPage && !isSupportPage && !isPrivacyPage && !isAboutPage && (
                <div
                    key="mini-cart-wrapper"
                    id="mini-cart-target"
                    className={cn(
                        "fixed z-[55] pointer-events-none",
                        isBottomRight
                            ? "bottom-[88px] right-4 md:bottom-6 md:right-6"
                            : "bottom-[80px] md:bottom-[calc(6rem-20px)] left-0 right-0 flex justify-center px-4",
                        className,
                    )}
                >

                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.9 }}
                        className={cn(
                            "pointer-events-auto",
                            isBottomRight ? "w-[160px]" : "w-full max-w-[170px]",
                        )}
                    >
                        <Link
                            to={resolvedLinkTo}
                            style={{
                                backgroundColor: "var(--customer-mini-cart-color, #1d7440)",
                            }}
                            className={cn(
                                "flex items-center gap-2 text-white rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:scale-[1.05] active:scale-95 transition-all group border border-white/20 relative overflow-hidden",
                                isBottomRight ? "py-1.5 px-3" : "py-1.5 px-2.5",
                            )}
                        >
                            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                                <div className="mini-cart-shimmer absolute inset-y-0 left-[-40%] w-[40%] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]" />
                            </div>

                            {/* Item Image */}
                            <div className={cn(
                                "h-8 w-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden border border-white/20",
                                isBottomRight ? "h-8 w-8" : "h-8 w-8",
                            )}>
                                {cart[0]?.image || cart[0]?.imageUrl || cart[0]?.mainImage ? (
                                    <img 
                                        src={cart[0].image || cart[0].imageUrl || cart[0].mainImage} 
                                        alt={cart[0].name} 
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <Lottie
                                        animationData={shoppingCartAnimation}
                                        loop
                                        className={cn(
                                            "pointer-events-none scale-[1.4]",
                                            isBottomRight ? "h-8 w-8" : "h-8 w-8",
                                        )}
                                    />
                                )}
                            </div>

                            {/* Text Section */}
                            <div className="flex-1 flex flex-col justify-center min-w-0">
                                <h4 className={cn(
                                    "font-black leading-tight truncate uppercase tracking-tighter",
                                    isBottomRight ? "text-[13px]" : "text-[13px]",
                                )}>View cart</h4>
                                <p className={cn(
                                    "opacity-90 font-bold leading-tight",
                                    isBottomRight ? "text-[9px]" : "text-[9px]",
                                )}>{cartCount} {cartCount === 1 ? 'item' : 'items'}</p>
                            </div>

                            {/* Arrow Icon in circle */}
                            <div className={cn(
                                "rounded-full bg-white/25 flex items-center justify-center flex-shrink-0",
                                isBottomRight ? "h-6 w-6" : "h-6 w-6",
                            )}>
                                <ChevronRight size={16} strokeWidth={3} className="text-white" />
                            </div>
                        </Link>
                    </motion.div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes mini-cart-shimmer {
                    0% { transform: translateX(-140%); }
                    100% { transform: translateX(320%); }
                }
                .mini-cart-shimmer {
                    animation: mini-cart-shimmer 2.8s ease-in-out infinite;
                }
                @keyframes gradient-move {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient {
                    animation: gradient-move 3s ease infinite;
                }
            `}} />
        </AnimatePresence>
    );
};

export default MiniCart;
