import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDeliveryStore } from '@/modules/DeliveryV2/store/useDeliveryStore';
import { useProximityCheck } from '@/modules/DeliveryV2/hooks/useProximityCheck';
import { useOrderManager } from '@/modules/DeliveryV2/hooks/useOrderManager';
import { useDeliveryNotifications } from '@food/hooks/useDeliveryNotifications';
import { deliveryAPI } from '@food/api';
import { toast } from 'sonner';

// Components
import { LiveMap } from '@/modules/DeliveryV2/components/map/LiveMap';
import { NewOrderModal } from '@/modules/DeliveryV2/components/modals/NewOrderModal';
import { PickupActionModal } from '@/modules/DeliveryV2/components/modals/PickupActionModal';
import { DeliveryVerificationModal } from '@/modules/DeliveryV2/components/modals/DeliveryVerificationModal';
import { OrderSummaryModal } from '@/modules/DeliveryV2/components/modals/OrderSummaryModal';
import { ActionSlider } from '@/modules/DeliveryV2/components/ui/ActionSlider';

// Sub Pages
import { PocketV2 } from '@/modules/DeliveryV2/pages/PocketV2';
import { HistoryV2 } from '@/modules/DeliveryV2/pages/HistoryV2';
import { ProfileV2 } from '@/modules/DeliveryV2/pages/ProfileV2';

// Icons
import { 
  Bell, HelpCircle, Headset, AlertTriangle, 
  Wallet, History, User as UserIcon, LayoutGrid,
  Plus, Minus, Navigation2, Target, Play
} from 'lucide-react';

/**
 * DeliveryHomeV2 - Premium 1:1 Match with Original App UI.
 * Featuring logical tab switching for Feed, Pocket, History, and Profile.
 */
