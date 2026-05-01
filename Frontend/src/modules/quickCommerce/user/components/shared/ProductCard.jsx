import React from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Plus, Minus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "@shared/components/ui/Toast";
import { useCartAnimation } from "../../context/CartAnimationContext";
import { resolveQuickImageUrl } from "../../utils/image";
import { getCloudinarySrcSet } from "@/shared/utils/cloudinaryUtils";

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
          "flex-shrink-0 w-full flex flex-col h-full cursor-pointer group relative",
          className,
        )}
        onClick={handleProductClick}>
        <div className={cn(
          "flex flex-col h-full w-full rounded-xl md:rounded-2xl overflow-hidden transition-all duration-500",
          compact
            ? "bg-white border-2 border-emerald-50/50 shadow-[0_8px_20px_-12px_rgba(0,0,0,0.08)]"
            : neutralBg
              ? "bg-white border border-slate-100 shadow-[0_12px_30px_-15px_rgba(0,0,0,0.1)]"
              : "bg-[#FAFEF0] border-2 border-emerald-50/50 shadow-[0_12px_30px_-15px_rgba(12,131,31,0.12)]",
        )}>
          {/* Top Image Section */}
          <div className={cn("relative overflow-hidden w-full aspect-square", compact ? "p-1.5 md:p-2" : "p-2.5 md:p-3.5")}>
            {/* Badge (Fluid Style) */}
            {(badge ||
              product.discount ||
              product.originalPrice > product.price) && (
              <div
                className={cn(
                  "absolute z-10 bg-[#0c831f] text-white font-black rounded-full shadow-md uppercase tracking-[0.1em] flex items-center justify-center",
                  "top-1.5 left-1.5 md:top-3 md:left-3 px-1.5 md:px-2.5 py-0.5 md:py-1",
                  "text-[7px] min-[380px]:text-[8px] md:text-[10px] lg:text-[11px]"
                )}>
                {badge ||
                  product.discount ||
                  `${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF`}
              </div>
            )}

            <button
              onClick={toggleWishlist}
              className={cn(
                "absolute z-10 bg-white/90 backdrop-blur-md rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-white transition-all active:scale-90 border border-white/50",
                "top-1.5 right-1.5 md:top-3 md:right-3 h-6 w-6 min-[380px]:h-7 min-[380px]:w-7 md:h-9 md:w-9",
              )}>
              <motion.div
                whileTap={{ scale: 0.8 }}
                animate={isWishlisted ? { scale: [1, 1.2, 1] } : {}}>
                <Heart
                  size={window.innerWidth < 768 ? 12 : 16}
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
                "w-full h-full overflow-hidden flex items-center justify-center p-2 min-[380px]:p-3 md:p-4 transition-transform duration-700 group-hover:scale-110",
                  compact || neutralBg
                  ? "rounded-xl bg-slate-50/50"
                  : "rounded-xl bg-white/60",
              )}>
              <img
                ref={imageRef}
                src={
                  resolveQuickImageUrl(product.image || product.mainImage) ||
                  product.image ||
                  product.mainImage
                }
                alt={product.name}
                className="w-full h-full object-contain mix-blend-multiply transition-opacity duration-300"
                loading="lazy"
              />
            </div>
          </div>
          <div
            className={cn(
              "w-full h-full overflow-hidden flex items-center justify-center p-2 min-[380px]:p-3 md:p-4 transition-transform duration-700 group-hover:scale-110",
                compact || neutralBg
                ? "rounded-xl bg-slate-50/50"
                : "rounded-xl bg-white/60",
            )}>
            <img
              ref={imageRef}
              src={
                resolveQuickImageUrl(product.image || product.mainImage) ||
                product.image ||
                product.mainImage
              }
              srcSet={getCloudinarySrcSet(product.image || product.mainImage)}
              sizes="(max-width: 768px) 150px, (max-width: 1024px) 200px, 250px"
              alt={product.name}
              className="w-full h-full object-contain mix-blend-multiply transition-opacity duration-300"
              loading="lazy"
            />
          </div>
        </div>

          {/* Info Section */}
          <div
            className={cn(
              "flex flex-col flex-1",
              "p-2 min-[380px]:p-2.5 md:p-3.5 pt-1 md:pt-1 gap-1",
            )}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <div
                className={cn(
                  "border-[1.5px] border-emerald-500 rounded-full flex items-center justify-center",
                  "h-2.5 w-2.5 md:h-3.5 md:w-3.5",
                )}>
                <div
                  className={cn(
                    "bg-emerald-500 rounded-full",
                    "h-1 w-1 md:h-1.5 md:w-1.5",
                  )}
                />
              </div>
              <div
                className={cn(
                  "bg-slate-100 text-slate-600 font-black rounded-md px-1.5 py-0.5 uppercase tracking-widest leading-none",
                  "text-[7px] min-[380px]:text-[8px] md:text-[9px]",
                )}>
                {product.weight || "1 unit"}
              </div>
            </div>

            <div className="flex items-start">
              <h4
                className={cn(
                  "font-bold text-[#1A1A1A] leading-[1.2] line-clamp-2 font-outfit uppercase tracking-tight w-full",
                  "text-[9px] min-[380px]:text-[10px] md:text-[13px] lg:text-[14px]",
                )}>
                {product.name}
              </h4>
            </div>

            {/* Delivery & Store Row */}
            <div className="flex flex-col gap-0.5 opacity-80">
              <div className="flex items-center gap-1 text-slate-400 leading-none">
                <Clock className="text-emerald-500 w-2 h-2 md:w-3 md:h-3" />
                <span className="font-black text-[7px] min-[380px]:text-[8px] md:text-[9px] uppercase tracking-wider">
                  {product.deliveryTime || "8-12 mins"}
                </span>
              </div>
              <div className="flex items-center leading-none">
                <span className="font-bold text-[7px] min-[380px]:text-[8px] md:text-[9px] text-slate-400 uppercase tracking-widest truncate">
                    {product.storeName || "Premium Mart"}
                </span>
              </div>
            </div>

            {/* Pricing & CTA */}
            <div className="mt-auto pt-2 flex flex-wrap items-center justify-between gap-1 border-t border-slate-50/50">
              <div className="flex flex-col justify-center min-w-0">
                <span
                  className={cn(
                    "font-black text-[#1A1A1A] leading-tight",
                    "text-xs min-[380px]:text-sm md:text-base lg:text-lg",
                  )}>
                  ₹{product.price}
                </span>
                {product.originalPrice > product.price && (
                  <span className="font-bold text-slate-300 line-through text-[8px] min-[380px]:text-[9px] md:text-[11px] leading-none">
                    ₹{product.originalPrice}
                  </span>
                )}
              </div>

              <div className="flex items-center flex-shrink-0">
                {quantity > 0 ? (
                  <div
                    className={cn(
                      "flex items-center bg-white border-[1.5px] md:border-2 border-[#0c831f] rounded-lg md:rounded-xl shadow-sm justify-between overflow-hidden",
                      "w-[54px] min-[380px]:w-[65px] md:w-[84px] h-7 min-[380px]:h-8 md:h-9",
                    )}>
                    <button
                      onClick={handleDecrement}
                      className="flex-1 flex justify-center items-center text-[#0c831f] hover:bg-emerald-50 active:scale-90 transition-all h-full">
                      <Minus className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" strokeWidth={4} />
                    </button>
                    <span className="font-black text-[#111] text-[9px] min-[380px]:text-xs md:text-sm px-0.5">
                      {quantity}
                    </span>
                    <button
                      onClick={handleIncrement}
                      className="flex-1 flex justify-center items-center text-[#0c831f] hover:bg-emerald-50 active:scale-90 transition-all h-full">
                      <Plus className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" strokeWidth={4} />
                    </button>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: "#0c831f", color: "#fff" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddToCart}
                    className={cn(
                      "bg-white border-[1.5px] md:border-2 border-[#0c831f] text-[#0c831f] rounded-lg md:rounded-xl font-black shadow-sm transition-all uppercase tracking-widest leading-none",
                      "w-[54px] min-[380px]:w-[65px] md:w-[84px] h-7 min-[380px]:h-8 md:h-9",
                      "text-[8px] min-[380px]:text-[9px] md:text-[11px]",
                    )}>
                    ADD
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
);

export default ProductCard;
