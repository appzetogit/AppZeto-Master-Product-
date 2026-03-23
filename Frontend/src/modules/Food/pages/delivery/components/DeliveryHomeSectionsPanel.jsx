import { motion } from "framer-motion"
import { ArrowRight, Lock, Clock, Calendar, CheckCircle, IndianRupee, ChevronDown } from "lucide-react"

export default function DeliveryHomeSectionsPanel({
  isVisible,
  swipeBarRef,
  isDraggingSwipeBar,
  swipeBarPosition,
  handleSwipeBarTouchStart,
  handleSwipeBarTouchMove,
  handleSwipeBarTouchEnd,
  handleSwipeBarMouseDown,
  handleChevronDownClick,
  homeSectionsScrollRef,
  referralBonusBg,
  onReferClick,
  isOnline,
  onGoOnlineClick,
  weekEndDate,
  isOfferLive,
  earningsGuaranteeTarget,
  earningsGuaranteeOrdersTarget,
  ordersProgress,
  earningsProgress,
  earningsGuaranteeCurrentOrders,
  earningsGuaranteeCurrentEarnings,
  formatCurrency,
  todayEarnings,
  todayTrips,
  formatHours,
  todayHoursWorked,
  todayGigsCount,
  onNavigate,
}) {
  if (!isVisible) return null

  return (
    <>
      <motion.div
        ref={swipeBarRef}
        initial={{ y: "100%" }}
        animate={{ y: isDraggingSwipeBar ? `${(1 - swipeBarPosition) * (window.innerHeight * 0.8)}px` : 0 }}
        exit={{ y: "100%" }}
        transition={isDraggingSwipeBar ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 300 }}
        onTouchStart={handleSwipeBarTouchStart}
        onTouchMove={handleSwipeBarTouchMove}
        onTouchEnd={handleSwipeBarTouchEnd}
        onMouseDown={handleSwipeBarMouseDown}
        className="relative flex-1 bg-white rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ height: "calc(100vh - 200px)", touchAction: "pan-y" }}
      >
        <div className="flex flex-col items-center pt-4 pb-2 cursor-grab active:cursor-grabbing bg-white sticky top-0 z-10" style={{ touchAction: "none" }}>
          <motion.div
            className="flex flex-col items-center gap-1"
            animate={{ y: isDraggingSwipeBar ? -swipeBarPosition * 5 : 0, opacity: isDraggingSwipeBar ? 0.7 : 1 }}
            transition={{ duration: 0.1 }}
          >
            <button
              onClick={handleChevronDownClick}
              className="flex items-center justify-center p-2 -m-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Slide down"
            >
              <ChevronDown className="!w-12 !h-8 scale-x-150 text-gray-400 -mt-2 font-bold" strokeWidth={3} />
            </button>
          </motion.div>
        </div>

        <div
          ref={homeSectionsScrollRef}
          className="px-4 pt-4 pb-16 space-y-4 overflow-y-auto"
          style={{ height: "calc(100vh - 250px)", touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onReferClick}
            className="w-full rounded-xl p-6 shadow-lg relative overflow-hidden min-h-[70px] cursor-pointer"
            style={{
              backgroundImage: `url(${referralBonusBg})`,
              backgroundSize: "100% 100%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="relative z-10">
              <div className="text-white text-3xl font-bold mb-1">
                ?6,000 <span className="text-white/90 text-base font-medium mb-1">referral bonus</span>
              </div>
              <div className="text-white/80 text-sm">Refer your friends now</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="w-full rounded-xl p-6 shadow-lg bg-black text-white"
          >
            <div className="flex items-center text-center justify-center gap-2 mb-2">
              <div className="text-4xl font-bold text-center">?100</div>
              <Lock className="w-5 h-5 text-white" />
            </div>
            <p className="text-white/90 text-center text-sm mb-4">Complete 1 order to unlock ?100</p>
            <div className="flex items-center text-center justify-center gap-2 text-white/70 text-xs mb-4">
              <Clock className="w-4 h-4" />
              <span className="text-center">Valid till 10 December 2025</span>
            </div>
            <button
              onClick={onGoOnlineClick}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <span>{isOnline ? "Go offline" : "Go online"}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="w-full rounded-xl overflow-hidden shadow-lg bg-white"
          >
            <div className="border-b border-gray-100">
              <div className="flex p-2 px-3 items-center justify-between bg-black">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white mb-1">Earnings Guarantee</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">Valid till {weekEndDate}</span>
                    {isOfferLive && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm text-green-600 font-medium">Live</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-black text-white px-4 py-3 rounded-lg text-center min-w-[80px]">
                  <div className="text-2xl font-bold">?{earningsGuaranteeTarget.toFixed(0)}</div>
                  <div className="text-xs text-white/80 mt-1">{earningsGuaranteeOrdersTarget} orders</div>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="flex items-center justify-around gap-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5, type: "spring" }}
                  className="flex flex-col items-center"
                >
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <motion.circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#000000"
                        strokeWidth="8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: ordersProgress }}
                        transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-gray-900">
                        {earningsGuaranteeCurrentOrders} of {earningsGuaranteeOrdersTarget || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Orders</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
                  className="flex flex-col items-center"
                >
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <motion.circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#000000"
                        strokeWidth="8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: earningsProgress }}
                        transition={{ delay: 0.7, duration: 1, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">?{earningsGuaranteeCurrentEarnings.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <IndianRupee className="w-5 h-5 text-gray-700" />
                    <span className="text-sm font-medium text-gray-700">Earnings</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="w-full rounded-xl overflow-hidden shadow-lg bg-white"
          >
            <div className="bg-black px-4 py-3 flex items-center gap-3">
              <div className="relative">
                <Calendar className="w-5 h-5 text-white" />
                <CheckCircle className="w-3 h-3 text-green-500 absolute -top-1 -right-1 bg-white rounded-full" fill="currentColor" />
              </div>
              <span className="text-white font-semibold">Today's progress</span>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => onNavigate("/delivery/earnings")} className="flex flex-col items-start gap-1 hover:opacity-80 transition-opacity">
                  <span className="text-2xl font-bold text-gray-900">{formatCurrency(todayEarnings)}</span>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <span>Earnings</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>

                <button onClick={() => onNavigate("/delivery/trip-history")} className="flex flex-col items-end gap-1 hover:opacity-80 transition-opacity">
                  <span className="text-2xl font-bold text-gray-900">{todayTrips}</span>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <span>Trips</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>

                <button onClick={() => onNavigate("/delivery/time-on-orders")} className="flex flex-col items-start gap-1 hover:opacity-80 transition-opacity">
                  <span className="text-2xl font-bold text-gray-900">{`${formatHours(todayHoursWorked)} hrs`}</span>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <span>Time on orders</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>

                <button onClick={() => onNavigate("/delivery/gig")} className="flex flex-col items-end gap-1 hover:opacity-80 transition-opacity">
                  <span className="text-2xl font-bold text-gray-900">{`${todayGigsCount} Gigs`}</span>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <span>History</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </>
  )
}
