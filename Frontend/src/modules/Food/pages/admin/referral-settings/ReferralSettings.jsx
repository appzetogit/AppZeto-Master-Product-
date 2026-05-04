import { useEffect, useState } from "react"
import { Save, Loader2, Gift } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { adminAPI } from "@food/api"
import { toast } from "sonner"

const debugError = (...args) => {}

const defaultSettings = {
  user: {
    referrerReward: "",
    refereeReward: "",
    limit: "",
  },
  delivery: {
    referrerReward: "",
    refereeReward: "",
    limit: "",
  },
  isActive: true,
}

const mapSettingsFromApi = (value) => ({
  user: {
    referrerReward: value?.user?.referrerReward ?? "",
    refereeReward: value?.user?.refereeReward ?? "",
    limit: value?.user?.limit ?? "",
  },
  delivery: {
    referrerReward: value?.delivery?.referrerReward ?? "",
    refereeReward: value?.delivery?.refereeReward ?? "",
    limit: value?.delivery?.limit ?? "",
  },
  isActive: value?.isActive !== false,
})

export default function ReferralSettings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState(defaultSettings)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getReferralSettings()
      const referralSettings = res?.data?.data?.referralSettings
      if (res?.data?.success && referralSettings) {
        setSettings(mapSettingsFromApi(referralSettings))
      } else {
        setSettings(defaultSettings)
      }
    } catch (e) {
      debugError("Error fetching referral settings:", e)
      toast.error("Failed to load referral settings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const toNumberOrZero = (value) => (value === "" ? 0 : Number(value))

  const handleSave = async () => {
    try {
      setSaving(true)
      const body = {
        user: {
          referrerReward: toNumberOrZero(settings.user.referrerReward),
          refereeReward: toNumberOrZero(settings.user.refereeReward),
          limit: toNumberOrZero(settings.user.limit),
        },
        delivery: {
          referrerReward: toNumberOrZero(settings.delivery.referrerReward),
          refereeReward: toNumberOrZero(settings.delivery.refereeReward),
          limit: toNumberOrZero(settings.delivery.limit),
        },
        isActive: settings.isActive !== false,
      }
      const res = await adminAPI.createOrUpdateReferralSettings(body)
      if (res?.data?.success) {
        toast.success("Referral settings saved successfully")
        const saved = res?.data?.data?.referralSettings
        setSettings(saved ? mapSettingsFromApi(saved) : defaultSettings)
      } else {
        toast.error(res?.data?.message || "Failed to save referral settings")
      }
    } catch (e) {
      debugError("Error saving referral settings:", e)
      toast.error(e?.response?.data?.message || "Failed to save referral settings")
    } finally {
      setSaving(false)
    }
  }

  const onChange = (section, key) => (e) => {
    const value = String(e.target.value ?? "")
      .replace(/[^\d.]/g, "")
      .replace(/^0+(\d)/, "$1")

    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }))
  }

  const renderSection = (title, description, sectionKey, referrerPlaceholder, refereePlaceholder, limitPlaceholder) => (
    <div className="space-y-4 rounded-xl border border-slate-200 p-4">
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">Amount for referrer (Rs.)</label>
        <input
          value={settings[sectionKey].referrerReward}
          onChange={onChange(sectionKey, "referrerReward")}
          inputMode="numeric"
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
          placeholder={referrerPlaceholder}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">Amount for referee (Rs.)</label>
        <input
          value={settings[sectionKey].refereeReward}
          onChange={onChange(sectionKey, "refereeReward")}
          inputMode="numeric"
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
          placeholder={refereePlaceholder}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">Max credits per referrer</label>
        <input
          value={settings[sectionKey].limit}
          onChange={onChange(sectionKey, "limit")}
          inputMode="numeric"
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
          placeholder={limitPlaceholder}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600">
            <Gift className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Referral Settings</h1>
        </div>
        <p className="text-sm text-slate-600">
          Configure separate referrer and referee rewards with limits in a clean, structured flow.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Configuration</h2>
              <p className="mt-1 text-sm text-slate-500">
                These values apply instantly to new referrals.
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 bg-orange-600 text-white hover:bg-orange-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {renderSection(
                "User Referral",
                "Define how much the existing user earns for sharing and how much the new user gets after joining.",
                "user",
                "e.g. 100",
                "e.g. 50",
                "e.g. 10",
              )}
              {renderSection(
                "Delivery Partner Referral",
                "Define how much the sharing delivery partner earns and how much the joining partner receives.",
                "delivery",
                "e.g. 1000",
                "e.g. 500",
                "e.g. 5",
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
