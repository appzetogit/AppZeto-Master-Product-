import React, { Suspense } from 'react';
import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { Clock } from 'lucide-react';
import { HotelShellSkeleton } from '@food/components/ui/loading-skeletons';
import './index.css';

// Eager Imports (Critical UI)
import BottomNavbar from './components/ui/BottomNavbar';
import TopNavbar from './components/ui/TopNavbar';
import Footer from './components/ui/Footer';
import PartnerBottomNavbar from './app/partner/components/PartnerBottomNavbar';

import ScrollToTop from './components/ui/ScrollToTop';

// Hooks & Services
import { useLenis } from './app/shared/hooks/useLenis';
import { legalService, userService, hotelService } from './services/apiService';
import adminService from './services/adminService';
import { requestNotificationPermission, onMessageListener } from './utils/firebase';
import logo from './assets/rokologin-removebg-preview.png';
import { initAppMode, isWebView } from './utils/deviceDetect';

// Init app mode from URL params on very first load
initAppMode();

// Lazy Imports - User Pages
const Home = React.lazy(() => import('./pages/user/Home'));
const UserPropertyDetailsPage = React.lazy(() => import('./pages/user/PropertyDetailsPage'));
const UserLogin = React.lazy(() => import('./pages/auth/UserLogin'));
const UserSignup = React.lazy(() => import('./pages/auth/UserSignup'));
const SearchPage = React.lazy(() => import('./pages/user/SearchPage'));
const BookingsPage = React.lazy(() => import('./pages/user/BookingsPage'));
const ListingPage = React.lazy(() => import('./pages/user/ListingPage'));
const BookingConfirmationPage = React.lazy(() => import('./pages/user/BookingConfirmationPage'));
const WalletPage = React.lazy(() => import('./pages/user/WalletPage'));
const PaymentPage = React.lazy(() => import('./pages/user/PaymentPage'));
const SupportPage = React.lazy(() => import('./pages/user/SupportPage'));
const ReferAndEarnPage = React.lazy(() => import('./pages/user/ReferAndEarnPage'));
const SavedPlacesPage = React.lazy(() => import('./pages/user/SavedPlacesPage'));
const NotificationsPage = React.lazy(() => import('./pages/user/NotificationsPage'));
const SettingsPage = React.lazy(() => import('./pages/user/SettingsPage'));
const PartnerLandingPage = React.lazy(() => import('./pages/user/PartnerLandingPage'));
const LegalPage = React.lazy(() => import('./pages/user/LegalPage'));
const TermsPage = React.lazy(() => import('./pages/user/TermsPage'));
const PrivacyPage = React.lazy(() => import('./pages/user/PrivacyPage'));
const AboutPage = React.lazy(() => import('./pages/user/AboutPage'));
const ContactPage = React.lazy(() => import('./pages/user/ContactPage'));
const BlogsPage = React.lazy(() => import('./pages/user/BlogsPage'));
const AmenitiesPage = React.lazy(() => import('./pages/user/AmenitiesPage'));
const ReviewsPage = React.lazy(() => import('./pages/user/ReviewsPage'));
const OffersPage = React.lazy(() => import('./pages/user/OffersPage'));
const ProfileEdit = React.lazy(() => import('./pages/user/ProfileEdit'));
const BookingCheckoutPage = React.lazy(() => import('./pages/user/BookingCheckoutPage'));
const CareersPage = React.lazy(() => import('./pages/user/CareersPage'));
const CancellationPage = React.lazy(() => import('./pages/user/CancellationPage'));
const ReferralHandler = React.lazy(() => import('./pages/auth/ReferralHandler'));


