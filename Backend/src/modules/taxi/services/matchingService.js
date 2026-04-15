import { ApiError } from '../../../utils/ApiError.js';
import { normalizePoint } from '../../../utils/geo.js';
import { DISPATCH_TOP_DRIVERS } from '../constants/index.js';
import { Vehicle } from '../admin/models/Vehicle.js';
import { Driver } from '../driver/models/Driver.js';
import { Zone } from '../driver/models/Zone.js';

const normalizeVehicleKey = (value = '') => String(value || '').trim().toLowerCase();

const normalizeVehicleKeys = (vehicles = []) => {
  const keys = vehicles.flatMap((vehicle) => [
    vehicle?.name,
    vehicle?.vehicle_type,
    vehicle?.icon_types,
    String(vehicle?.name || '').replace(/\s+/g, '_'),
    String(vehicle?.icon_types || '').replace(/\s+/g, '_'),
  ]);

  return [...new Set(keys.map(normalizeVehicleKey).filter(Boolean))];
};

const normalizeVehicleTypeIds = (vehicleTypeIds = [], vehicleTypeId = null) => {
  const values = Array.isArray(vehicleTypeIds) ? vehicleTypeIds : [vehicleTypeIds];

  if (vehicleTypeId) {
    values.push(vehicleTypeId);
  }

  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
};

const buildDriverMatchFilters = ({ zoneId, vehicleTypeId, vehicleTypeIds, vehicleTypeKeys }) => {
  const normalizedVehicleTypeIds = normalizeVehicleTypeIds(vehicleTypeIds, vehicleTypeId);
  const normalizedVehicleTypeKeys = Array.isArray(vehicleTypeKeys)
    ? [...new Set(vehicleTypeKeys.map(normalizeVehicleKey).filter(Boolean))]
    : [];
  const vehicleTypeClauses = [
    ...(normalizedVehicleTypeIds.length ? [{ vehicleTypeId: { $in: normalizedVehicleTypeIds } }] : []),
    ...(normalizedVehicleTypeKeys.length
      ? [
          { vehicleType: { $in: normalizedVehicleTypeKeys } },
          { vehicleIconType: { $in: normalizedVehicleTypeKeys } },
        ]
      : []),
  ];
  const vehicleTypeFilter =
    vehicleTypeClauses.length > 1
      ? { $or: vehicleTypeClauses }
      : vehicleTypeClauses[0] || {};

  return {
    isOnline: true,
    isOnRide: false,
    'wallet.isBlocked': { $ne: true },
    ...(zoneId ? { zoneId } : {}),
    ...vehicleTypeFilter,
  };
};

export const findZoneByPickup = async (pickupCoords) => {
  const coordinates = normalizePoint(pickupCoords, 'pickupCoords');

  // Zones are authoritative for dispatch, so every pickup must belong to one polygon.
  return Zone.findOne({
    geometry: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates,
        },
      },
    },
  });
};

export const matchDrivers = async (pickupCoords, options = {}) => {
  const coordinates = normalizePoint(pickupCoords, 'pickupCoords');
  const {
    maxDistance = 3000,
    limit = DISPATCH_TOP_DRIVERS,
    vehicleTypeId,
    vehicleTypeIds,
  } = options;
  const normalizedVehicleTypeIds = normalizeVehicleTypeIds(vehicleTypeIds, vehicleTypeId);
  const allowedVehicles = normalizedVehicleTypeIds.length
    ? await Vehicle.find({ _id: { $in: normalizedVehicleTypeIds } }).select('name vehicle_type icon_types').lean()
    : [];
  const vehicleTypeKeys = normalizeVehicleKeys(allowedVehicles);

  const zone = await findZoneByPickup(coordinates);

  // MongoDB handles both distance filtering and nearest-first sorting via $near.
  const locationFilter = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates,
        },
        $maxDistance: maxDistance,
      },
    },
  };

  let drivers = await Driver.find({
    ...buildDriverMatchFilters({
      zoneId: zone?._id || null,
      vehicleTypeIds: normalizedVehicleTypeIds,
      vehicleTypeKeys,
    }),
    ...locationFilter,
  })
    .limit(limit)
    .select('name phone socketId vehicleTypeId vehicleType vehicleIconType vehicleNumber vehicleColor vehicleMake vehicleModel rating location zoneId isOnline isOnRide');

  if (drivers.length === 0 && zone?._id) {
    drivers = await Driver.find({
      ...buildDriverMatchFilters({
        zoneId: null,
        vehicleTypeIds: normalizedVehicleTypeIds,
        vehicleTypeKeys,
      }),
      ...locationFilter,
    })
      .limit(limit)
      .select('name phone socketId vehicleTypeId vehicleType vehicleIconType vehicleNumber vehicleColor vehicleMake vehicleModel rating location zoneId isOnline isOnRide');
  }

  return { zone, drivers };
};
