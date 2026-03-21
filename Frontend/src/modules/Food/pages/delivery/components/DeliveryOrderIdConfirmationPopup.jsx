import { motion } from "framer-motion";
import { ArrowRight, Camera, CheckCircle, Loader2 } from "lucide-react";
import BottomPopup from "@food/components/delivery/BottomPopup";

export default function DeliveryOrderIdConfirmationPopup({
  isOpen,
  onClose,
  selectedRestaurant,
  newOrder,
  isUploadingBill,
  billImageUploaded,
  handleCameraCapture,
  cameraInputRef,
  handleBillImageSelect,
  orderIdConfirmButtonRef,
  orderIdConfirmButtonProgress,
  orderIdConfirmIsAnimatingToComplete,
  handleOrderIdConfirmTouchStart,
  handleOrderIdConfirmTouchMove,
  handleOrderIdConfirmTouchEnd,
  handleOrderIdConfirmTouchCancel,
}) {
  const displayedOrderId =
    selectedRestaurant?.orderId ||
    selectedRestaurant?.id ||
    newOrder?.orderId ||
    newOrder?.orderMongoId ||
    "ORD1234567890";

  return (
    <BottomPopup
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={true}
      closeOnBackdropClick={true}
      disableSwipeToClose={false}
      maxHeight="60vh"
      showHandle={false}
      showBackdrop={false}
      backdropBlocksInteraction={false}
    >
      <div className="">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Confirm Order ID</h2>
          <p className="text-gray-600 text-sm mb-4">
            Please verify the order ID with the restaurant before pickup
          </p>

          <div className="bg-gray-50 rounded-xl p-6 mb-6 overflow-hidden">
            <p className="text-gray-500 text-xs mb-2">Order ID</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-wider whitespace-nowrap overflow-x-auto min-w-0">
              {displayedOrderId}
            </p>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-3 text-center">
              {billImageUploaded ? "Bill image uploaded" : "Please capture bill image"}
            </p>

            <div className="flex justify-center mb-4">
              <button
                onClick={handleCameraCapture}
                disabled={isUploadingBill}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                  isUploadingBill
                    ? "bg-gray-400 cursor-not-allowed"
                    : billImageUploaded
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-blue-600 hover:bg-blue-700"
                } text-white font-medium`}
              >
                {isUploadingBill ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : billImageUploaded ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Bill Uploaded</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span>Capture Bill</span>
                  </>
                )}
              </button>
            </div>

            <input
              id="bill-camera-input"
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleBillImageSelect}
              className="sr-only"
            />
          </div>

          <div className="relative w-full">
            <motion.div
              ref={orderIdConfirmButtonRef}
              className={`relative w-full rounded-full overflow-hidden shadow-xl ${
                billImageUploaded ? "bg-green-600" : "bg-gray-400 cursor-not-allowed"
              }`}
              style={{
                touchAction: billImageUploaded ? "pan-x" : "none",
                opacity: billImageUploaded ? 1 : 0.6,
              }}
              onTouchStart={billImageUploaded ? handleOrderIdConfirmTouchStart : undefined}
              onTouchMove={billImageUploaded ? handleOrderIdConfirmTouchMove : undefined}
              onTouchEnd={billImageUploaded ? handleOrderIdConfirmTouchEnd : undefined}
              onTouchCancel={billImageUploaded ? handleOrderIdConfirmTouchCancel : undefined}
              whileTap={billImageUploaded ? { scale: 0.98 } : {}}
            >
              <motion.div
                className="absolute inset-0 bg-green-500 rounded-full"
                animate={{ width: `${orderIdConfirmButtonProgress * 100}%` }}
                transition={
                  orderIdConfirmIsAnimatingToComplete
                    ? { type: "spring", stiffness: 200, damping: 25 }
                    : { duration: 0 }
                }
              />

              <div className="relative flex items-center h-[64px] px-1">
                <motion.div
                  className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center shrink-0 relative z-20 shadow-2xl"
                  animate={{
                    x:
                      orderIdConfirmButtonProgress *
                      (orderIdConfirmButtonRef.current
                        ? orderIdConfirmButtonRef.current.offsetWidth - 56 - 32
                        : 240),
                  }}
                  transition={
                    orderIdConfirmIsAnimatingToComplete
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
                        orderIdConfirmButtonProgress > 0.5
                          ? Math.max(0.2, 1 - orderIdConfirmButtonProgress * 0.8)
                          : 1,
                      x: orderIdConfirmButtonProgress > 0.5 ? orderIdConfirmButtonProgress * 15 : 0,
                    }}
                    transition={
                      orderIdConfirmIsAnimatingToComplete
                        ? { type: "spring", stiffness: 200, damping: 25 }
                        : { duration: 0 }
                    }
                  >
                    {!billImageUploaded
                      ? "Upload Bill First"
                      : orderIdConfirmButtonProgress > 0.5
                        ? "Release to Confirm"
                        : "Order Picked Up"}
                  </motion.span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </BottomPopup>
  );
}

