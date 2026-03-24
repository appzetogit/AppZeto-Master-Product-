import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  GoogleMap, 
  useJsApiLoader, 
  Marker, 
  OverlayView, 
  DirectionsService, 
  DirectionsRenderer,
  Polyline
} from '@react-google-maps/api';
import io from 'socket.io-client';
import { API_BASE_URL } from '@food/api/config';
import bikeLogo from '@food/assets/bikelogo.png';
import { subscribeOrderTracking } from '@food/realtimeTracking';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Navigation, Info } from 'lucide-react';

const LIBRARIES = ['geometry', 'places'];

const RIDER_BIKE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
  <circle cx="30" cy="30" r="28" fill="white" stroke="#ff8100" stroke-width="4" />
  <g transform="translate(15, 15) scale(1.2)">
    <path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65l-2.13 1.52c-.31.22-.5.57-.5.95V13h-4.4a2 2 0 00-1.92 1.45L6 20H2v2h4.5c1.07 0 1.97-.85 1.97-1.97V20l.4-1.2h3.13l.4 1.2c.4 1.2 1.5 2 2.77 2h.3c1.07 0 1.97-.85 1.97-1.97V20l-.4-1.2H14.1l-.33-1H18v-2h-2.17l-.67-2H18c1.1 0 2-.9 2-2V7h-1zM7 18h-.5C5.67 18 5 17.33 5 16.5S5.67 15 6.5 15H7v3zm8.5 0h-.5V15h.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" fill="#ff8100" />
  </g>
</svg>`;

const RESTAURANT_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#FF6B35">
  <path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/>
  <circle cx="12" cy="9" r="3" fill="#FFFFFF"/>
</svg>`;

const CUSTOMER_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#10B981">
  <path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/>
  <circle cx="12" cy="9" r="3" fill="#FFFFFF"/>
