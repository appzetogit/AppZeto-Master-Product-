import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TaxiPageLoader from '../../../shared/components/TaxiPageLoader';

// Admin Module Pages
const AdminDashboard = lazy(() => import('../pages/dashboard/MainDashboard'));
const AdminChat = lazy(() => import('../pages/operations/Chat'));
const AdminTrips = lazy(() => import('../pages/operations/Trips'));
const AdminDeliveries = lazy(() => import('../pages/operations/Deliveries'));
const AdminOngoing = lazy(() => import('../pages/operations/Ongoing'));
const AdminWalletPayment = lazy(() => import('../pages/wallet/WalletPayment'));
const AdminUserList = lazy(() => import('../pages/users/UserList'));
const AdminUserCreate = lazy(() => import('../pages/users/UserCreate'));
const AdminUserDetails = lazy(() => import('../pages/users/UserDetails'));
const AdminDeleteRequestUsers = lazy(() => import('../pages/users/DeleteRequestUsers'));
const AdminUserBulkUpload = lazy(() => import('../pages/users/UserBulkUpload'));
const AdminUserImportCreate = lazy(() => import('../pages/users/UserImportCreate'));

// DRIVER MANAGEMENT IMPORTS
const AdminDriverList = lazy(() => import('../pages/drivers/DriverList'));
const AdminDriverDetails = lazy(() => import('../pages/drivers/DriverDetails'));
const AdminPendingDrivers = lazy(() => import('../pages/drivers/PendingDrivers'));
const AdminDriverSubscriptions = lazy(() => import('../pages/drivers/DriverSubscriptions'));
const AdminDriverSubscriptionCreate = lazy(() => import('../pages/drivers/DriverSubscriptionCreate'));
const AdminDriverRatings = lazy(() => import('../pages/drivers/DriverRatings'));
const AdminDriverRatingDetail = lazy(() => import('../pages/drivers/DriverRatingDetail'));
const AdminDriverWallet = lazy(() => import('../pages/drivers/DriverWallet'));
const AdminNegativeBalanceDrivers = lazy(() => import('../pages/drivers/NegativeBalanceDrivers'));
const AdminWithdrawalRequestDrivers = lazy(() => import('../pages/drivers/WithdrawalRequestDrivers'));
const AdminWithdrawalRequestDetail = lazy(() => import('../pages/drivers/WithdrawalRequestDetail'));
const AdminDriverDeleteRequests = lazy(() => import('../pages/drivers/DriverDeleteRequests'));
const AdminGlobalDocuments = lazy(() => import('../pages/drivers/GlobalDocuments'));
const AdminDriverDocumentForm = lazy(() => import('../pages/drivers/DriverDocumentForm'));
const AdminDriverBulkUpload = lazy(() => import('../pages/drivers/DriverBulkUpload'));
const AdminDriverImportCreate = lazy(() => import('../pages/drivers/DriverImportCreate'));
const AdminDriverAudit = lazy(() => import('../pages/drivers/DriverAudit'));
const AdminPaymentMethods = lazy(() => import('../pages/drivers/PaymentMethods'));
const AdminDriverCreate = lazy(() => import('../pages/drivers/CreateDriver'));
const AdminDriverEdit = lazy(() => import('../pages/drivers/EditDriver'));
const AdminReferralDashboard = lazy(() => import('../pages/referrals/ReferralDashboard'));
const AdminUserReferralSettings = lazy(() => import('../pages/referrals/UserReferralSettings'));
const AdminDriverReferralSettings = lazy(() => import('../pages/referrals/DriverReferralSettings'));
const AdminReferralTranslation = lazy(() => import('../pages/referrals/ReferralTranslation'));

const AdminPromoCodes = lazy(() => import('../pages/promotions/PromoCodes'));
const AdminSendNotification = lazy(() => import('../pages/promotions/SendNotification'));
const AdminBannerImage = lazy(() => import('../pages/promotions/BannerImage'));

