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

                <div className="flex justify-center mb-16">
                    <a href="mailto:contact@example.com" className="inline-block px-8 py-3 bg-white text-black font-semibold rounded hover:bg-gray-200 transition-colors">
                        Contact Me
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
