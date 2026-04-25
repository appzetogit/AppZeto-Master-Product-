import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, FileText } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { socketService } from './shared/api/socket';
import TaxiPageLoader from './shared/components/TaxiPageLoader';
import { SettingsProvider } from './shared/context/SettingsContext';
import { clearLocalUserSession, hasLocalUserToken } from './modules/user/services/authService';
import './index.css';
import './App.css';


// Lazy loading pages for performance
const UserHome = lazy(() => import('./modules/user/pages/Home'));
const Login = lazy(() => import('./modules/user/pages/auth/Login'));
const VerifyOTP = lazy(() => import('./modules/user/pages/auth/VerifyOTP'));
const Signup = lazy(() => import('./modules/user/pages/auth/Signup'));

// Ride Module Pages
const SelectLocation = lazy(() => import('./modules/user/pages/ride/SelectLocation'));
const SelectVehicle = lazy(() => import('./modules/user/pages/ride/SelectVehicle'));
const SearchingDriver = lazy(() => import('./modules/user/pages/ride/SearchingDriver'));
const RideTracking = lazy(() => import('./modules/user/pages/ride/RideTracking'));
const RideComplete = lazy(() => import('./modules/user/pages/ride/RideComplete'));
const Chat = lazy(() => import('./modules/user/pages/ride/Chat'));
const Support = lazy(() => import('./modules/user/pages/ride/Support'));
const RideDetail = lazy(() => import('./modules/user/pages/ride/RideDetail'));

// Parcel Module Pages
const ParcelType = lazy(() => import('./modules/user/pages/parcel/ParcelType'));
const ParcelDetails = lazy(() => import('./modules/user/pages/parcel/ParcelDetails'));
const SenderReceiverDetails = lazy(() => import('./modules/user/pages/parcel/SenderReceiverDetails'));

// Profile & History
const Activity = lazy(() => import('./modules/user/pages/Activity'));
const Profile = lazy(() => import('./modules/user/pages/Profile'));
const Wallet = lazy(() => import('./modules/user/pages/Wallet'));

// Coming Soon placeholder (for /tours and any unbuilt routes)
const ComingSoon = lazy(() => import('./modules/shared/pages/ComingSoon'));

// Phase 1 — Parcel flow completions
const ParcelSearchingDriver = lazy(() => import('./modules/user/pages/parcel/ParcelSearchingDriver'));
const ParcelTracking = lazy(() => import('./modules/user/pages/parcel/ParcelTracking'));

// Phase 2 — Core utility pages
const UserNotifications = lazy(() => import('./modules/user/pages/Notifications'));
const PromoCodes = lazy(() => import('./modules/user/pages/PromoCodes'));
const UserReferral = lazy(() => import('./modules/user/pages/Referral'));

// Phase 3 — Safety & Support
const SOSContacts = lazy(() => import('./modules/user/pages/safety/SOSContacts'));
const SupportTickets = lazy(() => import('./modules/user/pages/support/SupportTickets'));
const SupportTicketDetail = lazy(() => import('./modules/user/pages/support/SupportTicketDetail'));
const DeleteAccount = lazy(() => import('./modules/user/pages/profile/DeleteAccount'));

// Phase 4 — Cab/Intercity/Bus flows
const CabHome = lazy(() => import('./modules/user/pages/cab/CabHome'));
const SharedTaxi = lazy(() => import('./modules/user/pages/cab/SharedTaxi'));
const SharedTaxiSeats = lazy(() => import('./modules/user/pages/cab/SharedTaxiSeats'));
const SharedTaxiConfirm = lazy(() => import('./modules/user/pages/cab/SharedTaxiConfirm'));
const AirportCab = lazy(() => import('./modules/user/pages/cab/AirportCab'));
const AirportCabConfirm = lazy(() => import('./modules/user/pages/cab/AirportCabConfirm'));
const SpiritualTrip = lazy(() => import('./modules/user/pages/cab/SpiritualTrip'));
const SpiritualTripVehicle = lazy(() => import('./modules/user/pages/cab/SpiritualTripVehicle'));
const SpiritualTripConfirm = lazy(() => import('./modules/user/pages/cab/SpiritualTripConfirm'));

const IntercityVehicle = lazy(() => import('./modules/user/pages/intercity/IntercityVehicle'));
const IntercityDetails = lazy(() => import('./modules/user/pages/intercity/IntercityDetails'));
const IntercityConfirm = lazy(() => import('./modules/user/pages/intercity/IntercityConfirm'));