// Lazy Imports - Admin Pages
const AdminSignup = React.lazy(() => import('./app/admin/pages/AdminSignup'));
const AdminDashboard = React.lazy(() => import('./app/admin/pages/AdminDashboard'));
const AdminHotelDetail = React.lazy(() => import('./app/admin/pages/AdminHotelDetail'));
const AdminUsers = React.lazy(() => import('./app/admin/pages/AdminUsers'));
const AdminUserDetail = React.lazy(() => import('./app/admin/pages/AdminUserDetail'));
const AdminBookings = React.lazy(() => import('./app/admin/pages/AdminBookings'));
const AdminBookingDetail = React.lazy(() => import('./app/admin/pages/AdminBookingDetail'));
const AdminPartners = React.lazy(() => import('./app/admin/pages/AdminPartners'));
const AdminPartnerDetail = React.lazy(() => import('./app/admin/pages/AdminPartnerDetail'));
const AdminReviews = React.lazy(() => import('./app/admin/pages/AdminReviews'));
const AdminFinance = React.lazy(() => import('./pages/admin/FinanceAndPayoutsPage'));
const AdminSettings = React.lazy(() => import('./app/admin/pages/AdminSettings'));
const AdminOffers = React.lazy(() => import('./app/admin/pages/AdminOffers'));
const AdminProtectedRoute = React.lazy(() => import('./app/admin/AdminProtectedRoute'));
const AdminProperties = React.lazy(() => import('./app/admin/pages/AdminProperties'));
const AdminLegalPages = React.lazy(() => import('./app/admin/pages/AdminLegalPages'));
const AdminContactMessages = React.lazy(() => import('./app/admin/pages/AdminContactMessages'));
const AdminNotifications = React.lazy(() => import('./app/admin/pages/AdminNotifications'));
const AdminFaqs = React.lazy(() => import('./app/admin/pages/AdminFaqs'));

// Lazy Imports - Partner Pages
const HotelLogin = React.lazy(() => import('./pages/auth/HotelLoginPage'));
const HotelSignup = React.lazy(() => import('./pages/auth/HotelSignupPage'));
const PartnerHome = React.lazy(() => import('./app/partner/pages/PartnerHome'));
const AddVillaWizard = React.lazy(() => import('./app/partner/pages/AddVillaWizard'));
const AddHotelWizard = React.lazy(() => import('./app/partner/pages/AddHotelWizard'));
const AddHostelWizard = React.lazy(() => import('./app/partner/pages/AddHostelWizard'));
const AddPGWizard = React.lazy(() => import('./app/partner/pages/AddPGWizard'));
const AddResortWizard = React.lazy(() => import('./app/partner/pages/AddResortWizard'));
const AddHomestayWizard = React.lazy(() => import('./app/partner/pages/AddHomestayWizard'));
const PartnerDashboard = React.lazy(() => import('./app/partner/pages/PartnerDashboard'));
const PartnerBookings = React.lazy(() => import('./app/partner/pages/PartnerBookings'));
const PartnerWallet = React.lazy(() => import('./app/partner/pages/PartnerWallet'));
const PartnerReviews = React.lazy(() => import('./app/partner/pages/PartnerReviews'));
const PartnerPage = React.lazy(() => import('./app/partner/pages/PartnerPage'));
const PartnerJoinPropertyType = React.lazy(() => import('./app/partner/pages/PartnerJoinPropertyType'));
const PartnerProperties = React.lazy(() => import('./app/partner/pages/PartnerProperties'));
const PartnerPropertyDetails = React.lazy(() => import('./app/partner/pages/PartnerPropertyDetails'));
const PartnerBookingDetail = React.lazy(() => import('./app/partner/pages/PartnerBookingDetail'));

