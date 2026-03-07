import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';

export const metadata = {
    title: 'Blog — Jaemin Baek',
    description: '포스트 목록 — Jaemin Baek의 블로그',
};

export default function BlogPage() {
    const posts = getAllPosts();
    const categories = ['All', ...new Set(posts.map((p) => p.category).filter(Boolean))];

    return (
        <div className="page-container">
            <div className="blog-header fade-in">
                <h1>Blog</h1>
                <p className="blog-header-description">
                    옵시디언으로 작성한 글들을 발행합니다. 각 글은 지식 그래프를 통해 서로 연결되어 있습니다.
                </p>
            </div>

            <div className="category-filters">
                {categories.map((cat) => (
                    <span key={cat} className={`category-filter ${cat === 'All' ? 'active' : ''}`}>
                        {cat}
                    </span>
                ))}
            </div>

            <ul className="post-list fade-in">
                {posts.map((post) => (
                    <li key={post.slug}>
                        <Link href={`/blog/${post.slug}`} className="post-list-item post-list-link">
                            <span className="post-list-date">{formatDate(post.date)}</span>
                            <span className="post-list-category">{post.category}</span>
                            <span className="post-list-title">{post.title}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
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
