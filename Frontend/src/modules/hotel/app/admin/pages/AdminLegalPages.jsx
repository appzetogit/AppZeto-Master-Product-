import React, { useEffect, useState } from 'react';
import { FileText, Shield, Info, PhoneCall, Save } from 'lucide-react';
import adminService from '../../../services/adminService';

const SLUG_META = [
  { slug: 'terms', label: 'Terms & Conditions', icon: FileText },
  { slug: 'privacy', label: 'Privacy Policy', icon: Shield },
  { slug: 'about', label: 'About Us', icon: Info },
  { slug: 'contact', label: 'Contact Us', icon: PhoneCall }
];

const AdminLegalPages = () => {
  const [audience, setAudience] = useState('user');
  const [pages, setPages] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadPages = async (aud) => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getLegalPages({ audience: aud });
      const map = {};
      (res.pages || []).forEach((p) => {
        map[p.slug] = p;
      });
      setPages(map);
    } catch (e) {
      setError('Unable to fetch legal pages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages(audience);
  }, [audience]);

  const handleFieldChange = (slug, field, value) => {
    setPages((prev) => {
      const current = prev[slug] || { slug, audience };
      return {
        ...prev,
        [slug]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const entries = SLUG_META.map(({ slug, label }) => {
        const page = pages[slug] || {};
        return {
          audience,
          slug,
          title: page.title || label,
          content: page.content || '',
          isActive: page.isActive !== false
        };
      });

      for (const entry of entries) {
        await adminService.saveLegalPage(entry);
      }

      setMessage('Legal pages saved successfully.');
      await loadPages(audience);
    } catch (e) {
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Legal & Info Pages</h2>
          <p className="text-gray-500 text-sm">
            Manage Terms, Privacy, About and Contact content for users and partners.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1">
          <button
            onClick={() => setAudience('user')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
              audience === 'user' ? 'bg-black text-white' : 'text-gray-600'
            }`}
          >
            User
          </button>
          <button
            onClick={() => setAudience('partner')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
              audience === 'partner' ? 'bg-black text-white' : 'text-gray-600'
            }`}
          >
            Partner
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-4 py-2">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SLUG_META.map(({ slug, label, icon: Icon }) => {
          const page = pages[slug] || {};
          return (
            <div key={slug} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
                <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-700">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{label}</p>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide">
                    {audience === 'user' ? 'User facing' : 'Partner facing'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 flex-1 flex flex-col">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={page.title || label}
                    onChange={(e) => handleFieldChange(slug, 'title', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-black/70"
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Content</label>
                  <textarea
                    rows={6}
                    value={page.content || ''}
                    onChange={(e) => handleFieldChange(slug, 'content', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-black/70 resize-none flex-1"
                    placeholder="Write the copy that will appear on web and app."
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSaveAll}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white text-sm font-bold rounded-xl shadow-lg hover:bg-gray-900 active:scale-95 disabled:opacity-60 disabled:active:scale-100 transition-transform"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default AdminLegalPages;

