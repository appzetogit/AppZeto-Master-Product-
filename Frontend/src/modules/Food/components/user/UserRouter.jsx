import { Routes, Route, Navigate } from "react-router-dom"
import UserLayout from "./UserLayout"
import { Suspense, lazy } from "react"
import Loader from "@food/components/Loader"
import ProtectedRoute from "@food/components/ProtectedRoute"

// Lazy Loading Pages

// Home & Discovery
const Home = lazy(() => import("@food/pages/user/Home"))
const Dining = lazy(() => import("@food/pages/user/Dining"))
const DiningRestaurants = lazy(() => import("@food/pages/user/DiningRestaurants"))
const DiningCategory = lazy(() => import("@food/pages/user/DiningCategory"))
const DiningExplore50 = lazy(() => import("@food/pages/user/DiningExplore50"))
const DiningExploreNear = lazy(() => import("@food/pages/user/DiningExploreNear"))
const Coffee = lazy(() => import("@food/pages/user/Coffee"))
const Under250 = lazy(() => import("@food/pages/user/Under250"))
const CategoryPage = lazy(() => import("@food/pages/user/CategoryPage"))
const Restaurants = lazy(() => import("@food/pages/user/restaurants/Restaurants"))
const RestaurantDetails = lazy(() => import("@food/pages/user/restaurants/RestaurantDetails"))
const DiningRestaurantDetails = lazy(() => import("@food/pages/user/dining/DiningRestaurantDetails"))
const TableBooking = lazy(() => import("@food/pages/user/dining/TableBooking"))
const TableBookingConfirmation = lazy(() => import("@food/pages/user/dining/TableBookingConfirmation"))
const TableBookingSuccess = lazy(() => import("@food/pages/user/dining/TableBookingSuccess"))
const MyBookings = lazy(() => import("@food/pages/user/dining/MyBookings"))
const SearchResults = lazy(() => import("@food/pages/user/SearchResults"))
const ProductDetail = lazy(() => import("@food/pages/user/ProductDetail"))

// Cart
const Cart = lazy(() => import("@food/pages/user/cart/Cart"))
const Checkout = lazy(() => import("@food/pages/user/cart/Checkout"))

// Orders
const Orders = lazy(() => import("@food/pages/user/orders/Orders"))
const OrderTracking = lazy(() => import("@food/pages/user/orders/OrderTracking"))
const OrderInvoice = lazy(() => import("@food/pages/user/orders/OrderInvoice"))
const UserOrderDetails = lazy(() => import("@food/pages/user/orders/UserOrderDetails"))

// Offers
const Offers = lazy(() => import("@food/pages/user/Offers"))

// Gourmet
const Gourmet = lazy(() => import("@food/pages/user/Gourmet"))

// Top 10
const Top10 = lazy(() => import("@food/pages/user/Top10"))

// Collections
const Collections = lazy(() => import("@food/pages/user/Collections"))
const CollectionDetail = lazy(() => import("@food/pages/user/CollectionDetail"))

// Gift Cards
const GiftCards = lazy(() => import("@food/pages/user/GiftCards"))
const GiftCardCheckout = lazy(() => import("@food/pages/user/GiftCardCheckout"))

// Profile
const Profile = lazy(() => import("@food/pages/user/profile/Profile"))
const EditProfile = lazy(() => import("@food/pages/user/profile/EditProfile"))
const Payments = lazy(() => import("@food/pages/user/profile/Payments"))
const AddPayment = lazy(() => import("@food/pages/user/profile/AddPayment"))
const EditPayment = lazy(() => import("@food/pages/user/profile/EditPayment"))
const Favorites = lazy(() => import("@food/pages/user/profile/Favorites"))
const Settings = lazy(() => import("@food/pages/user/profile/Settings"))
const Coupons = lazy(() => import("@food/pages/user/profile/Coupons"))
const RedeemGoldCoupon = lazy(() => import("@food/pages/user/profile/RedeemGoldCoupon"))
const About = lazy(() => import("@food/pages/user/profile/About"))
const Terms = lazy(() => import("@food/pages/user/profile/Terms"))
const Privacy = lazy(() => import("@food/pages/user/profile/Privacy"))
const Refund = lazy(() => import("@food/pages/user/profile/Refund"))
const Shipping = lazy(() => import("@food/pages/user/profile/Shipping"))
const Cancellation = lazy(() => import("@food/pages/user/profile/Cancellation"))
const SendFeedback = lazy(() => import("@food/pages/user/profile/SendFeedback"))
const ReportSafetyEmergency = lazy(() => import("@food/pages/user/profile/ReportSafetyEmergency"))
const Accessibility = lazy(() => import("@food/pages/user/profile/Accessibility"))
const Logout = lazy(() => import("@food/pages/user/profile/Logout"))

