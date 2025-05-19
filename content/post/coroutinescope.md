---
title: "Kotlin 코루틴의 runBlocking, coroutineScope, supervisorScope 비교"
date: 2025-05-19
draft: false
tags: ["kotlin", "coroutine", "concurrency", "runBlocking", "coroutineScope", "supervisorScope"]
categories: ["Programming", "Kotlin"]
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
