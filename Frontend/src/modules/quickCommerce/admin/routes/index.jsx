import React, { Suspense } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import DashboardLayout from "@shared/layout/DashboardLayout"
import { AuthProvider } from "@core/context/AuthContext"
import { SettingsProvider } from "@core/context/SettingsContext"
import { ToastProvider } from "@shared/components/ui/Toast"
import {
  LayoutDashboard,
  Tag,
  Box,
  Building2,
  Truck,
  Wallet,
  Banknote,
  Receipt,
  CircleDollarSign,
  Users,
  HelpCircle,
  ClipboardList,
  RotateCcw,
  Settings,
  Terminal,
  Sparkles,
  User,
  MapPinned,
} from "lucide-react"
import Loader from "@food/components/Loader"

const Dashboard = React.lazy(() => import("../pages/Dashboard"))
const HeaderCategories = React.lazy(() => import("../pages/categories/HeaderCategories"))
const Level2Categories = React.lazy(() => import("../pages/categories/Level2Categories"))
const SubCategories = React.lazy(() => import("../pages/categories/SubCategories"))
const CategoryHierarchy = React.lazy(() => import("../pages/categories/CategoryHierarchy"))
const ProductManagement = React.lazy(() => import("../pages/ProductManagement"))
const ActiveSellers = React.lazy(() => import("../pages/ActiveSellers"))
const PendingSellers = React.lazy(() => import("../pages/PendingSellers"))
const SellerLocations = React.lazy(() => import("../pages/SellerLocations"))
const ActiveDeliveryBoys = React.lazy(() => import("../pages/ActiveDeliveryBoys"))
const PendingDeliveryBoys = React.lazy(() => import("../pages/PendingDeliveryBoys"))
const DeliveryFunds = React.lazy(() => import("../pages/DeliveryFunds"))
const AdminWallet = React.lazy(() => import("../pages/AdminWallet"))
const WithdrawalRequests = React.lazy(() => import("../pages/WithdrawalRequests"))
const SellerTransactions = React.lazy(() => import("../pages/SellerTransactions"))
const CashCollection = React.lazy(() => import("../pages/CashCollection"))
const CustomerManagement = React.lazy(() => import("../pages/CustomerManagement"))
const CustomerDetail = React.lazy(() => import("../pages/CustomerDetail"))
const FAQManagement = React.lazy(() => import("../pages/FAQManagement"))
const OrdersList = React.lazy(() => import("../pages/OrdersList"))
const OrderDetail = React.lazy(() => import("../pages/OrderDetail"))
const SellerDetail = React.lazy(() => import("../pages/SellerDetail"))
const SupportTickets = React.lazy(() => import("../pages/SupportTickets"))
const ReviewModeration = React.lazy(() => import("../pages/ReviewModeration"))
const FleetTracking = React.lazy(() => import("../pages/FleetTracking"))
const CouponManagement = React.lazy(() => import("../pages/CouponManagement"))
const ContentManager = React.lazy(() => import("../pages/ContentManager"))
const HeroCategoriesPerPage = React.lazy(() => import("../pages/HeroCategoriesPerPage"))
const NotificationComposer = React.lazy(() => import("../pages/NotificationComposer"))
const OfferSectionsManagement = React.lazy(() => import("../pages/OfferSectionsManagement"))
const ShopByStoreManagement = React.lazy(() => import("../pages/ShopByStoreManagement"))
const AdminSettings = React.lazy(() => import("../pages/AdminSettings"))
const EnvSettings = React.lazy(() => import("../pages/EnvSettings"))
const AdminProfile = React.lazy(() => import("../pages/AdminProfile"))
const BillingCharges = React.lazy(() => import("../pages/BillingCharges"))
const QuickZoneSetup = React.lazy(() => import("../pages/ZoneSetup"))
const QuickAddZone = React.lazy(() => import("../pages/AddZone"))
const QuickViewZone = React.lazy(() => import("../pages/ViewZone"))

