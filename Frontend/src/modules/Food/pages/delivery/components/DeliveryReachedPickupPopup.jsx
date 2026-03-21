import { motion } from "framer-motion";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import BottomPopup from "@food/components/delivery/BottomPopup";

export default function DeliveryReachedPickupPopup({
  isOpen,
  onClose,
  selectedRestaurant,
  setSelectedRestaurant,
  deliveryAPI,
  restaurantAPI,
  debugLog,
  dialPhoneNumber,
  openGoogleMapsNavigation,
  getRestaurantDestination,
  handleReachedPickupMouseDown,
  reachedPickupButtonRef,
  reachedPickupButtonProgress,
  reachedPickupIsAnimatingToComplete,
  handlereachedPickupTouchStart,
  handlereachedPickupTouchMove,
  handlereachedPickupTouchEnd,
  handlereachedPickupTouchCancel,
}) {
  const restaurantAddressText = (() => {
    const address = selectedRestaurant?.address;
    if (!address || address === "Restaurant Address" || address === "Restaurant address") {
      const possibleAddress =
        selectedRestaurant?.restaurantAddress ||
        selectedRestaurant?.restaurant?.address ||
        selectedRestaurant?.restaurantId?.address ||
        selectedRestaurant?.restaurantId?.location?.formattedAddress ||
        selectedRestaurant?.restaurantId?.location?.address ||
        selectedRestaurant?.location?.address ||
        selectedRestaurant?.location?.formattedAddress;
      if (
        possibleAddress &&
        possibleAddress !== "Restaurant Address" &&
        possibleAddress !== "Restaurant address"
      ) {
        return possibleAddress;
      }
    }
    return address && address !== "Restaurant Address" && address !== "Restaurant address"
      ? address
      : "Address will be updated...";
  })();

  const handleCallRestaurant = async () => {
    let restaurantPhone =
      selectedRestaurant?.phone ||
      selectedRestaurant?.restaurantId?.phone ||
      selectedRestaurant?.ownerPhone ||
      selectedRestaurant?.restaurant?.phone ||
      null;

    debugLog?.("📞 Checking phone in selectedRestaurant:", {
      phone: selectedRestaurant?.phone,
      restaurantIdPhone: selectedRestaurant?.restaurantId?.phone,
      ownerPhone: selectedRestaurant?.ownerPhone,
      restaurantPhone: selectedRestaurant?.restaurant?.phone,
      found: !!restaurantPhone,
    });

    if (!restaurantPhone && selectedRestaurant?.orderId) {
      try {
        debugLog?.("📞 [CALL] Phone not found, fetching order details...");
        const orderId = selectedRestaurant.orderId || selectedRestaurant.id;
        const response = await deliveryAPI.getOrderDetails(orderId);
        const order = response.data?.data?.order || response.data?.order || null;
        if (order) {
          restaurantPhone =
            order.restaurantId?.phone ||
            order.restaurantId?.ownerPhone ||
            order.restaurant?.phone ||
            order.restaurant?.ownerPhone ||
            order.restaurantId?.contact?.phone ||
            order.restaurantId?.owner?.phone ||
            null;

          debugLog?.("📞 [CALL] Phone extracted from order:", restaurantPhone);

          if (restaurantPhone && selectedRestaurant) {
            setSelectedRestaurant?.({
              ...selectedRestaurant,
              phone: restaurantPhone,
              ownerPhone: order.restaurantId?.ownerPhone || order.restaurant?.ownerPhone || restaurantPhone,
            });
          }

          if (!restaurantPhone && order.restaurantId) {
            const restaurantId =
              typeof order.restaurantId === "string"
                ? order.restaurantId
                : order.restaurantId._id || order.restaurantId.id || order.restaurantId.toString?.();
            if (restaurantId) {
              const restaurantResponse = await restaurantAPI.getRestaurantById(restaurantId);
              if (restaurantResponse.data?.success && restaurantResponse.data.data) {
                const restaurant = restaurantResponse.data.data.restaurant || restaurantResponse.data.data;
                restaurantPhone = restaurant.phone || restaurant.ownerPhone || restaurant.primaryContactNumber;
                if (restaurantPhone && selectedRestaurant) {
                  setSelectedRestaurant?.({
                    ...selectedRestaurant,
                    phone: restaurantPhone,
                    ownerPhone: restaurant.ownerPhone || restaurantPhone,
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        debugLog?.("📞 [CALL] Failed to fetch phone:", e?.response?.data?.message || e?.message);
      }
    }

    dialPhoneNumber(restaurantPhone, "Restaurant phone number not available");
  };

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
          <span className="bg-gray-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg">Pick up</span>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedRestaurant?.name || "Restaurant Name"}</h2>
          <p className="text-gray-600 mb-2 leading-relaxed">{restaurantAddressText}</p>
          <p className="text-gray-500 text-sm font-medium mb-4">Order ID: {selectedRestaurant?.orderId || "ORD1234567890"}</p>
          
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
            onClick={handleCallRestaurant}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Phone className="w-5 h-5 text-gray-700" />
            <span className="text-gray-700 font-medium">Call</span>
          </button>
          <button
            onClick={() => {
              const dest = getRestaurantDestination(selectedRestaurant);
              openGoogleMapsNavigation(dest, {
                label: "restaurant",
                fallbackAddress: restaurantAddressText || "",
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
            ref={reachedPickupButtonRef}
            className="relative w-full bg-green-600 rounded-full overflow-hidden shadow-xl"
            style={{ touchAction: "pan-x" }}
            onTouchStart={handlereachedPickupTouchStart}
            onTouchMove={handlereachedPickupTouchMove}
            onTouchEnd={handlereachedPickupTouchEnd}
            onTouchCancel={handlereachedPickupTouchCancel}
            onMouseDown={handleReachedPickupMouseDown}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className="absolute inset-0 bg-green-500 rounded-full"
              animate={{ width: `${reachedPickupButtonProgress * 100}%` }}
              transition={
                reachedPickupIsAnimatingToComplete
                  ? { type: "spring", stiffness: 200, damping: 25 }
                  : { duration: 0 }
              }
            />

            <div className="relative flex items-center h-[64px] px-1">
              <motion.div
                className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center shrink-0 relative z-20 shadow-2xl"
                animate={{
                  x:
                    reachedPickupButtonProgress *
                    (reachedPickupButtonRef.current
                      ? reachedPickupButtonRef.current.offsetWidth - 56 - 32
                      : 240),
                }}
                transition={
                  reachedPickupIsAnimatingToComplete
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
                      reachedPickupButtonProgress > 0.5
                        ? Math.max(0.2, 1 - reachedPickupButtonProgress * 0.8)
                        : 1,
                    x: reachedPickupButtonProgress > 0.5 ? reachedPickupButtonProgress * 15 : 0,
                  }}
                  transition={
                    reachedPickupIsAnimatingToComplete
                      ? { type: "spring", stiffness: 200, damping: 25 }
                      : { duration: 0 }
                  }
                >
                  {reachedPickupButtonProgress > 0.5 ? "Release to Confirm" : "Reached Pickup"}
                </motion.span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </BottomPopup>
  );
}

