import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const initScrollReveal = () => {
    // Reveal strictly for elements with .reveal class
    const elements = document.querySelectorAll('.reveal');

    elements.forEach((el) => {
        gsap.fromTo(el,
            { y: 60, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.8,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: el,
                    start: "top 85%",
                    toggleActions: "play none none reverse"
                }
            }
        );
    });

    // Staggered reveal for cards container
    const staggerContainers = document.querySelectorAll('.reveal-stagger');
    staggerContainers.forEach((container) => {
        gsap.fromTo(container.children,
            { y: 40, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.6,
                stagger: 0.15,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: container,
                    start: "top 80%",
                }
            }
        );
    });
};
