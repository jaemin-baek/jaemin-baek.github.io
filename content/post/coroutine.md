---
title: "Kotlin 코루틴의 멀티스레드 동작 방식"
date: 2025-02-16
draft: false
tags: ["kotlin", "coroutine", "multithreading", "concurrency"]
categories: ["Kotlin"]
---

## Kotlin Coroutine의 멀티스레드 동작 방식

### 1. 개요

Kotlin의 코루틴은 경량 스레드(Lightweight Thread) 개념에 기반하여 비동기 작업을 처리하는 구조로 설계되었다. 본 문서에서는 코루틴이 멀티스레드 환경에서 어떤 방식으로 실행되고 스케줄링되는지를 기술하고, 관련 디스패처(`CoroutineDispatcher`)의 역할과 실행 흐름에 대해 서술한다.

---

### 2. 코루틴과 스레드의 관계

Kotlin 코루틴은 실제 스레드(Thread)와는 구분되는 실행 단위로, 운영체제 수준의 스레드를 직접 생성하거나 관리하지 않는다. 대신, 내부적으로 코루틴 디스패처가 지정된 스레드 풀(Thread Pool) 또는 단일 스레드에서 코루틴을 스케줄링한다. 이러한 구조는 리소스 효율성을 높이고, 대규모 동시 실행 환경에서의 성능을 개선하는 데 기여한다.

---

### 3. CoroutineDispatcher의 역할

`CoroutineDispatcher`는 코루틴이 실행될 스레드를 결정하는 핵심 컴포넌트이다. 주요 디스패처는 다음과 같다.

- `Dispatchers.Default`: CPU 집약적인 작업을 위한 공유 스레드 풀을 사용한다. 일반적으로 코어 수에 비례한 스레드를 할당한다.
- `Dispatchers.IO`: 블로킹 I/O 작업에 최적화된 디스패처로, 더 많은 수의 스레드를 동적으로 생성하여 처리한다.
- `Dispatchers.Main`: UI 기반 애플리케이션에서 메인 스레드에서 실행되도록 보장한다. 안드로이드 또는 JavaFX 환경에서 사용된다.
- `newSingleThreadContext(name: String)`: 명시적으로 단일 스레드를 생성하여 해당 코루틴만을 위해 사용할 수 있도록 한다.

각 디스패처는 코루틴이 실행되는 스레드의 종류를 정의함으로써, 개발자가 동시성 또는 병렬성을 세밀하게 제어할 수 있도록 한다.

---

### 4. 실행 예시 및 스레드 분산

다음은 다양한 디스패처를 지정하여 코루틴이 각각 다른 스레드에서 실행되는 예시이다.

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    launch(Dispatchers.Default) {
        println("Default dispatcher: ${Thread.currentThread().name}")
    }

    launch(Dispatchers.IO) {
        println("IO dispatcher: ${Thread.currentThread().name}")
    }

    launch(newSingleThreadContext("MyThread")) {
        println("Single thread context: ${Thread.currentThread().name}")
    }
}
```

위 예제는 세 개의 코루틴이 서로 다른 스레드에서 동시에 실행되는 구조를 갖는다. 이로써 코루틴이 단일 스레드에 국한되지 않으며, 디스패처 설정에 따라 명시적으로 병렬 실행이 가능함을 확인할 수 있다.

### 실행 결과:

```kotlin
Default dispatcher: DefaultDispatcher-worker-1
IO dispatcher: DefaultDispatcher-worker-1
Single thread context: MyThread
```

그런데 Default, IO 가 기대했던 DefaultDispatcher-worker-1 , DefaultDispatcher-worker-2 가 아니다. 

이건 Dispatchers.Default와 Dispatchers.IO가 같은 스레드에서 실행된 것처럼 보이는 현상인데 이유는 아래와 같다.

### 왜 Dispatchers.Default와 IO가 같은 스레드 이름일까?

#### 공유 풀을 사용 중
1. Dispatchers.Default와 Dispatchers.IO는 모두 스레드 풀(thread pool) 기반이다.
2. 둘 다 내부적으로 DefaultExecutor와 IOExecutor를 공유하는 구조가 있다.
3. JVM이 할당한 첫 번째 워커 스레드(worker-1)가 여러 코루틴에 재사용될 수 있다.
   
| Dispatcher                  | 설명                                                                 |
|----------------------------|----------------------------------------------------------------------|
| `Dispatchers.Default`      | CPU 중심 작업용, **코어 수만큼의 스레드 풀** 사용                         |
| `Dispatchers.IO`           | I/O 중심 작업용, **무제한 스레드 풀**, 내부적으로 `Default`를 재사용함     |
| `newSingleThreadContext()` | 오직 **1개의 전용 스레드**만 사용하는 디스패처, 명시적으로 생성한 스레드 사용 |


즉, 같은 워커가 같은 순간에 여러 코루틴을 처리하지 않더라도, 스레드 풀 안에서 동적으로 배정되다 보니 같은 이름이 출력될 수 있다.


#### 작은 예제라 워커 수가 1개로 충분한 상황
runBlocking + 3개의 launch를 실행할 뿐이라서, 코어 수가 충분하거나 작업이 짧을 경우 JVM은 worker-1만 사용한다. 내부적으로 DefaultDispatcher-worker-1, -2, -3 등이 필요 시 생성

### 확인 실험
```kotlin
fun main() = runBlocking {
    repeat(10) {
        launch(Dispatchers.Default) {
            println("Default dispatcher: ${Thread.currentThread().name}")
        }

        launch(Dispatchers.IO) {
            println("IO dispatcher: ${Thread.currentThread().name}")
        }
    }

    launch(newSingleThreadContext("MyThread")) {
        println("Single thread context: ${Thread.currentThread().name}")
    }
}

