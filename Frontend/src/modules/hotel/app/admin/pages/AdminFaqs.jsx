import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, XCircle } from 'lucide-react';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const AdminFaqs = () => {
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'partner'
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({ question: '', answer: '', isActive: true });

  useEffect(() => {
    fetchFaqs();
  }, [activeTab]);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllFaqs({ audience: activeTab });
      setFaqs(data);
    } catch (error) {
      toast.error('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (faq = null) => {
    if (faq) {
      setEditingFaq(faq);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        isActive: faq.isActive,
        order: faq.order
      });
    } else {
      setEditingFaq(null);
      setFormData({ question: '', answer: '', isActive: true, order: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, audience: activeTab };
      if (editingFaq) {
        await adminService.updateFaq(editingFaq._id, payload);
        toast.success('FAQ updated successfully');
      } else {
        await adminService.createFaq(payload);
        toast.success('FAQ created successfully');
      }
      setIsModalOpen(false);
      fetchFaqs();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      await adminService.deleteFaq(id);
      toast.success('FAQ deleted');
      fetchFaqs();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const filteredFaqs = faqs.filter(f =>
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">FAQ Management</h1>
          <p className="text-gray-500 text-sm">Manage frequently asked questions for Users and Partners.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
        >
          <Plus size={18} /> Add FAQ
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-white rounded-xl w-fit border border-gray-200 shadow-sm">
        <button
          onClick={() => setActiveTab('user')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'user' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          User FAQs
        </button>
        <button
          onClick={() => setActiveTab('partner')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'partner' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Partner FAQs
        </button>
      </div>

      {/* Search & List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Search className="text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />
        </div>

        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredFaqs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No FAQs found.</div>
          ) : (
            filteredFaqs.map(faq => (
              <div key={faq._id} className="p-4 hover:bg-gray-50 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">{faq.question}</h3>
                      {!faq.isActive && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{faq.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenModal(faq)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(faq._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <XCircle size={24} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Question</label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={e => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                  placeholder="Enter question"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Answer</label>
                <textarea
                  required
                  rows={4}
                  value={formData.answer}
                  onChange={e => setFormData({ ...formData, answer: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all resize-none"
                  placeholder="Enter answer"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-black focus:ring-black"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active (Visible to users)</label>
              </div>
              <button
                type="submit"
                className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg active:scale-95 mt-4"
              >
                {editingFaq ? 'Update FAQ' : 'Create FAQ'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFaqs;
