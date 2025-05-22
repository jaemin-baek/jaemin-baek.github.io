---
title: "Kotlin 문법 정리: Expression Body Function"
date: 2025-05-20
draft: false
categories: ["Kotlin"]
tags: ["Kotlin"]
---

# Kotlin 함수 문법 요약

## 식 본문 함수 (Expression Body Function)

함수 본문이 단일 표현식일 경우, 중괄호 없이 `=` 로 정의할 수 있습니다.

```kotlin
fun add(a: Int, b: Int) = a + b
```

return 키워드를 명시하지 않아도 자동 반환됨

본문이 단 하나의 표현식일 때만 사용 가능


### 블록 본문 함수와 비교

```kotlin
fun add(a: Int, b: Int): Int {
    return a + b
}
```

| Syntax                  | Name               | Description                         |
|-------------------------|--------------------|-------------------------------------|
| `fun foo() = something` | Expression Body     | Single expression, return omitted   |
| `fun foo() { ... }`     | Block Body          | Multiple lines allowed, explicit return |
