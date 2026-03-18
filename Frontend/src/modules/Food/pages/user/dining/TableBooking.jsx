import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { Button } from "@food/components/ui/button"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { diningAPI, restaurantAPI } from "@food/api"
import Loader from "@food/components/Loader"

const buildDates = (count = 7) =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    return date
  })

const formatTimeValue = (value) => {
  if (!value) return null
  if (/[ap]m/i.test(value)) return value.toUpperCase()
  const date = new Date(`2000-01-01T${String(value).padStart(5, "0")}`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
}

const parseTimeToMinutes = (value) => {
  if (!value) return null
  const match = String(value).match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

const getDayName = (date) => date.toLocaleDateString("en-US", { weekday: "long" })

const buildSlots = (timing) => {
  if (!timing || timing.isOpen === false) return []
  const opening = parseTimeToMinutes(timing.openingTime)
  const closing = parseTimeToMinutes(timing.closingTime)
  if (opening === null || closing === null) return []

  const slots = []
  let cursor = opening
  const end = closing > opening ? closing : opening + 240

  while (cursor <= end && slots.length < 16) {
    const hours = Math.floor((cursor % (24 * 60)) / 60)
    const minutes = cursor % 60
    slots.push(formatTimeValue(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`))
    cursor += 30
  }

  return slots
}

const getMealPeriod = (slot) => {
  if (!slot) return "all"
  const normalized = String(slot).toUpperCase()
  const match = normalized.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/)
  if (!match) return "all"

  let hour = Number(match[1])
  const minute = Number(match[2])
  const meridiem = match[3]

  if (meridiem === "PM" && hour !== 12) hour += 12
  if (meridiem === "AM" && hour === 12) hour = 0

  const totalMinutes = hour * 60 + minute
  if (totalMinutes < 17 * 60) return "lunch"
  return "dinner"
}

const getOfferLabel = (slot) => {
  const period = getMealPeriod(slot)
  return period === "lunch" ? "Lunch" : "Carnival"
}

export default function TableBooking() {
  const { slug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [restaurant, setRestaurant] = useState(location.state?.restaurant || null)
  const [loading, setLoading] = useState(!location.state?.restaurant)
  const [outletTimings, setOutletTimings] = useState({})
  const [selectedGuests, setSelectedGuests] = useState(location.state?.guestCount || 2)
  const [selectedDate, setSelectedDate] = useState(() => {
    const initial = location.state?.selectedDate ? new Date(location.state.selectedDate) : new Date()
    return Number.isNaN(initial.getTime()) ? new Date() : initial
  })
  const [selectedSlot, setSelectedSlot] = useState(location.state?.selectedTime || null)
  const [selectedMealPeriod, setSelectedMealPeriod] = useState("lunch")

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        setLoading(true)
        const response = await diningAPI.getRestaurantBySlug(slug)
        if (response?.data?.success) {
          const apiRestaurant = response?.data?.data?.restaurant || response?.data?.data
          setRestaurant(apiRestaurant || null)

          const restaurantId = apiRestaurant?._id || apiRestaurant?.id || slug
          const timingsResponse = await restaurantAPI.getOutletTimingsByRestaurantId(restaurantId)
          setOutletTimings(timingsResponse?.data?.data?.outletTimings || {})
        }
      } catch {
        setRestaurant(null)
      } finally {
        setLoading(false)
      }
    }

    if (location.state?.restaurant) {
      const restaurantId = location.state.restaurant?._id || location.state.restaurant?.id || slug
      restaurantAPI
        .getOutletTimingsByRestaurantId(restaurantId)
        .then((response) => setOutletTimings(response?.data?.data?.outletTimings || {}))
        .catch(() => setOutletTimings({}))
      setLoading(false)
      return
    }

    fetchRestaurant()
  }, [location.state?.restaurant, slug])

  const dates = useMemo(() => buildDates(7), [])
  const selectedDayTiming = useMemo(() => outletTimings?.[getDayName(selectedDate)] || null, [outletTimings, selectedDate])
  const allSlots = useMemo(() => buildSlots(selectedDayTiming), [selectedDayTiming])
  const filteredSlots = useMemo(
    () => allSlots.filter((slot) => getMealPeriod(slot) === selectedMealPeriod),
    [allSlots, selectedMealPeriod]
  )

  useEffect(() => {
    if (!selectedSlot && filteredSlots.length > 0) {
      setSelectedSlot(filteredSlots[0])
      return
    }

    if (selectedSlot && filteredSlots.length > 0 && !filteredSlots.includes(selectedSlot)) {
      setSelectedSlot(filteredSlots[0])
      return
    }

    if (filteredSlots.length === 0) {
      setSelectedSlot(null)
    }
  }, [filteredSlots, selectedSlot])

  useEffect(() => {
    if (allSlots.length === 0) return
    const hasLunch = allSlots.some((slot) => getMealPeriod(slot) === "lunch")
    const hasDinner = allSlots.some((slot) => getMealPeriod(slot) === "dinner")

    if (selectedMealPeriod === "lunch" && !hasLunch && hasDinner) {
      setSelectedMealPeriod("dinner")
    }
    if (selectedMealPeriod === "dinner" && !hasDinner && hasLunch) {
      setSelectedMealPeriod("lunch")
    }
  }, [allSlots, selectedMealPeriod])

  if (loading) return <Loader />
  if (!restaurant) return <div className="p-6 text-center">Restaurant not found</div>

  const handleProceed = () => {
    if (!selectedSlot) return
    navigate("/food/user/dining/book-confirmation", {
      state: {
        restaurant,
        guests: selectedGuests,
        date: selectedDate,
        timeSlot: selectedSlot,
        discount: selectedSlot,
      },
    })
  }

  return (
    <AnimatedPage className="min-h-screen bg-[#f5f6fb] pb-28">
      <div className="relative overflow-hidden bg-gradient-to-b from-[#ffe7c6] via-[#fff1d7] to-[#f5f6fb] px-4 pb-10 pt-5">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_65%)]" />

        <div className="relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#383838] shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="mt-6 text-center">
            <h1 className="text-[30px] font-black tracking-tight text-[#25314a]">Book a table</h1>
            <p className="mt-1 text-sm font-medium text-[#636363]">{restaurant.name || restaurant.restaurantName}</p>
          </div>
        </div>
      </div>

      <div className="-mt-4 space-y-4 px-4">
        <section className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[#2f3545]">Select number of guests</span>
            <div className="relative">
              <select
                value={selectedGuests}
                onChange={(event) => setSelectedGuests(parseInt(event.target.value, 10))}
                className="appearance-none rounded-full bg-[#f7f7fb] py-2 pl-4 pr-9 text-sm font-semibold text-[#404040] outline-none"
              >
                {Array.from({ length: restaurant.diningSettings?.maxGuests || 10 }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#808080]" />
            </div>
          </div>
        </section>

        <section className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <h3 className="text-sm font-medium text-[#2f3545]">Select date</h3>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {dates.slice(0, 3).map((date, index) => {
              const active = selectedDate.toDateString() === date.toDateString()
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`rounded-[18px] border px-3 py-4 text-center transition-colors ${
                    active
                      ? "border-[#ef8f98] bg-[#fffaf9]"
                      : "border-[#ececf2] bg-white"
                  }`}
                >
                  <span className="block text-sm font-medium text-[#444b5f]">
                    {index === 0 ? "Today" : index === 1 ? "Tomorrow" : date.toLocaleDateString("en-IN", { weekday: "long" })}
                  </span>
                  <span className="mt-1 block text-sm text-[#7b8191]">
                    {date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <h3 className="text-sm font-medium text-[#2f3545]">Select time of day</h3>

          <div className="mt-4 flex gap-2">
            {[
              { id: "lunch", label: "Lunch" },
              { id: "dinner", label: "Dinner" },
            ].map((period) => {
              const active = selectedMealPeriod === period.id
              return (
                <button
                  key={period.id}
                  onClick={() => setSelectedMealPeriod(period.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-[#ef8f98] bg-white text-[#d64f63]"
                      : "border-[#ececf2] bg-[#fafafc] text-[#666f82]"
                  }`}
                >
                  {period.label}
                </button>
              )
            })}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {filteredSlots.length === 0 ? (
              <div className="col-span-3 rounded-[18px] border border-dashed border-[#e5e7ef] px-4 py-8 text-center text-sm text-[#7c8394]">
                No {selectedMealPeriod} slots available for the selected date.
              </div>
            ) : (
              filteredSlots.map((slot) => {
                const active = selectedSlot === slot
                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-[16px] border px-3 py-4 text-center transition-colors ${
                      active
                        ? "border-[#ef8f98] bg-[#fffaf9]"
                        : "border-[#ececf2] bg-white"
                    }`}
                  >
                    <span className="block text-sm font-medium text-[#334155]">{slot}</span>
                    <span className="mt-1 block text-xs font-medium text-[#2d5ea8]">
                      {getOfferLabel(slot)}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-[18px] bg-white px-4 py-5 text-center shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <p className="text-sm text-[#6f7687]">
            Select your preferred time slot to view available booking options
          </p>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-[#e6e7ef] bg-[#f5f6fb]/95 p-4 backdrop-blur-xl">
        <Button
          disabled={!selectedSlot}
          onClick={handleProceed}
          className={`h-14 w-full rounded-2xl text-lg font-bold ${
            selectedSlot
              ? "bg-[#8f97ae] text-white hover:bg-[#7f879f]"
              : "bg-[#a4abba] text-white/95"
          }`}
        >
          Proceed
        </Button>
      </div>
    </AnimatedPage>
  )
}
