
import { useState, useEffect } from 'react';
import { hotelService, bookingService, reviewService } from '../../../services/apiService';
import walletService from '../../../services/walletService';
import toast from 'react-hot-toast';

const usePartnerDashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    walletBalance: 0,
    approvedProperties: 0,
    pendingProperties: 0,
    rejectedProperties: 0,
    pendingReviews: 0,
    bookingsThisWeek: 0,
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Get User Info
        const userData = JSON.parse(localStorage.getItem('user'));
        setUser(userData);

        // Fetch Data in Parallel
        const [propertiesData, bookingsData, walletData, reviewStats] = await Promise.all([
          hotelService.getMyHotels(),
          bookingService.getPartnerBookings(),
          walletService.getWallet({ viewAs: 'partner' }), // Explicitly specify partner role
          reviewService.getPartnerStats().catch(() => ({ pendingReviews: 0 })) // Handle error gracefully
        ]);

        // 1. Process Properties
        const properties = propertiesData.properties || [];
        const approvedProperties = properties.filter(p => p.status === 'approved').length;
        const pendingProperties = properties.filter(p => p.status === 'pending').length;
        const rejectedProperties = properties.filter(p => p.status === 'rejected').length;

        // 2. Process Bookings
        // API returns an array directly for bookings
        const bookings = Array.isArray(bookingsData) ? bookingsData : (bookingsData.bookings || []);

        // Calculate bookings this week
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const bookingsThisWeek = bookings.filter(b => new Date(b.createdAt) > oneWeekAgo).length;

        // 3. Process Wallet
        // API returns nested wallet object: { wallet: { balance: ... } }
        const walletBalance = walletData.wallet?.balance || 0;

        // 4. Action Items logic
        const actions = [];

        // Check for (Today) - using checkInDate or checkIn
        const today = new Date().toISOString().split('T')[0];
        const pendingCheckIns = bookings.filter(b => {
          const checkIn = b.checkInDate || b.checkIn;
          return checkIn &&
            new Date(checkIn).toISOString().split('T')[0] === today &&
            b.bookingStatus === 'confirmed';
        });

        if (pendingCheckIns.length > 0) {
          actions.push({
            type: 'check-in',
            title: 'Pending Check-ins',
            count: pendingCheckIns.length,
            description: `${pendingCheckIns.length} guests arriving today.`,
            link: '/hotel/bookings'
          });
        }

        if (userData?.partnerApprovalStatus === 'rejected') {
          actions.push({
            type: 'alert',
            title: 'Document Rejected',
            description: 'Your KYC documents were rejected. Please support.',
            link: '/hotel/kyc',
            urgent: true
          });
        }

        setStats({
          totalBookings: bookings.length,
          walletBalance,
          approvedProperties,
          pendingProperties,
          rejectedProperties,
          pendingReviews: reviewStats?.pendingReviews || 0,
          bookingsThisWeek
        });

        // Slice latest 5 bookings
        setRecentBookings(bookings.slice(0, 5));
        setActionItems(actions);

      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
        setError(err.message || 'Failed to load dashboard data');
        toast.error('Could not load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return { stats, recentBookings, actionItems, loading, error, user };
};

export default usePartnerDashboard;
