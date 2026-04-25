import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee, TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft,
  FileText, Download, CheckCircle, ArrowDownRight, Loader2
} from 'lucide-react';
import adminService from '../../services/adminService';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../../app/admin/components/ConfirmationModal';

const FinanceAndPayoutsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Overview Data
  const [stats, setStats] = useState({
    adminBalance: 0,
    totalRevenue: 0,
    totalEarnings: 0,
    totalTax: 0,
    totalPayouts: 0
  });
  const [transactions, setTransactions] = useState([]);

  // Withdrawal Data
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState('pending');

  // Action Logic
  const [actionData, setActionData] = useState(null); // { id: 'WD123', type: 'approve' | 'reject' }
  const [actionInput, setActionInput] = useState(''); // Transaction Hash or Rejection Reason
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'success', onConfirm: () => { } });

  // Fetch Overview Data
  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const res = await adminService.getFinanceStats();
        if (res.success) {
          setStats(res.stats);
          setTransactions(res.transactions);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load finance stats');
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'overview') {
      fetchOverview();
    }
  }, [activeTab]);

  // Fetch Withdrawals Data
  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
        // Don't show full screen loader for tab switch, maybe just table loader
        const res = await adminService.getWithdrawals({
          limit: 50,
          status: withdrawalFilter === 'all' ? '' : withdrawalFilter
        });
        if (res.success) {
          setWithdrawals(res.withdrawals || []);
        }
      } catch (error) {
        console.error(error);
        // toast.error('Failed to load withdrawals');
      }
    };

    if (activeTab === 'withdrawals') {
      fetchWithdrawals();
    }
  }, [activeTab, withdrawalFilter]);

  // Handle Withdrawal Actions
  const handleProcessWithdrawal = async () => {
    if (!actionInput) {
      toast.error(actionData.type === 'approve' ? 'Please enter Transaction Hash/UTR' : 'Please provide a reason');
      return;
    }

    try {
      await adminService.updateWithdrawalStatus(actionData.id, {
        status: actionData.type === 'approve' ? 'completed' : 'rejected',
        transactionHash: actionData.type === 'approve' ? actionInput : undefined,
        remarks: actionData.type === 'reject' ? actionInput : undefined
      });

      toast.success(`Withdrawal ${actionData.type === 'approve' ? 'Approved' : 'Rejected'} Successfully`);
      setActionData(null);
      setActionInput('');
      // Refresh list
      const res = await adminService.getWithdrawals({
        limit: 50,
        status: withdrawalFilter === 'all' ? '' : withdrawalFilter
      });
      if (res.success) setWithdrawals(res.withdrawals || []);

    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process request');
    }
  };

  const currency = (val) => `₹${(val || 0).toLocaleString()}`;

  const StatCard = ({ title, value, icon: Icon, colorClass, subValue }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass.replace('text-', 'bg-')}`}>
        <Icon size={64} />
      </div>
      <div className="relative z-10">
        <div className={`p-3 rounded-lg w-fit mb-4 ${colorClass.replace('text-', 'bg-').replace('600', '50')}`}>
          <Icon size={24} className={colorClass} />
        </div>
        <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-1">
          <IndianRupee size={20} strokeWidth={2.5} />
          {value?.toLocaleString()}
        </h3>
        {subValue && <p className="text-xs text-gray-400 mt-2">{subValue}</p>}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        {...modalConfig}
      />

      {/* Action Modals */}
      <AnimatePresence>
        {actionData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className={`p-4 ${actionData.type === 'approve' ? 'bg-green-600' : 'bg-red-600'} text-white flex justify-between items-center`}>
                <h3 className="font-bold text-lg">{actionData.type === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}</h3>
                <button onClick={() => setActionData(null)} className="text-white/80 hover:text-white">&times;</button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  {actionData.type === 'approve'
                    ? 'Enter the bank transaction reference number (UTR/Ref ID) to confirm payment.'
                    : 'Please provide a reason for rejecting this withdrawal request. Taking this action will refund the amount to the partner wallet.'}
                </p>

                {actionData.type === 'approve' ? (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Transaction UTR / Ref ID</label>
                    <input
                      type="text"
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                      placeholder="e.g. UPI1234567890"
                      className="w-full p-3 border border-gray-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Rejection Reason</label>
                    <textarea
                      value={actionInput}
                      onChange={(e) => setActionInput(e.target.value)}
                      placeholder="e.g. Incorrect bank details"
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none min-h-[100px]"
                      autoFocus
                    />
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setActionData(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessWithdrawal}
                    className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg ${actionData.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {actionData.type === 'approve' ? 'Confirm Payment' : 'Reject Request'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header with Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Payouts</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor platform earnings, wallet balance, and partner payouts.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-white border border-gray-200 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'withdrawals' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Withdrawals
            </button>
          </div>

          <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-colors">
            <Download size={16} />
            <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Wallet Balance"
                  value={stats.adminBalance}
                  icon={Wallet}
                  colorClass="text-blue-600"
                  subValue="Available for withdrawal"
                />
                <StatCard
                  title="Total Commission"
                  value={stats.totalEarnings}
                  icon={TrendingUp}
                  colorClass="text-green-600"
                  subValue="Net platform income"
                />
                <StatCard
                  title="Gross Booking Value"
                  value={stats.totalRevenue}
                  icon={ArrowUpRight}
                  colorClass="text-purple-600"
                  subValue="Total transaction volume"
                />
                <StatCard
                  title="Total Payouts"
                  value={stats.totalPayouts}
                  icon={ArrowDownLeft}
                  colorClass="text-orange-600"
                  subValue="Disbursed to partners"
                />
              </div>

              {/* Recent Transactions Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <FileText size={18} className="text-gray-400" />
                    Recent Financial Transactions
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                        <th className="px-6 py-4">Transaction / Booking ID</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Gross Amount</th>
                        <th className="px-6 py-4">Commission</th>
                        <th className="px-6 py-4">Tax</th>
                        <th className="px-6 py-4">Partner Payout</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-12 text-center text-gray-400 text-sm">
                            No financial transactions found.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((t) => (
                          <tr key={t._id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-700 text-sm">#{t.bookingId}</span>
                                <span className="text-[10px] text-gray-400 mt-0.5">
                                  {t.propertyId?.propertyName || 'Unknown Property'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(t.createdAt).toLocaleDateString()} <br />
                              <span className="text-[10px] text-gray-400">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {currency(t.totalAmount)}
                            </td>
                            <td className="px-6 py-4 font-bold text-green-600">
                              +{currency(t.adminCommission)}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {currency(t.taxes)}
                            </td>
                            <td className="px-6 py-4 text-orange-600">
                              -{currency(t.partnerPayout)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                                                                ${t.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
                                                            `}>
                                {t.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB CONTENT: WITHDRAWALS */}
      {activeTab === 'withdrawals' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-gray-50/50">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Withdrawal Requests</h3>
              <p className="text-xs text-gray-500">Manage payout requests from partners</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['pending', 'completed', 'failed', 'all'].map(status => (
                <button
                  key={status}
                  onClick={() => setWithdrawalFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${withdrawalFilter === status
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-semibold text-gray-500 uppercase text-[10px] tracking-wider">Request ID</th>
                  <th className="p-4 font-semibold text-gray-500 uppercase text-[10px] tracking-wider">Partner Info</th>
                  <th className="p-4 font-semibold text-gray-500 uppercase text-[10px] tracking-wider">Amount</th>
                  <th className="p-4 font-semibold text-gray-500 uppercase text-[10px] tracking-wider">Bank Details</th>
                  <th className="p-4 font-semibold text-gray-500 uppercase text-[10px] tracking-wider">Status</th>
                  <th className="p-4 font-semibold text-right text-gray-500 uppercase text-[10px] tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {withdrawals.length > 0 ? withdrawals.map((w) => (
                  <tr key={w._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-mono text-xs text-gray-500">
                      {w.withdrawalId}
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{w.partnerId?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{w.partnerId?.phone}</div>
                    </td>
                    <td className="p-4 font-black">
                      {currency(w.amount)}
                    </td>
                    <td className="p-4">
                      <div className="text-xs">
                        <span className="font-bold text-gray-700">{w.bankDetails?.bankName}</span>
                        <div className="text-gray-500 font-mono text-[10px]">
                          {w.bankDetails?.accountNumber} ({w.bankDetails?.ifscCode})
                        </div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[150px]">
                          {w.bankDetails?.accountHolderName}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${w.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                          w.status === 'failed' || w.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                            'bg-yellow-50 text-yellow-700 border-yellow-100'
                        }`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {w.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setActionData({ id: w._id, type: 'reject' }); setActionInput(''); }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                            title="Reject"
                          >
                            <ArrowDownRight size={16} />
                          </button>
                          <button
                            onClick={() => { setActionData({ id: w._id, type: 'approve' }); setActionInput(''); }}
                            className="px-3 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 shadow-lg flex items-center gap-1"
                          >
                            <CheckCircle size={14} /> Pay
                          </button>
                        </div>
                      )}
                      {w.status === 'completed' && (
                        <div className="text-[10px] text-green-600 font-mono text-right">
                          Ref: {w.processingDetails?.utrNumber || 'N/A'}
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-gray-400">
                      <div className="flex flex-col items-center">
                        <Wallet size={48} className="text-gray-200 mb-3 opacity-50" />
                        <p>No withdrawal requests found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceAndPayoutsPage;
