---
title: "블로그 개발 문서: 아키텍처와 기술 스택"
date: "2026-03-07"
category: "Engineering"
tags: ["next.js", "d3.js", "architecture", "development", "github-actions"]
description: "이 블로그의 기술적 설계, 사용된 라이브러리, 배포 파이프라인, 그리고 핵심 코드를 정리한 개발 문서입니다."
---

## 개요

이 블로그는 **Anthropic Research 사이트**의 디자인 언어에서 영감을 받아 설계되었습니다. 정적 사이트 생성(SSG)을 기반으로 마크다운 콘텐츠를 빌드 시점에 HTML로 변환하고, 옵시디언의 위키 링크를 파싱하여 D3.js 기반 지식 그래프를 생성합니다.

![블로그 배포 아키텍처](/images/blog-architecture.png)

---

## 기술 스택

### 핵심 프레임워크

| 기술 | 버전 | 역할 |
|------|------|------|
| Next.js | 16.x | React 기반 SSG 프레임워크 |
| React | 19.x | UI 컴포넌트 라이브러리 |
| D3.js | 7.x | 지식 그래프 시각화 |

### 마크다운 처리

| 라이브러리 | 역할 |
|------------|------|
| `gray-matter` | YAML frontmatter 파싱 |
| `remark` | 마크다운 → HTML 변환 엔진 |
| `remark-html` | 마크다운을 HTML로 직렬화 |
| `remark-gfm` | GitHub Flavored Markdown 지원 (테이블, 취소선 등) |

### 배포 인프라

| 도구 | 역할 |
|------|------|
| GitHub Pages | 정적 사이트 호스팅 |
| GitHub Actions | CI/CD 자동 빌드 & 배포 |

### 디자인

| 항목 | 값 |
|------|-----|
| 배경 | `#FAF9F5` (Cream) |
| 텍스트 | `#1A1A19` (Carbon) |
| 보조텍스트 | `#6B6B6A` |
| 본문 폰트 | Noto Serif KR (serif) |
| UI 폰트 | Inter (sans-serif) |

---

## 아키텍처

### 전체 시스템 흐름

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Obsidian   │────▶│  Git Push    │────▶│  GitHub      │────▶│  GitHub      │
│  (.md 작성) │     │  (main)      │     │  Actions     │     │  Pages       │
└─────────────┘     └──────────────┘     │  빌드 & 배포 │     │  (라이브)    │
                                          └──────────────┘     └──────────────┘
