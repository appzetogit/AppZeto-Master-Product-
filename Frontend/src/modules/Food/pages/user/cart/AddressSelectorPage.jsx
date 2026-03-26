import { useMemo, useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, Plus, MapPin, MoreHorizontal, Navigation, Home, Building2, Briefcase, Phone, X, Crosshair, Search } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { Label } from "@food/components/ui/label"
import { Textarea } from "@food/components/ui/textarea"
import { useLocation as useGeoLocation } from "@food/hooks/useLocation"
import { useProfile } from "@food/context/ProfileContext"
import { toast } from "sonner"
import { locationAPI, userAPI } from "@food/api"
import { Loader } from '@googlemaps/js-api-loader'
import AnimatedPage from "@food/components/user/AnimatedPage"

const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

// Enable Maps if API Key is available, otherwise fallback to coordinates-only mode
const MAPS_ENABLED = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth's radius in meters
  const lat1Rad = lat1 * Math.PI / 180
  const lat2Rad = lat2 * Math.PI / 180
  const deltaLat = (lat2 - lat1) * Math.PI / 180
  const deltaLon = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

// Get icon based on address type/label
const getAddressIcon = (address) => {
  const label = (address.label || address.additionalDetails || "").toLowerCase()
  if (label.includes("home")) return Home
  if (label.includes("work") || label.includes("office")) return Briefcase
  if (label.includes("building") || label.includes("apt")) return Building2
  return Home
}

