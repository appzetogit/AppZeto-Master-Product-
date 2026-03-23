import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import io from 'socket.io-client';
import { API_BASE_URL } from '@food/api/config';
import bikeLogo from '@food/assets/bikelogo.png';
import { RouteBasedAnimationController } from '@food/utils/routeBasedAnimation';
import {
  buildVisibleRouteFromRiderPosition,
  decodePolyline,
  extractPolylineFromDirections,
  findNearestPointOnPolyline,
  trimPolylineFromDistanceAlongRoute
} from '@food/utils/liveTrackingPolyline';
import { subscribeOrderTracking } from '@food/realtimeTracking';
import './DeliveryTrackingMap.css';
const debugLog = (...args) => console.log('[DeliveryTrackingMap]', ...args)
const debugWarn = (...args) => console.warn('[DeliveryTrackingMap]', ...args)
const debugError = (...args) => console.error('[DeliveryTrackingMap]', ...args)

// --- Premium Map Icons (Matching Delivery App) ---
const RIDER_BIKE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
  <circle cx="30" cy="30" r="28" fill="white" stroke="#ff8100" stroke-width="4" />
  <g transform="translate(15, 15) scale(1.2)">
    <path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65l-2.13 1.52c-.31.22-.5.57-.5.95V13h-4.4a2 2 0 00-1.92 1.45L6 20H2v2h4.5c1.07 0 1.97-.85 1.97-1.97V20l.4-1.2h3.13l.4 1.2c.4 1.2 1.5 2 2.77 2h.3c1.07 0 1.97-.85 1.97-1.97V20l-.4-1.2H14.1l-.33-1H18v-2h-2.17l-.67-2H18c1.1 0 2-.9 2-2V7h-1zM7 18h-.5C5.67 18 5 17.33 5 16.5S5.67 15 6.5 15H7v3zm8.5 0h-.5V15h.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" fill="#ff8100" />
  </g>
</svg>`;

const RESTAURANT_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#FF6B35">
  <path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/>
  <circle cx="12" cy="9" r="3" fill="#FFFFFF"/>
  <path d="M8 16h2v6H8zm6 0h2v6h-2z" fill="#FFFFFF"/>
</svg>`;

const CUSTOMER_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#10B981">
  <path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/>
  <circle cx="12" cy="9" r="3" fill="#FFFFFF"/>
