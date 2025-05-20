---
title: "Kotlin 코루틴의 runBlocking, coroutineScope, supervisorScope 비교"
date: 2025-02-19
draft: false
tags: ["kotlin", "coroutine", "concurrency", "runBlocking", "coroutineScope", "supervisorScope"]
categories: ["Kotlin"]
---

## Kotlin 코루틴의 실행 스코프 비교: runBlocking, coroutineScope, supervisorScope

Kotlin의 코루틴 시스템은 다양한 실행 스코프 제공을 통해 구조적 동시성과 예외 분리를 가능하게 한다. 본 문서에서는 `runBlocking`, `coroutineScope`, `supervisorScope`의 기능과 목적을 비교하고, 각각의 사용 상황과 실행 흐름 차이에 대해 기술한다.

---

### 1. 개요

코루틴은 전통적인 스레드 기반 프로그래밍에 비해 더 적은 리소스로 동시성을 지원하며, 이를 위해 다양한 스코프 빌더가 제공된다. 그중 `runBlocking`, `coroutineScope`, `supervisorScope`는 가장 자주 사용되는 고수준 코루틴 빌더로, 이들은 실행 방식과 예외 처리 구조에 있어 중요한 차이를 갖는다.

---

### 2. 주요 차이점 요약

| 항목 | `runBlocking` | `coroutineScope` | `supervisorScope` |
|------|----------------|------------------|--------------------|
| 차단 여부 | 호출한 **스레드를 차단** | 차단하지 않음 (`suspend`) | 차단하지 않음 (`suspend`) |
| 사용 위치 | `main()` 함수, 테스트 | `suspend` 함수 내부 | `suspend` 함수 내부 |
| 자식 실패 전파 | 자식 실패 시 전체 취소 | 자식 실패 시 전체 취소 | 실패해도 다른 자식은 계속 실행 |
| 생성 스코프 | 새 `CoroutineScope` 생성 | 상위 스코프 상속 | `SupervisorJob` 기반 스코프 |
| 주요 목적 | 일반 코드와 코루틴 연결 | 구조적 동시성 | 예외 고립 및 분리 실행 |

---

### 3. runBlocking

`runBlocking`은 코루틴 진입점을 제공하는 함수로, 일반적인 블로킹 코드(main 함수 등)에서 `suspend` 함수를 사용할 수 있도록 한다. 내부적으로 현재 스레드를 차단하며, 코루틴이 완료될 때까지 대기한다.

```kotlin
fun main() = runBlocking {
    println("Start")
    delay(1000)
    println("Done")
}
```

- 호출한 스레드를 직접 차단하며, UI 스레드에서는 사용을 지양해야 한다.
- `CoroutineScope`를 생성하여 내부에서 `launch`, `async` 등을 사용할 수 있다.

---

### 4. coroutineScope 

`coroutineScope`는 현재 컨텍스트를 상속하는 `CoroutineScope`를 생성하며, 내부의 모든 자식 코루틴이 종료될 때까지 `suspend` 상태로 대기한다. 이는 구조적 동시성을 구현하는 핵심 도구로 사용된다.

```kotlin
suspend fun run() {
    coroutineScope {
        launch {
            delay(500)
            println("Child 1 done")
        }
        launch {
            delay(1000)
            println("Child 2 done")
        }
    }
    println("All children completed")
}
```

- 자식 중 하나라도 실패하면 전체 스코프가 취소된다.
- 일반적으로 suspend 함수 내에서 사용된다.

---

### 5. supervisorScope

supervisorScope는 자식 코루틴 간 실패 전파를 막고, 하나의 실패가 다른 작업에 영향을 미치지 않도록 하는 예외 격리 기능을 제공한다. 내부적으로 SupervisorJob을 사용하여 고립된 실행 환경을 형성한다.

```kotlin
suspend fun run() {
    supervisorScope {
        launch {
            throw RuntimeException("Child failed")
        }
        launch {
            delay(1000)
            println("Other child still runs")
        }
    }
}
```

- 하나의 자식이 예외를 발생시켜도 다른 자식은 계속 실행된다.
- 실시간 처리나 부분 실패를 허용하는 작업에 적합하다.

---

### 7. 결론

코루틴의 실행 컨텍스트 선택은 코드의 동시성 구조와 예외 처리 전략에 직접적인 영향을 미친다. runBlocking은 동기-비동기 경계를 연결하는 데 유용하며, coroutineScope는 구조적 동시성을 제공하고, supervisorScope는 자식 코루틴의 독립 실행을 보장한다. 각 스코프의 특성을 이해하고 상황에 맞게 사용하는 것이 안전하고 예측 가능한 비동기 프로그래밍을 구현하는 데 핵심이 된다.

---