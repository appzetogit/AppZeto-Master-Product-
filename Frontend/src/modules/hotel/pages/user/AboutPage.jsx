import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { legalService } from '../../services/apiService';

const AboutPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const res = await legalService.getPage('user', 'about');
        if (!isMounted) return;
        setPage(res.page);
      } catch (e) {
        if (!isMounted) return;
        setError('About content is not configured yet. Showing default copy.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const content = page?.content || 'Rukko helps you discover, compare and book stays that match your style, from budget hostels to premium villas, with a mobile-first experience.';
  const paragraphs = typeof content === 'string' ? content.split('\n').filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-surface text-white p-6 pb-10 rounded-b-[30px] shadow-lg sticky top-0 z-20">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">About Us</h1>
        </div>
        <p className="text-xs text-white/70 max-w-xs">
          Learn more about the story, mission and values behind Rukko.
        </p>
      </div>

      <div className="px-5 -mt-6 relative z-10 pb-24">
        {error && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-4 py-2">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-4">
          <div className="flex items-center gap-3 mb-4 text-surface border-b border-gray-100 pb-3">
            <div className="w-9 h-9 rounded-full bg-surface/5 flex items-center justify-center text-surface">
              <Info size={20} />
            </div>
            <h2 className="font-bold text-lg">
              {page?.title || 'Built for modern travellers'}
            </h2>
          </div>
          <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
            {paragraphs.length > 0
              ? paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
              : <p>{content}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;