const PartnerInventory = React.lazy(() => import('./app/partner/pages/PartnerInventory'));
const PartnerInventoryProperties = React.lazy(() => import('./app/partner/pages/PartnerInventoryProperties'));
const PartnerNotifications = React.lazy(() => import('./app/partner/pages/PartnerNotificationsPage'));
const PartnerKYC = React.lazy(() => import('./app/partner/pages/PartnerKYC'));
const PartnerSupport = React.lazy(() => import('./app/partner/pages/PartnerSupport'));
const PartnerProfile = React.lazy(() => import('./app/partner/pages/PartnerProfile'));
const PartnerTransactions = React.lazy(() => import('./app/partner/pages/PartnerTransactions'));
const PartnerTerms = React.lazy(() => import('./app/partner/pages/PartnerTerms'));
const PartnerSettings = React.lazy(() => import('./app/partner/pages/PartnerSettings'));
const PartnerAbout = React.lazy(() => import('./app/partner/pages/PartnerAbout'));
const PartnerPrivacy = React.lazy(() => import('./app/partner/pages/PartnerPrivacy'));
const PartnerContact = React.lazy(() => import('./app/partner/pages/PartnerContact'));
const PartnerBankDetails = React.lazy(() => import('./app/partner/pages/PartnerBankDetails'));
const BlogManager = React.lazy(() => import('./pages/manager/BlogManager'));
const BlogDetail = React.lazy(() => import('./pages/user/BlogDetail'));

// Lazy Imports - Layouts
const HotelLayout = React.lazy(() => import('./layouts/HotelLayout'));
const AdminLayout = React.lazy(() => import('./app/admin/layouts/AdminLayout'));

const getAdminToken = () => (
  localStorage.getItem('adminToken') ||
  localStorage.getItem('admin_accessToken') ||
  localStorage.getItem('auth_admin')
);

const getHotelAuthToken = () => (
  localStorage.getItem('token') ||
  localStorage.getItem('user_accessToken') ||
  localStorage.getItem('accessToken') ||
  localStorage.getItem('auth_customer')
);

// Loading Fallback Component
const PageLoader = () => <HotelShellSkeleton />;

const AMBIGUOUS_PARTNER_ROUTE_SEGMENTS = new Set([
  'about',
  'bookings',
  'contact',
  'notifications',
  'privacy',
  'settings',
  'support',
  'terms',
  'wallet'
]);

const PARTNER_PENDING_ALLOWED_PREFIXES = [
  '/hotel/dashboard',
  '/hotel/partner-dashboard',
  '/hotel/join',
  '/hotel/profile',
  '/hotel/join-hotel',
  '/hotel/join-resort',
  '/hotel/join-hostel',
  '/hotel/join-villa',
  '/hotel/join-pg',
  '/hotel/join-homestay'
];

const getStoredHotelUser = () => {
  const userRaw = localStorage.getItem('user') || localStorage.getItem('user_user');
  if (!userRaw) return null;

  try {
    return JSON.parse(userRaw);
  } catch (error) {
    console.warn('[AUTH] Could not parse stored hotel user.', error);
    return null;
  }
};

const getHotelPathContext = (pathname) => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/hotel';
  const relativePath = normalizedPath.replace(/^\/hotel\/?/, '');
  const [firstSegment = '', secondSegment = ''] = relativePath.split('/');
  const storedUser = getStoredHotelUser();
  const isPartnerUser = storedUser?.role === 'partner';

  const isExplicitUserRoute = normalizedPath === '/hotel'
    || normalizedPath === '/hotel/profile/edit'
    || normalizedPath === '/hotel/partner'
    || normalizedPath === '/hotel/partner-landing'
    || normalizedPath === '/hotel/legal'
    || normalizedPath === '/hotel/cancellation'
    || normalizedPath === '/hotel/careers'
    || normalizedPath === '/hotel/blogs'
    || normalizedPath.startsWith('/hotel/blogs/')
    || normalizedPath === '/hotel/search'
    || normalizedPath === '/hotel/listings'
    || normalizedPath === '/hotel/refer'
    || normalizedPath === '/hotel/saved-places'
    || normalizedPath === '/hotel/checkout'
    || normalizedPath === '/hotel/booking-confirmation'
    || normalizedPath.startsWith('/hotel/booking/')
    || normalizedPath === '/hotel/user/login'
    || normalizedPath === '/hotel/user/signup'
    || /^\/hotel\/[0-9a-fA-F]{24}(\/(amenities|reviews|offers))?$/.test(normalizedPath);

  const isAmbiguousPartnerRoute = AMBIGUOUS_PARTNER_ROUTE_SEGMENTS.has(firstSegment) && !secondSegment;
  const isUserHotelRoute = isExplicitUserRoute || (isAmbiguousPartnerRoute ? !isPartnerUser : false);

  return {
    normalizedPath,
    storedUser,
    isPartnerUser,
    isUserHotelRoute
  };
};

