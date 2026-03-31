import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Bell, CheckCircle2, Clock, Tag, Gift, AlertCircle, Trash2, X } from "lucide-react"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Button } from "@food/components/ui/button"
import { Card, CardContent } from "@food/components/ui/card"
import { Badge } from "@food/components/ui/badge"

// Initial mock notification data (fallback if localStorage is empty)
const DEFAULT_NOTIFICATIONS = [
  {
    id: "1",
    type: "order",
    title: "Order Confirmed",
    message: "Your order #12345 has been confirmed and is being prepared",
    time: "2 minutes ago",
    timestamp: Date.now() - 120000,
    read: false,
    icon: "CheckCircle2",
    iconColor: "text-[#EB590E]"
  },
  {
    id: "2",
    type: "offer",
    title: "Special Offer",
    message: "Get 50% off on your next order above ₹500",
    time: "1 hour ago",
    timestamp: Date.now() - 3600000,
    read: false,
    icon: "Tag",
    iconColor: "text-[#EB590E]"
  }
]

// Icon mapping for dynamic icons
const ICON_MAP = {
  CheckCircle2,
  Tag,
  Gift,
  AlertCircle
}

export default function Notifications() {
  const [notificationsList, setNotificationsList] = useState(() => {
    const saved = localStorage.getItem('food_user_notifications')
    return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATIONS
  })

  // Persistence: Save to localStorage whenever list updates
  useEffect(() => {
    localStorage.setItem('food_user_notifications', JSON.stringify(notificationsList))
    // Also dispatch an event to update other components (like navbar badge)
    window.dispatchEvent(new CustomEvent('notificationsUpdated', { detail: { count: notificationsList.filter(n => !n.read).length } }))
  }, [notificationsList])

  // Real-time: Listen for status updates from useUserNotifications hook
  useEffect(() => {
    const handleOrderUpdate = (event) => {
      const { orderId, status, message, title } = event.detail
      const isCancelled = String(status || "").toLowerCase().includes('cancel')
      
      const newNotification = {
        id: `order-${Date.now()}`,
        type: isCancelled ? "alert" : "order",
        title: title || `Order #${orderId} ${status}`,
        message: message || `Your order status is now ${status}`,
        time: "Just now",
        timestamp: Date.now(),
        read: false,
        icon: isCancelled ? "AlertCircle" : "CheckCircle2",
        iconColor: isCancelled ? "text-red-600" : "text-[#EB590E]"
      }
      setNotificationsList(prev => [newNotification, ...prev])
    }

    const handleDeliveryOtp = (event) => {
      const { orderId, otp, message } = event.detail
      const newNotification = {
        id: `otp-${Date.now()}`,
        type: "alert",
        title: "Delivery OTP Received",
        message: message || `Your OTP for order #${orderId} is ${otp}`,
        time: "Just now",
        timestamp: Date.now(),
        read: false,
        icon: "AlertCircle",
        iconColor: "text-orange-600"
      }
      setNotificationsList(prev => [newNotification, ...prev])
    }

    window.addEventListener('orderStatusNotification', handleOrderUpdate)
    window.addEventListener('deliveryDropOtp', handleDeliveryOtp)

    return () => {
      window.removeEventListener('orderStatusNotification', handleOrderUpdate)
      window.removeEventListener('deliveryDropOtp', handleDeliveryOtp)
    }
  }, [])
  
  const unreadCount = notificationsList.filter(n => !n.read).length

  const handleMarkAsRead = (id) => {
    setNotificationsList(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const handleClearAll = () => {
    setNotificationsList([])
  }

  const handleDeleteOne = (id) => {
    setNotificationsList((prev) => prev.filter((notification) => notification.id !== id))
  }

  return (
    <AnimatedPage className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4 md:mb-6 lg:mb-8">
          <Link to="/user">
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-[#EB590E] fill-[#EB590E]" />
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-[#EB590E] text-white text-xs md:text-sm">
                {unreadCount}
              </Badge>
            )}
          </div>
          {notificationsList.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearAll}
              className="text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1.5 px-2 md:px-3"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-xs md:text-sm font-medium">Clear All</span>
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3 md:space-y-4">
          {notificationsList.map((notification) => {
            const Icon = ICON_MAP[notification.icon] || Bell
            return (
              <Card
                key={notification.id}
                onClick={() => handleMarkAsRead(notification.id)}
                className={`relative cursor-pointer transition-all duration-200 py-1 hover:shadow-md ${!notification.read ? "bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
              >
                {/* Unread Dot - Top Right */}
                {!notification.read && (
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 md:w-3 md:h-3 bg-[#EB590E] rounded-full" />
                )}

                <CardContent className="p-3 md:p-4 lg:p-5">
                  <div className="flex items-start gap-3 sm:gap-4 md:gap-5">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center ${notification.type === "order" ? "bg-green-100 dark:bg-green-900/40" :
                        notification.type === "offer" ? "bg-red-100 dark:bg-red-900/40" :
                          notification.type === "promotion" ? "bg-blue-100 dark:bg-blue-900/40" :
                            "bg-orange-100 dark:bg-orange-900/40"
                      }`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 ${notification.iconColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1 md:mb-2">
                        <h3 className={`text-sm sm:text-base md:text-lg font-semibold ${!notification.read ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                          }`}>
                          {notification.title}
                        </h3>
                        <button
                          type="button"
                          aria-label="Delete notification"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteOne(notification.id)
                          }}
                          className="flex-shrink-0 rounded-full p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mb-2 md:mb-3 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3 md:h-4 md:w-4" />
                        <span>{notification.time}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Empty State (if no notifications) */}
        {notificationsList.length === 0 && (
          <div className="text-center py-12 md:py-16 lg:py-20">
            <Bell className="h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 text-gray-300 dark:text-gray-600 mx-auto mb-4 md:mb-5 lg:mb-6" />
            <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2 md:mb-3">No notifications</h3>
            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">You're all caught up!</p>
          </div>
        )}
      </div>
    </AnimatedPage>
  )
}