// Price Management
const AdminServiceLocation = lazy(() => import('../pages/price-management/ServiceLocation'));
const AdminZoneManagement = lazy(() => import('../pages/price-management/ZoneManagement'));
const AdminAirportManagement = lazy(() => import('../pages/price-management/Airport'));
const AdminSetPrices = lazy(() => import('../pages/price-management/SetPrices'));
const AdminSetPackagePrices = lazy(() => import('../pages/price-management/SetPackagePrices'));
const AdminCreatePackagePrice = lazy(() => import('../pages/price-management/CreatePackagePrice'));
const AdminDriverIncentive = lazy(() => import('../pages/price-management/DriverIncentive'));
const AdminSurgePricing = lazy(() => import('../pages/price-management/SurgePricing'));
const AdminVehicleType = lazy(() => import('../pages/price-management/VehicleType'));
const AdminRentalPackageTypes = lazy(() => import('../pages/price-management/RentalPackageTypes'));
const AdminGoodsTypes = lazy(() => import('../pages/price-management/GoodsTypes'));

const AdminOwnerDashboard = lazy(() => import('../pages/owners/OwnerDashboard'));
const AdminManageOwners = lazy(() => import('../pages/owners/ManageOwners'));
const AdminPendingOwners = lazy(() => import('../pages/owners/PendingOwners'));
const AdminOwnerDetails = lazy(() => import('../pages/owners/OwnerDetails'));
const AdminOwnerCreate = lazy(() => import('../pages/owners/OwnerCreate'));
const AdminOwnerPasswordUpdate = lazy(() => import('../pages/owners/OwnerPasswordUpdate'));
const AdminOwnerNeededDocuments = lazy(() => import('../pages/owners/OwnerNeededDocuments'));
const AdminOwnerNeededDocumentsCreate = lazy(() => import('../pages/owners/OwnerNeededDocumentsCreate'));
const AdminManageFleet = lazy(() => import('../pages/owners/ManageFleet'));
const AdminManageFleetCreate = lazy(() => import('../pages/owners/ManageFleetCreate'));
const AdminFleetDrivers = lazy(() => import('../pages/owners/FleetDrivers'));
const AdminFleetDriverCreate = lazy(() => import('../pages/owners/FleetDriverCreate'));
const AdminBlockedFleetDrivers = lazy(() => import('../pages/owners/BlockedFleetDrivers'));
const AdminFleetNeededDocuments = lazy(() => import('../pages/owners/FleetNeededDocuments'));
const AdminFleetNeededDocumentsCreate = lazy(() => import('../pages/owners/FleetNeededDocumentsCreate'));
const AdminWithdrawalRequestOwners = lazy(() => import('../pages/owners/WithdrawalRequestOwners'));
const AdminWithdrawalRequestOwnerDetail = lazy(() => import('../pages/owners/WithdrawalRequestOwnerDetail'));
const AdminDeletedOwners = lazy(() => import('../pages/owners/DeletedOwners'));
const AdminOwnerBookings = lazy(() => import('../pages/owners/OwnerBookings'));

