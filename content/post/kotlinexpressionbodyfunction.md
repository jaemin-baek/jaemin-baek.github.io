---
title: "[v.0.0] Kotlin 문법 정리: Expression Body Function"
date: 2025-03-10
draft: false
categories: ["Kotlin"]
tags: ["Kotlin"]
---

# Kotlin 함수 문법 요약

## 식 본문 함수 (Expression Body Function)

함수 본문이 단일 표현식일 경우, 중괄호 없이 `=` 로 정의할 수 있습니다.

```kotlin
fun add(a: Int, b: Int) = a + b
```

- return 키워드를 명시하지 않아도 자동 반환됩니다.

- 함수의 결과가 단일 식(expression)일 때 사용됩니다.

- 간결한 함수 작성에 유리하며, 특히 getters, utility functions, single-line transformations 등에서 자주 활용됩니다.

### 단일 표현식이란?
하나의 결과값을 내는 하나의 명령 또는 계산식
즉, return 없이도 값을 만들어내는 단 하나의 식(expression) 을 말합니다.


#### 예: 단일 표현식 (O)
```kotlin
fun add(a: Int, b: Int) = a + b
```
a + b는 하나의 식이고, **하나의 값(Int)**을 만듭니다.

그래서 = 오른쪽만 보고도 반환값이 명확함


#### 예: 단일 표현식 아님 (X)
```kotlin
fun add(a: Int, b: Int): Int {
    val sum = a + b
    println(sum)
    return sum
}
```
여기에는 **여러 문장(statements)**이 있고

val, println, return 등 복합적인 흐름이 존재하므로 → 단일 표현식이 아님



### 블록 본문 함수와 비교


```kotlin
fun add(a: Int, b: Int): Int {
    return a + b
}
```

블록 본문 함수는 여러 줄의 로직을 포함할 수 있어 더 복잡한 처리가 가능합니다.

반드시 return 키워드를 명시해야 결과를 반환합니다.

| Syntax                  | Name               | Description                         |
|-------------------------|--------------------|-------------------------------------|
| `fun foo() = something` | Expression Body     | Single expression, return omitted   |
| `fun foo() { ... }`     | Block Body          | Multiple lines allowed, explicit return |


### Expression Body 사용의 이점

- 가독성 향상: 간단한 함수는 더 읽기 쉬운 형태로 표현됨

- 코드 길이 단축: 반복적인 return 문 생략 가능

- 함수형 스타일 지향: Kotlin의 함수형 프로그래밍 특징과 잘 어울림

```kotlin
val square: (Int) -> Int = { it * it }
fun isEven(n: Int) = n % 2 == 0
fun greet(name: String) = "Hello, $name!"
```

### 주의할 점

- 여러 줄 로직에는 적합하지 않음 → 블록 본문을 사용해야 가독성 유지

- 반환 타입이 명확하지 않을 경우, 타입 추론이 어려워질 수 있음


#### 나쁜 예)
```kotlin
fun risky() = if (someCondition) "yes" else null // 타입 명시가 더 안전할 수 있음
```

#### 좋은 예)

 모델 객체의 getter

```kotlin
val fullName: String
    get() = "$firstName $lastName"
```

Repository, Service, UseCase 등에서 한 줄로 끝나는 경우

```kotlin
fun findUserById(id: Int) = userRepository.findById(id)
```

--- 

### 결론

Expression Body는 Kotlin 코드의 간결함과 가독성을 높이는 강력한 기능입니다. 하지만 남용 시 복잡한 로직이 숨어버릴 수 있으므로, 상황에 맞는 사용이 중요합니다.