```

### 실행 결과
```kotlin
Default dispatcher: DefaultDispatcher-worker-1
IO dispatcher: DefaultDispatcher-worker-1
Default dispatcher: DefaultDispatcher-worker-1
IO dispatcher: DefaultDispatcher-worker-2
Default dispatcher: DefaultDispatcher-worker-1
IO dispatcher: DefaultDispatcher-worker-4
Default dispatcher: DefaultDispatcher-worker-3
Default dispatcher: DefaultDispatcher-worker-1
IO dispatcher: DefaultDispatcher-worker-2
IO dispatcher: DefaultDispatcher-worker-6
Default dispatcher: DefaultDispatcher-worker-2
IO dispatcher: DefaultDispatcher-worker-6
Default dispatcher: DefaultDispatcher-worker-5
Default dispatcher: DefaultDispatcher-worker-7
IO dispatcher: DefaultDispatcher-worker-5
Default dispatcher: DefaultDispatcher-worker-6
Default dispatcher: DefaultDispatcher-worker-7
IO dispatcher: DefaultDispatcher-worker-3
IO dispatcher: DefaultDispatcher-worker-5
IO dispatcher: DefaultDispatcher-worker-4
Single thread context: MyThread
```

### 5. 코루틴의 스레드 전환

코루틴은 `withContext()` 함수를 통해 실행 중인 스레드를 동적으로 전환할 수 있다. 이는 컨텍스트 전환(Context Switch)을 명시적으로 수행하는 것으로, 특정 블록의 실행을 다른 디스패처가 관리하도록 위임하는 방식이다.

```kotlin
suspend fun sample() {
    println("Start: ${Thread.currentThread().name}")
    
    withContext(Dispatchers.IO) {
        println("IO context: ${Thread.currentThread().name}")
    }

    println("Resume: ${Thread.currentThread().name}")
}
```


이 구조는 코루틴의 유연성과 구조적 동시성(Structured Concurrency)을 강화하는 핵심 기제로 작용한다.

###  실행 결과:

```kotlin
Start: main
IO context: DefaultDispatcher-worker-1
Resume: main
```

---

### 6. 동시성과 병렬성
코루틴은 기본적으로 협조적(concurrent) 실행을 지향하나, 다중 디스패처를 활용하면 병렬성(parallelism)도 구현 가능하다. async와 await를 활용하면 서로 독립적인 계산을 동시에 수행하면서 결과를 효율적으로 병합할 수 있다.
다음은 Kotlin의 `async`와 `await`를 활용하여 두 작업을 병렬로 실행하고, 그 결과를 합산하는 예제이다.

```kotlin
// await: 결과가 준비될 때까지 suspend
val resultA = async(Dispatchers.Default) { computeA() }
val resultB = async(Dispatchers.IO) { computeB() }
val combined = resultA.await() + resultB.await()
```

### 실행 흐름 설명

1. `computeA()`는 `Dispatchers.Default` 디스패처에서 실행되며, 이는 CPU 집약적인 작업을 위한 공용 스레드 풀을 사용한다.
2. `computeB()`는 `Dispatchers.IO` 디스패처에서 실행되며, I/O 블로킹 작업에 최적화된 스레드 풀에서 처리된다.
3. `async`를 통해 두 작업은 **동시에 실행**되며, 서로 다른 스레드에서 병렬로 수행된다.
4. `await()`는 각각의 결과가 준비될 때까지 **suspend 상태로 대기**하며, 이 동안 다른 코루틴이 실행될 수 있다.
5. 두 `await()` 호출이 완료되면 `resultA`와 `resultB`의 값을 더하여 `combined`에 결과를 저장한다.


이러한 병렬 실행은 코어 수에 따른 스레드 분산을 통해 실행 성능을 높이는 데 효과적이다.


### 예시 구현

```kotlin
suspend fun computeA(): Int {
    println("Running computeA on: ${Thread.currentThread().name}")
    delay(500)
    return 10
}

suspend fun computeB(): Int {
    println("Running computeB on: ${Thread.currentThread().name}")
    delay(1000)
    return 20
}
```


###  실행 결과:

```kotlin
Running computeA on: DefaultDispatcher-worker-1
Running computeB on: DefaultDispatcher-worker-2
```

computeA()는 약 500ms 후 10을 반환하고, computeB()는 약 1000ms 후 20을 반환한다. 따라서 combined의 값은 30이다.



---

### 7. 결론
Kotlin의 코루틴은 전통적인 스레드 기반 프로그래밍의 한계를 극복하고, 비동기 처리를 보다 안전하고 구조적으로 구현할 수 있도록 설계되었다. 멀티스레드 환경에서의 코루틴 실행은 디스패처 설정을 통해 세밀히 제어되며, 협조적 실행 모델을 기반으로 하되 병렬 처리를 통해 성능 최적화도 가능하다. 이는 현대 애플리케이션 개발에서 요구되는 고성능 동시 처리 요구를 효과적으로 충족시킨다.
