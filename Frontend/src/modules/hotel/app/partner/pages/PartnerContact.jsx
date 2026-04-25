import React, { useRef, useState, useEffect } from 'react';
import { Mail, Phone, Send } from 'lucide-react';
import gsap from 'gsap';
import PartnerHeader from '../components/PartnerHeader';
import { legalService } from '../../../services/apiService';

const PartnerContact = () => {
  const contentRef = useRef(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    gsap.fromTo(
      contentRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !subject || !message) {
      setError('Please fill all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      await legalService.submitContact('partner', {
        name,
        email,
        phone,
        subject,
        message
      });
      setSuccess('Your message has been sent to the Rukko team.');
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (e) {
      setError(e?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PartnerHeader title="Contact Partner Support" subtitle="Reach the Rukko team" showMenu={false} />

      <main ref={contentRef} className="max-w-3xl mx-auto px-4 pt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#004F4D]/10 flex items-center justify-center text-[#004F4D]">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Email</p>
              <a
                href="mailto:rukkoohub@gmail.com"
                className="text-xs text-gray-500 hover:text-[#004F4D] transition-colors break-all"
              >
                rukkoohub@gmail.com
              </a>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#004F4D]/10 flex items-center justify-center text-[#004F4D]">
              <Phone size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Phone</p>
              <a
                href="tel:+919244554429"
                className="text-xs text-gray-500 hover:text-[#004F4D] transition-colors"
              >
                +91-9244554429
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#004F4D]/10 flex items-center justify-center text-[#004F4D] shrink-0">
            <Building2 size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Office Address</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              401 A Rajani bhawan high court square<br />
              Indore, Madhya Pradesh - 452001
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-4 py-2">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#004F4D]/60"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#004F4D]/60"
                placeholder="you@hotel.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#004F4D]/60"
                placeholder="+91"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#004F4D]/60"
                placeholder="Billing, onboarding, payouts..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Message *</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#004F4D]/60 resize-none"
              placeholder="Share context so we can assist you faster."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 mt-2 bg-[#004F4D] text-white py-3 rounded-xl text-sm font-bold active:scale-95 disabled:opacity-60 disabled:active:scale-100 transition-transform"
          >
            <Send size={16} />
            {submitting ? 'Sending...' : 'Send to Support'}
          </button>
        </form>
      </main>
    </div>
  );
};

export default PartnerContact;

