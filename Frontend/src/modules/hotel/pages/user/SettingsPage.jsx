import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Trash2, UserPlus, AlertCircle } from 'lucide-react';
import { userService } from '../../services/apiService';
import toast from 'react-hot-toast';

const SettingsPage = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleLogout = () => {
        localStorage.clear();
        toast.success("Logged out successfully");
        navigate('/login');
    };

    const handleDeleteAccount = async () => {
        try {
            setIsDeleting(true);
            const res = await userService.deleteAccount();
            if (res.success) {
                toast.success("Account deleted successfully");
                localStorage.clear();
                navigate('/login');
            }
        } catch (err) {
            console.error("Delete Account Error:", err);
            toast.error(err.message || "Failed to delete account");
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-surface text-white p-6 pb-12 rounded-b-[30px] shadow-lg sticky top-0 z-20">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold">Settings</h1>
                </div>
                <h2 className="text-2xl font-black">App Preferences</h2>
            </div>

            <div className="px-5 mt-8 relative z-10 space-y-4 pb-24">
                {user ? (
                    <>
                        {/* Logout Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 p-5 text-surface hover:bg-gray-50 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-surface/5 flex items-center justify-center text-surface">
                                    <LogOut size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold">Logout</p>
                                    <p className="text-[10px] text-gray-400">Sign out from your account</p>
                                </div>
                            </button>
                        </div>

                        {/* Danger Zone */}
                        <div className="pt-4">
                            <h3 className="font-bold text-red-500 text-xs uppercase tracking-wider mb-3 ml-2">Danger Zone</h3>
                            <div className="bg-white rounded-2xl shadow-sm border border-red-50 overflow-hidden">
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full flex items-center gap-3 p-5 text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                                        <Trash2 size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold">Delete Account</p>
                                        <p className="text-[10px] text-red-400">Permanently remove your account & data</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full flex items-center gap-3 p-5 text-surface hover:bg-gray-50 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-surface/5 flex items-center justify-center text-surface">
                                <UserPlus size={20} />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold">Sign In</p>
                                <p className="text-[10px] text-gray-400">Login to access your profile</p>
                            </div>
                        </button>
                    </div>
                )}

                <p className="text-center text-xs text-gray-400 mt-8">App Version 1.0.2</p>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-8 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle size={40} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">Are you sure?</h3>
                        <p className="text-sm text-gray-500 leading-relaxed mb-8">
                            This action is permanent and cannot be undone. All your bookings and wallet balance will be lost.
                        </p>
                        
                        <div className="space-y-3">
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeleting}
                                className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {isDeleting ? "Deleting..." : "Yes, Delete Account"}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="w-full bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;

