import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const useLenis = (disabled = false) => {
    useEffect(() => {
        if (disabled) return;

        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smooth: true,
            lerp: 0.08,
            touchMultiplier: 2, // Improve mobile touch feel
        });

        // Sync ScrollTrigger with Lenis
        lenis.on('scroll', ScrollTrigger.update);

        // Use GSAP ticker to drive Lenis for perfect sync
        const update = (time) => {
            lenis.raf(time * 1000);
        };

        gsap.ticker.add(update);

        gsap.ticker.lagSmoothing(0);

        window.lenis = lenis;

        return () => {
            lenis.destroy();
            gsap.ticker.remove(update);
            window.lenis = null;
        };
    }, [disabled]);
};
