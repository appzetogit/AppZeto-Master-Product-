import { useState, useEffect } from "react";
import { Building } from "lucide-react";
import DisbursementPage from "@food/components/admin/disbursement/DisbursementPage";
import { adminAPI } from "@/services/api";
import { toast } from "sonner";

export default function RestaurantDisbursement() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const tabs = ["All", "Pending", "Approved", "Rejected"];

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getWithdrawals();
      const records = res?.data?.data?.requests || [];
      
      const mapped = records.map(w => ({
        id: w._id,
        restaurantName: w.restaurantId?.restaurantName || 'Unknown',
        totalAmount: w.amount,
        createdAt: new Date(w.createdAt).toLocaleString(),
        bankDetails: w.bankDetails,
        // Status normalization for UI: Backend (pending, approved, rejected) -> UI (Pending, Completed, Canceled)
        status: w.status === 'approved' ? 'Completed' : w.status === 'rejected' ? 'Canceled' : 'Pending',
        rawStatus: w.status
      }));
      
      setWithdrawals(mapped);
    } catch (error) {
      console.error("Failed to fetch withdrawals:", error);
      toast.error("Failed to load withdrawal requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    const status = action === 'approve' ? 'approved' : 'rejected';
    const confirmMsg = `Are you sure you want to ${action} this withdrawal request?`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      await adminAPI.updateWithdrawalStatus(id, { status });
      toast.success(`Withdrawal ${status} successfully`);
      fetchWithdrawals();
    } catch (error) {
       console.error(`Failed to ${action} withdrawal:`, error);
       toast.error(error.response?.data?.message || `Failed to ${action} withdrawal`);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  return (
    <DisbursementPage
      title="Restaurant Disbursement"
      icon={Building}
      tabs={tabs}
      disbursements={withdrawals}
      count={withdrawals.length}
      loading={loading}
      onRefresh={fetchWithdrawals}
      onAction={handleAction}
    />
  );
}
