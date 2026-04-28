import React, { memo } from "react";
import { motion } from "framer-motion";
import { HeroBannerSkeleton } from "@food/components/ui/loading-skeletons";
import OptimizedImage from "@food/components/OptimizedImage";

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
  navigate,
  backendOrigin = ""
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
        className="relative w-full h-full overflow-hidden bg-white"
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
                ) : (
                  <OptimizedImage
                    src={image}
                    alt={`Hero Banner ${index + 1}`}
                    className="h-full w-full object-cover"
                    priority={index === currentBannerIndex}
                    backendOrigin={backendOrigin}
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