const BusHome = lazy(() => import('./modules/user/pages/bus/BusHome'));
const BusList = lazy(() => import('./modules/user/pages/bus/BusList'));
const BusSeats = lazy(() => import('./modules/user/pages/bus/BusSeats'));
const BusDetails = lazy(() => import('./modules/user/pages/bus/BusDetails'));
const BusConfirm = lazy(() => import('./modules/user/pages/bus/BusConfirm'));

// Phase 5 — Onboarding
const Onboarding = lazy(() => import('./modules/user/pages/auth/Onboarding'));

// New Feature Pages
const BikeRentalHome = lazy(() => import('./modules/user/pages/rental/BikeRentalHome'));
const RentalVehicleDetail = lazy(() => import('./modules/user/pages/rental/RentalVehicleDetail'));
const RentalSchedule = lazy(() => import('./modules/user/pages/rental/RentalSchedule'));
const RentalKYC = lazy(() => import('./modules/user/pages/rental/RentalKYC'));
const RentalDeposit = lazy(() => import('./modules/user/pages/rental/RentalDeposit'));
const RentalConfirmed = lazy(() => import('./modules/user/pages/rental/RentalConfirmed'));
const IntercityHome = lazy(() => import('./modules/user/pages/intercity/IntercityHome'));
const CabSharing = lazy(() => import('./modules/user/pages/cabsharing/CabSharing'));

// Profile Settings Sub-pages
const ProfileSettings = lazy(() => import('./modules/user/pages/profile/ProfileSettings'));
const PaymentSettings = lazy(() => import('./modules/user/pages/profile/PaymentSettings'));
const AddressSettings = lazy(() => import('./modules/user/pages/profile/AddressSettings'));
// Driver Module - Common
const DriverLayout = lazy(() => import('./modules/driver/components/DriverLayout'));

// Driver Module - Registration
const LanguageSelect = lazy(() => import('./modules/driver/pages/registration/LanguageSelect'));
const DriverWelcome = lazy(() => import('./modules/driver/pages/registration/DriverWelcome'));
const PhoneRegistration = lazy(() => import('./modules/driver/pages/registration/PhoneRegistration'));
const OTPVerification = lazy(() => import('./modules/driver/pages/registration/OTPVerification'));
const RegistrationStatus = lazy(() => import('./modules/driver/pages/registration/RegistrationStatus'));
const StepPersonal = lazy(() => import('./modules/driver/pages/registration/StepPersonal'));
const StepReferral = lazy(() => import('./modules/driver/pages/registration/StepReferral'));
const StepVehicle = lazy(() => import('./modules/driver/pages/registration/StepVehicle'));
const StepDocuments = lazy(() => import('./modules/driver/pages/registration/StepDocuments'));
const ApplicationStatus = lazy(() => import('./modules/driver/pages/registration/ApplicationStatus'));

// Driver Module - Core
const DriverHome = lazy(() => import('./modules/driver/pages/DriverHome'));
const ActiveTrip = lazy(() => import('./modules/driver/pages/ActiveTrip'));
const DriverWallet = lazy(() => import('./modules/driver/pages/DriverWallet'));
const DriverProfile = lazy(() => import('./modules/driver/pages/DriverProfile'));
const RideRequests = lazy(() => import('./modules/driver/pages/RideRequests'));

// Driver Module - Settings
const EditProfile = lazy(() => import('./modules/driver/pages/settings/EditProfile'));
const DriverDocuments = lazy(() => import('./modules/driver/pages/settings/DriverDocuments'));
const Notifications = lazy(() => import('./modules/driver/pages/settings/Notifications'));
const PayoutMethods = lazy(() => import('./modules/driver/pages/settings/PayoutMethods'));
const Referral = lazy(() => import('./modules/driver/pages/settings/Referral'));
const DriverDeleteAccount = lazy(() => import('./modules/driver/pages/settings/DeleteAccount'));
const SecuritySOS = lazy(() => import('./modules/driver/pages/settings/SecuritySOS'));
const DriverSupport = lazy(() => import('./modules/driver/pages/settings/Support'));
const DriverHelpSupportOptions = lazy(() => import('./modules/driver/pages/settings/HelpSupportOptions'));
const DriverSupportChat = lazy(() => import('./modules/driver/pages/settings/SupportChat'));
const VehicleFleet = lazy(() => import('./modules/driver/pages/settings/VehicleFleet'));
const AddVehicle = lazy(() => import('./modules/driver/pages/settings/AddVehicle'));
const ManageDrivers = lazy(() => import('./modules/driver/pages/settings/ManageDrivers'));
const AddDriver = lazy(() => import('./modules/driver/pages/settings/AddDriver'));

// Admin Module Pages
// Admin Routes are now redirected to the centralized AdminRouter.
// Individual admin page imports removed to resolve build errors and redundancy.



