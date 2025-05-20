---
title: "구조적 동시성과 SupervisorJob의 실제 설계 활용"
date: 2025-03-05
draft: false
tags: ["kotlin", "coroutine", "supervisorjob", "structured concurrency", "exception handling"]
categories: ["Kotlin"]
---

### 1. 구조적 동시성이란?

코루틴은 **스코프 기반으로 생성되며**, 스코프가 종료되면  
하위의 모든 자식 코루틴도 함께 종료된다.

즉, 부모가 죽으면 자식도 죽고, 자식이 죽으면 부모도 영향을 받는다.  
이는 다음과 같은 전통적인 구조를 따른다

```kotlin
val scope = CoroutineScope(Job() + Dispatchers.Default)

scope.launch {
    launch { taskA() }
    launch { taskB() }
}
```

- `taskA()`에서 예외가 발생하면 → 부모 코루틴도 취소됨
- 따라서 `taskB()`도 함께 취소된다

---

### 2. 문제 상황: 일부 실패는 무시하고 싶을 때

#### 예: 병렬 API 요청 처리

```kotlin
val result = coroutineScope {
    val comments = async { fetchComments() }
    val suggestions = async { fetchSuggestions() }

    AggregatedData(
        comments = comments.await(),
        suggestions = suggestions.await()
    )
}
```

- `fetchComments()`에서 예외 발생 시 → `fetchSuggestions()`도 중단됨
- 전체가 실패로 처리됨 → **너무 강한 연결 구조**

---

### 3. 해결책: `SupervisorJob`을 사용한 독립 실행 구조

`SupervisorJob`을 사용하면,  
**자식 중 하나가 예외를 던져도 다른 자식에 영향을 주지 않는다.**

```kotlin
val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

scope.launch {
    val dataA = async {
        try { fetchA() }
        catch (e: Exception) {
            emptyList()
        }
    }

    val dataB = async {
        try { fetchB() }
        catch (e: Exception) {
            emptyList()
        }
    }

    val data = ResultData(
        dataA = dataA.await(),
        dataB = dataB.await()
    )

    println(data)
}
```

- `fetchA()`가 실패해도 `fetchB()`는 정상 실행됨
- 각각 독립적으로 예외 처리하고, 전체 구조는 안정성을 유지함

---

### 4. 내부 구조 요약

| Job 유형 | 예외 전파 방식 | 사용 상황 |
|----------|----------------|-----------|
| `Job` | 자식 예외 → 부모로 전파 → 형제도 취소됨 | 전체 실패 시 모두 중단해야 할 때 |
| `SupervisorJob` | 자식 예외는 부모에게 영향을 주지 않음 | 부분 실패 허용, 독립적 작업 병렬 실행 시 |

---

### 5. 실무 적용 사례

#### 병렬 데이터 수집

- API 여러 개 동시에 호출
- 하나 실패해도 가능한 응답만으로 화면 구성

#### 백그라운드 동기화

- 다수의 파일 동기화 작업
- 일부 실패는 로그로 남기고 나머지 계속 처리

#### 사용자 입력 처리

- 검색어 자동완성, 추천어, 최근 검색어 등 병렬로 가져올 때  
- 하나 실패해도 나머지는 계속 보여주고자 할 때

---

### 6. 포트폴리오 활용 방식

실제 포트폴리오에 다음과 같이 서술할 수 있다:

> "SupervisorJob을 활용하여 병렬 코루틴 간 의존성을 분리하고,  
> 하나의 작업 실패가 전체 흐름에 영향을 주지 않도록 비동기 처리 구조를 설계하였습니다.  
> 예외는 개별 async 블록 내에서 처리하며, 사용자에게는 가능한 범위 내에서 응답을 제공하는  
> '부분 실패 허용' 구조를 통해 안정성을 확보했습니다."

---

### 결론

`SupervisorJob`은 코루틴 기반 시스템에서 **복원력 있는 비동기 구조**를 만드는 핵심 도구다.  
**자식 간의 실패 전파를 차단**함으로써, **전체 시스템의 안정성과 사용자 경험을 유지할 수 있다.**

> 코루틴을 깊이 있게 다루려면 단순한 launch/async를 넘어서  
> Job 계층 구조와 예외 전파 모델을 이해하고  
> 실제 상황에 적합한 구조를 선택할 수 있어야 한다.
