import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Linkedin, Github } from 'lucide-react';

const Contact = () => {
    return (
        <section id="contact" className="py-32 px-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute center w-96 h-96 bg-nebula-purple/20 blur-[128px] pointer-events-none rounded-full" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                viewport={{ once: true }}
                className="z-10"
            >
                <span className="text-nebula-purple uppercase tracking-[0.2em] text-sm font-semibold">Get In Touch</span>
                <h2 className="text-4xl md:text-5xl font-cinzel font-bold mt-4 mb-8 text-white">LET'S COMPOSE</h2>

                <p className="text-gray-400 mb-8 max-w-xl mx-auto font-light leading-relaxed">
                    From scalable mobile architectures to high-performance rendering engines.
                    Ready to discuss your next high-impact engineering challenge.
                </p>

                <div className="flex justify-center mb-16 relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-tech-blue to-nebula-purple rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                    <a href="mailto:contact@example.com" className="relative px-8 py-3 bg-black border border-white/10 rounded-lg leading-none flex items-center divide-x divide-gray-600">
                        <span className="flex items-center space-x-5 text-gray-100 group-hover:text-white transition-colors duration-200">
                            <span className="pr-1 text-sm font-light tracking-wide">Ready to collaborate?</span>
                            <span className="pl-6 font-bold tracking-widest uppercase">Contact Me</span>
                        </span>
                    </a>
                </div>

                <div className="flex gap-8 justify-center mt-12 text-gray-500">
                    <a href="#" className="hover:text-white hover:scale-110 transition-all duration-300"><Github className="w-6 h-6" /></a>
                    <a href="#" className="hover:text-white hover:scale-110 transition-all duration-300"><Linkedin className="w-6 h-6" /></a>
                    <a href="#" className="hover:text-white hover:scale-110 transition-all duration-300"><Mail className="w-6 h-6" /></a>
                </div>
            </motion.div>
        </section>
    );
};

export default Contact;
