import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
  GoogleMap, 
  Marker, 
  DirectionsService, 
  DirectionsRenderer,
  Polygon,
  useJsApiLoader,
  OverlayView
} from '@react-google-maps/api';
import { useDeliveryStore } from '@/modules/DeliveryV2/store/useDeliveryStore';
import { zoneAPI } from '@food/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  position: 'absolute',
  inset: 0
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  scaleControl: false,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
  ]
};
const LIBRARIES = ['places', 'geometry'];

export const LiveMap = ({ onMapClick, onMapLoad, onPathReceived, onPolylineReceived, zoom = 12 }) => {
  const { riderLocation, activeOrder, tripStatus } = useDeliveryStore();
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  const [directions, setDirections] = useState(null);
  const [map, setMapInternal] = useState(null);
  const [zones, setZones] = useState([]);
  const [lastDirectionsAt, setLastDirectionsAt] = useState(0);

  const handleMapLoad = (mapInstance) => {
    setMapInternal(mapInstance);
    if (onMapLoad) onMapLoad(mapInstance);
  };

  // Force an instant update whenever the trip status or target changes (e.g., just accepted or just picked up)
  useEffect(() => {
    console.log('[LiveMap] Trip Status Change:', tripStatus, 'For Order:', activeOrder?.orderId || activeOrder?._id);
    setLastDirectionsAt(0);
    setDirections(null);
  }, [tripStatus, activeOrder?._id]);

  // Dynamic Location Parsing (Must be defined BEFORE Throttling logic)
  const targetLocation = useMemo(() => {
    if (!activeOrder) return null;

    let rawLoc = null;
    if (tripStatus === 'PICKING_UP' || tripStatus === 'REACHED_PICKUP') {
      rawLoc = activeOrder.restaurantLocation;
    } else if (tripStatus === 'PICKED_UP' || tripStatus === 'REACHED_DROP') {
      rawLoc = activeOrder.customerLocation;
    }

    if (!rawLoc) return null;

    // Safely parse so Google Maps strict validation doesn't crash on null/string
    const lat = parseFloat(rawLoc.lat || rawLoc.latitude);
    const lng = parseFloat(rawLoc.lng || rawLoc.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    
    return null;
  }, [activeOrder, tripStatus]);

  const parsedRiderLocation = useMemo(() => {
    if (!riderLocation) return null;
    const lat = parseFloat(riderLocation.lat || riderLocation.latitude);
    const lng = parseFloat(riderLocation.lng || riderLocation.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng, heading: parseFloat(riderLocation.heading || 0) };
    }
    return null;
  }, [riderLocation]);

  // Handle Dynamic Zoom
  useEffect(() => {
    if (map) map.setZoom(zoom);
  }, [zoom, map]);

  // Pro Intelligent Throttling: Dynamically adjust API ping frequency based on rider proximity
  const shouldUpdateRoute = useMemo(() => {
    const now = Date.now();
    if (!directions) return true; // Always fetch if no line exists

    // Default: 20s (Mid-range)
    let throttleMs = 20000;

    if (parsedRiderLocation && targetLocation && window.google) {
      try {
        const p1 = new window.google.maps.LatLng(parsedRiderLocation.lat, parsedRiderLocation.lng);
        const p2 = new window.google.maps.LatLng(targetLocation.lat, targetLocation.lng);
        const dist = window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);

        if (dist > 2000) {
          // FAR (> 2km): Update every 60s to save huge cost/battery
          throttleMs = 60000;
        } else if (dist > 500) {
          // MID (500m - 2km): Update every 20s
          throttleMs = 20000;
        } else {
          // NEAR (< 500m): High-precision update every 5s for the "Final Glide"
          throttleMs = 5000;
        }
      } catch (e) {
        console.warn('[LiveMap] Proximity calculation failed, using default throttle:', e);
      }
    }

    const elapsed = now - lastDirectionsAt;
    const isDue = elapsed >= throttleMs;
    
    if (isDue) {
      console.log(`[LiveMap] Pro Sync Triggered | Dist-Throttle: ${throttleMs / 1000}s | Due √`);
    }
    
    return isDue;
  }, [lastDirectionsAt, directions, parsedRiderLocation, targetLocation]);

  // Re-sync path whenever directions change or callback is updated
  useEffect(() => {
    if (directions && onPathReceived) {
      const path = directions.routes[0]?.overview_path;
      if (path) {
        const simplePath = path.map(p => ({
          lat: typeof p.lat === 'function' ? p.lat() : (p.lat || p.latitude),
          lng: typeof p.lng === 'function' ? p.lng() : (p.lng || p.longitude)
        }));
        console.log('[LiveMap] Syncing Path to Parent:', simplePath.length, 'points');
        onPathReceived(simplePath);
      }
    }
  }, [directions, onPathReceived]);

  const directionsCallback = useCallback((result, status) => {
    console.log('[LiveMap] Directions API Callback:', status, result ? 'Data Received √' : 'No Data');
    if (status === 'OK' && result) {
      setDirections(result);
      setLastDirectionsAt(Date.now());
      
      // Emit encoded polyline for Firebase synchronization to lower API usage
      const encodedPolyline = result.routes[0]?.overview_polyline;
      if (encodedPolyline && onPolylineReceived) {
        onPolylineReceived(encodedPolyline);
      }
    } else if (status === 'OVER_QUERY_LIMIT') {
      console.warn('[LiveMap] Google Maps API Quota Reached. Slowing down...');
    } else {
      console.error('[LiveMap] Directions request failed:', status);
    }
  }, []);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await zoneAPI.getPublicZones();
        if (response?.data?.success && response.data.data?.zones) {
          // Transform {latitude, longitude} to {lat, lng} for Google Maps Polygon
          const formattedZones = response.data.data.zones.map(zone => ({
            ...zone,
            paths: (zone.coordinates || []).map(coord => ({
              lat: coord.latitude,
              lng: coord.longitude
            }))
          })).filter(z => z.paths.length >= 3);
          setZones(formattedZones);
        }
      } catch (err) {
        console.error('Failed to fetch zones for map:', err);
      }
    };
    fetchZones();
  }, []);


  // Branded Marker Icons
  const restaurantMarkerUrl = useMemo(() => {
    if (!activeOrder) return 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png';
    return activeOrder.restaurantImage || activeOrder.restaurant?.logo || activeOrder.restaurant?.profileImage || 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png';
  }, [activeOrder]);

  const customerMarkerUrl = useMemo(() => {
    if (!activeOrder) return 'https://cdn-icons-png.flaticon.com/512/1275/1275302.png';
    return activeOrder.customerImage || activeOrder.user?.logo || activeOrder.user?.profileImage || 'https://cdn-icons-png.flaticon.com/512/1275/1275302.png';
  }, [activeOrder]);

  // Stable Midpoint calculation to keep BOTH rider and destination framed
  const mapCenter = useMemo(() => {
    if (!parsedRiderLocation) return { lat: 23.2599, lng: 77.4126 };
    if (!targetLocation) return parsedRiderLocation;

    return {
      lat: (parsedRiderLocation.lat + targetLocation.lat) / 2,
      lng: (parsedRiderLocation.lng + targetLocation.lng) / 2
    };
  }, [parsedRiderLocation?.lat, parsedRiderLocation?.lng, targetLocation?.lat, targetLocation?.lng]);

  const lastBoundsSyncRef = useRef(null); 
  useEffect(() => {
    if (map && parsedRiderLocation && targetLocation && isLoaded) {
      const now = Date.now();
      const syncKey = `${activeOrder?._id}-${tripStatus}`;
      const isDue = (now - (lastBoundsSyncRef.current?.time || 0)) > 20000;
      const keyChanged = lastBoundsSyncRef.current?.key !== syncKey;

      if (isDue || keyChanged) {
        lastBoundsSyncRef.current = { time: now, key: syncKey };
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(parsedRiderLocation);
        bounds.extend(targetLocation);
        map.fitBounds(bounds, { top: 120, bottom: 280, left: 60, right: 60 });
      }
    }
  }, [map, parsedRiderLocation, targetLocation, isLoaded, activeOrder?._id, tripStatus]);

  const directionsServiceOptions = useMemo(() => {
    if (!parsedRiderLocation || !targetLocation) return null;
    return {
      origin: parsedRiderLocation,
      destination: targetLocation,
      travelMode: 'DRIVING',
    };
  }, [parsedRiderLocation?.lat, parsedRiderLocation?.lng, targetLocation?.lat, targetLocation?.lng]);

  const directionsRendererOptions = useMemo(() => ({
    suppressMarkers: true,
    preserveViewport: true,
    polylineOptions: {
      strokeColor: '#22c55e',
      strokeOpacity: 0.8,
      strokeWeight: 6,
      strokePosition: 2 // ABOVE_ROAD
    }
  }), []);

  if (loadError) return <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-red-500 font-bold">Map Load Error</div>;
  if (!isLoaded) return <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
     <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Loading Map Service</span>
     </div>
  </div>;

  return (
    <div className="absolute inset-0 z-0">
      <GoogleMap
        onLoad={handleMapLoad}
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={14}
        onClick={(e) => onMapClick?.(e.latLng.lat(), e.latLng.lng())}
        options={mapOptions}
      >
        {directionsServiceOptions && shouldUpdateRoute && (
          <DirectionsService
            options={directionsServiceOptions}
            callback={directionsCallback}
          />
        )}

        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={directionsRendererOptions}
          />
        )}

        {parsedRiderLocation && (
          <OverlayView
            position={parsedRiderLocation}
            mapPaneName={OverlayView.MARKER_LAYER}
          >
            <div 
              style={{
                transform: `translate(-50%, -50%) rotate(${parsedRiderLocation.heading || 0}deg)`,
                transition: 'transform 0.5s linear',
              }}
              className="relative w-[72px] h-[72px]"
            >
              <img 
                src="/MapRider.png" 
                alt="Rider" 
                className="w-full h-full object-contain"
              />
            </div>
          </OverlayView>
        )}

        {/* Dynamic Branded Destination Marker */}
        {targetLocation && (
          <Marker
            position={targetLocation}
            icon={{
              url: (tripStatus === 'PICKING_UP' || tripStatus === 'REACHED_PICKUP') 
                ? restaurantMarkerUrl
                : customerMarkerUrl,
              scaledSize: new window.google.maps.Size(44, 44),
              anchor: new window.google.maps.Point(22, 22),
            }}
          />
        )}

        {/* Delivery Zones */}
        {zones.map((zone) => (
          <Polygon
            key={zone._id}
            paths={zone.paths}
            options={{
              fillColor: "#22c55e",
              fillOpacity: 0.05,
              strokeColor: "#22c55e",
              strokeOpacity: 0.4,
              strokeWeight: 2,
              clickable: false,
              zIndex: 1
            }}
          />
        ))}
      </GoogleMap>
    </div>
  );
};

export default LiveMap;
