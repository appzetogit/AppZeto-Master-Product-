import React from 'react';
import { Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CategoryCircles = () => {
    const navigate = useNavigate();

    const categories = [
        { name: "Nearby", icon: true, color: "bg-surface", destination: "Near Me" },
        { name: "Indore", img: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=500&q=80", destination: "Indore" },
        { name: "Bhopal", img: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&q=80", destination: "Bhopal" },
        { name: "Mumbai", img: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=500&q=80", destination: "Mumbai" },
        { name: "Delhi", img: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=500&q=80", destination: "Delhi" },
        { name: "Goa", img: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=500&q=80", destination: "Goa" },
    ];

    const handleCategoryClick = (cat) => {
        navigate('/listings', {
            state: {
                destination: cat.destination,
                dates: { checkIn: null, checkOut: null },
                guests: { rooms: 1, adults: 2, children: 0 },
                isNearMe: cat.name === "Nearby"
            }
        });
    };

    return (
        <div className="flex gap-4 overflow-x-auto px-5 pb-4 no-scrollbar">
            {categories.map((cat, i) => (
                <button
                    key={i}
                    className="flex flex-col items-center gap-2 min-w-[64px] group outline-none"
                    onClick={() => handleCategoryClick(cat)}
                >

                    {/* Circle Wrapper */}
                    <div className={`
             w-16 h-16 rounded-full overflow-hidden 
             shadow-md border-2 border-white 
             flex items-center justify-center
             transition-transform duration-300 group-hover:scale-110 group-active:scale-95
             ${cat.color || 'bg-gray-100'}
          `}>
                        {cat.icon ? (
                            <Navigation className="text-white fill-white" size={24} />
                        ) : (
                            <img src={cat.img} alt={cat.name} className="w-full h-full object-cover" />
                        )}
                    </div>

                    <span className="text-xs font-medium text-surface/60 group-hover:text-surface transition-colors">
                        {cat.name}
                    </span>
                </button>
            ))}
        </div>
    );
};

export default CategoryCircles;
