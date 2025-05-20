---
title: "CoroutineScope.cancel()과 Job.cancel()은 같은가?"
date: 2025-03-03
draft: false
tags: ["kotlin", "coroutine", "job", "cancel", "coroutinescope", ]
categories: ["Kotlin"]
---

## CoroutineScope.cancel()과 Job.cancel()은 같은가?

Kotlin 코루틴을 사용하다 보면 `CoroutineScope.cancel()`과 `Job.cancel()`을 모두 보게 된다. 이 둘은 이름은 비슷하지만, 실제로 동일한 기능일까? 둘의 차이는 어디에 있을까? 본 포스트에서는 이 질문을 중심으로, Kotlin 표준과 `kotlinx.coroutines`의 차이를 기반으로 정확한 동작 방식을 설명한다.

---

### 1. Job이란?

`Job`은 Kotlin 코루틴의 생명주기와 상태를 관리하는 객체다.  
각 코루틴에는 하나의 Job이 할당되며, 이를 통해 다음을 제어할 수 있다:

- 코루틴의 실행 상태 추적 (활성, 취소, 완료)
- `cancel()`을 통한 중단 신호 전달
- `join()`을 통한 종료 대기
- 부모-자식 관계 관리

---

### 2. CoroutineScope는 Job을 포함한다

`CoroutineScope`는 코루틴을 실행할 수 있는 컨텍스트이며, 내부적으로 `CoroutineContext`를 통해 **Job을 반드시 포함**한다. 예를 들어 다음과 같은 코드가 있을 때:

```kotlin
val scope = CoroutineScope(Dispatchers.Default)
```

실제로는 다음과 같은 컨텍스트가 구성된다

```kotlin
CoroutineScope(Job() + Dispatchers.Default)
```

즉, Job은 자동 생성되며 scope 안에 숨겨져 있다. 하지만 이 Job에 직접 접근할 수는 없다.

---

### 3. scope.cancel()은 왜 되는가?

Kotlin 표준의 CoroutineScope 인터페이스는 cancel() 함수를 직접 정의하지 않는다.
하지만 kotlinx.coroutines 라이브러리는 다음과 같은 확장 함수를 제공한다.

```kotlin
public fun CoroutineScope.cancel(cause: CancellationException? = null) {
    coroutineContext[Job]?.cancel(cause)
}
```

즉, CoroutineScope.cancel()은 실제로는 자신의 CoroutineContext에서 Job을 꺼내고, 그 Job의 cancel()을 호출하는 확장 함수일 뿐이다.

따라서 다음과 같은 코드는 정상적으로 작동한다

```kotlin
val scope = CoroutineScope(Dispatchers.IO)
scope.cancel() // kotlinx.coroutines 확장 함수로 동작
```

---

### 4. Job을 명시적으로 만들면 어떤 이점이 있나?

Job을 직접 변수로 만들어 Scope에 넣으면, Scope 밖에서도 Job을 통해 상태를 제어할 수 있다.

```kotlin
val job = Job()
val scope = CoroutineScope(job + Dispatchers.Default)

scope.launch {
    // ...
}

job.cancel() // scope의 모든 코루틴 취소 가능
```

---

### 6. 결론
CoroutineScope.cancel()은 Kotlin 표준의 기능이 아니라,
kotlinx.coroutines에서 제공하는 확장 함수이다.
내부적으로는 Job.cancel()을 위임 호출하며, 같은 대상이라면 동작 결과는 동일하다.