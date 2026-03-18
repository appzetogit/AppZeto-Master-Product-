import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Eye, Loader2, Search, XCircle } from "lucide-react"
import { adminAPI } from "@food/api"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@food/components/ui/dialog"

const debugError = (...args) => {}

const getItemCreatedMs = (item = {}) => {
  const direct = [item.requestedAt, item.createdAt, item.updatedAt]
    .map((v) => new Date(v).getTime())
    .find((ms) => Number.isFinite(ms) && ms > 0)
  return direct || 0
}

const formatAddonId = (id) => {
  if (!id) return "ADDON000000"
  const idString = String(id)
  const digits = idString.match(/\d+/g)
  const combined = digits ? digits.join("") : ""
  const lastDigits = combined ? combined.slice(-6).padStart(6, "0") : "000000"
  return `ADDON${lastDigits}`
}

const getAddonTitle = (addon) => addon?.draft?.name || addon?.name || "Unnamed Add-on"
const getAddonImage = (addon) =>
  addon?.draft?.image ||
  addon?.draft?.images?.[0] ||
  addon?.published?.image ||
  addon?.published?.images?.[0] ||
  "https://via.placeholder.com/40"

export default function AddonsList() {
  const [activeTab, setActiveTab] = useState("pending") // pending | approved | rejected
  const [searchQuery, setSearchQuery] = useState("")
  const [addons, setAddons] = useState([])
  const [loading, setLoading] = useState(true)
  const [submittingAction, setSubmittingAction] = useState(false)

  const [selectedAddon, setSelectedAddon] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const [rejectingAddon, setRejectingAddon] = useState(null)
  const [rejectionReason, setRejectionReason] = useState("")

  useEffect(() => {
    const fetchAddons = async () => {
      try {
        setLoading(true)
        const response = await adminAPI.getRestaurantAddons({
          approvalStatus: activeTab,
          search: searchQuery?.trim() ? searchQuery.trim() : undefined,
          limit: 200,
          page: 1,
        })
        const data = response?.data?.data?.addons || response?.data?.addons || []
        setAddons(Array.isArray(data) ? data : [])
      } catch (error) {
        debugError("Error fetching addons:", error)
        toast.error("Failed to load restaurant add-ons")
        setAddons([])
      } finally {
        setLoading(false)
      }
    }

    const t = setTimeout(fetchAddons, 250)
    return () => clearTimeout(t)
  }, [activeTab, searchQuery])

  const filteredAddons = useMemo(() => {
    const result = Array.isArray(addons) ? [...addons] : []
    result.sort((a, b) => getItemCreatedMs(b) - getItemCreatedMs(a))
    return result
  }, [addons])

  const countLabel = filteredAddons.length

  const handleViewDetails = (addon) => {
    setSelectedAddon(addon)
    setShowDetailModal(true)
  }

  const handleApprove = async (addon) => {
    const id = addon?.id || addon?._id
    if (!id) return
    try {
      setSubmittingAction(true)
      await adminAPI.approveRestaurantAddon(String(id))
      toast.success("Add-on approved")
      setAddons((prev) => (prev || []).filter((a) => String(a.id || a._id) !== String(id)))
    } catch (error) {
      debugError("Approve add-on failed:", error)
      toast.error(error?.response?.data?.message || "Failed to approve add-on")
    } finally {
      setSubmittingAction(false)
    }
  }

  const openReject = (addon) => {
    setRejectingAddon(addon)
    setRejectionReason("")
  }

  const submitReject = async () => {
    const id = rejectingAddon?.id || rejectingAddon?._id
    if (!id) return
    if (!rejectionReason.trim()) {
      toast.error("Please enter a rejection reason")
      return
    }
    try {
      setSubmittingAction(true)
      await adminAPI.rejectRestaurantAddon(String(id), rejectionReason.trim())
      toast.success("Add-on rejected")
      setAddons((prev) => (prev || []).filter((a) => String(a.id || a._id) !== String(id)))
      setRejectingAddon(null)
    } catch (error) {
      debugError("Reject add-on failed:", error)
      toast.error(error?.response?.data?.message || "Failed to reject add-on")
    } finally {
      setSubmittingAction(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Restaurant add-ons</h1>
            <div className="text-sm text-slate-500 mt-1">Approve or reject restaurant add-ons (draft → published).</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                activeTab === "pending"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("approved")}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                activeTab === "approved"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Approved
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rejected")}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                activeTab === "rejected"
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Rejected
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search add-ons or restaurant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            />
          </div>
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold">{countLabel}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  SL
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Restaurant
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                      <p className="text-sm text-slate-500">Loading add-ons...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAddons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-lg font-semibold text-slate-700 mb-1">No Data Found</p>
                      <p className="text-sm text-slate-500">No add-ons match your search</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAddons.map((addon, index) => (
                  <tr key={String(addon.id || addon._id)} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-700">{index + 1}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                        <img
                          src={getAddonImage(addon)}
                          alt={getAddonTitle(addon)}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/40"
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">{getAddonTitle(addon)}</span>
                        <span className="text-xs text-slate-500">ID #{formatAddonId(addon.id || addon._id)}</span>
                        {addon?.approvalStatus ? (
                          <span className="text-xs text-slate-400 mt-0.5 capitalize">{addon.approvalStatus}</span>
                        ) : null}
                        {addon?.rejectionReason ? (
                          <span className="text-xs text-slate-500 mt-0.5 line-clamp-1">{addon.rejectionReason}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-900">{addon?.restaurant?.name || "-"}</span>
                        {addon?.restaurant?.ownerPhone ? (
                          <span className="text-xs text-slate-500">{addon.restaurant.ownerPhone}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-900">
                        ₹{Number(addon?.draft?.price ?? addon?.price ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleViewDetails(addon)}
                          className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {activeTab === "pending" ? (
                          <>
                            <button
                              onClick={() => handleApprove(addon)}
                              disabled={submittingAction}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => openReject(addon)}
                              disabled={submittingAction}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <DialogTitle className="text-lg font-semibold text-slate-900">Add-on Details</DialogTitle>
          </DialogHeader>
          {selectedAddon && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <img
                  src={getAddonImage(selectedAddon)}
                  alt={getAddonTitle(selectedAddon)}
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/64"
                  }}
                />
                <div>
                  <p className="text-lg font-semibold text-slate-900">{getAddonTitle(selectedAddon)}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    ID #{formatAddonId(selectedAddon.id || selectedAddon._id)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p>
                  <span className="font-semibold text-slate-700">Restaurant:</span>{" "}
                  <span className="text-slate-900">{selectedAddon?.restaurant?.name || "-"}</span>
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Price:</span>{" "}
                  <span className="text-slate-900">₹{Number(selectedAddon?.draft?.price ?? 0).toFixed(2)}</span>
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Available:</span>{" "}
                  <span className="text-slate-900">{selectedAddon?.isAvailable ? "Yes" : "No"}</span>
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Approval:</span>{" "}
                  <span className="text-slate-900 capitalize">{selectedAddon?.approvalStatus || "-"}</span>
                </p>
              </div>

              {selectedAddon?.draft?.description ? (
                <p className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold text-slate-800">Description:</span> {selectedAddon.draft.description}
                </p>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectingAddon)} onOpenChange={(open) => !open && setRejectingAddon(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Reject add-on</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-slate-700">Provide a clear reason (shown to restaurant).</div>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              placeholder="e.g., Not allowed item, unclear name, price mismatch..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingAddon(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReject}
                disabled={submittingAction}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingAction ? "Submitting..." : "Reject"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

