import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { AppShellSkeleton } from '@food/components/ui/loading-skeletons'
import ProtectedRoute from '@core/guards/ProtectedRoute'
import RoleGuard from '@core/guards/RoleGuard'
import { UserRole } from '@core/constants/roles'
import SellerAuthPage from '../modules/seller/pages/Auth'

const NATIVE_LAST_ROUTE_KEY = 'native_last_route'

// Lazy load the Food service module (Quick-spicy app)
const FoodApp = lazy(() => import('../modules/Food/routes'))
const AuthApp = lazy(() => import('../modules/auth/routes'))
const QuickCommerceApp = lazy(() => import('../modules/quickCommerce/routes'))
const SellerApp = lazy(() => import('../modules/seller/routes'))
const TaxiApp = lazy(() => import('../modules/taxi/TaxiModuleApp'))
const FoodUserLayout = lazy(() => import('../modules/Food/components/user/UserLayout'))
const FoodHomePage = lazy(() => import('../modules/Food/pages/user/Home'))
const GlobalCartPage = lazy(() => import('../modules/Food/pages/user/cart/Cart'))
const GlobalCheckoutPage = lazy(() => import('../modules/Food/pages/user/cart/Checkout'))
const GlobalSelectAddressPage = lazy(() => import('../modules/Food/pages/user/cart/SelectAddress'))
const GlobalAddressSelectorPage = lazy(() => import('../modules/Food/pages/user/cart/AddressSelectorPage'))

const PageLoader = () => <AppShellSkeleton />
const TaxiPageLoader = () => (
  <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)]">
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="h-14 w-14 animate-pulse rounded-[18px] bg-[linear-gradient(135deg,#F97316_0%,#FB923C_55%,#FDBA74_100%)] shadow-[0_18px_40px_rgba(249,115,22,0.22)]" />
      <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
        Loading taxi app
      </p>
      <div className="mt-4 h-2 w-40 overflow-hidden rounded-full bg-white/80 shadow-inner">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-[linear-gradient(90deg,#F97316_0%,#FDBA74_100%)]" />
      </div>
    </div>
  </div>
)

/**
 * FoodAppWrapper — Quick-spicy App. को /food prefix के साथ render करता है.
 * 
 * Quick-spicy की App.jsx में routes /restaurant, /usermain, /admin, /delivery
 * जैसे hain (bina /food prefix ke). Yahan hum useLocation se /food ke baad wala
 * path nikalne ke baad FoodApp render karte hain. FoodApp internally BrowserRouter
 * nahi use karta (sirf Routes use karta hai), isliye ye directly kaam karta hai.
 */
const FoodAppWrapper = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <FoodApp />
    </Suspense>
  )
}

const SharedFoodHomeRoute = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<FoodUserLayout />}>
          <Route index element={<FoodHomePage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

const RedirectToFood = () => {
  const location = useLocation();
  // We safely replace the exact current pathname with a /food prefixed pathname
  // This effectively catches programmatic navigation to absolute paths like '/restaurant/login'
  // and turns them into '/food/restaurant/login'
  return <Navigate to={`/food${location.pathname}${location.search}`} replace />;
};

const RedirectLegacyQuickCommerce = () => {
  const location = useLocation();
  const suffix = location.pathname
    .replace(/^\/quick-commerce(?:\/user)?/, '');
  const normalizedSuffix = suffix && suffix !== '/' ? suffix : '';
  return (
    <Navigate
      to={`/quick${normalizedSuffix}${location.search}`}
      replace
    />
  );
};

const SellerAuthEntry = () => {
  return <SellerAuthPage />
}

const SellerAppWrapper = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProtectedRoute>
        <RoleGuard allowedRoles={[UserRole.SELLER]}>
          <SellerApp />
        </RoleGuard>
      </ProtectedRoute>
    </Suspense>
  )
}

const AdminRouter = lazy(() => import('../modules/Food/components/admin/AdminRouter'))

const AppRoutes = () => {
  const location = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const protocol = String(window.location?.protocol || '').toLowerCase()
    const userAgent = String(window.navigator?.userAgent || '').toLowerCase()
    const isNativeLikeShell =
      Boolean(window.flutter_inappwebview) ||
      Boolean(window.ReactNativeWebView) ||
      protocol === 'file:' ||
      userAgent.includes(' wv') ||
      userAgent.includes('; wv')

    if (!isNativeLikeShell) return

    const route = `${location.pathname || ''}${location.search || ''}`
    if (route.startsWith('/food/') || route.startsWith('/admin') || route.startsWith('/taxi/')) {
      localStorage.setItem(NATIVE_LAST_ROUTE_KEY, route)
    }
  }, [location.pathname, location.search])

  return (
    <Routes>
      {/* Root now lands on the food homepage */}
      <Route path="/" element={<Navigate to="/food/user" replace />} />

      {/* Auth Module */}
      <Route path="/user/auth/*" element={<AuthApp />} />

      {/* Shared home entry so /food/user <-> /quick doesn't remount through different app trees */}
      <Route path="/food/user" element={<SharedFoodHomeRoute />} />

      {/* Food Module */}
      <Route path="/food/*" element={<FoodAppWrapper />} />

      {/* Quick storefront landing keeps the shared food layout */}
      <Route path="/quick" element={<SharedFoodHomeRoute />} />

      {/* Global shared cart */}
      <Route
        element={
          <Suspense fallback={<PageLoader />}>
            <FoodUserLayout />
          </Suspense>
        }
      >
        <Route path="/cart" element={<GlobalCartPage />} />
        <Route path="/cart/checkout" element={<GlobalCheckoutPage />} />
        <Route path="/cart/select-address" element={<GlobalSelectAddressPage />} />
        <Route path="/cart/address-selector" element={<GlobalAddressSelectorPage />} />
      </Route>

      {/* Quick storefront */}
      <Route
        path="/quick/*"
        element={
          <Suspense fallback={<PageLoader />}>
            <QuickCommerceApp />
          </Suspense>
        }
      />
      <Route path="/quick-commerce/*" element={<RedirectLegacyQuickCommerce />} />
      <Route path="/qc/*" element={<Navigate to="/quick" replace />} />

      <Route
        path="/taxi/*"
        element={
          <Suspense fallback={<TaxiPageLoader />}>
            <TaxiApp />
          </Suspense>
        }
      />

      {/* Seller Module */}
      <Route path="/seller" element={<SellerAppWrapper />} />
      <Route path="/seller/auth" element={<SellerAuthEntry />} />
      <Route path="/seller/*" element={<SellerAppWrapper />} />

      {/* Global Admin Portal - wrap lazy router in Suspense to avoid blank/crash on direct admin URLs */}
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<PageLoader />}>
            <AdminRouter />
          </Suspense>
        }
      />
      
      {/* Dynamic intercept redirects for bare paths (accessed programmatically) */}
      <Route path="/user/*" element={<RedirectToFood />} />
      <Route path="/restaurant/*" element={<RedirectToFood />} />
      <Route path="/delivery/*" element={<RedirectToFood />} />
      <Route path="/usermain/*" element={<RedirectToFood />} />
      <Route path="/profile/*" element={<RedirectToFood />} />
      <Route path="/orders/*" element={<RedirectToFood />} />

      {/* Fallback 404 */}
      <Route path="*" element={<Navigate to="/food/user" replace />} />
    </Routes>
  )
}

export default AppRoutes
