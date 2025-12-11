import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const NavLink = ({ href, children }) => (
    <a href={href} className="text-gray-400 hover:text-white transition-colors duration-300 text-sm font-medium tracking-wide">
        {children}
    </a>
);

import AuroraBackground from './AuroraBackground';

const Layout = ({ children }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen text-star-white font-sans selection:bg-white selection:text-black relative">
            <AuroraBackground />

            <header className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${isScrolled ? 'bg-space-black/80 backdrop-blur-md border-white/5 py-4' : 'bg-transparent border-transparent py-6'}`}>
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <a href="/" className="text-xl font-bold tracking-tight cursor-pointer flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <span className="w-2 h-2 bg-tech-blue rounded-full"></span>
                        PORTFOLIO
                    </a>

                    <nav className="hidden md:flex space-x-8">
                        <NavLink href="#hero">Overview</NavLink>
                        <NavLink href="#engineering-log">Engineering Log</NavLink>
                        <NavLink href="#contact">Contact</NavLink>
                    </nav>

                    <button className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </header>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 bg-space-black z-40 flex flex-col items-center justify-center space-y-8 md:hidden"
                    >
                        <NavLink href="#hero" onClick={() => setIsMobileMenuOpen(false)}>Overview</NavLink>
                        <NavLink href="#engineering-log" onClick={() => setIsMobileMenuOpen(false)}>Engineering Log</NavLink>
                        <NavLink href="#contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</NavLink>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="relative pt-20">
                {children}
            </main>

            <footer className="py-12 text-center text-gray-500 text-sm tracking-widest relative z-10">
                <p>&copy; {new Date().getFullYear()} SOFTWARE ENGINEER. ALL RIGHTS RESERVED.</p>
            </footer>
        </div>
    );
};

export default Layout;
