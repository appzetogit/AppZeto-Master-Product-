const formatCoordinateAddress = (location) => {
  if (!location) return "";
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

export const normalizeLocationPoint = (value) => {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value.coordinates) && value.coordinates.length >= 2) {
    const lng = Number(value.coordinates[0]);
    const lat = Number(value.coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  if (value.location && typeof value.location === "object") {
    const nested = normalizeLocationPoint(value.location);
    if (nested) return nested;
  }

  const lat = Number(value.lat ?? value.latitude);
  const lng = Number(value.lng ?? value.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
};

export const normalizePickupPoints = (order) => {
  const raw = Array.isArray(order?.pickupPoints) ? order.pickupPoints : [];
  const normalized = raw
    .map((point, index) => {
      const location = normalizeLocationPoint(point?.location);
      if (!location) return null;
      const pickupType = point?.pickupType === "quick" ? "quick" : "food";
      const sourceName = String(
        point?.sourceName ||
          point?.name ||
          (pickupType === "quick" ? "Seller store" : "Restaurant"),
      ).trim();
      const address = String(
        point?.address ||
          point?.formattedAddress ||
          point?.location?.address ||
          point?.location?.formattedAddress ||
          "",
      ).trim();
      return {
        id: point?.legId || `${pickupType || "pickup"}:${point?.sourceId || index}`,
        pickupType,
        sourceId: String(point?.sourceId || ""),
        sourceName,
        address: address || formatCoordinateAddress(location),
        phone: String(point?.phone || point?.contactPhone || "").trim(),
        location,
      };
    })
    .filter(Boolean);

  if (normalized.length > 0) return normalized;

  const restaurantLocation = normalizeLocationPoint(order?.restaurantLocation || order?.restaurantId);
  if (!restaurantLocation) return [];

  return [
    {
      id: "food:primary",
      pickupType: "food",
      sourceId: String(order?.restaurantId?._id || order?.restaurantId || ""),
      sourceName: String(order?.restaurantName || order?.restaurantId?.restaurantName || "Restaurant").trim(),
      address:
        String(order?.restaurantAddress || order?.restaurantLocation?.address || "").trim() ||
        formatCoordinateAddress(restaurantLocation),
      phone: String(order?.restaurantPhone || order?.restaurantId?.phone || "").trim(),
      location: restaurantLocation,
    },
  ];
};

export const getPrimaryPickupLocation = (order) => {
  const pickupPoints = normalizePickupPoints(order);
  return pickupPoints[0]?.location || null;
};

export const isMixedOrder = (order) => {
  const explicitType = String(
    order?.orderType || order?.serviceType || order?.type || "",
  )
    .trim()
    .toLowerCase();

  if (explicitType === "mixed") return true;

  const pickupPoints = normalizePickupPoints(order);
  if (pickupPoints.length <= 1) return false;

  const pickupTypes = new Set(
    pickupPoints.map((point) => String(point?.pickupType || "food").toLowerCase()),
  );

  return pickupTypes.size > 1;
};
