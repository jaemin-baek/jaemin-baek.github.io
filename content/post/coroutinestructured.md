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