// A wrapper to handle conditional layouts (Mobile for User/Driver, Full for Admin)
const MainLayout = ({ children }) => {
  const location = useLocation();
  const isAdminPath =
    location.pathname.startsWith('/taxi/admin') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/user-import') ||
    location.pathname.startsWith('/driver-import') ||
    location.pathname.startsWith('/owner');

  if (isAdminPath) {
    return <div className="redigo-admin-root h-screen bg-gray-50 overflow-hidden">{children}</div>;
  }

  return (
    <div className="redigo-app min-h-screen bg-gray-50/50">
      <main className="max-w-lg mx-auto shadow-2xl bg-white min-h-screen relative overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};

const clearUserSession = () => {
  clearLocalUserSession();
};

const TaxiUserAuthEntry = () => {
  const location = useLocation();
  const redirectTo =
    typeof location.state?.redirectTo === 'string' && location.state.redirectTo.trim()
      ? location.state.redirectTo.trim()
      : '/taxi/user';

  // Check if user is already authenticated via the food module or any shared token
  if (hasLocalUserToken()) {
    return <Navigate to={redirectTo} replace />;
  }

  // Redirect to the unified food auth login with a return URL back to the taxi page
  return <Navigate to="/user/auth/login" state={{ redirectTo }} replace />;
};

const UserAccountInvalidationListener = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const isUserRoute = location.pathname.startsWith('/taxi/user');
    const redirectTo = `${location.pathname || '/taxi/user'}${location.search || ''}${location.hash || ''}`;

    if (!isUserRoute) {
      socketService.disconnect();
      return undefined;
    }

    if (!hasLocalUserToken()) {
      socketService.disconnect();
      return undefined;
    }

    const handleLogout = () => {
      clearUserSession();
      socketService.disconnect();
      // Redirect to the unified food auth login with return URL to current taxi page
      navigate('/user/auth/login', { replace: true, state: { redirectTo } });
    };

    socketService.connect({ role: 'user' });
    socketService.on('account:deleted', handleLogout);

    const handleAuthStale = (event) => {
      if (event.detail?.role === 'user') {
        handleLogout();
      }
    };

    window.addEventListener('app:auth-stale', handleAuthStale);

    return () => {
      socketService.off('account:deleted', handleLogout);
      window.removeEventListener('app:auth-stale', handleAuthStale);
    };
  }, [location.pathname, navigate]);

  return null;
};

