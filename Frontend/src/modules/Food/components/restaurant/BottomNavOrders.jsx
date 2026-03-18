import { useNavigate, useLocation } from "react-router-dom"
import { useMemo } from "react"
import { motion } from "framer-motion"
import {
  FileText,
  Package,
  MessageSquare,
  Compass,
  TrendingUp,
  Utensils,
  Wallet,
  ArrowRightLeft,
  Building2,
} from "lucide-react"

const getOrdersTabs = (basePath = "/restaurant") => [
  { id: "orders", label: "Orders", icon: FileText, route: `${basePath}` },
  { id: "inventory", label: "Inventory", icon: Package, route: `${basePath}/inventory` },
  { id: "feedback", label: "Feedback", icon: MessageSquare, route: `${basePath}/feedback` },
  { id: "explore", label: "Explore", icon: Compass, route: `${basePath}/explore` },
]

const getHubTabs = (basePath = "/restaurant") => [
  { id: "hub", label: "Hub", icon: Building2, route: `${basePath}/to-hub` },
  { id: "growth", label: "Growth", icon: TrendingUp, route: `${basePath}/hub-growth` },
  { id: "menu", label: "Menu", icon: Utensils, route: `${basePath}/hub-menu` },
  { id: "finance", label: "Finance", icon: Wallet, route: `${basePath}/hub-finance` },
]

const findActiveTab = (tabs, pathname) =>
  tabs
    .slice()
    .sort((a, b) => b.route.length - a.route.length)
    .find((tab) => pathname === tab.route || pathname.startsWith(tab.route + "/"))

export default function BottomNavOrders() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // The restaurant module is mounted under /food/restaurant in this app.
  // Some legacy paths (or redirects) may use /restaurant, so treat those as /food/restaurant too.
  const basePath = pathname.startsWith("/food/restaurant")
    ? "/food/restaurant"
    : pathname.startsWith("/restaurant")
    ? "/food/restaurant"
    : "/restaurant"

  const ordersTabs = useMemo(() => getOrdersTabs(basePath), [basePath])
  const hubTabs = useMemo(() => getHubTabs(basePath), [basePath])

  const isInternalPage = pathname.includes("/create-offers")
  if (isInternalPage) {
    return null
  }

  const isHubMode = useMemo(() => {
    return pathname.startsWith(`${basePath}/hub`) || pathname.startsWith(`${basePath}/to-hub`)
  }, [pathname, basePath])

  const tabs = useMemo(() => {
    return isHubMode ? hubTabs : ordersTabs
  }, [isHubMode, hubTabs, ordersTabs])

  const activeTab = useMemo(() => {
    const match = findActiveTab(tabs, pathname)
    return match?.id || (isHubMode ? "hub" : "orders")
  }, [tabs, pathname, isHubMode])

  const handleTabClick = (tab) => {
    if (tab.route && tab.route !== pathname) {
      navigate(tab.route)
    }
  }

  const handleToggleMode = () => {
    const targetRoute = isHubMode ? basePath : `${basePath}/to-hub`
    navigate(targetRoute)
  }

  const railPaddingClass = isHubMode ? "pl-2 pr-3" : "pl-3 pr-2"

  return (
    <div className="sticky bottom-0 z-40 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-md items-end gap-2">
        {isHubMode && (
          <button
            onClick={handleToggleMode}
            className="flex min-w-[78px] flex-col items-center justify-center gap-1 rounded-[22px] bg-black px-3 py-3 text-white shadow-[0_12px_28px_rgba(0,0,0,0.28)] active:scale-95"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span className="text-[11px]">To Orders</span>
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div
            className={`relative overflow-visible rounded-[30px] bg-black py-2 shadow-[0_16px_40px_rgba(0,0,0,0.28)] ${railPaddingClass}`}
          >
            <div className="relative flex items-end justify-around gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id

                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => handleTabClick(tab)}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-visible rounded-full px-2 py-2`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="bottomNavActive"
                        className="absolute inset-0 -z-10 rounded-full bg-white/16"
                        initial={false}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}

                    <Icon
                      className={`relative z-10 h-[18px] w-[18px] transition-colors duration-300 ease-in-out ${
                        isActive ? "text-white" : "text-white/78"
                      }`}
                    />

                    <span
                      className={`relative z-10 whitespace-nowrap text-[11px] leading-none transition-colors duration-300 ease-in-out ${
                        isActive ? "text-white" : "text-white/78"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>

        {!isHubMode && (
          <button
            onClick={handleToggleMode}
            className="flex min-w-[78px] flex-col items-center justify-center gap-1 rounded-[22px] bg-black px-3 py-3 text-white shadow-[0_12px_28px_rgba(0,0,0,0.28)] active:scale-95"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span className="text-[11px]">To Hub</span>
          </button>
        )}
      </div>
    </div>
  )
}
