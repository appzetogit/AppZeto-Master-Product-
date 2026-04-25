import React, { useEffect } from 'react';
import gsap from 'gsap';

const Tagline = () => {
    useEffect(() => {
        gsap.from(".tagline-anim", {
            y: 50,
            opacity: 0,
            duration: 1,
            ease: "power4.out",
            stagger: 0.2
        });
    }, []);

    return (
        <div className="relative flex justify-center items-center py-12 md:py-20 overflow-hidden w-full">

            {/* 3D SHADOW TEXT */}
            <h1
                className="
          tagline-anim
          absolute 
          text-[3rem] sm:text-[4rem] md:text-[5rem] lg:text-[6rem]
          font-extrabold
          text-black/20
          translate-x-3 translate-y-3
          select-none
          whitespace-nowrap
        "
            >
                RUKO, BOOK KARO
            </h1>

            {/* MAIN TEXT */}
            <h1
                className="
          tagline-anim
          relative
          text-[3rem] sm:text-[4rem] md:text-[5rem] lg:text-[6rem]
          font-extrabold
          text-[#FFC107]
          whitespace-nowrap
          select-none
          drop-shadow-[4px_4px_0px_#000]
          z-10
        "
                style={{
                    WebkitTextStroke: "2px black",
                }}
            >
                RUKO, BOOK KARO
            </h1>

            {/* RED SLASH ACCENT - Adjusted for visual balance */}
            <span
                className="
          tagline-anim
          absolute
          w-4 md:w-6
          h-20 md:h-32
          bg-red-600
          rotate-[-20deg]
          rounded-md
          left-[10%] md:left-[20%]
          top-1/2
          -translate-y-1/2
          z-20
        "
            />
        </div>
    );
};

export default Tagline;