function App() {
  return (
    <SettingsProvider>
      <UserAccountInvalidationListener />
      <MainLayout>
        <Suspense fallback={<TaxiPageLoader />}>
          <Toaster position="top-right" />
          <Routes>
            <Route path="" element={<Navigate to="/taxi/user" replace />} />

            {/* User Module Routes */}
            <Route path="user/onboarding" element={<TaxiUserAuthEntry />} />
            <Route path="user/login" element={<TaxiUserAuthEntry />} />
            <Route path="user/verify-otp" element={<TaxiUserAuthEntry />} />
            <Route path="user/signup" element={<TaxiUserAuthEntry />} />
            <Route path="user" element={<UserHome />} />

            <Route path="user/ride/select-location" element={<SelectLocation />} />
            <Route path="user/ride/select-vehicle" element={<SelectVehicle />} />
            <Route path="user/ride/searching" element={<SearchingDriver />} />
            <Route path="user/ride/tracking" element={<RideTracking />} />
            <Route path="user/ride/complete" element={<RideComplete />} />
            <Route path="user/ride/chat" element={<Chat />} />
            <Route path="user/support" element={<Support />} />
            <Route path="user/ride/detail/:id" element={<RideDetail />} />

            <Route path="user/parcel/type" element={<ParcelType />} />
            <Route path="user/parcel/details" element={<ParcelDetails />} />
            <Route path="user/parcel/contacts" element={<SenderReceiverDetails />} />
            <Route path="user/parcel/searching" element={<ParcelSearchingDriver />} />
            <Route path="user/parcel/tracking" element={<ParcelTracking />} />
            <Route path="user/parcel/detail/:id" element={<RideDetail />} />

            <Route path="user/rental" element={<BikeRentalHome />} />
            <Route path="user/rental/vehicle" element={<RentalVehicleDetail />} />
            <Route path="user/rental/schedule" element={<RentalSchedule />} />
            <Route path="user/rental/kyc" element={<RentalKYC />} />
            <Route path="user/rental/deposit" element={<RentalDeposit />} />
            <Route path="user/rental/confirmed" element={<RentalConfirmed />} />
            <Route path="user/intercity" element={<IntercityHome />} />
            <Route path="user/intercity/vehicle" element={<IntercityVehicle />} />
            <Route path="user/intercity/details" element={<IntercityDetails />} />
            <Route path="user/intercity/confirm" element={<IntercityConfirm />} />
            <Route path="user/cab-sharing" element={<CabSharing />} />
            <Route path="user/cab" element={<CabHome />} />
            <Route path="user/cab/shared" element={<SharedTaxi />} />
            <Route path="user/cab/shared/seats" element={<SharedTaxiSeats />} />
            <Route path="user/cab/shared/confirm" element={<SharedTaxiConfirm />} />
            <Route path="user/cab/airport" element={<AirportCab />} />
            <Route path="user/cab/airport-confirm" element={<AirportCabConfirm />} />
            <Route path="user/cab/spiritual" element={<SpiritualTrip />} />
            <Route path="user/cab/spiritual-vehicle" element={<SpiritualTripVehicle />} />
            <Route path="user/cab/spiritual-confirm" element={<SpiritualTripConfirm />} />
            <Route path="user/bus" element={<BusHome />} />
            <Route path="user/bus/list" element={<BusList />} />
            <Route path="user/bus/seats" element={<BusSeats />} />
            <Route path="user/bus/details" element={<BusDetails />} />
            <Route path="user/bus/confirm" element={<BusConfirm />} />
            <Route path="user/tours" element={<ComingSoon />} />

            <Route path="user/activity" element={<Activity />} />
            <Route path="user/profile" element={<Profile />} />
            <Route path="user/wallet" element={<Wallet />} />
            <Route path="user/notifications" element={<UserNotifications />} />
            <Route path="user/promo" element={<PromoCodes />} />
            <Route path="user/referral" element={<UserReferral />} />

            <Route path="user/profile/settings" element={<ProfileSettings />} />
            <Route path="user/profile/payments" element={<PaymentSettings />} />
            <Route path="user/profile/addresses" element={<AddressSettings />} />
            <Route path="user/profile/notifications" element={<UserNotifications />} />
            <Route path="user/profile/delete-account" element={<DeleteAccount />} />
            <Route path="user/safety/sos" element={<SOSContacts />} />
            <Route path="user/support/tickets" element={<SupportTickets />} />
            <Route path="user/support/ticket/:id" element={<SupportTicketDetail />} />
            
            {/* Driver Module Routes - Centralized under DriverLayout for Theme & Styling */}
            <Route path="driver" element={<DriverLayout />}>
              <Route path="lang-select" element={<LanguageSelect />} />
              <Route path="welcome" element={<DriverWelcome />} />
              <Route path="login" element={<PhoneRegistration />} />
              <Route path="reg-phone" element={<PhoneRegistration />} />
              <Route path="otp-verify" element={<OTPVerification />} />
              <Route path="step-personal" element={<StepPersonal />} />
              <Route path="step-referral" element={<StepReferral />} />
              <Route path="step-vehicle" element={<StepVehicle />} />
              <Route path="step-documents" element={<StepDocuments />} />
              <Route path="registration-status" element={<RegistrationStatus />} />
              <Route path="status" element={<ApplicationStatus />} />

              <Route path="home" element={<DriverHome />} />
              <Route path="dashboard" element={<DriverHome />} />
              <Route path="active-trip" element={<ActiveTrip />} />
              <Route path="wallet" element={<DriverWallet />} />
              <Route path="profile" element={<DriverProfile />} />
              <Route path="history" element={<RideRequests />} />

              <Route path="edit-profile" element={<EditProfile />} />
              <Route path="documents" element={<DriverDocuments />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="payout-methods" element={<PayoutMethods />} />
              <Route path="referral" element={<Referral />} />
              <Route path="delete-account" element={<DriverDeleteAccount />} />
              <Route path="security" element={<SecuritySOS />} />
              <Route path="support" element={<DriverSupport />} />
              <Route path="help-support" element={<DriverHelpSupportOptions />} />
              <Route path="support/chat" element={<DriverSupportChat />} />
              <Route path="support/tickets" element={<SupportTickets />} />
              <Route path="support/ticket/:id" element={<SupportTicketDetail />} />
              <Route path="vehicle-fleet" element={<VehicleFleet />} />
              <Route path="add-vehicle" element={<AddVehicle />} />
              <Route path="manage-drivers" element={<ManageDrivers />} />
              <Route path="add-driver" element={<AddDriver />} />
            </Route>

            {/* Admin Routes - Redirected to centralized AdminRouter */}
            <Route path="admin/*" element={<Navigate to={`/admin/taxi${location.pathname.replace(/^\/taxi\/admin/, '')}${location.search}`} replace />} />
            
            <Route path="*" element={<Navigate to="/taxi/user" replace />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </SettingsProvider>
  );
}

export default App;

