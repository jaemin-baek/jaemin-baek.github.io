import Link from 'next/link';
import { getAllPosts, getGraphData } from '@/lib/posts';
import KnowledgeGraph from '@/components/KnowledgeGraph';

export default function HomePage() {
  const posts = getAllPosts();
  const recentPosts = posts.slice(0, 5);
  const graphData = getGraphData();

  return (
    <div className="page-container">
      <section className="hero-section fade-in">
        <h1>Digital Garden</h1>
        <p className="hero-description">
          소프트웨어 엔지니어 · 생각을 글로, 글을 코드로 연결합니다.
          <br />
          옵시디언으로 쓰고 GitHub Pages로 발행하는 디지털 가든입니다.
        </p>
      </section>

      <section className="home-recent-posts fade-in">
        <h2 className="section-title">Recent Posts</h2>
        <ul className="post-list">
          {recentPosts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="post-list-item post-list-link">
                <span className="post-list-date">{formatDate(post.date)}</span>
                <span className="post-list-category">{post.category}</span>
                <span className="post-list-title">{post.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

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

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
