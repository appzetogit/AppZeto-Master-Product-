import { motion } from "framer-motion";
import { ArrowRight, Clock, IndianRupee, MapPin } from "lucide-react";
import BottomPopup from "@food/components/delivery/BottomPopup";

export default function DeliveryOrderDeliveredPopup({
  isOpen,
  onClose,
  selectedRestaurant,
  tripDistance,
  tripTime,
  orderDeliveredButtonRef,
  orderDeliveredButtonProgress,
  orderDeliveredIsAnimatingToComplete,
  handleOrderDeliveredTouchStart,
  handleOrderDeliveredTouchMove,
  handleOrderDeliveredTouchEnd,
  handleOrderDeliveredTouchCancel,
}) {
  return (
    <BottomPopup
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      closeOnBackdropClick={false}
      maxHeight="80vh"
      showHandle={false}
      disableSwipeToClose={true}
      showBackdrop={false}
      backdropBlocksInteraction={false}
    >
      <div className="">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Great job! Delivery complete</h1>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-600" />
                <span className="text-gray-600 text-sm">Trip distance</span>
              </div>
              <span className="text-gray-900 font-semibold">
                {tripDistance !== null
                  ? tripDistance >= 1000
                    ? `${(tripDistance / 1000).toFixed(1)} kms`
                    : `${tripDistance.toFixed(0)} m`
                  : selectedRestaurant?.tripDistance || "Calculating..."}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-gray-600 text-sm">Trip time</span>
              </div>
              <span className="text-gray-900 font-semibold">
                {tripTime !== null
                  ? tripTime >= 60
                    ? `${Math.round(tripTime / 60)} mins`
                    : `${tripTime} secs`
                  : selectedRestaurant?.tripTime || "Calculating..."}
              </span>
            </div>
          </div>
        </div>

        {(() => {
          const m = String(
            selectedRestaurant?.paymentMethod ||
              selectedRestaurant?.payment ||
              selectedRestaurant?.payment?.method ||
              "",
          )
            .toLowerCase()
            .trim();
          const isCod = m === "cash" || m === "cod" || m === "cash_on_delivery";
          // `selectedRestaurant.total` is the customer payable amount (what rider collects for COD).
          const customerTotal =
            Number(
              selectedRestaurant?.total ??
                selectedRestaurant?.pricing?.total ??
                selectedRestaurant?.payment?.amount ??
                0,
            ) || 0;

          // `selectedRestaurant.amount` / `estimatedEarnings` is delivery-partner earnings.
          const riderEarning =
            Number(
              selectedRestaurant?.amount ??
                selectedRestaurant?.estimatedEarnings?.totalEarning ??
                selectedRestaurant?.estimatedEarnings ??
                0,
            ) || 0;

          if (
            (!Number.isFinite(customerTotal) || customerTotal < 0) &&
            (!Number.isFinite(riderEarning) || riderEarning < 0)
          ) {
            return null;
          }
          return (
            <div className="space-y-4 mb-6">
              {/* Customer collection / payment */}
              {Number.isFinite(customerTotal) && customerTotal >= 0 && (
                <div
                  className={`rounded-xl p-4 ${
                    isCod
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-emerald-50 border border-emerald-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IndianRupee className={`w-4 h-4 ${isCod ? "text-amber-600" : "text-emerald-600"}`} />
                      <span
                        className={`text-sm font-medium ${
                          isCod ? "text-amber-800" : "text-emerald-800"
                        }`}
                      >
                        {isCod ? "Collect from customer (COD)" : "Amount paid (Online)"}
                      </span>
                    </div>
                    <span
                      className={`text-lg font-bold ${
                        isCod ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      ₹
                      {customerTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Rider earnings */}
              {Number.isFinite(riderEarning) && riderEarning >= 0 && (
                <div className="rounded-xl p-4 bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-gray-700" />
                      <span className="text-sm font-medium text-gray-800">Your earnings</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      ₹
                      {riderEarning.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        <div className="relative w-full">
          <motion.div
            ref={orderDeliveredButtonRef}
            className="relative w-full bg-green-600 rounded-full overflow-hidden shadow-xl"
            style={{ touchAction: "pan-x" }}
            onTouchStart={handleOrderDeliveredTouchStart}
            onTouchMove={handleOrderDeliveredTouchMove}
            onTouchEnd={handleOrderDeliveredTouchEnd}
            onTouchCancel={handleOrderDeliveredTouchCancel}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className="absolute inset-0 bg-green-500 rounded-full"
              animate={{ width: `${orderDeliveredButtonProgress * 100}%` }}
              transition={
                orderDeliveredIsAnimatingToComplete
                  ? { type: "spring", stiffness: 200, damping: 25 }
                  : { duration: 0 }
              }
            />

            <div className="relative flex items-center h-[64px] px-1">
              <motion.div
                className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center shrink-0 relative z-20 shadow-2xl"
                animate={{
                  x:
                    orderDeliveredButtonProgress *
                    (orderDeliveredButtonRef.current
                      ? orderDeliveredButtonRef.current.offsetWidth - 56 - 32
                      : 240),
                }}
                transition={
                  orderDeliveredIsAnimatingToComplete
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
                      orderDeliveredButtonProgress > 0.5
                        ? Math.max(0.2, 1 - orderDeliveredButtonProgress * 0.8)
                        : 1,
                    x: orderDeliveredButtonProgress > 0.5 ? orderDeliveredButtonProgress * 15 : 0,
                  }}
                  transition={
                    orderDeliveredIsAnimatingToComplete
                      ? { type: "spring", stiffness: 200, damping: 25 }
                      : { duration: 0 }
                  }
                >
                  {orderDeliveredButtonProgress > 0.5 ? "Release to Confirm" : "Order Delivered"}
                </motion.span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </BottomPopup>
  );
}

