export const TAXI_LOCATION_STORAGE_KEY = 'appzeto:lastLocation';
export const TAXI_LOCATION_UPDATED_EVENT = 'appzeto:location-updated';

export const DEFAULT_TAXI_LOCATION_LABEL = 'Choose your location';

const isBrowser = () => typeof window !== 'undefined';

const toFiniteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const getSavedTaxiLocation = () => {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(TAXI_LOCATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const lat = toFiniteNumber(parsed?.lat);
    const lng = toFiniteNumber(parsed?.lng ?? parsed?.lon);
    const address = String(parsed?.address || '').trim();

    return {
      ...parsed,
      lat,
      lng,
      lon: lng,
      address,
    };
  } catch {
    return null;
  }
};

export const getSavedTaxiLocationLabel = () =>
  getSavedTaxiLocation()?.address || DEFAULT_TAXI_LOCATION_LABEL;

export const getSavedTaxiPickupCoords = () => {
  const saved = getSavedTaxiLocation();

  if (!saved || !Number.isFinite(saved.lat) || !Number.isFinite(saved.lng)) {
    return null;
  }

  return [saved.lng, saved.lat];
};

export const saveTaxiLocation = (nextLocation = {}) => {
  if (!isBrowser()) {
    return null;
  }

  const previous = getSavedTaxiLocation() || {};
  const lat = toFiniteNumber(nextLocation?.lat ?? previous?.lat);
  const lng = toFiniteNumber(
    nextLocation?.lng ?? nextLocation?.lon ?? previous?.lng ?? previous?.lon,
  );
  const address =
    nextLocation?.address !== undefined
      ? String(nextLocation.address || '').trim()
      : String(previous?.address || '').trim();

  const payload = {
    ...previous,
    ...nextLocation,
    ...(Number.isFinite(lat) ? { lat } : {}),
    ...(Number.isFinite(lng) ? { lng, lon: lng } : {}),
    ...(address ? { address } : {}),
  };

  window.localStorage.setItem(
    TAXI_LOCATION_STORAGE_KEY,
    JSON.stringify(payload),
  );
  window.dispatchEvent(new Event(TAXI_LOCATION_UPDATED_EVENT));

  return payload;
};
