import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const ProjectCard = ({ project, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden rounded-xl bg-deep-space border border-white/10 hover:border-white/30 transition-colors duration-500"
        >
            {/* Image / Placeholder */}
            <div className="aspect-video bg-gray-800 overflow-hidden relative">
                {/* Since we don't have real images yet, use a gradient or placeholder text */}
                <div className="absolute inset-0 bg-gradient-to-br from-nebula-purple to-transparent opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-cinzel text-xl tracking-widest opacity-30 group-hover:scale-105 transition-transform duration-700">
                    {project.title.toUpperCase()}
                </div>
                {/* If we had images: <img src={project.image} alt={project.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" /> */}
            </div>

            <div className="p-6 relative">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className="text-xs font-bold text-nebula-purple uppercase tracking-widest">{project.category}</span>
                        <h3 className="text-2xl font-cinzel font-bold text-white mt-2 group-hover:text-nebula-purple transition-colors duration-300">{project.title}</h3>
                    </div>
                    <ArrowUpRight className="text-gray-500 group-hover:text-white transition-colors duration-300 transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                </div>

                <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3">
                    {project.description}
                </p>

                <div className="flex flex-wrap gap-2">
                    {project.tech.map((t, i) => (
                        <span key={i} className="text-[10px] uppercase tracking-wider px-2 py-1 bg-white/5 rounded-full text-stardust border border-white/5">
                            {t}
                        </span>
                    ))}
                </div>
            </div>

            {/* Glow effect on hover */}
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-transparent group-hover:ring-white/20 transition-all duration-500 pointer-events-none" />
        </motion.div>
    );
};

export default ProjectCard;
