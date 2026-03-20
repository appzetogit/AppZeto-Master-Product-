import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";

export default function DeliveryPaymentOverlay({
  isOpen,
  selectedRestaurant,
  newOrder,
  orderEarnings,
  collectQrLink,
  setCollectQrLink,
  collectQrError,
  setCollectQrError,
  isGeneratingCollectQr,
  setIsGeneratingCollectQr,
  deliveryAPI,
  onComplete,
}) {
  const [showCollectQrModal, setShowCollectQrModal] = useState(false);
  const [paymentSyncState, setPaymentSyncState] = useState("idle"); // idle | pending | paid | failed
  const [paymentLedgerSnapshot, setPaymentLedgerSnapshot] = useState(null);
  const [paymentServerEarning, setPaymentServerEarning] = useState(null);
  const pollingIntervalRef = useRef(null);
  const didAutoCompleteRef = useRef(false);

  const orderIdForDisplay = selectedRestaurant?.orderId || "ORD1234567890";

  const orderIdForApi = useMemo(() => {
    return (
      selectedRestaurant?.id ||
      newOrder?.orderMongoId ||
      newOrder?._id ||
      selectedRestaurant?.orderId ||
      newOrder?.orderId ||
      null
    );
  }, [selectedRestaurant, newOrder]);

  const earningsAmount = useMemo(() => {
    const ledgerAmount = paymentLedgerSnapshot?.amountDue ?? paymentLedgerSnapshot?.amount;
    if (Number.isFinite(ledgerAmount) && ledgerAmount > 0) return Number(ledgerAmount);

    const serverEarning = paymentServerEarning;
    if (Number.isFinite(serverEarning) && serverEarning > 0) {
      return Number(serverEarning);
    }

    if (Number.isFinite(orderEarnings) && orderEarnings > 0) return orderEarnings;
    const est = selectedRestaurant?.estimatedEarnings ?? selectedRestaurant?.amount ?? 0;
    if (typeof est === "object" && Number.isFinite(Number(est.totalEarning))) return Number(est.totalEarning);
    if (Number.isFinite(Number(est))) return Number(est);
    return 0;
  }, [
    paymentLedgerSnapshot?.amountDue,
    paymentLedgerSnapshot?.amount,
    paymentServerEarning,
    orderEarnings,
    selectedRestaurant?.estimatedEarnings,
    selectedRestaurant?.amount,
  ]);

  const paymentMethod = useMemo(() => {
    return String(
      paymentLedgerSnapshot?.method ||
      selectedRestaurant?.paymentMethod ||
        selectedRestaurant?.paymentMethodType ||
        selectedRestaurant?.payment?.method ||
        selectedRestaurant?.payment?.paymentMethod ||
        selectedRestaurant?.payment ||
        "",
    )
      .toLowerCase()
      .trim();
  }, [
    paymentLedgerSnapshot?.method,
    selectedRestaurant?.paymentMethod,
    selectedRestaurant?.paymentMethodType,
    selectedRestaurant?.payment?.method,
    selectedRestaurant?.payment?.paymentMethod,
    selectedRestaurant?.payment,
  ]);

  // COD cash vs COD collected via Razorpay QR.
  const isCod =
    paymentMethod === "cash" ||
    paymentMethod === "cod" ||
    paymentMethod === "cash_on_delivery" ||
    paymentMethod === "razorpay_qr";

  const isRazorpayQr = paymentMethod === "razorpay_qr";

  const amountToCollect = useMemo(() => {
    const ledgerCollectAmount =
      paymentLedgerSnapshot?.amountDue ?? paymentLedgerSnapshot?.amount;

    const candidate = Number(
      ledgerCollectAmount ??
        selectedRestaurant?.amountToCollect ??
        selectedRestaurant?.payment?.amountDue ??
        selectedRestaurant?.amountDue ??
        selectedRestaurant?.codAmount ??
        selectedRestaurant?.pricing?.total ??
        selectedRestaurant?.orderTotal ??
        selectedRestaurant?.total ??
        selectedRestaurant?.payment?.amount ??
        0
    );
    return Number.isFinite(candidate) && candidate > 0 ? candidate : 0;
  }, [
    paymentLedgerSnapshot?.amountDue,
    paymentLedgerSnapshot?.amount,
    selectedRestaurant?.amountToCollect,
    selectedRestaurant?.payment?.amountDue,
    selectedRestaurant?.amountDue,
    selectedRestaurant?.codAmount,
    selectedRestaurant?.pricing?.total,
    selectedRestaurant?.orderTotal,
    selectedRestaurant?.total,
    selectedRestaurant?.payment?.amount,
  ]);

  const methodLabel =
    paymentMethod === "razorpay_qr"
      ? "Cash on Delivery (QR)"
      : isCod
        ? "Cash on Delivery"
        : paymentMethod
          ? paymentMethod.replace(/_/g, " ").toUpperCase()
          : "Paid";

  // Only COD-style flows support QR collection in this app.
  const canShowQr = amountToCollect > 0 && isCod;

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const pollAndAutoComplete = async () => {
    if (!isOpen) return;
    if (!isRazorpayQr) return;
    if (!orderIdForApi) return;
    if (!collectQrLink) return;
    if (didAutoCompleteRef.current) return;

    try {
      const statusRes = await deliveryAPI.getPaymentStatus(orderIdForApi);
      const ledger = statusRes?.data?.data?.latestPaymentSnapshot || null;
      if (ledger) setPaymentLedgerSnapshot(ledger);

      const serverEarningValue =
        statusRes?.data?.data?.riderEarning ??
        statusRes?.data?.data?.earnings?.riderEarning ??
        statusRes?.data?.data?.earnings ??
        null;
      if (serverEarningValue != null) setPaymentServerEarning(serverEarningValue);

      const paymentStatus =
        statusRes?.data?.data?.payment?.status ||
        statusRes?.data?.payment?.status ||
        statusRes?.payment?.status ||
        "";

      const normalized = String(paymentStatus || "").toLowerCase();

      if (normalized === "paid") {
        setPaymentSyncState("paid");
        stopPolling();
        if (!didAutoCompleteRef.current) {
          didAutoCompleteRef.current = true;
          toast.success("QR payment successful. Completing...");
          // Give React a brief moment to paint "paid" info from ledger before navigation.
          setTimeout(() => onComplete?.(), 450);
        }
        return;
      }

      if (
        ["failed", "expired", "cancelled", "canceled"].includes(normalized)
      ) {
        setPaymentSyncState("failed");
        stopPolling();
        toast.error("QR payment failed. Please try again.");
      } else {
        // Keep showing waiting state until backend marks it.
        setPaymentSyncState("pending");
      }
    } catch (e) {
      // Transient network/backend error; keep polling.
    }
  };

  useEffect(() => {
    // Reset polling when overlay closes.
    if (!isOpen) {
      stopPolling();
      didAutoCompleteRef.current = false;
      setPaymentSyncState("idle");
      setPaymentLedgerSnapshot(null);
      setPaymentServerEarning(null);
      return;
    }

    // Reset when opening overlay.
    didAutoCompleteRef.current = false;
    setPaymentSyncState("idle");
    setPaymentLedgerSnapshot(null);
    setPaymentServerEarning(null);

    // Auto complete only for razorpay_qr and only after QR link is generated.
    if (isRazorpayQr && collectQrLink) {
      // Poll immediately and then every 3 seconds.
      pollAndAutoComplete();
      pollingIntervalRef.current = setInterval(pollAndAutoComplete, 3000);
    }

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isRazorpayQr, collectQrLink, orderIdForApi]);

  const handleGenerateQr = async () => {
    if (!orderIdForApi) {
      toast.error("Order not found");
      return;
    }

    setCollectQrError("");
    setIsGeneratingCollectQr(true);
    try {
      const customerInfo = {
        name: selectedRestaurant?.customerName || selectedRestaurant?.userName || "",
        phone: selectedRestaurant?.customerPhone || selectedRestaurant?.userPhone || "",
      };
      const res = await deliveryAPI.createCollectQr(orderIdForApi, customerInfo);
      const link =
        res?.data?.data?.shortUrl ||
        res?.data?.data?.imageUrl ||
        res?.data?.data?.qr?.shortUrl ||
        res?.data?.data?.qr?.imageUrl ||
        res?.data?.shortUrl ||
        res?.data?.imageUrl ||
        null;
      if (!link) {
        setCollectQrError("Failed to generate QR. Please try again.");
        return;
      }
      setCollectQrLink(link);
      toast.success("QR generated");
      setShowCollectQrModal(true);
    } catch (e) {
      setCollectQrError(e?.response?.data?.message || "Failed to generate QR");
    } finally {
      setIsGeneratingCollectQr(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-200 bg-white overflow-y-auto"
          >
            <div className="bg-green-500 text-white px-6 py-6">
              <h1 className="text-2xl font-bold mb-2">Payment</h1>
              <p className="text-white/90 text-sm">Order ID: {orderIdForDisplay}</p>
            </div>

            <div className="px-6 py-8 text-center bg-gray-50">
              <p className="text-gray-600 text-sm mb-2">Earnings from this order</p>
              <p className="text-5xl font-bold text-gray-900">₹{earningsAmount.toFixed(2)}</p>
              <p className="text-green-600 text-sm mt-2">₹ Added to your wallet</p>
            </div>

            <div className="px-6 py-6 pb-10 h-full flex flex-col">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Payment method</span>
                    <span className="text-gray-900 font-semibold">{methodLabel}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Earnings added to wallet</span>
                    <span className="text-gray-900 font-semibold">₹{earningsAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className={isCod ? "text-amber-700 font-medium" : "text-gray-600"}>
                      {isCod ? "Amount to collect from customer" : "Amount paid by customer"}
                    </span>
                    <span className={isCod ? "text-amber-700 font-semibold" : "text-gray-900 font-semibold"}>
                      ₹{amountToCollect.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-lg font-bold text-gray-900">Total Earnings</span>
                    <span className="text-lg font-bold text-gray-900">₹{earningsAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {canShowQr ? (
                <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 mb-6">
                  <div className="mb-3">
                    <h3 className="text-base font-bold text-gray-900">Collect payment via QR</h3>
                    <p className="text-sm text-gray-600">
                      Razorpay dynamic QR (amount pre-filled): ₹{amountToCollect.toFixed(2)} · method: razorpay_qr
                    </p>
                  </div>

                  {collectQrError ? <p className="text-sm text-red-600 mb-3">{collectQrError}</p> : null}

                  {isRazorpayQr && collectQrLink ? (
                    <p className="text-sm text-gray-600 mb-3">
                      {paymentSyncState === "pending" && "Waiting for Razorpay payment..."}
                      {paymentSyncState === "paid" && "Payment success. Completing..."}
                      {paymentSyncState === "failed" && "Payment failed. Try again."}
                      {paymentSyncState === "idle" && "Scan & pay to complete."}
                      {paymentLedgerSnapshot?.status ? ` (ledger: ${String(paymentLedgerSnapshot.status).toUpperCase()})` : ""}
                    </p>
                  ) : null}

                  {collectQrLink ? (
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCollectQrModal(true)}
                        className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                      >
                        Show QR
                      </button>
                      <div className="w-full flex gap-3">
                        <button
                          type="button"
                          onClick={() => window.open(String(collectQrLink), "_blank")}
                          className="flex-1 h-11 rounded-xl border border-amber-200 text-amber-800 font-semibold"
                        >
                          Open link
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toast.info("Verifying payment...");
                            pollAndAutoComplete();
                          }}
                          className="flex-1 h-11 rounded-xl border border-amber-600 bg-amber-50 text-amber-800 font-semibold"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isGeneratingCollectQr}
                      onClick={handleGenerateQr}
                      className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold"
                    >
                      {isGeneratingCollectQr ? "Generating..." : "Generate QR"}
                    </button>
                  )}
                </div>
              ) : null}

              <button
                onClick={() => {
                  setShowCollectQrModal(false);
                  onComplete?.();
                }}
                disabled={isRazorpayQr && paymentSyncState === "pending"}
                className="w-full mt-4 bg-black text-white py-4 rounded-xl font-semibold text-lg hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Complete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && showCollectQrModal && collectQrLink ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-260 bg-black/50 backdrop-blur-[2px] flex items-center justify-center px-5"
            onClick={() => setShowCollectQrModal(false)}
          >
            <motion.div
              initial={{ y: 18, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 18, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", damping: 22, stiffness: 240 }}
              className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Collect payment via QR</p>
                  <p className="text-base font-bold text-gray-900">Scan & pay</p>
                </div>
                <button
                  type="button"
                  className="h-9 w-9 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center"
                  onClick={() => setShowCollectQrModal(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex flex-col items-center gap-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(String(collectQrLink))}`}
                  alt="Razorpay payment QR"
                  className="w-[280px] h-[280px] rounded-2xl border border-gray-200 bg-white"
                />

                <div className="w-full flex gap-3">
                  <button
                    type="button"
                    onClick={() => window.open(String(collectQrLink), "_blank")}
                    className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  >
                    Open link
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast.info("Verifying payment...");
                      pollAndAutoComplete();
                    }}
                    className="flex-1 h-11 rounded-xl border border-amber-600 bg-amber-50 text-amber-800 font-semibold"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