```

### 빌드 타임 처리 흐름

```
content/posts/*.md
       │
       ▼
  ┌─────────────────────┐
  │  gray-matter         │  ← YAML frontmatter 파싱
  │  (title, date, ...)  │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  Wiki-link 파싱      │  ← [[target]] → <a href="/blog/target">
  │  + 그래프 데이터 추출 │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  remark + remark-gfm │  ← Markdown → HTML 변환
  │  + remark-html       │
  └──────────┬──────────┘
             │
             ├──▶ HTML 페이지 (정적 생성)
             └──▶ 그래프 데이터 (nodes + links)
```

---

## 핵심 코드 분석

### 1. 마크다운 파서 — `lib/posts.js`

이 파일은 전체 콘텐츠 처리의 핵심입니다.

**Wiki-link 파싱 (정규식)**:

```javascript
// [[target]] 또는 [[target|display text]] 형식 지원
const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
```

이 정규식은 두 가지 형태를 처리합니다:
- `[[hello-world]]` → target = "hello-world", display = "hello-world"
- `[[hello-world|인사글]]` → target = "hello-world", display = "인사글"

**Wiki-link → HTML 변환**:

```javascript
let processedContent = post.content.replace(
  /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
  (match, target, display) => {
    const targetSlug = target.trim().toLowerCase().replace(/\s+/g, '-');
    const displayText = display ? display.trim() : target.trim();
    return `[${displayText}](/blog/${targetSlug})`;
  }
);
```

**마크다운 → HTML 변환 파이프라인**:

```javascript
const result = await remark()
  .use(remarkGfm)          // GFM: 테이블, 취소선, 자동링크
  .use(html, { sanitize: false })  // HTML 직렬화 (sanitize off → 커스텀 HTML 허용)
  .process(processedContent);
```

`sanitize: false`를 사용하는 이유: 마크다운 안에 직접 HTML을 삽입할 수 있게 하여, iframe, video 등의 임베드를 지원합니다.

### 2. 그래프 데이터 생성 — `getGraphData()`

```javascript
export function getGraphData() {
  const posts = getAllPosts();
  const slugMap = new Map(posts.map((p) => [p.slug, p]));

  // 각 포스트 → 노드
  const nodes = posts.map((post) => ({
    id: post.slug,
    title: post.title || post.slug,
    category: post.category || 'Uncategorized',
  }));

  // Wiki-link → 엣지 (중복 방지)
  const links = [];
  const linkSet = new Set();

  posts.forEach((post) => {
    post.links.forEach((link) => {
      const targetSlug = link.target.toLowerCase().replace(/\s+/g, '-');
      if (slugMap.has(targetSlug)) {  // 존재하는 포스트만
        const key = [post.slug, targetSlug].sort().join('->');
        if (!linkSet.has(key)) {
          linkSet.add(key);
          links.push({ source: post.slug, target: targetSlug });
        }
      }
    });
  });

  return { nodes, links };
}
```

**핵심 설계 결정**:
- 양방향 중복 방지: `sort().join('->')` 로 A→B와 B→A를 같은 키로 취급
- 존재하지 않는 대상 필터링: `slugMap.has(targetSlug)` 체크
- 빌드 타임 계산: 런타임이 아닌 빌드 시 그래프 데이터를 생성

### 3. D3.js 지식 그래프 — `components/KnowledgeGraph.js`

Force-directed 레이아웃 시뮬레이션을 사용합니다:

```javascript
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links)
    .id((d) => d.id)
    .distance(150))               // 노드 간 목표 거리
  .force('charge', d3.forceManyBody()
    .strength(-300))              // 척력 (음수 = 반발)
  .force('center', d3.forceCenter(
    width / 2, height / 2))       // 중심으로 끌어당김
  .force('collision', d3.forceCollide()
    .radius(40));                 // 충돌 반경
```

**인터랙션 설계**:

| 동작 | 효과 |
|------|------|
| 마우스 hover | 연결된 노드 하이라이팅, 비연결 노드 흐리게 |
| 드래그 | 노드 위치 이동 (시뮬레이션 재시작) |
| 줌/팬 | D3 zoom behavior로 전체 그래프 탐색 |
| 클릭 | Next.js `router.push`로 해당 글 이동 |

**Hover 효과 코드**:

```javascript
node.on('mouseover', (event, d) => {
  // 연결된 노드 ID 수집
  const connectedIds = new Set([d.id]);
  links.forEach((l) => {
    if (l.source.id === d.id) connectedIds.add(l.target.id);
    if (l.target.id === d.id) connectedIds.add(l.source.id);
  });

  // 연결된 노드는 진하게, 나머지는 흐리게
  node.attr('fill', (n) =>
    connectedIds.has(n.id) ? '#1A1A19' : '#CCCBC7'
  );
  link.attr('stroke', (l) =>
    l.source.id === d.id || l.target.id === d.id
      ? '#1A1A19' : '#EDECE8'
  );
});
```

### 4. Next.js 정적 생성 — `app/blog/[slug]/page.js`

```javascript
// 빌드 시 모든 slug에 대해 정적 페이지 생성
export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}
```

이 함수는 Next.js의 App Router에서 동적 라우트를 정적으로 생성하는 핵심입니다. 빌드 시점에 `content/posts/`의 모든 `.md` 파일에 대해 HTML 페이지를 생성합니다.

### 5. 정적 Export 설정 — `next.config.mjs`

```javascript
const nextConfig = {
  output: 'export',          // 정적 HTML/CSS/JS 생성
  images: {
    unoptimized: true,        // GitHub Pages에서는 Image Optimization 불가
  },
};
```

---

## 배포 파이프라인

### GitHub Actions 워크플로우

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]         # main 브랜치 push 시 트리거

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci           # 의존성 설치 (lock 파일 기준)
      - run: npm run build    # Next.js 정적 빌드 → ./out
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./out         # 빌드 결과물 업로드

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4   # GitHub Pages 배포
```

**파이프라인 시간**: 보통 1~2분 소요

---

## 디자인 시스템

### CSS 변수 아키텍처

```css
:root {
  /* 색상 팔레트 — Anthropic Research 톤 */
  --bg-primary: #FAF9F5;        /* 크림 배경 */
  --bg-secondary: #F3F2EE;      /* 보조 배경 */
  --bg-footer: #141413;         /* 다크 푸터 */
  --text-primary: #1A1A19;      /* 카본 텍스트 */
  --text-secondary: #6B6B6A;    /* 보조 텍스트 */

  /* 타이포그래피 */
  --font-serif: 'Noto Serif KR', Georgia, serif;
  --font-sans: 'Inter', -apple-system, sans-serif;

  /* 레이아웃 */
  --max-width-content: 720px;   /* 글 본문 최대 너비 */
  --max-width-page: 1200px;     /* 페이지 전체 최대 너비 */
  --header-height: 64px;
}
```

### 레이아웃 구조

```
┌───────────────── Header (sticky, blur backdrop) ──────────────┐
│  JAEMIN\B                              Blog  Graph  About     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│           ┌──────────────────────────────┐                    │
│           │   content-narrow (720px)     │                    │
│           │   ← 글 본문 영역 →          │                    │
│           └──────────────────────────────┘                    │
│                                                               │
│           ┌──────────────────────────────────────────┐        │
│           │   page-container (1200px)                │        │
│           │   ← 리스트, 그래프 등 넓은 레이아웃 →    │        │
│           └──────────────────────────────────────────┘        │
│                                                               │
├───────────────── Footer (dark, 3-column) ─────────────────────┤
│  Jaemin Baek          NAVIGATE          CONNECT               │
│  설명 텍스트          Blog              GitHub                │
│                       Graph                                   │
│                       About                                   │
└───────────────────────────────────────────────────────────────┘
```

---

## 프로젝트 구조

```bash
jaemin-baek.github.io/
├── app/                            # Next.js App Router
│   ├── layout.js                   # 루트 레이아웃 (Header + Footer)
│   ├── globals.css                 # 전역 스타일 (디자인 시스템)
│   ├── page.js                     # 홈페이지
│   ├── blog/
│   │   ├── page.js                 # 블로그 목록
│   │   └── [slug]/page.js          # 개별 포스트 (동적 라우트)
│   ├── graph/page.js               # 지식 그래프 (풀스크린)
│   └── about/page.js               # 소개 페이지
│
├── components/
│   └── KnowledgeGraph.js           # D3.js 그래프 컴포넌트
│
├── lib/
│   └── posts.js                    # 마크다운 파서 + 그래프 데이터 생성
│
├── content/posts/                  # 마크다운 콘텐츠 (옵시디언 Vault)
│   ├── hello-world.md
│   ├── blog-guide.md
│   ├── blog-development.md
│   └── ...
│
├── public/
│   ├── images/                     # 이미지 에셋
│   └── .nojekyll                   # Jekyll 비활성화
│
├── .github/workflows/
│   └── deploy.yml                  # GitHub Actions 배포
│
├── next.config.mjs                 # Next.js 설정 (static export)
├── package.json                    # 의존성 정의
└── jsconfig.json                   # 경로 alias (@/)
```

---

## 참고 사이트 & 리소스

### 디자인 참고

- [Anthropic Research](https://www.anthropic.com/research) — 메인 디자인 영감
- [Anthropic 블로그](https://www.anthropic.com/blog) — 포스트 레이아웃 참고

### 기술 문서

- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports) — 정적 사이트 생성 공식 문서
- [D3.js Force Simulation](https://d3js.org/d3-force) — 지식 그래프 물리 엔진
- [remark (unified.js)](https://github.com/remarkjs/remark) — 마크다운 처리 생태계
- [GitHub Pages 배포 가이드](https://docs.github.com/en/pages) — 호스팅 문서
- [GitHub Actions 워크플로우](https://docs.github.com/en/actions) — CI/CD 파이프라인

### 폰트

- [Inter](https://fonts.google.com/specimen/Inter) — UI 폰트
- [Noto Serif KR](https://fonts.google.com/noto/specimen/Noto+Serif+KR) — 한글 본문 폰트

---

## 향후 개선 계획

- **검색 기능**: 클라이언트 사이드 전문 검색 (Fuse.js 또는 FlexSearch)
- **다크 모드**: CSS 변수 전환 기반 테마 토글
- **RSS 피드**: 자동 생성 XML 피드
- **댓글 시스템**: Giscus (GitHub Discussions 기반)
- **드래프트 모드**: `draft: true` frontmatter 지원
- **태그 페이지**: `/tags/[tag]` 동적 라우트
- **이미지 최적화**: 빌드 시 WebP 자동 변환

관련 가이드: [[blog-guide]]
다른 참고 글: [[knowledge-graph]] [[obsidian-workflow]]