// Auth
const SignIn = lazy(() => import("@food/pages/user/auth/SignIn"))
const OTP = lazy(() => import("@food/pages/user/auth/OTP"))
const AuthCallback = lazy(() => import("@food/pages/user/auth/AuthCallback"))

// Help
const Help = lazy(() => import("@food/pages/user/help/Help"))
const OrderHelp = lazy(() => import("@food/pages/user/help/OrderHelp"))

// Notifications
const Notifications = lazy(() => import("@food/pages/user/Notifications"))

// Wallet
const Wallet = lazy(() => import("@food/pages/user/Wallet"))

// Complaints
const SubmitComplaint = lazy(() => import("@food/pages/user/complaints/SubmitComplaint"))

export default function UserRouter() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route element={<UserLayout />}>
          {/* Home & Discovery */}
          <Route path="" element={<Home />} />
          <Route path="dining" element={<Dining />} />
          <Route path="dining/restaurants" element={<DiningRestaurants />} />
          <Route path="dining/:category" element={<DiningCategory />} />
          <Route path="dining/explore/upto50" element={<DiningExplore50 />} />
          <Route path="dining/explore/near-rated" element={<DiningExploreNear />} />
          <Route path="dining/coffee" element={<Coffee />} />
          <Route path="dining/:diningType/:slug" element={<DiningRestaurantDetails />} />
          <Route path="dining/book/:slug" element={<TableBooking />} />
          <Route path="dining/book-confirmation" element={<TableBookingConfirmation />} />
          <Route path="dining/book-success" element={<TableBookingSuccess />} />
          <Route
            path="bookings"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route path="under-250" element={<Under250 />} />
          <Route path="category/:category" element={<CategoryPage />} />
          <Route path="restaurants" element={<Restaurants />} />
          <Route path="restaurants/:slug" element={<RestaurantDetails />} />
          <Route path="search" element={<SearchResults />} />
          <Route path="product/:id" element={<ProductDetail />} />

          {/* Cart - Now Public */}
          <Route path="cart" element={<Cart />} />
          <Route path="cart/checkout" element={<Checkout />} />

          {/* Orders - Protected (require user auth) */}
          <Route
            path="orders"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders/:orderId"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <OrderTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders/:orderId/invoice"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <OrderInvoice />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders/:orderId/details"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <UserOrderDetails />
              </ProtectedRoute>
            }
          />

          {/* Offers */}
          <Route path="offers" element={<Offers />} />

          {/* Gourmet */}
          <Route path="gourmet" element={<Gourmet />} />

          {/* Top 10 */}
          <Route path="top-10" element={<Top10 />} />

          {/* Collections */}
          <Route path="collections" element={<Collections />} />
          <Route path="collections/:id" element={<CollectionDetail />} />

          {/* Gift Cards */}
          <Route path="gift-card" element={<GiftCards />} />
          <Route path="gift-card/checkout" element={<GiftCardCheckout />} />

          {/* Profile - Protected (require user auth) */}
          <Route
            path="profile"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/edit"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <EditProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/payments"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <Payments />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/payments/new"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <AddPayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/payments/:id/edit"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <EditPayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/favorites"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <Favorites />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/settings"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/coupons"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <Coupons />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/redeem-gold-coupon"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <RedeemGoldCoupon />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/about"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <About />
              </ProtectedRoute>
            }
          />

          <Route
            path="profile/send-feedback"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <SendFeedback />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/report-safety-emergency"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <ReportSafetyEmergency />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/accessibility"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <Accessibility />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/logout"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <Logout />
              </ProtectedRoute>
            }
          />

          {/* Public Legal Policies (stay public) */}
          <Route path="profile/terms" element={<Terms />} />
          <Route path="profile/privacy" element={<Privacy />} />
          <Route path="profile/refund" element={<Refund />} />
          <Route path="profile/shipping" element={<Shipping />} />
          <Route path="profile/cancellation" element={<Cancellation />} />

          {/* Auth - User login is centralized at /user/auth/login */}
          <Route path="auth/login" element={<Navigate to="/user/auth/login" replace />} />
          <Route path="auth/sign-in" element={<Navigate to="/user/auth/login" replace />} />
          <Route path="auth/otp" element={<OTP />} />
          <Route path="auth/callback" element={<AuthCallback />} />

          {/* Help */}
          <Route path="help" element={<Help />} />
          <Route path="help/orders/:orderId" element={<OrderHelp />} />

          {/* Notifications - Protected (user auth) */}
          <Route
            path="notifications"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* Wallet - Protected (user auth) */}
          <Route
            path="wallet"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <Wallet />
              </ProtectedRoute>
            }
          />

          {/* Complaints - Protected (user auth) */}
          <Route
            path="complaints/submit/:orderId"
            element={
              <ProtectedRoute requiredRole="user" loginPath="/user/auth/login">
                <SubmitComplaint />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  )
}
