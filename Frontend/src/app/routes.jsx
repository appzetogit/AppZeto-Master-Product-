import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { AppShellSkeleton } from '@food/components/ui/loading-skeletons'

// Lazy load the Food service module (Quick-spicy app)
const FoodApp = lazy(() => import('../modules/Food/routes'))
const AuthApp = lazy(() => import('../modules/auth/routes'))
import ProtectedRoute from '@food/components/ProtectedRoute'

const PageLoader = () => <AppShellSkeleton />

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

const RedirectToFood = () => {
  const location = useLocation();
  // We safely replace the exact current pathname with a /food prefixed pathname
  // This effectively catches programmatic navigation to absolute paths like '/restaurant/login'
  // and turns them into '/food/restaurant/login'
  return <Navigate to={`/food${location.pathname}${location.search}`} replace />;
};

const MasterLandingPage = lazy(() => import('./MasterLandingPage'))
const AdminRouter = lazy(() => import('../modules/Food/components/admin/AdminRouter'))

const AppRoutes = () => {
  return (
    <Routes>
      {/* Root → Master Landing Page */}
      <Route path="/" element={<Suspense fallback={<PageLoader />}><MasterLandingPage /></Suspense>} />

      {/* Auth Module */}
      <Route path="/user/auth/*" element={<AuthApp />} />

      {/* Food Module */}
      <Route path="/food/*" element={<FoodAppWrapper />} />

      {/* Global Admin Portal - AdminRouter handles its own protection for sub-routes */}
      <Route path="/admin/*" element={<AdminRouter />} />
      
      {/* Dynamic intercept redirects for bare paths (accessed programmatically) */}
      <Route path="/user/*" element={<RedirectToFood />} />
      <Route path="/restaurant/*" element={<RedirectToFood />} />
      <Route path="/delivery/*" element={<RedirectToFood />} />
      <Route path="/usermain/*" element={<RedirectToFood />} />
      <Route path="/profile/*" element={<RedirectToFood />} />
      <Route path="/cart/*" element={<Navigate to="/food/user/cart" replace />} />
      <Route path="/orders/*" element={<RedirectToFood />} />

      {/* Fallback 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
