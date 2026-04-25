import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Shield } from 'lucide-react';
import { legalService } from '../../services/apiService';

const LegalPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const audience = searchParams.get('audience') || 'user';
    const activeTab = searchParams.get('tab') || 'terms'; // terms or privacy

    const [privacy, setPrivacy] = useState(null);
    const [terms, setTerms] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            try {
                const [privacyRes, termsRes] = await Promise.allSettled([
                    legalService.getPage(audience, 'privacy'),
                    legalService.getPage(audience, 'terms')
                ]);

                if (!isMounted) return;

                if (privacyRes.status === 'fulfilled' && privacyRes.value?.page) {
                    setPrivacy(privacyRes.value.page);
                }
                if (termsRes.status === 'fulfilled' && termsRes.value?.page) {
                    setTerms(termsRes.value.page);
                }
            } catch (e) {
                if (!isMounted) return;
                setError('Unable to load latest legal content. Showing default copy.');
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [audience]);

    // Handle scroll to section if tab is present
    useEffect(() => {
        if (!loading && (terms || privacy)) {
            const timer = setTimeout(() => {
                const element = document.getElementById(activeTab);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [loading, terms, privacy, activeTab]);

    const renderContent = (fallbackTitle, fallbackContent, page) => {
        const title = page?.title || fallbackTitle;
        const content = page?.content || fallbackContent;
        const paragraphs = typeof content === 'string' ? content.split('\n').filter(Boolean) : [];

        return (
            <>
                <h3 className="font-bold text-lg">{title}</h3>
                <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                    {paragraphs.length > 0 ? (
                        paragraphs.map((p, idx) => (
                            <p key={idx}>{p}</p>
                        ))
                    ) : (
                        <p>{content}</p>
                    )}
                </div>
            </>
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
                <h2 className="text-2xl font-black capitalize">{audience} Policies</h2>
            </div>

            <div className="px-5 -mt-6 relative z-10 space-y-4 pb-24">

                {error && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-4 py-2">
                        {error}
                    </div>
                )}

                <div id="privacy" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 scroll-mt-32">
                    <div className="flex items-center gap-3 mb-4 text-surface border-b border-gray-100 pb-3">
                        <Shield size={24} />
                        <span className="font-bold text-lg">
                            {privacy?.title || 'Privacy Policy'}
                        </span>
                    </div>
                    {renderContent(
                        'Privacy Policy',
                        'At Rukko, we take your privacy seriously. This policy describes how we collect, use, and handle your data.',
                        privacy
                    )}
                </div>

                <div id="terms" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 scroll-mt-32">
                    <div className="flex items-center gap-3 mb-4 text-surface border-b border-gray-100 pb-3">
                        <FileText size={24} />
                        <span className="font-bold text-lg">
                            {terms?.title || 'Terms & Conditions'}
                        </span>
                    </div>
                    {renderContent(
                        'Terms & Conditions',
                        'By using Rukko, you agree to the latest booking, cancellation and usage terms defined by the platform.',
                        terms
                    )}
                </div>

            </div>
        </div>
    );
};

export default LegalPage;
