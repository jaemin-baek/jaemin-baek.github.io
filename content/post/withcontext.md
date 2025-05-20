---
title: "Kotlin Coroutine에서 withContext, launch, async의 개념 및 실행 방식 비교"
date: 2025-03-03
draft: false
tags: ["kotlin", "coroutine", "withContext", "launch", "async"]
categories: ["Kotlin"]
---

## Kotlin Coroutine에서 withContext, launch, async의 개념 및 실행 방식 비교

Kotlin 코루틴은 비동기 흐름 제어를 위한 고수준 추상화를 제공하며, 이를 위한 핵심 도구로 `withContext`, `launch`, `async`가 사용된다. 이 세 도구는 각각 목적과 동작 방식이 뚜렷하게 구분되며, 올바른 사용을 위해 그 차이를 명확히 이해하는 것이 중요하다. 본 문서에서는 이 세 가지 코루틴 구성 요소의 구조적 차이, 실행 방식, 반환값, 예외 처리 특성을 중심으로 비교하고 그 활용 맥락을 제시한다.

---

### 1. 개념적 정의

| 구성 요소 | 기본 용도 | 실행 컨텍스트 |
|-----------|-----------|----------------|
| `withContext` | 컨텍스트 전환 및 작업 수행 | 같은 코루틴 내에서 실행 |
| `launch` | 새로운 코루틴 시작 (단순 실행) | 독립된 Job 생성 |
| `async` | 결과값 반환이 필요한 코루틴 시작 | `Deferred<T>` 반환 |

---

### 2. 시그니처 비교

```kotlin
suspend fun <T> withContext(
    context: CoroutineContext,
    block: suspend CoroutineScope.() -> T
): T
```

```kotlin
fun <T> CoroutineScope.async(
    context: CoroutineContext = EmptyCoroutineContext,
    block: suspend CoroutineScope.() -> T
): Deferred<T>
```

- withContext: suspend 함수이며, 호출한 코루틴의 흐름을 일시 정지하고 컨텍스트 전환 후 실행
- launch: 새로운 코루틴을 시작하고 Job을 반환
- async: 결과값을 비동기적으로 계산하며 Deferred<T>를 반환

### 3. 사용 예시
#### 3.1 withContext

```kotlin
suspend fun loadData(): String {
    return withContext(Dispatchers.IO) {
        // 블로킹 IO → 비동기 전환
        fetchDataFromNetwork()
    }
}
```

- 현재 코루틴을 일시 정지하고 Dispatchers.IO로 전환하여 작업을 수행
- 완료 후 이전 컨텍스트로 복귀

#### 3.2 launch

```kotlin
fun startLogging(scope: CoroutineScope) {
    scope.launch {
        println("Logging started.")
    }
}
```

- 독립 실행 → 결과 반환 없이 작업 수행
- Job을 통해 수명 및 취소 여부 제어 가능

#### 3.3 async

```kotlin
suspend fun aggregate(): Int = coroutineScope {
    val a = async { computeA() }
    val b = async { computeB() }
    a.await() + b.await()
}
```

- 결과가 필요한 두 작업을 병렬로 실행
- await() 호출 시 각각의 연산 결과를 비동기적으로 수집

### 4. 비교 요약 표

| 항목 | `withContext` | `launch` | `async` |
|------|---------------|----------|---------|
| 새 코루틴 생성 여부 | ❌ (현재 코루틴 내부에서 실행) | ✅ 새 코루틴 시작 | ✅ 새 코루틴 시작 |
| 반환값 | ✅ 반환값을 직접 반환 | ❌ 반환값 없음 (`Unit`) | ✅ `Deferred<T>`로 비동기 결과 반환 |
| 병렬 실행 | ❌ 순차 실행 | ✅ 병렬 가능 | ✅ 병렬 가능 |
| 예외 전파 방식 | 즉시 전파됨 | 부모 `Job`으로 전파됨 | `await()` 시 전파됨 |
| 컨텍스트 전환 | ✅ 주 용도 | ✅ 가능 | ✅ 가능 |
| 취소 전파 | ✅ 가능 | ✅ 가능 | ✅ 가능 |
| 주 사용 목적 | 컨텍스트 전환 + 결과 처리 | 단순한 백그라운드 실행 | 병렬 작업 + 결과 수집 |

---

### 5. 결론

`withContext`, `launch`, `async`는 Kotlin 코루틴의 비동기 실행 모델을 구성하는 핵심 도구로서, 각기 다른 목적과 특성을 가진다.

- `withContext`는 **기존 코루틴의 흐름 안에서 Dispatcher나 Job 등 컨텍스트만 전환**하여 특정 블록을 실행하고 결과를 반환하는 데 사용된다.
- `launch`는 **새로운 코루틴을 시작하여 병렬로 독립적인 작업을 수행**하는 데 적합하며, 결과값이 필요 없는 단순 작업에 주로 쓰인다.
- `async`는 **결과값을 반환해야 하는 병렬 작업**에 적합하며, `Deferred<T>`를 통해 `await()`로 값을 추후 사용할 수 있게 한다.

이들 각각은 코루틴의 **생명주기 관리, 예외 처리 흐름, 병렬성 확보 방식**에 차이를 가지며, 목적에 맞는 선택을 통해 더 안정적이고 예측 가능한 비동기 시스템을 설계할 수 있다.
