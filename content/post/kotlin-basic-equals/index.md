---
title: Kotlin 과 Java 의 동등연산자 비교
date: 2023-04-17
slug: kotlin-basic-equals
categories:
    - kotlin
draft: false
---

# Kotlin 과 Java 의 동등연산자 비교

두 개의 Primitive Type(int, char) 혹은 두 개의 객체를 비교해야할 경우, 언제는 두 개의 값이 같은지를 구분하고 싶을 때가 있고, 언제는 두 개의 주소값이 같은지를 알고 싶을 때가 있다. 이들을 각 자바와 코틀린에서는 어떻게 구분해야할까?

# Java
java 에서는 Primitive Type 을 비교하기 위해 == 연산자를 사용한다.
```java
int a = 1
int b = 2

System.out.println(a == b) // false
```

한편 참조 타입인 두 피연산자 사이에 == 를 사용할 경우 주소값으로 비교를 하게 된다. 두 피연산자의 주소값이 같은 곳을 가리키고 있다면 true 를 반환하는 것이다. String의 경우 원시 타입이 아닌 참조 타입이기 때문에, 겉으로 보이는 문자가 똑같아 보여도 주소값이 다를경우 false가 출력된다.

```java
String a = "hello" // 주소값 : 1번지
String b = "hello" // 주소값 : 2번지

System.out.println(a==b) // false
```

따라서 자바에서는 두 객체(참조 타입)의 동등성을 알기 위해서 equals 를 호출해야 한다.

```java
String a = "hello" // 주소값 : 1번지
String b = "hello" // 주소값 : 2번지

System.out.println(a.equals(b)) // true
```

# Kotlin
코틀린에서도 == 연산자가 기본이다. 그러나 자바와는 동작 방식에 조금 차이가 있다. 원시 타입 두개를 비교할 때는 == 연산자가 동일하게 동작하지만, 참조 타입을 비교할 때 다르게 동작한다.

== 는 내부적으로 equals를 호출한다. 따라서 참조 타입인 두 개의 String 을 == 연산으로 비교하면 주소값이 아닌 값을 비교를 한다.

```kotlin
val a: String = "hello"
val b: String = "hello"

println(a == b) // true
```

디컴파일 결과:

```java
String a = "hello";
String b = "hello";
boolean var2 = Intrinsics.areEqual(a, b);
System.out.println(var2);
```


```java
public static boolean areEqual(Object first, Object second) {
    return first == null ? second == null : first.equals(second);
}
```


참조 타입의 주소 값을 비교(reference comparision)하고 싶다면?
코틀린은 자바에는 없는 ===연산자를 지원한다. 참조 비교를 위해서 === 연산자를 사용하면 된다. 즉, 자바의 주소 값 비교인 ==와 코틀린의 ===가 동일한 역할을 한다.

디컴파일 결과:

```java
String a = "hello";
String b = "hello";
boolean var2 = a == b;
System.out.println(var2);
```

