---
title: "Obsidian Workflow"
date: "2026-03-06"
category: "Productivity"
tags: ["obsidian", "workflow", "markdown"]
description: "옵시디언을 활용한 글 작성부터 GitHub Pages 발행까지의 워크플로우를 상세히 설명합니다."
---

# 옵시디언 워크플로우

옵시디언은 로컬 마크다운 파일 기반의 강력한 노트 앱입니다. 이 글에서는 옵시디언으로 글을 작성하고 블로그에 발행하는 과정을 소개합니다.

## 글 작성 규칙

### Frontmatter

모든 글은 YAML frontmatter로 시작합니다:

```yaml
---
title: "글 제목"
date: "2026-03-07"
category: "카테고리"
tags: ["태그1", "태그2"]
description: "글 설명"
---
```

### Wiki-Links

옵시디언의 핵심 기능인 `[[wiki-link]]`를 사용하여 글 간 연결을 만듭니다. 이 링크들은 빌드 시 자동으로 HTML 링크로 변환되며, [[knowledge-graph|지식 그래프]]의 데이터로도 활용됩니다.

## 발행 과정

1. `content/posts/` 폴더에 `.md` 파일 저장
2. `git add . && git commit -m "새 글 추가"`
3. `git push origin main`
4. GitHub Actions가 자동 빌드 & 배포

이 워크플로우의 전체적인 소개는 [[hello-world]] 글에서 확인하세요.

## 팁

- 이미지는 `public/images/` 폴더에 저장
- 태그를 활용하면 관련 글을 쉽게 찾을 수 있습니다
- 정기적으로 [[knowledge-graph|그래프 뷰]]를 확인하여 고립된 글이 없는지 점검하세요