const AdminGeoFencing = lazy(() => import('../pages/geo/GeoFencing'));
const AdminHeatMap = lazy(() => import('../pages/geo/HeatMap'));
const AdminGodsEye = lazy(() => import('../pages/geo/GodsEye'));
const AdminFinance = lazy(() => import('../pages/finance/Finance'));
const AdminFareConfig = lazy(() => import('../pages/finance/FareConfiguration'));
const AdminSafetyCenter = lazy(() => import('../pages/safety/SafetyCenter'));
const AdminCMSBuilder = lazy(() => import('../pages/cms/CMSBuilder'));
const AdminHeaderFooter = lazy(() => import('../pages/cms/HeaderFooter'));
const AdminCustomizationSettings = lazy(() => import('../pages/settings/CustomizationSettings'));
const AdminTransportRideSettings = lazy(() => import('../pages/settings/TransportRideSettings'));
const AdminBidRideSettings = lazy(() => import('../pages/settings/BidRideSettings'));
const AdminWalletSettings = lazy(() => import('../pages/settings/WalletSettings'));
const AdminTipSettings = lazy(() => import('../pages/settings/TipSettings'));
const AdminAppModules = lazy(() => import('../pages/settings/AppModules'));
const AdminOnboardingScreens = lazy(() => import('../pages/settings/OnboardingScreens'));
const AdminPaymentGateways = lazy(() => import('../pages/settings/PaymentGateways'));
const AdminSMSGateways = lazy(() => import('../pages/settings/SMSGateways'));
const AdminFirebaseSettings = lazy(() => import('../pages/settings/FirebaseSettings'));
const AdminMapSettings = lazy(() => import('../pages/settings/MapSettings'));
const AdminMailSettings = lazy(() => import('../pages/settings/MailSettings'));
const AdminNotificationChannels = lazy(() => import('../pages/settings/NotificationChannels'));
const AdminDispatcherAddons = lazy(() => import('../pages/settings/DispatcherAddons'));
const AdminCountryManagement = lazy(() => import('../pages/masters/CountryManagement'));
const AdminSupportTicketTitle = lazy(() => import('../pages/support/TicketTitle'));
const AdminSupportTickets = lazy(() => import('../pages/support/SupportTickets'));

// Reports Module
const AdminUserReport = lazy(() => import('../pages/reports/UserReport'));
const AdminDriverReport = lazy(() => import('../pages/reports/DriverReport'));
const AdminDriverDutyReport = lazy(() => import('../pages/reports/DriverDutyReport'));
const AdminOwnerReport = lazy(() => import('../pages/reports/OwnerReport'));
const AdminFinanceReport = lazy(() => import('../pages/reports/FinanceReport'));
const AdminFleetFinanceReport = lazy(() => import('../pages/reports/FleetFinanceReport'));

// Masters Management
const AdminLanguages = lazy(() => import('../pages/masters/Languages'));
const AdminPreferences = lazy(() => import('../pages/masters/Preferences'));

// Admin Management
const AdminAdmins = lazy(() => import('../pages/management/Admins'));
const AdminAdminCreate = lazy(() => import('../pages/management/AdminCreate'));

import { SettingsProvider } from '../../../shared/context/SettingsContext';