const canAccessPendingPartnerPath = (pathname) =>
  PARTNER_PENDING_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const SharedAuthenticatedRoute = ({ userElement, partnerElement }) => {
  const token = getHotelAuthToken();
  const location = useLocation();
  const { storedUser } = getHotelPathContext(location.pathname);

  if (!token) {
    return <Navigate to="/hotel/user/login" state={{ from: location }} replace />;
  }

  if (storedUser?.role === 'partner') {
    if (storedUser.partnerApprovalStatus !== 'approved' && !canAccessPendingPartnerPath(location.pathname)) {
      return <Navigate to="/hotel/dashboard" replace />;
    }
    return partnerElement;
  }

  return userElement;
};

const SharedAudienceRoute = ({ userElement, partnerElement }) => {
  const location = useLocation();
  const { isPartnerUser } = getHotelPathContext(location.pathname);
  return isPartnerUser ? partnerElement : userElement;
};

// Wrapper to conditionally render Navbars & Handle Lenis
const Layout = ({ children }) => {
  const location = useLocation();
  const [platformStatus, setPlatformStatus] = React.useState({
    loading: true,
    maintenanceMode: false,
    maintenanceTitle: '',
    maintenanceMessage: ''
  });

  // Disable Lenis on Admin routes only (as requested)
  const isCmsRoute = location.pathname.startsWith('/hotel/admin');
  useLenis(isCmsRoute);

  const [hideNavsDueToSlider, setHideNavsDueToSlider] = React.useState(false);

  React.useEffect(() => {
    const handleSliderChange = (e) => {
      setHideNavsDueToSlider(!!e.detail);
    };
    window.addEventListener('rukkoo:slider', handleSliderChange);
    return () => window.removeEventListener('rukkoo:slider', handleSliderChange);
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const data = await legalService.getPlatformStatus();
        if (isMounted) {
          setPlatformStatus({
            loading: false,
            maintenanceMode: !!data.maintenanceMode,
            maintenanceTitle: data.maintenanceTitle || 'We will be back soon.',
            maintenanceMessage: data.maintenanceMessage || 'The platform is under scheduled maintenance. Please check back in some time.'
          });
        }
      } catch (error) {
        if (isMounted) {
          setPlatformStatus(prev => ({ ...prev, loading: false }));
        }
      }
    };
    fetchStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. GLOBAL HIDE: Auth pages, Admin, and Property Wizard
  const globalHideRoutes = ['/login', '/signup', '/register', '/hotel/admin', '/hotel/join'];
  const shouldGlobalHide = globalHideRoutes.some(route => location.pathname.includes(route));

  if (shouldGlobalHide) {
    return <>{children}</>;
  }

  const { normalizedPath, isUserHotelRoute } = getHotelPathContext(location.pathname);
  const isPartnerApp = location.pathname.startsWith('/hotel') && !isUserHotelRoute;
  const isPartnerLandingRoute =
    normalizedPath === '/hotel/partner' || normalizedPath === '/hotel/partner-landing';

  // 3. NAVBAR VISIBILITY
  const showUserNavs = !isPartnerApp && !isPartnerLandingRoute;

  // Hide the user bottom nav only on the routes that should genuinely be full-screen or distraction-free.
  const hideUserBottomNav = normalizedPath === '/hotel/booking-confirmation'
    || normalizedPath.startsWith('/hotel/payment')
    || normalizedPath === '/hotel/support'
    || normalizedPath === '/hotel/refer'
    || normalizedPath === '/hotel/legal'
    || normalizedPath === '/hotel/terms'
    || normalizedPath === '/hotel/privacy'
    || isPartnerLandingRoute
    || /^\/hotel\/[0-9a-fA-F]{24}(\/(amenities|reviews|offers))?$/.test(normalizedPath);
  const showUserBottomNav = showUserNavs && !hideUserBottomNav && !hideNavsDueToSlider;

  // Partner Bottom Nav should show in Partner App (authenticated pages)
  const isPartnerPublic = normalizedPath === '/hotel/privacy' || normalizedPath === '/hotel/contact';
  const showPartnerBottomNav = isPartnerApp && normalizedPath !== '/hotel' && !isPartnerPublic && !hideNavsDueToSlider;

  const isAuthRoute = ['/login', '/signup', '/hotel/user/login', '/hotel/user/signup', '/hotel/login', '/hotel/register'].some(route =>
    location.pathname.startsWith(route)
  );

  const showMaintenanceOverlay =
    platformStatus.maintenanceMode &&
    !isCmsRoute &&
    !isAuthRoute;

  return (
    <>
      {showUserNavs && <TopNavbar />}

      <div className={`min-h-screen md:pt-24 ${showUserBottomNav || showPartnerBottomNav ? 'pb-20 md:pb-0' : ''}`}>
        {showMaintenanceOverlay ? (
          <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 py-10 text-center bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_55%,#eef6f5_100%)]">
            <div className="flex flex-col items-center justify-center max-w-md w-full">
              <div className="mb-6 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white border border-teal-100 shadow-sm flex items-center justify-center">
                  <Clock className="w-8 h-8 md:w-9 md:h-9 text-teal-600" />
                </div>
                <img
                  src={logo}
                  alt="Rukkoin"
                  className="h-10 md:h-12 object-contain"
                />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 leading-snug">
                {platformStatus.maintenanceTitle}
              </h1>
              <p className="text-sm md:text-base text-slate-600 mb-8 leading-relaxed">
                {platformStatus.maintenanceMessage}
              </p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>

      {showUserBottomNav && <BottomNavbar />}
      {showPartnerBottomNav && <PartnerBottomNavbar />}
      {showUserNavs && <Footer />}
    </>

  );
};

// Simple Protected Route for Users
// In WebView (Flutter app): always require login → redirect to /login
// In Browser: allow access; partner-logged-in users are redirected to partner dashboard
const UserProtectedRoute = ({ children }) => {
  const token = getHotelAuthToken();
  const user = getStoredHotelUser();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/hotel/user/login" state={{ from: location }} replace />;
  }

  // If partner is logged in but tries to access user routes, redirect to partner dashboard
  if (user?.role === 'partner') {
    console.warn(`[AUTH] Partner ${user._id} attempted to access user route: ${location.pathname}. Redirecting to /hotel/dashboard.`);
    return <Navigate to="/hotel/dashboard" replace />;
  }

  return children ? children : <Outlet />;
};

const PublicOrProtectedRoute = ({ children }) => {
  const token = getHotelAuthToken();
  const user = getStoredHotelUser();
  // For both Browser and WebView:
  // If a partner is logged in and tries to access user-facing public routes,
  // redirect them to the partner dashboard. Otherwise allow access.
  if (token && user?.role === 'partner') {
    return <Navigate to="/hotel/dashboard" replace />;
  }

  return children ? children : <Outlet />;
};

/**
 * UserPrivateRoute — always requires authentication (both WebView and Browser)
 * Used for pages that require the user to be logged in: Bookings, Wallet, Checkout, etc.
 * On redirect, preserves location so login can send you back.
 */
const UserPrivateRoute = ({ children }) => {
  const token = getHotelAuthToken();
  const user = getStoredHotelUser();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/hotel/user/login" state={{ from: location }} replace />;
  }

  if (user?.role === 'partner') {
    return <Navigate to="/hotel/dashboard" replace />;
  }

  return children ? children : <Outlet />;
};