export default function AddressSelectorPage() {
  const navigate = useNavigate()
  const { location, loading, requestLocation } = useGeoLocation()
  const { addresses = [], addAddress, updateAddress, setDefaultAddress, userProfile } = useProfile()
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [mapPosition, setMapPosition] = useState([22.7196, 75.8577]) // Default Indore coordinates [lat, lng]
  const [addressFormData, setAddressFormData] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    additionalDetails: "",
    label: "Home",
    phone: "",
  })
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [mapLoading, setMapLoading] = useState(false)
  const mapContainerRef = useRef(null)
  const googleMapRef = useRef(null) // Google Maps instance
  const greenMarkerRef = useRef(null) // Green marker for address selection
  const userLocationMarkerRef = useRef(null) // Blue dot marker for user location
  const blueDotCircleRef = useRef(null) // Accuracy circle for Google Maps
  const [currentAddress, setCurrentAddress] = useState("")
  const [addressAutocompleteValue, setAddressAutocompleteValue] = useState("")
  const [keywordAddressSuggestions, setKeywordAddressSuggestions] = useState([])
  const [isKeywordSearching, setIsKeywordSearching] = useState(false)
  const [lockMapToAutocomplete, setLockMapToAutocomplete] = useState(true)
  const [GOOGLE_MAPS_API_KEY, setGOOGLE_MAPS_API_KEY] = useState(null)
  
  const ENABLE_LOCATION_REVERSE_GEOCODE = import.meta.env.VITE_ENABLE_LOCATION_REVERSE_GEOCODE !== "false"
  const ENABLE_NOMINATIM_SEARCH = import.meta.env.VITE_ENABLE_NOMINATIM_SEARCH !== "false"
  const getAddressId = (address) => address?.id || address?._id || null

  const handleBack = () => {
    navigate(-1)
  }

  const addressAutocompleteSuggestions = useMemo(() => {
    const q = String(addressAutocompleteValue || "").trim().toLowerCase()
    if (!q) return []
    const list = Array.isArray(addresses) ? addresses : []
    return list
      .map((addr) => {
        const text = [
          addr?.label,
          addr?.additionalDetails,
          addr?.street,
          addr?.city,
          addr?.state,
          addr?.zipCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return { addr, text }
      })
      .filter((x) => x.text.includes(q))
      .slice(0, 6)
      .map((x) => x.addr)
  }, [addresses, addressAutocompleteValue])

  // Load Google Maps API key
  useEffect(() => {
    if (!MAPS_ENABLED) return
    import('@food/utils/googleMapsApiKey.js').then(({ getGoogleMapsApiKey }) => {
      getGoogleMapsApiKey().then(key => {
        setGOOGLE_MAPS_API_KEY(key)
      })
    })
  }, [])

  // Nominatim search
  useEffect(() => {
    if (!showAddressForm) return
    const q = String(addressAutocompleteValue || "").trim()
    if (!ENABLE_NOMINATIM_SEARCH || q.length < 3) {
      setKeywordAddressSuggestions([])
      setIsKeywordSearching(false)
      return
    }

    const t = setTimeout(async () => {
      try {
        setIsKeywordSearching(true)
        const refLat = location?.latitude ?? 22.7196
        const refLng = location?.longitude ?? 75.8577
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=10&q=${encodeURIComponent(q)}`
        const res = await fetch(url, { headers: { Accept: "application/json" } })
        const json = await res.json()
        const mapped = (Array.isArray(json) ? json : []).map(r => ({
          id: r.place_id || r.osm_id,
          display: r.display_name || "",
          lat: Number(r.lat),
          lng: Number(r.lon),
          address: r.address || {},
        }))
        const withDistance = mapped
          .filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng))
          .map(x => ({ ...x, distanceMeters: calculateDistance(refLat, refLng, x.lat, x.lng) }))
          .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
          .slice(0, 4)
        setKeywordAddressSuggestions(withDistance)
      } catch (e) {
        setKeywordAddressSuggestions([])
      } finally {
        setIsKeywordSearching(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [addressAutocompleteValue, showAddressForm, location, ENABLE_NOMINATIM_SEARCH])

  // Map Initialization logic
  useEffect(() => {
    if (!MAPS_ENABLED || !showAddressForm || !mapContainerRef.current || !GOOGLE_MAPS_API_KEY) return

    let isMounted = true
    setMapLoading(true)

    const initializeGoogleMap = async () => {
      try {
        const loader = new Loader({ apiKey: GOOGLE_MAPS_API_KEY, version: "weekly" })
        const google = await loader.load()
        if (!isMounted || !mapContainerRef.current) return

        const initialPos = { lat: mapPosition[0], lng: mapPosition[1] }
        
        const map = new google.maps.Map(mapContainerRef.current, {
          center: initialPos,
          zoom: 16,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] }
          ]
        })
        googleMapRef.current = map

        // Update coordinates on map idle (center of the map is the chosen location)
        map.addListener("idle", () => {
          const center = map.getCenter()
          const lat = center.lat()
          const lng = center.lng()
          setMapPosition([lat, lng])
          handleMapMoveEnd(lat, lng)
        })

        setMapLoading(false)
      } catch (err) {
        debugError("Map init error:", err)
        setMapLoading(false)
      }
    }
    initializeGoogleMap()
    return () => { isMounted = false }
  }, [showAddressForm, GOOGLE_MAPS_API_KEY])

  const handleUseCurrentLocation = async () => {
    try {
      toast.loading("Getting location...", { id: "geo" })
      const loc = await requestLocation(true, true)
      if (loc?.latitude) {
        setMapPosition([loc.latitude, loc.longitude])
        try { localStorage.setItem("deliveryAddressMode", "current") } catch {}
        toast.success("Location updated", { id: "geo" })
        handleBack()
      }
    } catch (e) {
      toast.error("Failed to get location", { id: "geo" })
    }
  }

  const handleSelectSavedAddress = async (address) => {
    const id = getAddressId(address)
    if (id) {
      await setDefaultAddress(id)
      try { localStorage.setItem("deliveryAddressMode", "saved") } catch {}
      toast.success("Address selected")
      handleBack()
    }
  }

  const handleAddAddressClick = () => {
    setShowAddressForm(true)
  }

  const handleCancelAddressForm = () => {
    setShowAddressForm(false)
  }

  const handleMapMoveEnd = async (lat, lng) => {
    if (!ENABLE_LOCATION_REVERSE_GEOCODE) return
    try {
      const res = await locationAPI.reverseGeocode(lat, lng)
      if (res?.formattedAddress) {
        setCurrentAddress(res.formattedAddress)
        setAddressFormData(prev => ({
          ...prev,
          street: res.formattedAddress || prev.street,
          city: res.city || prev.city,
          state: res.state || prev.state,
          zipCode: res.postalCode || prev.zipCode,
          additionalDetails: prev.additionalDetails // Don't overwrite what user typed
        }))
      }
    } catch (e) {
      debugError("Reverse geocode error:", e)
    }
  }

  const handleAddressFormSubmit = async (e) => {
    e.preventDefault()
    if (!addressFormData.street || !addressFormData.city) {
      toast.error("Please fill required fields")
      return
    }
    setLoadingAddress(true)
    try {
      const payload = {
        ...addressFormData,
        label: addressFormData.label === "Work" ? "Office" : addressFormData.label,
        location: { type: "Point", coordinates: [mapPosition[1], mapPosition[0]] },
        latitude: mapPosition[0],
        longitude: mapPosition[1]
      }
      const created = await addAddress(payload)
      if (created) {
        const id = getAddressId(created)
        if (id) await setDefaultAddress(id)
        try { localStorage.setItem("deliveryAddressMode", "saved") } catch {}
        toast.success("Address saved")
        handleBack()
      }
    } catch (error) {
      toast.error("Failed to save address")
    } finally {
      setLoadingAddress(false)
    }
  }

  if (showAddressForm) {
    return (
      <AnimatedPage className="fixed inset-0 z-50 bg-white dark:bg-[#0a0a0a] flex flex-col h-screen overflow-hidden">
        <div className="flex-shrink-0 bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleCancelAddressForm} className="rounded-full">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-bold">Add delivery location</h1>
        </div>

        <div className="flex-shrink-0 relative h-[45vh] min-h-[300px]">
          {/* Autocomplete Search Box Over Map */}
          <div className="absolute top-4 left-4 right-4 z-20">
            <div className="relative group shadow-2xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                value={addressAutocompleteValue}
                onChange={(e) => setAddressAutocompleteValue(e.target.value)}
                placeholder="Search area, street, landmark..."
                className="pl-10 h-12 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md border-none rounded-xl shadow-lg focus:ring-2 focus:ring-[#EB590E] transition-all"
              />
              {isKeywordSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                   <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#EB590E] border-t-transparent" />
                </div>
              )}

              {/* Suggestions Dropdown */}
              {keywordAddressSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 dark:bg-gray-800/50">Suggestions</p>
                  {keywordAddressSuggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        const { lat, lng, display, address: a } = s
                        setMapPosition([lat, lng])
                        if (googleMapRef.current) {
                          googleMapRef.current.panTo({ lat, lng })
                          googleMapRef.current.setZoom(17)
                        }
                        setAddressAutocompleteValue(display)
                        
                        // Pre-fill form fields from suggestion's address details
                        const city = a.city || a.town || a.village || a.county || ""
                        const state = a.state || ""
                        const zipCode = a.postcode || ""

                        setAddressFormData((prev) => ({
                          ...prev,
                          street: display || prev.street,
                          city: city || prev.city,
                          state: state || prev.state,
                          zipCode: zipCode || prev.zipCode,
                        }))

                        setKeywordAddressSuggestions([])
                      }}
                      className="w-full px-4 py-3 flex items-start gap-3 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors text-left border-b border-gray-50 dark:border-gray-800 last:border-none"
                    >
                      <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.display}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.address?.city || s.address?.state}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div ref={mapContainerRef} className="w-full h-full bg-gray-100 dark:bg-gray-800" />
          
          {/* FIXED CENTER PIN (Zomato Style) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center pointer-events-none">
             <div className="relative mb-8 flex flex-col items-center">
                {/* Visual Pin Overlay */}
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center p-2 mb-[-6px] shadow-sm animate-bounce-short">
                   <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center border-2 border-white">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                   </div>
                </div>
                {/* Pin Stem/Point */}
                <div className="w-1.5 h-6 bg-green-600 border-x border-white shadow-xl rounded-b-full shadow-green-900/40" />
                {/* Shadow underneath */}
                <div className="w-3 h-1.5 bg-black/20 rounded-full blur-[1px] transform scale-x-150 absolute bottom-[-4px]" />
             </div>
          </div>

          {mapLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EB590E]" />
            </div>
          )}
          
          <div className="absolute bottom-4 right-4 z-10">
            <Button 
                onClick={handleUseCurrentLocation} 
                className="bg-white text-black hover:bg-gray-100 shadow-xl border border-gray-200 rounded-full h-12 px-6"
            >
              <Navigation className="h-4 w-4 mr-2 text-[#EB590E]" /> Use My Location
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
          <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-xl p-4 flex gap-3">
             <MapPin className="h-5 w-5 text-[#EB590E] mt-0.5" />
             <div className="min-w-0">
                <p className="text-xs font-bold text-orange-800 dark:text-orange-200 uppercase mb-1">Pinnned Location</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{currentAddress || "Select a location on map"}</p>
             </div>
          </div>

          <div>
            <Label className="text-sm font-bold mb-2 block">Primary Address (Street / Area / Landmark)</Label>
            <Input 
              placeholder="Search or drag to update street/area" 
              value={addressFormData.street} 
              onChange={e => setAddressFormData({...addressFormData, street: e.target.value})}
              className="mb-4 h-12 rounded-xl bg-gray-50 dark:bg-gray-800/50"
              required
            />

            <Label className="text-sm font-bold mb-2 block text-orange-600 dark:text-orange-400">Secondary Address (House No. / Flat / Floor)</Label>
            <Input 
              placeholder="E.g. Flat 402, 4th Floor, AppZeto Building" 
              value={addressFormData.additionalDetails} 
              onChange={e => setAddressFormData({...addressFormData, additionalDetails: e.target.value})}
              className="h-12 rounded-xl border-orange-200 dark:border-orange-900/40 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1 block">City</Label>
              <Input 
                value={addressFormData.city} 
                onChange={e => setAddressFormData({...addressFormData, city: e.target.value})} 
                className="h-12 rounded-xl"
                required 
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">State</Label>
              <Input 
                value={addressFormData.state} 
                onChange={e => setAddressFormData({...addressFormData, state: e.target.value})} 
                className="h-12 rounded-xl"
                required 
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Pincode / ZIP</Label>
            <Input 
              placeholder="Pincode" 
              value={addressFormData.zipCode || ""} 
              onChange={e => setAddressFormData({...addressFormData, zipCode: e.target.value})} 
              className="h-12 rounded-xl"
            />
          </div>

          <div>
             <Label className="text-sm font-bold mb-2 block">Save address as</Label>
             <div className="flex gap-2">
               {["Home", "Work", "Other"].map(l => (
                 <Button 
                   key={l}
                   variant={addressFormData.label === l ? "default" : "outline"}
                   onClick={() => setAddressFormData({...addressFormData, label: l})}
                   className="flex-1"
                   style={addressFormData.label === l ? {backgroundColor: '#EB590E', color: 'white'} : {}}
                 >
                   {l}
                 </Button>
               ))}
             </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#1a1a1a] border-t dark:border-gray-800">
          <Button 
            className="w-full h-12 text-white font-bold text-lg" 
            style={{backgroundColor: '#EB590E'}}
            onClick={handleAddressFormSubmit}
            disabled={loadingAddress}
          >
            {loadingAddress ? "Saving..." : "Save Address \u0026 Proceed"}
          </Button>
        </div>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col">
      <div className="flex-shrink-0 bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800 px-4 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">Select Location</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800">
          <button 
            onClick={handleUseCurrentLocation}
            className="w-full flex items-center gap-4 p-4 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Navigation className="h-5 w-5 text-[#EB590E]" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-[#EB590E]">Use Current Location</p>
              <p className="text-xs text-gray-500 line-clamp-1">{currentAddress || "Enable GPS for accuracy"}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Saved Addresses</h2>
            <Button variant="ghost" className="text-[#EB590E] p-0 h-auto font-bold" onClick={handleAddAddressClick}>
              <Plus className="h-4 w-4 mr-1" /> Add New
            </Button>
          </div>

          <div className="space-y-4">
            {addresses.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No addresses saved yet</p>
              </div>
            ) : (
              addresses.map((addr, idx) => {
                const Icon = getAddressIcon(addr)
                return (
                  <button
                    key={getAddressId(addr) || idx}
                    onClick={() => handleSelectSavedAddress(addr)}
                    className="w-full flex items-start gap-4 p-4 bg-slate-50 dark:bg-[#1a1a1a] rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors text-left group"
                  >
                    <div className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                      <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white capitalize">{addr.label || "Address"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                        {[addr.additionalDetails, addr.street, addr.city, addr.state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <div className="h-6 w-6 rounded-full border border-gray-200 dark:border-gray-700 mt-2 flex items-center justify-center group-hover:border-[#EB590E]">
                       <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-[#EB590E]" />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-short {
          animation: bounce-short 1s infinite ease-in-out;
        }
      `}</style>
    </AnimatedPage>
  )
}
