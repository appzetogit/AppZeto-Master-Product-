import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet, TrendingUp, Download, ArrowUpRight, ArrowDownRight,
    CreditCard, Calendar, CheckCircle, Clock, Loader2, Building2, Users
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const currency = (n) => `₹${(n || 0).toLocaleString()}`;

const FinanceStatCard = ({ title, value, subtext, color, icon: Icon }) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
        <div>
            <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            {subtext && <p className={`text-xs mt-1 ${color}`}>{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '50')} ${color}`}>
            <Icon size={24} />
        </div>
    </div>
);

const AdminFinance = () => {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'withdrawals'
    const [stats, setStats] = useState(null);
    const [requests, setRequests] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [withdrawalFilter, setWithdrawalFilter] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'success', onConfirm: () => { } });

    // Action Logic
    const [actionData, setActionData] = useState(null); // { id: 'WD123', type: 'approve' | 'reject' }
    const [actionInput, setActionInput] = useState(''); // Transaction Hash or Rejection Reason

    const commissionRate = 0.20;

    const fetchData = async () => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;
        try {
            setLoading(true);
            const [dash, reqs, withdraws] = await Promise.all([
                adminService.getDashboardStats(),
                adminService.getPropertyRequests(),
                adminService.getWithdrawals({ limit: 50, status: withdrawalFilter === 'all' ? '' : withdrawalFilter })
            ]);

            if (dash.success) setStats(dash.stats);
            if (reqs.success) setRequests(reqs.hotels || []);
            if (withdraws.success) setWithdrawals(withdraws.withdrawals || []);
        } catch (error) {
            if (error.response?.status !== 401) {
                toast.error('Failed to load finance data');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [withdrawalFilter]);

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
            fetchData(); // Refresh list
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to process request');
        }
    };

    // Filter Logic
    const filteredRequests = useMemo(() => {
        if (statusFilter === 'All Status') return requests;
        return requests.filter(s => (statusFilter === 'Active' ? s.status === 'approved' : s.status !== 'approved'));
    }, [requests, statusFilter]);

    return (
        <div className="space-y-6">
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
                    <h2 className="text-2xl font-bold text-gray-900">Finance & Payouts</h2>
                    <p className="text-gray-500 text-sm">Manage revenue, commissions, and partner withdrawals.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('withdrawals')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'withdrawals' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Withdrawals
                    </button>
                </div>
            </div>

            {activeTab === 'overview' ? (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <FinanceStatCard
                            title="Total Revenue"
                            value={currency(stats?.totalRevenue)}
                            subtext=""
                            color="text-green-600"
                            icon={TrendingUp}
                        />
                        <FinanceStatCard
                            title="Platform Subs"
                            value={currency(0)}
                            subtext=""
                            color="text-blue-600"
                            icon={Building2}
                        />
                        <FinanceStatCard
                            title="Market Price Subs"
                            value={currency(0)}
                            subtext=""
                            color="text-orange-600"
                            icon={TrendingUp}
                        />
                        <FinanceStatCard
                            title="Commissions (20%)"
                            value={currency(Math.round((stats?.totalRevenue || 0) * commissionRate))}
                            subtext={`From ${stats?.confirmedBookings || 0} bookings`}
                            color="text-purple-600"
                            icon={Wallet}
                        />
                    </div>

                    {/* Pending Property Requests */}
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[300px]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 text-lg">Pending Property Requests</h3>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="text-sm border border-gray-200 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-black"
                            >
                                <option>All Status</option>
                                <option>Active</option>
                                <option>Pending</option>
                            </select>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600">Property Name</th>
                                    <th className="p-4 font-semibold text-gray-600">Owner</th>
                                    <th className="p-4 font-semibold text-gray-600">City</th>
                                    <th className="p-4 font-semibold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <AnimatePresence>
                                    {loading ? (
                                        [1, 2, 3].map(i => (
                                            <tr key={i}>
                                                <td colSpan="4" className="p-4">
                                                    <div className="h-10 bg-gray-50 animate-pulse rounded-lg"></div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : filteredRequests.map((h) => (
                                        <motion.tr
                                            key={h._id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="p-4 font-medium text-gray-900">{h.name}</td>
                                            <td className="p-4">{h.ownerId?.name || 'Partner'}</td>
                                            <td className="p-4">{h.address?.city || '—'}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                                                    {h.status}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                                {(!loading && filteredRequests.length === 0) && (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-gray-400">No pending requests found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                /* --- WITHDRAWALS LIST --- */
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">Withdrawal Requests</h3>
                            <p className="text-xs text-gray-500">Manage payout requests from partners</p>
                        </div>
                        <div className="flex gap-2">
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
                            <thead className="bg-gray-50 border-b border-gray-100">
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
                                {loading && activeTab === 'withdrawals' ? (
                                    [1, 2, 3, 4].map(i => (
                                        <tr key={i}>
                                            <td colSpan="6" className="p-4">
                                                <div className="h-12 bg-gray-50 animate-pulse rounded-lg"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    withdrawals.length > 0 ? withdrawals.map((w) => (
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
                                                    <Wallet size={48} className="text-gray-200 mb-3" />
                                                    <p>No withdrawal requests found.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFinance;
