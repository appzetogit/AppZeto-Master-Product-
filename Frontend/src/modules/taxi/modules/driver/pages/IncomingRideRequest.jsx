import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import {
  ArrowRight,
  Banknote,
  Bike,
  ChevronRight,
  Clock,
  CreditCard,
  MapPin,
  Navigation,
  Package,
  X,
} from 'lucide-react';

const Motion = motion;

const normalizePayment = (value = '') => String(value || 'cash').toUpperCase();

const IncomingRideRequest = ({ visible, onAccept, onDecline, requestData, isAccepting = false }) => {
  const [timer, setTimer] = useState(15);
  const slideX = useMotionValue(0);
  const slideFillWidth = useTransform(slideX, [0, 180], ['58px', '100%']);
  const data = requestData;

  useEffect(() => {
    let interval;
    let resetTimer;
    if (visible) {
      resetTimer = setTimeout(() => setTimer(15), 0);
      interval = setInterval(() => {
        setTimer((current) => {
          if (current <= 1) {
            onDecline();
            return 0;
          }
          return current - 1;
        });
      }, 1000);
    }

    return () => {
      clearTimeout(resetTimer);
      clearInterval(interval);
    };
  }, [visible, onDecline]);

  useEffect(() => {
    slideX.set(0);
  }, [slideX, visible, data?.rideId]);

  if (!visible || !data) return null;

  const isParcel = data.type === 'parcel';
  const isIntercity = data.type === 'intercity';
  const title = isParcel ? 'Delivery Request' : isIntercity ? 'Intercity Request' : 'Ride Request';
  const intercityRoute = [data.raw?.intercity?.fromCity, data.raw?.intercity?.toCity].filter(Boolean).join(' to ');
  const category = data.raw?.parcel?.category || data.raw?.parcel?.weight || (isParcel ? 'Parcel delivery' : isIntercity ? intercityRoute || 'Intercity trip' : 'Passenger ride');
  const payment = normalizePayment(data.payment);
  const timerProgress = Math.max(0, Math.min(100, (timer / 15) * 100));

  const handleSlideEnd = (_event, info) => {
    if (isAccepting) return;

    if (info.offset.x >= 120) {
      slideX.set(180);
      onAccept(data);
      return;
    }

    slideX.set(0);
  };

  return (
    <AnimatePresence mode="wait">
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 px-3 pb-6 sm:pb-8 backdrop-blur-sm"
      >
        <Motion.div
          initial={{ y: '100%', scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: '100%', scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-[440px] overflow-hidden rounded-[32px] bg-white shadow-[0_40px_100px_rgba(0,0,0,0.15)] border border-slate-100"
        >
          {/* Progress Header */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-slate-50">
            <Motion.div
              className={`h-full rounded-r-full ${isParcel ? 'bg-orange-400' : 'bg-slate-900'}`}
              animate={{ width: `${timerProgress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          <div className="px-6 pb-6 pt-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-[60px] w-[60px] items-center justify-center rounded-2xl shadow-sm ${isParcel ? 'bg-orange-50 text-orange-600' : isIntercity ? 'bg-yellow-400 text-slate-950' : 'bg-slate-900 text-white'}`}>
                  {isParcel ? <Package size={28} /> : isIntercity ? <Navigation size={28} /> : <Bike size={28} />}
                </div>
                <div>
                  <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isParcel ? 'bg-orange-50 text-orange-600' : isIntercity ? 'bg-yellow-50 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
                    {title}
                  </div>
                  <h2 className="mt-1 text-[22px] font-bold tracking-tight text-slate-950">Incoming Order</h2>
                  <p className="text-[12px] font-medium text-slate-500">{category}</p>
                </div>
              </div>

              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-50 bg-slate-50 shadow-inner">
                <span className="text-[22px] font-bold text-slate-900">{timer}</span>
                <Clock size={12} className="absolute -top-1.5 -right-1.5 p-0.5 bg-white border border-slate-100 rounded-full text-slate-400" />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mb-6 flex items-center justify-between px-2 py-4 rounded-[22px] bg-slate-50/70 border border-slate-100/50">
               <div className="text-center flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Distance</p>
                  <p className="text-[15px] font-bold text-slate-900">{data.distance}</p>
               </div>
               <div className="w-px h-8 bg-slate-200" />
               <div className="text-center flex-[1.5] px-4">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Earnings</p>
                  <p className="text-[20px] font-bold text-slate-900 leading-none">{data.fare}</p>
               </div>
               <div className="w-px h-8 bg-slate-200" />
               <div className="text-center flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Payment</p>
                  <p className="text-[13px] font-bold text-emerald-600">{payment}</p>
               </div>
            </div>

            {isIntercity && (
              <div className="mb-6 grid grid-cols-3 gap-2 rounded-[18px] border border-yellow-100 bg-yellow-50/70 px-3 py-3">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-yellow-700/60">Trip</p>
                  <p className="mt-1 truncate text-[11px] font-black text-slate-900">{data.raw?.intercity?.tripType || 'Intercity'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-yellow-700/60">Date</p>
                  <p className="mt-1 truncate text-[11px] font-black text-slate-900">{data.raw?.intercity?.travelDate || 'Today'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-yellow-700/60">Pax</p>
                  <p className="mt-1 truncate text-[11px] font-black text-slate-900">{data.raw?.intercity?.passengers || 1}</p>
                </div>
              </div>
            )}

            {/* Journey Timeline */}
            <div className="mb-6 relative">
              <div className="absolute left-[7px] top-3 bottom-3 w-[1.5px] border-l-2 border-dashed border-slate-100" />
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="relative z-10 mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-emerald-500 bg-white shadow-sm" />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pickup Point</p>
                    <p className="mt-1 text-[15px] font-semibold leading-snug text-slate-950 truncate max-w-[280px]">
                      {data.raw?.pickupAddress || data.pickup}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="relative z-10 mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-orange-500 bg-white shadow-sm" />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Drop Point</p>
                    <p className="mt-1 text-[15px] font-semibold leading-snug text-slate-950 truncate max-w-[280px]">
                      {data.raw?.dropAddress || data.drop}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onDecline}
                disabled={isAccepting}
                className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-400 shadow-sm active:scale-95 transition-all hover:text-rose-500"
              >
                <X size={26} />
              </button>

              <div className="relative h-[64px] flex-1 overflow-hidden rounded-2xl bg-slate-900 shadow-xl shadow-slate-200">
                <Motion.div style={{ width: slideFillWidth }} className="absolute inset-y-0 left-0 rounded-2xl bg-emerald-500" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center pl-10">
                  <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-white">
                    {isAccepting ? 'Accepting...' : 'Slide to accept'}
                  </span>
                  {!isAccepting && <ArrowRight size={18} className="ml-2 text-white/50" />}
                </div>
                <Motion.div
                  drag={isAccepting ? false : 'x'}
                  dragConstraints={{ left: 0, right: 180 }}
                  dragElastic={0.05}
                  dragMomentum={false}
                  style={{ x: slideX }}
                  onDragEnd={handleSlideEnd}
                  className="absolute left-1 top-1 z-10 flex h-[56px] w-[56px] cursor-grab items-center justify-center rounded-[14px] bg-white text-slate-950 shadow-lg active:cursor-grabbing"
                >
                  <ChevronRight size={28} />
                </Motion.div>
              </div>
            </div>
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
};

export default IncomingRideRequest;
