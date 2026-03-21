import { useEffect } from "react";
import { writeOrderTracking } from "@food/realtimeTracking";
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
}) {
  // Initial location on mount
  useEffect(() => {
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

        if (activeOrderId) {
          writeOrderTracking(activeOrderId, {
            lat: smoothedLocation[0],
            lng: smoothedLocation[1],
            heading: heading || 0,
          }).catch((err) => debugError?.("Firebase tracking failed:", err));
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
  }, []);

  // Live watchPosition (runs regardless of online; only sends to backend when online)
  useEffect(() => {
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
        if (currentDirectionsResponse?.routes?.length) {
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
                  if (activeOrderId) {
                    writeOrderTracking(activeOrderId, {
                      lat: smoothedLat,
                      lng: smoothedLng,
                      heading: typeof heading === "number" ? heading : 0,
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
  }, [deliveryAPI]);
}

