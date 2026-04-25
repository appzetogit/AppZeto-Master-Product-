import React, { useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import gsap from 'gsap';
import PartnerHeader from '../components/PartnerHeader';
import { legalService } from '../../../services/apiService';

const PartnerPrivacy = () => {
  const contentRef = useRef(null);
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    gsap.fromTo(
      contentRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const res = await legalService.getPage('partner', 'privacy');
        if (!isMounted) return;
        setPage(res.page);
      } catch (e) {
        if (!isMounted) return;
        setError('Privacy content is not configured yet. Showing default copy.');
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const content =
    page?.content ||
    'We store and process your property data, bookings and payout information securely, and only use it to power your dashboard and payments.';
  const paragraphs = typeof content === 'string' ? content.split('\n').filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <PartnerHeader title="Privacy Policy" subtitle="How we handle partner data" showMenu={false} />

      <main ref={contentRef} className="max-w-3xl mx-auto px-4 pt-6">
        {error && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-4 py-2">
            {error}
          </div>
        )}

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#003836]">
                {page?.title || 'Partner data and privacy'}
              </h2>
            </div>
          </div>

          <div className="text-xs text-gray-500 leading-relaxed space-y-3">
            {paragraphs.length > 0
              ? paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
              : <p>{content}</p>}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PartnerPrivacy;

