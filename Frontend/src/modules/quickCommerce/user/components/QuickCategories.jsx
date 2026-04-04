import quickBg from '../assets/Catagorysection_bg.png';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { resolveQuickImageUrl } from '../utils/image';
import { useState } from 'react';
import { getQuickProductsPath } from '../utils/routes';

const categoryPalettes = [
  { from: "#ffe5e5", to: "#fff5f5" },
  { from: "#e5f9ff", to: "#f5feff" },
  { from: "#fff9e5", to: "#fffdf5" },
  { from: "#e5fff1", to: "#f5fff9" },
];

function CategoryTileImage({ name, image }) {
  const [broken, setBroken] = useState(false);
  const candidate =
    image?.url ||
    image?.src ||
    image?.image ||
    image?.thumbnail ||
    image ||
    "";
  const src = resolveQuickImageUrl(candidate);
  const showFallback = !src || broken;

  if (showFallback) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white/50 text-xl font-black uppercase text-slate-400">
        {(name || '?').charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className="h-full w-full object-contain mix-blend-multiply transition duration-300"
      onError={() => setBroken(true)}
    />
  );
}

export default function QuickCategories({ categories = [] }) {
  const navigate = useNavigate();

  return (
    <section 
      className="mt-8 overflow-hidden rounded-[40px] border border-[#e9efe7] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.06)]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.85) 100%), url(${quickBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="p-6 md:p-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-[24px] font-black tracking-tight text-[#111827] md:text-[32px]">Shop by category</h2>
            <p className="text-sm font-medium text-slate-500">Pick from our curated range of products.</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10">
          {categories.map((cat, idx) => (
            <motion.button
              key={cat.id || cat._id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                navigate(
                  `${getQuickProductsPath()}?categoryId=${cat.id || cat._id}`,
                )
              }
              className="group flex flex-col items-center gap-2"
            >
              <div 
                className="flex aspect-square w-full items-center justify-center rounded-[24px] border border-white p-2 shadow-sm transition-all group-hover:shadow-lg bg-cover bg-center"
                style={{ 
                  background: `linear-gradient(135deg, ${categoryPalettes[idx % 4].from}, ${categoryPalettes[idx % 4].to})` 
                }}
              >
                  <CategoryTileImage name={cat.name} image={cat.image} />
              </div>
              <span className="text-center text-[10px] font-black leading-tight text-slate-700 line-clamp-2 md:text-[11px] uppercase tracking-wide">
                {cat.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
