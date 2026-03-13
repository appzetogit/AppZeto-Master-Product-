import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { useEffect, Suspense, lazy } from "react"
import ProtectedRoute from "@food/components/ProtectedRoute"
import AuthRedirect from "@food/components/AuthRedirect"
import Loader from "@food/components/Loader"
import PushSoundEnableButton from "@food/components/PushSoundEnableButton"
import { registerWebPushForCurrentModule } from "@food/lib/utils/firebaseMessaging"
import { isModuleAuthenticated } from "@food/lib/utils/auth"
import { useRestaurantNotifications } from "@food/module/restaurant/hooks/useRestaurantNotifications"

// Lazy Loading Components
const UserRouter = lazy(() => import("@food/module/user/components/UserRouter"))
const HomePage = lazy(() => import("@food/module/usermain/pages/HomePage"))
const CategoriesPage = lazy(() => import("@food/module/usermain/pages/CategoriesPage"))
const CategoryFoodsPage = lazy(() => import("@food/module/usermain/pages/CategoryFoodsPage"))
const FoodDetailPage = lazy(() => import("@food/module/usermain/pages/FoodDetailPage"))
const CartPage = lazy(() => import("@food/module/usermain/pages/CartPage"))
const CheckoutPage = lazy(() => import("@food/module/usermain/pages/CheckoutPage"))
const PaymentPage = lazy(() => import("@food/module/usermain/pages/PaymentPage"))
const OrdersPage = lazy(() => import("@food/module/usermain/pages/OrdersPage"))
const OrderDetailsPage = lazy(() => import("@food/module/usermain/pages/OrderDetailsPage"))
const WishlistPage = lazy(() => import("@food/module/usermain/pages/WishlistPage"))

// Restaurant Module
const RestaurantOrdersPage = lazy(() => import("@food/module/restaurant/pages/OrdersPage"))
const AllOrdersPage = lazy(() => import("@food/module/restaurant/pages/AllOrdersPage"))
const RestaurantDetailsPage = lazy(() => import("@food/module/restaurant/pages/RestaurantDetailsPage"))
const EditRestaurantPage = lazy(() => import("@food/module/restaurant/pages/EditRestaurantPage"))
const FoodDetailsPage = lazy(() => import("@food/module/restaurant/pages/FoodDetailsPage"))
const EditFoodPage = lazy(() => import("@food/module/restaurant/pages/EditFoodPage"))
const AllFoodPage = lazy(() => import("@food/module/restaurant/pages/AllFoodPage"))
const WalletPage = lazy(() => import("@food/module/restaurant/pages/WalletPage"))
const RestaurantNotifications = lazy(() => import("@food/module/restaurant/pages/Notifications"))
const OrderDetails = lazy(() => import("@food/module/restaurant/pages/OrderDetails"))
const OrdersMain = lazy(() => import("@food/module/restaurant/pages/OrdersMain"))
const RestaurantOnboarding = lazy(() => import("@food/module/restaurant/pages/Onboarding"))

const RestaurantSignIn = lazy(() => import("@food/module/restaurant/pages/auth/SignIn"))
const RestaurantLogin = lazy(() => import("@food/module/restaurant/pages/auth/Login"))
const RestaurantSignup = lazy(() => import("@food/module/restaurant/pages/auth/Signup"))
const RestaurantSignupEmail = lazy(() => import("@food/module/restaurant/pages/auth/SignupEmail"))
const RestaurantForgotPassword = lazy(() => import("@food/module/restaurant/pages/auth/ForgotPassword"))
const RestaurantOTP = lazy(() => import("@food/module/restaurant/pages/auth/OTP"))
const RestaurantGoogleCallback = lazy(() => import("@food/module/restaurant/pages/auth/GoogleCallback"))
const RestaurantWelcome = lazy(() => import("@food/module/restaurant/pages/auth/Welcome"))

