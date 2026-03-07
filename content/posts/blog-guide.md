---
title: "블로그 사용 가이드: 처음부터 끝까지"
date: "2026-03-07"
category: "Guide"
tags: ["onboarding", "obsidian", "markdown", "guide"]
description: "아무것도 설정되지 않은 상태에서 글 작성, 이미지·영상 삽입, 코드 블록 활용, 그리고 블로그 관리·운영까지 — 이 블로그를 처음 사용하는 분을 위한 완전 가이드입니다."
---

## 시작하기 전에

이 블로그는 **옵시디언(Obsidian)**으로 마크다운 파일을 작성하고, **GitHub Pages**로 자동 배포되는 시스템입니다. Anthropic Research 사이트의 미니멀하고 정갈한 디자인을 적용했으며, 옵시디언의 위키 링크를 활용한 **지식 그래프** 기능이 내장되어 있습니다.

![Anthropic에서 영감받은 디자인 언어](/images/anthropic-brand.png)

이 가이드에서는 처음부터 끝까지 블로그를 사용하는 방법을 다룹니다.

---

## 1. 환경 준비

### 필수 도구 설치

| 도구 | 용도 | 설치 |
|------|------|------|
| Git | 버전 관리 & 배포 | [git-scm.com](https://git-scm.com/) |
| Node.js | 로컬 빌드 & 개발 서버 | [nodejs.org](https://nodejs.org/) (v18+) |
| Obsidian | 마크다운 글 작성 | [obsidian.md](https://obsidian.md/) |

### 저장소 클론

터미널에서 아래 명령어를 실행합니다:

```bash
git clone https://github.com/jaemin-baek/jaemin-baek.github.io.git
cd jaemin-baek.github.io
npm install
```

### 옵시디언 연결

1. 옵시디언을 열고 **"Open folder as vault"** 선택
2. 클론한 저장소의 `content/posts/` 폴더를 Vault로 지정
3. 이제 옵시디언에서 직접 글을 작성하고 저장하면 Git으로 관리됩니다

---

## 2. 새 글 작성하기

### 기본 구조: Frontmatter

모든 글은 **YAML frontmatter**로 시작해야 합니다. `content/posts/` 폴더에 `.md` 파일을 생성하세요:

```yaml
---
title: "내가 쓰고 싶은 글 제목"
date: "2026-03-07"
category: "AI"
tags: ["claude", "anthropic", "research"]
description: "이 글에 대한 한 줄 요약"
---
```

> **팁**: 파일명은 URL slug가 됩니다. `my-first-post.md` → `/blog/my-first-post`

### Frontmatter 필드 설명

| 필드 | 필수 | 설명 |
|------|------|------|
| `title` | ✅ | 글 제목 (페이지에 표시) |
| `date` | ✅ | 작성일 `YYYY-MM-DD` 형식 |
| `category` | ⬜ | 카테고리 (Blog 목록에서 필터링) |
| `tags` | ⬜ | 태그 배열 |
| `description` | ⬜ | SEO 메타 설명 |

---

## 3. 마크다운 문법 활용

### 기본 텍스트 형식

Anthropic이 설립한 **Constitutional AI** 접근 방식은 AI 안전 연구의 중요한 이정표입니다. Anthropic의 대표 모델인 *Claude*는 다양한 작업에서 뛰어난 성능을 보여줍니다.

```markdown
**굵은 글씨**는 별표 두 개로 감쌉니다.
*기울임*은 별표 하나로 감쌉니다.
~~취소선~~은 물결 두 개로 감쌉니다.
`인라인 코드`는 백틱으로 감쌉니다.
```

### 제목 계층

```markdown
## 큰 섹션 제목 (h2)
### 하위 섹션 (h3)
#### 세부 항목 (h4)
```

> **주의**: `# h1`은 사용하지 마세요. 글 제목이 자동으로 h1으로 렌더링됩니다.

### 리스트

```markdown
순서 없는 리스트:
- Constitutional AI
- RLHF (Reinforcement Learning from Human Feedback)
- Interpretability Research

순서 있는 리스트:
1. 프롬프트 설계
2. 모델 평가
3. 안전성 검증
```

### 인용문

```markdown
> "The best way to make AI systems safe is to make them want to be safe."
> — Anthropic Research
```

---

## 4. 코드 블록 삽입

이 블로그는 코드 블록을 다크 테마로 렌더링합니다 — Anthropic의 카본 팔레트와 조화됩니다.

### 인라인 코드

Anthropic의 API를 호출할 때는 `anthropic.messages.create()` 메서드를 사용합니다.

### 코드 블록 (언어 하이라이팅)

Python으로 Claude API를 호출하는 예제:

```python
import anthropic

client = anthropic.Anthropic(api_key="your-api-key")

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": "Constitutional AI란 무엇인가요?"
        }
    ]
)

print(message.content[0].text)
```

JavaScript로 Claude를 호출하는 예제:

```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const message = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Hello, Claude!" }
  ],
});

console.log(message.content[0].text);
```

### 명령어 블록

```bash
# 로컬 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과물 확인
ls -la out/
```

---

## 5. 이미지 삽입

### 이미지 파일 준비

1. 이미지를 `public/images/` 폴더에 저장합니다
2. 마크다운에서 아래 문법으로 참조합니다:

```markdown
![이미지 설명](/images/파일명.png)
```

### 예시: 블로그 아키텍처 다이어그램

아래는 이 블로그의 배포 아키텍처입니다:

![블로그 배포 아키텍처 — Obsidian에서 GitHub Pages까지](/images/blog-architecture.png)

### 이미지 경로 규칙

| 저장 위치 | 마크다운 경로 |
|-----------|-------------|
| `public/images/photo.png` | `/images/photo.png` |
| `public/diagrams/arch.svg` | `/diagrams/arch.svg` |
| 외부 URL | `https://example.com/img.jpg` |

> **팁**: 이미지 파일명은 소문자와 하이픈만 사용하세요. 예: `claude-api-flow.png`

---

## 6. 동영상 링크 삽입

마크다운에서 YouTube 등 외부 영상을 링크할 수 있습니다:

### 링크 형식

```markdown
Anthropic CEO Dario Amodei의 AI 안전에 관한 강연:
[Dario Amodei: Machines of Loving Grace](https://www.youtube.com/watch?v=example)
```

### 추천 영상 참고자료

Anthropic과 AI 안전 연구를 이해하는 데 도움이 되는 영상들:

- [Anthropic의 Claude 개발 과정 — Lex Fridman Podcast](https://www.youtube.com/watch?v=Nlkk3glap_U)
- [Constitutional AI: Harmlessness from AI Feedback](https://www.youtube.com/watch?v=example)
- [Anthropic Research: Interpretability](https://www.anthropic.com/research)

---

## 7. 위키 링크와 지식 그래프

이 블로그에서 가장 강력한 기능은 옵시디언의 **위키 링크**를 활용한 지식 그래프입니다.

### 위키 링크 문법

```markdown
자세한 내용은 [[hello-world]] 글을 참고하세요.
[[obsidian-workflow|옵시디언 워크플로우]]도 함께 읽어보세요.
```

- `[[파일명]]` — 대상 글의 slug (파일명에서 `.md` 제외)
- `[[파일명|표시 텍스트]]` — 다른 텍스트로 표시

### 지식 그래프 작동 원리

위키 링크를 사용하면 자동으로 글 간의 연결이 생깁니다. 이 연결은 `/graph` 페이지의 인터랙티브 그래프에 시각화됩니다.

![지식 그래프 시각화 — 글 간의 관계를 한눈에](/images/knowledge-graph-demo.png)

- **노드**: 각 블로그 글
- **엣지**: 위키 링크로 연결된 관계
- **인터랙션**: 드래그, 줌, 클릭하여 해당 글로 이동

> **팁**: 글을 쓸 때 관련 글을 적극적으로 링크하세요. 시간이 지나면서 자연스럽게 지식의 네트워크가 형성됩니다.

---

## 8. 글 발행하기

### 로컬에서 미리보기

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 확인
# http://localhost:3000
```

### GitHub에 배포

```bash
# 변경사항 스테이징
git add -A

# 커밋
git commit -m "feat: 새 글 추가 — 블로그 사용 가이드"

# 푸시 (자동으로 GitHub Actions가 빌드 & 배포)
git push origin main
```

푸시하면 약 1~2분 내에 [jaemin-baek.github.io](https://jaemin-baek.github.io)에 반영됩니다.

### GitHub Actions 배포 확인

1. [GitHub Actions 탭](https://github.com/jaemin-baek/jaemin-baek.github.io/actions)에서 빌드 상태를 확인합니다
2. ✅ 녹색 체크가 뜨면 배포 완료입니다
3. ❌ 빨간 X가 뜨면 빌드 로그를 확인하세요

---

## 9. 관리 & 운영 팁

### 폴더 구조 이해

```
content/posts/          ← 글 작성 (옵시디언 Vault)
  ├── hello-world.md
  ├── my-new-post.md
  └── ...
public/images/          ← 이미지 에셋
  ├── photo.png
  └── diagram.svg
```

### 카테고리 관리

카테고리는 frontmatter의 `category` 필드로 자동 관리됩니다. 새 카테고리를 추가하면 Blog 목록 페이지에 필터가 자동으로 생성됩니다.

### 글 삭제 또는 수정

- **수정**: `.md` 파일을 편집한 후 `git push`
- **삭제**: `.md` 파일을 삭제한 후 `git push`
- **비공개**: frontmatter에 `draft: true` 추가 (아직 미구현, 향후 추가 가능)

### 백업

Git이 곧 백업입니다. 모든 글의 히스토리가 Git에 보존됩니다.

```bash
# 히스토리 확인
git log --oneline content/posts/

# 특정 글의 변경 이력
git log -p content/posts/my-post.md
```

---

## 10. 자주 묻는 질문

### Q: 옵시디언 없이도 글을 쓸 수 있나요?

네! `content/posts/` 폴더에 아무 텍스트 에디터로 `.md` 파일을 만들면 됩니다. 다만 옵시디언을 사용하면 위키 링크 자동완성, 실시간 미리보기 등의 편의 기능을 활용할 수 있습니다.

### Q: 이미지 크기 제한이 있나요?

제한은 없지만, 웹 성능을 위해 **1MB 이하**로 최적화하는 것을 권장합니다. PNG보다 WebP나 JPEG를 사용하면 용량을 줄일 수 있습니다.

### Q: 로컬에서 빌드가 안 되면?

```bash
# node_modules 재설치
rm -rf node_modules
npm install

# 빌드 재시도
npm run build
```

---

## 정리

이제 이 블로그를 완벽하게 사용할 준비가 되었습니다. 핵심 워크플로우를 정리하면:

1. **글 작성**: 옵시디언에서 `content/posts/새글.md` 작성
2. **이미지 추가**: `public/images/`에 파일 저장 → `/images/파일명`으로 참조
3. **지식 연결**: `[[다른-글]]` 위키 링크로 글 간 연결
4. **확인**: `npm run dev`로 로컬 미리보기
5. **발행**: `git push`로 자동 배포

관련 글도 확인해보세요:
- [[obsidian-workflow]]
- [[blog-development]] 
- [[knowledge-graph]]
