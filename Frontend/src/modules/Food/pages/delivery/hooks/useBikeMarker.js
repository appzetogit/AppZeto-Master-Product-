import { useCallback, useRef } from "react";

export function useBikeMarker({
  bikeLogo,
  bikeMarkerRef,
  isUserPanningRef,
  directionsMapInstanceRef, // New prop
  debugLog,
  debugWarn,
  debugError,
}) {
  const rotatedIconCache = useRef(new Map());

  const calculateHeading = useCallback((lat1, lng1, lat2, lng2) => {
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    let heading = (Math.atan2(y, x) * 180) / Math.PI;
    heading = (heading + 360) % 360;
    return heading;
  }, []);

  const getRotatedBikeIcon = useCallback(
    (heading = 0) => {
      const roundedHeading = Math.round(heading / 5) * 5;
      const cacheKey = `${roundedHeading}`;
      if (rotatedIconCache.current.has(cacheKey)) {
        return Promise.resolve(rotatedIconCache.current.get(cacheKey));
      }

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const size = 60;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, size, size);
            ctx.save();
            ctx.translate(size / 2, size / 2);
            ctx.rotate((roundedHeading * Math.PI) / 180);
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
            ctx.restore();

            const dataUrl = canvas.toDataURL();
            rotatedIconCache.current.set(cacheKey, dataUrl);
            resolve(dataUrl);
          } catch (error) {
            debugWarn?.("Error rotating bike icon", error);
            resolve(bikeLogo);
          }
        };
        img.onerror = () => {
          debugWarn?.("Bike logo image failed to load", bikeLogo);
          resolve(bikeLogo);
        };
        img.src = bikeLogo;
        if (img.complete) img.onload();
      });
    },
    [bikeLogo, debugWarn],
  );

  const createOrUpdateBikeMarker = useCallback(
    async (latitude, longitude, heading = null, shouldCenterMap = true) => {
      // Resolve map instance
      const map = (directionsMapInstanceRef && directionsMapInstanceRef.current) || window.deliveryMapInstance;

      if (!window.google || !window.google.maps || !map) {
        debugWarn?.("Google Maps not available");
        return;
      }

      const position = new window.google.maps.LatLng(latitude, longitude);
      const rotatedIconUrl = await getRotatedBikeIcon(heading || 0);

      if (!bikeMarkerRef.current) {
        const bikeIcon = {
          url: rotatedIconUrl,
          scaledSize: new window.google.maps.Size(60, 60),
          anchor: new window.google.maps.Point(30, 30),
        };

        bikeMarkerRef.current = new window.google.maps.Marker({
          position,
          map,
          icon: bikeIcon,
          optimized: false,
          animation: window.google.maps.Animation.DROP,
          zIndex: 1000,
        });

        if (shouldCenterMap) {
          const currentZoom = map.getZoom();
          map.setCenter(position);
          if (currentZoom < 18) map.setZoom(18);
        }

        setTimeout(() => {
          if (bikeMarkerRef.current) bikeMarkerRef.current.setAnimation(null);
        }, 2000);
        return;
      }

      const currentMap = bikeMarkerRef.current.getMap();
      if (currentMap === null || currentMap !== map) {
        bikeMarkerRef.current.setMap(map);
      }

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
        debugError?.("Invalid coordinates for bike marker", { latitude, longitude });
        return;
      }

      bikeMarkerRef.current.setPosition(position);

      const currentHeading = heading !== null && heading !== undefined ? heading : 0;
      const iconUrl = await getRotatedBikeIcon(currentHeading);
      bikeMarkerRef.current.setIcon({
        url: iconUrl,
        scaledSize: new window.google.maps.Size(60, 60),
        anchor: new window.google.maps.Point(30, 30),
      });
      bikeMarkerRef.current.setZIndex(1000);

      if (shouldCenterMap && !isUserPanningRef.current) {
        map.panTo(position);
      }

      if (bikeMarkerRef.current.getMap() === null) {
        bikeMarkerRef.current.setMap(map);
      }
    },
    [bikeMarkerRef, debugError, debugWarn, getRotatedBikeIcon, isUserPanningRef],
  );

  return { calculateHeading, getRotatedBikeIcon, createOrUpdateBikeMarker };
}

