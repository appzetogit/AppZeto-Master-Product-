import { motion } from "framer-motion"
import { ChevronUp } from "lucide-react"

export default function DeliverySwipeUpBar({
  isVisible,
  swipeBarRef,
  isDraggingSwipeBar,
  swipeBarPosition,
  handleSwipeBarTouchStart,
  handleSwipeBarTouchMove,
  handleSwipeBarTouchEnd,
  handleSwipeBarMouseDown,
  handleChevronUpClick,
  newOrder,
  selectedRestaurant,
  mapViewMode,
}) {
  if (!isVisible) return null

  return (
    <motion.div
      ref={swipeBarRef}
      initial={{ y: "100%" }}
      animate={{
        y: isDraggingSwipeBar ? `${-swipeBarPosition * (window.innerHeight * 0.8)}px` : 0,
      }}
      transition={isDraggingSwipeBar ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 300 }}
      onTouchStart={handleSwipeBarTouchStart}
      onTouchMove={handleSwipeBarTouchMove}
      onTouchEnd={handleSwipeBarTouchEnd}
      onMouseDown={handleSwipeBarMouseDown}
      className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-20"
      style={{ touchAction: "pan-y", pointerEvents: "auto" }}
    >
      <div className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing" style={{ touchAction: "none" }}>
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-2 shadow-sm" />

        <motion.div
          className="flex flex-col items-center gap-1"
          animate={{ y: isDraggingSwipeBar ? swipeBarPosition * 5 : 0, opacity: isDraggingSwipeBar ? 0.7 : 1 }}
          transition={{ duration: 0.1 }}
        >
          <button
            onClick={handleChevronUpClick}
            className="flex items-center justify-center p-3 -m-3 rounded-full hover:bg-gray-100/50 active:bg-gray-200/50 transition-colors group"
            aria-label="Slide up"
          >
            <ChevronUp className="!w-14 !h-10 scale-x-150 text-gray-500 group-hover:text-blue-600 font-bold transition-colors" strokeWidth={4} />
          </button>
        </motion.div>
      </div>

      <div className="px-4 pb-6">
        {newOrder || selectedRestaurant ? (
          <div className="flex flex-col items-center py-1">
            <p className="text-sm font-bold text-blue-600 animate-pulse">Order in progress • Swipe up to view details</p>
          </div>
        ) : mapViewMode === "hotspot" ? (
          <div className="flex flex-col items-center" />
        ) : (
          <div className="flex flex-col items-center" />
        )}
      </div>
    </motion.div>
  )
}
