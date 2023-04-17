---
title: Function literals with receiver
date: 2023-04-17
slug: function-literals-with-receiver
categories:
    - kotlin
draft: false
---

# Function literals with receiver (수신 객체 지정 람다란?)

coil 라이브러리 코드를 보고있는데 String.() -> Unit 이런 코드가 나온다.
이것은 수신 객체 지정 람다라는건데 한국말로 쓰려니 용어가 다소 어렵게 느껴질 수 있다.
수신 객체 지정 람다는 코틀린에서 함수형 프로그래밍을 지원하기 위해 제공되는 특별한 형태의 람다 표현식이다. 
일반적인 람다 표현식과 달리 수신 객체 지정 람다는 특정한 객체를 this 키워드로 사용할 수 있는 람다를 말한다.
예를 들어, 다음과 같은 코드에서는 StringBuilder 객체를 this로 사용할 수 있다.

```kotlin

val result = StringBuilder().apply {
    append("Hello")
    append(" ")
    append("World")
}.toString()

println(result) // "Hello World"

```


# Ref.
https://kotlinlang.org/docs/lambdas.html#function-literals-with-receiver


