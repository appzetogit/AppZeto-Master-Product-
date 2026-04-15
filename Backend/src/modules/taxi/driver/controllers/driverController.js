import crypto from "node:crypto";
import { ApiError } from "../../../../utils/ApiError.js";
import { normalizePoint, toPoint } from "../../../../utils/geo.js";
import { Driver } from "../models/Driver.js";
import { DriverLoginSession } from "../models/DriverLoginSession.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { Ride } from "../../user/models/Ride.js";
import { Owner } from "../../admin/models/Owner.js";
import { ServiceLocation } from "../../admin/models/ServiceLocation.js";
import { Vehicle } from "../../admin/models/Vehicle.js";
import { Notification } from "../../admin/promotions/models/Notification.js";
import { FleetVehicle } from "../../admin/models/FleetVehicle.js";
import {
  comparePassword,
  hashPassword,
  signAccessToken,
} from "../services/authService.js";
import { emitToDriver } from "../../services/dispatchService.js";
import { findZoneByPickup } from "../services/locationService.js";
import { listDriverServiceLocations } from "../services/serviceLocationService.js";
import {
  serializeDriverWallet,
  topUpDriverWallet,
} from "../services/walletService.js";
import {
  startDriverLoginOtp,
  verifyDriverLoginOtp,
} from "../services/loginOtpService.js";
import { verifyAccessToken } from "../../services/tokenService.js";
import { clearDriverActiveRideIfStale } from "../../services/rideService.js";
import { getWalletSettings } from "../../services/appSettingsService.js";
import { RIDE_STATUS } from "../../constants/index.js";
import { listDriverNeededDocuments } from "../../admin/services/adminService.js";
import {
  completeDriverOnboarding,
  getDriverOnboardingSession,
  saveDriverDocuments,
  saveDriverPersonalDetails,
  saveDriverReferral,
  saveDriverVehicle,
  startDriverOnboarding,
  verifyDriverOtp,
} from "../services/onboardingService.js";

const generateDriverReferralCode = (driver) => {
  const idPart = String(driver?._id || "")
    .slice(-6)
    .toUpperCase();
  const phonePart = String(driver?.phone || "").slice(-4);
  return `DRV${phonePart}${idPart}`.replace(/\W/g, "");
};

const MAX_EMERGENCY_CONTACTS = 5;

const sanitizeEmergencyPhone = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(-10);

const serializeEmergencyContact = (contact = {}) => ({
  id: String(contact._id || contact.id || ""),
  name: String(contact.name || "").trim(),
  phone: sanitizeEmergencyPhone(contact.phone),
  source:
    String(contact.source || "manual").toLowerCase() === "device"
      ? "device"
      : "manual",
});

const normalizePhone = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .trim();

const isOwnerApproved = (owner) =>
  Boolean(owner) &&
  owner.active !== false &&
  (owner.approve === true ||
    String(owner.status || "").toLowerCase() === "approved");

const resolveOwnerForFleet = async (requester = {}) => {
  const onboardingRole = String(
    requester?.onboarding?.role || "",
  ).toLowerCase();
  const convertedOwnerId = requester?.onboarding?.convertedOwnerId || null;

  if (onboardingRole === "owner" && convertedOwnerId) {
    const owner = await Owner.findById(convertedOwnerId)
      .select("service_location_id active approve status")
      .lean();
    if (isOwnerApproved(owner)) return owner;
  }

  const mobile = String(requester?.phone || "").trim();
  const email = String(requester?.email || "")
    .trim()
    .toLowerCase();

  if (!mobile && !email) {
    return null;
  }

  const owner = await Owner.findOne({
    $or: [...(mobile ? [{ mobile }] : []), ...(email ? [{ email }] : [])],
  })
    .select("service_location_id active approve status")
    .lean();

  return isOwnerApproved(owner) ? owner : null;
};

const serializeDriverNotification = (item = {}) => ({
  id: String(item._id || ""),
  title: String(item.push_title || "").trim(),
  body: String(item.message || "").trim(),
  image: String(item.image || "").trim(),
  sendTo: String(item.send_to || "all").trim(),
  serviceLocationName: String(item.service_location_name || "").trim(),
  sentAt: item.sent_at || item.createdAt || null,
  createdAt: item.createdAt || null,
});