const TaxiAdminRoutes = () => {
  return (
    <SettingsProvider>
      <Suspense fallback={<TaxiPageLoader />}>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="chat" element={<AdminChat />} />
        <Route path="trips" element={<AdminTrips />} />
        <Route path="deliveries" element={<AdminDeliveries />} />
        <Route path="ongoing" element={<AdminOngoing />} />
        <Route path="wallet/payment" element={<AdminWalletPayment />} />
        <Route path="users" element={<AdminUserList />} />
        <Route path="users/create" element={<AdminUserCreate />} />
        <Route path="users/:id" element={<AdminUserDetails />} />
        <Route path="users/delete-requests" element={<AdminDeleteRequestUsers />} />
        <Route path="users/bulk-upload" element={<AdminUserBulkUpload />} />
        
        <Route path="drivers" element={<AdminDriverList />} />
        <Route path="drivers/create" element={<AdminDriverCreate />} />
        <Route path="drivers/edit/:id" element={<AdminDriverEdit />} />
        <Route path="drivers/:id" element={<AdminDriverDetails />} />
        <Route path="drivers/pending" element={<AdminPendingDrivers />} />
        <Route path="drivers/subscription" element={<AdminDriverSubscriptions />} />
        <Route path="drivers/subscription/create" element={<AdminDriverSubscriptionCreate />} />
        <Route path="drivers/ratings" element={<AdminDriverRatings />} />
        <Route path="drivers/ratings/:id" element={<AdminDriverRatingDetail />} />
        <Route path="drivers/wallet" element={<AdminDriverWallet />} />
        <Route path="drivers/wallet/negative" element={<AdminNegativeBalanceDrivers />} />
        <Route path="drivers/wallet/withdrawals" element={<AdminWithdrawalRequestDrivers />} />
        <Route path="drivers/wallet/withdrawals/:id" element={<AdminWithdrawalRequestDetail />} />
        <Route path="drivers/delete-requests" element={<AdminDriverDeleteRequests />} />
        <Route path="drivers/documents" element={<AdminGlobalDocuments />} />
        <Route path="drivers/documents/create" element={<AdminDriverDocumentForm />} />
        <Route path="drivers/documents/edit/:id" element={<AdminDriverDocumentForm />} />
        <Route path="drivers/bulk-upload" element={<AdminDriverBulkUpload />} />
        <Route path="drivers/payment-methods" element={<AdminPaymentMethods />} />
        <Route path="drivers/audit/:id" element={<AdminDriverAudit />} />
        
        <Route path="referrals/dashboard" element={<AdminReferralDashboard />} />
        <Route path="referrals/user-settings" element={<AdminUserReferralSettings />} />
        <Route path="referrals/driver-settings" element={<AdminDriverReferralSettings />} />
        <Route path="referrals/translation" element={<AdminReferralTranslation />} />
        
        <Route path="promotions/promo-codes" element={<AdminPromoCodes />} />
        <Route path="promotions/send-notification" element={<AdminSendNotification />} />
        <Route path="promotions/banner-image" element={<AdminBannerImage />} />
        
        <Route path="management/admins" element={<AdminAdmins />} />
        <Route path="management/admins/create" element={<AdminAdminCreate />} />

        <Route path="owners/dashboard" element={<AdminOwnerDashboard />} />
        <Route path="owners/pending" element={<AdminPendingOwners />} />
        <Route path="owners" element={<AdminManageOwners />} />
        <Route path="owners/:id/password" element={<AdminOwnerPasswordUpdate />} />
        <Route path="owners/:id" element={<AdminOwnerDetails />} />
        <Route path="owners/wallet/withdrawals" element={<AdminWithdrawalRequestOwners />} />
        <Route path="owners/wallet/withdrawals/:id" element={<AdminWithdrawalRequestOwnerDetail />} />
        
        <Route path="fleet/drivers" element={<AdminFleetDrivers />} />
        <Route path="fleet/drivers/create" element={<AdminFleetDriverCreate />} />
        <Route path="fleet/blocked" element={<AdminBlockedFleetDrivers />} />
        <Route path="fleet/documents" element={<AdminFleetNeededDocuments />} />
        <Route path="fleet/documents/create" element={<AdminFleetNeededDocumentsCreate />} />
        <Route path="fleet/manage" element={<AdminManageFleet />} />
        <Route path="fleet/manage/create" element={<AdminManageFleetCreate />} />
        
        <Route path="owners/documents" element={<AdminOwnerNeededDocuments />} />
        <Route path="owners/documents/create" element={<AdminOwnerNeededDocumentsCreate />} />
        <Route path="owners/deleted" element={<AdminDeletedOwners />} />
        <Route path="owners/bookings" element={<AdminOwnerBookings />} />
        
        <Route path="geo/heatmap" element={<AdminHeatMap />} />
        <Route path="geo/gods-eye" element={<AdminGodsEye />} />
        <Route path="geo/peak-zone" element={<AdminGeoFencing />} />
        <Route path="finance" element={<AdminFinance />} />
        
        <Route path="pricing">
          <Route index element={<Navigate to="service-location" replace />} />
          <Route path="service-location" element={<AdminServiceLocation />} />
          <Route path="service-location/add" element={<AdminServiceLocation mode="create" />} />
          <Route path="service-location/edit/:id" element={<AdminServiceLocation mode="edit" />} />
          <Route path="app-modules" element={<AdminAppModules />} />
          <Route path="app-modules/create" element={<AdminAppModules mode="create" />} />
          <Route path="app-modules/edit/:id" element={<AdminAppModules mode="edit" />} />
          <Route path="zone" element={<AdminZoneManagement />} />
          <Route path="zone/create" element={<AdminZoneManagement mode="create" />} />
          <Route path="zone/edit/:id" element={<AdminZoneManagement mode="edit" />} />
          <Route path="airport" element={<AdminAirportManagement />} />
          <Route path="airport/create" element={<AdminAirportManagement mode="create" />} />
          <Route path="airport/edit/:id" element={<AdminAirportManagement mode="edit" />} />
          <Route path="vehicle-type" element={<AdminVehicleType />} />
          <Route path="vehicle-type/create" element={<AdminVehicleType mode="create" />} />
          <Route path="vehicle-type/edit/:id" element={<AdminVehicleType mode="edit" />} />
          <Route path="rental-packages" element={<AdminRentalPackageTypes />} />
          <Route path="rental-packages/create" element={<AdminRentalPackageTypes mode="create" />} />
          <Route path="rental-packages/edit/:id" element={<AdminRentalPackageTypes mode="edit" />} />
          <Route path="set-price" element={<AdminSetPrices />} />
          <Route path="set-price/create" element={<AdminSetPrices mode="create" />} />
          <Route path="set-price/edit/:id" element={<AdminSetPrices mode="edit" />} />
          <Route path="set-price/packages/:id" element={<AdminSetPackagePrices />} />
          <Route path="set-price/packages/create/:id" element={<AdminCreatePackagePrice mode="create" />} />
          <Route path="set-price/packages/edit/:packageId" element={<AdminCreatePackagePrice mode="edit" />} />
          <Route path="set-price/incentive/:id" element={<AdminDriverIncentive />} />
          <Route path="set-price/surge/:id" element={<AdminSurgePricing />} />
          <Route path="goods-types" element={<AdminGoodsTypes />} />
          <Route path="goods-types/create" element={<AdminGoodsTypes mode="create" />} />
          <Route path="goods-types/edit/:id" element={<AdminGoodsTypes mode="edit" />} />
        </Route>
        
        <Route path="safety" element={<AdminSafetyCenter />} />
        <Route path="cms" element={<AdminCMSBuilder />} />
        <Route path="settings/cms/header-footer" element={<AdminHeaderFooter />} />
        <Route path="support/ticket-title" element={<AdminSupportTicketTitle />} />
        <Route path="support/tickets" element={<AdminSupportTickets />} />
        
        <Route path="reports/user" element={<AdminUserReport />} />
        <Route path="reports/driver" element={<AdminDriverReport />} />
        <Route path="reports/driver-duty" element={<AdminDriverDutyReport />} />
        <Route path="reports/owner" element={<AdminOwnerReport />} />
        <Route path="reports/finance" element={<AdminFinanceReport />} />
        <Route path="reports/fleet-finance" element={<AdminFleetFinanceReport />} />

        <Route path="masters/languages" element={<AdminLanguages />} />
        <Route path="masters/countries" element={<AdminCountryManagement />} />
        <Route path="masters/preferences" element={<AdminPreferences />} />

        <Route path="settings/business/customization" element={<AdminCustomizationSettings />} />
        <Route path="settings/business/transport-ride" element={<AdminTransportRideSettings />} />
        <Route path="settings/business/bid-ride" element={<AdminBidRideSettings />} />
        
        <Route path="settings/app/wallet" element={<AdminWalletSettings />} />
        <Route path="settings/app/tip" element={<AdminTipSettings />} />
        <Route path="settings/app/onboard" element={<AdminOnboardingScreens />} />
        
        <Route path="settings/third-party/payment" element={<AdminPaymentGateways />} />
        <Route path="settings/third-party/sms" element={<AdminSMSGateways />} />
        <Route path="settings/third-party/firebase" element={<AdminFirebaseSettings />} />
        <Route path="settings/third-party/map-apis" element={<AdminMapSettings />} />
        <Route path="settings/third-party/mail" element={<AdminMailSettings />} />
        <Route path="settings/third-party/notification-channel" element={<AdminNotificationChannels />} />
        <Route path="settings/addons/dispatcher" element={<AdminDispatcherAddons />} />
      </Routes>
      </Suspense>
    </SettingsProvider>
  );
};

export default TaxiAdminRoutes;
