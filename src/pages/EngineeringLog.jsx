import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import blogPosts from '../data/blog_posts.json';

const EngineeringLog = () => {
    const [selectedPost, setSelectedPost] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const postsPerPage = 5;

    // Pagination Logic
    const indexOfLastPost = currentPage * postsPerPage;
    const indexOfFirstPost = indexOfLastPost - postsPerPage;
    const currentPosts = blogPosts.slice(indexOfFirstPost, indexOfLastPost);
    const totalPages = Math.ceil(blogPosts.length / postsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    // Scroll to top when opening a post
    useEffect(() => {
        if (selectedPost) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [selectedPost]);

    return (
        <section id="log" className="py-24 min-h-screen border-t border-white/5 relative z-20">
            <div className={`container mx-auto px-6 ${selectedPost ? 'max-w-5xl' : 'max-w-3xl'} bg-[#030303] rounded-2xl p-8 md:p-12 shadow-2xl border border-white/5 transition-all duration-500`}>

                {/* Header / Back Button (Standard) */}
                <div className="mb-12">
                    {selectedPost ? (
                        <button
                            onClick={() => setSelectedPost(null)}
                            className="group flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-mono uppercase tracking-wider">Back to Log</span>
                        </button>
                    ) : (
                        <div>
                            <h2 className="text-sm font-mono text-tech-blue uppercase tracking-wider mb-2">Engineering Log</h2>
                            <p className="text-gray-500 text-sm">Technical notes and architectural decisions.</p>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {selectedPost ? (
                        // Detail View
                        <motion.article
                            key="detail"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white prose-a:text-tech-blue hover:prose-a:text-white prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-white/10 break-keep"
                        >
                            <div className="flex items-center gap-3 mb-6 not-prose">
                                <span className="text-sm font-mono text-gray-500">{selectedPost.date}</span>
                                <span className="text-xs uppercase tracking-wide text-tech-blue/80 px-2 py-0.5 rounded border border-tech-blue/20 bg-tech-blue/5">
                                    {selectedPost.tag}
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
                                {selectedPost.title}
                            </h1>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ node, inline, className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || '')
                                        const isInline = inline || (!match && String(children).indexOf('\n') === -1);

                                        return !isInline && match ? (
                                            <SyntaxHighlighter
                                                {...props}
                                                style={atomDark}
                                                language={match[1]}
                                                PreTag="div"
                                                className="rounded-lg shadow-lg border border-white/5 my-6 !bg-[#0d1117]"
                                                showLineNumbers={true}
                                                wrapLines={true}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code className={`${isInline ? "bg-white/10 px-1.5 py-0.5 rounded text-sm text-tech-blue font-mono" : "block bg-white/5 p-4 rounded-lg my-4 text-sm font-mono overflow-x-auto"}`} {...props}>
                                                {children}
                                            </code>
                                        )
                                    },
                                    img({ node, ...props }) {
                                        return (
                                            <img
                                                {...props}
                                                className="rounded-lg shadow-lg my-8 opacity-90 transition-all duration-300 hover:opacity-100"
                                                style={{ filter: "invert(0.92) hue-rotate(180deg) contrast(1.1)" }}
                                            />
                                        )
                                    },
                                    strong({ node, children, ...props }) {
                                        return <strong className="font-bold text-white" {...props}>{children}</strong>
                                    }
                                }}
                            >
                                {selectedPost.content}
                            </ReactMarkdown>

                            {/* Floating Back Button (Bottom Right) */}
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedPost(null)}
                                className="fixed bottom-8 right-8 z-50 bg-tech-blue text-white p-4 rounded-full shadow-2xl shadow-tech-blue/30 hover:bg-white hover:text-black transition-colors"
                            >
                                <X size={24} />
                            </motion.button>
                        </motion.article>
                    ) : (
                        // List View
                        <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-8"
                        >
                            <div className="space-y-6">
                                {currentPosts.map((log) => (
                                    <motion.article
                                        key={log.id}
                                        layoutId={`post-${log.id}`}
                                        className="group relative pl-6 border-l border-white/10 hover:border-tech-blue/50 transition-colors py-2 cursor-pointer"
                                        onClick={() => setSelectedPost(log)}
                                    >
                                        <div className="flex items-baseline justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-mono text-gray-500">{log.date}</span>
                                                <span className="text-[10px] uppercase tracking-wide text-tech-blue/80 px-1.5 py-0.5 rounded border border-tech-blue/20 bg-tech-blue/5">{log.tag}</span>
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-200 group-hover:text-white mb-2 transition-colors">
                                            {log.title}
                                        </h3>
                                        <div className="text-gray-400 font-light text-sm line-clamp-3 leading-relaxed">
                                            <ReactMarkdown
                                                allowedElements={['p', 'strong', 'em', 'code', 'span']}
                                                unwrapDisallowed={true}
                                                components={{
                                                    p: ({ node, ...props }) => <span className="mb-1 inline" {...props} />,
                                                    code: ({ node, inline, className, children, ...props }) => (
                                                        <code className="bg-white/10 px-1 py-0.5 rounded text-xs text-tech-blue font-mono inline whitespace-nowrap" {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                }}
                                            >
                                                {log.content}
                                            </ReactMarkdown>
                                        </div>
                                    </motion.article>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex justify-between items-center pt-8 border-t border-white/5">
                                    <button
                                        onClick={handlePrevPage}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                                    >
                                        <ChevronLeft size={16} /> Previous
                                    </button>
                                    <span className="text-xs font-mono text-gray-400">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={handleNextPage}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
};

export default EngineeringLog;
