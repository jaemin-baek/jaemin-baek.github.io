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
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0a] via-[#050505] to-[#0b0b15] opacity-80" />

            <div className="absolute inset-0 opacity-40 mix-blend-color-dodge">
                {/* Wave 1: Primary Green/Emerald Curtain */}
                <motion.div
                    animate={{
                        x: ["-10%", "10%", "-10%"],
                        skewX: [0, 10, 0],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute top-[-20%] left-[-20%] w-[140vw] h-[80vh] bg-emerald-500/20 blur-[80px] rounded-[100%] origin-bottom transform -rotate-12"
                />

                {/* Wave 2: Deep Purple/Blue Curtain (Offset) */}
                <motion.div
                    animate={{
                        x: ["10%", "-10%", "10%"],
                        skewX: [0, -15, 0],
                        opacity: [0.2, 0.5, 0.2],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 2
                    }}
                    className="absolute top-[-10%] right-[-20%] w-[120vw] h-[90vh] bg-indigo-600/20 blur-[100px] rounded-[100%] origin-bottom transform rotate-12"
                />

                {/* Wave 3: Bright Cyan/White Accent (The "Ribbon") */}
                <motion.div
                    animate={{
                        x: ["-5%", "5%", "-5%"],
                        scaleY: [1, 1.2, 1],
                        opacity: [0.1, 0.3, 0.1],
                    }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 5
                    }}
                    className="absolute top-[20%] left-[10%] w-[100vw] h-[40vh] bg-cyan-400/10 blur-[60px] rounded-[50%] transform -rotate-6 mix-blend-screen"
                />
            </div>

            {/* Subtle Overlay Texture (Optional noise for realism if needed, sticking to smooth for now) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
        </div>
    );
};

export default AuroraBackground;
