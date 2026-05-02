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
        whileHover={{ y: -6, transition: { type: "spring", stiffness: 400, damping: 20 } }}
        className={cn(
          "flex-shrink-0 w-full flex flex-col h-full cursor-pointer group",
          className,
        )}
        onClick={handleProductClick}>
        <div className={cn(
          "flex flex-col h-full w-full rounded-2xl overflow-hidden transition-all duration-500",
          "bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]",
          "hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)] hover:border-emerald-100/50",
          !neutralBg && !compact && "bg-gradient-to-b from-white to-slate-50/30"
        )}>
          {/* Top Image Section */}
          <div className="relative overflow-hidden w-full aspect-square p-2 md:p-3">
            {/* Badge (Professional Tag) */}
            {(badge || product.discount || product.originalPrice > product.price) && (
              <div className="absolute top-2 left-2 z-10">
                <div className="bg-[#0c831f] text-white text-[9px] md:text-[11px] font-black px-2 py-0.5 md:py-1 rounded-md shadow-lg shadow-emerald-900/20 uppercase tracking-wider flex items-center gap-1">
                  {badge || product.discount || (product.originalPrice > product.price && product.originalPrice > 0
                    ? `${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF`
                    : null)}
                </div>
              </div>
            )}

            <button
              onClick={toggleWishlist}
              className="absolute top-2 right-2 z-10 w-8 h-8 md:w-10 md:h-10 bg-white/80 backdrop-blur-md rounded-full shadow-sm flex items-center justify-center cursor-pointer hover:bg-white hover:shadow-md transition-all active:scale-90 border border-slate-100/50">
              <motion.div
                whileTap={{ scale: 0.8 }}
                animate={isWishlisted ? { scale: [1, 1.3, 1] } : {}}>
                <Heart
                  size={window.innerWidth < 768 ? 14 : 18}
                  className={cn(
                    isWishlisted ? "text-red-500 fill-current" : "text-slate-300 group-hover:text-slate-400",
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
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none text-red-500/30">
                  <Heart size={48} fill="currentColor" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full h-full rounded-xl overflow-hidden bg-slate-50/50 flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
              <img
                ref={imageRef}
                src={resolveQuickImageUrl(product.image || product.mainImage) || product.image || product.mainImage}
                alt={product.name}
                className="w-full h-full object-contain mix-blend-multiply p-2 md:p-4"
                loading="lazy"
              />
            </div>
          </div>
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

          {/* Content Section */ }
    <div className="flex flex-col flex-1 px-3 py-2 md:px-4 md:py-3 space-y-2 md:space-y-3 bg-white">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{product.deliveryTime || "10 MINS"}</span>
        </div>
        <h3 className="text-[12px] md:text-[14px] font-bold text-slate-900 line-clamp-2 leading-tight min-h-[32px] md:min-h-[40px]">
          {product.name}
        </h3>
        <p className="text-[10px] md:text-[12px] text-slate-500 font-medium">
          {product.weight || "1 unit"}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
        <div className="flex flex-col">
          <span className="text-[14px] md:text-[16px] font-black text-slate-900">
            ₹{Number(product.price || 0).toLocaleString()}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-[10px] md:text-[11px] text-slate-400 line-through font-medium">
              ₹{Number(product.originalPrice || 0).toLocaleString()}
            </span>
          )}
        </div>

        {quantity > 0 ? (
          <div className="flex items-center bg-[#0c831f] text-white rounded-lg md:rounded-xl shadow-lg shadow-emerald-900/10 h-8 md:h-10 overflow-hidden ring-1 ring-[#0c831f]/20">
            <button
              onClick={handleDecrement}
              className="w-8 md:w-10 h-full hover:bg-black/10 transition-colors flex items-center justify-center border-r border-white/10">
              <Minus size={14} strokeWidth={3} />
            </button>
            <span className="text-[12px] md:text-[14px] font-black min-w-[20px] md:min-w-[24px] text-center px-1">
              {quantity}
            </span>
            <button
              onClick={handleIncrement}
              className="w-8 md:w-10 h-full hover:bg-black/10 transition-colors flex items-center justify-center border-l border-white/10">
              <Plus size={14} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            className={cn(
              "w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-gradient-to-br from-white to-slate-50 border-2 border-[#0c831f] text-[#0c831f] rounded-lg md:rounded-xl shadow-sm transition-all duration-300 active:scale-95",
              "hover:from-[#0c831f] hover:to-[#0a7019] hover:text-white hover:border-[#0c831f]"
            )}>
            <Plus size={18} strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
        </div >
      </motion.div >
    );
  },
);

export default ProductCard;
