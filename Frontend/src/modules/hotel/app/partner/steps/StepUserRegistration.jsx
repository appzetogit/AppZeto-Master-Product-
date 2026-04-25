import React from 'react';
import usePartnerStore from '../store/partnerStore';
import { Link } from 'react-router-dom';

const StepUserRegistration = () => {
  const { formData, updateFormData } = usePartnerStore();

  const handleChange = (field, value) => {
    updateFormData({ [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">Full Name</label>
        <input
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004F4D]"
          placeholder="Enter your full name"
          value={formData.full_name}
          onChange={e => handleChange('full_name', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
        <input
          type="email"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004F4D]"
          placeholder="name@business.com"
          value={formData.email}
          onChange={e => handleChange('email', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">Phone Number</label>
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#004F4D] transition-all">
          <div className="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-xs font-bold text-gray-500">
            +91
          </div>
          <input
            type="tel"
            className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none placeholder:text-gray-300"
            placeholder="10-digit mobile number"
            value={formData.phone}
            onChange={e => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
        </div>
      </div>

      <div className="flex items-start gap-2 mt-2">
        <input
          id="terms"
          type="checkbox"
          className="mt-1 w-4 h-4 rounded border-gray-300 text-[#004F4D] focus:ring-[#004F4D]"
          checked={formData.termsAccepted}
          onChange={e => handleChange('termsAccepted', e.target.checked)}
        />
        <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed">
          I agree to the <Link to="/terms?audience=partner" className="text-[#004F4D] font-bold hover:underline">Terms & Conditions</Link> and <Link to="/privacy?audience=partner" className="text-[#004F4D] font-bold hover:underline">Privacy Policy</Link> of Rukko Partner.
        </label>
      </div>
    </div>
  );
};

export default StepUserRegistration;
