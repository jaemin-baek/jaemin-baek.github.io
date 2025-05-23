---
title: "[v.0.0] 익명 함수란? (anonymous function)"
date: 2025-03-11
draft: false
categories: ["Kotlin"]
tags: ["Kotlin"]
---


# 1. 익명 함수란? (anonymous function)

> 이름이 없는 함수

보통 우리가 쓰는 함수는 이름이 있는 함수입니다


```kotlin
fun sayHello() {
    println("Hello")
}
```

하지만 어떤 함수는 이름 없이도 쓸 수 있습니다. 이것이 익명 함수예요.

```kotlin
fun() {
    println("Hello")
}
```

이렇게 쓰면 이름이 없기 때문에 이 자체로는 실행이 안 되고, 변수에 담아서 써야 합니다

```kotlin
val greet = fun() { println("Hello") }
greet()  // Hello
```


# 2. 그럼 람다 표현식은 뭐가 다르냐?

람다 표현식은 익명 함수를 더 간결하게 쓰는 문법이에요.

```kotlin
val greet = { println("Hello") }  // 람다 표현식
greet()  // Hello
```

즉, fun() {} 을 {}로 바꾼 것!

# 3. "함수를 값처럼 다룬다"는 무슨 뜻?

이 말이 중요한데요. 함수도 변수에 넣고, 다른 함수에 넘기고, 리턴할 수도 있다는 뜻입니다.

예를 들어

```kotlin
val add = { a: Int, b: Int -> a + b }  // 함수처럼 생긴 값을 변수에 저장

fun calculate(x: Int, y: Int, op: (Int, Int) -> Int): Int {
    return op(x, y)  // 함수(값)를 받아서 실행
}

val result = calculate(3, 5, add)  // 함수 자체를 넘김!
println(result) // 8
```

여기서 add는 함수지만 값처럼 변수에 담겨 다뤄졌고

calculate는 함수 하나를 인자로 받아서 실행했죠

이게 바로 "함수를 값처럼 다룰 수 있다" 는 뜻이에요.
함수를 변수처럼 사용 → 함수형 프로그래밍의 핵심입니다.