</svg>`;

// Enable Google Maps usage for live delivery tracking
const MAPS_ENABLED = true


// Helper function to calculate Haversine distance
function calculateHaversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function routeEndsNearTarget(routePoints, target, thresholdMeters = 150) {
  if (!Array.isArray(routePoints) || routePoints.length === 0 || !target) return false;
  const lastPoint = routePoints[routePoints.length - 1];
  if (!lastPoint || !Number.isFinite(lastPoint.lat) || !Number.isFinite(lastPoint.lng)) return false;
  return calculateHaversineDistance(lastPoint.lat, lastPoint.lng, target.lat, target.lng) <= thresholdMeters;
}

const DeliveryTrackingMap = ({
  orderId,
  orderTrackingIds = [],
  restaurantCoords,
  customerCoords,
  userLiveCoords = null,
  userLocationAccuracy = null,
  deliveryBoyData = null,
  order = null,
  onTrackingData = null
}) => {
  const mapRef = useRef(null);
  const bikeMarkerRef = useRef(null);
  const mapInstance = useRef(null);
  const socketRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState(null);
  const [routePolyline, setRoutePolyline] = useState([]);
  const iconCacheRef = useRef(new Map());
  const currentLocationRef = useRef(null);
  const routePolylineRef = useRef(null);
  const routePolylineShadowRef = useRef(null);
  const routePolylinePointsRef = useRef(null); // Full route from Firebase/Directions for route-based animation
  const visibleRoutePolylinePointsRef = useRef(null); // Remaining route rendered on the map
  const fullRoutePolylineRef = useRef(null);
  const maxDistanceAlongRouteRef = useRef(0); // Forward-only clamp to prevent polyline regrowth
  const activeRouteSignatureRef = useRef(null); // Reset clamp when route changes
  const animationControllerRef = useRef(null); // Route-based animation controller
  const lastRouteUpdateRef = useRef(null);
  const userHasInteractedRef = useRef(false);
  const isProgrammaticChangeRef = useRef(false);
  const mapInitializedRef = useRef(false);
  const directionsCacheRef = useRef(new Map()); // Cache for Directions API calls
  const lastRouteRequestRef = useRef({ start: null, end: null, timestamp: 0 });
  const customerMarkerRef = useRef(null);
  const restaurantMarkerRef = useRef(null);
  const baselinePolylineRef = useRef(null);
  const resumeCenteringTimeoutRef = useRef(null);

  const backendUrl = useMemo(() => {
    const raw = String(API_BASE_URL || '').trim();
    if (!raw) return '';
    // API_BASE_URL is typically like: http://localhost:5000/api/v1
    // Socket.IO server runs on the backend origin (http://localhost:5000)
    return raw.replace(/\/api\/v1\/?$/i, '').replace(/\/api\/?$/i, '');
  }, []);
  // Enable Google Directions API by default (unless explicitly set to false)
  const ENABLE_GOOGLE_DIRECTIONS = import.meta.env.VITE_ENABLE_GOOGLE_DIRECTIONS !== 'false';
  const [GOOGLE_MAPS_API_KEY, setGOOGLE_MAPS_API_KEY] = useState("");
  const trackingIds = useMemo(() => {
    const ids = [orderId, ...(Array.isArray(orderTrackingIds) ? orderTrackingIds : [])]
      .map((id) => (id === null || id === undefined ? '' : String(id).trim()))
      .filter(Boolean);
    return [...new Set(ids)];
  }, [orderId, orderTrackingIds]);
  const primaryTrackingId = trackingIds[0] || null;
  const trackingIdsKey = trackingIds.join('|');
  const lastRouteColorRef = useRef(null);
  const emitTrackingData = useCallback((payload) => {
    if (typeof onTrackingData !== 'function') return;
    onTrackingData(payload);
  }, [onTrackingData]);

  useEffect(() => {
    currentLocationRef.current = currentLocation;
  }, [currentLocation]);

  const isOrderPickedUp = useMemo(() => {
    const currentPhase = order?.deliveryState?.currentPhase;
    const status = order?.deliveryState?.status;
    return (
      currentPhase === 'at_pickup' ||
      currentPhase === 'en_route_to_delivery' ||
      status === 'reached_pickup' ||
      status === 'order_confirmed' ||
      status === 'en_route_to_delivery' ||
      order?.status === 'out_for_delivery'
    );
  }, [order?.deliveryState?.currentPhase, order?.deliveryState?.status, order?.status]);
  const routeColor = isOrderPickedUp ? '#2563eb' : '#10b981';
  const getDistanceToCustomerMeters = useCallback((trackingData, location) => {
    const meters = Number(trackingData?.distance_to_customer_m);
    if (Number.isFinite(meters)) return Math.max(0, meters);

    const km = Number(trackingData?.distance_to_customer_km);
    if (Number.isFinite(km)) return Math.max(0, km * 1000);

    if (customerCoords && Number.isFinite(location?.lat) && Number.isFinite(location?.lng)) {
      return calculateHaversineDistance(location.lat, location.lng, customerCoords.lat, customerCoords.lng);
    }

    return null;
  }, [customerCoords]);

  const preserveViewportState = useCallback(() => {
    if (!mapInstance.current || !window.google?.maps) return null;
    const center = mapInstance.current.getCenter?.();
    const zoom = mapInstance.current.getZoom?.();
    if (!center || typeof zoom !== 'number') return null;
    return {
      center: { lat: center.lat(), lng: center.lng() },
      zoom
    };
  }, []);

  const restoreViewportState = useCallback((state) => {
    if (!state || !mapInstance.current) return;
    const currentCenter = mapInstance.current.getCenter?.();
    const currentZoom = mapInstance.current.getZoom?.();
    const needsCenterUpdate = !currentCenter ||
      Math.abs(currentCenter.lat() - state.center.lat) > 1e-7 ||
      Math.abs(currentCenter.lng() - state.center.lng) > 1e-7;
    const needsZoomUpdate = typeof currentZoom === 'number' && currentZoom !== state.zoom;
    if (needsCenterUpdate) {
      mapInstance.current.setCenter(state.center);
    }
    if (needsZoomUpdate) {
      mapInstance.current.setZoom(state.zoom);
    }
  }, []);

  const requestCurrentLocationForTrackingIds = useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected || !primaryTrackingId) return;
    socketRef.current.emit('request-current-location', primaryTrackingId);
  }, [primaryTrackingId]);

  const renderInitialVisibleRouteFromPolyline = useCallback((polylinePoints) => {
    if (!Array.isArray(polylinePoints) || polylinePoints.length < 2) return;

    const routeState = currentLocationRef.current
      ? buildVisibleRouteFromRiderPosition(polylinePoints, currentLocationRef.current, {
        offRouteThresholdMeters: 35
      })
      : { visiblePolyline: polylinePoints, isOffRoute: false, distanceAlongRoute: 0 };

    const currentDistanceAlongRoute = Number(routeState.distanceAlongRoute);
    const clampedDistanceAlongRoute = Number.isFinite(currentDistanceAlongRoute)
      ? Math.max(maxDistanceAlongRouteRef.current, currentDistanceAlongRoute)
      : maxDistanceAlongRouteRef.current;
    maxDistanceAlongRouteRef.current = clampedDistanceAlongRoute;

    let visiblePolyline = routeState.visiblePolyline;
    if (Number.isFinite(currentDistanceAlongRoute) &&
      clampedDistanceAlongRoute > currentDistanceAlongRoute + 2) {
      const monotonicTrimmed = trimPolylineFromDistanceAlongRoute(
        polylinePoints,
        clampedDistanceAlongRoute
      ).trimmedPolyline;
      visiblePolyline = routeState.isOffRoute && currentLocationRef.current
        ? [currentLocationRef.current, ...monotonicTrimmed]
        : monotonicTrimmed;
    }

    const pathToRender = Array.isArray(visiblePolyline) && visiblePolyline.length > 1
      ? visiblePolyline
      : polylinePoints;

    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }

    routePolylineRef.current = new window.google.maps.Polyline({
      path: pathToRender,
      geodesic: true,
      strokeColor: routeColor,
      strokeOpacity: 0.92,
      strokeWeight: 5,
      map: mapInstance.current,
      zIndex: 2
    });
  }, [routeColor]);

  // Fallback source for rider location from order payload (from API poll when backend syncs from Firebase/socket)
  useEffect(() => {
    const loc = order?.deliveryState?.currentLocation;
    if (!loc) return;
    const lat = typeof loc.lat === 'number' ? loc.lat : (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2 ? Number(loc.coordinates[1]) : null);
    const lng = typeof loc.lng === 'number' ? loc.lng : (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2 ? Number(loc.coordinates[0]) : null);
    const heading = typeof loc.bearing === 'number' ? loc.bearing : (typeof loc.heading === 'number' ? loc.heading : 0);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const location = { lat, lng, heading: Number.isFinite(heading) ? heading : 0 };
      setCurrentLocation(location);
      setDeliveryBoyLocation(location);
    }
  }, [order?.deliveryState?.currentLocation]);

  // Load Google Maps API key from backend
  useEffect(() => {
    if (!MAPS_ENABLED) return
    import('@food/utils/googleMapsApiKey.js').then(({ getGoogleMapsApiKey }) => {
      getGoogleMapsApiKey().then(key => {
        setGOOGLE_MAPS_API_KEY(key)
      })
    })
  }, [])

  // Draw route using Google Maps Directions API with live updates
  // OPTIMIZED: Added caching to reduce API calls
  const drawRoute = useCallback((start, end) => {
    if (!MAPS_ENABLED) return;
    if (!ENABLE_GOOGLE_DIRECTIONS) return;
    if (!mapInstance.current || !directionsServiceRef.current || !directionsRendererRef.current) return;

    debugLog('?? Requesting Directions:', { from: start, to: end });

    // Validate coordinates before making API call
    if (!start || !end) {
      debugWarn('Invalid coordinates: start or end is missing');
      return;
    }

    const startLat = Number(start.lat);
    const startLng = Number(start.lng);
    const endLat = Number(end.lat);
    const endLng = Number(end.lng);

    // Check if coordinates are valid numbers
    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
      debugWarn('Invalid coordinates: coordinates are not valid numbers', { start, end });
      return;
    }

    // Check if coordinates are within valid range
    if (startLat < -90 || startLat > 90 || endLat < -90 || endLat > 90 ||
      startLng < -180 || startLng > 180 || endLng < -180 || endLng > 180) {
      debugWarn('Invalid coordinates: coordinates are out of valid range', { start, end });
      return;
    }

    // Check if start and end are the same (will cause API error)
    if (startLat === endLat && startLng === endLng) {
      debugWarn('Invalid route: start and end coordinates are the same');
      return;
    }

    // Round coordinates to 4 decimal places (~11 meters) for cache key
    const viewportBeforeRouteUpdate = preserveViewportState();
    const roundCoord = (coord) => Math.round(coord * 10000) / 10000;
    const cacheKey = `${roundCoord(startLat)},${roundCoord(startLng)}|${roundCoord(endLat)},${roundCoord(endLng)}`;

    // Check cache first (cache valid for 15 minutes)
    const cached = directionsCacheRef.current.get(cacheKey);
    const now = Date.now();
      if (cached && (now - cached.timestamp) < 900000) { // 15 minutes cache
      debugLog('? Using cached route');
      // Use cached result
      if (cached.result && cached.result.routes && cached.result.routes[0]) {
        directionsRendererRef.current.setOptions({
          preserveViewport: true,
          polylineOptions: {
            strokeColor: routeColor,
            strokeWeight: 0,
            strokeOpacity: 0
          }
        });
        directionsRendererRef.current.setDirections(cached.result);
        setTimeout(() => restoreViewportState(viewportBeforeRouteUpdate), 0);

        const polylinePoints = extractPolylineFromDirections(cached.result);
        if (polylinePoints && polylinePoints.length > 0) {
          routePolylinePointsRef.current = polylinePoints;

          if (bikeMarkerRef.current && !animationControllerRef.current) {
            animationControllerRef.current = new RouteBasedAnimationController(
              bikeMarkerRef.current,
              polylinePoints
            );
          }
          renderInitialVisibleRouteFromPolyline(polylinePoints);
        }
      }
      return;
    }

    // Throttle: Don't make API call unless enough time passed or route drift is meaningful.
    const lastRequest = lastRouteRequestRef.current;
    if (lastRequest.start && lastRequest.end &&
      Math.abs(lastRequest.start.lat - startLat) < 0.0001 &&
      Math.abs(lastRequest.start.lng - startLng) < 0.0001 &&
      Math.abs(lastRequest.end.lat - endLat) < 0.0001 &&
      Math.abs(lastRequest.end.lng - endLng) < 0.0001 &&
      (now - lastRequest.timestamp) < 30000) {
      debugLog('?? Skipping duplicate route request (throttled):', { 
        lastRequestAgeMs: now - lastRequest.timestamp,
        fromMatch: Math.abs(lastRequest.start.lat - startLat) < 0.0001,
        toMatch: Math.abs(lastRequest.end.lat - endLat) < 0.0001
      });
      return;
    }

    lastRouteRequestRef.current = {
      start: { lat: startLat, lng: startLng },
      end: { lat: endLat, lng: endLng },
      timestamp: now
    };

    try {
      directionsServiceRef.current.route({
        origin: { lat: startLat, lng: startLng },
        destination: { lat: endLat, lng: endLng },
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === 'OK' && result) {
          // Cache the result
          directionsCacheRef.current.set(cacheKey, {
            result: result,
            timestamp: now
          });

          // Clean old cache entries (older than 10 minutes)
          const tenMinutesAgo = now - 600000;
          for (const [key, value] of directionsCacheRef.current.entries()) {
            if (value.timestamp < tenMinutesAgo) {
              directionsCacheRef.current.delete(key);
            }
          }

          // Ensure viewport doesn't change when route is set
          directionsRendererRef.current.setOptions({
            preserveViewport: true,
            polylineOptions: {
              strokeColor: routeColor,
              strokeWeight: 0,
              strokeOpacity: 0
            }
          });
          directionsRendererRef.current.setDirections(result);
          setTimeout(() => restoreViewportState(viewportBeforeRouteUpdate), 0);

          // Extract polyline points for route-based animation (Rapido style)
          const polylinePoints = extractPolylineFromDirections(result);
          if (polylinePoints && polylinePoints.length > 0) {
            routePolylinePointsRef.current = polylinePoints;
            debugLog('? Extracted', polylinePoints.length, 'polyline points for route-based animation');

            // Initialize animation controller if bike marker exists
            if (bikeMarkerRef.current && !animationControllerRef.current) {
              animationControllerRef.current = new RouteBasedAnimationController(
                bikeMarkerRef.current,
                polylinePoints
              );
              debugLog('? Route-based animation controller initialized');
            }
            renderInitialVisibleRouteFromPolyline(polylinePoints);
          }

        } else {
          // Fallback to straight line if directions fail, so user sees SOMETHING
          debugWarn('Directions API failed (' + status + '), falling back to straight line');
          drawStraightLineRoute(start, end);
        }
      });
    } catch (error) {
      debugWarn('Error calling Directions API:', error);
      drawStraightLineRoute(start, end);
    }
  }, [ENABLE_GOOGLE_DIRECTIONS, routeColor, preserveViewportState, restoreViewportState, renderInitialVisibleRouteFromPolyline]);

  const normalizeRoutePoints = useCallback((rawRoute) => {
    if (!Array.isArray(rawRoute) || rawRoute.length < 2) return [];

    return rawRoute
      .map((point) => {
        const lat = Number(point?.lat ?? point?.[0]);
        const lng = Number(point?.lng ?? point?.[1]);
        return { lat, lng };
      })
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  }, []);

  // Use Blob URLs for marker SVGs (more reliable than data URLs on some mobile/webview runtimes).
  const getSvgMarkerUrl = useCallback((cacheKey, svgMarkup) => {
    const existing = iconCacheRef.current.get(cacheKey);
    if (existing) return existing;

    let url = '';
    try {
      const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
      url = URL.createObjectURL(blob);
    } catch (error) {
      url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMarkup)}`;
    }
    iconCacheRef.current.set(cacheKey, url);
    return url;
  }, []);

  // Match delivery app marker: rotate the same bikeLogo asset via canvas.
  const getRotatedRiderIcon = useCallback((heading = 0) => {
    const roundedHeading = Math.round(heading / 5) * 5;
    const cacheKey = `rider_${roundedHeading}`;
    if (iconCacheRef.current.has(cacheKey)) {
      return Promise.resolve(iconCacheRef.current.get(cacheKey));
    }

    return new Promise((resolve) => {
      const img = new Image();
      const sourceUrl = bikeLogo || getSvgMarkerUrl('rider_base_svg', RIDER_BIKE_SVG);
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 60;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.translate(size / 2, size / 2);
          ctx.rotate((roundedHeading * Math.PI) / 180);
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
          
          const dataUrl = canvas.toDataURL();
          iconCacheRef.current.set(cacheKey, dataUrl);
          resolve(dataUrl);
        } catch (e) {
          resolve(sourceUrl);
        }
      };
      img.onerror = () => resolve(sourceUrl);
      img.src = sourceUrl;
      if (img.complete) {
        img.onload();
      }
    });
  }, [getSvgMarkerUrl]);

  const renderVisibleRoute = useCallback((rawRoute) => {
    const normalizedPoints = normalizeRoutePoints(rawRoute);
    if (normalizedPoints.length < 2) return false;
    visibleRoutePolylinePointsRef.current = normalizedPoints;

    if (!mapInstance.current || !window.google?.maps) {
      return false;
    }

    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }
    if (routePolylineShadowRef.current) {
      routePolylineShadowRef.current.setMap(null);
    }

    routePolylineShadowRef.current = new window.google.maps.Polyline({
      path: normalizedPoints,
      geodesic: true,
      strokeColor: '#FFFFFF',
      strokeOpacity: 0.65,
      strokeWeight: 9,
      map: mapInstance.current,
      zIndex: 998
    });

    routePolylineRef.current = new window.google.maps.Polyline({
      path: normalizedPoints,
      geodesic: true,
      strokeColor: '#1E88E5',
      strokeOpacity: 1,
      strokeWeight: 6,
      map: mapInstance.current,
      zIndex: 999
    });

    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] });
    }

    return true;
  }, [normalizeRoutePoints]);

  const fitRouteViewportIfNeeded = useCallback((start, end) => {
    if (!mapInstance.current || !window.google?.maps) return;
    if (userHasInteractedRef.current) return;
    const sLat = Number(start?.lat);
    const sLng = Number(start?.lng);
    const eLat = Number(end?.lat);
    const eLng = Number(end?.lng);
    if (![sLat, sLng, eLat, eLng].every(Number.isFinite)) return;
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: sLat, lng: sLng });
    bounds.extend({ lat: eLat, lng: eLng });
    mapInstance.current.fitBounds(bounds, 48);
  }, []);

  /**
   * Road-like path without Directions: geodesic segment from A → B.
   * Uses {@link renderVisibleRoute} (full path) — never rider-snaps the baseline, which was hiding the line.
   */
  const drawStraightLineRoute = useCallback((start, end) => {
    if (!MAPS_ENABLED || !mapInstance.current || !window.google?.maps) return false;
    if (!start || !end) return false;
    const sLat = Number(start.lat);
    const sLng = Number(start.lng);
    const eLat = Number(end.lat);
    const eLng = Number(end.lng);
    if (![sLat, sLng, eLat, eLng].every(Number.isFinite)) return false;
    if (sLat === eLat && sLng === eLng) return false;

    const points = [
      { lat: sLat, lng: sLng },
      { lat: eLat, lng: eLng },
    ];
    routePolylinePointsRef.current = points;
    visibleRoutePolylinePointsRef.current = points;
    maxDistanceAlongRouteRef.current = 0;
    activeRouteSignatureRef.current = null;

    const ok = renderVisibleRoute(points);
    if (ok) {
      fitRouteViewportIfNeeded(start, end);
    }

    if (bikeMarkerRef.current && !animationControllerRef.current) {
      animationControllerRef.current = new RouteBasedAnimationController(
        bikeMarkerRef.current,
        points,
      );
    }
    return ok;
  }, [renderVisibleRoute, fitRouteViewportIfNeeded]);

  /**
   * Draw the "Planned" journey from Restaurant to Customer as a subtle dashed line.
   * This gives the customer context of the whole trip.
   */
  const drawBaselineRoute = useCallback(async (start, end) => {
    if (!MAPS_ENABLED || !mapInstance.current || !window.google?.maps) return;
    if (!start || !end) return;

    if (baselinePolylineRef.current) {
      baselinePolylineRef.current.setMap(null);
    }

    let points = [start, end];

    // Try to get a real road-based baseline if Directions is enabled
    if (ENABLE_GOOGLE_DIRECTIONS && directionsServiceRef.current) {
      try {
        const result = await new Promise((resolve, reject) => {
          directionsServiceRef.current.route({
            origin: start,
            destination: end,
            travelMode: window.google.maps.TravelMode.DRIVING
          }, (res, status) => {
            if (status === 'OK') resolve(res);
            else reject(status);
          });
        });
        const decoded = extractPolylineFromDirections(result);
        if (decoded && decoded.length > 1) points = decoded;
      } catch (e) {
        debugWarn('Baseline directions failed, using straight line:', e);
      }
    }

    baselinePolylineRef.current = new window.google.maps.Polyline({
      path: points,
      geodesic: true,
      strokeColor: '#cbd5e1', // Subtle slate 300
      strokeOpacity: 0.6,
      strokeWeight: 4,
      map: mapInstance.current,
      zIndex: 1,
      icons: [{
        icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 },
        offset: '0',
        repeat: '12px'
      }]
    });
  }, [ENABLE_GOOGLE_DIRECTIONS]);

  const updateRenderedRouteForLocation = useCallback((location, routeOverride = null) => {
    const baseRoute = routeOverride || routePolylinePointsRef.current;
    const normalizedBaseRoute = normalizeRoutePoints(baseRoute);

    if (normalizedBaseRoute.length < 2) return false;

    const firstPoint = normalizedBaseRoute[0];
    const lastPoint = normalizedBaseRoute[normalizedBaseRoute.length - 1];
    const routeSignature = `${normalizedBaseRoute.length}|${firstPoint.lat.toFixed(5)},${firstPoint.lng.toFixed(5)}|${lastPoint.lat.toFixed(5)},${lastPoint.lng.toFixed(5)}`;
    if (activeRouteSignatureRef.current !== routeSignature) {
      activeRouteSignatureRef.current = routeSignature;
      maxDistanceAlongRouteRef.current = 0;
    }

    routePolylinePointsRef.current = normalizedBaseRoute;

    if (animationControllerRef.current) {
      animationControllerRef.current.updatePolyline(normalizedBaseRoute);
    } else if (bikeMarkerRef.current) {
      animationControllerRef.current = new RouteBasedAnimationController(
        bikeMarkerRef.current,
        normalizedBaseRoute
      );
    }

    if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
      return renderVisibleRoute(normalizedBaseRoute);
    }

    const routeState = buildVisibleRouteFromRiderPosition(normalizedBaseRoute, location, {
      offRouteThresholdMeters: 35
    });

    const currentDistanceAlongRoute = Number(routeState.distanceAlongRoute);
    const clampedDistanceAlongRoute = Number.isFinite(currentDistanceAlongRoute)
      ? Math.max(maxDistanceAlongRouteRef.current, currentDistanceAlongRoute)
      : maxDistanceAlongRouteRef.current;
    maxDistanceAlongRouteRef.current = clampedDistanceAlongRoute;

    let visiblePolyline = routeState.visiblePolyline;
    // If current snap jumps backward, keep rendering from last known forward distance.
    if (Number.isFinite(currentDistanceAlongRoute) &&
      clampedDistanceAlongRoute > currentDistanceAlongRoute + 2) {
      const monotonicTrimmed = trimPolylineFromDistanceAlongRoute(
        normalizedBaseRoute,
        clampedDistanceAlongRoute
      ).trimmedPolyline;
      visiblePolyline = routeState.isOffRoute
        ? [location, ...monotonicTrimmed]
        : monotonicTrimmed;
    }

    return renderVisibleRoute(visiblePolyline.length > 1
      ? visiblePolyline
      : normalizedBaseRoute);
  }, [normalizeRoutePoints, renderVisibleRoute]);

  const getStoredRoutePoints = useCallback(() => {
    const routeCoordinates = isOrderPickedUp
      ? order?.deliveryState?.routeToDelivery?.coordinates
      : order?.deliveryState?.routeToPickup?.coordinates;

    if (Array.isArray(routeCoordinates) && routeCoordinates.length > 1) {
      return routeCoordinates
        .map((coord) => ({
          lat: Number(coord?.[0]),
          lng: Number(coord?.[1])
        }))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    }

    const encodedPolyline = (
      order?.deliveryState?.polyline ||
      deliveryBoyData?.polyline ||
      order?.polyline ||
      ''
    );

    if (typeof encodedPolyline === 'string' && encodedPolyline.trim()) {
      return decodePolyline(encodedPolyline);
    }

    return [];
  }, [
    isOrderPickedUp,
    order?.deliveryState?.routeToDelivery?.coordinates,
    order?.deliveryState?.routeToPickup?.coordinates,
    order?.deliveryState?.polyline,
    order?.polyline,
    deliveryBoyData?.polyline
  ]);

  // Check if delivery partner is assigned (memoized to avoid dependency issues)
  // MUST be defined BEFORE any useEffect that uses it
  const hasDeliveryPartner = useMemo(() => {
    const deliveryStateStatus = order?.deliveryState?.status;
    const currentPhase = order?.deliveryState?.currentPhase;

    // Check if delivery partner has accepted (key condition)
    const hasAccepted = deliveryStateStatus === 'accepted';
    const hasPartner = !!(order?.deliveryPartnerId ||
      order?.deliveryPartner ||
      order?.assignmentInfo?.deliveryPartnerId ||
      hasAccepted ||
      (deliveryStateStatus && deliveryStateStatus !== 'pending') ||
      (currentPhase && currentPhase !== 'assigned' && currentPhase !== 'pending') ||
      (currentPhase === 'en_route_to_pickup') ||
      (currentPhase === 'at_pickup') ||
      (currentPhase === 'en_route_to_delivery'));

    debugLog('?? hasDeliveryPartner check:', {
      hasPartner,
      hasAccepted,
      deliveryPartnerId: order?.deliveryPartnerId,
      deliveryPartner: !!order?.deliveryPartner,
      assignmentInfo: order?.assignmentInfo,
      deliveryStateStatus,
      deliveryStatePhase: currentPhase
    });

    return hasPartner;
  }, [order?.deliveryPartnerId, order?.deliveryPartner, order?.assignmentInfo?.deliveryPartnerId, order?.deliveryState?.status, order?.deliveryState?.currentPhase]);

  /** Same predicate as `hasDeliveryPartnerForRoute` in the route effect — partner *id* alone must not enable trim on the baseline. */
  const hasActiveDeliveryRoute = useMemo(() => {
    const routePhase = order?.deliveryState?.currentPhase;
    const routeStatus = order?.deliveryState?.status;
    return (
      routeStatus === 'accepted' ||
      routePhase === 'en_route_to_pickup' ||
      routePhase === 'at_pickup' ||
      routePhase === 'en_route_to_delivery' ||
      (routeStatus && routeStatus !== 'pending')
    );
  }, [order?.deliveryState?.currentPhase, order?.deliveryState?.status]);

  useEffect(() => {
    if (!isMapLoaded) return;
    // Do not trim the restaurant → drop "baseline" using rider/user GPS — it made the polyline vanish.
    if (!hasActiveDeliveryRoute) return;
    if (!routePolylinePointsRef.current || routePolylinePointsRef.current.length < 2) return;
    updateRenderedRouteForLocation(currentLocation, routePolylinePointsRef.current);
  }, [isMapLoaded, hasActiveDeliveryRoute, updateRenderedRouteForLocation, routeColor, currentLocation]);

  useEffect(() => {
    if (!isMapLoaded || !mapInstance.current || !window.google?.maps) return;
    if (!hasActiveDeliveryRoute) return;

    const storedPoints = getStoredRoutePoints();
    if (!storedPoints || storedPoints.length < 2) return;

    routePolylinePointsRef.current = storedPoints;

    if (bikeMarkerRef.current && !animationControllerRef.current) {
      animationControllerRef.current = new RouteBasedAnimationController(
        bikeMarkerRef.current,
        storedPoints
      );
    }

    updateRenderedRouteForLocation(currentLocation, storedPoints);
  }, [getStoredRoutePoints, isMapLoaded, hasActiveDeliveryRoute, routeColor, currentLocation, updateRenderedRouteForLocation]);

  // Determine which route to show based on order phase
  const getRouteToShow = useCallback(() => {
    if (!order || !deliveryBoyLocation) {
      // No delivery boy location yet, show restaurant to customer
      return { start: restaurantCoords, end: customerCoords };
    }

    const currentPhase = order.deliveryState?.currentPhase || 'assigned';
    const status = order.deliveryState?.status || 'pending';
    const mainStatus = order.status || "";

    debugLog('?? Determining route based on phase:', { currentPhase, status, mainStatus, deliveryBoyLocation: !!deliveryBoyLocation });
    const activeDeliveryStatuses = [
      'en_route_to_delivery',
      'picked_up',
      'out_for_delivery',
      'reached_drop',
      'order_confirmed',
      'en_route_to_drop'
    ];
    const activePickupStatuses = [
      'en_route_to_pickup',
      'at_pickup',
      'ready_for_pickup',
      'accepted'
    ];

    // Phase 3: Delivery boy going to customer
    if (activeDeliveryStatuses.includes(currentPhase) || 
        activeDeliveryStatuses.includes(status) || 
        activeDeliveryStatuses.includes(mainStatus)) {
      return {
        start: { lat: deliveryBoyLocation.lat, lng: deliveryBoyLocation.lng },
        end: customerCoords
      };
    }

    // Phase 2: On the way to pickup / waiting at pickup.
    if (activePickupStatuses.includes(currentPhase) || 
        activePickupStatuses.includes(status) || 
        activePickupStatuses.includes(mainStatus)) {
      return {
        start: { lat: deliveryBoyLocation.lat, lng: deliveryBoyLocation.lng },
        end: restaurantCoords
      };
    }

    // Explicit fallback for pickup-travel states
    if (currentPhase === 'en_route_to_pickup' || status === 'accepted') {
      return {
        start: { lat: deliveryBoyLocation.lat, lng: deliveryBoyLocation.lng },
        end: restaurantCoords
      };
    }

    // Default: Show restaurant to customer
    return { start: restaurantCoords, end: customerCoords };
  }, [order, deliveryBoyLocation, restaurantCoords, customerCoords]);

  const desiredRoute = useMemo(() => getRouteToShow(), [getRouteToShow]);
  const routeMatchesDesiredTarget = useCallback((routePoints, target) => {
    if (!Array.isArray(routePoints) || routePoints.length < 2 || !target) return false;
    return routeEndsNearTarget(routePoints, target);
  }, []);

  // Move bike smoothly with rotation
  const moveBikeSmoothly = useCallback(async (lat, lng, heading) => {
    if (!mapInstance.current || !isMapLoaded) {
      debugLog('? Map not loaded yet, storing location for later:', { lat, lng, heading });
      setCurrentLocation({ lat, lng, heading });
      return;
    }

    try {
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        debugError('? Invalid coordinates:', { lat, lng });
        return;
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        debugError('? Coordinates out of range:', { lat, lng });
        return;
      }

      const position = new window.google.maps.LatLng(lat, lng);
      const rotatedIconUrl = await getRotatedRiderIcon(heading || 0);

      if (!bikeMarkerRef.current) {
        // Create bike marker with the same icon as delivery boy's map
        debugLog('?????? Creating bike marker');

        bikeMarkerRef.current = new window.google.maps.Marker({
          position: position,
          map: mapInstance.current,
          icon: {
            url: rotatedIconUrl,
            scaledSize: new window.google.maps.Size(60, 60),
            anchor: new window.google.maps.Point(30, 30),
            optimized: false
          },
          zIndex: window.google.maps.Marker.MAX_ZINDEX + 3,
          title: 'Delivery Partner',
          visible: true,
          clickable: false
        });

        bikeMarkerRef.current._rotation = heading || 0;
        bikeMarkerRef.current.setVisible(true);

        // Initialize route-based animation controller if polyline is available
        if (routePolylinePointsRef.current && routePolylinePointsRef.current.length > 0) {
          animationControllerRef.current = new RouteBasedAnimationController(
            bikeMarkerRef.current,
            routePolylinePointsRef.current
          );
          debugLog('? Route-based animation controller initialized with bike marker');
        }
      } else {
        // RAPIDO/ZOMATO-STYLE: Bike MUST stay on route polyline, NEVER use raw GPS
        if (routePolylinePointsRef.current && routePolylinePointsRef.current.length > 0) {
          // Find nearest point on polyline (ensures marker stays on road)
          const nearest = findNearestPointOnPolyline(routePolylinePointsRef.current, { lat, lng });

          if (nearest && nearest.nearestPoint) {
            let progress = nearest.totalDistance > 0
              ? Math.min(1, Math.max(0, nearest.distanceAlongRoute / nearest.totalDistance))
              : 0;

            // Ensure progress doesn't go backwards (only forward movement)
            if (animationControllerRef.current && animationControllerRef.current.lastProgress !== undefined) {
              const lastProgress = animationControllerRef.current.lastProgress;
              if (progress < lastProgress - 0.05) {
                progress = lastProgress;
              } else if (progress < lastProgress) {
                progress = lastProgress;
              }
            }

            updateRenderedRouteForLocation({ lat, lng });

            if (animationControllerRef.current) {
              animationControllerRef.current.updatePosition(progress, heading || 0);
              animationControllerRef.current.lastProgress = progress;

              // Also update icon for rotation even if using animation controller
              bikeMarkerRef.current.setIcon({
                url: rotatedIconUrl,
                scaledSize: new window.google.maps.Size(60, 60),
                anchor: new window.google.maps.Point(30, 30),
                optimized: false
              });
            } else {
              // Fallback
              const nearestPosition = new window.google.maps.LatLng(nearest.nearestPoint.lat, nearest.nearestPoint.lng);
              bikeMarkerRef.current.setPosition(nearestPosition);
              bikeMarkerRef.current.setIcon({
                url: rotatedIconUrl,
                scaledSize: new window.google.maps.Size(60, 60),
                anchor: new window.google.maps.Point(30, 30),
                optimized: false
              });
              bikeMarkerRef.current._rotation = heading || 0;
            }
          }
        } else {
          // No polyline yet
          bikeMarkerRef.current.setPosition(position);
          bikeMarkerRef.current.setIcon({
            url: rotatedIconUrl,
            scaledSize: new window.google.maps.Size(60, 60),
            anchor: new window.google.maps.Point(30, 30),
            optimized: false
          });
          bikeMarkerRef.current._rotation = heading || 0;
          // Handle Map Panning: Only auto-snap if user hasn't moved the map
          if (!userHasInteractedRef.current && mapInstance.current) {
            isProgrammaticChangeRef.current = true;
            mapInstance.current.panTo(position);
            // Re-allow centering after programmatic update
            if (resumeCenteringTimeoutRef.current) clearTimeout(resumeCenteringTimeoutRef.current);
            resumeCenteringTimeoutRef.current = setTimeout(() => { 
                isProgrammaticChangeRef.current = false; 
            }, 100);
          }
        }
        // Map should remain at user's chosen view
      }
    } catch (error) {
      debugError('? Error moving bike:', error);
    }
  }, [isMapLoaded, getRotatedRiderIcon, updateRenderedRouteForLocation]);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!trackingIds.length) return;

    const unsubs = trackingIds.map((trackingId) =>
      subscribeOrderTracking(
        trackingId,
        (trackingData) => {
          // Firebase/backend may use lat/lng or boy_lat/boy_lng
          const lat = Number(trackingData?.lat ?? trackingData?.boy_lat);
          const lng = Number(trackingData?.lng ?? trackingData?.boy_lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          const heading = Number(trackingData?.heading ?? trackingData?.bearing ?? 0);

          const location = {
            lat,
            lng,
            heading: Number.isFinite(heading) ? heading : 0,
          };

          setCurrentLocation(location);
          setDeliveryBoyLocation(location);
          const distanceToCustomerMeters = getDistanceToCustomerMeters(trackingData, location);
          emitTrackingData({
            source: 'firebase',
            lat: location.lat,
            lng: location.lng,
            heading: location.heading,
            distanceToCustomerM: Number.isFinite(distanceToCustomerMeters) ? distanceToCustomerMeters : null,
            distanceToCustomerKm: Number.isFinite(distanceToCustomerMeters) ? distanceToCustomerMeters / 1000 : null,
            timestamp: Number(trackingData?.timestamp) || Date.now(),
            lastUpdated: Number(trackingData?.last_updated) || Date.now()
          });

          if (isMapLoaded && mapInstance.current) {
            moveBikeSmoothly(location.lat, location.lng, location.heading);
          }

          const rawPolyline =
            trackingData?.polyline ||
            (Array.isArray(trackingData?.route_coordinates) && trackingData.route_coordinates.length > 0
              ? trackingData.route_coordinates
              : null);

          if (Array.isArray(rawPolyline) && rawPolyline.length > 1) {
            const normalized = normalizeRoutePoints(rawPolyline);
            if (normalized.length > 1) {
              updateRenderedRouteForLocation(location, normalized);
            }
          } else if (typeof rawPolyline === 'string' && rawPolyline.trim()) {
            const decoded = decodePolyline(rawPolyline);
            if (decoded.length > 1) {
              updateRenderedRouteForLocation(location, decoded);
            }
          }
        },
        (error) => {
          debugWarn('Firebase order tracking listener error:', error?.message || error);
        },
      ),
    );

    return () => {
      unsubs.forEach((unsub) => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [trackingIdsKey, trackingIds, isMapLoaded, moveBikeSmoothly, updateRenderedRouteForLocation, normalizeRoutePoints, getDistanceToCustomerMeters, emitTrackingData]);

  // Initialize Socket.io connection (fallback)
  useEffect(() => {
    if (!trackingIds.length) return;

    // Use auth token for socket connection (matches backend socket auth middleware)
    const token = localStorage.getItem('user_accessToken') || localStorage.getItem('accessToken') || '';

    socketRef.current = io(backendUrl, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: Infinity,
      timeout: 5000
    });

    const handleRealtimeLocation = (data) => {
      if (!data) return;
      
      // Safety: Ignore updates for orders we're not currently tracking in this component instance
      if (data.orderId && trackingIds.length > 0 && !trackingIds.includes(data.orderId)) {
        return;
      }

      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        // If a new polyline is provided by the rider, update our route
        if (data.polyline && typeof data.polyline === 'string' && typeof decodePolyline === 'function') {
          try {
            const decodedPoints = decodePolyline(data.polyline);
            if (decodedPoints && decodedPoints.length > 0) {
              routePolylinePointsRef.current = decodedPoints;
              fullRoutePolylineRef.current = decodedPoints;
              setRoutePolyline(decodedPoints);
              // Immediately render the new route on map
              renderVisibleRoute(decodedPoints);
            }
          } catch (err) {
            console.warn('[TrackingMap] Failed to decode incoming polyline:', err);
          }
        }

        const location = { lat: data.lat, lng: data.lng, heading: data.heading || data.bearing || 0 };
        setCurrentLocation(location);
        setDeliveryBoyLocation(location);
        const distanceM = Number(data?.distanceToCustomerM ?? data?.distance_to_customer_m);
        const distanceKm = Number(data?.distanceToCustomerKm ?? data?.distance_to_customer_km);
        const normalizedDistanceM = Number.isFinite(distanceM)
          ? distanceM
          : (Number.isFinite(distanceKm)
            ? distanceKm * 1000
            : (customerCoords
              ? calculateHaversineDistance(location.lat, location.lng, customerCoords.lat, customerCoords.lng)
              : null));
        emitTrackingData({
          source: 'socket',
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          distanceToCustomerM: Number.isFinite(normalizedDistanceM) ? normalizedDistanceM : null,
          distanceToCustomerKm: Number.isFinite(normalizedDistanceM) ? normalizedDistanceM / 1000 : null,
          timestamp: Number(data?.timestamp) || Date.now()
        });

        if (isMapLoaded && mapInstance.current) {
          if (data.progress !== undefined && animationControllerRef.current && routePolylinePointsRef.current) {
            animationControllerRef.current.updatePosition(data.progress, data.bearing || data.heading || 0);
          } else {
            moveBikeSmoothly(data.lat, data.lng, data.heading || data.bearing || 0);
          }
        }
      }
    };

    const handleCurrentLocation = (data) => {
      if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
        const location = { lat: data.lat, lng: data.lng, heading: data.heading || data.bearing || 0 };
        setCurrentLocation(location);
        setDeliveryBoyLocation(location);
        const distanceM = Number(data?.distanceToCustomerM ?? data?.distance_to_customer_m);
        const distanceKm = Number(data?.distanceToCustomerKm ?? data?.distance_to_customer_km);
        const normalizedDistanceM = Number.isFinite(distanceM)
          ? distanceM
          : (Number.isFinite(distanceKm)
            ? distanceKm * 1000
            : (customerCoords
              ? calculateHaversineDistance(location.lat, location.lng, customerCoords.lat, customerCoords.lng)
              : null));
        emitTrackingData({
          source: 'socket',
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          distanceToCustomerM: Number.isFinite(normalizedDistanceM) ? normalizedDistanceM : null,
          distanceToCustomerKm: Number.isFinite(normalizedDistanceM) ? normalizedDistanceM / 1000 : null,
          timestamp: Number(data?.timestamp) || Date.now()
        });

        if (isMapLoaded && mapInstance.current) {
          if (data.progress !== undefined && animationControllerRef.current && routePolylinePointsRef.current) {
            animationControllerRef.current.updatePosition(data.progress, data.bearing || data.heading || 0);
          } else {
            moveBikeSmoothly(data.lat, data.lng, data.heading || data.bearing || 0);
          }
        }
      }
    };

    const handleRouteInitialized = (data) => {
      if (data.points && Array.isArray(data.points) && data.points.length > 0) {
        routePolylinePointsRef.current = data.points;
        if (bikeMarkerRef.current && !animationControllerRef.current) {
          animationControllerRef.current = new RouteBasedAnimationController(
            bikeMarkerRef.current,
            data.points
          );
        } else if (animationControllerRef.current) {
          animationControllerRef.current.updatePolyline(data.points);
        }
        updateRenderedRouteForLocation(currentLocationRef.current, data.points);
      }
    };

    socketRef.current.on('connect', () => {
      // Join the new tracking rooms (backend event handler)
      trackingIds.forEach((trackingId) => {
        socketRef.current.emit('join-tracking', trackingId);
        // Also emit legacy event for backwards compatibility
        socketRef.current.emit('join-order-tracking', trackingId);
      });
      requestCurrentLocationForTrackingIds();

      const locationRequestInterval = setInterval(() => {
        requestCurrentLocationForTrackingIds();
      }, 30000);

      socketRef.current._locationRequestInterval = locationRequestInterval;
    });

    socketRef.current.on('reconnect', () => {
      trackingIds.forEach((trackingId) => {
        socketRef.current.emit('join-tracking', trackingId);
        socketRef.current.emit('join-order-tracking', trackingId);
      });
      requestCurrentLocationForTrackingIds();
    });

    // Listen for the new standardized location-update event from backend
    socketRef.current.on('location-update', handleRealtimeLocation);

    // Legacy event listeners (per-order suffixed events)
    trackingIds.forEach((trackingId) => {
      socketRef.current.on(`location-receive-${trackingId}`, handleRealtimeLocation);
      socketRef.current.on(`current-location-${trackingId}`, handleCurrentLocation);
      socketRef.current.on(`route-initialized-${trackingId}`, handleRouteInitialized);
    });

    const statusToMessage = (payload) => {
      const orderStatus = String(payload?.orderStatus || payload?.status || '').toLowerCase();
      const deliveryStatus = String(payload?.deliveryState?.status || payload?.deliveryStatus || '').toLowerCase();
      const phase = String(payload?.deliveryState?.currentPhase || payload?.currentPhase || '').toLowerCase();

      const key = deliveryStatus || phase || orderStatus;
      switch (key) {
        case 'confirmed':
          return 'Order confirmed by restaurant';
        case 'preparing':
          return 'Restaurant started preparing your order';
        case 'ready_for_pickup':
          return 'Order is ready — delivery partner will pick it up soon';
        case 'reached_pickup':
        case 'at_pickup':
          return 'Delivery partner reached the restaurant';
        case 'picked_up':
        case 'en_route_to_delivery':
          return 'Order picked up — on the way to you';
        case 'reached_drop':
        case 'at_drop':
          return 'Delivery partner arrived near your location';
        case 'delivered':
        case 'completed':
          return 'Order delivered';
        default:
          return payload?.message || '';
      }
    };

    socketRef.current.on('order_status_update', (data) => {
      // Only surface updates for the order(s) this map is tracking
      const id = String(data?.orderId || data?.orderMongoId || data?._id || '').trim();
      const isForThisOrder =
        !id ||
        trackingIds.some((t) => String(t) === id) ||
        (data?.orderMongoId && trackingIds.some((t) => String(t) === String(data.orderMongoId)));

      if (!isForThisOrder) return;

      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('orderStatusNotification', {
          detail: {
            ...data,
            status: data?.deliveryState?.status || data?.orderStatus || data?.status,
            message: statusToMessage(data),
          }
        }));
      }
    });

    const handlePageHide = () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      if (socketRef.current) {
        if (socketRef.current._locationRequestInterval) {
          clearInterval(socketRef.current._locationRequestInterval);
        }
        // Leave tracking rooms before disconnecting
        trackingIds.forEach((trackingId) => {
          socketRef.current.emit('leave-tracking', trackingId);
          socketRef.current.off(`location-receive-${trackingId}`, handleRealtimeLocation);
          socketRef.current.off(`current-location-${trackingId}`, handleCurrentLocation);
          socketRef.current.off(`route-initialized-${trackingId}`, handleRouteInitialized);
        });
        socketRef.current.off('location-update', handleRealtimeLocation);
        socketRef.current.off('order_status_update');
        socketRef.current.off('reconnect');
        socketRef.current.disconnect();
      }
    };
  }, [backendUrl, moveBikeSmoothly, trackingIdsKey, requestCurrentLocationForTrackingIds, customerCoords, emitTrackingData, updateRenderedRouteForLocation]);
  // Initialize Google Map (only once - prevent re-initialization)
  useEffect(() => {
    if (!mapRef.current || !restaurantCoords || !customerCoords || mapInitializedRef.current) return;

    const loadGoogleMapsIfNeeded = async () => {
      if (!MAPS_ENABLED) {
        // Maps disabled - skip loading Google Maps entirely
        setIsMapLoaded(false);
        return;
      }
      // Wait for Google Maps to load from main.jsx first
      if (!window.google || !window.google.maps) {
        debugLog('? Waiting for Google Maps API to load...');
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait

        while (!window.google && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        // If still not loaded, try loading it ourselves
        if (!window.google || !window.google.maps) {
          debugLog('? Google Maps not loaded from main.jsx, loading manually...');
          try {
            const { getGoogleMapsApiKey } = await import('@food/utils/googleMapsApiKey.js');
            const { Loader } = await import('@googlemaps/js-api-loader');
            const apiKey = await getGoogleMapsApiKey();
            if (apiKey) {
              // geometry only (directions/markers). Avoid `places`/`drawing` — they load code paths
              // that hit Geocoding / extra endpoints without being used here.
              const loader = new Loader({
                apiKey: apiKey,
                version: "weekly",
                libraries: ["geometry"]
              });
              await loader.load();
              debugLog('? Google Maps loaded manually');
            } else {
              debugError('? No Google Maps API key found');
              return;
            }
          } catch (error) {
            debugError('? Error loading Google Maps:', error);
            return;
          }
        }
      }

      // Initialize map once Google Maps is loaded
      if (window.google && window.google.maps) {
        // Wait for MapTypeId to be available (sometimes it loads slightly after maps)
        let mapTypeIdAttempts = 0;
        const checkMapTypeId = () => {
          if (window.google?.maps?.MapTypeId) {
            initializeMap();
          } else if (mapTypeIdAttempts < 20) {
            mapTypeIdAttempts++;
            setTimeout(checkMapTypeId, 100);
          } else {
            debugWarn('?? Google Maps MapTypeId not available, using string fallback');
            // Use fallback - initialize with string instead of enum
            initializeMap();
          }
        };
        checkMapTypeId();
      } else {
        debugError('? Google Maps API still not available');
      }
    };

    loadGoogleMapsIfNeeded();

    function initializeMap() {
      try {
        // Verify Google Maps is fully loaded
        if (!window.google || !window.google.maps || !window.google.maps.Map) {
          debugError('? Google Maps API not fully loaded');
          return;
        }

        // Calculate center point
        const centerLng = (restaurantCoords.lng + customerCoords.lng) / 2;
        const centerLat = (restaurantCoords.lat + customerCoords.lat) / 2;

        // Get MapTypeId safely
        const mapTypeId = window.google.maps.MapTypeId?.ROADMAP || 'roadmap';

        // Initialize map - center between user and restaurant, stable view
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 15,
          mapTypeId: mapTypeId,
          tilt: 0, // Flat 2D view for stability
          heading: 0,
          clickableIcons: false, // Reduces POI-related Geocoding/Places traffic
          mapTypeControl: false, // Hide Map/Satellite selector
          fullscreenControl: false, // Hide fullscreen button
          streetViewControl: false, // Hide street view control
          zoomControl: false, // Hide zoom controls
          disableDefaultUI: true, // Hide all default UI controls
          gestureHandling: 'greedy', // Allow hand gestures for zoom and pan
          // Prevent automatic viewport changes
          restriction: null,
          // Keep map stable - no auto-fit bounds
          noClear: false,
          // Hide all default labels, POIs, and location markers
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'poi',
              elementType: 'geometry',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'poi.attraction',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'poi.place_of_worship',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'poi.school',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'poi.sports_complex',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'transit',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'transit.station',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'administrative',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'administrative.locality',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'administrative.neighborhood',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'administrative.land_parcel',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'road',
              elementType: 'labels.text',
              stylers: [{ visibility: 'on' }] // Keep road numbers visible
            },
            {
              featureType: 'road',
              elementType: 'labels.icon',
              stylers: [{ visibility: 'on' }] // Keep road icons visible
            }
          ]
        });

        // Track user interaction to prevent automatic zoom/pan interference
        mapInstance.current.addListener('dragstart', () => {
          userHasInteractedRef.current = true;
        });

        mapInstance.current.addListener('zoom_changed', () => {
          if (!isProgrammaticChangeRef.current) {
            userHasInteractedRef.current = true;
          }
        });

        if (ENABLE_GOOGLE_DIRECTIONS) {
          // Initialize Directions Service and Renderer
          directionsServiceRef.current = new window.google.maps.DirectionsService();
          directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
            map: mapInstance.current,
            suppressMarkers: true, // We'll add custom markers
            preserveViewport: true, // CRITICAL: Don't auto-adjust viewport when route is set - keep map stable
            polylineOptions: {
              strokeColor: routeColor,
              strokeWeight: 0, // Hide default polyline, we'll use custom dashed one
              strokeOpacity: 0
            }
          });

          debugLog('?? Directions Service & Renderer initialized');
        } else {
          debugWarn('?? Directions API is disabled');
          directionsServiceRef.current = null;
          directionsRendererRef.current = null;
        }

        // Add restaurant/pickup marker (only once)
        if (!restaurantMarkerRef.current) {
          const restaurantPinIconUrl = getSvgMarkerUrl('restaurant_pin', RESTAURANT_PIN_SVG);
          restaurantMarkerRef.current = new window.google.maps.Marker({
            position: { lat: restaurantCoords.lat, lng: restaurantCoords.lng },
            map: mapInstance.current,
            icon: {
              url: restaurantPinIconUrl,
              scaledSize: new window.google.maps.Size(48, 48),
              anchor: new window.google.maps.Point(24, 48),
              origin: new window.google.maps.Point(0, 0)
            },
            zIndex: window.google.maps.Marker.MAX_ZINDEX + 1,
            title: "Restaurant",
            visible: true
          });
          debugLog('?? Restaurant Marker created');
        }

        // Add customer/drop marker (only once)
        if (!customerMarkerRef.current) {
          const customerLocationIconUrl = getSvgMarkerUrl('customer_pin', CUSTOMER_PIN_SVG);
          customerMarkerRef.current = new window.google.maps.Marker({
            position: { lat: customerCoords.lat, lng: customerCoords.lng },
            map: mapInstance.current,
            icon: {
              url: customerLocationIconUrl,
              scaledSize: new window.google.maps.Size(48, 48),
              anchor: new window.google.maps.Point(24, 48),
              origin: new window.google.maps.Point(0, 0)
            },
            zIndex: window.google.maps.Marker.MAX_ZINDEX + 1,
            title: "Your delivery location",
            visible: true
          });
          debugLog('?? Customer Marker created at:', customerCoords);
        }

        // ─── Zomato-style vertical drop pin lines ───────────────────────
        // Dashed vertical line from each marker anchor down to a ground shadow circle
        const createDropPinLine = (coords, color) => {
          if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return null;
          // We can't draw true vertical on a map, but we can create a short polyline
          // with a dash pattern that looks like a pin drop line at the marker position.
          // Instead, use an OverlayView-based approach via a DOM element.
          // More practical: create a subtle ground circle (shadow) beneath the pin.
          const groundCircle = new window.google.maps.Circle({
            center: coords,
            radius: 12,  // ~12 meters radius — small ground shadow
            fillColor: color,
            fillOpacity: 0.18,
            strokeColor: color,
            strokeOpacity: 0.35,
            strokeWeight: 1.5,
            map: mapInstance.current,
            clickable: false,
            zIndex: 1
          });

          // Pulsing ring effect (slightly larger, transparent)
          const pulseCircle = new window.google.maps.Circle({
            center: coords,
            radius: 25,  // ~25 meters — outer pulse ring
            fillColor: color,
            fillOpacity: 0.06,
            strokeColor: color,
            strokeOpacity: 0.15,
            strokeWeight: 1,
            map: mapInstance.current,
            clickable: false,
            zIndex: 0
          });

          return { groundCircle, pulseCircle };
        };

        // Restaurant drop pin shadow (green)
        createDropPinLine(restaurantCoords, '#22c55e');
        // Customer drop pin shadow (red)
        createDropPinLine(customerCoords, '#ef4444');

        // Note: User live location marker removed as per simplified tracking requirements
        // only rider marker remains variable.

        // Draw route based on order phase
        setIsMapLoaded(true);
        mapInstance.current.addListener('tilesloaded', () => {
          debugLog('?? Map tiles loaded');

          // Hide Google Maps footer elements (Keyboard shortcuts, Map data, Terms)
          const hideGoogleFooter = () => {
            const footerElements = mapRef.current?.querySelectorAll?.('.gm-style-cc, a[href*="keyboard"], a[href*="terms"]');
            footerElements?.forEach(el => {
              if (el instanceof HTMLElement) {
                el.style.display = 'none';
              }
            });
          };

          // Hide immediately and also set interval to catch dynamically added elements
          hideGoogleFooter();
          const footerHideInterval = setInterval(() => {
            hideGoogleFooter();
          }, 500);

          // Clear interval after 5 seconds
          setTimeout(() => clearInterval(footerHideInterval), 5000);

          // Check if delivery partner is assigned and show bike immediately
          const currentPhase = order?.deliveryState?.currentPhase;
          const deliveryStateStatus = order?.deliveryState?.status;
          const hasDeliveryPartnerOnLoad = currentPhase === 'en_route_to_pickup' ||
            currentPhase === 'at_pickup' ||
            currentPhase === 'en_route_to_delivery' ||
            deliveryStateStatus === 'accepted' ||
            (deliveryStateStatus && deliveryStateStatus !== 'pending');

          debugLog('?? Map tiles loaded - Checking for delivery partner:', {
            currentPhase,
            deliveryStateStatus,
            hasDeliveryPartnerOnLoad,
            hasBikeMarker: !!bikeMarkerRef.current
          });

          // DO NOT create bike at restaurant on map load
          // Wait for real location from socket - bike will be created when real location is received
          if (hasDeliveryPartnerOnLoad && !bikeMarkerRef.current) {
            debugLog('?? Map loaded - Delivery partner detected, waiting for REAL location from socket...');
            // Request current location immediately
            if (socketRef.current && socketRef.current.connected) {
              requestCurrentLocationForTrackingIds();
              debugLog('?? Requested current location immediately on map load');
            }
            // Don't create bike at restaurant - wait for real location
          }

          // DO NOT draw default route - only draw when delivery partner is assigned
          // Route will be drawn when delivery partner accepts or when location updates arrive
        });

        debugLog('? Google Map initialized successfully');
        mapInitializedRef.current = true; // Mark map as initialized

        // Draw the full journey baseline immediately
        if (restaurantCoords && customerCoords) {
           drawBaselineRoute(restaurantCoords, customerCoords);
        }
      } catch (error) {
        debugError('? Map initialization error:', error);
      }
    }
  }, [ENABLE_GOOGLE_DIRECTIONS, getSvgMarkerUrl, routeColor, restaurantCoords, customerCoords]); // Removed dependencies that cause re-initialization

  // ─── INSTANT MARKER INITIALIZATION ───────────────────────
  
  // Create Restaurant Marker
  useEffect(() => {
    if (!isMapLoaded || !mapInstance.current || !restaurantCoords) return;
    
    if (!restaurantMarkerRef.current) {
      const restaurantPinIconUrl = getSvgMarkerUrl('restaurant_pin', RESTAURANT_PIN_SVG);

      restaurantMarkerRef.current = new window.google.maps.Marker({
        position: { lat: restaurantCoords.lat, lng: restaurantCoords.lng },
        map: mapInstance.current,
        icon: {
          url: restaurantPinIconUrl,
          scaledSize: new window.google.maps.Size(48, 48),
          anchor: new window.google.maps.Point(24, 48)
        },
          zIndex: window.google.maps.Marker.MAX_ZINDEX + 1,
          title: "Restaurant",
          visible: true
        });
        debugLog('?? Created restaurant marker at:', restaurantCoords);
      } else {
      restaurantMarkerRef.current.setPosition(restaurantCoords);
      debugLog('?? Updated restaurant marker position');
      restaurantMarkerRef.current.setIcon({
        url: getSvgMarkerUrl('restaurant_pin', RESTAURANT_PIN_SVG),
        scaledSize: new window.google.maps.Size(48, 48),
        anchor: new window.google.maps.Point(24, 48)
      });
    }
  }, [getSvgMarkerUrl, isMapLoaded, restaurantCoords]);

  // Create Customer Marker
  useEffect(() => {
    if (!isMapLoaded || !mapInstance.current || !customerCoords) return;

    if (!customerMarkerRef.current) {
      const customerLocationIconUrl = getSvgMarkerUrl('customer_pin', CUSTOMER_PIN_SVG);

      customerMarkerRef.current = new window.google.maps.Marker({
        position: { lat: customerCoords.lat, lng: customerCoords.lng },
        map: mapInstance.current,
        icon: {
          url: customerLocationIconUrl,
          scaledSize: new window.google.maps.Size(48, 48),
          anchor: new window.google.maps.Point(24, 48)
        },
        zIndex: window.google.maps.Marker.MAX_ZINDEX + 1,
        title: "Your delivery location"
      });
    } else {
      customerMarkerRef.current.setPosition(customerCoords);
      customerMarkerRef.current.setIcon({
        url: getSvgMarkerUrl('customer_pin', CUSTOMER_PIN_SVG),
        scaledSize: new window.google.maps.Size(48, 48),
        anchor: new window.google.maps.Point(24, 48)
      });
    }
  }, [getSvgMarkerUrl, isMapLoaded, customerCoords]);

  // Create Rider/Bike Marker instantly from initial location
  useEffect(() => {
    if (!isMapLoaded || !mapInstance.current || !deliveryBoyLocation) return;
    moveBikeSmoothly(deliveryBoyLocation.lat, deliveryBoyLocation.lng, deliveryBoyLocation.heading || 0);
  }, [isMapLoaded, !!deliveryBoyLocation]);

  // Memoize restaurant and customer coordinates to avoid dependency issues
  const restaurantLat = restaurantCoords?.lat;
  const restaurantLng = restaurantCoords?.lng;
  const deliveryBoyLat = deliveryBoyLocation?.lat;
  const deliveryBoyLng = deliveryBoyLocation?.lng;
  const deliveryBoyHeading = deliveryBoyLocation?.heading;

  // Update route when delivery boy location or order phase changes
  useEffect(() => {
    if (!isMapLoaded) return;

    // Check if delivery partner is assigned based on phase
    const currentPhase = order?.deliveryState?.currentPhase;
    const hasDeliveryPartnerByPhase = currentPhase === 'en_route_to_pickup' ||
      currentPhase === 'at_pickup' ||
      currentPhase === 'en_route_to_delivery';

    // If delivery partner is assigned but bike marker doesn't exist, create it
    if (hasDeliveryPartnerByPhase && !bikeMarkerRef.current && mapInstance.current) {
      debugLog('?? Delivery partner detected by phase, creating bike marker:', currentPhase);
      // DO NOT show bike at restaurant - wait for real location from socket
      // Bike will be created when real location is received via socket
      debugLog('? Waiting for real location from socket - NOT showing at restaurant');
      if (socketRef.current && socketRef.current.connected) {
        requestCurrentLocationForTrackingIds();
      }
    }

    const now = Date.now();
    if (lastRouteColorRef.current !== routeColor) {
      lastRouteColorRef.current = routeColor;
    }

    const routePhase = order?.deliveryState?.currentPhase;
    const routeStatus = order?.deliveryState?.status;
    const hasDeliveryPartnerForRoute = routeStatus === 'accepted' ||
      routePhase === 'en_route_to_pickup' ||
      routePhase === 'at_pickup' ||
      routePhase === 'en_route_to_delivery' ||
      (routeStatus && routeStatus !== 'pending');

    // Zomato-style: show restaurant → customer line while order is being prepared (no rider / rider not en route yet).
    if (!hasDeliveryPartnerForRoute) {
      if (restaurantCoords && customerCoords) {
        lastRouteUpdateRef.current = now;
        if (ENABLE_GOOGLE_DIRECTIONS) {
          drawRoute(restaurantCoords, customerCoords);
        } else {
          drawStraightLineRoute(restaurantCoords, customerCoords);
        }
      }
      return;
    }

    const hasReusableRoute =
      routePolylinePointsRef.current &&
      routePolylinePointsRef.current.length > 1 &&
      routeMatchesDesiredTarget(routePolylinePointsRef.current, desiredRoute?.end);

    if (hasReusableRoute) {
      lastRouteUpdateRef.current = now;
      updateRenderedRouteForLocation(currentLocation, routePolylinePointsRef.current);
      return;
    }

    if (!hasReusableRoute) {
      routePolylinePointsRef.current = null;
      visibleRoutePolylinePointsRef.current = null;
      maxDistanceAlongRouteRef.current = 0;
      activeRouteSignatureRef.current = null;
    }

    const route = desiredRoute;
    if (route.start && route.end) {
      lastRouteUpdateRef.current = now;
      if (ENABLE_GOOGLE_DIRECTIONS) {
        drawRoute(route.start, route.end);
      } else {
        drawStraightLineRoute(route.start, route.end);
      }
      debugLog('?? Route updated:', {
        phase: order?.deliveryState?.currentPhase,
        status: order?.deliveryState?.status,
        from: route.start,
        to: route.end,
        hasBikeMarker: !!bikeMarkerRef.current
      });

      // Force show bike if delivery partner is assigned but bike marker doesn't exist
      if (hasDeliveryPartnerByPhase && !bikeMarkerRef.current && mapInstance.current) {
        debugLog('?????? FORCING bike marker creation after route update!', {
          phase: currentPhase,
          routeStart: route.start,
          routeEnd: route.end,
          restaurantCoords
        });

        // ONLY use real delivery boy location - NEVER use restaurant
        // Priority 1: Use delivery boy's REAL location from socket/state
        if (deliveryBoyLat && deliveryBoyLng) {
          debugLog('??? Creating bike at REAL delivery boy location:', { lat: deliveryBoyLat, lng: deliveryBoyLng });
          moveBikeSmoothly(deliveryBoyLat, deliveryBoyLng, deliveryBoyHeading || 0);
        }
        else {
          debugLog('??? No real location yet - requesting from socket and waiting...');
          if (socketRef.current && socketRef.current.connected) {
            requestCurrentLocationForTrackingIds();
          }
          debugLog('? Bike will be created when real location is received from socket');
        }
      }
    }
  }, [isMapLoaded, deliveryBoyLat, deliveryBoyLng, order?.deliveryState?.currentPhase, order?.deliveryState?.status, restaurantLat, restaurantLng, customerCoords?.lat, customerCoords?.lng, moveBikeSmoothly, desiredRoute, drawRoute, drawStraightLineRoute, routeColor, updateRenderedRouteForLocation, routeMatchesDesiredTarget, ENABLE_GOOGLE_DIRECTIONS, order?.status]);

  // Update bike when REAL location changes (from socket)
  useEffect(() => {
    if (isMapLoaded && currentLocation && currentLocation.lat && currentLocation.lng) {
      debugLog('?????? Updating bike to REAL location:', currentLocation);
      // Always update to real location - this takes priority over restaurant location
      moveBikeSmoothly(currentLocation.lat, currentLocation.lng, currentLocation.heading || 0);
    }
  }, [isMapLoaded, currentLocation?.lat, currentLocation?.lng, currentLocation?.heading, moveBikeSmoothly]);

  // Create bike marker when map loads if we have stored location
  useEffect(() => {
    if (isMapLoaded && mapInstance.current && currentLocation && !bikeMarkerRef.current) {
      debugLog('?? Creating bike marker from stored location on map load:', currentLocation);
      moveBikeSmoothly(currentLocation.lat, currentLocation.lng, currentLocation.heading || 0);
    }
  }, [isMapLoaded, currentLocation, moveBikeSmoothly]);

  // Show bike marker when delivery partner is assigned (even without location yet)
  useEffect(() => {
    if (!isMapLoaded || !mapInstance.current) {
      debugLog('? Map not loaded yet, waiting...');
      return;
    }

    // Also check phase directly as fallback
    const currentPhase = order?.deliveryState?.currentPhase;
    const deliveryStateStatus = order?.deliveryState?.status;

    // Key check: If status is 'accepted', definitely show bike
    const isAccepted = deliveryStateStatus === 'accepted';
    const hasPartnerByPhase = isAccepted ||
      currentPhase === 'en_route_to_pickup' ||
      currentPhase === 'at_pickup' ||
      currentPhase === 'en_route_to_delivery' ||
      deliveryStateStatus === 'reached_pickup' ||
      deliveryStateStatus === 'order_confirmed' ||
      deliveryStateStatus === 'en_route_to_delivery';

    const shouldShowBike = hasDeliveryPartner || hasPartnerByPhase;

    debugLog('?????? BIKE VISIBILITY CHECK:', {
      shouldShowBike,
      isAccepted,
      hasDeliveryPartner,
      hasPartnerByPhase,
      deliveryStateStatus,
      currentPhase,
      hasBikeMarker: !!bikeMarkerRef.current
    });

    debugLog('?? Checking delivery partner assignment:', {
      hasDeliveryPartner,
      hasPartnerByPhase,
      shouldShowBike,
      currentPhase,
      deliveryStateStatus,
      deliveryPartnerId: order?.deliveryPartnerId,
      deliveryPartner: order?.deliveryPartner,
      assignmentInfo: order?.assignmentInfo,
      deliveryState: order?.deliveryState,
      hasBikeMarker: !!bikeMarkerRef.current,
      deliveryBoyLocation: { lat: deliveryBoyLat, lng: deliveryBoyLng, heading: deliveryBoyHeading },
      restaurantCoords: { lat: restaurantLat, lng: restaurantLng },
      mapInstance: !!mapInstance.current,
      isMapLoaded
    });

    if (shouldShowBike && !bikeMarkerRef.current) {
      debugLog('?????? CREATING BIKE MARKER - Delivery partner accepted!');
      debugLog('?? Full order state:', JSON.stringify(order?.deliveryState, null, 2));

      // Priority 1: ALWAYS use delivery boy's REAL location if available (from socket)
      if (deliveryBoyLat && deliveryBoyLng) {
        debugLog('??? Creating bike at REAL delivery boy location:', { lat: deliveryBoyLat, lng: deliveryBoyLng, heading: deliveryBoyHeading });
        moveBikeSmoothly(deliveryBoyLat, deliveryBoyLng, deliveryBoyHeading || 0);
      }
      else {
        if (socketRef.current && socketRef.current.connected) {
          requestCurrentLocationForTrackingIds();
        }
        debugLog('? Waiting for real GPS location from Firebase/socket before showing bike marker');
      }

      // Verify marker was created after a short delay
      setTimeout(() => {
        if (bikeMarkerRef.current) {
          const marker = bikeMarkerRef.current;
          const markerPosition = marker.getPosition();
          const markerVisible = marker.getVisible();
          const markerMap = marker.getMap();

          debugLog('??? BIKE MARKER VERIFICATION:', {
            exists: true,
            visible: markerVisible,
            onMap: !!markerMap,
            position: markerPosition ? {
              lat: markerPosition.lat(),
              lng: markerPosition.lng()
            } : null,
            iconUrl: bikeLogo
          });

          // Force visibility if needed
          if (!markerVisible) {
            debugWarn('?? Bike marker not visible, forcing visibility...');
            marker.setVisible(true);
          }
          if (!markerMap) {
            debugWarn('?? Bike marker not on map, re-adding...');
            marker.setMap(mapInstance.current);
          }
        } else {
          debugWarn('?? Bike marker not created yet - waiting for real delivery boy location from socket');
          // Don't create fallback at restaurant - wait for real location
          // Real location will come via socket and bike will be created in moveBikeSmoothly
          if (socketRef.current && socketRef.current.connected) {
            requestCurrentLocationForTrackingIds();
            debugLog('?? Requested current location from socket for bike marker');
          }
        }
      }, 500);
    } else if (shouldShowBike && bikeMarkerRef.current) {
      // Bike marker exists, just update position if needed
      if (deliveryBoyLat && deliveryBoyLng) {
        moveBikeSmoothly(deliveryBoyLat, deliveryBoyLng, deliveryBoyHeading || 0);
      }
    } else {
      // Remove bike marker if delivery partner is not assigned
      if (bikeMarkerRef.current) {
        debugLog('??? Removing bike marker - no delivery partner');
        bikeMarkerRef.current.setMap(null);
        bikeMarkerRef.current = null;
      }
    }
  }, [isMapLoaded, hasDeliveryPartner, deliveryBoyLat, deliveryBoyLng, deliveryBoyHeading, moveBikeSmoothly, order?.deliveryState?.currentPhase, order?.deliveryState?.status, requestCurrentLocationForTrackingIds]);

  // Periodic check to ensure bike marker is created if it should be visible
  // DISABLED - prevents duplicate marker creation
  // useEffect(() => {
  //   if (!isMapLoaded || !mapInstance.current) return;
  //   
  //   const checkInterval = setInterval(() => {
  //     const currentPhase = order?.deliveryState?.currentPhase;
  //     const deliveryStateStatus = order?.deliveryState?.status;
  //     const shouldHaveBike = deliveryStateStatus === 'accepted' ||
  //                            currentPhase === 'en_route_to_pickup' ||
  //                            currentPhase === 'at_pickup' ||
  //                            currentPhase === 'en_route_to_delivery' ||
  //                            (deliveryStateStatus && deliveryStateStatus !== 'pending');
  //     
  //     if (shouldHaveBike && !bikeMarkerRef.current && restaurantCoords && restaurantCoords.lat && restaurantCoords.lng) {
  //       debugLog('?? Periodic check: Bike should be visible but missing, creating now...');
  //       try {
  //         const position = new window.google.maps.LatLng(restaurantCoords.lat, restaurantCoords.lng);
  //         bikeMarkerRef.current = new window.google.maps.Marker({
  //           position: position,
  //           map: mapInstance.current,
  //           icon: {
  //             url: bikeLogo,
  //             scaledSize: new window.google.maps.Size(50, 50),
  //             anchor: new window.google.maps.Point(25, 25),
  //             rotation: 0
  //           },
  //           optimized: false,
  //           zIndex: window.google.maps.Marker.MAX_ZINDEX + 3,
  //           title: 'Delivery Partner',
  //           visible: true
  //         });
  //         debugLog('??? BIKE MARKER CREATED via periodic check!');
  //       } catch (err) {
  //         debugError('? Periodic bike creation failed:', err);
  //       }
  //     }
  //   }, 2000); // Check every 2 seconds
  //   
  //   return () => clearInterval(checkInterval);
  // }, [isMapLoaded, order?.deliveryState?.currentPhase, order?.deliveryState?.status, restaurantCoords, bikeLogo]);

  // Cleanup animation controller on unmount
  useEffect(() => {
    return () => {
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }
      if (routePolylineShadowRef.current) {
        routePolylineShadowRef.current.setMap(null);
      }
      if (animationControllerRef.current) {
        animationControllerRef.current.destroy();
        animationControllerRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'visible' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default DeliveryTrackingMap;