const AdvertisementsPage = lazy(() => import("@food/module/restaurant/pages/AdvertisementsPage"))
const AdDetailsPage = lazy(() => import("@food/module/restaurant/pages/AdDetailsPage"))
const NewAdvertisementPage = lazy(() => import("@food/module/restaurant/pages/NewAdvertisementPage"))
const EditAdvertisementPage = lazy(() => import("@food/module/restaurant/pages/EditAdvertisementPage"))
const CouponListPage = lazy(() => import("@food/module/restaurant/pages/CouponListPage"))
const AddCouponPage = lazy(() => import("@food/module/restaurant/pages/AddCouponPage"))
const EditCouponPage = lazy(() => import("@food/module/restaurant/pages/EditCouponPage"))
const ReviewsPage = lazy(() => import("@food/module/restaurant/pages/ReviewsPage"))
const UpdateReplyPage = lazy(() => import("@food/module/restaurant/pages/UpdateReplyPage"))
const SettingsPage = lazy(() => import("@food/module/restaurant/pages/SettingsPage"))
const PrivacyPolicyPage = lazy(() => import("@food/module/restaurant/pages/PrivacyPolicyPage"))
const TermsAndConditionsPage = lazy(() => import("@food/module/restaurant/pages/TermsAndConditionsPage"))
const RestaurantConfigPage = lazy(() => import("@food/module/restaurant/pages/RestaurantConfigPage"))
const RestaurantCategoriesPage = lazy(() => import("@food/module/restaurant/pages/RestaurantCategoriesPage"))
const MenuCategoriesPage = lazy(() => import("@food/module/restaurant/pages/MenuCategoriesPage"))
const BusinessPlanPage = lazy(() => import("@food/module/restaurant/pages/BusinessPlanPage"))
const ConversationListPage = lazy(() => import("@food/module/restaurant/pages/ConversationListPage"))
const ChatDetailPage = lazy(() => import("@food/module/restaurant/pages/ChatDetailPage"))
const RestaurantStatus = lazy(() => import("@food/module/restaurant/pages/RestaurantStatus"))
const ExploreMore = lazy(() => import("@food/module/restaurant/pages/ExploreMore"))
const DeliverySettings = lazy(() => import("@food/module/restaurant/pages/DeliverySettings"))
const RushHour = lazy(() => import("@food/module/restaurant/pages/RushHour"))
const OutletTimings = lazy(() => import("@food/module/restaurant/pages/OutletTimings"))
const DaySlots = lazy(() => import("@food/module/restaurant/pages/DaySlots"))
const OutletInfo = lazy(() => import("@food/module/restaurant/pages/OutletInfo"))
const RatingsReviews = lazy(() => import("@food/module/restaurant/pages/RatingsReviews"))
const ContactDetails = lazy(() => import("@food/module/restaurant/pages/ContactDetails"))
const EditOwner = lazy(() => import("@food/module/restaurant/pages/EditOwner"))
const InviteUser = lazy(() => import("@food/module/restaurant/pages/InviteUser"))
const EditCuisines = lazy(() => import("@food/module/restaurant/pages/EditCuisines"))
const EditRestaurantAddress = lazy(() => import("@food/module/restaurant/pages/EditRestaurantAddress"))
const Inventory = lazy(() => import("@food/module/restaurant/pages/Inventory"))
const Feedback = lazy(() => import("@food/module/restaurant/pages/Feedback"))
const ShareFeedback = lazy(() => import("@food/module/restaurant/pages/ShareFeedback"))
const DishRatings = lazy(() => import("@food/module/restaurant/pages/DishRatings"))
const HelpCentre = lazy(() => import("@food/module/restaurant/pages/HelpCentre"))
const FssaiDetails = lazy(() => import("@food/module/restaurant/pages/FssaiDetails"))
const FssaiUpdate = lazy(() => import("@food/module/restaurant/pages/FssaiUpdate"))
const Hyperpure = lazy(() => import("@food/module/restaurant/pages/Hyperpure"))
const HubGrowth = lazy(() => import("@food/module/restaurant/pages/HubGrowth"))
const CreateOffers = lazy(() => import("@food/module/restaurant/pages/CreateOffers"))
const ChooseDiscountType = lazy(() => import("@food/module/restaurant/pages/ChooseDiscountType"))
const ChooseMenuDiscountType = lazy(() => import("@food/module/restaurant/pages/ChooseMenuDiscountType"))
const CreatePercentageDiscount = lazy(() => import("@food/module/restaurant/pages/CreatePercentageDiscount"))
const CreateFreebies = lazy(() => import("@food/module/restaurant/pages/CreateFreebies"))
const FreebiesTiming = lazy(() => import("@food/module/restaurant/pages/FreebiesTiming"))
const CreatePercentageMenuDiscount = lazy(() => import("@food/module/restaurant/pages/CreatePercentageMenuDiscount"))
const CreateFlatPriceMenuDiscount = lazy(() => import("@food/module/restaurant/pages/CreateFlatPriceMenuDiscount"))
const CreateBOGOMenuDiscount = lazy(() => import("@food/module/restaurant/pages/CreateBOGOMenuDiscount"))
const MenuDiscountTiming = lazy(() => import("@food/module/restaurant/pages/MenuDiscountTiming"))
const HubMenu = lazy(() => import("@food/module/restaurant/pages/HubMenu"))
const ItemDetailsPage = lazy(() => import("@food/module/restaurant/pages/ItemDetailsPage"))
const HubFinance = lazy(() => import("@food/module/restaurant/pages/HubFinance"))
const FinanceDetailsPage = lazy(() => import("@food/module/restaurant/pages/FinanceDetailsPage"))
const WithdrawalHistoryPage = lazy(() => import("@food/module/restaurant/pages/WithdrawalHistoryPage"))
const PhoneNumbersPage = lazy(() => import("@food/module/restaurant/pages/PhoneNumbersPage"))
const DownloadReport = lazy(() => import("@food/module/restaurant/pages/DownloadReport"))
const ToHub = lazy(() => import("@food/module/restaurant/pages/ToHub"))
const ManageOutlets = lazy(() => import("@food/module/restaurant/pages/ManageOutlets"))
const UpdateBankDetails = lazy(() => import("@food/module/restaurant/pages/UpdateBankDetails"))
const ZoneSetup = lazy(() => import("@food/module/restaurant/pages/ZoneSetup"))
const DiningReservations = lazy(() => import("@food/module/restaurant/pages/DiningReservations"))

