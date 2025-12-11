import React from 'react';
import { motion } from 'framer-motion';

const Hero = () => {
    return (
        <section id="hero" className="min-h-[50vh] flex items-center justify-center pt-32 pb-16">
            <div className="container mx-auto px-6 max-w-3xl text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-tech-blue mb-8 hover:bg-white/10 transition-colors cursor-default">
                        <span className="w-1.5 h-1.5 bg-tech-blue rounded-full animate-pulse"></span>
                        Available for new opportunities
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold mb-8 tracking-tighter leading-tight text-white">
                        Engineering <span className="text-gray-600">Excellence.</span>
                    </h1>

                    <p className="text-lg text-gray-400 font-light leading-relaxed mb-6">
                        Specializing in scalable mobile architectures and high-performance rendering engines.
                        With over 10 years of experience, I bridge the gap between complex engineering challenges and seamless user experiences.
                        Previously optimized rendering pipelines for 600M+ users.
                    </p>
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
