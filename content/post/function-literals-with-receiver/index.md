---
title: Function literals with receiver
date: 2023-04-17
slug: function-literals-with-receiver
categories:
    - kotlin
draft: false
---

# Function literals with receiver (수신 객체 지정 람다란?)

coil 라이브러리 코드에서 String.() -> Unit 이런 코드가 나온다.

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

위 코드에서 apply 함수를 호출하면 StringBuilder 객체가 수신 객체로 지정된다.

이후에는 { } 블록 안에서 this를 사용하여 StringBuilder 객체의 메서드를 호출할 수 있다.


# 수신 객체 지정 람다의 문법
수신 객체 지정 람다는 다음과 같은 형식으로 작성된다.
```kotlin
val lambda: 수신 객체 타입.(인수 타입) -> 반환 타입 = { 인수 ->
    // 람다 본문
}
```

위에서 수신 객체 타입은 람다 함수에서 this 로 사용할 객체의 타입을 나타내며

인수 타입은 람다 함수의 매개 변수 타입을 나타낸다. 반환 타입은 람다 함수의 반환 타입을 나타낸다. 

예를 들어, 다음은 StringBuilder 객체를 수신 객체로 사용하는 람다 표현식이다.
```kotlin
val lambda: StringBuilder.(String) -> Unit = { str ->
    append(str)
}

```
위에서 StringBuilder.(String)은 StringBuilder 객체에 대해 호출될 함수의 형식을 정의한다.

이 경우 String 형식 매개 변수가 있고 반환 타입이 Unit인 함수를 나타낸다.


수신 객체 지정 람다는 다음과 같은 코틀린의 표준 라이브러리 함수에서 사용된다.

- apply
- with
- run
- also
- let

이 함수들은 모두 수신 객체 지정 람다를 지원하며 각각의 함수는 다른 방식으로 this 객체를 지정할 수 있다.

# apply
apply 함수는 수신 객체를 초기화하고 객체의 내용을 수정하는 데 사용된다. 다음은 apply 함수를 사용하여 TextView 객체를 초기화하고 속성을 설정하는 예시

```kotlin
val textView = TextView(context).apply {
    text = "Hello, World!"
    textSize = 16f
    setTextColor(Color.BLACK)
}
```
위 코드에서 apply 함수를 호출하면, TextView 객체가 수신 객체로 지정된다.

이후에는 { } 블록 안에서 this를 사용하여 TextView 객체의 속성을 설정할 수 있다.


# with
with 함수는 수신 객체를 매개 변수로 전달받고 해당 객체의 메서드나 속성에 접근하는데 사용된다.

다음은 with 함수를 사용하여 TextView 객체의 속성을 설정하는 예시

```kotlin
val textView = TextView(context)

with(textView) {
    text = "Hello, World!"
    textSize = 16f
    setTextColor(Color.BLACK)
}
```
위 코드에서 with 함수에 TextView 객체를 전달하면 람다 함수 안에서 textView 변수로 해당 객체에 접근할 수 있다.

# run
run 함수는 수신 객체를 매개 변수로 전달받고 해당 객체의 메서드나 속성에 접근하는 데 사용된다. 

run 함수는 반환값이 있으며 람다 함수의 마지막 표현식이 반환된다. 

다음은 run 함수를 사용하여 TextView 객체의 속성을 설정하고 해당 객체를 반환하는 예시입니다.

```kotlin
val textView = TextView(context).run {
    text = "Hello, World!"
    textSize = 16f
    setTextColor(Color.BLACK)
    this
}
```
위 코드에서 run 함수에 TextView 객체를 전달하면 람다 함수 안에서 this 로 해당 객체에 접근할 수 있다. 

마지막으로 this 를 반환하여 textView 변수에 할당된다.

# also
also 함수는 수신 객체를 매개 변수로 전달받고 해당 객체의 메서드나 속성에 접근하는 데 사용됩니다. 

also 함수는 반환값이 없으며 람다 함수의 마지막 표현식은 무시된다.

다음은 also 함수를 사용하여 TextView 객체의 속성을 설정하는 예시이다.


```kotlin
val textView = TextView(context).also {
    it.text = "Hello, World!"
    it.textSize = 16f
    it.setTextColor(Color.BLACK)
}
```
위 코드에서 also 함수에 TextView 객체를 전달하면 람다 함수 안에서 it 으로 해당 객체에 접근할 수 있다. 

마지막 표현식은 무시되므로 also 함수는 반환값이 없다.

# let
let 함수는 수신 객체를 매개 변수로 전달받고 해당 객체의 메서드나 속성에 접근하는데 사용된다. 

let 함수는 반환값이 있으며 람다 함수의 마지막 표현식이 반환됩니다 

다음은 let 함수를 사용하여 TextView 객체를 초기화하고 해당 객체를 반환하는 예시이다.

```kotlin
val textView = TextView(context).let {
    it.text = "Hello, World!"
    it.textSize = 16f
    it.setTextColor(Color.BLACK)
    it
}
```

위 코드에서 let 함수에 TextView 객체를 전달하면 람다 함수 안에서 it으로 해당 객체에 접근할 수 있다. 

마지막으로 it을 반환하여 textView 변수에 할당한다.

# 차이점
이러한 함수들은 모두 수신 객체 지정 람다로서 동작하지만 각 함수는 사용 방법과 동작이 조금씩 다르다. 주요 차이 점은 다음과 같다.

- apply 함수는 수신 객체를 초기화하고 수정하는데 사용된다. 반환값이 없다.
- with 함수는 수신 객체의 메서드나 속성에 접근하는데 사용된다. 반환값이 없다.
- run 함수는 수신 객체의 메서드나 속성에 접근하는 데 사용된다. 반환값이 있으며 람다 함수의 마지막 표현식이 반환된다.
- also 함수는 수신 객체를 초기화하고 수정하는데 사용된다. 반환값이 없다.
- let 함수는 수신 객체를 초기화하고 수정하는데 사용된다. 반환값이 있으며 람다 함수의 마지막 표현식이 반환된다.

따라서, 사용 목적에 따라 적절한 함수를 선택하여 사용하면된다.



# Ref.
https://kotlinlang.org/docs/lambdas.html#function-literals-with-receiver