// Admin Module
const AdminRouter = lazy(() => import("@food/module/admin/components/AdminRouter"))
const AdminLogin = lazy(() => import("@food/module/admin/pages/auth/AdminLogin"))
const AdminSignup = lazy(() => import("@food/module/admin/pages/auth/AdminSignup"))
const AdminForgotPassword = lazy(() => import("@food/module/admin/pages/auth/AdminForgotPassword"))

// Delivery Module
const DeliveryRouter = lazy(() => import("@food/module/delivery/components/DeliveryRouter"))
const DeliverySignIn = lazy(() => import("@food/module/delivery/pages/auth/SignIn"))
const DeliverySignup = lazy(() => import("@food/module/delivery/pages/auth/Signup"))
const DeliveryOTP = lazy(() => import("@food/module/delivery/pages/auth/OTP"))
const DeliverySignupStep1 = lazy(() => import("@food/module/delivery/pages/auth/SignupStep1"))
const DeliverySignupStep2 = lazy(() => import("@food/module/delivery/pages/auth/SignupStep2"))
const DeliveryWelcome = lazy(() => import("@food/module/delivery/pages/auth/Welcome"))
const DeliveryTerms = lazy(() => import("@food/module/delivery/pages/TermsAndConditions"))
const DeliveryPrivacy = lazy(() => import("@food/module/delivery/pages/PrivacyPolicy"))

function UserPathRedirect() {
  const location = useLocation()
  const newPath = location.pathname.replace(/^\/user/, "") || "/"
  return <Navigate to={newPath} replace />
}

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RestaurantGlobalNotificationListenerInner() {
  useRestaurantNotifications()
  return null
}

function RestaurantGlobalNotificationListener() {
  const location = useLocation()
  const isRestaurantRoute =
    location.pathname.startsWith("/restaurant") &&
    !location.pathname.startsWith("/restaurants")
  const isRestaurantAuthRoute =
    location.pathname === "/restaurant/login" ||
    location.pathname === "/restaurant/auth/sign-in" ||
    location.pathname === "/restaurant/signup" ||
    location.pathname === "/restaurant/signup-email" ||
    location.pathname === "/restaurant/forgot-password" ||
    location.pathname === "/restaurant/otp" ||
    location.pathname === "/restaurant/welcome" ||
    location.pathname === "/restaurant/auth/google-callback"
  const isOrderManagedRoute =
    location.pathname === "/restaurant" ||
    location.pathname === "/restaurant/orders" ||
    location.pathname.startsWith("/restaurant/orders/")

  const shouldListen =
    isRestaurantRoute &&
    !isRestaurantAuthRoute &&
    !isOrderManagedRoute &&
    isModuleAuthenticated("restaurant")

  if (!shouldListen) {
    return null
  }

  return <RestaurantGlobalNotificationListenerInner />
}