export const registerDriver = async (req, res) => {
  const { name, phone, password, vehicleType, location } = req.body;

  if (!name || !phone || !password || !vehicleType || !location) {
    throw new ApiError(
      400,
      "name, phone, password, vehicleType and location are required",
    );
  }

  const existingDriver = await Driver.findOne({ phone });

  if (existingDriver) {
    throw new ApiError(409, "Phone number is already registered");
  }

  const coordinates = normalizePoint(location, "location");
  const zone = await findZoneByPickup(coordinates);

  const driver = await Driver.create({
    name,
    phone,
    password: await hashPassword(password),
    vehicleType,
    approve: true,
    status: "approved",
    zoneId: zone?._id || null,
    location: toPoint(coordinates, "location"),
  });

  const token = signAccessToken({ sub: String(driver._id), role: "driver" });

  res.status(201).json({
    success: true,
    data: {
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        rating: driver.rating,
        status: driver.status,
      },
    },
  });
};

export const loginDriver = async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    throw new ApiError(400, "phone and password are required");
  }

  const driver = await Driver.findOne({ phone }).select("+password");

  if (!driver || !(await comparePassword(password, driver.password))) {
    throw new ApiError(401, "Invalid phone or password");
  }

  if (
    driver.approve === false ||
    String(driver.status || "").toLowerCase() === "pending"
  ) {
    throw new ApiError(403, "Driver account is pending approval");
  }

  await clearDriverActiveRideIfStale(driver);

  const token = signAccessToken({ sub: String(driver._id), role: "driver" });

  res.json({
    success: true,
    data: {
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        isOnline: driver.isOnline,
        isOnRide: driver.isOnRide,
        status: driver.status,
      },
    },
  });
};

export const goOnline = async (req, res) => {
  const { location } = req.body;

  const coordinates = normalizePoint(location, "location");
  const zone = await findZoneByPickup(coordinates);
  const existingDriver = await Driver.findById(req.auth.sub);

  if (!existingDriver) {
    throw new ApiError(404, "Driver not found");
  }

  await clearDriverActiveRideIfStale(existingDriver);

  const driver = await Driver.findByIdAndUpdate(
    req.auth.sub,
    {
      isOnline: true,
      zoneId: zone?._id || null,
      location: toPoint(coordinates, "location"),
    },
    { new: true },
  );

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  res.json({
    success: true,
    data: driver,
  });
};

export const getCurrentDriver = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  if (!String(driver.referralCode || "").trim()) {
    driver.referralCode = generateDriverReferralCode(driver);
    await driver.save();
  }

  await clearDriverActiveRideIfStale(driver);

  res.json({
    success: true,
    data: {
      id: driver._id,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      profileImage: driver.profileImage || "",
      gender: driver.gender,
      vehicleType: driver.vehicleType,
      vehicleTypeId: driver.vehicleTypeId,
      vehicleIconType: driver.vehicleIconType,
      vehicleMake: driver.vehicleMake,
      vehicleModel: driver.vehicleModel,
      registerFor: driver.registerFor,
      vehicleNumber: driver.vehicleNumber,
      vehicleColor: driver.vehicleColor,
      vehicleImage: driver.vehicleImage || "",
      city: driver.city,
      approve: driver.approve,
      status: driver.status,
      rating: driver.rating,
      wallet: await serializeDriverWallet(driver),
      referralCode: driver.referralCode || "",
      deletionRequest: driver.deletionRequest || { status: "none" },
      isOnline: driver.isOnline,
      isOnRide: driver.isOnRide,
      location: driver.location,
      zoneId: driver.zoneId,
      documents: driver.documents || {},
      emergencyContacts: Array.isArray(driver.emergencyContacts)
        ? driver.emergencyContacts.map(serializeEmergencyContact)
        : [],
      onboarding: driver.onboarding || {},
    },
  });
};

