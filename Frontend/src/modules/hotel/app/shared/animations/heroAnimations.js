import gsap from 'gsap';

export const playHeroAnimation = () => {
    const tl = gsap.timeline({ delay: 0.2 });

    tl.from(".hero-title", {
        y: 80,
        opacity: 0,
        duration: 1,
        ease: "power4.out",
    })
        .from(".hero-subtitle", {
            y: 40,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
        }, "-=0.6")
        .from(".hero-btn", {
            scale: 0.9,
            opacity: 0,
            duration: 0.5,
            ease: "back.out(1.7)",
        }, "-=0.4")


    return tl;
};
