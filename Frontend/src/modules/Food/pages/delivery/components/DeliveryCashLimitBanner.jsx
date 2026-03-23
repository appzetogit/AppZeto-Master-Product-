import { Button } from "@food/components/ui/button"

export default function DeliveryCashLimitBanner({ isVisible, onDepositClick }) {
  if (!isVisible) return null

  return (
    <div className="mx-3 mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-red-700">Deposit cash to continue</p>
        <Button
          type="button"
          onClick={onDepositClick}
          className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
        >
          Deposit now
        </Button>
      </div>
    </div>
  )
}
