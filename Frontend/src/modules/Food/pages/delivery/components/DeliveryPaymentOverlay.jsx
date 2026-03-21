import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, QrCode, X, XCircle } from "lucide-react";
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
  // idle | pending | verifying | paid | failed
  const [paymentSyncState, setPaymentSyncState] = useState("idle");
  const [paymentLedgerSnapshot, setPaymentLedgerSnapshot] = useState(null);
  const [paymentServerEarning, setPaymentServerEarning] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
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
    if (Number.isFinite(paymentServerEarning) && paymentServerEarning > 0)
      return Number(paymentServerEarning);
    if (Number.isFinite(orderEarnings) && orderEarnings > 0) return orderEarnings;
    const est = selectedRestaurant?.estimatedEarnings ?? selectedRestaurant?.amount ?? 0;
    if (typeof est === "object" && Number.isFinite(Number(est.totalEarning)))
      return Number(est.totalEarning);
    if (Number.isFinite(Number(est))) return Number(est);
    return 0;
  }, [paymentServerEarning, orderEarnings, selectedRestaurant?.estimatedEarnings, selectedRestaurant?.amount]);

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

  const isCod =
    paymentMethod === "cash" ||
    paymentMethod === "cod" ||
    paymentMethod === "cash_on_delivery" ||
    paymentMethod === "razorpay_qr";

  const isRazorpayQr = paymentMethod === "razorpay_qr";

  const amountToCollect = useMemo(() => {
    const candidate = Number(
      selectedRestaurant?.amountToCollect ??
        selectedRestaurant?.payment?.amountDue ??
        selectedRestaurant?.amountDue ??
        selectedRestaurant?.codAmount ??
        selectedRestaurant?.pricing?.total ??
        selectedRestaurant?.orderTotal ??
        selectedRestaurant?.total ??
        selectedRestaurant?.payment?.amount ??
        0,
    );
    return Number.isFinite(candidate) && candidate > 0 ? candidate : 0;
  }, [
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

  const canShowQr = amountToCollect > 0 && isCod;
  const isPaymentPaid = paymentSyncState === "paid";
  const isPaymentFailed = paymentSyncState === "failed";

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Core function: fetches status from backend → Razorpay is auto-synced server-side
  const checkPaymentStatus = useCallback(
    async ({ silent = false } = {}) => {
      if (!orderIdForApi) return null;
      if (didAutoCompleteRef.current) return "paid";

      try {
        const statusRes = await deliveryAPI.getPaymentStatus(orderIdForApi);
        const data = statusRes?.data?.data || statusRes?.data || {};

        // Update server earning
        const serverEarningValue =
          data?.riderEarning ?? data?.earnings?.riderEarning ?? null;
        if (serverEarningValue != null) setPaymentServerEarning(Number(serverEarningValue));

        // Update ledger snapshot for display
        const ledger = data?.latestPaymentSnapshot || null;
        if (ledger) setPaymentLedgerSnapshot(ledger);

        // Read payment status from the response
        const rawStatus = String(
          data?.payment?.status ||
            data?.payment?.qr?.status ||
            data?.transactionStatus ||
            "",
        ).toLowerCase();

        if (["paid", "captured", "authorized"].includes(rawStatus)) {
          return "paid";
        }
        if (["failed", "expired", "cancelled", "canceled"].includes(rawStatus)) {
          return "failed";
        }
        return "pending";
      } catch (err) {
        if (!silent) throw err;
        return null; // transient error, keep polling
      }
    },
    [deliveryAPI, orderIdForApi],
  );

  // Called by background polling
  const pollAndAutoComplete = useCallback(async () => {
    if (!isOpen) return;
    if (!isRazorpayQr) return;
    if (!orderIdForApi) return;
    if (!collectQrLink) return;
    if (didAutoCompleteRef.current) return;

    const status = await checkPaymentStatus({ silent: true });
    if (status === "paid") {
      setPaymentSyncState("paid");
      stopPolling();
      if (!didAutoCompleteRef.current) {
        didAutoCompleteRef.current = true;
        toast.success("✅ Payment received! Completing order...");
        setShowCollectQrModal(false);
        setTimeout(() => onComplete?.(), 800);
      }
    } else if (status === "failed") {
      setPaymentSyncState("failed");
      stopPolling();
      toast.error("Payment failed or expired. Please try again.");
    } else if (status === "pending") {
      setPaymentSyncState("pending");
    }
  }, [isOpen, isRazorpayQr, orderIdForApi, collectQrLink, checkPaymentStatus, stopPolling, onComplete]);

  // Manual verify button — with loading state and explicit feedback
  const handleVerifyPayment = useCallback(async () => {
    if (!orderIdForApi) {
      toast.error("Order ID not found");
      return;
    }
    if (didAutoCompleteRef.current) return;

    setIsVerifying(true);
    setPaymentSyncState("verifying");
    try {
      const status = await checkPaymentStatus({ silent: false });

      if (status === "paid") {
        setPaymentSyncState("paid");
        stopPolling();
        if (!didAutoCompleteRef.current) {
          didAutoCompleteRef.current = true;
          toast.success("✅ Payment verified! Completing order...");
          setShowCollectQrModal(false);
          setTimeout(() => onComplete?.(), 800);
        }
      } else if (status === "failed") {
        setPaymentSyncState("failed");
        stopPolling();
        toast.error("Payment failed or expired. Please regenerate the QR.");
      } else {
        setPaymentSyncState("pending");
        toast.info("Payment not yet received. Ask the customer to complete the payment.");
      }
    } catch (err) {
      setPaymentSyncState("idle");
      toast.error(err?.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }, [orderIdForApi, checkPaymentStatus, stopPolling, onComplete]);

  // Start/stop auto-polling when QR link arrives
  useEffect(() => {
    if (!isOpen) {
      stopPolling();
      didAutoCompleteRef.current = false;
      setPaymentSyncState("idle");
      setPaymentLedgerSnapshot(null);
      setPaymentServerEarning(null);
      setIsVerifying(false);
      return;
    }

    if (isRazorpayQr && collectQrLink && !didAutoCompleteRef.current) {
      // Kick off immediately, then every 4 seconds
      pollAndAutoComplete();
      const id = setInterval(pollAndAutoComplete, 4000);
      pollingIntervalRef.current = id;
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
      setPaymentSyncState("pending");
      toast.success("QR generated — waiting for payment");
      setShowCollectQrModal(true);
    } catch (e) {
      setCollectQrError(e?.response?.data?.message || "Failed to generate QR");
    } finally {
      setIsGeneratingCollectQr(false);
    }
  };

  // Status label shown below the QR
  const syncStatusLabel = {
    idle: "Generate QR for customer to scan and pay.",
    pending: "⏳ Waiting for customer to complete payment...",
    verifying: "🔄 Verifying with Razorpay...",
    paid: "✅ Payment received!",
    failed: "❌ Payment failed or expired.",
  }[paymentSyncState] || "";

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] bg-white overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-green-500 text-white px-6 py-6">
              <h1 className="text-2xl font-bold mb-1">Payment</h1>
              <p className="text-white/80 text-sm">Order ID: {orderIdForDisplay}</p>
            </div>

            {/* Earnings hero */}
            <div className="px-6 py-8 text-center bg-gray-50 border-b border-gray-100">
              <p className="text-gray-500 text-sm mb-2">Earnings from this order</p>
              <p className="text-5xl font-bold text-gray-900">₹{earningsAmount.toFixed(2)}</p>
              <p className="text-green-600 text-sm mt-2 font-medium">Added to your wallet</p>
            </div>

            <div className="px-6 py-6 pb-12 flex flex-col gap-5">
              {/* Payment details card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4">Payment Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Payment method</span>
                    <span className="text-gray-900 font-semibold text-sm">{methodLabel}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Earnings added to wallet</span>
                    <span className="text-gray-900 font-semibold text-sm">₹{earningsAmount.toFixed(2)}</span>
                  </div>
                  {isCod && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-amber-700 text-sm font-medium">Amount to collect from customer</span>
                      <span className="text-amber-700 font-semibold text-sm">₹{amountToCollect.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-base font-bold text-gray-900">Total Earnings</span>
                    <span className="text-base font-bold text-gray-900">₹{earningsAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* QR collection section — only for COD/QR */}
              {canShowQr && (
                <div className={`rounded-2xl border p-5 transition-all ${
                  isPaymentPaid
                    ? "bg-green-50 border-green-200"
                    : isPaymentFailed
                      ? "bg-red-50 border-red-200"
                      : "bg-white border-amber-100 shadow-sm"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {isPaymentPaid ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    ) : isPaymentFailed ? (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                    ) : (
                      <QrCode className="w-5 h-5 text-amber-600 shrink-0" />
                    )}
                    <h3 className={`text-base font-bold ${
                      isPaymentPaid ? "text-green-800" : isPaymentFailed ? "text-red-700" : "text-gray-900"
                    }`}>
                      {isPaymentPaid
                        ? "Payment Completed"
                        : isPaymentFailed
                          ? "Payment Failed"
                          : "Collect via Razorpay QR"}
                    </h3>
                  </div>

                  {/* Status text */}
                  <p className={`text-sm mb-4 ${
                    isPaymentPaid
                      ? "text-green-700 font-medium"
                      : isPaymentFailed
                        ? "text-red-600"
                        : "text-gray-500"
                  }`}>
                    {isPaymentPaid
                      ? `₹${amountToCollect.toFixed(2)} received from customer via Razorpay.`
                      : isPaymentFailed
                        ? "Payment expired or failed. You can regenerate the QR."
                        : `Amount: ₹${amountToCollect.toFixed(2)} · ${syncStatusLabel}`}
                  </p>

                  {collectQrError && !isPaymentPaid && (
                    <p className="text-sm text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-lg">{collectQrError}</p>
                  )}

                  {/* PAID STATE — show success, no buttons */}
                  {isPaymentPaid ? (
                    <div className="flex items-center justify-center gap-2 py-3 bg-green-100 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-green-800 font-semibold">Payment Verified ✓</span>
                    </div>
                  ) : isPaymentFailed ? (
                    /* FAILED STATE — allow regenerate */
                    <button
                      type="button"
                      disabled={isGeneratingCollectQr}
                      onClick={() => {
                        setCollectQrLink(null);
                        setPaymentSyncState("idle");
                        setCollectQrError("");
                        handleGenerateQr();
                      }}
                      className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2"
                    >
                      {isGeneratingCollectQr ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Regenerate QR"
                      )}
                    </button>
                  ) : collectQrLink ? (
                    /* QR GENERATED — Show QR + Verify */
                    <div className="flex flex-col gap-3">
                      {/* Inline polling status */}
                      {paymentSyncState === "pending" && (
                        <div className="flex items-center gap-2 text-amber-700 text-sm bg-amber-50 rounded-lg px-3 py-2">
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          <span>Auto-checking payment every 4 s...</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowCollectQrModal(true)}
                        className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-2"
                      >
                        <QrCode className="w-5 h-5" />
                        Show QR to Customer
                      </button>

                      <div className="w-full flex gap-3">
                        <button
                          type="button"
                          onClick={() => window.open(String(collectQrLink), "_blank")}
                          className="flex-1 h-11 rounded-xl border border-amber-200 text-amber-800 font-semibold text-sm"
                        >
                          Open Link
                        </button>

                        {/* VERIFY BUTTON — core fix */}
                        <button
                          type="button"
                          disabled={isVerifying || paymentSyncState === "verifying"}
                          onClick={handleVerifyPayment}
                          className="flex-1 h-11 rounded-xl border-2 border-green-600 bg-green-50 text-green-800 font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          {isVerifying || paymentSyncState === "verifying" ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Checking...
                            </>
                          ) : (
                            "✓ Verify Payment"
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* NO QR YET — Generate button */
                    <button
                      type="button"
                      disabled={isGeneratingCollectQr}
                      onClick={handleGenerateQr}
                      className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2"
                    >
                      {isGeneratingCollectQr ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <QrCode className="w-5 h-5" />
                          Generate QR
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Complete button */}
              <button
                onClick={() => {
                  setShowCollectQrModal(false);
                  onComplete?.();
                }}
                disabled={isRazorpayQr && !isPaymentPaid && paymentSyncState !== "idle"}
                className="w-full bg-black text-white py-4 rounded-2xl font-semibold text-lg hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isRazorpayQr && !isPaymentPaid && paymentSyncState === "pending"
                  ? "Waiting for payment..."
                  : "Complete"}
              </button>
              {isRazorpayQr && !isPaymentPaid && paymentSyncState === "pending" && (
                <p className="text-center text-xs text-gray-400 -mt-3">
                  Complete is enabled after payment is verified
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Modal */}
      <AnimatePresence>
        {isOpen && showCollectQrModal && collectQrLink && !isPaymentPaid ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[260] bg-black/60 backdrop-blur-[2px] flex items-center justify-center px-5"
            onClick={() => setShowCollectQrModal(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 22, stiffness: 240 }}
              className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Razorpay QR</p>
                  <p className="text-base font-bold text-gray-900">
                    Scan to pay ₹{amountToCollect.toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  className="h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"
                  onClick={() => setShowCollectQrModal(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex flex-col items-center gap-4">
                {/* QR image */}
                <div className="relative">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(String(collectQrLink))}`}
                    alt="Razorpay payment QR"
                    className="w-[260px] h-[260px] rounded-2xl border border-gray-200 bg-white"
                  />
                  {paymentSyncState === "pending" && (
                    <div className="absolute top-2 right-2 bg-amber-500 rounded-full p-1">
                      <Loader2 className="w-3 h-3 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {/* Status inside modal */}
                <p className="text-sm text-gray-500 text-center">
                  {paymentSyncState === "pending" && "Waiting for customer to pay..."}
                  {paymentSyncState === "idle" && "Ask customer to scan this QR"}
                  {paymentSyncState === "verifying" && "Verifying with Razorpay..."}
                </p>

                {/* Buttons inside modal */}
                <div className="w-full flex gap-3">
                  <button
                    type="button"
                    onClick={() => window.open(String(collectQrLink), "_blank")}
                    className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm"
                  >
                    Open Link
                  </button>
                  <button
                    type="button"
                    disabled={isVerifying || paymentSyncState === "verifying"}
                    onClick={handleVerifyPayment}
                    className="flex-1 h-11 rounded-xl border-2 border-green-600 bg-green-50 text-green-800 font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {isVerifying || paymentSyncState === "verifying" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "✓ Verify"
                    )}
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