export default function DeliveryHomeV2() {
  const { isOnline, toggleOnline, activeOrder, tripStatus, setRiderLocation, setActiveOrder, updateTripStatus, clearActiveOrder } = useDeliveryStore();
  const { isWithinRange, distanceToTarget } = useProximityCheck();
  const { acceptOrder, reachPickup, pickUpOrder, reachDrop, completeDelivery, resetTrip } = useOrderManager();
  
  const { newOrder, clearNewOrder, orderStatusUpdate, clearOrderStatusUpdate, isConnected: isSocketConnected } = useDeliveryNotifications();
  
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [currentTab, setCurrentTab] = useState('feed');
  const [showVerification, setShowVerification] = useState(false);
  const lastLocationSentAt = useRef(0);

  // 1. Initial Sync (Force sync with server to avoid 'stuck' persistent state)
  useEffect(() => {
    const syncWithServer = async () => {
      try {
        const response = await deliveryAPI.getCurrentDelivery();
        // Only treat as an active order if it has an identifying field like _id or orderId
        const rawData = response?.data?.data?.activeOrder || response?.data?.data;
        const serverData = (rawData && (rawData._id || rawData.orderId)) ? rawData : null;
        
        if (serverData) {
          // Sync with server's latest status
          setActiveOrder(serverData);
          const backendStatus = serverData.deliveryStatus || serverData.orderStatus || serverData.status;
          
          if (['picked_up', 'PICKED_UP'].includes(backendStatus)) updateTripStatus('PICKED_UP');
          else if (['reached_drop', 'REACHED_DROP'].includes(backendStatus)) updateTripStatus('REACHED_DROP');
          else if (['reached_pickup', 'REACHED_PICKUP'].includes(backendStatus)) updateTripStatus('REACHED_PICKUP');
          else if (['confirmed', 'preparing', 'ready_for_pickup'].includes(backendStatus)) updateTripStatus('PICKING_UP');
        } else {
          // If server says no active order, clear local state
          clearActiveOrder();
        }
      } catch (err) { 
        console.error('Order Sync Failed:', err); 
        clearActiveOrder(); // Safety first
      }
    };
    syncWithServer();
  }, []); // Only on mount to stabilize state

  // 2. Location logic
  useEffect(() => {
    if (!isOnline) {
      deliveryAPI.updateOnlineStatus(false).catch(() => {});
      return;
    }
    deliveryAPI.updateOnlineStatus(true).catch(() => {});
    const watchId = navigator.geolocation.watchPosition((pos) => {
      const { latitude: lat, longitude: lng, heading } = pos.coords;
      setRiderLocation({ lat, lng, heading: heading || 0 });
      const now = Date.now();
      if (now - lastLocationSentAt.current >= 10000) {
        lastLocationSentAt.current = now;
        deliveryAPI.updateLocation(lat, lng, true, { heading: heading || 0 }).catch(() => {});
      }
    }, () => toast.error('GPS Needed!'), { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, setRiderLocation]);

  useEffect(() => { if (newOrder) setIncomingOrder(newOrder); }, [newOrder]);

  useEffect(() => {
    if (orderStatusUpdate) {
      if (orderStatusUpdate.status === 'cancelled') {
        toast.error('Order cancelled');
        resetTrip();
      }
      clearOrderStatusUpdate();
    }
  }, [orderStatusUpdate, resetTrip, clearOrderStatusUpdate]);

  return (
    <div className="relative h-screen w-full bg-white text-gray-900 overflow-hidden flex flex-col">
      {/* ─── 1. TOP HEADER (Fixed) ─── */}
      <div className="absolute top-0 inset-x-0 bg-white/95 backdrop-blur-md shadow-sm z-[200] safe-top pb-3">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full border border-gray-100 p-0.5 shadow-sm overflow-hidden">
                <img src="https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png" alt="Profile" className="w-full h-full object-cover rounded-full" />
             </div>
             <button 
               onClick={toggleOnline}
               className={`relative w-[110px] h-10 rounded-full p-1 transition-all duration-500 flex items-center ${isOnline ? 'bg-green-500 shadow-lg shadow-green-500/20' : 'bg-gray-200'}`}
             >
               <div className={`flex items-center justify-between w-full px-2 text-[10px] font-bold uppercase tracking-widest ${isOnline ? 'text-white' : 'text-gray-400'}`}>
                 <span>{isOnline ? 'Online' : ''}</span>
                 <span>{!isOnline ? 'Offline' : ''}</span>
               </div>
               <motion.div animate={{ x: isOnline ? 68 : 0 }} className="absolute left-1 w-8 h-8 bg-white rounded-full shadow-md" />
             </button>
          </div>
          <div className="flex items-center gap-3">
             <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-orange-500 border border-gray-100"><AlertTriangle className="w-5 h-5" /></button>
             <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 border border-gray-100"><HelpCircle className="w-5 h-5" /></button>
             <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-950 border border-gray-100"><Headset className="w-5 h-5" /></button>
          </div>
        </div>

        {/* ORANGE BANNER (Only on Feed) */}
        {currentTab === 'feed' && (
          <div className="px-4">
             <div className="bg-orange-500 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-orange-500/20 relative overflow-hidden">
                <div className="flex items-center gap-4 z-10">
                   <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg"><Wallet className="w-6 h-6 text-white" /></div>
                   <div>
                      <h3 className="text-white font-bold text-sm uppercase">Trip summary</h3>
                      <p className="text-white/80 text-[10px] font-medium">Review your earnings</p>
                   </div>
                </div>
                <button onClick={() => setCurrentTab('history')} className="bg-yellow-400 text-gray-950 px-5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg">View</button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-black w-4 transition-all" />
                   <div className="w-1.5 h-1.5 rounded-full bg-white/40 transition-all" />
                </div>
             </div>
          </div>
        )}
      </div>

      {/* ─── 2. MAIN CONTENT ─── */}
      <div className="flex-1 relative overflow-y-auto pt-[160px] no-scrollbar">
         {currentTab === 'feed' ? (
           <div className="absolute inset-0 top-[-160px]">
             <LiveMap />
             <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
                <div className="flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                   <button className="p-3 hover:bg-gray-50 border-b border-gray-50 text-gray-400"><Plus className="w-6 h-6" /></button>
                   <button className="p-3 hover:bg-gray-50 text-gray-400"><Minus className="w-6 h-6" /></button>
                </div>
                <button className="w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center text-green-500 border border-gray-100"><div className="w-8 h-8 rounded-full border-2 border-green-500 flex items-center justify-center"><Play className="w-4 h-4 fill-current ml-0.5" /></div></button>
                <button className="w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center text-blue-600 border border-gray-100"><div className="w-8 h-8 rounded-full border-2 border-blue-600 flex items-center justify-center"><Navigation2 className="w-4 h-4" /></div></button>
                <button className="w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center text-gray-900 border border-gray-100 group active:scale-90 transition-all"><Target className="w-7 h-7" /></button>
             </div>
           </div>
         ) : currentTab === 'pocket' ? (
           <PocketV2 />
         ) : currentTab === 'history' ? (
           <HistoryV2 />
         ) : (
           <ProfileV2 />
         )}

         {/* OVERLAYS (Persistent if active) */}
         {(currentTab === 'feed' || activeOrder) && (
           <AnimatePresence>
              {incomingOrder && (
                <NewOrderModal 
                  order={incomingOrder} 
                  onAccept={(o) => { acceptOrder(o); setIncomingOrder(null); clearNewOrder(); }}
                  onReject={() => { setIncomingOrder(null); clearNewOrder(); }}
                />
              )}
              {(tripStatus === 'PICKING_UP' || tripStatus === 'REACHED_PICKUP') && (
                <PickupActionModal 
            order={activeOrder} 
            status={tripStatus} 
            isWithinRange={isWithinRange} 
            onReachedPickup={reachPickup} 
            onPickedUp={(billImageUrl) => pickUpOrder(billImageUrl)} 
          />
              )}
              {(tripStatus === 'PICKED_UP' || tripStatus === 'REACHED_DROP') && (
                <div className="absolute bottom-4 inset-x-0 z-[120] px-4">
                  {tripStatus === 'PICKED_UP' ? (
                    <div className="bg-white rounded-[3rem] p-8 shadow-[0_-20px_80px_rgba(0,0,0,0.4)] border border-gray-100 flex flex-col items-center">
                      <div className="w-12 h-1.5 bg-gray-100 rounded-full mb-6" />
                      <div className="flex justify-between w-full items-center mb-10 px-2 text-left">
                        <div>
                          <h3 className="text-gray-950 text-2xl font-bold uppercase">Handover Drop</h3>
                          <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5 ${isWithinRange ? 'text-green-600' : 'text-orange-500'}`}>
                            {isWithinRange ? 'Ready to Arrive √' : `${(distanceToTarget / 1000).toFixed(1)} km to target`}
                          </p>
                        </div>
                      </div>
                      <ActionSlider label="Slide to Arrive" successLabel="Arrived ✓" disabled={!isWithinRange} onConfirm={reachDrop} color="bg-blue-600" />
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowVerification(true)} 
                      className="w-full bg-green-500 hover:bg-green-600 text-white shadow-xl shadow-green-500/30 rounded-2xl py-5 font-bold text-sm tracking-[0.2em] transform transition-all active:scale-95 flex items-center justify-center gap-3 backdrop-blur-sm"
                    >
                      <CheckCircle2 className="w-6 h-6" /> VERIFY & COMPLETE
                    </button>
                  )}
                </div>
              )}
              {showVerification && (
                <DeliveryVerificationModal 
                  order={activeOrder} 
                  onComplete={(otp) => {
                    setShowVerification(false);
                    completeDelivery(otp);
                  }}
                  onClose={() => setShowVerification(false)}
                />
              )}
              {tripStatus === 'COMPLETED' && <OrderSummaryModal order={activeOrder} onDone={resetTrip} />}
           </AnimatePresence>
         )}
      </div>

      {/* ─── 3. BOTTOM NAV (Fixed) ─── */}
      <div className="bg-white border-t border-gray-100 px-6 py-4 pb-8 flex justify-between items-center z-[200] shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
         <button onClick={() => setCurrentTab('feed')} className={`flex flex-col items-center gap-1.5 transition-all font-bold ${currentTab === 'feed' ? 'text-gray-950' : 'text-gray-400'}`}>
            <LayoutGrid className="w-7 h-7" /><span className="text-[10px] uppercase tracking-widest">Feed</span>
         </button>
         <button onClick={() => setCurrentTab('pocket')} className={`flex flex-col items-center gap-1.5 transition-all font-bold ${currentTab === 'pocket' ? 'text-gray-950' : 'text-gray-400'}`}>
            <Wallet className="w-7 h-7" /><span className="text-[10px] uppercase tracking-widest">Pocket</span>
         </button>
         <button onClick={() => setCurrentTab('history')} className={`flex flex-col items-center gap-1.5 transition-all font-bold ${currentTab === 'history' ? 'text-gray-950' : 'text-gray-400'}`}>
            <History className="w-7 h-7" /><span className="text-[10px] uppercase tracking-widest">History</span>
         </button>
         <button onClick={() => setCurrentTab('profile')} className={`flex flex-col items-center gap-1.5 transition-all font-bold ${currentTab === 'profile' ? 'text-gray-950' : 'text-gray-400'}`}>
            <UserIcon className="w-7 h-7" /><span className="text-[10px] uppercase tracking-widest">Profile</span>
         </button>
      </div>
    </div>
  );
}
