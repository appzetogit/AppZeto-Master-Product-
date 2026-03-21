import { AnimatePresence, motion } from "framer-motion";

export default function DeliveryNewOrderPopup({
  isOpen,
  isOnline,
  newOrder,
  selectedRestaurant,
  countdownSeconds,
  isMinimized,
  isDragging,
  dragY,
  newOrderPopupRef,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  acceptButtonRef,
  acceptProgress,
  acceptAnimating,
  isAccepting,
  onAcceptTouchStart,
  onAcceptTouchMove,
  onAcceptTouchEnd,
  onAcceptTouchCancel,
  onDeny,
}) {
  if (!isOpen || !(newOrder || selectedRestaurant) || !isOnline) return null;

  const data = newOrder || selectedRestaurant || {};

  const popupTranslateY = isDragging
    ? dragY
    : isMinimized
      ? (newOrderPopupRef.current?.offsetHeight || 600)
      : 0;

  const estimatedEarnings =
    (typeof data?.estimatedEarnings === "object"
      ? Number(data?.estimatedEarnings?.totalEarning || data?.estimatedEarnings?.basePayout || 0)
      : Number(data?.estimatedEarnings || 0)) || 0;

  const orderTotalAmount = Number(data?.total || data?.amount || data?.orderTotal || 0);
  const paymentMethodRaw = String(data?.paymentMethod || data?.payment?.method || data?.payment || 'cod').toLowerCase();
  const isCod = paymentMethodRaw === 'cash' || paymentMethodRaw === 'cod' || paymentMethodRaw === 'cash_on_delivery' || paymentMethodRaw === 'razorpay_qr';
  const displayPaymentMethod = paymentMethodRaw === 'razorpay_qr' ? 'Cash on Delivery (QR)' : (isCod ? 'Cash on Delivery' : 'Paid Online');

  return (
    <AnimatePresence>
      <motion.div key="new-order-root">
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-[100]"
          />
        )}

        {isMinimized && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-[115] flex justify-center pb-2"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ touchAction: "none" }}
          >
            <div className="bg-green-500 rounded-t-2xl px-6 py-3 shadow-lg cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-white/80 rounded-full" />
                <span className="text-white text-sm font-semibold">Swipe up to view order</span>
                <div className="w-8 h-1 bg-white/80 rounded-full" />
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          ref={newOrderPopupRef}
          initial={{ y: "100%" }}
          animate={{ y: popupTranslateY }}
          transition={
            isDragging
              ? { duration: 0 }
              : isMinimized
                ? { duration: 0.3, ease: "easeOut" }
                : { type: "spring", damping: 30, stiffness: 300 }
          }
          exit={{ y: "100%" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="fixed bottom-0 left-0 right-0 bg-transparent rounded-t-3xl z-[110] overflow-visible"
          style={{ touchAction: "none" }}
        >
          <div className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 bg-white/30 rounded-full" />
          </div>

          <div className="bg-green-500 rounded-t-3xl border-b border-green-600 border-opacity-30">
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/90 text-sm">New order</p>
                  <p className="text-white font-bold text-xl">{data?.restaurantName || data?.name || data?.restaurant || "Restaurant"}</p>
                </div>
                <div className="bg-white/20 rounded-xl px-3 py-2 text-white text-sm font-semibold shadow-inner">
                  {Math.max(0, Number(countdownSeconds) || 0)}s
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-t-2xl shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.1)] -mt-2">
            <div className="p-6">
              <div className="mb-6 flex flex-row items-center justify-between border-b border-gray-100 pb-5">
                <div>
                  <p className="text-gray-500 text-sm mb-1 font-medium">Estimated earnings</p>
                  <p className="text-3xl font-extrabold text-gray-900 tracking-tight">₹{estimatedEarnings.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-sm mb-1 font-medium">{displayPaymentMethod}</p>
                  <p className="text-2xl font-bold text-gray-800 tracking-tight">₹{orderTotalAmount.toFixed(2)}</p>
                </div>
              </div>

              <div className="relative w-full">
                <motion.div
                  ref={acceptButtonRef}
                  className="relative w-full bg-green-600 rounded-full overflow-hidden shadow-xl"
                  style={{ touchAction: "pan-x" }}
                  onTouchStart={onAcceptTouchStart}
                  onTouchMove={onAcceptTouchMove}
                  onTouchEnd={onAcceptTouchEnd}
                  onTouchCancel={onAcceptTouchCancel}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-green-500 rounded-full"
                    animate={{ width: `${acceptProgress * 100}%` }}
                    transition={
                      acceptAnimating ? { type: "spring", stiffness: 200, damping: 25 } : { duration: 0 }
                    }
                  />
                  <div className="relative flex items-center h-[64px] px-1">
                    <motion.div
                      className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center shrink-0 relative z-20 shadow-2xl"
                      animate={{
                        x:
                          acceptProgress *
                          (acceptButtonRef.current ? acceptButtonRef.current.offsetWidth - 56 - 32 : 240),
                      }}
                      transition={
                        acceptAnimating ? { type: "spring", stiffness: 300, damping: 30 } : { duration: 0 }
                      }
                    >
                      <span className="text-white font-bold">{">"}</span>
                    </motion.div>
                    <div className="absolute inset-0 flex items-center justify-center left-16 right-4 pointer-events-none">
                      <motion.span
                        className="text-white font-semibold text-base select-none"
                        animate={{
                          opacity: acceptProgress > 0.5 ? Math.max(0.2, 1 - acceptProgress * 0.8) : 1,
                          x: acceptProgress > 0.5 ? acceptProgress * 15 : 0,
                        }}
                        transition={
                          acceptAnimating ? { type: "spring", stiffness: 200, damping: 25 } : { duration: 0 }
                        }
                      >
                        {isAccepting ? "Accepting..." : acceptProgress > 0.5 ? "Release to Accept" : "Accept order"}
                      </motion.span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="fixed top-4 right-4 z-115"
        >
          <button
            onClick={onDeny}
            className="bg-black border-2 border-white text-white px-5 p-2 rounded-full font-semibold text-sm hover:bg-red-50 transition-colors shadow-2xl"
          >
            Deny
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

