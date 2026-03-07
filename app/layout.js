import './globals.css';

export const metadata = {
  title: 'Jaemin Baek',
  description: '개인 포트폴리오 겸 블로그 — 옵시디언으로 쓰고 GitHub Pages로 발행합니다.',
  openGraph: {
    title: 'Jaemin Baek',
    description: '개인 포트폴리오 겸 블로그',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="/" className="site-logo">
          JAEMIN\B
        </a>
        <nav className="site-nav">
          <a href="/blog">Blog</a>
          <a href="/graph">Graph</a>
          <a href="/about">About</a>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3>Jaemin Baek</h3>
            <p>
              옵시디언으로 글을 쓰고, Anthropic 스타일의 GitHub Pages로 발행합니다.
              지식 그래프로 생각의 연결을 시각화합니다.
            </p>
          </div>
          <div className="footer-links">
            <h4>Navigate</h4>
            <ul>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/graph">Graph</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Connect</h4>
            <ul>
              <li><a href="https://github.com/jaemin-baek" target="_blank" rel="noopener noreferrer">GitHub</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {year} Jaemin Baek. All rights reserved.</p>
          <div className="footer-social">
            <a href="https://github.com/jaemin-baek" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
