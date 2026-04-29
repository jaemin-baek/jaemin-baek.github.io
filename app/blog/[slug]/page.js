import Link from 'next/link';
import { getAllPostSlugs, getPostWithHtml, getAllPosts } from '@/lib/posts';

export async function generateStaticParams() {
    const slugs = getAllPostSlugs();
    return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const post = await getPostWithHtml(slug);
    if (!post) return { title: 'Not Found' };

    return {
        title: `${post.title} — Digital Garden`,
        description: post.description || '',
    };
}

export default async function PostPage({ params }) {
    const { slug } = await params;
    const post = await getPostWithHtml(slug);

    if (!post) {
        return (
            <div className="page-container content-narrow" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
                <h1>Post Not Found</h1>
                <p style={{ marginTop: '1rem' }}>
                    <Link href="/blog">← Back to blog</Link>
                </p>
            </div>
        );
    }

    // Find related posts (posts that this post links to)
    const allPosts = getAllPosts();
    const linkedSlugs = post.links.map((l) => l.target.toLowerCase().replace(/\s+/g, '-'));
    const relatedPosts = allPosts.filter((p) => linkedSlugs.includes(p.slug) && p.slug !== slug);

    return (
        <div className="page-container">
            <article className="content-narrow fade-in">
                <header className="post-header">
                    {post.category && <span className="post-category">{post.category}</span>}
                    <h1 className="post-title">{post.title}</h1>
                    {post.date && <time className="post-date">{formatDate(post.date)}</time>}
                </header>

                <div
                    className="post-content"
                    dangerouslySetInnerHTML={{ __html: post.contentHtml }}
                />

                {relatedPosts.length > 0 && (
                    <section className="related-posts">
                        <h3>Related Content</h3>
                        <ul className="related-posts-list">
                            {relatedPosts.map((rp) => (
                                <li key={rp.slug}>
                                    <Link href={`/blog/${rp.slug}`}>{rp.title}</Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </article>
        </div>
    );
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}
