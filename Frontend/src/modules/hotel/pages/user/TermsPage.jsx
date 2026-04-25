import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { legalService } from '../../services/apiService';

const TermsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const audience = searchParams.get('audience') || 'user';

  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const res = await legalService.getPage(audience, 'terms');
        if (isMounted && res.success) {
          setPageData(res.page);
        }
      } catch (e) {
        if (isMounted) setError('Unable to load Terms & Conditions.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [audience]);

  const renderContent = (content) => {
    const paragraphs = typeof content === 'string' ? content.split('\n').filter(Boolean) : [];
    return (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed font-medium">
        {paragraphs.length > 0 ? (
          paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
        ) : (
          <p>{content}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-surface text-white p-6 pb-12 rounded-b-[30px] shadow-lg sticky top-0 z-20">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Legal</h1>
        </div>
        <h2 className="text-2xl font-black">{audience === 'partner' ? 'Partner Agreement' : 'Terms & Conditions'}</h2>
      </div>

      <div className="px-5 -mt-6 relative z-10 pb-24">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[400px]">
          <div className="flex items-center gap-3 mb-6 text-surface border-b border-gray-100 pb-3">
            <FileText size={24} />
            <span className="font-bold text-lg">
              {pageData?.title || 'Loading Terms...'}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-surface border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <p className="text-center text-red-500 py-10 font-bold">{error}</p>
          ) : (
            renderContent(pageData?.content || 'Latest terms not available.')
          )}
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