export const getDriverEmergencyContacts = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub).lean();

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  res.json({
    success: true,
    data: {
      results: Array.isArray(driver.emergencyContacts)
        ? driver.emergencyContacts.map(serializeEmergencyContact)
        : [],
      limit: MAX_EMERGENCY_CONTACTS,
    },
  });
};

export const getDriverNotifications = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub).lean();

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const serviceLocationId = driver.service_location_id || null;
  const query = {
    status: "sent",
    send_to: { $in: ["all", "drivers"] },
  };

  if (serviceLocationId) {
    query.$or = [
      { service_location_id: serviceLocationId },
      { send_to: "all" },
      { send_to: "drivers" },
    ];
  }

  const notifications = await Notification.find(query)
    .sort({ sent_at: -1, createdAt: -1 })
    .limit(100)
    .lean();

  res.json({
    success: true,
    data: {
      results: notifications.map(serializeDriverNotification),
    },
  });
};

export const addDriverEmergencyContact = async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const phone = sanitizeEmergencyPhone(req.body?.phone);
  const source =
    String(req.body?.source || "manual").toLowerCase() === "device"
      ? "device"
      : "manual";

  if (!name) {
    throw new ApiError(400, "Contact name is required");
  }

  if (!/^\d{10}$/.test(phone)) {
    throw new ApiError(400, "A valid 10-digit contact number is required");
  }

  const driver = await Driver.findById(req.auth.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const existingContacts = Array.isArray(driver.emergencyContacts)
    ? driver.emergencyContacts
    : [];

  if (existingContacts.length >= MAX_EMERGENCY_CONTACTS) {
    throw new ApiError(
      400,
      `You can add up to ${MAX_EMERGENCY_CONTACTS} emergency contacts`,
    );
  }

  if (
    existingContacts.some(
      (contact) => sanitizeEmergencyPhone(contact.phone) === phone,
    )
  ) {
    throw new ApiError(409, "This contact number is already added");
  }

  driver.emergencyContacts = [
    ...existingContacts,
    {
      name: name.slice(0, 80),
      phone,
      source,
    },
  ];

  await driver.save();

  const addedContact =
    driver.emergencyContacts[driver.emergencyContacts.length - 1];

  res.status(201).json({
    success: true,
    data: serializeEmergencyContact(addedContact),
  });
};

export const deleteDriverEmergencyContact = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const existingContacts = Array.isArray(driver.emergencyContacts)
    ? driver.emergencyContacts
    : [];
  const nextContacts = existingContacts.filter(
    (contact) => String(contact._id) !== String(req.params.contactId),
  );

  if (nextContacts.length === existingContacts.length) {
    throw new ApiError(404, "Emergency contact not found");
  }

  driver.emergencyContacts = nextContacts;
  await driver.save();

  res.json({
    success: true,
    data: {
      deleted: true,
      results: driver.emergencyContacts.map(serializeEmergencyContact),
    },
  });
};

export const updateCurrentDriver = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "name")) {
    driver.name = String(req.body.name || "").trim();
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "email")) {
    driver.email = String(req.body.email || "")
      .trim()
      .toLowerCase();
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "profileImage")) {
    driver.profileImage = String(req.body.profileImage || "").trim();
  }

  await driver.save();

  res.json({
    success: true,
    data: {
      id: driver._id,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      profileImage: driver.profileImage || "",
    },
  });
};

export const requestDriverAccountDeletion = async (req, res) => {
  const driverId = req.auth?.sub;
  const reason = String(req.body?.reason || "").trim();

  if (!reason) {
    throw new ApiError(400, "Deletion reason is required");
  }

  const driver = await Driver.findById(driverId);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  if (
    driver.deletedAt ||
    driver.approve === false ||
    String(driver.status || "").toLowerCase() === "inactive"
  ) {
    throw new ApiError(400, "Account is already inactive");
  }

  if (driver.deletionRequest?.status === "pending") {
    res.json({
      success: true,
      data: {
        deletionRequestStatus: "pending",
        requestedAt: driver.deletionRequest.requestedAt || null,
      },
      message: "Deletion request is already pending admin review",
    });
    return;
  }

  driver.deletionRequest = {
    status: "pending",
    reason: reason.slice(0, 300),
    requestedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    adminNote: "",
  };

  await driver.save();

  res.status(201).json({
    success: true,
    data: {
      deletionRequestStatus: driver.deletionRequest.status,
      requestedAt: driver.deletionRequest.requestedAt,
    },
  });
};

