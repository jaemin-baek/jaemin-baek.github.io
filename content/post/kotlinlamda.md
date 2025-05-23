---
title: "Kotlin Receiver Lambda"
date: 2025-03-11
draft: false
categories: ["Kotlin"]
tags: ["Kotlin"]
---


# Kotlin 리시버 람다(Receiver Lambda) 정리

Kotlin에서는 람다 표현식을 한 단계 더 확장하여, **리시버(수신자)를 가지는 람다**를 정의할 수 있습니다. 이것을 **리시버 람다(Receiver Lambda)** 또는 **확장 람다(Extension Lambda)** 라고 하며, Kotlin DSL, 코루틴, 빌더 패턴 등에 자주 사용됩니다.

---

## 기본 문법

```kotlin
ReceiverType.() -> ReturnType
```

- `ReceiverType`: 리시버(수신자)의 타입
- `this`는 리시버를 가리킴
- 리시버의 멤버에 직접 접근 가능 (`this.` 생략 가능)

---

## 예제: String.() -> Unit

```kotlin
val printLength: String.() -> Unit = {
    println("[리시버] 길이 = ${this.length}")
}

"Hello".printLength() // 출력: [리시버] 길이 = 5
```

- 위에서 `this`는 `"Hello"` 문자열
- 리시버 타입은 `String`

---

## 일반 람다 vs 리시버 람다

| 형태 | 설명 |
|------|------|
| `() -> Unit` | 일반 람다. 외부에서 전달받는 값만 사용 |
| `String.() -> Unit` | `String`을 리시버로 사용. 내부에서 `this.length` 등 사용 가능 |

---

## 실전 예시 1: `apply {}`

```kotlin
data class User(var name: String, var age: Int)

val user = User("Tom", 30).apply {
    name = "Jerry" // this.name 으로도 가능
    age = 25
}
```

- `apply`는 `T.apply(block: T.() -> Unit)`으로 선언되어 있음
- 내부에서 `this`는 `User`

---

## 실전 예시 2: 코루틴 `runBlocking {}`

```kotlin
fun <T> runBlocking(block: suspend CoroutineScope.() -> T): T
```

- `block`은 `CoroutineScope`를 리시버로 갖는 suspend 람다
- 내부에서 `launch`, `async` 등을 `this.` 없이 사용 가능

```kotlin
runBlocking {
    launch { println("Hi from coroutine") }
}
```

---

## 리시버 람다의 장점

| 장점 | 설명 |
|------|------|
| DSL 작성에 유리 | `this` 생략 가능. 직관적인 문법 제공 |
| 컨텍스트 스코프 제공 | 내부에서 특정 타입의 기능을 자연스럽게 활용 가능 |
| Kotlin 특유의 선언형 스타일 표현 가능 | `apply`, `with`, `run`, `build.gradle.kts` 등에서 사용됨 |

---

## 요약 정리

- `Receiver.() -> T`는 **리시버를 갖는 람다 타입**
- 내부에서 `this`는 리시버 객체를 가리킴
- `apply`, `runBlocking`, `withContext` 등에서 사용됨

리시버 람다는 Kotlin DSL, 구조화된 코루틴, 빌더 패턴 등을 가능하게 하는 핵심적인 언어 기능입니다. Kotlin의 선언형 프로그래밍 스타일을 이해하려면 **리시버 람다의 개념을 정확히 이해하는 것이 매우 중요**합니다.

---

## 참고 자료

- Kotlin 공식 문서: https://kotlinlang.org/docs/lambdas.html#function-literals-with-receiver
- Kotlin 표준 라이브러리 예시: `apply`, `run`, `with`
- JetBrains Kotlin 슬라이드: DSL 만들기
