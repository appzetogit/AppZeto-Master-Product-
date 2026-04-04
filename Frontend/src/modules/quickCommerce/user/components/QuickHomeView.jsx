import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react';
import QuickHeader from './QuickHeader';
import quickApi from '../services/quickApi';
import { useQuickCart } from '../context/QuickCartContext';
import ProductCard from './ProductCard';
import QuickCategories from './QuickCategories';
import ExperienceBannerCarousel from './ExperienceBannerCarousel';
import cardBanner from '../assets/CardBanner.jpg';

const marqueeMessages = [
  '24/7 Delivery Available',
  'Minimum Order ₹99 for Free Shipping',
  'Fresh Vegetables & Fruits Every Hour',
  'Big Savings on Daily Essentials!',
];

const ALL_CATEGORY = {
  id: 'all',
  _id: 'all',
  name: 'All',
  headerColor: '#0c831f',
  image: 'https://cdn-icons-png.flaticon.com/128/2321/2321831.png'
};

const homeBanners = [
  {
    image: cardBanner,
    title: 'Fresh Grocery',
    subtitle: 'Up to 50% OFF'
  },
  {
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=1200&h=400',
    title: 'Daily Essentials',
    subtitle: 'Fresh & Fast'
  },
  {
    image: 'https://images.unsplash.com/photo-1604719312563-8912e9223c6a?auto=format&fit=crop&q=80&w=1200&h=400',
    title: 'Fruits & Veggies',
    subtitle: 'Direct from Farms'
  }
];

function ProductRail({ title, subtitle, products, cartItems, onAdd, onIncrement, onDecrement, onViewAll }) {
  const scrollRef = useRef(null);
  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });

  return (
    <section className="mt-12 mb-4 group/rail">
      <div className="mb-6 flex items-end justify-between px-1">
        <div>
          <h2 className="text-[26px] font-black tracking-tight text-[#111827] md:text-[30px]">{title}</h2>
          {subtitle && <p className="text-sm font-medium text-slate-500">{subtitle}</p>}
        </div>
        <button onClick={onViewAll} className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-[#0c831f] hover:underline">
          See all
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        <div 
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4 md:-mx-6 md:px-6 scroll-smooth"
        >
          {products.map((product) => {
            const quantity = cartItems.find(i => String(i.productId || i.id || i._id) === String(product.id || product._id))?.quantity || 0;
            return (
              <div key={product.id || product._id} className="w-[180px] shrink-0 md:w-[210px]">
                <ProductCard
                  product={product}
                  quantity={quantity}
                  onAdd={() => onAdd(product)}
                  onIncrement={() => onIncrement(product)}
                  onDecrement={() => onDecrement(product)}
                />
              </div>
            );
          })}
        </div>
        
        <button 
          onClick={scrollLeft}
          className="absolute -left-5 top-[40%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-100 bg-white shadow-2xl transition-all hover:bg-slate-50 md:group-hover/rail:flex opacity-0 group-hover/rail:opacity-100 active:scale-90"
        >
          <ChevronLeft className="h-6 w-6 text-slate-900" />
        </button>
        <button 
          onClick={scrollRight}
          className="absolute -right-5 top-[40%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-100 bg-white shadow-2xl transition-all hover:bg-slate-50 md:group-hover/rail:flex opacity-0 group-hover/rail:opacity-100 active:scale-90"
        >
          <ChevronRight className="h-6 w-6 text-slate-900" />
        </button>
      </div>
    </section>
  );
}