export const deleteCurrentDriverAccount = async (req, res) => {
  const driverId = req.auth?.sub;

  const activeRide = await Ride.findOne({
    driverId,
    status: { $in: [RIDE_STATUS.ACCEPTED, RIDE_STATUS.ONGOING] },
  }).select("_id status");

  if (activeRide) {
    throw new ApiError(409, "Complete or cancel your active ride before deleting your account");
  }

  const deletedDriver = await Driver.findByIdAndDelete(driverId);

  if (!deletedDriver) {
    throw new ApiError(404, "Driver not found");
  }

  await DriverLoginSession.deleteMany({
    $or: [
      { driverId: deletedDriver._id },
      { phone: deletedDriver.phone },
    ],
  });

  res.json({
    success: true,
    data: {
      deleted: true,
      driverId: String(deletedDriver._id),
    },
    message: "Driver account deleted successfully",
  });
};

export const getMyWallet = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const transactions = await WalletTransaction.find({ driverId: req.auth.sub })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const walletSettings = await getWalletSettings();

  res.json({
    success: true,
    data: {
      wallet: await serializeDriverWallet(driver),
      transactions,
      settings: walletSettings,
    },
  });
};

export const topUpMyWallet = async (req, res) => {
  const amount = Number(req.body.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, "amount must be greater than zero");
  }

  const result = await topUpDriverWallet({
    driverId: req.auth.sub,
    amount,
    metadata: {
      source: req.body.source || "manual",
      referenceId: req.body.referenceId || null,
    },
  });

  const payload = {
    wallet: result.wallet,
    transaction: result.transaction,
  };

  emitToDriver(req.auth.sub, "driver:wallet:updated", payload);

  res.json({
    success: true,
    data: payload,
  });
};

const getGenericVehicleType = (vehicle = {}) => {
  const value = String(vehicle.icon_types || vehicle.name || "").toLowerCase();

  if (value.includes("bike")) {
    return "bike";
  }

  if (value.includes("auto")) {
    return "auto";
  }

  return "car";
};

export const updateDriverVehicle = async (req, res) => {
  const {
    vehicleTypeId,
    vehicleNumber,
    vehicleColor,
    vehicleMake,
    vehicleModel,
    vehicleImage,
  } = req.body;

  let selectedVehicle = null;

  if (vehicleTypeId) {
    selectedVehicle = await Vehicle.findById(vehicleTypeId);

    if (
      !selectedVehicle ||
      selectedVehicle.active === false ||
      Number(selectedVehicle.status) === 0
    ) {
      throw new ApiError(404, "Active vehicle type not found");
    }
  }

  const update = {};

  if (selectedVehicle) {
    update.vehicleTypeId = selectedVehicle._id;
    update.vehicleType = getGenericVehicleType(selectedVehicle);
    update.vehicleIconType = selectedVehicle.icon_types || update.vehicleType;
  }

  if (vehicleNumber !== undefined) {
    update.vehicleNumber = String(vehicleNumber || "")
      .trim()
      .toUpperCase();
  }
  if (vehicleColor !== undefined) {
    update.vehicleColor = String(vehicleColor || "").trim();
  }
  if (vehicleMake !== undefined) {
    update.vehicleMake = String(vehicleMake || "").trim();
  }
  if (vehicleModel !== undefined) {
    update.vehicleModel = String(vehicleModel || "").trim();
  }
  if (vehicleImage !== undefined) {
    update.vehicleImage = String(vehicleImage || "").trim();
  }

  const driver = await Driver.findByIdAndUpdate(req.auth.sub, update, {
    new: true,
  });

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  res.json({
    success: true,
    data: {
      id: driver._id,
      name: driver.name,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
      vehicleTypeId: driver.vehicleTypeId,
      vehicleIconType: driver.vehicleIconType,
      vehicleMake: driver.vehicleMake,
      vehicleModel: driver.vehicleModel,
      vehicleNumber: driver.vehicleNumber,
      vehicleColor: driver.vehicleColor,
      vehicleImage: driver.vehicleImage || "",
      registerFor: driver.registerFor,
      approve: driver.approve,
      status: driver.status,
      isOnline: driver.isOnline,
      isOnRide: driver.isOnRide,
    },
  });
};

