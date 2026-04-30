import React, { memo } from "react";
import { motion } from "framer-motion";
import { HeroBannerSkeleton } from "@food/components/ui/loading-skeletons";

const BannerSection = memo(({
  showBannerSkeleton,
  heroBannerImages,
  heroBannersData,
  currentBannerIndex,
  setCurrentBannerIndex,
  heroShellRef,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  navigate
}) => {
  if (showBannerSkeleton) {
    return (
      <div className="h-full w-full">
        <HeroBannerSkeleton className="h-full w-full" />
      </div>
    );
  }

  if (!heroBannerImages || heroBannerImages.length === 0) return null;

  return (
    <div className="h-full w-full">
      <div
        ref={heroShellRef}
        data-home-hero-shell="true"
        className="relative w-full h-full overflow-hidden bg-transparent"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
            <motion.div 
              animate={{ 
                x: ['-200%', '200%'],
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity, 
                repeatDelay: 5,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] w-[150%] h-full"
            />
          </div>
          {heroBannerImages.map((image, index) => {
            const bannerData = heroBannersData[index];
            const isVideo = bannerData?.type === 'video' || (typeof image === 'string' && image.toLowerCase().endsWith('.mp4'));

            return (
              <div
                key={`${index}-${image}`}
                className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                style={{
                  opacity: currentBannerIndex === index ? 1 : 0,
                  zIndex: currentBannerIndex === index ? 2 : 1,
                  pointerEvents: "none",
                }}>
                {isVideo ? (
                  <video
                    src={image}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                    style={{ filter: "brightness(0.95)" }}
                  />
                ) : bannerData?.isFallback ? (
                  <div className="relative h-full w-full rounded-[24px] overflow-hidden flex items-center bg-gradient-to-br from-indigo-900/40 via-[#1e1b4b]/60 to-black/50 shadow-2xl border border-white/10 backdrop-blur-sm">
                    <img src={image} className="absolute right-0 top-0 h-full w-3/5 object-cover opacity-60 mix-blend-overlay [mask-image:linear-gradient(to_right,transparent,black_40%)]" alt="Banner background" />
                    <div className="relative z-10 px-5 sm:px-8 flex flex-col justify-center h-full text-white w-full">
                      <motion.span 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: currentBannerIndex === index ? 1 : 0, y: currentBannerIndex === index ? 0 : 15 }}
                        transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                        className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#F6881F] mb-1.5"
                      >
                        {bannerData.title}
                      </motion.span>
                      <motion.h3 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: currentBannerIndex === index ? 1 : 0, x: currentBannerIndex === index ? 0 : -30 }}
                        transition={{ delay: 0.2, duration: 0.6, type: "spring", bounce: 0.4 }}
                        className="text-[22px] sm:text-3xl font-black leading-[1.1] mb-3 sm:mb-4 max-w-[65%] drop-shadow-lg"
                      >
                        {bannerData.subtitle}
                      </motion.h3>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: currentBannerIndex === index ? 1 : 0, scale: currentBannerIndex === index ? 1 : 0.8 }}
                        transition={{ delay: 0.4, duration: 0.4, type: "spring" }}
                        className="w-fit"
                      >
                        <button className="bg-gradient-to-r from-[#F6881F] to-[#FF5E3A] hover:opacity-90 transition-opacity text-white text-[11px] sm:text-sm font-bold px-5 sm:px-6 py-2 sm:py-2.5 rounded-full shadow-[0_4px_14px_rgba(246,136,31,0.4)]">
                          {bannerData.action}
                        </button>
                      </motion.div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={image}
                    alt={`Hero Banner ${index + 1}`}
                    className="h-full w-full object-cover rounded-[24px]"
                    loading={index === currentBannerIndex ? "eager" : "lazy"}
                    draggable={false}
                  />
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="absolute inset-0 z-20 h-full w-full border-0 p-0 bg-transparent text-left"
          onClick={() => {
            const bannerData = heroBannersData[currentBannerIndex];
            const linkedRestaurants = bannerData?.linkedRestaurants || [];
            if (linkedRestaurants.length > 0) {
              const firstRestaurant = linkedRestaurants[0];
              const restaurantSlug = firstRestaurant.slug || firstRestaurant.restaurantId || firstRestaurant._id;
              navigate(`/restaurants/${restaurantSlug}`);
            }
          }}
          aria-label={`Open hero banner ${currentBannerIndex + 1}`}
        />

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2.5 py-1.5 bg-black/20 backdrop-blur-md rounded-full border border-white/10 shadow-[0_8px_20px_-14px_rgba(15,23,42,0.8)] z-30">
          {heroBannerImages.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentBannerIndex(index);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentBannerIndex === index ? "bg-white w-5" : "bg-white/40 w-1.5"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default BannerSection;
