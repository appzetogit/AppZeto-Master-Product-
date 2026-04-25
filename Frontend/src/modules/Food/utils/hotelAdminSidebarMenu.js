export const hotelAdminSidebarMenu = [
  {
    type: "link",
    label: "Dashboard",
    path: "/hotel/admin/dashboard",
    icon: "LayoutDashboard",
  },
  {
    type: "section",
    label: "HOTEL MANAGEMENT",
    items: [
      { type: "link", label: "User Management", path: "/hotel/admin/users", icon: "Users" },
      { type: "link", label: "Partner Management", path: "/hotel/admin/partners", icon: "Building2" },
      { type: "link", label: "Property Management", path: "/hotel/admin/properties", icon: "Home" },
      { type: "link", label: "Bookings", path: "/hotel/admin/bookings", icon: "Calendar" },
      { type: "link", label: "Notifications", path: "/hotel/admin/notifications", icon: "Bell" },
      { type: "link", label: "Finance & Payouts", path: "/hotel/admin/finance", icon: "Wallet" },
      { type: "link", label: "Offers & Coupons", path: "/hotel/admin/offers", icon: "Tag" },
      { type: "link", label: "Legal & Content", path: "/hotel/admin/legal", icon: "FileText" },
      { type: "link", label: "Contact Messages", path: "/hotel/admin/contact-messages", icon: "MessageSquare" },
      { type: "link", label: "FAQs", path: "/hotel/admin/faqs", icon: "CircleHelp" },
      { type: "link", label: "Settings", path: "/hotel/admin/settings", icon: "Settings" },
    ],
  },
]
