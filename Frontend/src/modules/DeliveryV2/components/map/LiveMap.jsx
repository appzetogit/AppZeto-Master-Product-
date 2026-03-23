import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  GoogleMap, 
  Marker, 
  DirectionsService, 
  DirectionsRenderer,
  Polygon,
  useJsApiLoader
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

export const LiveMap = () => {
  const { riderLocation, activeOrder, tripStatus } = useDeliveryStore();
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  const [directions, setDirections] = useState(null);
  const [map, setMap] = useState(null);
  const [zones, setZones] = useState([]);

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

  const directionsCallback = useCallback((res) => {
    if (res !== null && res.status === 'OK') {
      setDirections(res);
    }
  }, []);

  const parsedRiderLocation = useMemo(() => {
    if (!riderLocation) return null;
    const lat = parseFloat(riderLocation.lat || riderLocation.latitude);
    const lng = parseFloat(riderLocation.lng || riderLocation.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng, heading: parseFloat(riderLocation.heading || 0) };
    }
    return null;
  }, [riderLocation]);

  const mapCenter = parsedRiderLocation || { lat: 23.2599, lng: 77.4126 };

  useEffect(() => {
    if (map && parsedRiderLocation && targetLocation && isLoaded) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(parsedRiderLocation);
      bounds.extend(targetLocation);
      map.fitBounds(bounds, { top: 120, bottom: 320, left: 60, right: 60 });
    }
  }, [map, parsedRiderLocation, targetLocation, isLoaded]);

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
        onLoad={setMap}
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={14}
        options={mapOptions}
      >
        {parsedRiderLocation && targetLocation && (
          <DirectionsService
            options={{
              origin: parsedRiderLocation,
              destination: targetLocation,
              travelMode: 'DRIVING',
            }}
            callback={directionsCallback}
          />
        )}

        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#22c55e',
                strokeOpacity: 0.8,
                strokeWeight: 6,
              }
            }}
          />
        )}

        {parsedRiderLocation && (
          <Marker
            position={parsedRiderLocation}
            icon={{
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: "#000000",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#ffffff",
              rotation: parsedRiderLocation.heading || 0,
            }}
          />
        )}

        {targetLocation && (
          <Marker
            position={targetLocation}
            icon={{
              url: (tripStatus === 'PICKING_UP' || tripStatus === 'REACHED_PICKUP') 
                ? 'https://cdn-icons-png.flaticon.com/512/3170/3170733.png'
                : 'https://cdn-icons-png.flaticon.com/512/1275/1275302.png',
              scaledSize: new window.google.maps.Size(40, 40),
              anchor: new window.google.maps.Point(20, 20),
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
