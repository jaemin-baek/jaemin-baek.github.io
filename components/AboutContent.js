export default function AboutContent() {
    return (
        <div className="content-narrow fade-in">
            <header className="about-header">
                <h1>About</h1>
                <p className="about-intro">
                    안녕하세요, 백재민입니다. 11년 이상 Android 앱을 만들고 운영해온 모바일 개발자입니다.
                    보안과 인증이 중요한 지갑 플랫폼부터 글로벌 규모의 동영상 편집 앱까지,
                    사용자의 흐름과 앱 구조를 함께 설계하는 일을 해왔습니다.
                </p>
                <figure className="about-hero-figure">
                    <img
                        src="/images/about-android-developer-cover.png"
                        alt="Android 개발자 백재민의 경험을 표현한 손그림 스타일 일러스트"
                        className="about-hero-image"
                    />
                </figure>
            </header>

            <div className="about-content">
                <ul className="about-summary" aria-label="핵심 소개">
                    <li>
                        <span className="about-summary-value">11년+</span>
                        <span className="about-summary-label">Android 개발 및 운영</span>
                    </li>
                    <li>
                        <span className="about-summary-value">Security</span>
                        <span className="about-summary-label">지갑, 인증, 민감 데이터 보호</span>
                    </li>
                    <li>
                        <span className="about-summary-value">Scale</span>
                        <span className="about-summary-label">대규모 미디어 앱과 운영 경험</span>
                    </li>
                </ul>

                <h2>어떤 개발자인가요</h2>
                <p>
                    기능을 구현하는 것만큼 사용자의 민감한 데이터, 서비스 안정성, 유지보수 가능한 구조를 중요하게 봅니다.
                    최근에는 Android Keystore, Tink AEAD, SQLCipher, PIN/생체 인증을 활용해
                    개인 키와 로컬 데이터를 보호하고, WalletConnect와 EVM 계열 서명 흐름을 모바일 UX로 풀어내는 일을 했습니다.
                </p>
                <p>
                    KineMaster Android 개발자로 일할 때는 글로벌 사용자 기반의 동영상 편집 앱을 운영하며
                    복잡한 편집 타임라인, 그래픽스 기반 미리보기, 결제와 광고, 네트워크 캐싱, 성능 분석을 다뤘습니다.
                    Java 레거시 코드를 Kotlin과 Jetpack 기반 구조로 옮기고, CI/CD와 코드 리뷰 문화 개선에도 참여했습니다.
                </p>

                <h2>주로 해온 일</h2>
                <ul className="about-highlights">
                    <li>
                        <strong>보안과 인증이 필요한 모바일 흐름</strong>
                        <span>지갑 생성과 복구, 전자서명, 거래 승인, QR/딥링크/알림 처리처럼 사용자가 신뢰해야 하는 핵심 흐름을 설계하고 구현했습니다.</span>
                    </li>
                    <li>
                        <strong>복잡한 UI와 미디어 처리</strong>
                        <span>동영상 편집 타임라인, 렌더링/프리뷰 파이프라인, 백그라운드 작업과 UI Thread를 고려한 상태 관리를 경험했습니다.</span>
                    </li>
                    <li>
                        <strong>레거시를 오래 갈 수 있는 구조로 바꾸는 일</strong>
                        <span>MVC에서 MVP/MVVM으로의 전환, Java에서 Kotlin으로의 전환, 멀티 모듈 구조와 Gradle 빌드 개선을 수행했습니다.</span>
                    </li>
                </ul>

                <h2>기술 스택</h2>
                <ul className="about-tags" aria-label="기술 키워드">
                    <li>Android</li>
                    <li>Kotlin</li>
                    <li>Jetpack Compose</li>
                    <li>Navigation</li>
                    <li>Hilt</li>
                    <li>Coroutine</li>
                    <li>Room</li>
                    <li>Retrofit</li>
                    <li>WebSocket</li>
                    <li>Keystore</li>
                    <li>SQLCipher</li>
                    <li>CI/CD</li>
                </ul>

                <h2>이 블로그에 대해</h2>
                <p>
                    이 블로그는 일을 하며 배운 것을 동료에게 설명하듯 정리하는 공간입니다.
                    Android, Kotlin, Jetpack Compose, Navigation, 앱 아키텍처, 상태 관리처럼
                    실무에서 다시 꺼내 보게 되는 주제를 작게 쪼개어 기록합니다.
                </p>
                <p>
                    옵시디언의 위키 링크(<code>[[link]]</code>)로 글 사이의 관계를 만들고,
                    이를 지식 그래프로 시각화해 생각이 어떻게 연결되는지 볼 수 있게 했습니다.
                </p>

                <h2>블로그 운영</h2>
                <ul>
                    <li><strong>프레임워크</strong>: Next.js Static Export</li>
                    <li><strong>글 작성</strong>: Obsidian</li>
                    <li><strong>지식 그래프</strong>: D3.js</li>
                    <li><strong>배포</strong>: GitHub Pages + GitHub Actions</li>
                </ul>

                <h2>Contact</h2>
                <p>
                    GitHub: <a href="https://github.com/jaemin-baek" target="_blank" rel="noopener noreferrer">@jaemin-baek</a>
                </p>
            </div>
        </div>
    );
}
