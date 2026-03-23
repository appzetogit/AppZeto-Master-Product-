import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"

export default function DeliveryDirectionsOverlay({
  isOpen,
  selectedRestaurant,
  directionsMapContainerRef,
  onClose,
  directionsMapLoading,
}) {
  return (
    <AnimatePresence>
      {isOpen && selectedRestaurant && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-[120] bg-white"
        >
          <div
            ref={directionsMapContainerRef}
            key="directions-map-container"
            style={{ height: "100%", width: "100%", zIndex: 1 }}
          />

          <div className="absolute top-6 left-6 z-[1000] pointer-events-auto">
            <button
              onClick={onClose}
              className="w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center border border-gray-100 active:scale-95 transition-transform"
            >
              <ChevronDown className="w-6 h-6 text-slate-800" />
            </button>
          </div>

          {directionsMapLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
              <div className="text-gray-600">Loading map...</div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
