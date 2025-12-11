import React from 'react';
import { motion } from 'framer-motion';

const AuroraBackground = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            {/* Primary Aurora Blob - Deep Blue/Purple */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-nebula-purple/20 rounded-full blur-[100px] mix-blend-screen"
            />

            {/* Secondary Aurora Blob - Cyan/Tech Blue */}
            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    x: [0, 100, 0],
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
                className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-tech-blue/20 rounded-full blur-[120px] mix-blend-screen"
            />

            {/* Third Accent Blob - Subtle Green for that 'AI' feel */}
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    x: [-50, 50, -50],
                    y: [-50, 50, -50],
                    opacity: [0.1, 0.3, 0.1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 5
                }}
                className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-emerald-500/10 rounded-full blur-[90px] mix-blend-screen"
            />
        </div>
    );
};

export default AuroraBackground;