export const getDriverApprovalStatus = async (req, res) => {
  const authorization = req.headers.authorization || "";
  const [, token] = authorization.split(" ");

  if (!token) {
    throw new ApiError(401, "Authorization token is required");
  }

  const payload = verifyAccessToken(token);

  if (payload.role !== "driver") {
    throw new ApiError(403, "Insufficient permissions for this resource");
  }

  const driver = await Driver.findById(payload.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.json({
    success: true,
    data: {
      id: driver._id,
      name: driver.name,
      phone: driver.phone,
      approve: driver.approve,
      status: driver.status,
      isOnline: driver.isOnline,
      isOnRide: driver.isOnRide,
    },
  });
};

export const getServiceLocations = async (_req, res) => {
  const results = await listDriverServiceLocations();

  res.json({
    success: true,
    data: { results },
  });
};

export const getDriverDocumentTemplates = async (_req, res) => {
  const results = await listDriverNeededDocuments({
    activeOnly: true,
    includeFields: true,
  });

  res.json({
    success: true,
    data: { results },
  });
};

export const addOwnerVehicle = async (req, res) => {
  const requester = await Driver.findById(req.auth.sub)
    .select("onboarding phone email service_location_id")
    .lean();

  if (!requester) {
    throw new ApiError(404, "Driver not found");
  }

  const owner = await resolveOwnerForFleet(requester);

  if (!owner?._id) {
    throw new ApiError(
      403,
      "Vehicle addition is only available for owner accounts",
    );
  }

  const { vehicleTypeId, make, model, number, color, rcFile } = req.body;

  if (!make?.trim()) {
    throw new ApiError(400, "Car brand/make is required");
  }

  if (!model?.trim()) {
    throw new ApiError(400, "Car model is required");
  }

  if (!number?.trim()) {
    throw new ApiError(400, "License plate number is required");
  }

  if (!color?.trim()) {
    throw new ApiError(400, "Car color is required");
  }

  const normalizedPlate = String(number).trim().toUpperCase();

  // Check for duplicate license plate for this owner
  const existing = await FleetVehicle.findOne({
    owner_id: owner._id,
    license_plate_number: normalizedPlate,
  }).lean();

  if (existing) {
    throw new ApiError(
      409,
      "Fleet vehicle with this license plate already exists for this owner",
    );
  }

  // Get service location from owner or use first available
  let serviceLocationId = owner.service_location_id;
  if (!serviceLocationId) {
    const defaultLocation = await ServiceLocation.findOne({ active: true })
      .select("_id")
      .lean();
    if (!defaultLocation) {
      throw new ApiError(400, "No service location available");
    }
    serviceLocationId = defaultLocation._id;
  }

  const vehicle = await FleetVehicle.create({
    owner_id: owner._id,
    service_location_id: serviceLocationId,
    transport_type: "taxi",
    vehicle_type_id:
      vehicleTypeId && String(vehicleTypeId).trim() ? vehicleTypeId : null,
    car_brand: String(make).trim(),
    car_model: String(model).trim(),
    license_plate_number: normalizedPlate,
    car_color: String(color).trim(),
    status: "pending",
    active: true,
    documents: rcFile ? { rc: rcFile } : {},
  });

  const populated = await FleetVehicle.findById(vehicle._id)
    .populate("owner_id", "company_name owner_name name email mobile")
    .populate("service_location_id", "service_location_name name country")
    .populate("vehicle_type_id", "name type_name transport_type icon_types")
    .lean();

  res.status(201).json({
    success: true,
    message: "Vehicle added successfully and is pending approval",
    data: {
      id: String(populated._id),
      owner_id: String(populated.owner_id?._id || ""),
      owner_name:
        populated.owner_id?.company_name ||
        populated.owner_id?.owner_name ||
        populated.owner_id?.name ||
        "",
      service_location_id: String(populated.service_location_id?._id || ""),
      service_location_name:
        populated.service_location_id?.service_location_name ||
        populated.service_location_id?.name ||
        "",
      transport_type: populated.transport_type,
      vehicle_type_id: String(populated.vehicle_type_id?._id || ""),
      vehicle_type_name:
        populated.vehicle_type_id?.name ||
        populated.vehicle_type_id?.type_name ||
        "",
      car_brand: populated.car_brand,
      car_model: populated.car_model,
      license_plate_number: populated.license_plate_number,
      car_color: populated.car_color,
      status: populated.status,
      active: populated.active,
      createdAt: populated.createdAt,
    },
  });
};

export const getOwnerFleetVehicles = async (req, res) => {
  const requester = await Driver.findById(req.auth.sub)
    .select("onboarding phone email")
    .lean();

  if (!requester) {
    throw new ApiError(404, "Driver not found");
  }

  const owner = await resolveOwnerForFleet(requester);

  if (!owner?._id) {
    throw new ApiError(
      403,
      "Fleet vehicle access is only available for owner accounts",
    );
  }

  const vehicles = await FleetVehicle.find({
    owner_id: owner._id,
    active: true,
  })
    .populate("vehicle_type_id", "name type_name transport_type icon_types")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: {
      results: vehicles.map((vehicle) => ({
        _id: String(vehicle._id),
        id: String(vehicle._id),
        vehicle_type_id: vehicle.vehicle_type_id?._id || null,
        vehicle_type_name:
          vehicle.vehicle_type_id?.name ||
          vehicle.vehicle_type_id?.type_name ||
          "",
        car_brand: vehicle.car_brand || "",
        car_model: vehicle.car_model || "",
        license_plate_number: vehicle.license_plate_number || "",
        car_color: vehicle.car_color || "",
        status: vehicle.status || "pending",
        transport_type: vehicle.transport_type || "taxi",
        active: vehicle.active,
        createdAt: vehicle.createdAt,
      })),
    },
  });
};

