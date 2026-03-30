import { useParams, Link, useSearchParams } from "react-router-dom"
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  ArrowLeft,
  Share2,
  RefreshCw,
  Phone,
  User,
  ChevronRight,
  MapPin,
  Home as HomeIcon,
  MessageSquare,
  X,
  Check,
  Shield,
  Receipt,
  CircleSlash,
  Loader2
} from "lucide-react"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Card, CardContent } from "@food/components/ui/card"
import { Button } from "@food/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@food/components/ui/dialog"
import { Textarea } from "@food/components/ui/textarea"
import { useOrders } from "@food/context/OrdersContext"
import { useProfile } from "@food/context/ProfileContext"
import { useLocation as useUserLocation } from "@food/hooks/useLocation"
import DeliveryTrackingMap from "@food/components/user/DeliveryTrackingMap"
import { orderAPI, restaurantAPI } from "@food/api"
import { useCompanyName } from "@food/hooks/useCompanyName"
import circleIcon from "@food/assets/circleicon.png"
import { RESTAURANT_PIN_SVG, CUSTOMER_PIN_SVG, RIDER_BIKE_SVG } from "@food/constants/mapIcons"

// Fallback definitions in case imports fail at runtime or are shadowed
const DEFAULT_CUSTOMER_PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#10B981"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/><circle cx="12" cy="9" r="3" fill="#FFFFFF"/></svg>`;
const SAFE_CUSTOMER_PIN = typeof CUSTOMER_PIN_SVG !== 'undefined' ? CUSTOMER_PIN_SVG : DEFAULT_CUSTOMER_PIN;
const DEFAULT_RESTAURANT_PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#FF6B35"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/><circle cx="12" cy="9" r="3" fill="#FFFFFF"/></svg>`;
const SAFE_RESTAURANT_PIN = typeof RESTAURANT_PIN_SVG !== 'undefined' ? RESTAURANT_PIN_SVG : DEFAULT_RESTAURANT_PIN;

const debugLog = (...args) => console.log('[OrderTracking]', ...args)
const debugWarn = (...args) => console.warn('[OrderTracking]', ...args)
const debugError = (...args) => console.error('[OrderTracking]', ...args)


// Animated checkmark component
const AnimatedCheckmark = ({ delay = 0 }) => (
  <motion.svg
    width="80"
    height="80"
    viewBox="0 0 80 80"
    initial="hidden"
    animate="visible"
    className="mx-auto"
  >
    <motion.circle
      cx="40"
      cy="40"
      r="36"
      fill="none"
      stroke="#22c55e"
      strokeWidth="4"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    />
    <motion.path
      d="M24 40 L35 51 L56 30"
      fill="none"
      stroke="#22c55e"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.4, delay: delay + 0.4, ease: "easeOut" }}
    />
  </motion.svg>
)

