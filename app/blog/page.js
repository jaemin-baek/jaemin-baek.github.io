import Link from 'next/link';
import { getAllPosts, getGraphData } from '@/lib/posts';
import BlogList from '@/components/BlogList';
import KnowledgeGraph from '@/components/KnowledgeGraph';

export const metadata = {
    title: 'Blog — Digital Garden',
    description: '포스트 목록 — Digital Garden',
};

export default function BlogPage() {
    const posts = getAllPosts().map((p) => ({
        slug: p.slug,
        title: p.title || p.slug,
        date: p.date || '',
        category: p.category || '',
        thumbnail: p.thumbnail || '',
    }));
    const graphData = getGraphData();

    return (
        <div className="page-container">
            <div className="blog-header fade-in">
                <h1>Blog</h1>
                <p className="blog-header-description">
                    옵시디언으로 작성한 글을 발행합니다. 글은 지식 그래프로 서로 연결됩니다.
                </p>
            </div>

            <BlogList posts={posts} />

            {graphData.nodes.length > 0 && (
                <section className="home-graph-preview fade-in">
                    <h2 className="section-title">Knowledge Graph</h2>
                    <Link href="/graph" style={{ border: 'none' }}>
                        <div className="graph-preview-container">
                            <KnowledgeGraph data={graphData} mini={true} />
                            <div className="graph-preview-overlay">
                                <span>{graphData.nodes.length} notes · {graphData.links.length} connections</span>
                                <span className="explore-link">Explore →</span>
                            </div>
                        </div>
                    </Link>
                </section>
            )}
        </div>
    );
}