export default function App() {
  const location = useLocation()

  useEffect(() => {
    registerWebPushForCurrentModule(location.pathname)
  }, [location.pathname])

  return (
    <>
      <ScrollToTop />
      <RestaurantGlobalNotificationListener />
      <PushSoundEnableButton />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/user" element={<Navigate to="/" replace />} />
          <Route path="/user/*" element={<UserPathRedirect />} />
          {/* Removed /routes route - Home should be accessed through UserRouter */}

          {/* Restaurant Public Routes */}
          <Route path="/restaurant/welcome" element={<AuthRedirect module="restaurant"><RestaurantWelcome /></AuthRedirect>} />
          <Route path="/restaurant/auth/sign-in" element={<AuthRedirect module="restaurant"><RestaurantLogin /></AuthRedirect>} />
          <Route path="/restaurant/login" element={<AuthRedirect module="restaurant"><RestaurantLogin /></AuthRedirect>} />
          <Route path="/restaurant/signup" element={<Navigate to="/restaurant/login" replace />} />
          <Route path="/restaurant/signup-email" element={<Navigate to="/restaurant/login" replace />} />
          <Route path="/restaurant/forgot-password" element={<AuthRedirect module="restaurant"><RestaurantForgotPassword /></AuthRedirect>} />
          <Route path="/restaurant/otp" element={<AuthRedirect module="restaurant"><RestaurantOTP /></AuthRedirect>} />
          <Route path="/restaurant/auth/google-callback" element={<Navigate to="/restaurant/login" replace />} />

          {/* Restaurant Protected Routes */}
          <Route
            path="/restaurant/onboarding"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <RestaurantOnboarding />
              </ProtectedRoute>
            }
          />


          <Route path="/usermain" element={<HomePage />} />
          <Route path="/usermain/categories" element={<CategoriesPage />} />
          <Route path="/usermain/category/:categoryName" element={<CategoryFoodsPage />} />
          <Route path="/usermain/food/:id" element={<FoodDetailPage />} />
          <Route path="/usermain/cart" element={<CartPage />} />
          <Route path="/usermain/checkout" element={<CheckoutPage />} />
          <Route path="/usermain/payment" element={<PaymentPage />} />
          <Route path="/usermain/orders" element={<OrdersPage />} />
          <Route path="/usermain/orders/:orderId" element={<OrderDetailsPage />} />
          <Route path="/usermain/wishlist" element={<WishlistPage />} />

          {/* Restaurant Protected Routes - Old Routes */}
          <Route
            path="/restaurant"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <OrdersMain />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/notifications"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <RestaurantNotifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/orders"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <RestaurantOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/orders/all"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <AllOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/orders/:orderId"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <OrderDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/details"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <RestaurantDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/edit"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <EditRestaurantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/food/all"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <AllFoodPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/food/:id"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <FoodDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/food/:id/edit"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <EditFoodPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/food/new"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <EditFoodPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/wallet"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <WalletPage />
              </ProtectedRoute>
            }
          />

          {/* Restaurant Protected Routes - Continued */}
          <Route
            path="/restaurant/advertisements"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <AdvertisementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/advertisements/new"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <NewAdvertisementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/advertisements/:id"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <AdDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/advertisements/:id/edit"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <EditAdvertisementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/coupon"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <CouponListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/coupon/new"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <AddCouponPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/coupon/:id/edit"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <EditCouponPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/reviews"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <ReviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/reviews/:id/reply"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <UpdateReplyPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/restaurant/settings"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/delivery-settings"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <DeliverySettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/rush-hour"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <RushHour />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/privacy"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <PrivacyPolicyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/terms"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <TermsAndConditionsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/restaurant/config"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <RestaurantConfigPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/categories"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <RestaurantCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/menu-categories"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <MenuCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/business-plan"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <BusinessPlanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/conversation"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <ConversationListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/conversation/:conversationId"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <ChatDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/status"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <RestaurantStatus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/explore"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <ExploreMore />
              </ProtectedRoute>
            }
          />

          <Route
            path="/restaurant/outlet-timings"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <OutletTimings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/outlet-timings/:day"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <DaySlots />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/outlet-info"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <OutletInfo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/ratings-reviews"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <RatingsReviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/contact-details"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <ContactDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/edit-owner"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <EditOwner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/invite-user"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <InviteUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/edit-cuisines"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <EditCuisines />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/edit-address"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <EditRestaurantAddress />
              </ProtectedRoute>
            }
          />

          <Route
            path="/restaurant/inventory"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <Inventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/feedback"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <Feedback />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/share-feedback"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <ShareFeedback />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/dish-ratings"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <DishRatings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/help-centre"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <HelpCentre />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/fssai"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <FssaiDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/fssai/update"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <FssaiUpdate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hyperpure"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <Hyperpure />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-growth"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <HubGrowth />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-growth/create-offers"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <CreateOffers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-growth/create-offers/delight-customers"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <ChooseMenuDiscountType />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-growth/create-offers/delight-customers/freebies"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <CreateFreebies />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-growth/create-offers/delight-customers/freebies/timings"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <FreebiesTiming />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-growth/create-offers/delight-customers/percentage"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <CreatePercentageMenuDiscount />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-growth/create-offers/delight-customers/percentage/timings"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <MenuDiscountTiming />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-growth/create-offers/delight-customers/flat-price"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <CreateFlatPriceMenuDiscount />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-growth/create-offers/delight-customers/flat-price/timings"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <MenuDiscountTiming />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-growth/create-offers/delight-customers/bogo"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <CreateBOGOMenuDiscount />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-growth/create-offers/delight-customers/bogo/timings"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <MenuDiscountTiming />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-growth/create-offers/:goalId/:discountType/create"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <CreatePercentageDiscount />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-growth/create-offers/:goalId"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <ChooseDiscountType />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-menu"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <HubMenu />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-menu/item/:id"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <ItemDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/hub-finance"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <HubFinance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/withdrawal-history"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <WithdrawalHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/finance-details"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <FinanceDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/phone"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <PhoneNumbersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/download-report"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <DownloadReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/to-hub"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <ToHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/manage-outlets"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <ManageOutlets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/update-bank-details"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <UpdateBankDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/reservations"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <DiningReservations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/zone-setup"
            element={
              <ProtectedRoute requiredRole="restaurant" loginPath="/restaurant/login">
                <ZoneSetup />
              </ProtectedRoute>
            }
          />
          {/* Delivery Public Routes */}
          <Route path="/delivery/sign-in" element={<AuthRedirect module="delivery"><DeliverySignIn /></AuthRedirect>} />
          <Route path="/delivery/signup" element={<Navigate to="/delivery/sign-in" replace />} />
          <Route path="/delivery/otp" element={<AuthRedirect module="delivery"><DeliveryOTP /></AuthRedirect>} />
          <Route path="/delivery/welcome" element={<AuthRedirect module="delivery"><DeliveryWelcome /></AuthRedirect>} />
          <Route path="/delivery/terms" element={<DeliveryTerms />} />
          <Route path="/delivery/privacy" element={<DeliveryPrivacy />} />

          {/* Delivery Signup Routes (Protected - require authentication) */}
          <Route
            path="/delivery/signup/details"
            element={
              <ProtectedRoute requiredRole="delivery" loginPath="/delivery/sign-in">
                <DeliverySignupStep1 />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery/signup/documents"
            element={
              <ProtectedRoute requiredRole="delivery" loginPath="/delivery/sign-in">
                <DeliverySignupStep2 />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery/onboarding"
            element={
              <ProtectedRoute requiredRole="delivery" loginPath="/delivery/sign-in">
                <DeliverySignupStep1 />
              </ProtectedRoute>
            }
          />

          {/* Delivery Protected Routes */}
          <Route
            path="/delivery/*"
            element={
              <ProtectedRoute requiredRole="delivery" loginPath="/delivery/sign-in">
                <DeliveryRouter />
              </ProtectedRoute>
            }
          />

          {/* Admin Public Routes */}
          <Route path="/admin/login" element={<AuthRedirect module="admin"><AdminLogin /></AuthRedirect>} />
          <Route path="/admin/signup" element={<AuthRedirect module="admin"><AdminSignup /></AuthRedirect>} />
          <Route path="/admin/forgot-password" element={<AuthRedirect module="admin"><AdminForgotPassword /></AuthRedirect>} />

          {/* Admin Protected Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requiredRole="admin" loginPath="/admin/login">
                <AdminRouter />
              </ProtectedRoute>
            }
          />

          <Route
            path="/*"
            element={<UserRouter />}
          />
        </Routes>
      </Suspense>
    </>
  )
}
