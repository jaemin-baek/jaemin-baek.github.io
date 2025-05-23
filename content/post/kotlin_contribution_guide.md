---
title: "Kotlin 언어 기능 제안 및 코드 기여 실전 가이드"
date: 2025-05-23
draft: false
categories: ["Kotlin"]
tags: ["contribution", "compiler", "KEEP", "language design"]
---

# Kotlin 언어 기능 제안 및 코드 기여 실전 가이드

이 문서는 Kotlin 언어에 새로운 기능을 직접 제안하고, 설계하고, 컴파일러 코드까지 기여하는 전체 과정을 다룹니다. 단순한 이슈 제기를 넘어서 실제 **KEEP 문서 작성부터 parser 수정, IR 처리, 테스트 작성, PR 제출까지** 모든 단계를 실습 중심으로 안내합니다.

---

## Kotlin 컴파일 과정 요약: PSI → FIR → IR → Bytecode

### PSI (Program Structure Interface)
- Kotlin 코드의 문법 구조를 표현하는 트리 (구문 트리)
- 파서(parser)가 소스 코드를 읽고 생성

### FIR (Front-end Intermediate Representation)
- PSI를 기반으로 구성된 추상적이고 정형화된 표현식 트리
- 타입 추론, 제어 흐름 해석, 스코프 관리 등을 수행

### IR (Intermediate Representation)
- FIR을 기반으로 백엔드 처리용으로 변환한 중간 표현
- JVM/JS/Native 공통 처리 가능
- 최적화 및 로워링 대상

### Bytecode (JVM)
- 최종적으로 IR이 JVM 바이트코드로 변환되어 `.class`로 출력됨

---

## 실전 시나리오: `guard` 구문 제안 및 구현하기

`guard (조건) else { ... }` 문법은 가독성이 높고 Swift와 유사한 조기 탈출(early exit) 구문입니다. Kotlin에 이를 도입하는 과정을 처음부터 끝까지 따라가봅니다.

### Step 1. 아이디어 공유 및 커뮤니티 피드백
- Kotlin Slack `#language-proposals`에 아래 내용 공유
- `discuss.kotlinlang.org`에도 같은 아이디어를 올려 반응 확인

> Kotlin에 Swift 스타일의 `guard (condition) else {}` 구문을 도입하고 싶습니다. `if (!condition) return` 보다 읽기 쉽고 명확합니다. KEEP 작성 전에 커뮤니티 의견을 듣고 싶습니다.

### Step 2. KEEP 문서 작성 및 제출

KEEP(Kotlin Evolution and Enhancement Process)은 Kotlin 언어의 새로운 기능을 제안하고 문서화하는 공식 절차입니다.

#### 작성 위치:
1. GitHub 저장소: https://github.com/Kotlin/KEEP
2. 본인 계정으로 Fork 후 Clone
3. `proposals/` 디렉토리에 Markdown 파일 생성 (예: `guard-expression.md`)

#### 문서 기본 템플릿 구성:
- `Summary`: 기능 요약
- `Motivation`: 왜 필요한가?
- `Syntax`: 문법 예시
- `Semantics`: 내부적으로 어떻게 동작하는가
- `Compatibility`: 기존 코드와 충돌 여부
- `Implementation`: Token → PSI → FIR → IR 흐름
- `Alternatives`: 기존 방식과의 비교

#### GitHub에 PR 제출하기:
1. 파일 작성 후 커밋 및 본인 원격 저장소에 Push
2. GitHub 웹에서 Fork 저장소 방문 → 'Compare & Pull Request' 클릭
3. base repository: `Kotlin/KEEP`, base: `master`, head: 본인 브랜치
4. 제목: `Propose: guard keyword for early return`
5. 설명란에 문서 내용 요약 작성

#### Slack 공유 예시:
Slack `#language-proposals` 채널에서 아래와 같이 알립니다:

```markdown
Hi all 👋

I've drafted a KEEP proposal introducing a new `guard (cond) else {}` syntax for early exits, similar to Swift.
PR link: https://github.com/Kotlin/KEEP/pull/XXX

Looking forward to your feedback, especially regarding parser and FIR/IR feasibility.
CC: @elizarov @ilya-g
```

Slack은 비공식 토론의 중심이며, 리뷰 반영 속도를 높이는 데 효과적입니다.

### Step 3. parser 수정 (JetTokens, KotlinParser)
- `GUARD_KEYWORD`, `ELSE_KEYWORD` 추가
- `guard (condition) else { block }`를 PSI 트리로 파싱되도록 구현

### Step 4. FIR 구조 정의
```kotlin
class FirGuardExpressionImpl(
    val condition: FirExpression,
    val elseBlock: FirBlock
) : FirExpression()
```
- FIR 트리에 새 노드로 포함

### Step 5. IR 변환 로직 작성
```kotlin
override fun visitGuardExpression(expression: IrGuardExpression): IrStatement {
    return irIfThenElse(...)
}
```
- `if (!cond) { block }` 로 변환

### Step 6. 테스트 코드 추가
- 위치: `compiler/tests-spec/testData/guard/Basic.kt`
- 케이스: 조건 실패 시 블록 실행 여부 확인

### Step 7. Pull Request 제출
- 브랜치: `feature/guard-keyword`
- 제목: `Add guard keyword expression`
- 설명:
```
This PR introduces a new syntax for early exit using `guard (cond) else {}`
- Added GUARD and ELSE tokens
- Implemented parser rule
- Introduced FirGuardExpression
- Lowered to standard if-not-else IR
- Added test cases
```
- 공유: Slack `#language-proposals`, reviewer 지정 요청

---

## Step 8. JetBrains 컨택 및 리뷰어 안내

| 이름 | 역할 | GitHub ID |
|------|------|------------|
| Roman Elizarov | Kotlin 리드 디자이너, 코루틴 설계자 | @elizarov |
| Ilya Gorbunov | Kotlin compiler contributor | @ilya-g |
| Svetlana Isakova | Kotlin developer advocate | @svetlanak999 |
| Egor Tolstoy | Kotlin compiler + IntelliJ integration | @egor-tolstoy |

- PR 후 Slack `#language-proposals`에서 `@멘션`하여 리뷰 요청
- 필요 시 GitHub에서 `ping`하여 응답 유도

---

## Step 9. 기여 후 유지 관리와 후속 대응

- 기능이 릴리스 브랜치에 포함될 때까지 추적
- 실험적 기능이면 opt-in 애노테이션 유지 필요
- `kotlin-web-site` 문서 기여 필요

---

## Step 10. 실제 기여 예시 탐색

- [context receivers PR](https://github.com/JetBrains/kotlin/pull/4423)
- [sealed interfaces PR](https://github.com/JetBrains/kotlin/pull/3613)

---

## Step 11. 공식 문서화 저장소 기여

- 저장소: https://github.com/JetBrains/kotlin-web-site
- 위치: `pages/docs`
- 문서 예시:

```markdown
## guard (condition) else {}

Introduced in Kotlin X.X

A new control-flow expression that simplifies early exit patterns.

```kotlin
fun example(x: Int?) {
    guard (x != null) else {
        println("Invalid input")
        return
    }
    println(x)
}
```
```

---

## 마무리 요약

| 단계 | 설명 |
|------|------|
| 1 | 아이디어 제안 및 커뮤니티 피드백 |
| 2 | KEEP 작성 및 PR 제출 |
| 3 | parser/lexer 수정 |
| 4 | FIR 구조 반영 |
| 5 | IR 변환 구현 |
| 6 | 테스트 작성 |
| 7 | Pull Request 제출 및 리뷰 대응 |
| 8 | JetBrains 팀과 협업 및 피드백 수용 |
| 9 | 기능 릴리스 전후 지속적 기여 |
| 10 | 실제 사례 학습 |
| 11 | 공식 문서화 기여 완료 |