---
title: "Kotlin Coroutine에서 SupervisorJob의 역할과 scopeJob 구조"
date: 2025-02-25
draft: false
tags: ["kotlin", "coroutine", "supervisorjob", "job", "coroutinescope"]
categories: ["Kotlin"]
---

## Kotlin Coroutine에서 SupervisorJob의 역할과 `scopeJob` 구조

Kotlin 코루틴에서는 비동기 작업의 생명주기와 예외 처리를 체계적으로 관리하기 위해 `Job` 기반의 구조적 동시성을 제공한다. 본 문서에서는 그 중 `SupervisorJob`을 중심으로 하는 `scopeJob`의 역할과 필요성, 그리고 일반 `Job`과의 차이에 대해 고찰한다.

---

### 1. 개요

코루틴은 `CoroutineScope` 내에서 생성된 자식 코루틴들과 부모 코루틴 간의 관계를 명확히 하여 예측 가능한 동시 실행을 가능하게 한다. 이때 `Job`은 각 코루틴의 생명주기를 추적하고, 취소 여부를 상위 또는 하위로 전파하는 핵심 구성요소로 작동한다. Kotlin에서는 `Job` 외에도 `SupervisorJob`이라는 특별한 형태의 Job을 제공하여, 자식 간의 실패 전파를 제어할 수 있다.

---

### 2. 구조 예시

아래는 `SupervisorJob`을 기반으로 한 `scopeJob`을 생성하는 전형적인 코드 예시이다.

```kotlin
private val scopeJob = SupervisorJob()
private val scope = CoroutineScope(scopeJob + Dispatchers.Default)
```

이 구조는 scope 내에서 생성되는 모든 자식 코루틴이 SupervisorJob을 공유하도록 구성되며, 하나의 자식이 실패하더라도 다른 자식은 영향을 받지 않고 독립적으로 실행을 계속할 수 있도록 한다.

---

### 3. SupervisorJob의 동작 원리

`SupervisorJob`은 일반 `Job`과 달리, 자식 코루틴이 실패(Exception 발생 등)하더라도 **부모나 다른 자식 코루틴에게 실패를 전파하지 않는다**. 이를 통해 **고립된 실패 처리**와 **부분 성공 전략**을 구현할 수 있다.

| 항목 | Job (기본) | SupervisorJob |
|------|------------|----------------|
| 자식 실패 시 | 전체 스코프 취소 | 실패한 자식만 취소 |
| 형제 간 전파 | 예외 전파됨 | 전파되지 않음 |
| 사용 목적 | 전체 작업의 일관성 보장 | 부분 실패 허용, 독립 실행 구조 |

`SupervisorJob`은 `supervisorScope {}` 또는 직접 Scope를 구성할 때 명시적으로 사용되며, `CoroutineScope(SupervisorJob())` 형태로 자주 활용된다.

---

### 4. 실용적 사용 맥락

- 병렬로 다수의 외부 API를 호출할 때
- 자식 코루틴 중 하나가 실패하더라도 나머지 결과가 유효한 경우
- 백그라운드 데이터 동기화 작업에서 개별 요청 단위의 실패를 분리하고 싶은 경우

```kotlin
val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

scope.launch {
    // 개별 작업 1
}

scope.launch {
    // 개별 작업 2 (실패해도 다른 작업에는 영향 없음)
}
```

위 예제는 scope 내부에서 수행되는 코루틴들이 독립적인 실행 환경을 갖도록 보장한다.

---

### 5. 예외 처리와 결합

실제 응용에서는 SupervisorJob과 함께 CoroutineExceptionHandler를 결합하여 보다 견고한 예외 처리를 구현할 수 있다.

```kotlin
val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
    logger.error("Unhandled exception: $throwable")
}

val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default + exceptionHandler)
```

이 구조는 실패한 자식 코루틴의 예외를 처리하면서도 전체 스코프를 안정적으로 유지할 수 있게 한다.

### 6. 결론

SupervisorJob은 Kotlin 코루틴 기반 구조에서 자식 간의 예외 전파를 분리하고, 작업 단위의 독립성과 견고성을 확보하기 위한 중요한 구성요소이다. 일반 Job이 전체 일괄 실패를 선호하는 전략이라면, SupervisorJob은 부분 실패를 수용하며 전체 서비스의 연속성을 유지하는 전략에 적합하다. 이를 통해 복잡한 비동기 시스템에서도 예측 가능한 실행 흐름과 회복 가능한 오류 처리가 가능해진다.

---


