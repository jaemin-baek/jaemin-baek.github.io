---
title: "[v.0.0] Kotlin 문법 정리: Trailing Lambda Syntax"
date: 2025-03-10
draft: false
categories: ["Kotlin"]
tags: ["Kotlin"]
---

# 트레일링 람다 문법 (Trailing Lambda Syntax)

## 정의

트레일링 람다(Trailing Lambda)는 함수의 마지막 파라미터가 람다(lambda expression)일 경우,
해당 람다를 함수 호출 괄호 () 밖으로 빼서 더 읽기 쉬운 형태로 표현하는 코틀린의 문법입니다.

이 문법은 코드의 명확성, 선언적 스타일, 그리고 함수형 프로그래밍 철학에 기반한 Kotlin의 설계 철학을 잘 보여줍니다.

## 기본 예제


```kotlin
fun doSomething(action: () -> Unit) {
    action()
}

// 일반적인 호출
doSomething({ println("Hello") })

// 트레일링 람다 사용
doSomething {
    println("Hello")
}
```

위 두 코드는 동일한 동작을 하지만, 두 번째 예시는 람다 블록의 의도를 더 명확히 드러냅니다.


## 왜 필요한가? (코틀린 철학적 배경)

Kotlin은 간결성(conciseness), 표현력(expressiveness), 그리고 안전성(safety)을 중시하는 언어입니다.

### 트레일링 람다는 이런 철학을 다음과 같은 방식으로 실현합니다:

- 의도를 드러내는 코드: 마지막 인자가 람다인 경우, 괄호 밖으로 빼는 것이 람다의 "중심적 역할"을 강조함

- 읽기 쉬운 DSL 스타일: apply, run, with, build.gradle.kts 같은 DSL에서 직관적인 문법 제공

- 콜백 기반 함수의 가독성 향상: 네트워크 요청, 버튼 클릭, 파일 처리 등에서 콜백이 많을 때 유리함

## 실제 활용 예시

### 1. 코루틴에서

- 1. 코루틴에서
```kotlin
runBlocking {
    println("Hello from coroutine")
}
```
- 2. 컬렉션 처리에서
```kotlin
val list = listOf(1, 2, 3)
list.forEach {
    println(it)
}
```

- 3. UI 콜백에서 (Android 기준)
```kotlin
button.setOnClickListener {
    Toast.makeText(context, "Clicked", Toast.LENGTH_SHORT).show()
}
```


## 주의할 점

- 람다가 마지막 인자일 때만 트레일링 람다 문법 사용 가능

- 람다가 유일한 인자라면 () 생략 가능:


```kotlin
runBlocking {
    // 가능
}
```

하지만 중간에 람다가 오면 절대 밖으로 뺄 수 없음:

```kotlin
fun foo(a: Int, action: () -> Unit)

foo(1) {
    // 가능 (람다가 마지막)
}

foo({ ... }, 1) // ❌ 불가능
```

## 결론
트레일링 람다는 단순한 문법 이상의 의미를 가집니다. Kotlin이 추구하는 명료한 코드, 함수형 프로그래밍, 선언형 DSL 작성을 가능하게 해주는 강력한 문법 도구이며, 코드를 읽는 사람의 관점에서 쓰는 코드를 지향합니다.

적절한 상황에서 트레일링 람다를 활용하면, 코드가 더 직관적이고 우아해질 수 있습니다.

