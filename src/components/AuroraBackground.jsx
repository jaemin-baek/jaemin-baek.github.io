import React from 'react';
import { motion } from 'framer-motion';

const AuroraBackground = () => {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#020202]">
            {/* 
               The "Curtain" Effect:
               We use elongated, highly blurred shapes that are rotated and skewed.
               By animating 'x' and 'skew', we simulate the waving motion of an aurora curtain.
            */}

            {/* Base Gradient - Deep Atmospheric Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0a] via-[#050505] to-[#0b0b15] opacity-60" />

            <div className="absolute inset-0 opacity-100 mix-blend-screen overflow-hidden">
                {/* Wave 1: Primary Green/Emerald - Faster, Smaller, drifting */}
                <motion.div
                    animate={{
                        x: ["-20%", "40%", "-20%"],
                        y: ["0%", "10%", "0%"],
                        skewX: [0, 20, 0],
                        opacity: [0, 0.8, 0], // Fades in and out for "random appearance" feel
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 10, // Faster (~2x speed)
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute top-[10%] left-[-10%] w-[60vw] h-[40vh] bg-emerald-500/30 blur-[60px] rounded-[100%] transform -rotate-12"
                />

                {/* Wave 2: Deep Purple/Blue - Faster offset */}
                <motion.div
                    animate={{
                        x: ["20%", "-40%", "20%"],
                        y: ["10%", "-10%", "10%"],
                        skewX: [0, -25, 0],
                        opacity: [0, 0.7, 0],
                        scale: [1, 1.3, 1],
                    }}
                    transition={{
                        duration: 12, // Faster
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 2
                    }}
                    className="absolute top-[30%] right-[-10%] w-[50vw] h-[50vh] bg-indigo-500/30 blur-[80px] rounded-[100%] transform rotate-12"
                />

                {/* Wave 3: Bright Cyan/White Accent - The "Flash" */}
                <motion.div
                    animate={{
                        x: ["0%", "50%", "0%"],
                        y: ["-10%", "20%", "-10%"],
                        rotation: [0, 10, 0],
                        opacity: [0, 0.6, 0],
                    }}
                    transition={{
                        duration: 8, // Fastest
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 4
                    }}
                    className="absolute bottom-[10%] left-[20%] w-[40vw] h-[30vh] bg-cyan-400/20 blur-[50px] rounded-[50%] transform -rotate-6"
                />
            </div>

            {/* Subtle Overlay Texture (Optional noise for realism if needed, sticking to smooth for now) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
        </div>
    );
};

export default AuroraBackground;
