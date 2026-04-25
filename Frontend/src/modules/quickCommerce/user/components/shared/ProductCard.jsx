import React from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Plus, Minus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "@shared/components/ui/Toast";
import { useCartAnimation } from "../../context/CartAnimationContext";
import { resolveQuickImageUrl } from "../../utils/image";

import { motion, AnimatePresence } from "framer-motion";

import { getQuickProductPath } from "../../utils/routes";

const ProductCard = React.memo(
  ({ product, badge, className, compact = false, neutralBg = false }) => {
    const navigate = useNavigate();
    const { toggleWishlist: toggleWishlistGlobal, isInWishlist } =
      useWishlist();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const { showToast } = useToast();
    const { animateAddToCart, animateRemoveFromCart } = useCartAnimation();

    const [showHeartPopup, setShowHeartPopup] = React.useState(false);

    const imageRef = React.useRef(null);

    const getComparableProductId = React.useCallback(
      (value) => String(value ?? "").split("::")[0],
      [],
    );

    const cartItem = React.useMemo(
      () =>
        cart.find(
          (item) =>
            getComparableProductId(item.productId || item.itemId || item.id || item._id) ===
            getComparableProductId(product.id || product._id),
        ),
      [cart, getComparableProductId, product.id, product._id],
    );
    const quantity = cartItem ? cartItem.quantity : 0;
    const isWishlisted = isInWishlist(product.id || product._id);

    const handleProductClick = React.useCallback(
      () => {
        const productId = product.id || product._id;
        if (!productId) return;
        navigate(getQuickProductPath(productId), { state: { product } });
      },
      [navigate, product],
    );

    const toggleWishlist = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isWishlisted) {
          setShowHeartPopup(true);
          setTimeout(() => setShowHeartPopup(false), 1000);
        }

        toggleWishlistGlobal(product);
        showToast(
          isWishlisted
            ? `${product.name} removed from wishlist`
            : `${product.name} added to wishlist`,
          isWishlisted ? "info" : "success",
        );
      },
      [isWishlisted, toggleWishlistGlobal, product, showToast],
    );

    const handleAddToCart = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (imageRef.current) {
          animateAddToCart(
            imageRef.current.getBoundingClientRect(),
            product.image,
          );
        }
        addToCart(product);
      },
      [animateAddToCart, product, addToCart],
    );

    const handleIncrement = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        updateQuantity(product.id || product._id, 1);
      },
      [updateQuantity, product.id, product._id],
    );

    const handleDecrement = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (quantity === 1) {
          animateRemoveFromCart(product.image);
          removeFromCart(product.id || product._id);
        } else {
          updateQuantity(product.id || product._id, -1);
        }
      },
      [
        quantity,
        animateRemoveFromCart,
        product.image,
        removeFromCart,
        product.id,
        product._id,
        updateQuantity,
      ],
    );

    return (
      <motion.div
        whileHover={{ y: -8, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "flex-shrink-0 w-full rounded-xl md:rounded-2xl overflow-hidden flex flex-col h-full cursor-pointer transition-all duration-500 group",
          compact
            ? "bg-white border-2 border-emerald-50/50 shadow-[0_8px_20px_-12px_rgba(0,0,0,0.08)]"
            : neutralBg
              ? "bg-white border border-slate-100 shadow-[0_12px_30px_-15px_rgba(0,0,0,0.1)]"
              : "bg-[#FAFEF0] border-2 border-emerald-50/50 shadow-[0_12px_30px_-15px_rgba(12,131,31,0.12)]",
          className,
        )}
        onClick={handleProductClick}>
        {/* Top Image Section */}
        <div className={cn("relative overflow-hidden", compact ? "p-1.5 md:p-2" : "p-2.5 md:p-3.5")}>
          {/* Badge (Luxury Style) */}
          {(badge ||
            product.discount ||
            product.originalPrice > product.price) && (
            <div
              className={cn(
                "absolute z-10 bg-[#0c831f] text-white font-black rounded-full shadow-lg uppercase tracking-[0.15em] flex items-center justify-center",
                compact
                  ? "top-2 left-2 md:top-3 md:left-3 px-1.5 py-0.5 text-[8px] md:text-[10px]"
                  : "top-3 left-3 md:top-4 md:left-4 px-2.5 py-1 text-[9px] md:text-[11px]",
              )}>
              {badge ||
                product.discount ||
                `${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF`}
            </div>
          )}

          <button
            onClick={toggleWishlist}
            className={cn(
              "absolute z-10 bg-white/80 backdrop-blur-md rounded-full shadow-xl flex items-center justify-center cursor-pointer hover:bg-white transition-all active:scale-90 border border-white/50",
              compact ? "top-2 right-2 md:top-3 md:right-3 h-7 w-7 md:h-8 md:w-8" : "top-3 right-3 md:top-4 md:right-4 h-9 w-9 md:h-10 md:w-10",
            )}>
            <motion.div
              whileTap={{ scale: 0.8 }}
              animate={isWishlisted ? { scale: [1, 1.2, 1] } : {}}>
              <Heart
                size={compact ? 12 : 16}
                className={cn(
                  isWishlisted
                    ? "text-red-500 fill-current"
                    : "text-slate-300 group-hover:text-slate-400",
                )}
              />
            </motion.div>
          </button>

          <AnimatePresence>
            {showHeartPopup && (
              <motion.div
                initial={{ scale: 0.5, opacity: 1, y: 0 }}
                animate={{ scale: 2.5, opacity: 0, y: -60 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute top-4 right-4 z-50 pointer-events-none text-red-500/40">
                <Heart size={32} fill="currentColor" />
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className={cn(
              "block aspect-square w-full overflow-hidden flex items-center justify-center p-4 transition-transform duration-700 group-hover:scale-110",
                compact || neutralBg
                ? "rounded-xl md:rounded-2xl bg-slate-50/50"
                : "rounded-xl md:rounded-2xl bg-white/60",
            )}>
            <img
              ref={imageRef}
              src={
                resolveQuickImageUrl(product.image || product.mainImage) ||
                product.image ||
                product.mainImage
              }
              alt={product.name}
              className="w-full h-full object-contain mix-blend-multiply drop-shadow-xl"
            />
          </div>
        </div>

        {/* Info Section */}
        <div
          className={cn(
            "flex flex-col flex-1",
            compact ? "p-2 md:p-2.5 pt-0 gap-0.5" : "p-3 md:p-3.5 pt-0.5 md:pt-1 gap-1",
          )}>
          <div className="flex items-center gap-2 mb-1">
            <div
              className={cn(
                "border-2 border-emerald-500 rounded-full flex items-center justify-center",
                compact ? "h-3 w-3" : "h-4 w-4",
              )}>
              <div
                className={cn(
                  "bg-emerald-500 rounded-full",
                  compact ? "h-1 w-1" : "h-1.5 w-1.5",
                )}
              />
            </div>
            <div
              className={cn(
                "bg-slate-100 text-slate-600 font-black rounded-lg px-2 py-0.5 uppercase tracking-widest",
                compact ? "text-[8px] md:text-[9px]" : "text-[9px] md:text-[10px]",
              )}>
              {product.weight || "1 unit"}
            </div>
          </div>

          <div className={cn(
            compact ? "min-h-[22px] md:min-h-[24px]" : "min-h-[28px] md:min-h-[32px]",
            "flex items-center"
          )}>
            <h4
              className={cn(
                "font-bold text-[#1A1A1A] leading-[1.1] line-clamp-2 font-outfit uppercase tracking-tight",
                compact ? "text-[10px] md:text-[11px]" : "text-[13px] md:text-[14px]",
              )}>
              {product.name}
            </h4>
          </div>

          {/* Delivery & Store Row */}
          <div className="flex flex-col gap-0.5 mt-0.5">
            <div className="flex items-center gap-1 text-slate-400 leading-none">
              <Clock size={10} className="text-emerald-500" />
              <span className="font-black text-[9px] uppercase tracking-wider">
                {product.deliveryTime || "8-12 mins"}
              </span>
            </div>
            <div className="flex items-center leading-none">
               <span className="font-bold text-[8px] text-slate-400 uppercase tracking-widest">
                  {product.storeName || "Premium Mart"}
               </span>
            </div>
          </div>

          {/* Pricing & CTA */}
          <div className="mt-auto pt-2 flex items-center justify-between gap-1.5 border-t border-slate-50">
            <div className="flex flex-col">
              <span
                className={cn(
                  "font-black text-[#1A1A1A]",
                  compact ? "text-sm md:text-base" : "text-base md:text-lg",
                )}>
                ₹{product.price}
              </span>
              {product.originalPrice > product.price && (
                <span className="font-bold text-slate-300 line-through text-[10px] leading-none">
                  ₹{product.originalPrice}
                </span>
              )}
            </div>

            <div className="flex">
              {quantity > 0 ? (
                <div
                  className={cn(
                    "flex items-center bg-white border-2 border-[#0c831f] rounded-2xl shadow-lg ring-4 ring-emerald-50/50 justify-between",
                    compact ? "min-w-[70px] md:min-w-[80px] h-7 md:h-8" : "min-w-[90px] md:min-w-[100px] h-9 md:h-10",
                  )}>
                  <button
                    onClick={handleDecrement}
                    className="flex-1 flex justify-center text-[#0c831f] active:scale-75 transition-transform">
                    <Minus className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={4} />
                  </button>
                  <span className="font-black text-[#111] text-sm px-1">
                    {quantity}
                  </span>
                  <button
                    onClick={handleIncrement}
                    className="flex-1 flex justify-center text-[#0c831f] active:scale-75 transition-transform">
                    <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={4} />
                  </button>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: "#0c831f", color: "#fff" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddToCart}
                  className={cn(
                    "bg-white border-2 border-[#0c831f] text-[#0c831f] rounded-2xl font-black shadow-lg transition-all uppercase tracking-widest leading-none active:ring-4 active:ring-emerald-50",
                    compact
                      ? "px-3 md:px-4 h-7 md:h-8 text-[9px] md:text-[10px]"
                      : "px-5 md:px-7 h-9 md:h-10 text-[11px] md:text-[12px]",
                  )}>
                  ADD
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
);

export default ProductCard;
