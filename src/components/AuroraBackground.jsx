import React, { useEffect } from 'react';
import { motion, useMotionTemplate, useMotionValue, animate } from 'framer-motion';

const AuroraBackground = () => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    useEffect(() => {
        const handleMouseMove = (e) => {
            // Smoothly animate the mouse values to avoid jitter
            animate(mouseX, e.clientX, { type: "tween", ease: "backOut", duration: 0.5 });
            animate(mouseY, e.clientY, { type: "tween", ease: "backOut", duration: 0.5 });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    // Dynamic background gradients that follow mouse heavily
    const bgGradient = useMotionTemplate`radial-gradient(
        circle at ${mouseX}px ${mouseY}px,
        rgba(76, 29, 149, 0.15),
        transparent 80%
    )`;

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" style={{ background: '#050505' }}>
            {/* Mouse follower subtle glow layer */}
            <motion.div
                className="absolute inset-0 opacity-100 mix-blend-screen"
                style={{ background: bgGradient }}
            />

            {/* Primary Fast Moving Blob - Left */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 45, -45, 0],
                    x: [0, 50, -25, 0],
                    y: [0, -25, 25, 0],
                    opacity: [0.4, 0.6, 0.4],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[-5%] left-[5%] w-[40vw] h-[40vw] bg-nebula-purple/30 rounded-full blur-[60px] mix-blend-screen"
                style={{
                    x: useMotionTemplate`calc(${mouseX}px / 20)`,
                    y: useMotionTemplate`calc(${mouseY}px / 20)`
                }}
            />

            {/* Secondary Fast Moving Blob - Right (Added for balance) */}
            <motion.div
                animate={{
                    scale: [1.1, 1, 1.2],
                    rotate: [0, -30, 30, 0],
                    x: [0, -50, 25, 0],
                    y: [0, 25, -25, 0],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                }}
                className="absolute top-[15%] right-[5%] w-[35vw] h-[35vw] bg-tech-blue/30 rounded-full blur-[70px] mix-blend-screen"
                style={{
                    x: useMotionTemplate`calc(${mouseX}px / -25)`,
                    y: useMotionTemplate`calc(${mouseY}px / -25)`
                }}
            />

            {/* Bottom/Center Wanderer - Faster */}
            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    x: [-50, 50, -50],
                    y: [-25, 25, -25],
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
                className="absolute bottom-[-10%] left-[30%] w-[45vw] h-[40vw] bg-emerald-500/10 rounded-full blur-[80px] mix-blend-screen"
                style={{
                    x: useMotionTemplate`calc(${mouseX}px / 15)`,
                    y: useMotionTemplate`calc(${mouseY}px / 15)`
                }}
            />
        </div>
    );
};

export default AuroraBackground;