export const deleteOwnerFleetVehicle = async (req, res) => {
  const requester = await Driver.findById(req.auth.sub)
    .select("onboarding phone email")
    .lean();

  if (!requester) {
    throw new ApiError(404, "Driver not found");
  }

  const owner = await resolveOwnerForFleet(requester);

  if (!owner?._id) {
    throw new ApiError(
      403,
      "Fleet vehicle access is only available for owner accounts",
    );
  }

  const vehicle = await FleetVehicle.findOne({
    _id: req.params.vehicleId,
    owner_id: owner._id,
  });

  if (!vehicle) {
    throw new ApiError(404, "Fleet vehicle not found");
  }

  await FleetVehicle.deleteOne({ _id: vehicle._id });

  res.json({
    success: true,
    message: "Vehicle deleted successfully",
    data: { deleted: true },
  });
};

export const getOwnerFleetDrivers = async (req, res) => {
  const requester = await Driver.findById(req.auth.sub)
    .select("onboarding phone email")
    .lean();

  if (!requester) {
    throw new ApiError(404, "Driver not found");
  }

  const owner = await resolveOwnerForFleet(requester);

  if (!owner?._id) {
    throw new ApiError(
      403,
      "Fleet driver access is only available for owner accounts",
    );
  }

  const drivers = await Driver.find({ owner_id: owner._id, deletedAt: null })
    .sort({ createdAt: -1 })
    .select("name phone email city approve status isOnline isOnRide createdAt")
    .lean();

  res.json({
    success: true,
    data: {
      results: drivers.map((driver) => ({
        id: String(driver._id),
        name: driver.name || "",
        phone: driver.phone || "",
        email: driver.email || "",
        city: driver.city || "",
        approve: driver.approve,
        status: driver.status,
        isOnline: Boolean(driver.isOnline),
        isOnRide: Boolean(driver.isOnRide),
        createdAt: driver.createdAt,
      })),
    },
  });
};

