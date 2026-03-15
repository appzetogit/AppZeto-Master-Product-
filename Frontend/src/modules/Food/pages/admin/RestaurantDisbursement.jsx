import { Building } from "lucide-react"
import DisbursementPage from "@food/components/admin/disbursement/DisbursementPage"
import { emptyRestaurantDisbursements } from "@food/utils/adminFallbackData"

export default function RestaurantDisbursement() {
  const tabs = ["All", "Pending", "Completed", "Partially completed", "Canceled"]
  
  return (
    <DisbursementPage
      title="Restaurant Disbursement"
      icon={Building}
      tabs={tabs}
      disbursements={emptyRestaurantDisbursements}
      count={emptyRestaurantDisbursements.length}
    />
  )
}

