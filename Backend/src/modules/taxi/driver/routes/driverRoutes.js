import { Router } from "express";
import { asyncHandler } from "../../../../utils/asyncHandler.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import {
  addDriverEmergencyContact,
  completeOnboarding,
  createOwnerFleetDriver,
  deleteCurrentDriverAccount,
  deleteDriverEmergencyContact,
  goOffline,
  goOnline,
  getCurrentDriver,
  getDriverApprovalStatus,
  getDriverDocumentTemplates,
  getDriverEmergencyContacts,
  getDriverNotifications,
  getOwnerFleetDrivers,
  getMyWallet,
  getOnboardingSession,
  getServiceLocations,
  loginDriver,
  startDriverLoginOtpRequest,
  saveOnboardingDocuments,
  saveOnboardingPersonal,
  saveOnboardingReferral,
  saveOnboardingVehicle,
  registerDriver,
  requestDriverAccountDeletion,
  startOnboarding,
  topUpMyWallet,
  updateCurrentDriver,
  updateDriverVehicle,
  verifyOnboardingOtp,
  verifyDriverLoginOtpRequest,
  addOwnerVehicle,
  getOwnerFleetVehicles,
  deleteOwnerFleetVehicle,
} from "../controllers/driverController.js";

export const driverRouter = Router();

driverRouter.post("/register", asyncHandler(registerDriver));
driverRouter.post("/login", asyncHandler(loginDriver));
driverRouter.post("/auth/send-otp", asyncHandler(startDriverLoginOtpRequest));
driverRouter.post(
  "/auth/verify-otp",
  asyncHandler(verifyDriverLoginOtpRequest),
);
driverRouter.get(
  "/me",
  authenticate(["driver"]),
  asyncHandler(getCurrentDriver),
);
driverRouter.patch(
  "/me",
  authenticate(["driver"]),
  asyncHandler(updateCurrentDriver),
);
driverRouter.delete(
  "/me",
  authenticate(["driver"]),
  asyncHandler(deleteCurrentDriverAccount),
);
driverRouter.post(
  "/me/delete-request",
  authenticate(["driver"]),
  asyncHandler(requestDriverAccountDeletion),
);
driverRouter.get(
  "/emergency-contacts",
  authenticate(["driver"]),
  asyncHandler(getDriverEmergencyContacts),
);
driverRouter.post(
  "/emergency-contacts",
  authenticate(["driver"]),
  asyncHandler(addDriverEmergencyContact),
);
driverRouter.delete(
  "/emergency-contacts/:contactId",
  authenticate(["driver"]),
  asyncHandler(deleteDriverEmergencyContact),
);
driverRouter.get(
  "/notifications",
  authenticate(["driver"]),
  asyncHandler(getDriverNotifications),
);
driverRouter.get(
  "/wallet",
  authenticate(["driver"]),
  asyncHandler(getMyWallet),
);
driverRouter.post(
  "/wallet/top-up",
  authenticate(["driver"]),
  asyncHandler(topUpMyWallet),
);
driverRouter.patch(
  "/vehicle",
  authenticate(["driver"]),
  asyncHandler(updateDriverVehicle),
);
driverRouter.get("/approval-status", asyncHandler(getDriverApprovalStatus));
driverRouter.get(
  "/fleet/drivers",
  authenticate(["driver"]),
  asyncHandler(getOwnerFleetDrivers),
);
driverRouter.post(
  "/fleet/drivers",
  authenticate(["driver"]),
  asyncHandler(createOwnerFleetDriver),
);
driverRouter.get(
  "/fleet/vehicles",
  authenticate(["driver"]),
  asyncHandler(getOwnerFleetVehicles),
);
driverRouter.post(
  "/fleet/vehicles",
  authenticate(["driver"]),
  asyncHandler(addOwnerVehicle),
);
driverRouter.delete(
  "/fleet/vehicles/:vehicleId",
  authenticate(["driver"]),
  asyncHandler(deleteOwnerFleetVehicle),
);
driverRouter.get("/service-locations", asyncHandler(getServiceLocations));
driverRouter.get(
  "/document-templates",
  asyncHandler(getDriverDocumentTemplates),
);
driverRouter.post("/onboarding/send-otp", asyncHandler(startOnboarding));
driverRouter.post("/onboarding/verify-otp", asyncHandler(verifyOnboardingOtp));
driverRouter.patch(
  "/onboarding/personal",
  asyncHandler(saveOnboardingPersonal),
);
driverRouter.patch(
  "/onboarding/referral",
  asyncHandler(saveOnboardingReferral),
);
driverRouter.patch("/onboarding/vehicle", asyncHandler(saveOnboardingVehicle));
driverRouter.patch(
  "/onboarding/documents",
  asyncHandler(saveOnboardingDocuments),
);
driverRouter.post("/onboarding/complete", asyncHandler(completeOnboarding));
driverRouter.get(
  "/onboarding/session/:registrationId",
  asyncHandler(getOnboardingSession),
);
driverRouter.patch("/online", authenticate(["driver"]), asyncHandler(goOnline));
driverRouter.patch(
  "/offline",
  authenticate(["driver"]),
  asyncHandler(goOffline),
);
