import { motion } from "framer-motion";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import BottomPopup from "@food/components/delivery/BottomPopup";

export default function DeliveryReachedDropPopup({
  isOpen,
  onClose,
  selectedRestaurant,
  dialPhoneNumber,
  getCustomerDestination,
  openGoogleMapsNavigation,
  reachedDropButtonRef,
  reachedDropButtonProgress,
  reachedDropIsAnimatingToComplete,
  handleReachedDropTouchStart,
  handleReachedDropTouchMove,
  handleReachedDropTouchEnd,
  handleReachedDropTouchCancel,
}) {
  const paymentMethodRaw = String(selectedRestaurant?.paymentMethod || selectedRestaurant?.payment?.method || selectedRestaurant?.payment || 'cod').toLowerCase();
  const isCod = paymentMethodRaw === 'cash' || paymentMethodRaw === 'cod' || paymentMethodRaw === 'cash_on_delivery' || paymentMethodRaw === 'razorpay_qr';
  const displayPaymentMethod = paymentMethodRaw === 'razorpay_qr' ? 'Cash on Delivery (QR)' : (isCod ? 'Cash on Delivery' : 'Paid Online');
  
  const estimatedEarnings = Number(selectedRestaurant?.estimatedEarnings || selectedRestaurant?.amount || 0);
  const orderTotalAmount = Number(selectedRestaurant?.total || selectedRestaurant?.orderTotal || selectedRestaurant?.pricing?.total || 0);

  return (
    <BottomPopup
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      closeOnBackdropClick={false}
      disableSwipeToClose={true}
      maxHeight="70vh"
      showHandle={false}
      showBackdrop={false}
      backdropBlocksInteraction={false}
    >
      <div className="">
        <div className="mb-4">
          <span className="bg-teal-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg">Drop</span>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {selectedRestaurant?.customerName || "Customer Name"}
          </h2>
          <p className="text-gray-600 mb-2 leading-relaxed">
            {selectedRestaurant?.customerAddress || "Customer Address"}
          </p>
          <p className="text-gray-500 text-sm font-medium mb-4">
            Order ID: {selectedRestaurant?.orderId || "ORD1234567890"}
          </p>
          
          <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between border border-gray-100">
             <div>
                <p className="text-xs text-gray-500 mb-0.5">Estimated Earnings</p>
                <p className="text-lg font-bold text-green-700">₹{estimatedEarnings.toFixed(2)}</p>
             </div>
             <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">{displayPaymentMethod}</p>
                <p className="text-lg font-bold text-gray-900">₹{orderTotalAmount.toFixed(2)}</p>
             </div>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => {
              const phone = selectedRestaurant?.customerPhone || selectedRestaurant?.userId?.phone || null;
              dialPhoneNumber(phone, "Customer phone number not available");
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Phone className="w-5 h-5 text-gray-700" />
            <span className="text-gray-700 font-medium">Call</span>
          </button>
          <button
            onClick={() => {
              const customerDestination = getCustomerDestination(selectedRestaurant);
              openGoogleMapsNavigation(customerDestination, {
                label: "customer",
                fallbackAddress: selectedRestaurant?.customerAddress || "",
              });
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <MapPin className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Map</span>
          </button>
        </div>

        <div className="relative w-full">
          <motion.div
            ref={reachedDropButtonRef}
            className="relative w-full bg-green-600 rounded-full overflow-hidden shadow-xl"
            style={{ touchAction: "pan-x" }}
            onTouchStart={handleReachedDropTouchStart}
            onTouchMove={handleReachedDropTouchMove}
            onTouchEnd={handleReachedDropTouchEnd}
            onTouchCancel={handleReachedDropTouchCancel}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className="absolute inset-0 bg-green-500 rounded-full"
              animate={{ width: `${reachedDropButtonProgress * 100}%` }}
              transition={
                reachedDropIsAnimatingToComplete
                  ? { type: "spring", stiffness: 200, damping: 25 }
                  : { duration: 0 }
              }
            />

            <div className="relative flex items-center h-[64px] px-1">
              <motion.div
                className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center shrink-0 relative z-20 shadow-2xl"
                animate={{
                  x:
                    reachedDropButtonProgress *
                    (reachedDropButtonRef.current
                      ? reachedDropButtonRef.current.offsetWidth - 56 - 32
                      : 240),
                }}
                transition={
                  reachedDropIsAnimatingToComplete
                    ? { type: "spring", stiffness: 300, damping: 30 }
                    : { duration: 0 }
                }
              >
                <ArrowRight className="w-5 h-5 text-white" />
              </motion.div>

              <div className="absolute inset-0 flex items-center justify-center left-16 right-4 pointer-events-none">
                <motion.span
                  className="text-white font-semibold flex items-center justify-center text-center text-base select-none"
                  animate={{
                    opacity:
                      reachedDropButtonProgress > 0.5
                        ? Math.max(0.2, 1 - reachedDropButtonProgress * 0.8)
                        : 1,
                    x: reachedDropButtonProgress > 0.5 ? reachedDropButtonProgress * 15 : 0,
                  }}
                  transition={
                    reachedDropIsAnimatingToComplete
                      ? { type: "spring", stiffness: 200, damping: 25 }
                      : { duration: 0 }
                  }
                >
                  {reachedDropButtonProgress > 0.5 ? "Release to Confirm" : "Reached Drop"}
                </motion.span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </BottomPopup>
  );
}