// Real Delivery Map Component with User Live Location
const DeliveryMap = ({ orderId, order, isVisible, fallbackCustomerCoords = null, userLiveCoords = null, userLocationAccuracy = null, onEtaUpdate = null }) => {
  const toPointFromGeoJSON = (coords) => {
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  };

  // Get coordinates from order payload (actual saved locations)
  const getRestaurantCoords = () => {
    debugLog('?? Getting restaurant coordinates from order:', {
      hasOrder: !!order,
      restaurantLocation: order?.restaurantLocation,
      coordinates: order?.restaurantLocation?.coordinates,
      restaurantId: order?.restaurantId,
      restaurantIdLocation: order?.restaurantId?.location,
      restaurantIdCoordinates: order?.restaurantId?.location?.coordinates
    });

    // Try multiple sources for restaurant coordinates
    let coords = null;

    // Priority 1: restaurantLocation.coordinates (already extracted in transformed order)
    if (order?.restaurantLocation?.coordinates &&
      Array.isArray(order.restaurantLocation.coordinates) &&
      order.restaurantLocation.coordinates.length >= 2) {
      coords = order.restaurantLocation.coordinates;
      debugLog('? Using restaurantLocation.coordinates:', coords);
    }
    // Priority 2: restaurantId.location.coordinates (if restaurantId is populated)
    else if (order?.restaurantId?.location?.coordinates &&
      Array.isArray(order.restaurantId.location.coordinates) &&
      order.restaurantId.location.coordinates.length >= 2) {
      coords = order.restaurantId.location.coordinates;
      debugLog('? Using restaurantId.location.coordinates:', coords);
    }
    // Priority 3: restaurantId.location with latitude/longitude
    else if (order?.restaurantId?.location?.latitude && order?.restaurantId?.location?.longitude) {
      coords = [order.restaurantId.location.longitude, order.restaurantId.location.latitude];
      debugLog('? Using restaurantId.location (lat/lng):', coords);
    }

    const fromCoords = toPointFromGeoJSON(coords);
    if (fromCoords) {
      const result = fromCoords;
      debugLog('? Final restaurant coordinates (lat, lng):', result, 'from GeoJSON:', coords);
      return result;
    }

    const fallbackLat = Number(order?.restaurantId?.location?.latitude || order?.restaurant?.location?.latitude);
    const fallbackLng = Number(order?.restaurantId?.location?.longitude || order?.restaurant?.location?.longitude);
    if (Number.isFinite(fallbackLat) && Number.isFinite(fallbackLng)) {
      return { lat: fallbackLat, lng: fallbackLng };
    }

    debugWarn('?? Restaurant coordinates not found in order payload');
    return null;
  };

  const getCustomerCoords = () => {
    const coords = order?.address?.coordinates || order?.address?.location?.coordinates;
    const fromCoords = toPointFromGeoJSON(coords);
    if (fromCoords) return fromCoords;

    if (
      fallbackCustomerCoords &&
      Number.isFinite(fallbackCustomerCoords.lat) &&
      Number.isFinite(fallbackCustomerCoords.lng)
    ) {
      return fallbackCustomerCoords;
    }

    return null;
  };

  const restaurantCoords = getRestaurantCoords();
  const customerCoords = getCustomerCoords();

  debugLog('?? Parents passing coordinates to map:', { restaurantCoords, customerCoords, orderId: order?._id });

  // Delivery boy data
  const deliveryBoyData = order?.deliveryPartner ? {
    name: order.deliveryPartner.name || 'Delivery Partner',
    avatar: order.deliveryPartner.avatar || null
  } : null;

  if (!isVisible || !orderId || !order || !restaurantCoords || !customerCoords) {
    return (
      <motion.div
        className="relative min-h-[450px] bg-gradient-to-b from-gray-100 to-gray-200"
        style={{ height: '450px' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
    );
  }

  // Firebase and backend write tracking under order.orderId (string) or mongoId; subscribe to all so we receive updates
  const orderTrackingIdsList = useMemo(() => [
    order?.orderId,
    order?.mongoId,
    order?._id,
    orderId,
    order?.id
  ].filter(Boolean), [order?.orderId, order?.mongoId, order?._id, orderId, order?.id]);

  return (
    <motion.div
      className="relative w-full min-h-[450px] overflow-visible"
      style={{ height: '450px' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DeliveryTrackingMap
        orderId={orderId}
        orderTrackingIds={orderTrackingIdsList}
        restaurantCoords={restaurantCoords}
        customerCoords={customerCoords}

        userLiveCoords={userLiveCoords}
        userLocationAccuracy={userLocationAccuracy}
        deliveryBoyData={deliveryBoyData}
        order={order}
        onEtaUpdate={onEtaUpdate}
      />
    </motion.div>
  );
}

// Section item component - icon container uses overflow-visible so icons are not cut
const SectionItem = ({ icon: Icon, iconNode, title, subtitle, onClick, showArrow = true, rightContent }) => (
  <motion.button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b border-dashed border-gray-200 last:border-0"
    whileTap={{ scale: 0.99 }}
  >
    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-visible">
      {iconNode ? (
        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
          {iconNode}
        </div>
      ) : (
        <Icon className="w-5 h-5 text-gray-600 flex-shrink-0" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 truncate">{title}</p>
      {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
    </div>
    {rightContent || (showArrow && <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />)}
  </motion.button>
)

const getRestaurantCoordsFromOrder = (apiOrder, fallback = null) => {
  if (
    apiOrder?.restaurantId?.location?.coordinates &&
    Array.isArray(apiOrder.restaurantId.location.coordinates) &&
    apiOrder.restaurantId.location.coordinates.length >= 2
  ) {
    return apiOrder.restaurantId.location.coordinates
  }
  if (apiOrder?.restaurantId?.location?.latitude && apiOrder?.restaurantId?.location?.longitude) {
    return [apiOrder.restaurantId.location.longitude, apiOrder.restaurantId.location.latitude]
  }
  if (
    apiOrder?.restaurant?.location?.coordinates &&
    Array.isArray(apiOrder.restaurant.location.coordinates) &&
    apiOrder.restaurant.location.coordinates.length >= 2
  ) {
    return apiOrder.restaurant.location.coordinates
  }
  return fallback || null
}

const getRestaurantAddressFromOrder = (apiOrder, previousOrder = null, explicitRestaurantAddress = null) => {
  if (explicitRestaurantAddress && String(explicitRestaurantAddress).trim()) {
    return String(explicitRestaurantAddress).trim()
  }

  const location = apiOrder?.restaurantId?.location || apiOrder?.restaurant?.location || {}

  if (location?.formattedAddress && String(location.formattedAddress).trim()) {
    return String(location.formattedAddress).trim()
  }
  if (location?.address && String(location.address).trim()) {
    return String(location.address).trim()
  }
  if (location?.addressLine1 && String(location.addressLine1).trim()) {
    return String(location.addressLine1).trim()
  }

  const parts = [location?.street, location?.area, location?.city, location?.state, location?.zipCode]
    .map((value) => (value == null ? '' : String(value).trim()))
    .filter(Boolean)

  if (parts.length > 0) return parts.join(', ')

  return previousOrder?.restaurantAddress || apiOrder?.restaurantAddress || apiOrder?.restaurant?.address || 'Restaurant location'
}

const getCustomerCoordsFromApiOrder = (apiOrder, previousOrder = null) => {
  const addr = apiOrder?.address || apiOrder?.deliveryAddress || {}
  const fromLoc = addr?.location?.coordinates
  if (Array.isArray(fromLoc) && fromLoc.length >= 2) return fromLoc
  const flat = addr?.coordinates
  if (Array.isArray(flat) && flat.length >= 2) return flat
  const prev = previousOrder?.address?.coordinates || previousOrder?.address?.location?.coordinates
  if (Array.isArray(prev) && prev.length >= 2) return prev
  return null
}

const transformOrderForTracking = (apiOrder, previousOrder = null, explicitRestaurantCoords = null, explicitRestaurantAddress = null) => {
  const restaurantCoords = explicitRestaurantCoords || getRestaurantCoordsFromOrder(apiOrder, previousOrder?.restaurantLocation?.coordinates)
  const restaurantAddress = getRestaurantAddressFromOrder(apiOrder, previousOrder, explicitRestaurantAddress)
  // API returns `deliveryAddress`; some paths use `address`
  const addr = apiOrder?.address || apiOrder?.deliveryAddress || {}
  const customerCoordsResolved = getCustomerCoordsFromApiOrder(apiOrder, previousOrder)

  return {
    id: apiOrder?.orderId || apiOrder?._id,
    mongoId: apiOrder?._id || null,
    orderId: apiOrder?.orderId || apiOrder?._id,
    restaurant: apiOrder?.restaurantName || previousOrder?.restaurant || 'Restaurant',
    restaurantPhone:
      apiOrder?.restaurantPhone ||
      apiOrder?.restaurantId?.phone ||
      apiOrder?.restaurantId?.ownerPhone ||
      apiOrder?.restaurant?.phone ||
      apiOrder?.restaurant?.ownerPhone ||
      previousOrder?.restaurantPhone ||
      '',
    restaurantAddress,
    restaurantId: apiOrder?.restaurantId || previousOrder?.restaurantId || null,
    userId: apiOrder?.userId || previousOrder?.userId || null,
    userName: apiOrder?.userName || apiOrder?.userId?.name || apiOrder?.userId?.fullName || previousOrder?.userName || '',
    userPhone: apiOrder?.userPhone || apiOrder?.userId?.phone || previousOrder?.userPhone || '',
    address: {
      street: addr?.street || previousOrder?.address?.street || '',
      city: addr?.city || previousOrder?.address?.city || '',
      state: addr?.state || previousOrder?.address?.state || '',
      zipCode: addr?.zipCode || previousOrder?.address?.zipCode || '',
      additionalDetails: addr?.additionalDetails || previousOrder?.address?.additionalDetails || '',
      formattedAddress: addr?.formattedAddress ||
        (addr?.street && addr?.city
          ? `${addr.street}${addr.additionalDetails ? `, ${addr.additionalDetails}` : ''}, ${addr.city}${addr.state ? `, ${addr.state}` : ''}${addr.zipCode ? ` ${addr.zipCode}` : ''}`
          : previousOrder?.address?.formattedAddress || addr?.city || ''),
      coordinates: customerCoordsResolved || addr?.location?.coordinates || previousOrder?.address?.coordinates || null
    },
    restaurantLocation: {
      coordinates: restaurantCoords
    },
    items: apiOrder?.items?.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price
    })) || previousOrder?.items || [],
    total: apiOrder?.pricing?.total || previousOrder?.total || 0,
    // Backend canonical field is orderStatus; keep legacy `status` for UI compatibility.
    status: apiOrder?.orderStatus || apiOrder?.status || previousOrder?.status || 'pending',
    deliveryPartner: apiOrder?.deliveryPartnerId ? {
      name: apiOrder.deliveryPartnerId.name || 'Delivery Partner',
      avatar: null
    } : (previousOrder?.deliveryPartner || null),
    deliveryPartnerId: apiOrder?.deliveryPartnerId?._id || apiOrder?.deliveryPartnerId || apiOrder?.dispatch?.deliveryPartnerId?._id || apiOrder?.dispatch?.deliveryPartnerId || apiOrder?.assignmentInfo?.deliveryPartnerId || null,
    dispatch: apiOrder?.dispatch || previousOrder?.dispatch || null,
    assignmentInfo: apiOrder?.assignmentInfo || previousOrder?.assignmentInfo || null,
    tracking: apiOrder?.tracking || previousOrder?.tracking || {},
    deliveryState: apiOrder?.deliveryState || previousOrder?.deliveryState || null,
    createdAt: apiOrder?.createdAt || previousOrder?.createdAt || null,
    totalAmount: apiOrder?.pricing?.total || apiOrder?.totalAmount || previousOrder?.totalAmount || 0,
    deliveryFee: apiOrder?.pricing?.deliveryFee || apiOrder?.deliveryFee || previousOrder?.deliveryFee || 0,
    gst: apiOrder?.pricing?.gst || apiOrder?.gst || previousOrder?.gst || 0,
    paymentMethod: apiOrder?.paymentMethod || apiOrder?.payment?.method || previousOrder?.paymentMethod || null,
    payment: apiOrder?.payment || previousOrder?.payment || null,
    // Preserve delivery OTP code received via socket event.
    // API responses intentionally strip the secret code for security,
    // so without preserving it the UI would lose the OTP on each poll refresh.
    deliveryVerification: (() => {
      const prevDV = previousOrder?.deliveryVerification || null
      const apiDV = apiOrder?.deliveryVerification || null
      const handoverOtp = apiOrder?.handoverOtp || null
      
      if (!prevDV && !apiDV && !handoverOtp) return null

      const prevDropOtp = prevDV?.dropOtp || null
      const apiDropOtp = apiDV?.dropOtp || null
      
      const merged = {
        ...(prevDV || {}),
        ...(apiDV || {})
      }

      // Prioritize: 1. Real-time handoverOtp from current API response
      // 2. Previously preserved code in local state (from socket or earlier poll)
      // 3. Nested code field in API response (if ever present)
      const finalCode = handoverOtp || prevDropOtp?.code || apiDropOtp?.code

      if (finalCode || prevDropOtp?.required || apiDropOtp?.required) {
        merged.dropOtp = {
          ...(prevDropOtp || {}),
          ...(apiDropOtp || {}),
          code: finalCode
        }
      }
      return merged
    })()
  }
}

/**
 * Backend uses `orderStatus` (created, confirmed, preparing, ready_for_pickup, picked_up, delivered, cancelled_*).
 * This page used to read legacy `status` only — so UI never updated. Map canonical + legacy values to tracking steps.
 */
function mapBackendOrderStatusToUi(raw) {
  const s = String(raw || "").toLowerCase()
  if (!s || s === "pending" || s === "created") return "placed"
  if (s === "confirmed" || s === "accepted") return "confirmed"
  if (s === "preparing" || s === "processed") return "preparing"
  if (s === "ready" || s === "ready_for_pickup" || s === "reached_pickup" || s === "order_confirmed") return "ready"
  if (s === "picked_up" || s === "out_for_delivery" || s === "en_route_to_delivery") return "on_way"
  if (s === "reached_drop" || s === "at_drop" || s === "at_delivery") return "at_drop"
  if (s === "delivered" || s === "completed") return "delivered"
  if (s.includes("cancelled") || s === "cancelled") return "cancelled"
  return "placed"
}

function mapOrderToTrackingUiStatus(orderLike) {
  if (!orderLike) return "placed"
  const statusRaw = orderLike.status || orderLike.orderStatus
  const phase = orderLike.deliveryState?.currentPhase

  // Terminal states handled first
  if (isFoodOrderCancelledStatus(statusRaw)) return "cancelled"
  if (statusRaw === "delivered" || statusRaw === "completed") return "delivered"

  // Live Ride / Phase-based mapping (Highest priority for precision)
  const isRiderAccepted = orderLike.dispatch?.status === "accepted" || orderLike.assignmentInfo?.status === "accepted" || orderLike.deliveryPartner?.status === "accepted";
  
  if (phase === "reached_drop" || phase === "at_drop" || statusRaw === "at_drop") return "at_drop"
  if (phase === "en_route_to_delivery" || statusRaw === "picked_up" || statusRaw === "out_for_delivery") return "on_way"
  if (phase === "at_pickup" && orderLike.deliveryPartnerId && isRiderAccepted) return "at_pickup"
  if (phase === "en_route_to_pickup" && orderLike.deliveryPartnerId && isRiderAccepted) return "assigned"

  // Fallback to basic status mapping
  return mapBackendOrderStatusToUi(statusRaw)
}

/** Prefer live delivery phase when present (socket / polling include deliveryState). */
function isFoodOrderCancelledStatus(statusRaw) {
  const s = String(statusRaw || "").toLowerCase()
  return s === "cancelled" || s.includes("cancelled")
}

function normalizeLookupId(value) {
  if (value == null) return ""
  const raw = String(value).trim()
  if (!raw || raw === "undefined" || raw === "null") return ""
  return raw
}

export default function OrderTracking() {
  const companyName = useCompanyName()
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const confirmed = searchParams.get("confirmed") === "true"
  const { getOrderById } = useOrders()
  const { profile, getDefaultAddress } = useProfile()
  const { location: userLiveLocation } = useUserLocation()

  // State for order data
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showConfirmation, setShowConfirmation] = useState(confirmed)
  const [orderStatus, setOrderStatus] = useState('placed')
  const [estimatedTime, setEstimatedTime] = useState(29)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [cancellationReason, setCancellationReason] = useState("")
  const [isCancelling, setIsCancelling] = useState(false)
  const [resolvedLookupId, setResolvedLookupId] = useState("")
  const [timerNow, setTimerNow] = useState(Date.now())
  const handleEtaUpdate = useCallback((newEta) => setEstimatedTime(newEta), [])
  const lastRealtimeRefreshRef = useRef(0)
  const trackingOrderIdsRef = useRef(new Set())
  const terminalPollStopRef = useRef(false)
  const lookupIdsRef = useRef([])
  const isInitialPollRequestedRef = useRef(null)
  const lastPollExecutionRef = useRef(0) // New: Hard throttle for extreme cases

  // Delivery handover OTP received via socket event.
  // Kept separately so UI still renders even if the event arrives
  // before the order API poll populates `order` state.
  const [socketDropOtpCode, setSocketDropOtpCode] = useState(null)


  // OTP received via socket event (deliveryDropOtp)
  useEffect(() => {
    const handleDeliveryDropOtp = (event) => {
      const detail = event?.detail || {}
      const otp = detail?.otp != null ? String(detail.otp) : null
      const evtOrderId = detail?.orderId != null ? String(detail.orderId) : null
      const evtOrderMongoId =
        detail?.orderMongoId != null ? String(detail.orderMongoId) : null

      if (!otp) return

      // If the order is already loaded, match by either orderId or mongoId.
      // Otherwise, match against the current URL param.
      const currentIds = [String(orderId)]
      if (order?.orderId) currentIds.push(String(order.orderId))
      if (order?.mongoId) currentIds.push(String(order.mongoId))
      if (order?._id) currentIds.push(String(order._id))

      const matches =
        (evtOrderId && currentIds.includes(evtOrderId)) ||
        (evtOrderMongoId && currentIds.includes(evtOrderMongoId))

      if (!matches) return

      // Always store so UI can render even if `order` hasn't loaded yet.
      setSocketDropOtpCode(otp)

      setOrder((prev) => {
        if (!prev) return prev
        const prevDV = prev.deliveryVerification || {}
        const prevDropOtp = prevDV.dropOtp || {}
        
        // Only update if code actually changed to avoid render loops
        if (prevDropOtp.code === otp) return prev;
        
        return {
          ...prev,
          deliveryVerification: {
            ...prevDV,
            dropOtp: {
              ...prevDropOtp,
              required: true,
              verified: false,
              code: otp
            }
          }
        }
      })
    }

    window.addEventListener('deliveryDropOtp', handleDeliveryDropOtp)
    return () => window.removeEventListener('deliveryDropOtp', handleDeliveryDropOtp)
  }, [orderId, order])

  // --------------------------------------------------------------------------
  // DATA FETCHING & POLLING STABILITY (FIXED FOR HAMMERING)
  // --------------------------------------------------------------------------

  // Socket notifications include order ids — keep a set so events match this page.
  useEffect(() => {
    const s = trackingOrderIdsRef.current
    s.add(String(orderId))
    if (order?.orderId) s.add(String(order.orderId))
    if (order?.mongoId) s.add(String(order.mongoId))
    if (order?.id) s.add(String(order.id))
  }, [orderId, order?.orderId, order?.mongoId, order?.id])

  useEffect(() => {
    const ids = [
      resolvedLookupId,
      orderId,
      order?.orderId,
      order?.mongoId,
      order?._id,
      order?.id,
    ]
      .map(normalizeLookupId)
      .filter(Boolean)
    lookupIdsRef.current = Array.from(new Set(ids))
  }, [orderId, resolvedLookupId, order?.orderId, order?.mongoId, order?._id, order?.id])

  // Stability Nuke: Move function bodies into a ref-protected execute flow
  const stableOpsRef = useRef({
    resolveOrderFromList: async (rawLookupId) => {
      const needle = normalizeLookupId(rawLookupId)
      if (!needle) return null
      const maxPages = 3
      const limit = 50

      for (let page = 1; page <= maxPages; page += 1) {
        const listResponse = await orderAPI.getOrders({ page, limit })
        let orders = []
        if (listResponse?.data?.success && listResponse?.data?.data?.orders) {
          orders = listResponse.data.data.orders || []
        } else if (listResponse?.data?.orders) {
          orders = listResponse.data.orders || []
        } else if (Array.isArray(listResponse?.data?.data?.data)) {
          orders = listResponse.data.data.data || []
        } else if (Array.isArray(listResponse?.data?.data)) {
          orders = listResponse.data.data || []
        }

        const matched = (orders || []).find((o) => {
          const candidates = [o?._id, o?.id, o?.orderId, o?.mongoId].map(normalizeLookupId)
          return candidates.includes(needle)
        })
        if (matched) return matched
        const totalPages = Number(listResponse?.data?.data?.pagination?.pages) || Number(listResponse?.data?.data?.totalPages) || 1
        if (page >= totalPages) break
      }
      return null
    },
    fetchOrderDetailsWithFallback: async (options = {}) => {
      const lookupIds = lookupIdsRef.current
      if (lookupIds.length === 0) throw new Error("Order id required")
      let lastError = null
      for (const id of lookupIds) {
        try {
          // Double guard against hammer
          return await orderAPI.getOrderDetails(id, options)
        } catch (err) {
          lastError = err
          if (err?.response?.status === 400 || err?.response?.status === 404) continue
          throw err
        }
      }
      throw lastError || new Error("Failed to fetch order details")
    }
  });

  const resolveOrderFromList = useCallback((id) => stableOpsRef.current.resolveOrderFromList(id), [])
  const fetchOrderDetailsWithFallback = useCallback((opts) => stableOpsRef.current.fetchOrderDetailsWithFallback(opts), [])

  // Clear OTP when order is finalized.
  useEffect(() => {
    if (!order) return
    const status = mapOrderToTrackingUiStatus(order)
    if (status === 'delivered' || status === 'cancelled') {
      setSocketDropOtpCode(null)


      setOrder((prev) => {
        if (!prev?.deliveryVerification?.dropOtp?.code) return prev
        return {
          ...prev,
          deliveryVerification: {
            ...(prev.deliveryVerification || {}),
            dropOtp: {
              ...(prev.deliveryVerification?.dropOtp || {}),
              code: null
            }
          }
        }
      })
    }
  }, [orderStatus, order])

  const defaultAddress = getDefaultAddress()
  const fallbackCustomerCoords = useMemo(() => {
    const orderCoords = order?.address?.coordinates || order?.address?.location?.coordinates
    if (Array.isArray(orderCoords) && orderCoords.length >= 2) {
      const lng = Number(orderCoords[0])
      const lat = Number(orderCoords[1])
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng }
      }
    }

    const defaultCoords = defaultAddress?.location?.coordinates
    if (Array.isArray(defaultCoords) && defaultCoords.length >= 2) {
      const lng = Number(defaultCoords[0])
      const lat = Number(defaultCoords[1])
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng }
      }
    }

    const liveLat = Number(userLiveLocation?.latitude)
    const liveLng = Number(userLiveLocation?.longitude)
    if (Number.isFinite(liveLat) && Number.isFinite(liveLng)) {
      return { lat: liveLat, lng: liveLng }
    }

    return null
  }, [
    order?.address?.coordinates,
    order?.address?.location?.coordinates,
    defaultAddress?.location?.coordinates,
    userLiveLocation?.latitude,
    userLiveLocation?.longitude
  ])

  const userLiveCoords = useMemo(() => {
    const lat = Number(userLiveLocation?.latitude)
    const lng = Number(userLiveLocation?.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  }, [userLiveLocation?.latitude, userLiveLocation?.longitude])

  const isAdminAccepted = useMemo(() => {
    const status = order?.status
    return [
      "confirmed",
      "preparing",
      "ready",
      "ready_for_pickup",
      "picked_up",
    ].includes(status)
  }, [order?.status])

  // Single source of truth: backend order.status (+ deliveryState phase for live ride)
  useEffect(() => {
    if (!order) return
    setOrderStatus(mapOrderToTrackingUiStatus(order))
  }, [
    order?.status,
    order?.deliveryState?.currentPhase,
    order?.deliveryState?.status,
  ])

  const acceptedAtMs = useMemo(() => {
    const timestamp =
      order?.tracking?.confirmed?.timestamp ||
      order?.tracking?.preparing?.timestamp ||
      order?.updatedAt ||
      order?.createdAt

    const parsed = timestamp ? new Date(timestamp).getTime() : NaN
    return Number.isFinite(parsed) ? parsed : null
  }, [order?.tracking?.confirmed?.timestamp, order?.tracking?.preparing?.timestamp, order?.updatedAt, order?.createdAt])

  const editWindowRemainingMs = useMemo(() => {
    if (!isAdminAccepted || !acceptedAtMs) return 0
    const remaining = 60000 - (timerNow - acceptedAtMs)
    return Math.max(0, remaining)
  }, [isAdminAccepted, acceptedAtMs, timerNow])

  const isEditWindowOpen = editWindowRemainingMs > 0

  const editWindowText = useMemo(() => {
    const totalSeconds = Math.ceil(editWindowRemainingMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }, [editWindowRemainingMs])

  const handleCallRestaurant = () => {
    const rawPhone =
      order?.restaurantPhone ||
      order?.restaurantId?.phone ||
      order?.restaurantId?.ownerPhone ||
      order?.restaurantId?.contact?.phone ||
      order?.restaurant?.phone ||
      order?.restaurant?.ownerPhone ||
      ''

    const cleanPhone = String(rawPhone).replace(/[^\d+]/g, '')
    if (!cleanPhone) {
      toast.error('Restaurant phone number not available')
      return
    }

    window.location.href = `tel:${cleanPhone}`
  }

  const customerDeliveryOtp = useMemo(() => {
    const codeFromOrder = order?.deliveryVerification?.dropOtp?.code
    const code = codeFromOrder ?? socketDropOtpCode
    return code ? String(code) : null
  }, [order?.deliveryVerification?.dropOtp?.code, socketDropOtpCode])

  useEffect(() => {
    if (!isEditWindowOpen) return
    const interval = setInterval(() => {
      setTimerNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [isEditWindowOpen])

  // Poll for order updates (especially when delivery partner accepts)

  // Re-run poll if orderId changes. Status changes are handled inside the interval.
  useEffect(() => {
    if (!orderId) return;

    let isSubscribed = true;
    let requestInProgress = false;

    const poll = async (isInitial = false) => {
      // Don't poll if component unmounted or request already in flight
      if (!isSubscribed || requestInProgress) return;
      if (terminalPollStopRef.current && !isInitial) return;

      // Hard safety throttle: prevent the "150 requests" hammer 
      // even if the effect itself is re-binding infinitely.
      const now = Date.now();
      if (isInitial && now - lastPollExecutionRef.current < 1000) {
        debugLog('?? Throttling initial poll re-entrancy hammer');
        return;
      }
      if (isInitial) lastPollExecutionRef.current = now;

      requestInProgress = true;
      try {
        if (isInitial && lookupIdsRef.current.length <= 1) {
          try {
            const matchedOrder = await resolveOrderFromList(orderId)
            if (matchedOrder) {
              const nextLookupId =
                normalizeLookupId(matchedOrder?._id) ||
                normalizeLookupId(matchedOrder?.orderId) ||
                normalizeLookupId(matchedOrder?.id)
              
              if (nextLookupId && nextLookupId !== resolvedLookupId) {
                setResolvedLookupId(nextLookupId)
              }
            }
          } catch {
            // Continue with direct detail fetch if list resolution fails.
          }
        }

        const response = await fetchOrderDetailsWithFallback({ force: isInitial });
        if (!isSubscribed) return;

        if (response.data?.success && response.data.data?.order) {
          const apiOrder = response.data.data.order;
          
          setOrder(prev => {
             // Use functional update to check against last state without depending on 'order' object
             const transformedOrder = transformOrderForTracking(apiOrder, prev);
             const ui = mapOrderToTrackingUiStatus(transformedOrder)
             terminalPollStopRef.current = ui === 'delivered' || ui === 'cancelled'
             return transformedOrder;
          });
        } else if (isInitial) {
          setError(response.data?.message || 'Order not found');
        }
      } catch (err) {
        const status = err?.response?.status
        if (status !== 400 && status !== 404) {
          debugError('Error polling order updates:', err);
        }
        if (status === 400 || status === 404) {
          // Deep-link safety: try resolving by listing user's orders and matching IDs.
          if (isInitial) {
            try {
              const matchedOrder = await resolveOrderFromList(orderId)
              if (matchedOrder) {
                const nextLookupId =
                  normalizeLookupId(matchedOrder?._id) ||
                  normalizeLookupId(matchedOrder?.orderId) ||
                  normalizeLookupId(matchedOrder?.id)

                if (nextLookupId) {
                  setResolvedLookupId(nextLookupId)
                }

                setOrder((prev) => transformOrderForTracking(matchedOrder, prev))
                setError(null)
                terminalPollStopRef.current = false
                return
              }
            } catch (resolveErr) {
              debugWarn('Order resolution from list failed:', resolveErr)
            }
          }
          // Prevent repeated noisy polling when current route id does not map to a real order.
          terminalPollStopRef.current = true
        }
        if (isInitial) {
          setError(err.response?.data?.message || 'Failed to connect to server');
        }
      } finally {
        requestInProgress = false;
        if (isInitial) {
          setLoading(false);
        }
      }
    };

    terminalPollStopRef.current = false

    // Same order: one in-flight + short client cache in orderAPI — avoid hammering the server.
    const tick = () => {
      if (terminalPollStopRef.current) return
      poll(false)
    }
    const interval = setInterval(tick, 5000);

    // Guard initial poll to run EXACTLY once for the current orderId, 
    // protecting against frequent re-renders from location hooks.
    if (isInitialPollRequestedRef.current !== orderId) {
      isInitialPollRequestedRef.current = orderId;
      poll(true);
    }

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    }
  }, [orderId, fetchOrderDetailsWithFallback, resolveOrderFromList]);


  // Fetch order: show context immediately if present.
  // We rely on the unified polling effect above for the actual network fetch.
  useEffect(() => {
    const rawContext = getOrderById(orderId)
    if (rawContext) {
      const contextOrder = { ...rawContext }
      contextOrder.mongoId =
        contextOrder.mongoId ||
        contextOrder._id ||
        (typeof contextOrder.id === "string" && /^[a-f0-9]{24}$/i.test(contextOrder.id)
          ? contextOrder.id
          : null)
      contextOrder.orderId =
        contextOrder.orderId ||
        (typeof contextOrder.id === "string" && contextOrder.id.startsWith("ORD-") ? contextOrder.id : null)
      
      setOrder(contextOrder)
      setLoading(false)
    }
  }, [orderId, getOrderById])

  useEffect(() => {
    if (!order) return
    const ui = mapOrderToTrackingUiStatus(order)
    terminalPollStopRef.current = ui === 'delivered' || ui === 'cancelled'
  }, [order])

  // Post-checkout splash only — real status comes from API / poll / socket.
  useEffect(() => {
    if (!confirmed) return
    const timer1 = setTimeout(() => setShowConfirmation(false), 3000)
    return () => clearTimeout(timer1)
  }, [confirmed])

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setEstimatedTime((prev) => Math.max(0, prev - 1))
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Listen for order status updates from socket (e.g., "Delivery partner on the way")
  useEffect(() => {
    const handleOrderStatusNotification = (event) => {
      const payload = event?.detail || {};
      const { message, status, estimatedDeliveryTime, orderId: evtOrderId, orderMongoId } = payload;

      const evtKeys = [evtOrderId, orderMongoId, payload?._id].filter(Boolean).map(String)
      const idMatches =
        evtKeys.length === 0 ||
        evtKeys.some((k) => String(k) === String(orderId)) ||
        evtKeys.some((k) => trackingOrderIdsRef.current.has(k))

      debugLog('?? Order status notification received:', { message, status, idMatches });

      if (idMatches) {
        const next = mapOrderToTrackingUiStatus({
          status,
          orderStatus: payload.orderStatus || status,
          deliveryState: payload.deliveryState,
        });
        setOrderStatus(next);

        // Pull latest order state without refresh spam on bursty socket events.
        const now = Date.now();
        if (now - lastRealtimeRefreshRef.current > 1500 && !isRefreshing) {
          lastRealtimeRefreshRef.current = now;
          handleRefresh();
        }
      }

      // Show notification toast
      if (message) {
        toast.success(message, {
          duration: 5000,
          icon: '???',
          position: 'top-center',
          description: estimatedDeliveryTime
            ? `Estimated delivery in ${Math.round(estimatedDeliveryTime / 60)} minutes`
            : undefined
        });

        // Optional: Vibrate device if supported
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    };

    // Listen for custom event from DeliveryTrackingMap
    window.addEventListener('orderStatusNotification', handleOrderStatusNotification);

    return () => {
      window.removeEventListener('orderStatusNotification', handleOrderStatusNotification);
    };
  }, [orderId])

  const handleCancelOrder = () => {
    // Check if order can be cancelled (only Razorpay orders that aren't delivered/cancelled)
    if (!order) return;

    if (isAdminAccepted && !isEditWindowOpen) {
      toast.error('Cancellation window ended. You can no longer cancel this order.');
      return;
    }

    if (order.status === 'cancelled') {
      toast.error('Order is already cancelled');
      return;
    }

    if (order.status === 'delivered') {
      toast.error('Cannot cancel a delivered order');
      return;
    }

    // Allow cancellation for all payment methods (Razorpay, COD, Wallet)
    // Only restrict if order is already cancelled or delivered (checked above)

    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellationReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    setIsCancelling(true);
    try {
      const cancelLookupId =
        lookupIdsRef.current[0] || normalizeLookupId(orderId)
      const response = await orderAPI.cancelOrder(cancelLookupId, { reason: cancellationReason.trim() });
      if (response.data?.success) {
        const paymentMethod = order?.payment?.method || order?.paymentMethod;
        const successMessage = response.data?.message ||
          (paymentMethod === 'cash' || paymentMethod === 'cod'
            ? 'Order cancelled successfully. No refund required as payment was not made.'
            : 'Order cancelled successfully. Refund will be processed after admin approval.');
        toast.success(successMessage);
        setShowCancelDialog(false);
        setCancellationReason("");
        // Refresh order data
        const orderResponse = await fetchOrderDetailsWithFallback({ force: true });
        if (orderResponse.data?.success && orderResponse.data.data?.order) {
          const apiOrder = orderResponse.data.data.order;
          setOrder(transformOrderForTracking(apiOrder, order));
        }
      } else {
        toast.error(response.data?.message || 'Failed to cancel order');
      }
    } catch (error) {
      debugError('Error cancelling order:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Track my order from ${order?.restaurant || companyName}`,
          text: `Hey! Track my order from ${order?.restaurant || companyName} with ID #${order?.orderId || order?.id}.`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Tracking link copied to clipboard!");
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        debugError('Error sharing:', error);
        toast.error("Failed to share link");
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetchOrderDetailsWithFallback({ force: true })
      if (response.data?.success && response.data.data?.order) {
        const apiOrder = response.data.data.order

        // Extract restaurant location coordinates with multiple fallbacks
        let restaurantCoords = null;
        let restaurantAddress = null;

        // Priority 1: restaurantId.location.coordinates (GeoJSON format: [lng, lat])
        if (apiOrder.restaurantId?.location?.coordinates &&
          Array.isArray(apiOrder.restaurantId.location.coordinates) &&
          apiOrder.restaurantId.location.coordinates.length >= 2) {
          restaurantCoords = apiOrder.restaurantId.location.coordinates;
        }
        // Priority 2: restaurantId.location with latitude/longitude properties
        else if (apiOrder.restaurantId?.location?.latitude && apiOrder.restaurantId?.location?.longitude) {
          restaurantCoords = [apiOrder.restaurantId.location.longitude, apiOrder.restaurantId.location.latitude];
        }
        // Priority 3: Check nested restaurant data
        else if (apiOrder.restaurant?.location?.coordinates) {
          restaurantCoords = apiOrder.restaurant.location.coordinates;
        }
        // Priority 4: Check if restaurantId is a string ID and fetch restaurant details
        else if (typeof apiOrder.restaurantId === 'string') {
          debugLog('?? restaurantId is a string ID, fetching restaurant details...', apiOrder.restaurantId);
          try {
            const restaurantResponse = await restaurantAPI.getRestaurantById(apiOrder.restaurantId);
            if (restaurantResponse?.data?.success && restaurantResponse.data.data?.restaurant) {
              const restaurant = restaurantResponse.data.data.restaurant;
              if (restaurant.location?.coordinates && Array.isArray(restaurant.location.coordinates) && restaurant.location.coordinates.length >= 2) {
                restaurantCoords = restaurant.location.coordinates;
                debugLog('? Fetched restaurant coordinates from API:', restaurantCoords);
              }
              restaurantAddress =
                restaurant?.location?.formattedAddress ||
                restaurant?.location?.address ||
                restaurant?.address ||
                null;
            }
          } catch (err) {
            debugError('? Error fetching restaurant details:', err);
          }
        }

        setOrder(transformOrderForTracking(apiOrder, order, restaurantCoords, restaurantAddress))
      }
    } catch (err) {
      debugError('Error refreshing order:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // --------------------------------------------------------------------------
  // RENDER (Final JSX)
  // --------------------------------------------------------------------------

  // Loading state (moved after hooks)
  if (loading) {
    return (
      <AnimatedPage className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto text-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </AnimatedPage>
    )
  }

  // Error state (moved after hooks)
  if (error || !order) {
    return (
      <AnimatedPage className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto text-center py-20">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The order you\'re looking for doesn\'t exist.'}</p>
          <Link to="/user/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </AnimatedPage>
    )
  }

  const statusConfig = {
    placed: {
      title: "Order Placed",
      subtitle: "Waiting for restaurant to accept",
      color: "bg-green-600",
      iconType: 'food'
    },
    confirmed: {
      title: "Order Confirmed",
      subtitle: "Restaurant has accepted your order",
      color: "bg-green-600",
      iconType: 'food'
    },
    preparing: {
      title: "Food is being prepared",
      subtitle: typeof estimatedTime === 'number' ? `Arriving in ${estimatedTime} mins` : "Cooking your meal",
      color: "bg-green-600",
      iconType: 'food'
    },
    assigned: {
      title: "Rider is arriving",
      subtitle: "A delivery partner is arriving at the restaurant",
      color: "bg-green-600",
      iconType: 'rider'
    },
    at_pickup: {
      title: "Rider at restaurant",
      subtitle: "Rider is waiting for your order",
      color: "bg-green-600",
      iconType: 'rider'
    },
    ready: {
      title: "Handover in progress",
      subtitle: "Rider is picking up your order",
      color: "bg-green-600",
      iconType: 'rider'
    },
    on_way: {
      title: "Out for delivery",
      subtitle: typeof estimatedTime === 'number' ? `Arriving in ${estimatedTime} mins` : "Rider is out for delivery",
      color: "bg-green-600",
      iconType: 'rider'
    },
    at_drop: {
      title: "Arrived at location",
      subtitle: "Please come to the door",
      color: "bg-green-600",
      iconType: 'rider'
    },
    delivered: {
      title: "Order delivered",
      subtitle: "Enjoy your meal!",
      color: "bg-green-600",
      iconType: 'delivered'
    },
    cancelled: {
      title: "Order cancelled",
      subtitle: "This order has been cancelled",
      color: "bg-red-600",
      iconType: 'cancelled'
    }
  }

  const currentStatus = statusConfig[orderStatus] || statusConfig.placed
  const isDeliveredOrder =
    orderStatus === "delivered" ||
    order?.status === "delivered" ||
    Boolean(order?.deliveredAt)

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0a0a0a]">
      {/* Order Confirmed Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white dark:bg-[#1a1a1a] flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-center px-8"
            >
              <AnimatedCheckmark delay={0.3} />
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="text-2xl font-bold text-gray-900 mt-6"
              >
                Order Confirmed!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="text-gray-600 mt-2"
              >
                Your order has been placed successfully
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="mt-8"
              >
                <div className="w-8 h-8 border-2 border-[#EB590E] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500 mt-3">Loading order details...</p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Green Header */}
      <motion.div
        className={`${currentStatus.color} text-white sticky top-0 z-40`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Navigation bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/user/orders">
            <motion.button
              className="w-10 h-10 flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-6 h-6" />
            </motion.button>
          </Link>
          <h2 className="font-semibold text-lg">{order.restaurant}</h2>
          <motion.button
            className="w-10 h-10 flex items-center justify-center cursor-pointer"
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}
          >
            <Share2 className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Status section */}
        <div className="px-4 pb-4 text-center">
          <motion.h1
            className="text-2xl font-bold mb-3"
            key={currentStatus.title}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {currentStatus.title}
          </motion.h1>

          {/* Status pill */}
          <motion.div
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-sm">{currentStatus.subtitle}</span>
            {orderStatus === 'preparing' && (
              <>
                <span className="w-1 h-1 rounded-full bg-white" />
                <span className="text-sm text-orange-200">On time</span>
              </>
            )}
            <motion.button
              onClick={handleRefresh}
              className="ml-1"
              animate={{ rotate: isRefreshing ? 360 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Map Section */}
      {!isDeliveredOrder && (
        <DeliveryMap
          orderId={orderId}
          order={order}
          isVisible={order !== null}
          fallbackCustomerCoords={fallbackCustomerCoords}
          userLiveCoords={userLiveCoords}
          userLocationAccuracy={userLiveLocation?.accuracy ?? null}
          onEtaUpdate={handleEtaUpdate}
        />
      )}

      {/* Scrollable Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6 pb-24 md:pb-32">
        {/* 1-minute cancellation window after admin acceptance */}
        {isAdminAccepted && (
          <motion.div
            className="bg-white rounded-xl p-4 shadow-sm border border-orange-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900">
                Cancel order
              </p>
              <span className={`text-sm font-bold px-2 py-1 rounded-md ${isEditWindowOpen ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                {isEditWindowOpen ? editWindowText : 'Expired'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Available for 1 minute after admin acceptance.
            </p>
            <div className="mt-3">
              <Button
                type="button"
                onClick={handleCancelOrder}
                disabled={!isEditWindowOpen}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Cancel Order
              </Button>
            </div>
          </motion.div>
        )}

        {customerDeliveryOtp && orderStatus !== 'delivered' && orderStatus !== 'cancelled' && (
          <motion.div
            className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
          >
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Delivery OTP</p>
            <p className="text-2xl font-extrabold text-blue-900 mt-1 tracking-widest">{customerDeliveryOtp}</p>
            <p className="text-xs text-blue-700 mt-1">Share this 4-digit OTP with your delivery partner at drop-off.</p>
          </motion.div>
        )}

        {/* Dynamic Status Card */}
        <motion.div
          className="bg-white rounded-xl p-4 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm border border-gray-100 ${
              currentStatus.iconType === 'rider' ? 'bg-blue-50' : 
              currentStatus.iconType === 'cancelled' ? 'bg-red-50' : 
              currentStatus.iconType === 'delivered' ? 'bg-green-50' : 
              'bg-orange-50'
            }`}>
              {currentStatus.iconType === 'rider' ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: RIDER_BIKE_SVG.replace(/width="\d+"/, 'width="100%"').replace(/height="\d+"/, 'height="100%"') }} 
                  className="w-full h-full" 
                />
              ) : currentStatus.iconType === 'cancelled' ? (
                <div className="w-full h-full flex items-center justify-center p-2 text-red-500">
                  <X className="w-full h-full" />
                </div>
              ) : currentStatus.iconType === 'delivered' ? (
                <div className="w-full h-full flex items-center justify-center p-2 text-green-500">
                  <Check className="w-full h-full" />
                </div>
              ) : (
                <img
                  src={circleIcon}
                  alt={currentStatus.title}
                  className="w-10 h-10 object-contain"
                />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 leading-tight">{currentStatus.title}</p>
              <p className="text-sm text-gray-500 mt-1 leading-snug">{currentStatus.subtitle}</p>
            </div>
          </div>
        </motion.div>

        {/* Delivery Partner Safety */}
        <motion.button
          className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.99 }}
        >
          <Shield className="w-6 h-6 text-gray-600" />
          <span className="flex-1 text-left font-medium text-gray-900">
            Learn about delivery partner safety
          </span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </motion.button>

        {/* Delivery Details Banner */}
        <motion.div
          className="bg-yellow-50 rounded-xl p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <p className="text-yellow-800 font-medium">
            All your delivery details in one place ??
          </p>
        </motion.div>

        {/* Contact & Address Section */}
        <motion.div
          className="bg-white rounded-xl shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <SectionItem
            icon={User}
            title={
              order?.userName ||
              order?.userId?.fullName ||
              order?.userId?.name ||
              profile?.fullName ||
              profile?.name ||
              'Customer'
            }
            subtitle={
              order?.userPhone ||
              order?.userId?.phone ||
              profile?.phone ||
              defaultAddress?.phone ||
              'Phone number not available'
            }
          />
          <SectionItem
            iconNode={<div dangerouslySetInnerHTML={{ __html: SAFE_CUSTOMER_PIN }} className="w-8 h-8 scale-110" />}
            title="Delivery at Location"
            subtitle={(() => {
              // Priority 1: Use order address formattedAddress (live location address)
              if (order?.address?.formattedAddress && order.address.formattedAddress !== "Select location") {
                return order.address.formattedAddress
              }

              // Priority 2: Build full address from order address parts
              if (order?.address) {
                const orderAddressParts = []
                if (order.address.street) orderAddressParts.push(order.address.street)
                if (order.address.additionalDetails) orderAddressParts.push(order.address.additionalDetails)
                if (order.address.city) orderAddressParts.push(order.address.city)
                if (order.address.state) orderAddressParts.push(order.address.state)
                if (order.address.zipCode) orderAddressParts.push(order.address.zipCode)
                if (orderAddressParts.length > 0) {
                  return orderAddressParts.join(', ')
                }
              }

              // Priority 3: Use defaultAddress formattedAddress (live location address)
              if (defaultAddress?.formattedAddress && defaultAddress.formattedAddress !== "Select location") {
                return defaultAddress.formattedAddress
              }

              // Priority 4: Build full address from defaultAddress parts
              if (defaultAddress) {
                const defaultAddressParts = []
                if (defaultAddress.street) defaultAddressParts.push(defaultAddress.street)
                if (defaultAddress.additionalDetails) defaultAddressParts.push(defaultAddress.additionalDetails)
                if (defaultAddress.city) defaultAddressParts.push(defaultAddress.city)
                if (defaultAddress.state) defaultAddressParts.push(defaultAddress.state)
                if (defaultAddress.zipCode) defaultAddressParts.push(defaultAddress.zipCode)
                if (defaultAddressParts.length > 0) {
                  return defaultAddressParts.join(', ')
                }
              }

              return 'Add delivery address'
            })()}
          />
          <SectionItem
            icon={MessageSquare}
            title="Add delivery instructions"
            subtitle=""
          />
        </motion.div>

        {/* Restaurant Section */}
        <motion.div
          className="bg-white rounded-xl shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          <div className="flex items-center gap-3 p-4 border-b border-dashed border-gray-200">
            <div className="w-12 h-12 rounded-full bg-orange-100 overflow-visible flex items-center justify-center flex-shrink-0 p-1">
              <div dangerouslySetInnerHTML={{ __html: SAFE_RESTAURANT_PIN }} className="w-full h-full scale-125" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{order.restaurant}</p>
              <p className="text-sm text-gray-500">{order.restaurantAddress || 'Restaurant location'}</p>
            </div>
            <motion.button
              className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center"
              onClick={handleCallRestaurant}
              whileTap={{ scale: 0.9 }}
            >
              <Phone className="w-5 h-5 text-[#EB590E]" />
            </motion.button>
          </div>

          {/* Order Items */}
          <div
            className="p-4 border-b border-dashed border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setShowOrderDetails(true)}
          >
            <div className="flex items-start gap-3">
              <Receipt className="w-5 h-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <div className="mt-2 space-y-1">
                  {order?.items?.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-4 h-4 rounded border border-green-600 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-green-600" />
                      </span>
                      <span>{item.quantity} x {item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          className="bg-white rounded-xl shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {!isAdminAccepted || isEditWindowOpen ? (
            <SectionItem
              icon={CircleSlash}
              title="Cancel order"
              subtitle=""
              onClick={handleCancelOrder}
            />
          ) : (
            <SectionItem
              icon={CircleSlash}
              title="Cancel order"
              subtitle="Cancellation window ended"
              onClick={handleCancelOrder}
            />
          )}
        </motion.div>

      </div>

      {/* Cancel Order Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-xl w-[95%] max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Cancel Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-6 px-2">
            <div className="space-y-2 w-full">
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g., Changed my mind, Wrong address, etc."
                className="w-full min-h-[100px] resize-none border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-200"
                disabled={isCancelling}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancellationReason("");
                }}
                disabled={isCancelling}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCancel}
                disabled={isCancelling || !cancellationReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Confirm Cancellation'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md bg-white rounded-2xl p-0 overflow-hidden border-none outline-none">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 pr-12">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-gray-900">Order Details</DialogTitle>
            </div>
          </DialogHeader>

          <div className="p-6 pt-4 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Order Meta Info */}
            <div className="flex flex-col gap-1 b">
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Date & Time</p>
                  <p className="text-sm font-medium text-gray-900">
                    {order?.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    }) : 'N/A'}
                  </p>
                </div>
                <div className="h-8 w-px bg-gray-100" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                  <span className="text-sm font-bold text-green-600 uppercase">
                    {order?.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Order Items</p>
              <div className="space-y-4">
                {order?.items?.map((item, index) => (
                  <div key={index} className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-5 h-5 rounded border border-green-600 flex items-center justify-center mt-0.5 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 leading-tight">{item.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">Quantity: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">₹{((item?.price || 0) * (item?.quantity || 0)).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-1">Bill Summary</p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Item Total</span>
                <span className="text-gray-900 font-medium">
                  ₹{(Number(order?.totalAmount || 0) - Number(order?.deliveryFee || 0) - Number(order?.gst || 0)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="text-gray-900 font-medium">₹{Number(order?.deliveryFee || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Taxes & Charges</span>
                <span className="text-gray-900 font-medium">₹{Number(order?.gst || 0).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Total Amount</span>
                <span className="text-lg font-bold text-gray-900">₹{Number(order?.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method */}
            {order?.paymentMethod && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-gray-600">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Payment Method</span>
                </div>
                <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  {order.paymentMethod}
                </span>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100">
            <Button
              onClick={() => setShowOrderDetails(false)}
              className="w-full bg-gray-900 text-white font-bold h-12 rounded-xl"
            >
              Okay
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

