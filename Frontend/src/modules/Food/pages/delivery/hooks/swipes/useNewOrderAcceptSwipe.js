import { useState, useRef, useCallback } from "react";
import { writeOrderTracking } from "@food/realtimeTracking";
import { extractPolylineFromDirections } from "@food/utils/liveTrackingPolyline";
import { toast } from "sonner";
export function useNewOrderAcceptSwipe({
  newOrderAcceptButtonRef,
  newOrderAcceptButtonSwipeStartX,
  newOrderAcceptButtonSwipeStartY,
  newOrderAcceptButtonIsSwiping,
  isAcceptingNewOrderRef,
  setIsAcceptingNewOrder,
  setNewOrderIsAnimatingToComplete,
  setNewOrderAcceptButtonProgress,
  alertAudioRef,
  debugLog,
  debugWarn,
  debugError,
  toast,
  selectedRestaurant,
  newOrder,
  riderLocation,
  lastLocationRef,
  deliveryAPI,
  restaurantAPI,
  calculateRouteWithDirectionsAPI,
  updateLiveTrackingPolyline,
  directionsResponse,
  setDirectionsResponse,
  directionsResponseRef,
  pickupRouteDistanceRef,
  pickupRouteTimeRef,
  setRoutePolyline,
  setSelectedRestaurant,
  acceptedOrderIdsRef,
  clearNewOrder,
  setShowNewOrderPopup,
  setIsNewOrderPopupMinimized,
  setNewOrderDragY,
  setShowRoutePath,
  setShowDirectionsMap,
  directionsRendererRef,
  routePolylineRef,
  createRestaurantMapMarker,
  DELIVERY_ACTIVE_ORDER_KEY,
  setShowreachedPickupPopup,
}) {
  const getTouchPoint = (e) => {
    const touch = e?.touches?.[0] || e?.changedTouches?.[0];
    if (!touch) return null;
    return { x: touch.clientX, y: touch.clientY };
  };

  const handleNewOrderAcceptTouchStart = useCallback(
    (e) => {
      if (isAcceptingNewOrderRef.current) return;
      const touch = getTouchPoint(e);
      if (!touch) return;
      newOrderAcceptButtonSwipeStartX.current = touch.x;
      newOrderAcceptButtonSwipeStartY.current = touch.y;
      newOrderAcceptButtonIsSwiping.current = false;
      setNewOrderIsAnimatingToComplete(false);
      setNewOrderAcceptButtonProgress(0);
    },
    [
      isAcceptingNewOrderRef,
      newOrderAcceptButtonSwipeStartX,
      newOrderAcceptButtonSwipeStartY,
      newOrderAcceptButtonIsSwiping,
      setNewOrderIsAnimatingToComplete,
      setNewOrderAcceptButtonProgress,
    ],
  );

  const handleNewOrderAcceptTouchMove = useCallback(
    (e) => {
      if (isAcceptingNewOrderRef.current) return;
      const touch = getTouchPoint(e);
      if (!touch) return;
      const deltaX = touch.x - newOrderAcceptButtonSwipeStartX.current;
      const deltaY = touch.y - newOrderAcceptButtonSwipeStartY.current;

      if (Math.abs(deltaX) > 5 && Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
        newOrderAcceptButtonIsSwiping.current = true;
        const buttonWidth = newOrderAcceptButtonRef.current?.offsetWidth || 300;
        const circleWidth = 56;
        const padding = 16;
        const maxSwipe = buttonWidth - circleWidth - padding * 2;
        const progress = Math.min(Math.max(deltaX / maxSwipe, 0), 1);
        setNewOrderAcceptButtonProgress(progress);
      }
    },
    [
      isAcceptingNewOrderRef,
      newOrderAcceptButtonSwipeStartX,
      newOrderAcceptButtonSwipeStartY,
      newOrderAcceptButtonIsSwiping,
      newOrderAcceptButtonRef,
      setNewOrderAcceptButtonProgress,
    ],
  );

  const handleNewOrderAcceptTouchEnd = useCallback(
    (e) => {
      if (isAcceptingNewOrderRef.current) return;
      const touch = getTouchPoint(e);
      const deltaX =
        (touch?.x || newOrderAcceptButtonSwipeStartX.current) - newOrderAcceptButtonSwipeStartX.current;
      if (!newOrderAcceptButtonIsSwiping.current && deltaX > 30) {
        newOrderAcceptButtonIsSwiping.current = true;
      }

      if (!newOrderAcceptButtonIsSwiping.current) {
        setNewOrderAcceptButtonProgress(0);
        return;
      }

      const buttonWidth = newOrderAcceptButtonRef.current?.offsetWidth || 300;
      const circleWidth = 56;
      const padding = 16;
      const maxSwipe = buttonWidth - circleWidth - padding * 2;
      const threshold = maxSwipe * 0.55;

      if (deltaX > threshold) {
        isAcceptingNewOrderRef.current = true;
        setIsAcceptingNewOrder(true);
        if (alertAudioRef.current) {
          alertAudioRef.current.pause();
          alertAudioRef.current.currentTime = 0;
          alertAudioRef.current = null;
          debugLog("[NewOrder] Audio stopped (order accepted)");
        }

        setNewOrderIsAnimatingToComplete(true);
        setNewOrderAcceptButtonProgress(1);

        const acceptOrderAndShowRoute = async () => {
          const orderId =
            selectedRestaurant?.id ||
            selectedRestaurant?.orderId ||
            newOrder?.orderMongoId ||
            newOrder?.mongoId ||
            newOrder?.id ||
            newOrder?._id ||
            newOrder?.orderId;

          if (!orderId) {
            debugError("No order ID found to accept");
            toast.error("Order ID not found. Please try again.");
            setNewOrderAcceptButtonProgress(0);
            setNewOrderIsAnimatingToComplete(false);
            return;
          }

          let currentLocation = null;
          try {
            currentLocation = riderLocation;
            if (!currentLocation || currentLocation.length !== 2) currentLocation = lastLocationRef.current;
            if (!currentLocation || currentLocation.length !== 2) {
              const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                  (p) => resolve([p.coords.latitude, p.coords.longitude]),
                  reject,
                  { timeout: 5000, enableHighAccuracy: true },
                );
              });
              currentLocation = pos;
            }

            if (!currentLocation || currentLocation.length !== 2) {
              toast.error("Location not available. Please enable location services.");
              return;
            }

            const response = await deliveryAPI.acceptOrder(orderId, {
              currentLat: currentLocation[0],
              currentLng: currentLocation[1],
              lat: currentLocation[0],
              lng: currentLocation[1],
            });

            if (response.data?.success && response.data.data) {
              if (alertAudioRef.current) {
                alertAudioRef.current.pause();
                alertAudioRef.current.currentTime = 0;
                alertAudioRef.current = null;
              }

              const orderData = response.data.data;
              const order = orderData.order || orderData;
              const routeData = response.data.data.route;

              let restaurantInfo = null;
              if (order) {
                const restaurantCoords = order.restaurantId?.location?.coordinates || [];
                const restaurantLat = restaurantCoords[1];
                const restaurantLng = restaurantCoords[0];

                let restaurantAddress = "Restaurant Address";
                const restaurantLocation = order.restaurantId?.location;
                if (order.restaurantId?.address) restaurantAddress = order.restaurantId.address;
                else if (restaurantLocation?.formattedAddress) restaurantAddress = restaurantLocation.formattedAddress;
                else if (restaurantLocation?.address) restaurantAddress = restaurantLocation.address;
                else if (order.restaurantAddress) restaurantAddress = order.restaurantAddress;

                let restaurantName = order.restaurantName?.trim?.() || order.restaurantId?.name?.trim?.() || "Restaurant";

                const backendEarnings = orderData.estimatedEarnings || response.data.data.estimatedEarnings;
                const earningsValue =
                  backendEarnings
                    ? typeof backendEarnings === "object"
                      ? backendEarnings.totalEarning
                      : backendEarnings
                    : selectedRestaurant?.estimatedEarnings || 0;

                restaurantInfo = {
                  id: order._id || order.orderId,
                  orderId: order.orderId,
                  name: restaurantName,
                  address: restaurantAddress,
                  lat: restaurantLat || selectedRestaurant?.lat,
                  lng: restaurantLng || selectedRestaurant?.lng,
                  distance: selectedRestaurant?.distance || "0 km",
                  timeAway: selectedRestaurant?.timeAway || "0 mins",
                  dropDistance: selectedRestaurant?.dropDistance || "0 km",
                  pickupDistance: selectedRestaurant?.pickupDistance || "0 km",
                  estimatedEarnings: backendEarnings || selectedRestaurant?.estimatedEarnings || 0,
                  amount: earningsValue,
                  customerName: order.userId?.name || selectedRestaurant?.customerName,
                  customerPhone: order.userId?.phone || selectedRestaurant?.customerPhone || null,
                  customerAddress:
                    order.deliveryAddress?.formattedAddress ||
                    (order.deliveryAddress?.street ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city || ""}, ${order.deliveryAddress.state || ""}`.trim() : "") ||
                    selectedRestaurant?.customerAddress,
                  customerLat: order.deliveryAddress?.location?.coordinates?.[1] || order.address?.location?.coordinates?.[1],
                  customerLng: order.deliveryAddress?.location?.coordinates?.[0] || order.address?.location?.coordinates?.[0],
                  items: order.items || [],
                  total: order.pricing?.total || 0,
                  paymentMethod: order.paymentMethod || order.payment?.method || "razorpay",
                  deliveryVerification: order.deliveryVerification || null,
                  phone: order.restaurantId?.phone || order.restaurantId?.ownerPhone || null,
                  ownerPhone: order.restaurantId?.ownerPhone || null,
                  orderStatus: order.status || "preparing",
                  deliveryState: {
                    ...(order.deliveryState || {}),
                    currentPhase: "en_route_to_pickup",
                    status: "accepted",
                  },
                  deliveryPhase: "en_route_to_pickup",
                };
                setSelectedRestaurant(restaurantInfo);
              }

              if (!restaurantInfo) return;

              let routeCoordinates = null;
              let directionsResultForMap = null;
              if (routeData?.coordinates?.length) {
                routeCoordinates = routeData.coordinates;
                setRoutePolyline(routeCoordinates);
              }

              if (restaurantInfo.lat && restaurantInfo.lng && currentLocation) {
                try {
                  const directionsResult = await calculateRouteWithDirectionsAPI(currentLocation, {
                    lat: restaurantInfo.lat,
                    lng: restaurantInfo.lng,
                  });
                  if (directionsResult) {
                    pickupRouteDistanceRef.current = directionsResult.routes[0]?.legs[0]?.distance?.value || 0;
                    pickupRouteTimeRef.current = directionsResult.routes[0]?.legs[0]?.duration?.value || 0;
                    setDirectionsResponse(directionsResult);
                    directionsResponseRef.current = directionsResult;
                    directionsResultForMap = directionsResult;
                    if (window.deliveryMapInstance) {
                      updateLiveTrackingPolyline(directionsResult, currentLocation);
                    } else {
                      setTimeout(() => {
                        if (window.deliveryMapInstance) updateLiveTrackingPolyline(directionsResult, currentLocation);
                      }, 500);
                    }

                    // CRITICAL: Immediately push initial tracking to Firebase so customer sees it instantly
                    // Don't wait for the first GPS move
                    try {
                      const initialPolyline = extractPolylineFromDirections(directionsResult);
                      const orderIdForTracking = restaurantInfo._id || restaurantInfo.id;
                      if (orderIdForTracking && currentLocation) {
                        writeOrderTracking(orderIdForTracking, {
                          lat: currentLocation[0],
                          lng: currentLocation[1],
                          heading: 0,
                          polyline: initialPolyline,
                          status: 'accepted',
                          timestamp: Date.now()
                        }).then(() => {
                          console.log('? Initial tracking record created in Firebase');
                        });
                      }
                    } catch (fbErr) {
                      console.warn('? Failed to write initial tracking to Firebase:', fbErr);
                    }
                  }
                } catch (err) {
                  debugWarn("Directions API error", err);
                }
              }

              setShowNewOrderPopup(false);
              const acceptedOrderId = restaurantInfo.id || restaurantInfo.orderId || newOrder?.orderMongoId || newOrder?.orderId;
              if (acceptedOrderId) acceptedOrderIdsRef.current.add(acceptedOrderId);
              clearNewOrder();

              setShowRoutePath(true);
              setShowDirectionsMap(false);

              setTimeout(() => {
                if (window.deliveryMapInstance && restaurantInfo) {
                  const dr =
                    directionsResultForMap ||
                    (directionsResponse && directionsResponse.routes && directionsResponse.routes.length > 0
                      ? directionsResponse
                      : null);

                  if (dr?.routes?.length) {
                    if (!directionsRendererRef.current) {
                      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                        suppressMarkers: true,
                        polylineOptions: { strokeWeight: 0, strokeOpacity: 0, zIndex: -1, icons: [] },
                        preserveViewport: true,
                      });
                    }
                    try {
                      if (routePolylineRef.current) {
                        routePolylineRef.current.setMap(null);
                        routePolylineRef.current = null;
                      }
                      if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
                      const bounds = dr.routes[0].bounds;
                      if (bounds) window.deliveryMapInstance.fitBounds(bounds, { padding: 100 });
                    } catch {}
                  } else if (routeCoordinates?.length) {
                    setRoutePolyline(routeCoordinates);
                  }

                  if (restaurantInfo.lat && restaurantInfo.lng) {
                    createRestaurantMapMarker({ lat: restaurantInfo.lat, lng: restaurantInfo.lng }, restaurantInfo.name || "Kitchen");
                  }
                }

                try {
                  localStorage.setItem(
                    DELIVERY_ACTIVE_ORDER_KEY,
                    JSON.stringify({
                      orderId: restaurantInfo.id || restaurantInfo.orderId,
                      restaurantInfo,
                      routeCoordinates,
                      acceptedAt: new Date().toISOString(),
                      hasDirectionsAPI: !!directionsResultForMap,
                      uiStage: "en_route_to_pickup",
                    }),
                  );
                } catch {}

                setShowreachedPickupPopup(true);
              }, 300);
            } else {
              toast.error(response.data?.message || "Failed to accept order. Please try again.");
              setShowNewOrderPopup(false);
              setIsNewOrderPopupMinimized(false);
              setNewOrderDragY(0);
            }
          } catch (error) {
            debugError("Error accepting order", error);
            toast.error(error?.response?.data?.message || error.message || "Failed to accept order. Please try again.");
            setShowNewOrderPopup(false);
            setIsNewOrderPopupMinimized(false);
            setNewOrderDragY(0);
          } finally {
            isAcceptingNewOrderRef.current = false;
            setIsAcceptingNewOrder(false);
            setTimeout(() => {
              setNewOrderAcceptButtonProgress(0);
              setNewOrderIsAnimatingToComplete(false);
            }, 500);
          }
        };

        acceptOrderAndShowRoute();
      } else {
        setNewOrderAcceptButtonProgress(0);
      }

      newOrderAcceptButtonSwipeStartX.current = 0;
      newOrderAcceptButtonSwipeStartY.current = 0;
      newOrderAcceptButtonIsSwiping.current = false;
    },
    [
      isAcceptingNewOrderRef,
      newOrderAcceptButtonSwipeStartX,
      newOrderAcceptButtonSwipeStartY,
      newOrderAcceptButtonIsSwiping,
      newOrderAcceptButtonRef,
      setIsAcceptingNewOrder,
      setNewOrderIsAnimatingToComplete,
      setNewOrderAcceptButtonProgress,
      alertAudioRef,
      debugLog,
      debugWarn,
      debugError,
      toast,
      selectedRestaurant,
      newOrder,
      riderLocation,
      lastLocationRef,
      deliveryAPI,
      calculateRouteWithDirectionsAPI,
      updateLiveTrackingPolyline,
      directionsResponse,
      setDirectionsResponse,
      directionsResponseRef,
      pickupRouteDistanceRef,
      pickupRouteTimeRef,
      setRoutePolyline,
      setSelectedRestaurant,
      acceptedOrderIdsRef,
      clearNewOrder,
      setShowNewOrderPopup,
      setIsNewOrderPopupMinimized,
      setNewOrderDragY,
      setShowRoutePath,
      setShowDirectionsMap,
      directionsRendererRef,
      routePolylineRef,
      createRestaurantMapMarker,
      DELIVERY_ACTIVE_ORDER_KEY,
      setShowreachedPickupPopup,
    ],
  );

  const handleNewOrderAcceptTouchCancel = useCallback(() => {
    if (isAcceptingNewOrderRef.current) return;
    newOrderAcceptButtonSwipeStartX.current = 0;
    newOrderAcceptButtonSwipeStartY.current = 0;
    newOrderAcceptButtonIsSwiping.current = false;
    setNewOrderAcceptButtonProgress(0);
    setNewOrderIsAnimatingToComplete(false);
  }, [
    isAcceptingNewOrderRef,
    newOrderAcceptButtonSwipeStartX,
    newOrderAcceptButtonSwipeStartY,
    newOrderAcceptButtonIsSwiping,
    setNewOrderAcceptButtonProgress,
    setNewOrderIsAnimatingToComplete,
  ]);

  return {
    handleNewOrderAcceptTouchStart,
    handleNewOrderAcceptTouchMove,
    handleNewOrderAcceptTouchEnd,
    handleNewOrderAcceptTouchCancel,
  };
}

