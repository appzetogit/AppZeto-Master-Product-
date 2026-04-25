import React, { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import gsap from 'gsap';
import PartnerHeader from '../components/PartnerHeader';
import { legalService } from '../../../services/apiService';

const PartnerAbout = () => {
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
        const res = await legalService.getPage('partner', 'about');
        if (!isMounted) return;
        setPage(res.page);
      } catch (e) {
        if (!isMounted) return;
        setError('About content is not configured yet. Showing default copy.');
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const content =
    page?.content ||
    'Rukko Partner is designed to help hotels, PGs and homestays manage inventory, bookings and payouts with a mobile-first dashboard.';
  const paragraphs = typeof content === 'string' ? content.split('\n').filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PartnerHeader title="About Rukko Partner" subtitle="Platform overview" />

      <main ref={contentRef} className="max-w-3xl mx-auto px-4 pt-6">
        {error && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-4 py-2">
            {error}
          </div>
        )}

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
              <Info size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#003836]">
                {page?.title || 'Built for hospitality partners'}
              </h2>
              <p className="text-xs text-gray-400">Mobile-first control center for your property business.</p>
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

export default PartnerAbout;

