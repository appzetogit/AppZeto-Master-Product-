import React, { useEffect, useState } from 'react';
import { ArrowLeft, Landmark, CreditCard, Building2, User, Save, Trash2, Loader2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import walletService from '../../../services/walletService';
import toast from 'react-hot-toast';

const PartnerBankDetails = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Bank Details State
  const [details, setDetails] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: ''
  });

  const [existingDetails, setExistingDetails] = useState(null);

  useEffect(() => {
    fetchDetails();
  }, []);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await walletService.getWallet({ viewAs: 'partner' });
      const bank = data.wallet?.bankDetails;

      if (bank && bank.accountNumber) {
        setExistingDetails(bank);
        setDetails({
          accountHolderName: bank.accountHolderName || '',
          accountNumber: bank.accountNumber || '',
          ifscCode: bank.ifscCode || '',
          bankName: bank.bankName || ''
        });
        setIsEditing(false); // Valid existing details -> view mode
      } else {
        setExistingDetails(null);
        setIsEditing(true); // No details -> edit mode
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load bank details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const { accountHolderName, accountNumber, ifscCode, bankName } = details;

    // 1. Basic Required Check
    if (!accountNumber || !ifscCode || !accountHolderName || !bankName) {
      toast.error("Please fill all fields");
      return;
    }

    // 2. Account Holder Name Check
    if (accountHolderName.trim().length < 3) {
      toast.error("Account holder name must be at least 3 characters");
      return;
    }

    // 3. Account Number Check (9 to 18 digits)
    const accRegex = /^[0-9]{9,18}$/;
    if (!accRegex.test(accountNumber)) {
      toast.error("Enter a valid account number (9-18 digits)");
      return;
    }

    // 4. IFSC Code Check (4 letters, 0, 6 characters)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode)) {
      toast.error("Enter a valid IFSC code (e.g. HDFC0001234)");
      return;
    }

    // 5. Bank Name Check
    if (bankName.trim().length < 2) {
      toast.error("Enter a valid bank name");
      return;
    }

    try {
      setSaving(true);
      await walletService.updateBankDetails(details);
      toast.success("Bank details saved successfully");
      fetchDetails(); // Refresh view
    } catch (error) {
      toast.error("Failed to save bank details");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to remove these bank details? You won't be able to withdraw funds until you add them again.")) return;

    try {
      setSaving(true);
      await walletService.deleteBankDetails();
      toast.success("Bank details removed");

      // Reset state
      setExistingDetails(null);
      setDetails({
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        bankName: ''
      });
      setIsEditing(true);
    } catch (error) {
      toast.error("Failed to remove details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin text-[#004F4D]" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* Header */}
      <div className="bg-[#004F4D] text-white pt-8 pb-12 px-6 rounded-b-[40px] shadow-lg mb-6 relative">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Bank Account</h1>
        </div>
        <div className="text-center opacity-90">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/10">
            <Landmark size={32} />
          </div>
          <p className="text-sm font-medium">Manage your payout account</p>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 -mt-10">
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100">

          {/* View Mode Header */}
          {!isEditing && existingDetails && (
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
              <div>
                <h3 className="text-lg font-black text-[#003836]">Saved Account</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Verified for Payouts</p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-[#004F4D] rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
              >
                <Edit size={14} /> Edit
              </button>
            </div>
          )}

          {/* Edit Mode Header */}
          {isEditing && (
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
              <div>
                <h3 className="text-lg font-black text-[#003836]">{existingDetails ? 'Edit Account' : 'Add Account'}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Enter your official bank details</p>
              </div>
              {existingDetails && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="group">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Account Holder</label>
              <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${isEditing ? 'bg-gray-50 border-gray-200 focus-within:border-[#004F4D] focus-within:ring-2 focus-within:ring-[#004F4D]/10' : 'bg-gray-50/50 border-transparent'}`}>
                <User size={18} className="text-gray-400" />
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="Name as per Passbook"
                    value={details.accountHolderName}
                    onChange={e => setDetails({ ...details, accountHolderName: e.target.value })}
                    className="flex-1 bg-transparent text-sm font-bold text-[#003836] placeholder:text-gray-300 focus:outline-none"
                  />
                ) : (
                  <span className="text-sm font-bold text-[#003836]">{details.accountHolderName}</span>
                )}
              </div>
            </div>

            <div className="group">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Account Number</label>
              <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${isEditing ? 'bg-gray-50 border-gray-200 focus-within:border-[#004F4D] focus-within:ring-2 focus-within:ring-[#004F4D]/10' : 'bg-gray-50/50 border-transparent'}`}>
                <CreditCard size={18} className="text-gray-400" />
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="Enter Account Number"
                    value={details.accountNumber}
                    onChange={e => setDetails({ ...details, accountNumber: e.target.value })}
                    className="flex-1 bg-transparent text-sm font-bold text-[#003836] placeholder:text-gray-300 focus:outline-none"
                  />
                ) : (
                  <span className="text-sm font-bold text-[#003836]">
                    •••• •••• {details.accountNumber.slice(-4)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="group flex-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">IFSC Code</label>
                <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${isEditing ? 'bg-gray-50 border-gray-200 focus-within:border-[#004F4D] focus-within:ring-2 focus-within:ring-[#004F4D]/10' : 'bg-gray-50/50 border-transparent'}`}>
                  <Building2 size={18} className="text-gray-400" />
                  {isEditing ? (
                    <input
                      type="text"
                      placeholder="IFSC"
                      value={details.ifscCode}
                      onChange={e => setDetails({ ...details, ifscCode: e.target.value.toUpperCase() })}
                      className="flex-1 bg-transparent text-sm font-bold text-[#003836] placeholder:text-gray-300 focus:outline-none"
                    />
                  ) : (
                    <span className="text-sm font-bold text-[#003836]">{details.ifscCode}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="group">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Bank Name</label>
              <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${isEditing ? 'bg-gray-50 border-gray-200 focus-within:border-[#004F4D] focus-within:ring-2 focus-within:ring-[#004F4D]/10' : 'bg-gray-50/50 border-transparent'}`}>
                <Landmark size={18} className="text-gray-400" />
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    value={details.bankName}
                    onChange={e => setDetails({ ...details, bankName: e.target.value })}
                    className="flex-1 bg-transparent text-sm font-bold text-[#003836] placeholder:text-gray-300 focus:outline-none"
                  />
                ) : (
                  <span className="text-sm font-bold text-[#003836]">{details.bankName}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-3">
            {isEditing ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-[#004F4D] text-white font-bold text-sm shadow-lg shadow-[#004F4D]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Save Details
              </button>
            ) : (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-red-50 text-red-500 font-bold text-sm border border-red-100 hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                Remove Account
              </button>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-700 leading-relaxed text-center font-medium">
              <span className="font-bold">Note:</span> Ensuring these details are correct is crucial. Withdrawals will be processed directly to this account via IMPS.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PartnerBankDetails;
