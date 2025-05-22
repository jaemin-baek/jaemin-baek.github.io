---
title: "Kotlin 코루틴 내부 구조 (상태 머신 + Continuation + CPS)"
date: 2025-03-12
draft: false
categories: ["kotlin"]
tags: ["kotlin"]
---

# Kotlin 코루틴 내부 구조 (상태 머신 + Continuation + CPS)

Kotlin의 `suspend` 키워드를 사용하는 코루틴은 단순한 비동기 기능이 아닙니다. 내부적으로는 **상태 머신(state machine)** 과 **Continuation-passing style (CPS)** 기반의 구조로 동작하며, 이러한 설계를 통해 코루틴은 **비동기 코드를 동기처럼 자연스럽게 표현**할 수 있습니다.

---

## 기본 개념: `suspend` 함수란?

`suspend` 함수는 **중단(suspend)** 및 **재개(resume)** 가 가능한 함수입니다. 컴파일러는 이를 위해 `Continuation` 객체를 생성하고 상태 추적 코드를 자동 생성합니다.

```kotlin
suspend fun greet(): String {
    println("Hello")
    delay(1000)
    println("World")
    return "Done"
}
```

위 코드는 컴파일러에 의해 상태 머신으로 변환됩니다.

---

## 상태 머신 구조 (컴파일 결과 개념도)

```kotlin
class GreetContinuation(val completion: Continuation<String>) : Continuation<Any?> {
    var label = 0
    lateinit var result: String

    override val context = EmptyCoroutineContext

    override fun resumeWith(data: Result<Any?>) {
        try {
            when (label) {
                0 -> {
                    println("Hello")
                    label = 1
                    delay(1000, this) // suspend 후 현재 상태 저장
                    return
                }
                1 -> {
                    println("World")
                    result = "Done"
                    completion.resumeWith(Result.success(result))
                }
            }
        } catch (e: Throwable) {
            completion.resumeWith(Result.failure(e))
        }
    }
}
```

→ `label` 값으로 상태를 저장하며, 중단 이후 적절한 지점에서 재개됩니다.

---

## CPS (Continuation-Passing Style)

Kotlin 코루틴은 내부적으로 **CPS 변환(CPS Transformation)**을 통해 구현됩니다. 이는 모든 `suspend` 함수가 **다음 실행 내용을 Continuation(콜백)** 으로 넘기는 방식으로 동작한다는 뜻입니다.

예시:

```kotlin
suspend fun hello() {
    println("A")
    delay(1000)
    println("B")
}
```

→ 컴파일러는 이 코드를 `hello(continuation)` 형태로 변환하며, delay 이후 재개 위치를 기억해 두었다가 `resumeWith`로 다시 이어서 실행합니다.

---

## delay 함수의 내부

Kotlin의 `delay()` 함수는 다음과 같이 작동합니다 (JVM 기준):

```kotlin
suspend fun delay(timeMillis: Long) = suspendCancellableCoroutine<Unit> { cont ->
    val scheduled = executor.schedule({
        cont.resume(Unit)
    }, timeMillis, TimeUnit.MILLISECONDS)

    cont.invokeOnCancellation {
        scheduled.cancel(false)
    }
}
```

- `executor`: 내부적으로는 자바의 `ScheduledExecutorService` 사용
- `suspendCancellableCoroutine`: 코루틴 중단 가능 지점 생성
- `resume()`: 일정 시간 후 코루틴 재개

→ 스레드를 블로킹하지 않고 코루틴만 중단시킴

---

## Dispatchers와 스레드

Kotlin 코루틴은 직접 스레드를 만들지 않습니다. 대신, 다음과 같은 **Dispatcher**를 통해 JVM의 스레드 풀을 재사용합니다:

| Dispatcher | 설명                             |
| ---------- | ------------------------------ |
| Default    | CPU 연산용 스레드풀 (ForkJoinPool 기반) |
| IO         | IO용 무제한 스레드풀                   |
| Main       | Android 메인 스레드 등 UI 전용         |
| Unconfined | 처음 호출된 스레드에서 실행                |

→ 결국 코루틴은 **JVM 스레드에서 실행되지만**, 코루틴 자체는 스레드가 아닙니다.

---

## 참고 자료

- Kotlin 공식 문서: [https://kotlinlang.org/docs/coroutines-overview.html](https://kotlinlang.org/docs/coroutines-overview.html)
- KotlinConf 2019 Roman Elizarov (설계자) 발표: [KotlinConf 2019: Coroutines Under the Hood](https://www.youtube.com/watch?v=_hfBv0a09Jc)
- KotlinConf 2017 Roman Elizarov (설계자) 발표: https://youtu.be/YrrUCSi72E8?si=EoNjXdNJ2wvMJIpG
- Kotlin GitHub: [https://github.com/Kotlin/kotlinx.coroutines](https://github.com/Kotlin/kotlinx.coroutines)
- kotlinx.coroutines 구현 내부 코드: `suspendCancellableCoroutine.kt`, `Delay.kt`

---

## 마무리 요약

| 핵심 요소          | 설명                        |
| -------------- | ------------------------- |
| `suspend`      | 상태 머신으로 변환됨 (코드 쪼개짐)      |
| `Continuation` | 재개 지점 추적 객체               |
| `delay()`      | 실제로는 스케줄된 콜백 등록 후 중단      |
| 실행 위치          | JVM 스레드풀 (Dispatcher)     |
| 철학             | 비동기 코드를 동기처럼 쓰게 해주는 언어 설계 |

Kotlin 코루틴은 단순한 비동기 처리 기술이 아니라, **언어, 컴파일러, 런타임이 조화롭게 설계된 고급 개념**입니다.
