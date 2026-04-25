import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Clock, Layout, BadgeCheck, Type, AlignLeft } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; // import styles

const API_BASE_URL = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '')}/hotel`;

const BlogManager = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBlog, setCurrentBlog] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category: 'Travel Guides',
    readTime: '5 min read',
    badge: 'NEW',
    image: '',
    excerpt: '',
    content: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: ''
  });

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/blogs`);
      if (response.data.success) {
        setBlogs(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to fetch blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      // Clear URL input if file is selected
      setFormData(prev => ({ ...prev, image: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading(isEditing ? 'Updating blog...' : 'Creating blog...');
    
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });
      
      if (imageFile) {
        data.append('image', imageFile);
      }

      if (isEditing) {
        await axios.put(`${API_BASE_URL}/blogs/${currentBlog._id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Blog updated successfully', { id: loadingToast });
      } else {
        await axios.post(`${API_BASE_URL}/blogs`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Blog created successfully', { id: loadingToast });
      }
      resetForm();
      fetchBlogs();
    } catch (error) {
      console.error('Error saving blog:', error);
      toast.error(error.response?.data?.message || 'Failed to save blog', { id: loadingToast });
    }
  };

  const handleEdit = (blog) => {
    setIsEditing(true);
    setCurrentBlog(blog);
    setImagePreview(blog.image);
    setFormData({
      title: blog.title,
      category: blog.category,
      readTime: blog.readTime,
      badge: blog.badge,
      image: blog.image,
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      seoTitle: blog.seoTitle || '',
      seoDescription: blog.seoDescription || '',
      seoKeywords: blog.seoKeywords || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this blog?')) {
      try {
        await axios.delete(`${API_BASE_URL}/blogs/${id}`);
        toast.success('Blog deleted successfully');
        fetchBlogs();
      } catch (error) {
        console.error('Error deleting blog:', error);
        toast.error('Failed to delete blog');
      }
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentBlog(null);
    setImageFile(null);
    setImagePreview('');
    setFormData({
      title: '',
      category: 'Travel Guides',
      readTime: '5 min read',
      badge: 'NEW',
      image: '',
      excerpt: '',
      content: '',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: ''
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-28 pb-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">Blog Manager</h1>
            <p className="text-slate-400">Manage your website's blog posts here.</p>
          </div>
          {!isEditing && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <Layout size={20} className="text-slate-950" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Total Blogs</p>
                <p className="text-xl font-black text-white">{blogs.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 mb-12 backdrop-blur-xl shadow-2xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            {isEditing ? <Edit2 size={20} /> : <Plus size={20} />}
            {isEditing ? 'Edit Blog Post' : 'Add New Blog Post'}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                  <Type size={14} /> Blog Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Escape the City: 7 Hidden Hill Stations"
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                    <BadgeCheck size={14} /> Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition text-sm appearance-none"
                  >
                    <option>Travel Guides</option>
                    <option>Stay Tips</option>
                    <option>Smart Booking</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                    <Clock size={14} /> Read Time
                  </label>
                  <input
                    type="text"
                    name="readTime"
                    value={formData.readTime}
                    onChange={handleInputChange}
                    placeholder="e.g., 6 min read"
                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                  <ImageIcon size={14} /> Blog Image
                </label>
                
                <div className="flex flex-col gap-4">
                  {imagePreview && (
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-700/50">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(''); }}
                        className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-red-500 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full bg-slate-950/50 border border-slate-700/50 border-dashed rounded-xl px-4 py-3 text-sm text-slate-400 flex items-center justify-center gap-2">
                        <Plus size={16} /> Choose Image File
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 py-2">
                    <div className="h-[1px] flex-1 bg-slate-800"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">OR USE URL</span>
                    <div className="h-[1px] flex-1 bg-slate-800"></div>
                  </div>

                  <input
                    type="text"
                    name="image"
                    value={formData.image}
                    onChange={(e) => {
                      handleInputChange(e);
                      if (e.target.value) {
                        setImagePreview(e.target.value);
                        setImageFile(null);
                      }
                    }}
                    placeholder="Paste image URL here..."
                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                  <BadgeCheck size={14} /> Badge (Optional)
                </label>
                <select
                  name="badge"
                  value={formData.badge}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition text-sm appearance-none"
                >
                  <option>NEW</option>
                  <option>TRENDING</option>
                  <option>EDITOR'S PICK</option>
                  <option>SAVE MORE</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                  <AlignLeft size={14} /> Excerpt / Short Description
                </label>
                <textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Brief summary of the blog post (shows on listing page)..."
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition text-sm resize-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                  <AlignLeft size={14} /> Full Blog Content
                </label>
                <div className="bg-slate-950/50 border border-slate-700/50 rounded-xl overflow-hidden focus-within:border-emerald-500/50">
                  <ReactQuill
                    theme="snow"
                    value={formData.content}
                    onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                    placeholder="Write the full story here. Headings, Links and Lists supported..."
                    className="text-white bg-transparent"
                  />
                </div>
                {/* Global styles fix for Quill in Dark Mode */}
                <style>{`
                  .ql-toolbar.ql-snow { border-color: #334155; background: #0f172a; }
                  .ql-container.ql-snow { border-color: #334155; }
                  .ql-editor { min-height: 200px; font-size: 0.875rem; color: white; }
                  .ql-snow .ql-stroke { stroke: #94a3b8; }
                  .ql-snow .ql-fill { fill: #94a3b8; }
                  .ql-snow .ql-picker { color: #94a3b8; }
                `}</style>
              </div>

              {/* SEO Settings Settings */}
              <div className="border-t border-slate-800/50 pt-4 mt-6 space-y-4">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest">SEO Metadata Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Meta Title (SEO)</label>
                    <input
                      type="text"
                      name="seoTitle"
                      value={formData.seoTitle}
                      onChange={handleInputChange}
                      placeholder="Better Title for Search Engines"
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Meta Description (SEO)</label>
                    <textarea
                      name="seoDescription"
                      value={formData.seoDescription}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Snippet displayed on Google search results..."
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">SEO Keywords (Comma items)</label>
                    <input
                      type="text"
                      name="seoKeywords"
                      value={formData.seoKeywords}
                      onChange={handleInputChange}
                      placeholder="e.g. travel, hotels, booking guides"
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500/50 transition text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                  >
                    {isEditing ? <Save size={18} /> : <Plus size={18} />}
                    {isEditing ? 'Update Blog' : 'Create Blog'}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Blog Posts List */}
        <h2 className="text-xl font-bold mb-6">Existing Blogs</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-64 bg-slate-900/50 rounded-3xl border border-slate-800"></div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl">
            <p className="text-slate-500">No blogs found. Add your first post above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <div
                key={blog._id}
                className="group bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden hover:border-slate-700 transition"
              >
                <div className="relative h-40 overflow-hidden">
                  <img src={blog.image} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-slate-950 uppercase tracking-widest">{blog.badge}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-950/80 text-white uppercase tracking-widest border border-slate-700/50">{blog.category}</span>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-[10px] text-slate-500 mb-1">{blog.date}</p>
                  <h3 className="font-bold text-white mb-2 line-clamp-2 h-12 leading-tight">{blog.title}</h3>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock size={14} /> {blog.readTime}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(blog)}
                        className="p-2.5 bg-slate-950 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-slate-950 transition border border-slate-800"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(blog._id)}
                        className="p-2.5 bg-slate-950 text-red-400 rounded-xl hover:bg-red-500 hover:text-slate-950 transition border border-slate-800"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogManager;
