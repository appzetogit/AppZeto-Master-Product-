import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from "framer-motion";
import { Star, Clock, IndianRupee, Heart } from "lucide-react";
import OptimizedImage from "@food/components/OptimizedImage";

const WEBVIEW_SESSION_CACHE_BUSTER = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const RestaurantImageCarousel = React.memo(({ restaurant, priority = false, backendOrigin = "" }) => {
  const webviewSessionKeyRef = useRef(WEBVIEW_SESSION_CACHE_BUSTER);
  const imageElementRef = useRef(null);

  const withCacheBuster = useCallback((url) => {
    if (typeof url !== "string" || !url) return "";
    if (/^data:/i.test(url) || /^blob:/i.test(url)) return url;

    const isRelative = !/^(https?:|\/\/|data:|blob:)/i.test(url.trim());
    const resolvedUrl = (backendOrigin && isRelative)
      ? `${backendOrigin.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`
      : url;

    const hasSignedParams =
      /[?&](X-Amz-|Signature=|Expires=|AWSAccessKeyId=|GoogleAccessId=|token=|sig=|se=|sp=|sv=)/i.test(resolvedUrl);
    if (hasSignedParams) return resolvedUrl;

    try {
      const parsed = new URL(resolvedUrl, window.location.origin);
      const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
      const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
      const isSameHost = currentHost && parsed.hostname === currentHost;

      if (isLocalHost || isSameHost) {
        parsed.searchParams.set("_wv", webviewSessionKeyRef.current);
      }
      return parsed.toString();
    } catch {
      return resolvedUrl;
    }
  }, [backendOrigin]);

  const images = React.useMemo(() => {
    const sourceImages = Array.isArray(restaurant.images) && restaurant.images.length > 0
      ? restaurant.images
      : [restaurant.image];

    const validImages = sourceImages
      .filter((img) => typeof img === "string")
      .map((img) => img.trim())
      .filter(Boolean);

    return validImages.map((img) => withCacheBuster(img));
  }, [restaurant.images, restaurant.image, withCacheBuster]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedBySrc, setLoadedBySrc] = useState({});
  const [, setAttemptedSrcs] = useState({});
  const [showShimmer, setShowShimmer] = useState(true);
  const [lastGoodSrc, setLastGoodSrc] = useState("");
  const touchStartX = useRef(0);
  const isSwiping = useRef(false);

  const safeIndex = images.length > 0 ? (currentIndex % images.length + images.length) % images.length : 0;
  const renderSrc = images[safeIndex] || lastGoodSrc;

  useEffect(() => {
    setCurrentIndex(0);
    setLoadedBySrc({});
    setAttemptedSrcs({});
    setShowShimmer(images.length > 0);
  }, [restaurant?.id, restaurant?.slug, restaurant?.updatedAt, images]);

  useEffect(() => {
    setLastGoodSrc("");
  }, [restaurant?.id, restaurant?.slug]);

  useEffect(() => {
    if (!renderSrc) return;
    const imgEl = imageElementRef.current;
    if (!imgEl) return;

    setShowShimmer(true);
    const shimmerTimeout = setTimeout(() => {
      setShowShimmer(false);
    }, 2500);

    if (imgEl.complete) {
      if (imgEl.naturalWidth > 0) {
        setLoadedBySrc((prev) => (prev[renderSrc] ? prev : { ...prev, [renderSrc]: true }));
        setLastGoodSrc(renderSrc);
        setShowShimmer(false);
      } else {
        setAttemptedSrcs((prev) => ({ ...prev, [renderSrc]: true }));
      }
    }
    return () => clearTimeout(shimmerTimeout);
  }, [renderSrc]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = false;
  };

  const handleTouchMove = (e) => {
    const currentX = e.touches[0].clientX;
    const diff = touchStartX.current - currentX;
    if (Math.abs(diff) > 10) {
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = (e) => {
    if (!isSwiping.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const minSwipeDistance = 50;
    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    }
  };

  return (
    <div 
      className="relative w-full h-[180px] sm:h-[190px] overflow-hidden bg-gray-100 dark:bg-gray-800"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <OptimizedImage
        ref={imageElementRef}
        src={renderSrc}
        alt={restaurant.name}
        priority={priority}
        className={`w-full h-full object-cover transform scale-100 group-hover:scale-110 transition-transform duration-700 ${
          loadedBySrc[renderSrc] ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => {
          setLoadedBySrc((prev) => ({ ...prev, [renderSrc]: true }));
          setLastGoodSrc(renderSrc);
          setShowShimmer(false);
        }}
      />
      
      {showShimmer && !loadedBySrc[renderSrc] && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer" />
      )}

      {/* Navigation Indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 px-2 pointer-events-none">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === safeIndex ? 'w-4 bg-white shadow-sm' : 'w-1 bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
      
      {/* Discount Badge if any */}
      {restaurant.discount && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-sm shadow-sm uppercase tracking-tight">
          {restaurant.discount}
        </div>
      )}
    </div>
  );
});

const RestaurantCard = ({ 
  restaurant, 
  isFavorite, 
  onFavoriteClick, 
  onClick, 
  backendOrigin 
}) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white dark:bg-[#111111] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-800 group relative cursor-pointer"
    >
      <div className="relative">
        <RestaurantImageCarousel restaurant={restaurant} backendOrigin={backendOrigin} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteClick(restaurant.id);
          }}
          className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-full shadow-md hover:bg-white transition-colors duration-200"
        >
          <Heart
            className={`w-4 h-4 transition-colors duration-300 ${
              isFavorite ? "fill-red-500 text-red-500" : "text-gray-600 dark:text-gray-300"
            }`}
          />
        </button>
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-primary-orange transition-colors duration-300 flex-1">
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-1 bg-green-600 text-white px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium shadow-sm flex-shrink-0">
            <span>{restaurant.rating}</span>
            <Star className="w-2.5 h-2.5 fill-current" />
          </div>
        </div>

        <p className="text-[10px] sm:text-xs text-muted-foreground dark:text-gray-400 mb-2 line-clamp-1 italic">
          {restaurant.cuisine}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <Clock className="w-3.5 h-3.5 text-primary-orange" />
            <span className="text-[10px] sm:text-[11px] font-normal">{restaurant.deliveryTime || "25-35 min"}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-700 dark:text-gray-200">
            <IndianRupee className="w-3 h-3 text-primary-orange" />
            <span className="text-[10px] sm:text-[11px] font-medium">{restaurant.avgPrice || "200 for two"}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(RestaurantCard);
