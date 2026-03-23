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
  Plus, Minus, Navigation2, Target, Play, CheckCircle2
} from 'lucide-react';

import { getHaversineDistance, calculateETA, calculateHeading } from '@/modules/DeliveryV2/utils/geo';

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
  const [isModalMinimized, setIsModalMinimized] = useState(false);
  const [eta, setEta] = useState(null);
  const lastLocationSentAt = useRef(0);
  const lastCoordRef = useRef(null);
  const rollingSpeedRef = useRef([]);
  const lastAutoArrivalRef = useRef({ PICKING_UP: false, PICKED_UP: false });

  const [zoom, setZoom] = useState(14);
  const [isSimMode, setIsSimMode] = useState(false);
  const [simPath, setSimPath] = useState([]);
  const [simIndex, setSimIndex] = useState(0);
  const [simProgress, setSimProgress] = useState(0); // 0 to 1 between points
  const mapRef = useRef(null);

  // 0. Auto-Simulation Effect (High-Precision Smooth Glide)
  useEffect(() => {
    let interval;
    if (isSimMode && simPath.length > 1 && simIndex < simPath.length - 1) {
      console.log('[SimAuto] Glide Active √');
      
      interval = setInterval(() => {
        setSimProgress(prev => {
          const nextProgress = prev + 0.08; // 8% movement per tick
          
          if (nextProgress >= 1) {
            setSimIndex(idx => idx + 1);
            return 0; // Move to next segment
          }

          const currentPoint = simPath[simIndex];
          const nextPoint = simPath[simIndex + 1];

          if (currentPoint && nextPoint) {
            // Linear Interpolation (LERP)
            const lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * nextProgress;
            const lng = currentPoint.lng + (nextPoint.lng - currentPoint.lng) * nextProgress;
            const heading = calculateHeading(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng);

            setRiderLocation({ lat, lng, heading });

            if (mapRef.current) {
              mapRef.current.panTo({ lat, lng });
            }
          }
          return nextProgress;
        });
      }, 50); // 20 FPS movement
    }
    return () => clearInterval(interval);
  }, [isSimMode, simPath, simIndex]);

  // Reset simulation when path, order or mode changes
  useEffect(() => {
    if (isSimMode) {
      console.log('[SimAuto] Resetting simulation playhead...');
      setSimIndex(0);
      setSimProgress(0);
    }
  }, [simPath, tripStatus, isSimMode]);

  // Auto-restore modal when status or content changes

  // Auto-restore modal when status or content changes
  useEffect(() => {
    setIsModalMinimized(false);
  }, [tripStatus, showVerification, incomingOrder]);

  // 1. Initial Sync (Force sync with server to avoid 'stuck' persistent state)
  useEffect(() => {
    const syncWithServer = async () => {
      try {
        const response = await deliveryAPI.getCurrentDelivery();
        const rawData = response?.data?.data?.activeOrder || response?.data?.data;
        const serverData = (rawData && (rawData._id || rawData.orderId)) ? rawData : null;
        
        if (serverData) {
          // Robust location mapping (Same as acceptOrder logic)
          const getLoc = (ref, keysLat, keysLng) => {
            if (!ref) return null;
            if (ref.location) {
              if (Array.isArray(ref.location.coordinates) && ref.location.coordinates.length >= 2) {
                return {
                  lat: ref.location.coordinates[1],
                  lng: ref.location.coordinates[0]
                };
              }
              return {
                lat: ref.location.latitude || ref.location.lat,
                lng: ref.location.longitude || ref.location.lng
              };
            }
            for (const k of keysLat) { if (ref[k] != null) return { lat: ref[k], lng: ref[keysLng[keysLat.indexOf(k)]] }; }
            return null;
          };

          const resLoc = getLoc(serverData.restaurantId, ['latitude', 'lat'], ['longitude', 'lng']) || 
                         getLoc(serverData, ['restaurant_lat', 'restaurantLat', 'latitude'], ['restaurant_lng', 'restaurantLng', 'longitude']);
                         
          const cusLoc = getLoc(serverData.deliveryAddress, ['latitude', 'lat'], ['longitude', 'lng']) || 
                         getLoc(serverData, ['customer_lat', 'customerLat', 'latitude'], ['customer_lng', 'customerLng', 'longitude']);

          const syncedOrder = {
            ...serverData,
            restaurantLocation: resLoc,
            customerLocation: cusLoc
          };

          setActiveOrder(syncedOrder);
          
          const backendStatus = serverData.deliveryStatus || serverData.orderState?.status || serverData.orderStatus || serverData.status;
          const currentPhase = serverData.deliveryState?.currentPhase;

          if (currentPhase === 'at_drop' || ['reached_drop', 'REACHED_DROP'].includes(backendStatus)) updateTripStatus('REACHED_DROP');
          else if (['picked_up', 'PICKED_UP', 'delivering'].includes(backendStatus)) updateTripStatus('PICKED_UP');
          else if (currentPhase === 'at_pickup' || ['reached_pickup', 'REACHED_PICKUP'].includes(backendStatus)) updateTripStatus('REACHED_PICKUP');
          else if (['confirmed', 'preparing', 'ready_for_pickup'].includes(backendStatus)) updateTripStatus('PICKING_UP');
        } else {
          clearActiveOrder();
        }
      } catch (err) { 
        console.error('Order Sync Failed:', err); 
        clearActiveOrder();
      }
    };
    syncWithServer();
  }, []); // Only on mount to stabilize state

  // 2. Online/Offline Status Sync (Low Frequency)
  useEffect(() => {
    deliveryAPI.updateOnlineStatus(isOnline).catch(() => {});
  }, [isOnline]);

  // 3. Location logic (Smart Frequency Tracking)
  useEffect(() => {
    if (!isOnline) {
      return;
    }
    
    const watchId = navigator.geolocation.watchPosition((pos) => {
      // CRITICAL: In Simulation Mode, we disable actual GPS to prevent overwriting our test position
      if (isSimMode) return;
      
      const { latitude: lat, longitude: lng, heading, speed } = pos.coords;
      const now = Date.now();
      
      const currentRiderPos = { lat, lng, heading: heading || 0 };
      setRiderLocation(currentRiderPos);
      
      // Calculate Rolling Average Speed for Smart ETA
      if (speed && speed > 0) {
        rollingSpeedRef.current = [...rollingSpeedRef.current.slice(-4), speed]; // keep last 5 points
      }
      
      const avgSpeed = rollingSpeedRef.current.length > 0 
        ? rollingSpeedRef.current.reduce((a, b) => a + b, 0) / rollingSpeedRef.current.length 
        : speed || 0;

      // Update ETA
      if (distanceToTarget) {
        setEta(calculateETA(distanceToTarget, avgSpeed));
      }

      // Phase 11: Geo-fencing Auto-arrival (within 100m)
      if (distanceToTarget && distanceToTarget <= 100 && !lastAutoArrivalRef.current[tripStatus]) {
        if (tripStatus === 'PICKING_UP') {
          lastAutoArrivalRef.current[tripStatus] = true;
          reachPickup().catch(() => { lastAutoArrivalRef.current[tripStatus] = false; });
          toast.success('Auto-arrived at Restaurant');
        } else if (tripStatus === 'PICKED_UP') {
          lastAutoArrivalRef.current[tripStatus] = true;
          reachDrop().catch(() => { lastAutoArrivalRef.current[tripStatus] = false; });
          toast.success('Auto-arrived at Customer');
        }
      }

      // Reset auto-arrival flag if we move away or status resets (usually handled by component mount, but for safety)
      if (distanceToTarget > 200) {
        lastAutoArrivalRef.current[tripStatus] = false;
      }

      // Check threshold for Sync (distance-based or 7s time-based)
      const distMoved = lastCoordRef.current 
        ? getHaversineDistance(lat, lng, lastCoordRef.current.lat, lastCoordRef.current.lng) 
        : 1000; // assume huge distance if first update

      if (distMoved >= 25 || (now - lastLocationSentAt.current >= 7000)) {
        lastLocationSentAt.current = now;
        lastCoordRef.current = { lat, lng };
        
        deliveryAPI.updateLocation(lat, lng, true, { 
          heading: heading || 0,
          speed: speed || 0,
          accuracy: pos.coords.accuracy 
        }).catch(() => {});
      }
    }, () => toast.error('GPS Needed!'), { 
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000
    });
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, setRiderLocation, isSimMode]);

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


  const handleCenterMap = () => {
    if (mapRef.current && useDeliveryStore.getState().riderLocation) {
      const loc = useDeliveryStore.getState().riderLocation;
      mapRef.current.panTo({ 
        lat: parseFloat(loc.lat || loc.latitude), 
        lng: parseFloat(loc.lng || loc.longitude) 
      });
    }
  };

  const handleMapClick = (lat, lng) => {
    if (activeOrder || incomingOrder || showVerification) {
      setIsModalMinimized(true);
    }
  };

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
             <button onClick={() => toast.info('Safety SOS Notified')} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-orange-500 border border-gray-100 active:scale-95 transition-all"><AlertTriangle className="w-5 h-5" /></button>
             <button onClick={() => toast.info('Support guide opening...')} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 border border-gray-100 active:scale-95 transition-all"><HelpCircle className="w-5 h-5" /></button>
             <button onClick={() => toast.info('Contacting Support...')} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-950 border border-gray-100 active:scale-95 transition-all"><Headset className="w-5 h-5" /></button>
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
                <button onClick={() => setCurrentTab('pocket')} className="bg-yellow-400 text-gray-950 px-5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all">View</button>
             </div>
          </div>
        )}
      </div>

      {/* ─── 2. MAIN CONTENT ─── */}
      <div className="flex-1 relative overflow-y-auto pt-[160px] no-scrollbar">
         {currentTab === 'feed' ? (
           <div className="absolute inset-0 top-[-160px]">
             <LiveMap 
               onMapLoad={(m) => mapRef.current = m}
               onMapClick={handleMapClick}
               onPathReceived={setSimPath}
               zoom={zoom}
             />
             
             {/* SIMULATION INDICATOR */}
             {isSimMode && (
               <div className="absolute top-[180px] left-4 right-4 z-[100] bg-black/80 backdrop-blur-md rounded-xl p-4 border border-white/20 flex items-center justify-between shadow-2xl">
                  <div className="flex items-center gap-4">
                     <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center animate-pulse">
                        <Play className="w-4 h-4 text-white fill-current" />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-orange-500 text-[10px] font-bold uppercase tracking-widest">Auto Navigation Active</span>
                        <span className="text-white text-[11px] font-medium">Following actual road path...</span>
                     </div>
                  </div>
                  <button onClick={() => setIsSimMode(false)} className="bg-white/10 text-white/50 hover:text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/10">Stop</button>
               </div>
             )}

             <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
                <div className="flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                   <button onClick={() => setZoom(z => Math.min(22, z + 1))} className="p-3 hover:bg-gray-50 border-b border-gray-50 text-gray-400 active:scale-90 transition-all"><Plus className="w-6 h-6" /></button>
                   <button onClick={() => setZoom(z => Math.max(8, z - 1))} className="p-3 hover:bg-gray-50 text-gray-400 active:scale-90 transition-all"><Minus className="w-6 h-6" /></button>
                </div>
                <button 
                  onClick={() => {
                    const nextSimState = !isSimMode;
                    setIsSimMode(nextSimState);
                    
                    if (nextSimState) {
                      toast.warning('Simulation Mode Active');
                      // Initialize position if null
                      if (!useDeliveryStore.getState().riderLocation && activeOrder) {
                        const target = activeOrder.restaurantLocation || activeOrder.customerLocation;
                        if (target) {
                          setRiderLocation({ 
                            lat: parseFloat(target.lat || target.latitude) + 0.001, 
                            lng: parseFloat(target.lng || target.longitude) + 0.001, 
                            heading: 0 
                          });
                        }
                      }
                    }
                  }}
                  className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border border-gray-100 transition-all ${isSimMode ? 'bg-orange-500 text-white' : 'bg-white text-green-500'}`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isSimMode ? 'border-white' : 'border-green-500'}`}>
                    <Play className={`w-4 h-4 fill-current ml-0.5 ${isSimMode ? 'animate-pulse' : ''}`} />
                  </div>
                </button>
                <button 
                   onClick={() => mapRef.current?.setOptions({ gestureHandling: 'greedy' })} 
                   className="w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center text-blue-600 border border-gray-100 active:scale-90 transition-all"
                >
                  <div className="w-8 h-8 rounded-full border-2 border-blue-600 flex items-center justify-center"><Navigation2 className="w-4 h-4" /></div>
                </button>
                <button 
                  onClick={handleCenterMap}
                  className="w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center text-gray-900 border border-gray-100 group active:scale-90 transition-all"
                >
                  <Target className="w-7 h-7" />
                </button>
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
      </div>

      {/* OVERLAYS (Persistent if active) - Outside flex container to avoid clipping and z-index issues */}
      {(currentTab === 'feed' || activeOrder) && (
        <AnimatePresence>
          {!isModalMinimized && (
            <motion.div
              key="modal-container"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 top-0 bottom-[92px] z-[300] pointer-events-none flex items-end"
            >
              <div className="w-full pointer-events-auto relative">
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
                    distanceToTarget={distanceToTarget}
                    eta={eta}
                    onReachedPickup={reachPickup} 
                    onPickedUp={(billImageUrl) => pickUpOrder(billImageUrl)} 
                  />
                )}
                {(tripStatus === 'PICKED_UP' || tripStatus === 'REACHED_DROP') && (
                  <div className="absolute bottom-4 inset-x-0 z-[120] px-4">
                    {tripStatus === 'PICKED_UP' ? (
                      <div className="bg-white rounded-[3rem] p-8 shadow-[0_-20px_80px_rgba(0,0,0,0.4)] border border-gray-100 flex flex-col items-center">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-6" />
                        <div className="flex justify-between w-full items-center mb-10 px-2 text-left">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                               <img 
                                 src={activeOrder?.user?.logo || activeOrder?.user?.profileImage || 'https://cdn-icons-png.flaticon.com/512/1275/1275302.png'} 
                                 className="w-full h-full object-cover" 
                                 alt="User"
                               />
                            </div>
                            <div>
                               <h3 className="text-gray-950 text-2xl font-bold uppercase">Handover Drop</h3>
                               <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5 ${isWithinRange ? 'text-green-600' : 'text-orange-500'}`}>
                                 {isWithinRange ? 'Ready - Swipe to Arrive √' : `${(distanceToTarget / 1000).toFixed(1)} km • ${eta || '--'} min Arrival`}
                               </p>
                            </div>
                          </div>
                        </div>
                        <ActionSlider label="Slide to Arrive" successLabel="Arrived ✓" disabled={!isWithinRange} onConfirm={reachDrop} color="bg-blue-600" />
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowVerification(true)} 
                        className="w-full bg-green-500 hover:bg-green-600 text-white shadow-xl shadow-green-500/30 rounded-2xl py-5 font-bold text-sm tracking-[0.2em] transform transition-all active:scale-95 flex items-center justify-center gap-3"
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Floating Minimize/Restore Toggle - Above navbar */}
      {isModalMinimized && (activeOrder || incomingOrder || showVerification) && (
        <motion.div 
           initial={{ y: 100, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           className="fixed bottom-[100px] inset-x-0 z-[300] px-6"
        >
           <button 
             onClick={() => setIsModalMinimized(false)}
             className="w-full bg-gray-900/90 text-white rounded-2xl py-4 flex items-center justify-between px-6 shadow-2xl backdrop-blur-md border border-white/10"
           >
              <div className="flex flex-col items-start gap-0.5">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Order Action Pending</span>
                 <span className="text-xs font-bold uppercase tracking-wider">Tap to open delivery panel</span>
              </div>
              <div className="bg-orange-500 p-2 rounded-xl text-white">
                 <Plus className="w-5 h-5" />
              </div>
           </button>
        </motion.div>
      )}

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
