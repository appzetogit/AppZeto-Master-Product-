
import React from 'react';
import { useLenis } from '../../shared/hooks/useLenis';
import PartnerHeader from '../components/PartnerHeader';
import usePartnerDashboard from '../hooks/usePartnerDashboard';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import RecentBookingsTable from '../components/dashboard/RecentBookingsTable';
import ActionRequired from '../components/dashboard/ActionRequired';
import { Calendar, Wallet, Building2, Star, Plus, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PartnerDashboard = () => {
    useLenis();
    const navigate = useNavigate();
    const { stats, recentBookings, actionItems, loading, user } = usePartnerDashboard();

    // Init Notifications — fire when user data is available (partner is logged in)
    React.useEffect(() => {
        if (user) {
            // Dispatch the FCM register event so App.jsx can handle registration centrally
            // This is a backup for when: partner was already logged in when the page first loaded
            try {
                window.dispatchEvent(new CustomEvent('fcm:register'));
            } catch (error) {
                console.warn('[FCM] Could not dispatch register event from PartnerDashboard:', error);
            }
        }
    }, [user]);

    // Helper for formatting Currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#004F4D] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-24">
            <PartnerHeader />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header & Greeting */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-[#003836]">
                            Welcome back, {user?.name?.split(' ')[0] || 'Partner'}! 👋
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm font-medium">
                            Here's what's happening with your properties today.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Add Property - High Visible */}
                        <button
                            onClick={() => navigate('/hotel/join')}
                            className="flex items-center gap-2 bg-[#004F4D] hover:bg-[#003836] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95"
                        >
                            <Plus size={18} />
                            Add Property
                        </button>
                    </div>
                </div>

                {/* Priority Actions */}
                <ActionRequired items={actionItems} />

                {/* KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <DashboardStatCard
                        icon={Calendar}
                        label="Total Bookings"
                        value={stats.totalBookings}
                        subtext={stats.bookingsThisWeek > 0 ? `+${stats.bookingsThisWeek} this week` : 'No new bookings this week'}
                        actionLabel="View All"
                        onAction={() => navigate('/hotel/bookings')}
                    />

                    <DashboardStatCard
                        icon={Wallet}
                        label="Wallet Balance"
                        value={formatCurrency(stats.walletBalance)}
                        subtext="Available to withdraw"
                        actionLabel="Withdraw"
                        onAction={() => navigate('/hotel/wallet')}
                        colorClass="text-blue-600"
                    />

                    <DashboardStatCard
                        icon={CheckCircle2}
                        label="Approved"
                        value={stats.approvedProperties}
                        subtext="Online & Bookable"
                        actionLabel="Manage"
                        onAction={() => navigate('/hotel/properties')}
                        colorClass="text-green-600"
                    />

                    <DashboardStatCard
                        icon={Clock}
                        label="Pending"
                        value={stats.pendingProperties}
                        subtext="Under verification"
                        actionLabel="Check Status"
                        onAction={() => navigate('/hotel/properties')}
                        colorClass="text-orange-500"
                    />

                    <DashboardStatCard
                        icon={XCircle}
                        label="Rejected"
                        value={stats.rejectedProperties}
                        subtext="Needs attention"
                        actionLabel="Fix Issues"
                        onAction={() => navigate('/hotel/properties')}
                        colorClass="text-red-500"
                    />

                    <DashboardStatCard
                        icon={Star}
                        label="Pending Reviews"
                        value={stats.pendingReviews}
                        subtext="Action required"
                        actionLabel="Reply"
                        onAction={() => navigate('/hotel/reviews')}
                        colorClass="text-purple-600"
                    />
                </div>

                {/* Recent Activity Section */}
                <RecentBookingsTable bookings={recentBookings} />

            </main>
        </div>
    );
};

export default PartnerDashboard;
