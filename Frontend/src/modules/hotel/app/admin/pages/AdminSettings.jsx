import React, { useEffect, useState } from 'react';
import {
    Settings, Shield, Bell, CreditCard, ToggleLeft,
    ToggleRight, Save, Globe, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAdminStore from '../store/adminStore';
import adminService from '../../../services/adminService';

const ToggleSwitch = ({ enabled, onChange }) => (
    <button
        onClick={() => onChange(!enabled)}
        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${enabled ? 'bg-black' : 'bg-gray-300'}`}
    >
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
    </button>
);

const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-700">
                <Icon size={18} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

const AdminSettings = () => {
    const admin = useAdminStore(state => state.admin);
    const checkAuth = useAdminStore(state => state.checkAuth);

    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: ''
    });

    const [platformOpen, setPlatformOpen] = useState(true);
    const [maintenance, setMaintenance] = useState(false);
    const [bookingMessage, setBookingMessage] = useState('');
    const [maintenanceTitle, setMaintenanceTitle] = useState('');
    const [maintenanceMessage, setMaintenanceMessage] = useState('');
    const [commission, setCommission] = useState(10);
    const [taxRate, setTaxRate] = useState(12);

    const [loadingSettings, setLoadingSettings] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    const [autoPayout, setAutoPayout] = useState(false);

    // Password Update States
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        if (admin) {
            setProfile({
                name: admin.name || '',
                email: admin.email || '',
                phone: admin.phone || ''
            });
        }
    }, [admin]);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                setLoadingSettings(true);
                const res = await adminService.getPlatformSettings();
                if (res.settings) {
                    setPlatformOpen(res.settings.platformOpen);
                    setMaintenance(res.settings.maintenanceMode);
                    setBookingMessage(res.settings.bookingDisabledMessage || '');
                    setMaintenanceTitle(res.settings.maintenanceTitle || '');
                    setMaintenanceMessage(res.settings.maintenanceMessage || '');
                    setCommission(res.settings.defaultCommission ?? 10);
                    setTaxRate(res.settings.taxRate ?? 12);
                }
            } catch (error) {
                toast.error('Failed to load platform settings');
            } finally {
                setLoadingSettings(false);
            }
        };
        loadSettings();
    }, []);

    const handleProfileChange = (field, value) => {
        setProfile(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveProfile = async () => {
        try {
            setSavingProfile(true);
            await adminService.updateAdminProfile(profile);
            toast.success('Admin profile updated');
            if (checkAuth) {
                await checkAuth();
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to update profile';
            toast.error(message);
        } finally {
            setSavingProfile(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!passwordData.currentPassword || !passwordData.newPassword) {
            return toast.error('Current and new passwords are required');
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return toast.error('Passwords do not match');
        }
        if (passwordData.newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        try {
            setSavingPassword(true);
            await adminService.updateAdminPassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            toast.success('Password updated successfully');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to update password';
            toast.error(message);
        } finally {
            setSavingPassword(false);
        }
    };

    const handleSavePlatformSettings = async () => {
        try {
            setSavingSettings(true);
            await adminService.updatePlatformSettings({
                platformOpen,
                maintenanceMode: maintenance,
                bookingDisabledMessage: bookingMessage,
                maintenanceTitle,
                maintenanceMessage,
                defaultCommission: Number(commission),
                taxRate: Number(taxRate)
            });
            toast.success('Platform settings updated');
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to update platform settings';
            toast.error(message);
        } finally {
            setSavingSettings(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Platform Settings</h2>
                <p className="text-gray-500 text-sm">Configure global rules, commission rates, and system preferences.</p>
            </div>

            <Section title="Admin Profile" icon={Settings}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={(e) => handleProfileChange('name', e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm"
                            placeholder="Admin Name"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                        <input
                            type="email"
                            value={profile.email}
                            onChange={(e) => handleProfileChange('email', e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm"
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={profile.phone}
                            onChange={(e) => handleProfileChange('phone', e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm"
                            placeholder="10 digit number"
                        />
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-bold rounded-xl shadow-md hover:bg-gray-900 active:scale-95 disabled:opacity-60"
                    >
                        <Save size={16} />
                        {savingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </Section>

            <Section title="Security & Password" icon={Lock}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
                        <input
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm"
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                        <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm"
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
                        <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm"
                            placeholder="••••••••"
                        />
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleUpdatePassword}
                        disabled={savingPassword}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-bold rounded-xl shadow-md hover:bg-gray-900 active:scale-95 disabled:opacity-60"
                    >
                        <Shield size={16} />
                        {savingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                </div>
            </Section>

            <Section title="General Configuration" icon={Globe}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-gray-900">Platform Status</p>
                        <p className="text-sm text-gray-500">Enable or disable booking capability globally.</p>
                    </div>
                    <ToggleSwitch enabled={platformOpen} onChange={setPlatformOpen} />
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-gray-900">Maintenance Mode</p>
                        <p className="text-sm text-gray-500">Show maintenance screen to all users.</p>
                    </div>
                    <ToggleSwitch enabled={maintenance} onChange={setMaintenance} />
                </div>
                <div className="grid grid-cols-1 gap-4 pt-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">User message when booking is disabled</label>
                        <input
                            type="text"
                            value={bookingMessage}
                            onChange={(e) => setBookingMessage(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm"
                            placeholder="Bookings are temporarily disabled. Please try again later."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Maintenance title</label>
                        <input
                            type="text"
                            value={maintenanceTitle}
                            onChange={(e) => setMaintenanceTitle(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm"
                            placeholder="We will be back soon."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Maintenance description</label>
                        <textarea
                            rows={3}
                            value={maintenanceMessage}
                            onChange={(e) => setMaintenanceMessage(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm resize-none"
                            placeholder="The platform is under scheduled maintenance. Please check back in some time."
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <div className="pb-4 font-bold text-lg flex items-center gap-4"><Globe size={18} />Financial Rule</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Default Commission (%)</label>
                            <input
                                type="number"
                                value={commission}
                                onChange={(e) => setCommission(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">GST / Tax Rate (%)</label>
                            <input
                                type="number"
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>
                    </div>
                    {/* <div className="flex items-center justify-between pt-2">
                    <div>
                        <p className="font-medium text-gray-900">Automatic Payouts</p>
                        <p className="text-sm text-gray-500">Automatically release payments to hotels every Monday.</p>
                    </div>
                    <ToggleSwitch enabled={autoPayout} onChange={setAutoPayout} />
                </div> */}
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleSavePlatformSettings}
                        disabled={savingSettings || loadingSettings}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-bold rounded-xl shadow-md hover:bg-gray-900 active:scale-95 disabled:opacity-60"
                    >
                        <Save size={16} />
                        {savingSettings || loadingSettings ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </Section>

            {/* <Section title="Security & Access" icon={Shield}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-gray-900">Two-Factor Auth (Admin)</p>
                        <p className="text-sm text-gray-500">Force 2FA for all admin accounts.</p>
                    </div>
                    <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">ENABLED</span>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin Session Timeout (Minutes)</label>
                    <select className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black bg-white">
                        <option>15 Minutes</option>
                        <option>30 Minutes</option>
                        <option>1 Hour</option>
                    </select>
                </div>
            </Section> */}

        </div>
    );
};

export default AdminSettings;
