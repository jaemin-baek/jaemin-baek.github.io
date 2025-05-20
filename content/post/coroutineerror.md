---
title: "Kotlin 코루틴에서 에러 처리 제대로 이해하기"
date: 2025-03-05
draft: false
tags: ["kotlin", "coroutine", "exception", "try-catch", "CoroutineExceptionHandler"]
categories: ["Kotlin"]
---

## Kotlin 코루틴에서 에러 처리 제대로 이해하기

코틀린 코루틴은 비동기 코드의 예외 처리 방식을 명확하게 구조화하고 있다.  
단순한 `try-catch`를 넘어서, `Job`, `SupervisorJob`, `CoroutineExceptionHandler` 등 다양한 메커니즘이 존재하며,  
이들은 **구조적 동시성(Structured Concurrency)** 원칙 하에 작동한다.  
이 글에서는 Kotlin 코루틴의 예외 처리 구조를 단계적으로 설명하고, 실전 예제를 통해 이해를 돕고자 한다.

---

### 1. 코루틴의 예외 처리 기본: `try-catch`

가장 단순한 예외 처리는 `try-catch` 블록을 사용하는 것이다.

```kotlin
launch {
    try {
        riskySuspendFunction()
    } catch (e: Exception) {
        println("에러 발생: $e")
    }
}
```

- 위 코드는 launch 내부에서 발생한 예외를 catch로 처리한다.
- 하지만 모든 상황에서 try-catch가 동작하는 것은 아니다.

---

### 2. launch vs async의 예외 처리 차이

| 코루틴 빌더 | 예외 발생 시 처리 방식 |
|--------------|------------------------|
| `launch` | 예외가 즉시 전파됨 → 부모 Job에 전달되거나 `CoroutineExceptionHandler`에서 처리됨 |
| `async` | 예외가 `Deferred`에 저장됨 → `await()` 호출 시 예외가 발생함 |

```kotlin
val job = CoroutineScope(Dispatchers.Default).launch {
    throw RuntimeException("launch 내부 예외") // 즉시 전파됨
}
```

```kotlin
val deferred = CoroutineScope(Dispatchers.Default).async {
    throw RuntimeException("async 내부 예외") // 바로 안 터짐
}

deferred.await() // 여기서 예외가 발생함
```

---

### 3. CoroutineExceptionHandler 사용

코루틴 전체에 적용되는 전역 예외 처리자 역할을 한다.

```kotlin
val handler = CoroutineExceptionHandler { _, exception ->
    println("핸들러에서 처리된 예외: $exception")
}

val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default + handler)

scope.launch {
    throw IllegalStateException("예외 발생!")
}
```

- CoroutineExceptionHandler는 **launch나 actor와 같은 '최상위 코루틴'**에서만 작동
- async에는 작동하지 않음 → 예외는 반드시 await()로 수동 처리해야 함

---

### 4. 부모-자식 관계와 예외 전파
일반 Job의 경우:
- 자식 코루틴이 예외를 던지면 → 부모 Job도 취소됨
- 형제 코루틴도 모두 함께 취소됨


```kotlin
val parent = CoroutineScope(Job())

parent.launch {
    throw RuntimeException("자식 예외")
}

parent.launch {
    delay(1000)
    println("이 코루틴은 취소됨")
}
```

SupervisorJob을 사용할 경우:
- 자식이 예외를 던져도 부모나 다른 형제에 영향 없음
  

```kotlin
val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

scope.launch {
    throw RuntimeException("에러 발생")
}

scope.launch {
    delay(500)
    println("이 코루틴은 살아있음") // 출력됨
}
```

---

### 5. 실전 패턴: 안전한 동시 처리

```kotlin
suspend fun safeParallelExecution(): Result = coroutineScope {
    val a = async {
        try { fetchA() } catch (e: Exception) { emptyList() }
    }

    val b = async {
        try { fetchB() } catch (e: Exception) { emptyList() }
    }

    Result(a.await(), b.await())
}
```

- 각 작업을 별도 async로 실행
- 개별 try-catch로 안전하게 감싸서 전체 실패를 막는다
- coroutineScope는 모든 async가 완료될 때까지 대기

---

### 6. 정리 요약

| 항목 | 설명 |
|------|------|
| `try-catch` | `launch` 내부에서는 직접 사용 가능. `async`는 `await()` 호출 시 예외 발생하므로 그 시점에서 catch 필요 |
| `CoroutineExceptionHandler` | `launch`, `actor` 등 **최상위 코루틴에서 발생한 예외만** 처리. `async`에서는 동작하지 않음 |
| `launch` | 예외가 발생하면 즉시 상위로 전파되며, 부모 Job이나 예외 핸들러가 처리 |
| `async` | 예외가 `Deferred` 내부에 저장되며, `await()` 호출 시 예외가 발생 |
| `SupervisorJob` | 자식 코루틴 중 하나가 실패해도, 다른 자식 코루틴에 영향을 주지 않음 |
| 구조적 동시성 (`coroutineScope`) | 모든 자식 코루틴이 성공적으로 완료되어야 블록이 종료됨. 하나라도 실패하면 전체 블록이 예외로 종료됨 |


### 7. 결론
코루틴의 예외 처리는 단순히 try-catch로 끝나지 않는다.
코루틴 빌더의 종류(launch vs async), Job의 구조(Job vs SupervisorJob), 전역 핸들러의 유무에 따라
예외의 전파 경로와 처리 방법이 달라진다.

비동기 프로그램의 안정성과 복원력을 높이기 위해서는,
각 코루틴의 실행 범위와 책임, 예외 처리 방식을 명확히 설계해야 한다.


### 참고: 예외 발생 흐름도

```kotlin
launch {
    throw Exception()  →  부모 Job → CoroutineExceptionHandler
}

async {
    throw Exception()  →  저장됨 → await() 호출 시 throw
}
```