export const createOwnerFleetDriver = async (req, res) => {
  const requester = await Driver.findById(req.auth.sub)
    .select("onboarding phone email")
    .lean();

  if (!requester) {
    throw new ApiError(404, "Driver not found");
  }

  const owner = await resolveOwnerForFleet(requester);

  if (!owner?._id) {
    throw new ApiError(
      403,
      "Fleet driver access is only available for owner accounts",
    );
  }

  const name = String(req.body?.name || "").trim();
  const phone = normalizePhone(req.body?.phone || req.body?.mobile);
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();

  if (!name) {
    throw new ApiError(400, "name is required");
  }

  if (!/^\d{10}$/.test(phone)) {
    throw new ApiError(400, "A valid 10-digit mobile number is required");
  }

  const existing = await Driver.findOne({ phone }).lean();
  if (existing) {
    throw new ApiError(409, "Phone number is already registered");
  }

  const serviceLocation = owner.service_location_id
    ? await ServiceLocation.findById(owner.service_location_id).lean()
    : null;
  const coordinates =
    Array.isArray(serviceLocation?.location?.coordinates) &&
    serviceLocation.location.coordinates.length === 2
      ? serviceLocation.location.coordinates
      : typeof serviceLocation?.longitude === "number" &&
          typeof serviceLocation?.latitude === "number"
        ? [serviceLocation.longitude, serviceLocation.latitude]
        : [75.8577, 22.7196];

  const city =
    String(req.body?.city || "").trim() ||
    String(
      serviceLocation?.service_location_name || serviceLocation?.name || "",
    ).trim() ||
    "";

  const tempPassword = crypto.randomUUID().slice(0, 12);

  const driver = await Driver.create({
    owner_id: owner._id,
    service_location_id: owner.service_location_id || null,
    name,
    phone,
    email,
    gender: "",
    password: await hashPassword(tempPassword),
    vehicleType: "car",
    vehicleIconType: "car",
    registerFor: "taxi",
    vehicleNumber: "",
    vehicleColor: "",
    city,
    approve: false,
    status: "pending",
    location: toPoint(coordinates, "location"),
  });

  res.status(201).json({
    success: true,
    data: {
      id: String(driver._id),
      message: "Fleet driver request created",
    },
  });
};

export const startDriverLoginOtpRequest = async (req, res) => {
  const result = await startDriverLoginOtp(req.body);
  res.status(201).json({ success: true, data: result });
};

export const verifyDriverLoginOtpRequest = async (req, res) => {
  const result = await verifyDriverLoginOtp(req.body);
  res.json({ success: true, data: result });
};

export const startOnboarding = async (req, res) => {
  const result = await startDriverOnboarding(req.body);
  res.status(201).json({ success: true, data: result });
};

export const verifyOnboardingOtp = async (req, res) => {
  const result = await verifyDriverOtp(req.body);
  res.json({ success: true, data: result });
};

export const saveOnboardingPersonal = async (req, res) => {
  const result = await saveDriverPersonalDetails(req.body);
  res.json({ success: true, data: result });
};

export const saveOnboardingReferral = async (req, res) => {
  const result = await saveDriverReferral(req.body);
  res.json({ success: true, data: result });
};

export const saveOnboardingVehicle = async (req, res) => {
  const result = await saveDriverVehicle(req.body);
  res.json({ success: true, data: result });
};

export const saveOnboardingDocuments = async (req, res) => {
  const result = await saveDriverDocuments(req.body);
  res.json({ success: true, data: result });
};

export const completeOnboarding = async (req, res) => {
  const result = await completeDriverOnboarding(req.body);
  res.status(201).json({ success: true, data: result });
};

export const getOnboardingSession = async (req, res) => {
  const result = await getDriverOnboardingSession({
    registrationId: req.params.registrationId,
    phone: req.query.phone,
  });
  res.json({ success: true, data: result });
};

export const goOffline = async (req, res) => {
  const driver = await Driver.findByIdAndUpdate(
    req.auth.sub,
    {
      isOnline: false,
      socketId: null,
    },
    { new: true },
  );

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  res.json({
    success: true,
    data: driver,
  });
};