</svg>`;

const debugLog = (...args) => console.log('[DeliveryTrackingMap]', ...args);

const DeliveryTrackingMap = ({
  orderId,
  orderTrackingIds = [],
  restaurantCoords,
  customerCoords,
  order = null,
  onEtaUpdate = null
}) => {
  const [map, setMap] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [baselineDirections, setBaselineDirections] = useState(null);
  const [lastDirectionsAt, setLastDirectionsAt] = useState(0);
  const [currentEta, setCurrentEta] = useState(null);
  const [cloudPolyline, setCloudPolyline] = useState(null);
  const socketRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const trackingIds = useMemo(() => {
    const ids = [orderId, ...(Array.isArray(orderTrackingIds) ? orderTrackingIds : [])]
      .map(id => String(id || '').trim())
      .filter(Boolean);
    return [...new Set(ids)];
  }, [orderId, orderTrackingIds]);

  const backendUrl = useMemo(() => {
    return (API_BASE_URL || '').replace(/\/api\/v1\/?$/i, '').replace(/\/api\/?$/i, '');
  }, []);

  // 1. Initial State from Order Payload
  useEffect(() => {
    const loc = order?.deliveryState?.currentLocation;
    if (loc && !riderLocation) {
      const lat = typeof loc.lat === 'number' ? loc.lat : (Array.isArray(loc.coordinates) ? Number(loc.coordinates[1]) : null);
      const lng = typeof loc.lng === 'number' ? loc.lng : (Array.isArray(loc.coordinates) ? Number(loc.coordinates[0]) : null);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setRiderLocation({ lat, lng, heading: loc.bearing || loc.heading || 0 });
      }
    }
  }, [order, riderLocation]);

  // 2. Core Data Sync (Socket + Firebase)
  useEffect(() => {
    if (!trackingIds.length) return;

    // A. FIREBASE FALLBACK
    const unsubs = trackingIds.map(id => subscribeOrderTracking(id, (data) => {
      const lat = Number(data?.lat ?? data?.boy_lat);
      const lng = Number(data?.lng ?? data?.boy_lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setRiderLocation(prev => ({
          lat,
          lng,
          heading: Number(data?.heading ?? data?.bearing ?? prev?.heading ?? 0)
        }));
      }

      // Sync Cloud Polyline and ETA to eliminate Directions API usage on user side
      if (data?.polyline) {
        setCloudPolyline(data.polyline);
      }
      if (data?.eta) {
        setCurrentEta(data.eta);
        if (onEtaUpdate) onEtaUpdate(data.eta);
      }
    }));

    // B. SOCKET.IO REALTIME
    const token = localStorage.getItem('user_accessToken') || localStorage.getItem('accessToken') || '';
    socketRef.current = io(backendUrl, {
      transports: ['websocket'],
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      trackingIds.forEach(id => socketRef.current.emit('join-tracking', id));
    });

    socketRef.current.on('location-update', (data) => {
      if (data && trackingIds.includes(data.orderId) && typeof data.lat === 'number') {
        setRiderLocation({
          lat: data.lat,
          lng: data.lng,
          heading: data.heading || data.bearing || 0
        });
      }
    });

    return () => {
      unsubs.forEach(u => u?.());
      socketRef.current?.disconnect();
    };
  }, [trackingIds, backendUrl]);

  // 2. Pro Camera: Keep everyone in view (Rider + Restaurant + Customer)
  useEffect(() => {
    if (!map || !restaurantCoords || !customerCoords) return;

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(restaurantCoords);
    bounds.extend(customerCoords);
    if (riderLocation) bounds.extend(riderLocation);

    // Apply fitBounds with generous padding for a professional overview
    map.fitBounds(bounds, { 
      top: 100, 
      bottom: 120, 
      left: 50, 
      right: 50 
    });
    
    debugLog('?? Auto-fitting camera to polyline bounds');
  }, [map, riderLocation, restaurantCoords, customerCoords]);

  // 3. Directions Management
  const tripStatus = order?.status || order?.orderStatus || 'pending';
  const isOrderPickedUp = ['picked_up', 'out_for_delivery', 'delivered'].includes(tripStatus.toLowerCase());

  const directionsCallback = useCallback((result, status) => {
    if (status === 'OK' && result) {
      setDirections(result);
      setLastDirectionsAt(Date.now());
      
      // Extract ETA from directions
      const durationText = result?.routes?.[0]?.legs?.[0]?.duration?.text;
      if (durationText) {
        setCurrentEta(durationText);
        if (onEtaUpdate) {
          onEtaUpdate(durationText);
        }
      }
    }
  }, [onEtaUpdate]);

  const shouldUpdateRoute = useMemo(() => {
    if (!directions) return true;
    return Date.now() - lastDirectionsAt > 15000;
  }, [directions, lastDirectionsAt]);

  if (!isLoaded) return <div className="w-full h-full bg-gray-100 animate-pulse" />;

  const center = riderLocation || {
    lat: (restaurantCoords.lat + customerCoords.lat) / 2,
    lng: (restaurantCoords.lng + customerCoords.lng) / 2
  };

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl shadow-inner border border-gray-100">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={15}
        onLoad={setMap}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] }
          ]
        }}
      >
        {/* 1. PERSISTENT BASELINE (Full journey: Restaurant -> Customer) */}
        {!baselineDirections && restaurantCoords && customerCoords && (
           <DirectionsService
             options={{
               origin: restaurantCoords,
               destination: customerCoords,
               travelMode: 'DRIVING'
             }}
             callback={(r, s) => { 
                if (s === 'OK' && r) setBaselineDirections(r); 
             }}
           />
        )}

        {baselineDirections && (
          <DirectionsRenderer
            directions={baselineDirections}
            options={{
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: {
                strokeColor: '#cbd5e1', 
                strokeOpacity: 0.6,
                strokeWeight: 4,
                zIndex: 1,
                icons: [{
                  icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 },
                  offset: '0',
                  repeat: '12px'
                }]
              }
            }}
          />
        )}

        {/* 2. LIVE RIDER LEG (From Rider's App: Current Rider Pos -> Target) */}
        {cloudPolyline && window.google?.maps?.geometry?.encoding && (
          <Polyline
            path={window.google.maps.geometry.encoding.decodePath(
              typeof cloudPolyline === 'string' ? cloudPolyline : (cloudPolyline.points || '')
            )}
            options={{
              strokeColor: isOrderPickedUp ? '#3b82f6' : '#22c55e',
              strokeWeight: 6,
              strokeOpacity: 1,
              zIndex: 10
            }}
          />
        )}

        {/* INACTIVE LIVE DIRECTIONS (Disabled to lower Map Key usage) */}
        {/*
          {riderLocation && !cloudPolyline && (
            <DirectionsService
              options={{ origin: riderLocation, destination: isOrderPickedUp ? customerCoords : restaurantCoords, travelMode: 'DRIVING' }}
              callback={shouldUpdateRoute ? directionsCallback : undefined}
            />
          )}

          {directions && !cloudPolyline && (
            <DirectionsRenderer
              directions={directions}
              options={{ ... }}
            />
          )}
        */}

        {/* RESTAURANT PIN (OVERLAY VIEW FOR CUSTOM STLYE) */}
        <OverlayView
          position={restaurantCoords}
          mapPaneName={OverlayView.MARKER_LAYER}
        >
          <div className="relative -translate-x-1/2 -translate-y-full mb-1 group">
             <div className="w-11 h-11 rounded-full p-1 bg-white shadow-xl border-2 border-orange-500 overflow-hidden group-hover:scale-110 transition-transform">
                <img 
                  src={order?.restaurantLogo || order?.restaurantId?.logo || order?.restaurantId?.profileImage || `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(RESTAURANT_PIN_SVG)}`}
                  alt="Restaurant"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => { e.target.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(RESTAURANT_PIN_SVG)}`; }}
                />
             </div>
             {/* Pin Tip */}
             <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-3 h-3 bg-orange-500 clip-triangle rotate-180 -mt-1 shadow-sm" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
          </div>
        </OverlayView>

        {/* CUSTOMER PIN (OVERLAY VIEW FOR CUSTOM STYLE) */}
        <OverlayView
          position={customerCoords}
          mapPaneName={OverlayView.MARKER_LAYER}
        >
          <div className="relative -translate-x-1/2 -translate-y-full mb-1 group">
             <div className="w-11 h-11 rounded-full p-1 bg-white shadow-xl border-2 border-green-500 overflow-hidden group-hover:scale-110 transition-transform">
                <img 
                  src={order?.customerImage || order?.userId?.profileImage || order?.userId?.avatar || `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(CUSTOMER_PIN_SVG)}`}
                  alt="Me"
                  className="w-full h-full object-cover rounded-full bg-gray-50"
                  onError={(e) => { e.target.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(CUSTOMER_PIN_SVG)}`; }}
                />
             </div>
             {/* Pin Tip */}
             <div className="absolute top-[100%] left-1/2 -translate-x-1/2 w-3 h-3 bg-green-500 clip-triangle rotate-180 -mt-1 shadow-sm" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
          </div>
        </OverlayView>

        {/* PRO RIDER (OVERLAY VIEW FOR SMOOTH ROTATION / GLIDE) */}
        {riderLocation && (
          <OverlayView
            position={riderLocation}
            mapPaneName={OverlayView.MARKER_LAYER}
          >
            <div 
              style={{
                transform: `translate(-50%, -50%) rotate(${riderLocation.heading || 0}deg)`,
                transition: 'all 0.8s linear', // SILKY SMOOTH GLIDE
              }}
              className="relative w-16 h-16"
            >
              <img 
                src="/MapRider.png" 
                alt="Rider" 
                className="w-full h-full object-contain drop-shadow-2xl"
                onError={(e) => {
                  e.target.src = bikeLogo;
                }}
              />
            </div>
          </OverlayView>
        )}
      </GoogleMap>

      {/* 4. LIVE ARRIVAL BADGE (Pro Orange) */}
      <AnimatePresence>
        {riderLocation && currentEta && (
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute top-4 left-4 z-[150] pointer-events-none"
          >
            <div className="bg-orange-500/95 backdrop-blur-xl rounded-2xl p-3 shadow-[0_10px_30px_rgba(249,115,22,0.4)] border border-orange-400/50 flex flex-col min-w-[90px] group overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              <div className="flex flex-col z-10">
                <span className="text-[9px] text-white/80 font-black uppercase tracking-[0.2em] mb-0.5">Arrival</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white leading-none tracking-tighter">
                    {currentEta}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-80">
                     <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                     <Navigation className="w-3 h-3 text-white rotate-45" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryTrackingMap;
