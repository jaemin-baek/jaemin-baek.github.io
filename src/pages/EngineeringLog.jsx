import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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

    return (
        <section id="log" className="py-24 min-h-screen border-t border-white/5 relative z-20">
            <div className={`container mx-auto px-6 bg-[#030303] rounded-2xl p-8 md:p-12 shadow-2xl border border-white/5 transition-all duration-500 ${selectedPost ? 'max-w-6xl' : 'max-w-5xl'}`}>

                {/* Header */}
                <div className="mb-12 flex justify-between items-end">
                    <div>
                        <h2 className="text-sm font-mono text-tech-blue uppercase tracking-wider mb-2">Engineering Log</h2>
                        <p className="text-gray-500 text-sm">Technical notes and architectural decisions.</p>
                    </div>
                    {selectedPost && (
                        <button
                            onClick={() => setSelectedPost(null)}
                            className="hidden md:flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={16} /> Back to List
                        </button>
                    )}
                </div>

                <div className="space-y-6">
                    <AnimatePresence mode="wait">
                        {selectedPost ? (
                            // Focus Mode (Single Post View)
                            <motion.article
                                key="selected-post"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="w-full"
                            >
                                <button
                                    onClick={() => setSelectedPost(null)}
                                    className="md:hidden flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
                                >
                                    <ArrowLeft size={16} /> Back to List
                                </button>

                                <div className="mb-8 border-b border-white/10 pb-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-sm font-mono text-tech-blue">{selectedPost.date}</span>
                                        <span className="text-xs uppercase tracking-wide text-tech-blue/80 px-2 py-0.5 rounded border border-tech-blue/20 bg-tech-blue/5">{selectedPost.tag}</span>
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{selectedPost.title}</h1>
                                </div>

                                <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white prose-a:text-tech-blue hover:prose-a:text-white prose-pre:bg-[#0d1117] prose-pre:border-0 break-keep">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            code({ node, inline, className, children, ...props }) {
                                                const match = /language-(\w+)/.exec(className || '')
                                                const isInline = inline || (!match && String(children).indexOf('\n') === -1);

                                                return !isInline && match ? (
                                                    <SyntaxHighlighter
                                                        {...props}
                                                        style={vscDarkPlus}
                                                        language={match[1]}
                                                        PreTag="div"
                                                        // Removed border from here
                                                        className="rounded-lg shadow-lg my-6 !bg-[#0d1117] !p-6"
                                                        showLineNumbers={true}
                                                        wrapLines={true}
                                                    >
                                                        {String(children).replace(/\n$/, '')}
                                                    </SyntaxHighlighter>
                                                ) : (
                                                    <code className={`${isInline ? "bg-white/10 px-1.5 py-0.5 rounded text-sm text-tech-blue font-mono" : "block bg-white/5 p-4 rounded-lg my-4 text-sm font-mono overflow-x-auto"} `} {...props}>
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
                                </div>
                            </motion.article>
                        ) : (
                            // List Mode
                            <motion.div
                                key="post-list"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                {currentPosts.map((log) => (
                                    <motion.article
                                        key={log.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        onClick={() => setSelectedPost(log)}
                                        className="group relative pl-6 border-l border-white/10 hover:border-tech-blue cursor-pointer transition-all duration-300 hover:pl-8 py-2"
                                    >
                                        <div className="flex items-baseline justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-mono text-gray-500 group-hover:text-tech-blue transition-colors">{log.date}</span>
                                                <span className="text-[10px] uppercase tracking-wide text-tech-blue/80 px-1.5 py-0.5 rounded border border-tech-blue/20 bg-tech-blue/5">{log.tag}</span>
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 text-gray-200 group-hover:text-white transition-colors">
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

                                {/* Pagination Controls - Only show in List Mode */}
                                {totalPages > 1 && (
                                    <div className="flex justify-between items-center pt-8 border-t border-white/5 mt-12">
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
            </div>
        </section>
    );
};

export default EngineeringLog;
