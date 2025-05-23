---
title: "[v.0.0] Kotlin Coroutine에서 CoroutineScope와 coroutineScope 빌더의 개념적 차이"
date: 2025-03-01
draft: false
tags: ["kotlin", "coroutine", "coroutinescope", "coroutineScope builder", "구조적 동시성"]
categories: ["Kotlin"]
---

## Kotlin Coroutine에서 CoroutineScope와 coroutineScope 빌더의 개념적 차이

Kotlin 코루틴은 구조적 동시성(Structured Concurrency)을 구현하기 위해 다양한 스코프(scope) 기반의 실행 환경을 제공한다. 그중 `CoroutineScope(...)` 생성자와 `coroutineScope {}` 빌더는 이름이 유사하지만, **역할과 사용 위치, 생명주기 및 제어 방식에 있어 명확히 구분되는 개념**이다. 본 문서에서는 이 둘의 본질적인 차이와 각각의 실용적 쓰임에 대해 기술한다.

---

### 1. 개요

코루틴은 자체적인 실행 컨텍스트를 요구하며, 이를 정의하는 단위가 CoroutineScope이다. 코루틴 스코프는 일반적으로 명시적으로 생성하거나, 일시적으로 suspend 함수 내에서 빌더로 선언하여 사용된다. 이 두 방식은 각각 `CoroutineScope(...)` 생성자와 `coroutineScope {}` 빌더로 구분되며, 코드 구조와 실행 흐름에 결정적인 영향을 미친다.

---

### 2. CoroutineScope(...) 생성자

`CoroutineScope(context: CoroutineContext)`는 **클래스나 객체 수준**에서 코루틴 실행 환경을 명시적으로 구성할 때 사용된다. 생성된 스코프는 별도로 `cancel()`하거나 생명주기를 관리해야 하며, 장기 실행되는 컴포넌트(ViewModel, Service 등)에 적합하다.

```kotlin
private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

scope.launch {
    // 장기 실행되는 비동기 작업
}
```

- 외부에서 scope.cancel()을 호출하면 해당 스코프 하위의 모든 코루틴이 취소된다.
- CoroutineScope는 클래스 필드나 전역 컨텍스트로 주입되며, 수동 관리가 필수이다.

---

### 3. coroutineScope { } 빌더

`coroutineScope`는 `suspend fun` 내부에서 사용 가능한 코루틴 빌더이며, 해당 블록 내에서 생성된 자식 코루틴들이 모두 완료되기 전까지 현재 코루틴을 일시 정지시킨다. 구조적 동시성을 구현하기 위한 핵심 기제로 작동하며, 블록 범위 외부로 생명주기가 확장되지 않는다.

```kotlin
suspend fun fetchData(): UserData = coroutineScope {
    val a = async { fetchA() }
    val b = async { fetchB() }
    UserData(a.await(), b.await())
}
```

- 블록이 종료되면 자식 코루틴은 모두 정리되고 스코프도 자동으로 사라진다.
- coroutineScope 자체를 변수로 저장하거나 외부에서 cancel()하는 것은 불가능하다.

---

### 4. 비교 표

| 항목 | `CoroutineScope(...)` | `coroutineScope { }` |
|------|------------------------|------------------------|
| 타입 | 클래스 생성자 | `suspend` 함수 내 빌더 |
| 사용 위치 | 전역, 클래스 필드 등 | `suspend` 함수 내부 |
| 생명주기 | 외부에서 수동으로 관리 (`cancel()`) | 블록 내부에서 자동 관리됨 |
| 구조적 동시성 | 보장되지 않음 (설계에 따라 가능) | 기본적으로 보장됨 |
| 외부에서 종료 가능 여부 | 가능 (`cancel()`) | 불가능 |
| 자식 예외 전파 방식 | Job 종류에 따라 다름 (ex. `SupervisorJob`) | 자식 실패 시 전체 블록 취소 |
| 일반적 사용 용도 | ViewModel, Repository, Service 등 장기 생존 객체 | 일시적 작업 조합, suspend 함수 내부 동시 실행 처리 |

---

### 5. 사용 예시 비교

#### 5.1 CoroutineScope 예시

```kotlin
class DataFetcher {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun startFetching() {
        scope.launch {
            fetchSomething()
        }
    }

    fun stop() {
        scope.cancel() // 명시적으로 종료
    }
}
```

- 장기 실행되는 비동기 작업을 관리하는 데 적합하며, cancel()을 통한 명확한 종료가 가능하다.

#### 5.2 coroutineScope 예시

```kotlin
suspend fun fetchAll(): List<Result> = coroutineScope {
    val a = async { fetchA() }
    val b = async { fetchB() }
    listOf(a.await(), b.await())
}
```

- 일시적인 데이터 병렬 수집이나 처리 시에 적합하며, 외부 생명주기와 무관하다.

### 6. 결론
`CoroutineScope(...)`는 명시적 실행 환경을 구성하고, 생명주기를 외부에서 직접 제어해야 하는 경우에 사용된다. 반면 `coroutineScope {}`는 일시적이고 지역적인 suspend 블록으로서, 블록 내부의 자식 코루틴들의 실행을 제어하고, 자동 정리되는 구조적 동시성을 제공한다. 이 둘은 유사한 이름을 가졌으나, 설계 철학과 활용 맥락이 명확히 구분되어야 하며, 적절한 선택이 안정적이고 예측 가능한 코루틴 기반 시스템 설계의 핵심이 된다.