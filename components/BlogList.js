'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

const PAGE_SIZE = 10;

export default function BlogList({ posts }) {
    const [activeCategory, setActiveCategory] = useState('All');
    const [page, setPage] = useState(1);

    const categories = useMemo(
        () => ['All', ...new Set(posts.map((p) => p.category).filter(Boolean))],
        [posts]
    );

    const filtered = useMemo(
        () => (activeCategory === 'All' ? posts : posts.filter((p) => p.category === activeCategory)),
        [posts, activeCategory]
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const visible = filtered.slice(start, start + PAGE_SIZE);

    const handleCategoryClick = (cat) => {
        setActiveCategory(cat);
        setPage(1);
    };

    return (
        <>
            <div className="category-filters">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryClick(cat)}
                        className={`category-filter ${cat === activeCategory ? 'active' : ''}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {visible.length === 0 ? (
                <p className="post-list-empty">표시할 포스트가 없습니다.</p>
            ) : (
                <ul className="post-list fade-in">
                    {visible.map((post) => (
                        <li key={post.slug}>
                            <Link
                                href={`/blog/${post.slug}`}
                                className={`post-list-item post-list-link ${post.thumbnail ? '' : 'no-thumbnail'}`}
                            >
                                <span className="post-list-date">{formatDate(post.date)}</span>
                                <span className="post-list-category">{post.category}</span>
                                {post.thumbnail && (
                                    <span className="post-list-thumbnail" aria-hidden="true">
                                        <img src={post.thumbnail} alt="" loading="lazy" />
                                    </span>
                                )}
                                <span className="post-list-title">{post.title}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {totalPages > 1 && (
                <nav className="pagination" aria-label="Pagination">
                    <button
                        type="button"
                        className="pagination-btn"
                        onClick={() => setPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                    >
                        ←
                    </button>
                    {getPaginationRange(currentPage, totalPages).map((item, idx) =>
                        item === '...' ? (
                            <span
                                key={`ellipsis-${idx}`}
                                className="pagination-ellipsis"
                                aria-hidden="true"
                            >
                                …
                            </span>
                        ) : (
                            <button
                                key={item}
                                type="button"
                                className={`pagination-btn ${item === currentPage ? 'active' : ''}`}
                                onClick={() => setPage(item)}
                                aria-current={item === currentPage ? 'page' : undefined}
                            >
                                {item}
                            </button>
                        )
                    )}
                    <button
                        type="button"
                        className="pagination-btn"
                        onClick={() => setPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                    >
                        →
                    </button>
                </nav>
            )}
        </>
    );
}

function getPaginationRange(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 3) {
        return [1, 2, 3, 4, '...', total];
    }
    if (current >= total - 2) {
        return [1, '...', total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}
