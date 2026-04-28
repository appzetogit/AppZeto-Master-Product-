import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ExploreGridSkeleton } from "@food/components/ui/loading-skeletons";
import OptimizedImage from "@food/components/OptimizedImage";
import discoveryBg from "@food/assets/food_discovery_bg.png";

const ExploreMoreSection = memo(({
  exploreMoreHeading,
  showExploreSkeleton,
  finalExploreItems,
  backendOrigin = ""
}) => {
  return (
    <section className="px-4 py-8">
      <h2 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-4 px-2">
        {exploreMoreHeading}
      </h2>
      
      <div className="grid grid-cols-3 gap-y-8 gap-x-2">
        {showExploreSkeleton ? (
          <ExploreGridSkeleton count={3} />
        ) : (
          finalExploreItems.map((item, index) => (
            <Link
              key={item.id}
              to={item.href}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] rounded-full overflow-hidden shadow-sm border border-gray-100 transition-transform group-hover:scale-110">
                <OptimizedImage
                  src={item.image}
                  alt={item.label}
                  className="w-full h-full object-cover"
                  backendOrigin={backendOrigin}
                />
              </div>
              <span className="text-xs font-semibold text-gray-500 text-center tracking-tight">
                {item.label}
              </span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
});

export default ExploreMoreSection;
