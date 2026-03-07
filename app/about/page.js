export const metadata = {
    title: 'About — Jaemin Baek',
    description: 'Jaemin Baek 소개',
};

export default function AboutPage() {
    return (
        <div className="page-container">
            <div className="content-narrow fade-in">
                <header className="about-header">
                    <h1>About</h1>
                    <p className="about-intro">
                        안녕하세요, 백재민입니다. 소프트웨어 엔지니어로 일하며, 기술과 생각을 글로 정리합니다.
                        이 사이트는 옵시디언에서 마크다운으로 글을 작성하고 GitHub Pages로 발행하는 개인 디지털 가든입니다.
                    </p>
                </header>

                <div className="about-content">
                    <h2>이 블로그에 대해</h2>
                    <p>
                        글을 쓰는 것은 생각을 정리하는 가장 좋은 방법이라고 믿습니다.
                        이 블로그는 단순한 발행 플랫폼이 아니라, 지식을 연결하고 발전시키는 공간입니다.
                    </p>
                    <p>
                        옵시디언의 위키 링크(<code>[[link]]</code>)를 활용하여 글 간의 관계를 만들고,
                        이를 지식 그래프로 시각화하여 생각의 흐름을 한눈에 볼 수 있습니다.
                    </p>

                    <h2>워크플로우</h2>
                    <p>
                        이 사이트는 <strong>옵시디언 → Git → GitHub Actions → GitHub Pages</strong> 워크플로우로 운영됩니다.
                        마크다운 파일을 작성하고 커밋하면 자동으로 빌드되어 배포됩니다.
                    </p>

                    <h2>기술 스택</h2>
                    <ul>
                        <li><strong>프레임워크</strong>: Next.js (Static Export)</li>
                        <li><strong>글 작성</strong>: Obsidian</li>
                        <li><strong>지식 그래프</strong>: D3.js</li>
                        <li><strong>배포</strong>: GitHub Pages + GitHub Actions</li>
                        <li><strong>스타일</strong>: Anthropic Research 스타일 커스텀 CSS</li>
                    </ul>

                    <h2>Contact</h2>
                    <p>
                        GitHub: <a href="https://github.com/jaemin-baek" target="_blank" rel="noopener noreferrer">@jaemin-baek</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
