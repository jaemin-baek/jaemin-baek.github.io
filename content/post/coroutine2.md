---
title: "[v.0.0] 코루틴 장점2: 비동기 코드를 동기 코드처럼 쉽게 작성하게 해준다"
date: 2025-03-10
draft: false
tags: ["kotlin", "coroutine", "multithreading", "concurrency"]
categories: ["Kotlin"]
---

## 비동기 코드를 동기 코드처럼 쉽게 작성하게 해준다

먼저 "비동기 코드를 동기처럼"이란 무슨 뜻인가?
비동기 코드는 원래 콜백(callback)이나 이벤트 리스너로 작성되기 때문에,
코드 흐름이 분리되고 복잡해지기 쉬워요.

하지만 코루틴을 사용하면, 그런 복잡한 구조를 "한 줄씩 순차적으로" 작성할 수 있어서
마치 일반 함수(=동기 함수)처럼 코드를 짤 수 있다는 뜻이에요.


### 예시 1: 비동기 코드 (콜백 지옥)

```kotlin
getUser { user ->
    getProfile(user.id) { profile ->
        getPosts(profile.id) { posts ->
            println("완료: $posts")
        }
    }
}
```

- 중첩 콜백이 많아짐 (일명 콜백 헬/지옥)

- 코드 흐름이 위→아래로 자연스럽지 않음

- 예외 처리도 복잡


### 예시 2: 코루틴 사용 (동기처럼 보임)


```kotlin
suspend fun fetchAll() {
    val user = getUser()
    val profile = getProfile(user.id)
    val posts = getPosts(profile.id)
    println("완료: $posts")
}
```
마치 동기 함수처럼 보이죠?

하지만 실제로는 getUser, getProfile, getPosts는 각각 suspend 함수이고

내부적으로는 중단과 재개가 발생하지만, 작성 방식은 순차적이고 간단

### 그런데, suspend fun fetchAll()이 아니라, 그냥 일반 함수라면?

```kotlin
fun fetchAll() {
    val user = getUser()
    val profile = getProfile(user.id)
    val posts = getPosts(profile.id)
    println("완료: $posts")
}
```

이럴 경우 어떤 문제가 생기냐?
getUser(), getProfile(), getPosts()가 느린 작업이면?

#### 예:
- 서버에서 사용자 정보를 가져옴 (HTTP 요청)
- 디스크에서 파일을 읽음
- DB에서 조회

> 일반 함수에서는 이런 느린 작업을 하면 스레드를 막게 됨

getUser()에서 네트워크 응답을 기다리는 동안 스레드 전체가 블로킹(blocking) 됨

다른 일을 못 하게되므로 비효율적, 앱 멈춘 것처럼 보임


### 다시 말해 한 줄 요약하면..!

> "비동기 코드를 동기 코드처럼 쓴다" = 비동기의 복잡함을 숨기고, 자연스러운 코드 흐름을 만든다.
>
> 













