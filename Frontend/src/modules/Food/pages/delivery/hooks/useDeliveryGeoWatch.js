import { useEffect, useRef } from "react";
import io from "socket.io-client";
import { API_BASE_URL } from "@food/api/config";
import { writeOrderTracking, writeDeliveryLocation } from "@food/realtimeTracking";
import { extractPolylineFromDirections } from "@food/utils/liveTrackingPolyline";
import {
  DELIVERY_LOCATION_FALLBACK_INTERVAL_MS,
  DELIVERY_LOCATION_MIN_MOVE_METERS,
  DELIVERY_LOCATION_SEND_INTERVAL_MS,
} from "../constants/deliveryHome.constants";
import { haversineDistance, shouldAcceptLocation } from "../utils/deliveryGeo";

export function useDeliveryGeoWatch({
  deliveryAPI,
  mapContainerRef,
  setRiderLocation,
  lastLocationRef,
  lastValidLocationRef,
  lastLocationTimeRef,
  smoothedLocationRef,
  locationHistoryRef,
  routeHistoryRef,
  watchPositionIdRef,
  bikeMarkerRef,
  markerAnimationRef,
  isUserPanningRef,
  directionsResponseRef,
  updateLiveTrackingPolyline,
  createOrUpdateBikeMarker,
  updateRoutePolyline,
  smoothLocation,
  calculateHeading,
  animateMarkerSmoothly,
  debugLog,
  debugWarn,
  debugError,
  toast,
  isOnlineRef,
  activeOrderId = null,
  userId = null,
  restaurantId = null,
  simulationEnabled = false,
}) {
  // ─── Socket connection for live location emission ───
  const socketRef = useRef(null);
  const activeOrderIdRef = useRef(activeOrderId);
  const userIdRef = useRef(userId);
  const restaurantIdRef = useRef(restaurantId);

  // Keep refs in sync with props to avoid stale closures in watchPosition callback
  useEffect(() => {
    activeOrderIdRef.current = activeOrderId;
    userIdRef.current = userId;
    restaurantIdRef.current = restaurantId;
  }, [activeOrderId, userId, restaurantId]);

  useEffect(() => {
    const token = localStorage.getItem('delivery_accessToken') || localStorage.getItem('accessToken');
    if (!token) return;

    const backendUrl = String(API_BASE_URL || '').trim()
      .replace(/\/api\/v1\/?$/i, '').replace(/\/api\/?$/i, '');
    if (!backendUrl) return;

    socketRef.current = io(backendUrl, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current.on('connect', () => {
      debugLog?.('🔌 Delivery tracking socket connected:', socketRef.current?.id);
      if (activeOrderId) {
        socketRef.current.emit('join-tracking', activeOrderId);
      }
    });

    socketRef.current.on('connect_error', (err) => {
      debugWarn?.('Socket connect error:', err?.message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [activeOrderId]);

  /**
   * Emit location update via socket for real-time user tracking.
   * Called alongside the existing REST API + Firebase writes.
   */
   const emitLocationViaSocket = (lat, lng, heading, speed, accuracy) => {
    const currentOrderId = activeOrderIdRef.current;
    if (!socketRef.current?.connected || !currentOrderId) return;
    // Extract polyline from directions if available
    let polyline = null;
    if (directionsResponseRef && directionsResponseRef.current) {
      try {
        polyline = extractPolylineFromDirections(directionsResponseRef.current);
      } catch (err) {
        debugWarn?.("Error extracting polyline for socket emit:", err);
      }
    }

    socketRef.current.emit("update-location", {
      orderId: currentOrderId,
      userId: userIdRef.current,
      restaurantId: restaurantIdRef.current,
      lat,
      lng,
      heading: typeof heading === 'number' ? heading : 0,
      speed: typeof speed === 'number' ? speed : 0,
      accuracy: typeof accuracy === 'number' ? accuracy : null,
      polyline,
      timestamp: Date.now(),
    });
  };

  // Initial location on mount
  useEffect(() => {
    if (simulationEnabled) return;
    if (!navigator.geolocation) {
      debugError?.("Geolocation API not available in this browser");
      toast?.error?.("Location services not available. Please use a device with GPS.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy || 0;

        if (
          typeof latitude !== "number" ||
          typeof longitude !== "number" ||
          Number.isNaN(latitude) ||
          Number.isNaN(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          debugWarn?.("Invalid coordinates received on app open", { latitude, longitude });
          return;
        }

        const shouldAccept = shouldAcceptLocation(position, lastValidLocationRef.current, lastLocationTimeRef.current);
        if (!shouldAccept) return;

        const rawLocation = [latitude, longitude];
        locationHistoryRef.current = [rawLocation];
        const smoothedLocation = rawLocation;

        lastValidLocationRef.current = smoothedLocation;
        lastLocationTimeRef.current = Date.now();
        smoothedLocationRef.current = smoothedLocation;

        const heading =
          position.coords.heading !== null && position.coords.heading !== undefined ? position.coords.heading : null;

        routeHistoryRef.current = [{ lat: smoothedLocation[0], lng: smoothedLocation[1] }];
        localStorage.setItem("deliveryBoyLastLocation", JSON.stringify(smoothedLocation));

        setRiderLocation(smoothedLocation);
        lastLocationRef.current = smoothedLocation;

        if (window.deliveryMapInstance) {
          window.deliveryMapInstance.setCenter({ lat: smoothedLocation[0], lng: smoothedLocation[1] });
          window.deliveryMapInstance.setZoom(18);
          createOrUpdateBikeMarker(smoothedLocation[0], smoothedLocation[1], heading, !isUserPanningRef.current);
          updateRoutePolyline();
        } else {
          // Map will init later using riderLocation
          if (!window.deliveryMapInstance && window.google && window.google.maps && mapContainerRef.current) {
            debugLog?.("Map not initialized yet, will initialize when map mounts");
          }
        }

        const currentOrderId = activeOrderIdRef.current;
        if (currentOrderId) {
          let polyline = null;
          if (directionsResponseRef && directionsResponseRef.current) {
            try {
              polyline = extractPolylineFromDirections(directionsResponseRef.current);
            } catch (err) {
              debugWarn?.("Error extracting polyline for Firebase:", err);
            }
          }
          
          writeOrderTracking(currentOrderId, {
            lat: smoothedLocation[0],
            lng: smoothedLocation[1],
            boy_lat: smoothedLocation[0],
            boy_lng: smoothedLocation[1],
            heading: heading || 0,
            accuracy: accuracy || 0,
            polyline: polyline
          }).catch((err) => debugError?.("Firebase tracking failed:", err));
          
          emitLocationViaSocket(smoothedLocation[0], smoothedLocation[1], heading, 0, accuracy);
        }

        debugLog?.("Current location obtained on app open (filtered)", {
          raw: { lat: latitude, lng: longitude },
          smoothed: { lat: smoothedLocation[0], lng: smoothedLocation[1] },
          heading,
          accuracy: `${accuracy.toFixed(0)}m`,
          isOnline: isOnlineRef.current,
          timestamp: new Date().toISOString(),
        });
      },
      (error) => {
        debugWarn?.("Error getting current location:", error);
        const savedLoc = localStorage.getItem("deliveryBoyLastLocation");
        if (!savedLoc) {
          setTimeout(() => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                if (
                  typeof lat === "number" &&
                  typeof lng === "number" &&
                  !Number.isNaN(lat) &&
                  !Number.isNaN(lng) &&
                  lat >= -90 &&
                  lat <= 90 &&
                  lng >= -180 &&
                  lng <= 180
                ) {
                  const newLocation = [lat, lng];
                  setRiderLocation(newLocation);
                  lastLocationRef.current = newLocation;
                  smoothedLocationRef.current = newLocation;
                  lastValidLocationRef.current = newLocation;
                  locationHistoryRef.current = [newLocation];
                  localStorage.setItem("deliveryBoyLastLocation", JSON.stringify(newLocation));

                  if (window.deliveryMapInstance) {
                    window.deliveryMapInstance.setCenter({ lat, lng });
                    window.deliveryMapInstance.setZoom(18);
                    if (bikeMarkerRef.current) {
                      bikeMarkerRef.current.setPosition({ lat, lng });
                    } else {
                      createOrUpdateBikeMarker(lat, lng, null, true);
                    }
                  }
                }
              },
              (err) => {
                debugWarn?.("Retry also failed:", err);
                toast?.error?.("Location access required. Please enable location permissions.");
              },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
            );
          }, 3000);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
    // Do NOT depend on riderLocation — it updates every GPS tick and would restart watchPosition + spam APIs.
  }, [simulationEnabled]);

  // Live watchPosition (runs regardless of online; only sends to backend when online)
  useEffect(() => {
    if (simulationEnabled) return;
    if (!navigator.geolocation) return;

    if (watchPositionIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPositionIdRef.current);
      watchPositionIdRef.current = null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy || 0;

        if (
          typeof latitude !== "number" ||
          typeof longitude !== "number" ||
          Number.isNaN(latitude) ||
          Number.isNaN(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          debugWarn?.("Invalid coordinates received:", { latitude, longitude });
          return;
        }

        const accepted = shouldAcceptLocation(position, lastValidLocationRef.current, lastLocationTimeRef.current);
        if (!accepted) {
          if (isOnlineRef.current && lastValidLocationRef.current) {
            const now = Date.now();
            const lastSentTime = window.lastLocationSentTime || 0;
            const timeSinceLastSend = now - lastSentTime;
            if (timeSinceLastSend >= DELIVERY_LOCATION_FALLBACK_INTERVAL_MS) {
              const [lat, lng] = lastValidLocationRef.current;
              // Only attempt update if we have an access token to avoid 401 console spam
              const hasToken = !!(localStorage.getItem("delivery_accessToken") || localStorage.getItem("accessToken"));
              if (hasToken) {
                deliveryAPI
                  .updateLocation(lat, lng, true, {
                    heading: typeof position.coords.heading === "number" ? position.coords.heading : 0,
                    speed: typeof position.coords.speed === "number" ? position.coords.speed : 0,
                    accuracy,
                  })
                  .then(() => {
                    window.lastLocationSentTime = now;
                    if (activeOrderId) {
                      writeOrderTracking(activeOrderId, {
                        lat,
                        lng,
                        heading: typeof position.coords.heading === "number" ? position.coords.heading : 0,
                      }).catch(() => {});
                      emitLocationViaSocket(lat, lng, position.coords.heading, position.coords.speed, accuracy);
                    }
                  })
                  .catch(() => {});
              }
            }
          }
          return;
        }

        const rawLocation = [latitude, longitude];
        locationHistoryRef.current.push(rawLocation);
        if (locationHistoryRef.current.length > 5) locationHistoryRef.current.shift();

        const smoothedLocation = smoothLocation(locationHistoryRef.current) || rawLocation;

        const [smoothedLat, smoothedLng] = smoothedLocation;
        let heading =
          position.coords.heading !== null && position.coords.heading !== undefined ? position.coords.heading : null;
        if (heading === null && smoothedLocationRef.current) {
          const [prevLat, prevLng] = smoothedLocationRef.current;
          heading = calculateHeading(prevLat, prevLng, smoothedLat, smoothedLng);
        }

        lastValidLocationRef.current = smoothedLocation;
        lastLocationTimeRef.current = Date.now();
        smoothedLocationRef.current = smoothedLocation;

        routeHistoryRef.current.push({ lat: smoothedLat, lng: smoothedLng });
        if (routeHistoryRef.current.length > 1000) routeHistoryRef.current.shift();
        localStorage.setItem("deliveryBoyLastLocation", JSON.stringify(smoothedLocation));

        const currentDirectionsResponse = directionsResponseRef.current;
        if (currentDirectionsResponse?.routes?.length || currentDirectionsResponse?.fallbackPoints) {
          updateLiveTrackingPolyline(currentDirectionsResponse, smoothedLocation);
        }

        setRiderLocation(smoothedLocation);
        lastLocationRef.current = smoothedLocation;

        if (window.deliveryMapInstance) {
          if (bikeMarkerRef.current) {
            animateMarkerSmoothly(bikeMarkerRef.current, { lat: smoothedLat, lng: smoothedLng }, 1500, markerAnimationRef);
          } else {
            createOrUpdateBikeMarker(smoothedLat, smoothedLng, heading, !isUserPanningRef.current);
          }
        }

        updateRoutePolyline();

        if (isOnlineRef.current) {
          const now = Date.now();
          const lastSentTime = window.lastLocationSentTime || 0;
          const timeSinceLastSend = now - lastSentTime;
          const lastSentLocation = window.lastSentLocation || null;

          const movedEnough =
            Array.isArray(lastSentLocation) &&
            lastSentLocation.length === 2 &&
            Math.abs(lastSentLocation[0] - smoothedLat) + Math.abs(lastSentLocation[1] - smoothedLng) > 0.00001;

          if (timeSinceLastSend >= DELIVERY_LOCATION_SEND_INTERVAL_MS || movedEnough) {
            // Only attempt update if we have an access token to avoid 401 console spam
            const hasToken = !!(localStorage.getItem("delivery_accessToken") || localStorage.getItem("accessToken"));
            if (hasToken) {
              deliveryAPI
                .updateLocation(smoothedLat, smoothedLng, true, {
                  heading: typeof heading === "number" ? heading : 0,
                  speed: typeof position.coords.speed === "number" ? position.coords.speed : 0,
                  accuracy,
                })
                .then(() => {
                  window.lastLocationSentTime = now;
                  window.lastSentLocation = smoothedLocation;
                  const currentOrderId = activeOrderIdRef.current;
                  if (currentOrderId) {
                    // Extract polyline from directions if available
                    let polyline = null;
                    if (directionsResponseRef && directionsResponseRef.current) {
                      try {
                        polyline = extractPolylineFromDirections(directionsResponseRef.current);
                      } catch (err) {
                        debugWarn?.("Error extracting polyline for Firebase/Socket:", err);
                      }
                    }

                    writeOrderTracking(currentOrderId, {
                      lat: smoothedLat,
                      lng: smoothedLng,
                      heading: typeof heading === "number" ? heading : 0,
                      polyline,
                    }).catch(() => {});
                    emitLocationViaSocket(smoothedLat, smoothedLng, heading, position.coords.speed, accuracy);
                    writeDeliveryLocation({
                      deliveryId: userIdRef.current,
                      lat: smoothedLat,
                      lng: smoothedLng,
                      heading: typeof heading === 'number' ? heading : 0,
                      speed: typeof position.coords.speed === 'number' ? position.coords.speed : 0,
                      activeOrderId: currentOrderId,
                      accuracy,
                      polyline,
                    }).catch(() => {});
                  }
                })
                .catch(() => {});
            }
          }
        }
      },
      (error) => debugWarn?.("Error watching location:", error),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );

    watchPositionIdRef.current = watchId;

    return () => {
      if (watchPositionIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
        watchPositionIdRef.current = null;
      }
    };
    // Do NOT depend on riderLocation — it updates every GPS tick and would restart watchPosition + spam APIs.
    // Do NOT depend on riderLocation — it updates every GPS tick and would restart watchPosition + spam APIs.
  }, [deliveryAPI, simulationEnabled]);

  // ─── Simulation Helpers ───
  /**
   * Manually trigger a location update for simulation.
   */
  const simulateLocationUpdate = (lat, lng, forcedHeading = null) => {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

    const newLocation = [lat, lng];
    let heading = forcedHeading;
    
    // Auto-calculate heading if not provided and previous point exists
    if (heading === null && smoothedLocationRef.current) {
      const [prevLat, prevLng] = smoothedLocationRef.current;
      heading = calculateHeading(prevLat, prevLng, lat, lng);
    }
    if (heading === null) heading = 0;

    // Update refs and state
    lastValidLocationRef.current = newLocation;
    lastLocationTimeRef.current = Date.now();
    smoothedLocationRef.current = newLocation;
    lastLocationRef.current = newLocation;
    setRiderLocation(newLocation);
    localStorage.setItem("deliveryBoyLastLocation", JSON.stringify(newLocation));

    // Update Map UI immediately
    if (window.deliveryMapInstance) {
      if (bikeMarkerRef.current) {
        animateMarkerSmoothly(bikeMarkerRef.current, { lat, lng }, 800, markerAnimationRef);
      } else {
        createOrUpdateBikeMarker(lat, lng, heading, !isUserPanningRef.current);
      }
      
      const directions = directionsResponseRef.current;
      if (directions?.routes?.length || directions?.fallbackPoints) {
        updateLiveTrackingPolyline(directions, newLocation);
      }
      updateRoutePolyline();
    }

    // Sync Tracking (Socket, Firebase, Backend)
    if (isOnlineRef.current) {
      // 1. REST API
      deliveryAPI.updateLocation(lat, lng, true, { heading, speed: 0, accuracy: 0 }).catch(() => {});
      
      const currentOrderId = activeOrderIdRef.current;
      if (currentOrderId) {
        let polyline = null;
        try { polyline = extractPolylineFromDirections(directionsResponseRef.current); } catch (e) {}

        // 2. Firebase tracking
        writeOrderTracking(currentOrderId, {
          lat, lng, boy_lat: lat, boy_lng: lng, heading, accuracy: 0, polyline
        }).catch(() => {});
        
        // 3. Socket broadcast
        emitLocationViaSocket(lat, lng, heading, 0, 0);
        
        // 4. Multi-party realtime sync
        writeDeliveryLocation({
          deliveryId: userIdRef.current,
          lat, lng, heading, speed: 0, activeOrderId: currentOrderId, accuracy: 0, polyline
        }).catch(() => {});
      }
    }
  };

  return { simulateLocationUpdate };
}