export default function QuickHomeView({ embed = false, preserveHeader = false }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { items, addToCart, updateQuantity } = useQuickCart();
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [homeRes, categoriesRes, productRes] = await Promise.all([
          quickApi.getHome(),
          quickApi.getCategories(),
          quickApi.getProducts({ limit: 200 }),
        ]);
        if (!mounted) return;
        const allCats = Array.isArray(homeRes?.categories) && homeRes.categories.length > 0
          ? homeRes.categories
          : (Array.isArray(categoriesRes) ? categoriesRes : []);
        const allProducts = Array.isArray(productRes?.items) ? productRes.items : [];
        setCategories([ALL_CATEGORY, ...allCats]);
        setProducts(allProducts.length > 0 ? allProducts : (homeRes?.bestSellers || []));
        setActiveCategory(ALL_CATEGORY);
      } catch (err) {
        console.error("Home data fetch failed", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const featuredCategories = useMemo(() => categories.slice(0, 20), [categories]);

  const handleIncrement = async (product) => {
    const cartItem = items.find(i => String(i.productId || i.id || i._id) === String(product.id || product._id));
    if (cartItem) {
      await updateQuantity(product.id || product._id, Number(cartItem.quantity || 0) + 1);
    } else {
      await addToCart(product);
    }
  };

  const handleDecrement = async (product) => {
    const cartItem = items.find(i => String(i.productId || i.id || i._id) === String(product.id || product._id));
    if (!cartItem) return;
    await updateQuantity(product.id || product._id, Number(cartItem.quantity || 0) - 1);
  };

  const { scrollY } = useScroll();
  const bannerOpacity = useTransform(scrollY, [0, 400], [1, 0.4]);
  const bannerScale = useTransform(scrollY, [0, 400], [1, 0.95]);

  const filteredCategories = useMemo(() => {
    if (!activeCategory || activeCategory.id === 'all') {
      return categories.slice(1, 5); // Skip 'All'
    }
    return categories.filter(cat => String(cat.id || cat._id) === String(activeCategory.id || activeCategory._id));
  }, [categories, activeCategory]);

  const showInlineFullHeader = embed && preserveHeader;

  return (
    <div className={embed ? "bg-[#f8fafc]" : "min-h-screen bg-[#f8fafc] pb-24 pt-[216px] md:pt-[250px]"}>
      <QuickHeader 
        categories={categories} 
        activeCategory={activeCategory} 
        onCategorySelect={setActiveCategory} 
        isEmbedded={embed && !preserveHeader}
        isInline={showInlineFullHeader}
      />

      <main className={cn("mx-auto max-w-[1600px] px-4 pt-4 text-[#1a1c1e] md:px-8 md:pt-6")}>
        {embed && !preserveHeader && (
          <section className="mb-3 px-1">
            <h1 className="text-[22px] font-black leading-tight tracking-tight text-[#111827] md:text-[28px]">
              Quick
            </h1>
            <p className="text-xs font-medium text-slate-500 md:text-sm">
              Groceries and essentials delivered fast
            </p>
          </section>
        )}
        
        {/* Banner Section */}
        {(!activeCategory || activeCategory.id === 'all') && (
           <motion.section 
             style={{ opacity: bannerOpacity, scale: bannerScale }}
             className="mt-2"
           >
              <ExperienceBannerCarousel items={homeBanners} slideGap={16} />
           </motion.section>
        )}

        {/* Marquee */}
        <section className="mt-8 flex overflow-hidden rounded-[24px] border border-slate-100 bg-white py-4 shadow-[0_4px_15px_rgba(0,0,0,0.03)]">
           <div className="flex w-max animate-scroll gap-16 whitespace-nowrap px-8">
              {[...marqueeMessages, ...marqueeMessages].map((msg, i) => (
                <div key={i} className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-[#1d2939]">
                  <Star className="h-4 w-4 fill-current text-[#0c831f]" />
                  {msg}
                </div>
              ))}
           </div>
        </section>

        {/* Categories Grid - Only on Home/All */}
        {(!activeCategory || activeCategory.id === 'all') && (
           <QuickCategories categories={featuredCategories.slice(1)} />
        )}

        {/* Product Sections */}
        {loading ? (
             <div className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-4 lg:grid-cols-6">
                {[...Array(6)].map((_, i) => (
                   <div key={i} className="aspect-[4/5.5] animate-pulse rounded-[32px] bg-slate-100" />
                ))}
             </div>
        ) : (
          <>
            {(!activeCategory || activeCategory.id === 'all') && (
              <ProductRail 
                 title="Best Sellers" 
                 subtitle="Top picks from your locality"
                 products={products}
                 cartItems={items}
                 onAdd={addToCart}
                 onIncrement={handleIncrement}
                 onDecrement={handleDecrement}
                 onViewAll={() => navigate('/quick-commerce/user/categories')}
              />
            )}
            
            {/* Dynamic sections based on categories */}
            {filteredCategories.map(cat => {
                 const catProducts = products.filter(p => String(p.categoryId?._id || p.categoryId) === String(cat.id || cat._id));
                 if (!catProducts.length) return null;
                 return (
                   <ProductRail 
                      key={cat.id || cat._id}
                      title={cat.name}
                      subtitle={`Trending in ${cat.name}`}
                      products={catProducts}
                      cartItems={items}
                      onAdd={addToCart}
                      onIncrement={handleIncrement}
                      onDecrement={handleDecrement}
                      onViewAll={() => navigate(`/quick-commerce/user/products?categoryId=${cat.id || cat._id}`)}
                   />
                 )
            })}
          </>
        )}

        {/* Assurances */}
        <section className="mt-20 grid gap-8 pb-20 md:grid-cols-2">
           <motion.div 
             whileHover={{ y: -10 }}
             className="rounded-[48px] bg-[#111827] p-10 text-white shadow-2xl md:p-14 relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
              <Star className="mb-6 h-10 w-10 fill-[#ffe87d] text-[#ffe87d]" />
              <h2 className="text-4xl font-black leading-tight md:text-5xl">
                The ultimate quick <br/> commerce experience.
              </h2>
              <p className="mt-6 text-lg text-slate-400">
                Premium UI inspired by industry leaders, connected to your local business logic.
              </p>
              <button className="mt-8 rounded-full bg-white/10 px-6 py-3 text-sm font-bold backdrop-blur-md">Learn more</button>
           </motion.div>
           
           <motion.div 
             whileHover={{ y: -10 }}
             className="rounded-[48px] border border-slate-100 bg-white p-10 shadow-2xl md:p-14 relative overflow-hidden"
           >
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50/50 rounded-full blur-[80px] -ml-32 -mb-32" />
              <div className="mb-6 flex items-center justify-center rounded-3xl bg-emerald-50 p-5 w-20 h-20">
                 <ShieldCheck className="h-10 w-10 text-[#0c831f]" />
              </div>
              <h2 className="text-4xl font-black leading-tight text-slate-900 md:text-5xl">
                Safe & Secure <br/> Transactions.
              </h2>
              <p className="mt-6 text-lg text-slate-500">
                End-to-end encrypted payments and verified delivery partners ensure your safety.
              </p>
              <div className="mt-8 flex gap-4">
                 <Zap className="h-6 w-6 text-amber-500" />
                 <span className="font-bold text-slate-900">Instant Verification</span>
              </div>
           </motion.div>
        </section>
      </main>
    </div>
  );
}
