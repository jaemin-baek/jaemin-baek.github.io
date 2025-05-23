---
title: "[v.0.0] Kotlin 코루틴에서 에러 처리 제대로 이해하기"
date: 2025-03-06
draft: false
tags: ["kotlin", "coroutine"]
categories: ["Kotlin"]
---

## Job의 주요 역할

### 1. 생명주기 추적
Job은 코루틴이 활성(active) 상태인지, 완료(completed) 되었는지, 취소(cancelled) 되었는지 관리합니다.

```kotlin
val job = launch { ... }
println(job.isActive)   // true
println(job.isCancelled) // false
println(job.isCompleted) // false
```

### 2. 취소 전파
부모 코루틴이 취소되면, 모든 자식 Job도 자동으로 취소됩니다 (구조적 동시성).

```kotlin
val parent = CoroutineScope(Job())

val child = parent.launch {
    delay(1000)
    println("Child finished")
}

parent.cancel() // child도 함께 취소됨
```


### 3. 작업 완료 대기
job.join()을 통해 Job이 끝날 때까지 대기할 수 있습니다.

```kotlin
val job = launch {
    delay(1000)
    println("Done")
}

job.join()  // 여기서 기다림
println("After job")
```

### 4. 예외 및 오류 처리
예외 발생 시 Job은 취소 상태로 전환되고, 예외는 부모나 예외 핸들러로 전파됩니다.

```kotlin
val job = CoroutineScope(Dispatchers.Default).launch {
    error("Something went wrong")
}

job.invokeOnCompletion { throwable ->
    println("Job ended with: $throwable")
}
```

## 정리

| 역할           | 설명                                                  |
|----------------|-------------------------------------------------------|
| 생명주기 관리  | 코루틴의 실행/완료/취소 상태를 추적함                |
| 구조적 동시성  | 부모-자식 코루틴 관계를 구성하고 취소를 전파함       |
| 동기화         | join() 등을 통해 코루틴이 끝날 때까지 기다릴 수 있음 |
| 예외 추적      | 예외 발생 시 취소 상태로 전환되고 예외가 전파됨      |