const navItems = [
  { label: "Dashboard", path: "/admin/quick-commerce", icon: LayoutDashboard, color: "indigo", end: true },
  { label: "Seller Requests", path: "/admin/quick-commerce/seller-requests", icon: Building2, color: "amber" },
  {
    label: "Categories",
    icon: Tag,
    color: "rose",
    children: [
      { label: "All Categories", path: "/admin/quick-commerce/categories/hierarchy" },
      { label: "Header Categories", path: "/admin/quick-commerce/categories/header" },
      { label: "Main Categories", path: "/admin/quick-commerce/categories/level2" },
      { label: "Sub-Categories", path: "/admin/quick-commerce/categories/sub" },
    ],
  },
  { label: "Products", path: "/admin/quick-commerce/products", icon: Box, color: "amber" },
  { label: "Zone Setup", path: "/admin/quick-commerce/zone-setup", icon: MapPinned, color: "emerald" },
  {
    label: "Marketing Tools",
    icon: Sparkles,
    color: "amber",
    children: [
      { label: "Content Manager", path: "/admin/quick-commerce/experience-studio" },
      { label: "Hero & categories per page", path: "/admin/quick-commerce/hero-categories" },
      { label: "Send Notifications", path: "/admin/quick-commerce/notifications" },
      { label: "Coupons & Promos", path: "/admin/quick-commerce/coupons" },
      { label: "Offer Sections", path: "/admin/quick-commerce/offer-sections" },
      { label: "Shop by Store", path: "/admin/quick-commerce/shop-by-store" },
    ],
  },
  {
    label: "Customer Support",
    icon: Receipt,
    color: "emerald",
    children: [
      { label: "Help Tickets", path: "/admin/quick-commerce/support-tickets" },
      { label: "Review Content", path: "/admin/quick-commerce/moderation" },
    ],
  },
  {
    label: "Sellers",
    icon: Building2,
    color: "blue",
    children: [
      { label: "Active Sellers", path: "/admin/quick-commerce/sellers/active" },
      { label: "Waiting for Review", path: "/admin/quick-commerce/sellers/pending" },
      { label: "Seller Locations", path: "/admin/quick-commerce/seller-locations" },
    ],
  },
  {
    label: "Delivery Drivers",
    icon: Truck,
    color: "emerald",
    children: [
      { label: "Active Drivers", path: "/admin/quick-commerce/delivery-boys/active" },
      { label: "Waiting for Review", path: "/admin/quick-commerce/delivery-boys/pending" },
      { label: "Track Drivers", path: "/admin/quick-commerce/tracking" },
      { label: "Send Money", path: "/admin/quick-commerce/delivery-funds" },
    ],
  },
  { label: "Wallet", path: "/admin/quick-commerce/wallet", icon: Wallet, color: "violet" },
  { label: "Money Requests", path: "/admin/quick-commerce/withdrawals", icon: Banknote, color: "cyan" },
  { label: "Seller Payments", path: "/admin/quick-commerce/seller-transactions", icon: Receipt, color: "orange" },
  { label: "Collect Cash", path: "/admin/quick-commerce/cash-collection", icon: CircleDollarSign, color: "green" },
  { label: "Customers", path: "/admin/quick-commerce/customers", icon: Users, color: "sky" },
  { label: "FAQs", path: "/admin/quick-commerce/faqs", icon: HelpCircle, color: "pink" },
  {
    label: "Orders",
    icon: ClipboardList,
    color: "fuchsia",
    children: [
      { label: "All Orders", path: "/admin/quick-commerce/orders/all" },
      { label: "New Orders", path: "/admin/quick-commerce/orders/pending" },
      { label: "Being Prepared", path: "/admin/quick-commerce/orders/processed" },
      { label: "On the Way", path: "/admin/quick-commerce/orders/out-for-delivery" },
      { label: "Delivered", path: "/admin/quick-commerce/orders/delivered" },
      { label: "Cancelled", path: "/admin/quick-commerce/orders/cancelled" },
      { label: "Returned", path: "/admin/quick-commerce/orders/returned" },
    ],
  },
  { label: "Fees & Charges", path: "/admin/quick-commerce/billing", icon: RotateCcw, color: "red" },
  { label: "Settings", path: "/admin/quick-commerce/settings", icon: Settings, color: "slate" },
  { label: "My Profile", path: "/admin/quick-commerce/profile", icon: User, color: "indigo" },
  { label: "System Settings", path: "/admin/quick-commerce/env", icon: Terminal, color: "dark" },
]

function QuickCommerceAdminRoutesInner() {
  return (
    <DashboardLayout navItems={navItems} title="Admin Center">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<AdminProfile />} />
        <Route path="/categories" element={<Navigate to="/admin/quick-commerce/categories/header" replace />} />
        <Route path="/categories/header" element={<HeaderCategories />} />
        <Route path="/categories/level2" element={<Level2Categories />} />
        <Route path="/categories/sub" element={<SubCategories />} />
        <Route path="/categories/hierarchy" element={<CategoryHierarchy />} />
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/zone-setup" element={<QuickZoneSetup />} />
        <Route path="/zone-setup/add" element={<QuickAddZone />} />
        <Route path="/zone-setup/edit/:id" element={<QuickAddZone />} />
        <Route path="/zone-setup/view/:id" element={<QuickViewZone />} />
        <Route path="/seller-requests" element={<PendingSellers />} />
        <Route path="/sellers/active" element={<ActiveSellers />} />
        <Route path="/sellers/active/:id" element={<SellerDetail />} />
        <Route path="/support-tickets" element={<SupportTickets />} />
        <Route path="/moderation" element={<ReviewModeration />} />
        <Route path="/experience-studio" element={<ContentManager />} />
        <Route path="/hero-categories" element={<HeroCategoriesPerPage />} />
        <Route path="/notifications" element={<NotificationComposer />} />
        <Route path="/offer-sections" element={<OfferSectionsManagement />} />
        <Route path="/shop-by-store" element={<ShopByStoreManagement />} />
        <Route path="/coupons" element={<CouponManagement />} />
        <Route path="/sellers/pending" element={<PendingSellers />} />
        <Route path="/seller-locations" element={<SellerLocations />} />
        <Route path="/delivery-boys/active" element={<ActiveDeliveryBoys />} />
        <Route path="/delivery-boys/pending" element={<PendingDeliveryBoys />} />
        <Route path="/tracking" element={<FleetTracking />} />
        <Route path="/delivery-funds" element={<DeliveryFunds />} />
        <Route path="/wallet" element={<AdminWallet />} />
        <Route path="/withdrawals" element={<WithdrawalRequests />} />
        <Route path="/seller-transactions" element={<SellerTransactions />} />
        <Route path="/cash-collection" element={<CashCollection />} />
        <Route path="/customers" element={<CustomerManagement />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/faqs" element={<FAQManagement />} />
        <Route path="/orders/:status" element={<OrdersList />} />
        <Route path="/orders/view/:orderId" element={<OrderDetail />} />
        <Route path="/billing" element={<BillingCharges />} />
        <Route path="/settings" element={<AdminSettings />} />
        <Route path="/env" element={<EnvSettings />} />
        <Route path="*" element={<Navigate to="/admin/quick-commerce" replace />} />
      </Routes>
    </DashboardLayout>
  )
}

export default function QuickCommerceAdminRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
            <QuickCommerceAdminRoutesInner />
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </Suspense>
  )
}
