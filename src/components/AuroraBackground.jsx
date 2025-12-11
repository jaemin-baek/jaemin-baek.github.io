```javascript
import React from 'react';
import { motion } from 'framer-motion';

const AuroraBackground = () => {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" style={{ background: '#050505' }}>
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
            />
        </div>
    );
};

export default AuroraBackground;
```