// Partner Protected Route
const PartnerProtectedRoute = ({ children }) => {
  const token = getHotelAuthToken();
  const user = getStoredHotelUser();
  const location = useLocation();

  // Allow access to login/register/join/privacy/contact
  const publicPartnerPaths = ['/hotel/login', '/hotel/register', '/hotel/privacy', '/hotel/contact'];
  if (publicPartnerPaths.some(p => location.pathname.startsWith(p))) {
    return children ? children : <Outlet />;
  }

  if (!token || !user || user.role !== 'partner') {
    return <Navigate to="/hotel/login" state={{ from: location }} replace />;
  }

  const isPending = user.partnerApprovalStatus !== 'approved';
  if (isPending && !canAccessPendingPartnerPath(location.pathname)) {
    return <Navigate to="/hotel/dashboard" replace />;
  }

  return children ? children : <Outlet />;
};

// Public Route (redirects to home if already logged in)
const PublicRoute = ({ children }) => {
  const token = getHotelAuthToken();
  if (token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const location = useLocation();
  const isHotelHome = location.pathname.replace(/\/+$/, '') === '/hotel';
  const hotelUserToken = getHotelAuthToken();

  // Fix for Back Button in WebView/App Wrappers (Flutter/Android)
  // Ensures history stack has depth so "canGoBack" is true, preventing immediate app exit.
  React.useEffect(() => {
    if (window.history && window.history.length === 1) {
      window.history.pushState(null, document.title, window.location.href);
    }
  }, []);

  // One-time cleanup: remove the legacy persisted WebView flag.
  // Old deviceDetect.js stored '__rukkoo_app_mode__ = "1"' in localStorage permanently.
  // This caused isWebView() to return true in real browsers that share storage with the app,
  // blocking web push registration. Safe to remove — detection is now done via live UA/URL check.
  React.useEffect(() => {
    localStorage.removeItem('__rukkoo_app_mode__');
  }, []);


  // ─── WEB PUSH NOTIFICATIONS (Browser only) ──────────────────────────────────
  // Flutter WebView users: FCM tokens are managed ENTIRELY by the Flutter native
  // code. Flutter hits /api/v1/users/fcm-token or /api/v1/partners/fcm-token directly
  // with platform='app'. The React frontend has NO role in app token management.
  //
  // Real browser users: We request web push permission here, get a web FCM token,
  // and register it with the backend using platform='web'.
  // ─────────────────────────────────────────────────────────────────────────────

  // Register the web FCM token with the correct backend endpoint based on logged-in role.
  const registerWebToken = React.useCallback(async (fcmToken) => {
    try {
      const adminToken = getAdminToken();
      if (adminToken) {
        await adminService.updateFcmToken(fcmToken, 'web');
        console.log('[FCM] ✓ Admin web token registered.');
        return;
      }
      const tokenAuth = getHotelAuthToken();
      const userStr = localStorage.getItem('user') || localStorage.getItem('user_user');
      if (tokenAuth && userStr) {
        const user = JSON.parse(userStr);
        if (user.role === 'partner') {
          await hotelService.updateFcmToken(fcmToken, 'web');
          console.log('[FCM] ✓ Partner web token registered.');
        } else {
          await userService.updateFcmToken(fcmToken, 'web');
          console.log('[FCM] ✓ User web token registered.');
        }
      } else {
        console.log('[FCM] No logged-in session — web token will be registered on login.');
      }
    } catch (err) {
      console.warn('[FCM] Failed to register web token:', err);
    }
  }, []);

  React.useEffect(() => {
    let cachedWebToken = null;

    const initWebFcm = async () => {
      // requestNotificationPermission() returns null in WebView (handled in firebase.js).
      // Only proceeds in real browser environments.
      const token = await requestNotificationPermission();
      if (token) {
        cachedWebToken = token;
        await registerWebToken(token);
      }
    };

    initWebFcm();

    // Re-register web token after login/signup.
    // Dispatched from: UserLogin.jsx, HotelLoginPage.jsx, AdminLogin.jsx, UserSignup.jsx
    const handleLoginEvent = async () => {
      console.log('[FCM] Login event — re-registering web token.');
      if (cachedWebToken) {
        await registerWebToken(cachedWebToken);
      } else {
        // Permission not yet obtained — try now (user may have enabled it after loading)
        const token = await requestNotificationPermission();
        if (token) {
          cachedWebToken = token;
          await registerWebToken(token);
        }
      }
    };

    window.addEventListener('fcm:register', handleLoginEvent);

    // Cross-tab login sync
    const handleStorage = (e) => {
      if ((e.key === 'token' || e.key === 'user_accessToken' || e.key === 'accessToken' || e.key === 'adminToken' || e.key === 'admin_accessToken' || e.key === 'auth_admin') && e.newValue) {
        handleLoginEvent();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Foreground messages — shows in-app toast in browser.
    // In Flutter WebView, onMessageListener is a no-op (firebase.js checks isWebView()).
    onMessageListener((payload) => {
      console.log('[FCM] Foreground message:', payload);
      toast((t) => (
        <div className="flex flex-col">
          <span className="font-bold">{payload.notification?.title || 'Notification'}</span>
          <span className="text-sm">{payload.notification?.body}</span>
        </div>
      ), {
        duration: 5000,
        position: 'top-right',
        style: { background: '#333', color: '#fff' },
      });
    });

    return () => {
      window.removeEventListener('fcm:register', handleLoginEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [registerWebToken]);


  return (
    <>
      <ScrollToTop />
      <Toaster
        position="top-center"
        reverseOrder={false}
        containerStyle={{
          zIndex: 10000
        }}
      />
      <Layout>
        <Suspense fallback={<PageLoader />}>
          {isHotelHome ? (
            hotelUserToken ? (
              <HotelLayout>
                <Home />
              </HotelLayout>
            ) : (
              <Navigate to="/user/auth/login" replace state={{ redirectTo: '/hotel' }} />
            )
          ) : (
          <Routes>
            {/* User Auth Routes (Public Only) */}
            <Route path="user/login" element={<PublicRoute><UserLogin /></PublicRoute>} />
            <Route path="user/signup" element={<PublicRoute><UserSignup /></PublicRoute>} />
            <Route path="r/:referralCode" element={<ReferralHandler />} />
            <Route path="legal" element={<LegalPage />} />
            <Route path="cancellation" element={<CancellationPage />} />
            <Route path="careers" element={<CareersPage />} />
            <Route path="terms" element={<SharedAudienceRoute userElement={<TermsPage />} partnerElement={<PartnerTerms />} />} />
            <Route path="privacy" element={<SharedAudienceRoute userElement={<PrivacyPage />} partnerElement={<PartnerPrivacy />} />} />
            <Route path="about" element={<SharedAudienceRoute userElement={<AboutPage />} partnerElement={<PartnerAbout />} />} />
            <Route path="contact" element={<SharedAudienceRoute userElement={<ContactPage />} partnerElement={<PartnerContact />} />} />
            <Route path="bookings" element={<SharedAuthenticatedRoute userElement={<BookingsPage />} partnerElement={<PartnerBookings />} />} />
            <Route path="wallet" element={<SharedAuthenticatedRoute userElement={<WalletPage />} partnerElement={<PartnerWallet />} />} />
            <Route path="notifications" element={<SharedAuthenticatedRoute userElement={<NotificationsPage />} partnerElement={<PartnerNotifications />} />} />
            <Route path="support" element={<SharedAuthenticatedRoute userElement={<SupportPage />} partnerElement={<PartnerSupport />} />} />
            <Route path="settings" element={<SharedAuthenticatedRoute userElement={<SettingsPage />} partnerElement={<PartnerSettings />} />} />


            {/* Hotel/Partner Module Routes */}
            <Route path="login" element={<HotelLogin />} />
            <Route path="register" element={<HotelSignup />} />
            <Route element={<HotelLayout />}>
              <Route index element={<Home />} />
              <Route path="partner" element={<PartnerLandingPage />} />
              {/* Wizard Route */}
              <Route element={<PartnerProtectedRoute />}>
                <Route path="join" element={<PartnerJoinPropertyType />} />
                <Route path="join-hotel" element={<AddHotelWizard />} />
                <Route path="join-resort" element={<AddResortWizard />} />
                <Route path="join-hostel" element={<AddHostelWizard />} />
                <Route path="join-villa" element={<AddVillaWizard />} />
                <Route path="join-pg" element={<AddPGWizard />} />
                <Route path="join-homestay" element={<AddHomestayWizard />} />
                <Route path="partner-dashboard" element={<PartnerDashboard />} />
                <Route path="dashboard" element={<PartnerDashboard />} />

                {/* Partner Sub-pages */}
                <Route path="properties" element={<PartnerProperties />} />
                <Route path="properties/:id" element={<PartnerPropertyDetails />} />
                <Route path="inventory-properties" element={<PartnerInventoryProperties />} />
                <Route path="inventory/:id" element={<PartnerInventory />} />
                <Route path="bookings/:id" element={<PartnerBookingDetail />} />
                <Route path="reviews" element={<PartnerReviews />} />
                <Route path="transactions" element={<PartnerTransactions />} />
                <Route path="kyc" element={<PartnerKYC />} />
                <Route path="bank-details" element={<PartnerBankDetails />} />
                <Route path="profile" element={<PartnerProfile />} />
              </Route>

              {/* Public Partner Pages — accessible without login */}
            </Route>

            {/* Admin Routes - Redirected to centralized AdminRouter */}
            <Route path="admin/*" element={<Navigate to={`/admin/hotel${location.pathname.replace(/^\/hotel\/admin/, '')}${location.search}`} replace />} />

            {/* ──────────────────────────────────────
                PUBLIC / SEMI-PROTECTED USER ROUTES
                Browser: accessible without login
                WebView: require login (same as before)
            ────────────────────────────────────── */}
            <Route element={<PublicOrProtectedRoute />}>
              <Route path=":id" element={<UserPropertyDetailsPage />} />
              <Route path=":id/amenities" element={<AmenitiesPage />} />
              <Route path=":id/reviews" element={<ReviewsPage />} />
              <Route path=":id/offers" element={<OffersPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="listings" element={<Navigate to="/hotel/search" replace />} />
              <Route path="partner-landing" element={<PartnerLandingPage />} />
              <Route path="blogs" element={<BlogsPage />} />
              <Route path="blogs/:id" element={<BlogDetail />} />
              <Route path="manage-blogs" element={<BlogManager />} />
              <Route path="serviced" element={<div className="pt-20 text-center text-surface font-bold">Serviced Page</div>} />
            </Route>

            {/* ──────────────────────────────────────
                PRIVATE USER ROUTES
                Always require login (WebView + Browser)
                After login, redirected back via location.state.from
            ────────────────────────────────────── */}
            <Route element={<UserPrivateRoute />}>
              <Route path="profile/edit" element={<ProfileEdit />} />
              <Route path="payment" element={<PaymentPage />} />
              <Route path="payment/:id" element={<PaymentPage />} />
              <Route path="checkout" element={<BookingCheckoutPage />} />
              <Route path="booking-confirmation" element={<BookingConfirmationPage />} />
              <Route path="booking/:id" element={<BookingConfirmationPage />} />
              <Route path="refer" element={<ReferAndEarnPage />} />
              <Route path="saved-places" element={<SavedPlacesPage />} />
            </Route>
          </Routes>
          )}
        </Suspense>
      </Layout>
    </>
  );
}

export default App;
