import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { isWebView } from '../../utils/deviceDetect';

const API_BASE_URL = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '')}/hotel`;

const mockBlogs = [
  {
    _id: '1',
    title: 'Escape the City: 7 Hidden Hill Stations Near You',
    category: 'Travel Guides',
    readTime: '6 min read',
    badge: 'TRENDING',
    image:
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
    excerpt:
      'Weekend escapes that are closer than you think — curated hill stations, handpicked stays, and routes that actually work.',
    date: 'March 2026'
  },
  {
    _id: '2',
    title: 'Couple-Friendly Stays: What To Check Before You Book',
    category: 'Stay Tips',
    readTime: '4 min read',
    badge: 'EDITOR\'S PICK',
    image:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
    excerpt:
      'From ID policies to neighbourhood vibes — a simple checklist to make sure your next couple stay is calm, safe and drama-free.',
    date: 'March 2026'
  },
  {
    _id: '3',
    title: 'How To Get Real Discounts (Beyond Flash Sales)',
    category: 'Smart Booking',
    readTime: '5 min read',
    badge: 'SAVE MORE',
    image:
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
    excerpt:
      'Learn how wallet credits, off-peak dates and flexible policies can actually beat random promo codes.',
    date: 'February 2026'
  }
];

const BlogsPage = () => {
  const navigate = useNavigate();
  const [blogs, setBlogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/blogs`);
        if (response.data.success && response.data.data.length > 0) {
          setBlogs(response.data.data);
        } else {
          setBlogs(mockBlogs);
        }
      } catch (error) {
        console.error('Error fetching blogs:', error);
        setBlogs(mockBlogs);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  // In WebView / Flutter wrapper, blogs should not be visible at all
  if (isWebView()) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 pt-24 pb-20">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] gap-10 items-center">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-300 mb-3">
              RUKKOO HUB // STORIES
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white mb-4">
              Travel stories, stay tips &amp; real booking hacks.
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-xl mb-6">
              Curated bytes from frequent travellers, hosts and our own support team — so you can spend
              less time researching and more time actually travelling.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-slate-300">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold">
                <Clock size={14} />
                New posts every week
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-200">
                No clickbait. Only useful stuff.
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 md:-inset-8 bg-emerald-500/20 blur-3xl opacity-60" />
            <div className="relative rounded-3xl border border-slate-700/80 bg-linear-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-[0.16em]">
                    FEATURED NOW
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Handpicked stays &amp; stories across India
                  </p>
                </div>
                <button
                  onClick={() => navigate('/search')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:scale-95 transition"
                >
                  Explore stays
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3">
                {blogs.slice(0, 3).map((blog) => (
                  <div
                    key={blog._id}
                    onClick={() => navigate(`/blogs/${blog._id}`)}
                    className="relative h-28 rounded-2xl overflow-hidden group border border-slate-800/80 bg-slate-900/80 cursor-pointer"
                  >
                    <img
                      src={blog.image}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-x-2 bottom-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-950/80 text-[9px] font-semibold uppercase tracking-wide text-slate-200 border border-slate-700/80">
                        {blog.category}
                      </span>
                      <p className="mt-1 text-[10px] font-semibold text-slate-50 line-clamp-2">
                        {blog.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Cards Grid */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 mt-10 md:mt-14">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
            Latest from the hub
          </h2>
          <p className="text-[11px] md:text-xs text-slate-400">
            Built for people who actually travel, not just scroll.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {loading ? (
            [1, 2, 3].map(n => (
              <div key={n} className="h-80 bg-slate-900/50 rounded-3xl animate-pulse border border-slate-800" />
            ))
          ) : (
            blogs.map((blog) => (
              <article
                key={blog._id}
                onClick={() => navigate(`/blogs/${blog._id}`)}
                className="group rounded-3xl border border-slate-800/80 bg-linear-to-b from-slate-900/90 to-slate-950/90 overflow-hidden shadow-[0_16px_50px_rgba(0,0,0,0.7)] hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(0,0,0,0.85)] transition-all duration-300 cursor-pointer"
              >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={blog.image}
                  alt={blog.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-[0.14em] bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/40">
                    {blog.badge}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-[0.14em] bg-slate-950/70 text-slate-200 border border-slate-700/80">
                    {blog.category}
                  </span>
                </div>
              </div>
              <div className="p-4 md:p-5 flex flex-col h-full">
                <p className="text-[11px] text-slate-400 mb-1">{blog.date}</p>
                <h3 className="text-base md:text-lg font-black text-white mb-2 line-clamp-2">
                  {blog.title}
                </h3>
                <p className="text-sm text-slate-300/90 mb-4 line-clamp-3">
                  {blog.excerpt}
                </p>
                <div className="mt-auto flex items-center justify-between pt-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
                    <Clock size={13} className="text-slate-400" />
                    {blog.readTime}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/blogs/${blog._id}`); }}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 group-hover:text-emerald-200"
                  >
                    Read story
                    <ArrowRight
                      size={14}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
                  </button>
                </div>
              </div>
            </article>
          )))}
        </div>
      </section>
    </main>
  );
};

export default BlogsPage;

