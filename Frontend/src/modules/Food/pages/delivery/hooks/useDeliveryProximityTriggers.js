import { useEffect, useMemo } from "react";
import {
  DROP_REACHED_THRESHOLD_METERS,
  PICKUP_REACHED_THRESHOLD_METERS,
} from "../constants/deliveryHome.constants";
import { getCustomerDestination, isDirectionsResultNearDestination, toFiniteCoordinate } from "../utils/deliveryGeo";

export function useDeliveryProximityTriggers({
  riderLocation,
  lastLocationRef,
  selectedRestaurant,
  setSelectedRestaurant,
  newOrder,
  showPaymentPage,
  showCustomerReviewPopup,
  showOrderDeliveredAnimation,
  showNewOrderPopup,
  showreachedPickupPopup,
  setShowreachedPickupPopup,
  showOrderIdConfirmationPopup,
  setShowOrderIdConfirmationPopup,
  showReachedDropPopup,
  setShowReachedDropPopup,
  setShowDirectionsMap,
  setShowRoutePath,
  directionsResponseRef,
  setDirectionsResponse,
  calculateRouteWithDirectionsAPI,
  updateLiveTrackingPolyline,
  calculateDistanceInMeters,
  deliveryAPI,
  fetchedOrderDetailsForDropRef,
  clearNewOrder,
  acceptedOrderIdsRef,
  routePolylineRef,
  liveTrackingPolylineRef,
  directionsRendererRef,
  DELIVERY_ACTIVE_ORDER_KEY,
  debugLog,
  debugWarn,
}) {
  // Pickup proximity detection
  useEffect(() => {
    if (showPaymentPage || showCustomerReviewPopup || showOrderDeliveredAnimation) return;

    const orderStatus = selectedRestaurant?.orderStatus || selectedRestaurant?.status || newOrder?.status || "";
    const deliveryPhase = selectedRestaurant?.deliveryPhase || selectedRestaurant?.deliveryState?.currentPhase || "";
    const deliveryStateStatus = selectedRestaurant?.deliveryState?.status || "";

    const isDeliveredOrCompleted =
      orderStatus === "delivered" ||
      orderStatus === "completed" ||
      deliveryPhase === "completed" ||
      deliveryPhase === "delivered" ||
      deliveryStateStatus === "delivered";

    if (!selectedRestaurant || isDeliveredOrCompleted) return;
    if (showNewOrderPopup || showOrderIdConfirmationPopup || showReachedDropPopup) return;

    // If order ID already confirmed or out for delivery, do not show pickup.
    const isOutForDelivery =
      orderStatus === "out_for_delivery" ||
      deliveryPhase === "en_route_to_delivery" ||
      deliveryStateStatus === "order_confirmed";
    if (isOutForDelivery) {
      if (showreachedPickupPopup) setShowreachedPickupPopup(false);
      return;
    }

    const riderPos =
      riderLocation && riderLocation.length === 2
        ? riderLocation
        : lastLocationRef.current && lastLocationRef.current.length === 2
          ? lastLocationRef.current
          : null;
    const destLat = toFiniteCoordinate(selectedRestaurant?.lat);
    const destLng = toFiniteCoordinate(selectedRestaurant?.lng);
    if (!riderPos || !Number.isFinite(destLat) || !Number.isFinite(destLng)) return;

    const distanceInMeters = calculateDistanceInMeters(riderPos[0], riderPos[1], destLat, destLng);

    if (distanceInMeters <= PICKUP_REACHED_THRESHOLD_METERS && !showreachedPickupPopup) {
      debugLog?.("Rider reached pickup proximity, opening popup", {
        distanceInMeters,
        threshold: PICKUP_REACHED_THRESHOLD_METERS,
      });
      setShowreachedPickupPopup(true);
      setShowDirectionsMap(false);
      return;
    }

    if (distanceInMeters <= PICKUP_REACHED_THRESHOLD_METERS * 2) {
      debugLog?.("Rider approaching pickup", {
        distanceInMeters,
        threshold: PICKUP_REACHED_THRESHOLD_METERS,
      });
    }
  }, [
    riderLocation?.[0] ?? null,
    riderLocation?.[1] ?? null,
    selectedRestaurant?.lat ?? null,
    selectedRestaurant?.lng ?? null,
    selectedRestaurant?.deliveryPhase ?? selectedRestaurant?.deliveryState?.currentPhase ?? null,
    selectedRestaurant?.orderStatus ?? selectedRestaurant?.status ?? null,
    selectedRestaurant?.deliveryState?.status ?? null,
    Boolean(showNewOrderPopup),
    Boolean(showOrderIdConfirmationPopup),
    Boolean(showreachedPickupPopup),
    Boolean(showReachedDropPopup),
    Boolean(showOrderDeliveredAnimation),
    Boolean(showCustomerReviewPopup),
    Boolean(showPaymentPage),
    calculateDistanceInMeters,
  ]);

  // Close popups / cleanup when delivered
  useEffect(() => {
    const orderStatus = selectedRestaurant?.orderStatus || selectedRestaurant?.status || "";
    const deliveryPhase = selectedRestaurant?.deliveryPhase || selectedRestaurant?.deliveryState?.currentPhase || "";
    const deliveryStateStatus = selectedRestaurant?.deliveryState?.status || "";

    const isDelivered =
      orderStatus === "delivered" ||
      orderStatus === "completed" ||
      deliveryPhase === "completed" ||
      deliveryPhase === "delivered" ||
      deliveryStateStatus === "delivered" ||
      showPaymentPage ||
      showOrderDeliveredAnimation;

    if (!isDelivered) return;

    if (showreachedPickupPopup) setShowreachedPickupPopup(false);
    if (showOrderIdConfirmationPopup) setShowOrderIdConfirmationPopup(false);
    if (showReachedDropPopup && !showOrderDeliveredAnimation && !showCustomerReviewPopup) {
      setShowReachedDropPopup(false);
    }

    if (!showPaymentPage && !showCustomerReviewPopup && !showOrderDeliveredAnimation && selectedRestaurant) {
      setSelectedRestaurant(null);
      localStorage.removeItem(DELIVERY_ACTIVE_ORDER_KEY);
      localStorage.removeItem("activeOrder");
      if (typeof clearNewOrder === "function") clearNewOrder();
      acceptedOrderIdsRef?.current?.clear?.();

      if (routePolylineRef?.current) routePolylineRef.current.setMap(null);
      if (liveTrackingPolylineRef?.current) liveTrackingPolylineRef.current.setMap(null);
      if (directionsRendererRef?.current) directionsRendererRef.current.setMap(null);
    }
  }, [
    selectedRestaurant?.orderStatus,
    selectedRestaurant?.status,
    selectedRestaurant?.deliveryPhase,
    selectedRestaurant?.deliveryState?.currentPhase,
    selectedRestaurant?.deliveryState?.status,
    showPaymentPage,
    showOrderDeliveredAnimation,
    showCustomerReviewPopup,
    showreachedPickupPopup,
    showOrderIdConfirmationPopup,
    showReachedDropPopup,
    clearNewOrder,
  ]);

  // Switch route to customer when picked up / out_for_delivery
  useEffect(() => {
    const orderStatus = selectedRestaurant?.orderStatus || selectedRestaurant?.status || "";
    const deliveryPhase = selectedRestaurant?.deliveryPhase || selectedRestaurant?.deliveryState?.currentPhase || "";
    const customerDestination = getCustomerDestination(selectedRestaurant);

    const isPickedUp =
      orderStatus === "out_for_delivery" ||
      orderStatus === "picked_up" ||
      deliveryPhase === "en_route_to_delivery" ||
      deliveryPhase === "picked_up";

    if (!isPickedUp || !customerDestination || !riderLocation || riderLocation.length !== 2) return;

    setShowRoutePath(true);
    const currentDirections = directionsResponseRef.current;
    const isCurrentRouteToCustomer = isDirectionsResultNearDestination(currentDirections, customerDestination);
    if (isCurrentRouteToCustomer) return;

    calculateRouteWithDirectionsAPI(riderLocation, customerDestination)
      .then((directionsResult) => {
        if (!directionsResult) return;
        setDirectionsResponse(directionsResult);
        directionsResponseRef.current = directionsResult;

        if (riderLocation && window.deliveryMapInstance) {
          updateLiveTrackingPolyline(directionsResult, riderLocation);
        } else {
          setTimeout(() => {
            if (riderLocation && window.deliveryMapInstance) updateLiveTrackingPolyline(directionsResult, riderLocation);
          }, 500);
        }

        if (window.deliveryMapInstance) {
          try {
            if (routePolylineRef.current) {
              routePolylineRef.current.setMap(null);
              routePolylineRef.current = null;
            }
            if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
          } catch (e) {
            debugWarn?.("Error cleaning up old polyline", e);
          }

          const bounds = directionsResult.routes?.[0]?.bounds;
          if (bounds) {
            const currentZoomBeforeFit = window.deliveryMapInstance.getZoom();
            window.deliveryMapInstance.fitBounds(bounds, { padding: 100 });
            setTimeout(() => {
              const newZoom = window.deliveryMapInstance.getZoom();
              if (currentZoomBeforeFit > newZoom && currentZoomBeforeFit >= 18) {
                window.deliveryMapInstance.setZoom(currentZoomBeforeFit);
              }
            }, 100);
          }
        }
      })
      .catch((error) => debugWarn?.("Error calculating route to customer after pickup", error));
  }, [
    selectedRestaurant?.orderStatus,
    selectedRestaurant?.status,
    selectedRestaurant?.deliveryPhase,
    selectedRestaurant?.deliveryState?.currentPhase,
    selectedRestaurant?.customerLat,
    selectedRestaurant?.customerLng,
    riderLocation,
    calculateRouteWithDirectionsAPI,
    updateLiveTrackingPolyline,
  ]);

  // Fetch drop coords if missing when out_for_delivery
  useEffect(() => {
    if (!selectedRestaurant) {
      fetchedOrderDetailsForDropRef.current = null;
      return;
    }
    const orderStatus = selectedRestaurant?.orderStatus || selectedRestaurant?.status || "";
    const deliveryPhase = selectedRestaurant?.deliveryPhase || selectedRestaurant?.deliveryState?.currentPhase || "";
    const isOutForDelivery = orderStatus === "out_for_delivery" || deliveryPhase === "en_route_to_delivery";
    const customerLat = toFiniteCoordinate(selectedRestaurant?.customerLat);
    const customerLng = toFiniteCoordinate(selectedRestaurant?.customerLng);
    const hasCustomerCoords =
      Number.isFinite(customerLat) && Number.isFinite(customerLng) && !(customerLat === 0 && customerLng === 0);
    const orderId = selectedRestaurant?.orderId || selectedRestaurant?.id;

    if (!isOutForDelivery || hasCustomerCoords || !orderId || fetchedOrderDetailsForDropRef.current === orderId) return;
    fetchedOrderDetailsForDropRef.current = orderId;

    deliveryAPI
      .getOrderDetails(orderId)
      .then((res) => {
        const order = res.data?.data?.order || res.data?.order;
        const coords = order?.address?.location?.coordinates;
        const lat = coords?.[1];
        const lng = coords?.[0];
        if (lat != null && lng != null && !(lat === 0 && lng === 0)) {
          setSelectedRestaurant((prev) => (prev ? { ...prev, customerLat: lat, customerLng: lng } : null));
          debugLog?.("Reached Drop: customer location loaded from getOrderDetails", { lat, lng });
        }
      })
      .catch((err) => {
        debugWarn?.(
          "Reached Drop: getOrderDetails failed for customer coords",
          err?.response?.data?.message || err?.message,
        );
      });
  }, [
    selectedRestaurant?.orderStatus,
    selectedRestaurant?.deliveryPhase,
    selectedRestaurant?.deliveryState?.currentPhase,
    selectedRestaurant?.customerLat,
    selectedRestaurant?.customerLng,
    selectedRestaurant?.orderId,
    selectedRestaurant?.id,
  ]);

  const deliveryStateStatus = useMemo(() => selectedRestaurant?.deliveryState?.status ?? null, [
    selectedRestaurant?.deliveryState?.status,
  ]);

  // Drop proximity detection
  useEffect(() => {
    if (showPaymentPage || showCustomerReviewPopup || showOrderDeliveredAnimation) {
      if (showReachedDropPopup) setShowReachedDropPopup(false);
      return;
    }

    const orderStatus = selectedRestaurant?.orderStatus || selectedRestaurant?.status || newOrder?.status || "";
    const deliveryPhase = selectedRestaurant?.deliveryState?.currentPhase || selectedRestaurant?.deliveryPhase || "";
    const isDeliveredOrCompleted =
      orderStatus === "delivered" ||
      orderStatus === "completed" ||
      deliveryPhase === "completed" ||
      deliveryPhase === "at_delivery";

    const isOutForDelivery =
      !isDeliveredOrCompleted &&
      (orderStatus === "out_for_delivery" ||
        deliveryPhase === "en_route_to_delivery" ||
        deliveryPhase === "picked_up" ||
        deliveryPhase === "at_delivery" ||
        deliveryStateStatus === "order_confirmed" ||
        deliveryStateStatus === "en_route_to_delivery");

    const riderPos =
      riderLocation && riderLocation.length === 2
        ? riderLocation
        : lastLocationRef.current && lastLocationRef.current.length === 2
          ? lastLocationRef.current
          : null;

    const customerDestination = getCustomerDestination(selectedRestaurant);
    const hasCustomerCoords =
      !!customerDestination && !(customerDestination.lat === 0 && customerDestination.lng === 0);

    if (!hasCustomerCoords) {
      if (isOutForDelivery && !isDeliveredOrCompleted && selectedRestaurant) {
        debugWarn?.("[Reached Drop] Customer location missing.");
      }
      return;
    }
    if (!riderPos) return;
    if (isDeliveredOrCompleted || showNewOrderPopup || showreachedPickupPopup) return;
    if (showReachedDropPopup) return;
    if (showOrderIdConfirmationPopup) return;

    const isInDeliveryPhase =
      isOutForDelivery ||
      deliveryPhase === "picked_up" ||
      deliveryStateStatus === "order_confirmed" ||
      orderStatus === "out_for_delivery";
    if (!isInDeliveryPhase) return;

    const distanceInMeters = calculateDistanceInMeters(
      riderPos[0],
      riderPos[1],
      customerDestination.lat,
      customerDestination.lng,
    );

    if (distanceInMeters <= DROP_REACHED_THRESHOLD_METERS && !showReachedDropPopup) {
      debugLog?.("Rider reached drop proximity, opening popup", {
        distanceInMeters,
        threshold: DROP_REACHED_THRESHOLD_METERS,
      });
      setShowReachedDropPopup(true);
      setShowDirectionsMap(false);
    }
  }, [
    riderLocation?.[0] ?? null,
    riderLocation?.[1] ?? null,
    selectedRestaurant?.customerLat ?? null,
    selectedRestaurant?.customerLng ?? null,
    selectedRestaurant?.orderStatus ?? newOrder?.status ?? null,
    selectedRestaurant?.deliveryPhase ?? selectedRestaurant?.deliveryState?.currentPhase ?? null,
    deliveryStateStatus,
    Boolean(showNewOrderPopup),
    Boolean(showOrderIdConfirmationPopup),
    Boolean(showreachedPickupPopup),
    Boolean(showReachedDropPopup),
    Boolean(showOrderDeliveredAnimation),
    Boolean(showCustomerReviewPopup),
    Boolean(showPaymentPage),
    calculateDistanceInMeters,
  ]);
}

