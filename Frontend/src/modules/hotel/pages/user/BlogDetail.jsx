import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, Calendar, Share2, Bookmark, User } from 'lucide-react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

const API_BASE_URL = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '')}/hotel`;

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogDetail = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/blogs`);
        if (response.data.success) {
          // Find by ID or by Slug for SEO URLs
          const foundBlog = response.data.data.find(b => b._id === id || b.slug === id);
          if (foundBlog) {
            setBlog(foundBlog);
            
            // Set dynamic SEO tags
            if (foundBlog.seoTitle) document.title = `${foundBlog.seoTitle} | Rukkoo In`;
            if (foundBlog.seoDescription) {
              const metaDesc = document.querySelector('meta[name="description"]');
              if (metaDesc) metaDesc.setAttribute("content", foundBlog.seoDescription);
            }
          } else {
            console.error('Blog not found');
          }
        }
      } catch (error) {
        console.error('Error fetching blog details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="text-slate-400 font-medium">Loading story...</p>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4">Story Not Found</h2>
        <p className="text-slate-400 mb-8 max-w-md">The blog post you're looking for might have been moved or deleted.</p>
        <button 
          onClick={() => navigate('/blogs')}
          className="px-8 py-4 bg-emerald-500 text-slate-950 font-bold rounded-2xl hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20"
        >
          Back to Blogs
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-20 overflow-x-hidden">
      {/* Header / Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-slate-950/60 backdrop-blur-2xl border-b border-slate-800/50 px-6 h-18 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/blogs')}
            className="group flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-all"
          >
            <div className="p-2 rounded-xl bg-slate-900 group-hover:bg-emerald-500/10 transition">
              <ArrowLeft size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest hidden md:block">Back to Hub</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-3 text-slate-400 hover:text-white bg-slate-900/50 rounded-xl hover:bg-slate-800 transition">
            <Share2 size={20} />
          </button>
          <button className="p-3 text-slate-400 hover:text-white bg-slate-900/50 rounded-xl hover:bg-slate-800 transition">
            <Bookmark size={20} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-18 overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -mr-64 -mt-32 pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-teal-500/5 blur-[100px] rounded-full -ml-32 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 pt-12 pb-10">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20">
              <span className="text-[10px] font-black uppercase tracking-widest">{blog.badge}</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest">{blog.category}</span>
            </div>
          </div>
          
          <h1 className="max-w-5xl text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white mb-8 leading-[1.05] drop-shadow-sm">
            {blog.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-xs md:text-sm text-slate-400 mb-12 py-6 border-y border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <User size={18} className="text-slate-950" />
              </div>
              <div>
                <p className="text-slate-200 font-bold">Rukkoo Editorial</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Verified Guide</p>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-slate-800 hidden md:block" />
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-emerald-500/50" />
              <span className="font-medium tracking-wide prose-invert">{blog.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-emerald-500/50" />
              <span className="font-medium tracking-wide">{blog.readTime}</span>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="group relative rounded-[32px] md:rounded-[48px] overflow-hidden border border-slate-800 shadow-2xl bg-slate-900 aspect-16/9 md:aspect-[21/9]">
            <img 
              src={blog.image} 
              alt={blog.title} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 w-full overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-16">
          <div>
            {/* Excerpt */}
            <div className="relative mb-16">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-full" />
              <p className="text-xl md:text-3xl font-bold text-slate-100 leading-relaxed italic pl-8">
                {blog.excerpt}
              </p>
            </div>

            {/* Content Body - ALIGNED LEFT */}
            <div className="prose prose-invert prose-emerald max-w-full text-left break-words">
              {blog.content ? (
                <div 
                  className="text-slate-300 text-lg md:text-xl leading-relaxed md:leading-[1.9] tracking-wide"
                  dangerouslySetInnerHTML={{ __html: blog.content }}
                />
              ) : (
                <div className="bg-slate-900/40 rounded-3xl p-10 text-slate-400 italic text-center border border-slate-800/50">
                  Full content for this story is currently being curated. Check back soon.
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Recommendations */}
          <aside className="hidden lg:block space-y-12 h-fit sticky top-32">
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl">
              <h4 className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Quick Breakdown</h4>
              <ul className="space-y-4">
                <li className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Location Focus</span>
                  <span className="text-sm font-bold text-slate-200">Across India</span>
                </li>
                <li className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Category</span>
                  <span className="text-sm font-bold text-slate-200">{blog.category}</span>
                </li>
                <li className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Verified By</span>
                  <span className="text-sm font-bold text-slate-200">Rukkoo Team</span>
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-[32px] bg-linear-to-br from-emerald-500 to-teal-600 text-slate-950 shadow-2xl shadow-emerald-500/10">
              <h4 className="text-xl font-black mb-3">Save on your next stay.</h4>
              <p className="text-slate-950/80 text-xs font-bold leading-relaxed mb-6">
                Premium stays at budget prices. Discover our handpicked listings today.
              </p>
              <button 
                onClick={() => navigate('/search')}
                className="w-full py-3 bg-slate-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition shadow-xl"
              >
                Go Explore
              </button>
            </div>
          </aside>
        </div>
      </div>

        {/* Footer info */}
        <div className="mt-20 pt-10 border-t border-slate-800">
          <div className="bg-slate-900/40 rounded-3xl p-8 border border-slate-800">
            <h4 className="text-lg font-bold mb-2">About Rukkoo In</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              We're a team of travellers, techies, and hospitality experts dedicated to making budget travel premium. Every story on Rukkoo Hub is backed by real data and on-ground experiences.
            </p>
            <button 
              onClick={() => navigate('/search')}
              className="mt-6 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-full border border-slate-700 transition"
            >
              Explore our stays
            </button>
          </div>
      </div>
    </main>
  );
};

export default BlogDetail;
