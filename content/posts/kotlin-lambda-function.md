---
title: "코틀린 람다함수"
date: "2025-09-17"
category: "Kotlin"
tags: ["kotlin", "lambda", "compose", "android"]
description: "사내 주니어 개발자에게 Compose 기초를 설명하다가 setContent { }에서 마주친 Kotlin 람다 함수와 trailing lambda 문법을 정리합니다."
---

![코틀린 람다함수](/images/kotlin-lambda-function-cover.png)

사내 주니어 개발자에게 Compose 기초를 설명할 일이 있었다. `MainActivity`에서 Compose 화면을 시작하는 부분을 보여주다가 이 코드에서 잠깐 멈췄다.

```kotlin
setContent {
    Navigation3BasicApp()
}
```

처음에는 `Navigation3BasicApp()`이 중요한 부분처럼 보였지만, 그 친구가 헷갈린 부분은 다른 곳이었다. "함수 안에 왜 `{ ... }`가 들어가나요?"에 가까운 질문이었다.

그때 다시 느꼈다. Compose를 처음 볼 때 막히는 지점은 꼭 Compose 자체가 아닐 수 있다. `setContent`, `Button`, `Column` 같은 이름보다 먼저 Kotlin의 람다 문법이 잡혀 있어야 코드가 자연스럽게 읽힌다.

이 글은 Kotlin 람다를 문법책처럼 정리한 글은 아니다. 주니어에게 `setContent { ... }`를 설명하다가, 아주 기초적인 Kotlin 람다 함수와 trailing lambda 문법을 다시 풀어쓴 메모에 가깝다.

## 먼저 막혔던 부분

`setContent`를 처음 보면 이렇게 읽히기 쉽다.

```kotlin
setContent {
    Navigation3BasicApp()
}
```

겉모양만 보면 `setContent`라는 함수 뒤에 갑자기 코드 블록이 붙은 것처럼 보인다. Compose를 막 시작한 입장에서는 "함수를 호출하는 건 알겠는데, 괄호도 없이 중괄호가 바로 붙는 게 맞나?"라는 생각이 들 수 있다.

하지만 Kotlin에서는 `{ ... }` 코드 덩어리도 값처럼 다룰 수 있다. 정확히는 이 코드 덩어리가 **람다 함수**다.

## 1. 람다는 이름 없는 함수다

이름 있는 함수는 이렇게 만든다.

```kotlin
fun sayHello() {
    println("Hello")
}
```

이 함수의 이름은 `sayHello`다. 그래서 나중에 이렇게 호출할 수 있다.

```kotlin
sayHello()
```

그런데 Kotlin에서는 이름 없는 함수도 만들 수 있다.

```kotlin
{
    println("Hello")
}
```

이게 람다다. 조금 더 편하게 말하면 **이름 없는 함수**다.

다만 이렇게만 써두면 이 람다는 어디에도 연결되어 있지 않다. 보통은 변수에 담거나, 다른 함수에 인자로 넘긴다.

```kotlin
val sayHello = {
    println("Hello")
}

sayHello()
```

여기서 `sayHello`는 함수 이름처럼 보이지만, 실제로는 람다를 담은 변수다. 변수에 문자열이나 숫자를 담을 수 있듯이, 실행할 코드도 담을 수 있다.

## 2. 함수에 코드 덩어리를 넘길 수 있다

람다를 이해할 때 가장 중요한 지점은 이것이다.

```kotlin
fun runSomething(block: () -> Unit) {
    block()
}
```

여기서 `block: () -> Unit`은 이런 뜻이다.

- `()` : 인자가 없다.
- `Unit` : 의미 있는 반환값이 없다.
- `() -> Unit` : 인자 없이 실행되고, 반환값 없이 끝나는 함수 타입이다.

즉 `runSomething`은 숫자나 문자열이 아니라 **나중에 실행할 함수**를 인자로 받는다.

그래서 이렇게 호출할 수 있다.

```kotlin
runSomething({
    println("Hello")
})
```

이 코드에서 `runSomething`에게 넘긴 값은 이 람다다.

```kotlin
{
    println("Hello")
}
```

처음에는 어색하지만, 구조만 보면 다른 인자를 넘기는 것과 크게 다르지 않다.

```kotlin
printName("Jaemin")
printCount(3)
runSomething({ println("Hello") })
```

문자열을 넘길 수도 있고, 숫자를 넘길 수도 있고, 실행할 코드 덩어리를 넘길 수도 있다.

## 3. 마지막 인자가 람다면 밖으로 뺄 수 있다

그런데 실제 Kotlin 코드는 보통 이렇게 쓰지 않는다.

```kotlin
runSomething({
    println("Hello")
})
```

대신 이렇게 쓴다.

```kotlin
runSomething {
    println("Hello")
}
```

이게 Kotlin의 **trailing lambda syntax**다. 함수의 마지막 인자가 람다이면, 그 람다를 괄호 밖으로 뺄 수 있다.

그래서 아래 두 코드는 같은 의미다.

```kotlin
runSomething({
    println("Hello")
})
```

```kotlin
runSomething {
    println("Hello")
}
```

처음에는 두 번째 코드가 특별한 문법처럼 보이지만, 실제로는 첫 번째 코드를 Kotlin답게 줄여 쓴 것이다.

## 4. 다시 setContent를 보면

이제 처음 봤던 Compose 코드를 다시 볼 수 있다.

```kotlin
setContent {
    Navigation3BasicApp()
}
```

이 코드는 사실 이렇게 이해할 수 있다.

```kotlin
setContent({
    Navigation3BasicApp()
})
```

조금 더 풀어 쓰면 이런 모양에 가깝다.

```kotlin
setContent(
    content = {
        Navigation3BasicApp()
    }
)
```

즉 `setContent`는 `content`라는 람다를 인자로 받는다. 그리고 그 람다 안에 작성한 Composable UI를 Activity 화면으로 사용한다.

`Navigation3BasicApp()`은 Android나 Compose가 기본으로 제공하는 특별한 함수가 아니다. 내가 만든 `@Composable` 함수일 뿐이다.

```kotlin
@Composable
fun Navigation3BasicApp() {
    Text("Hello Compose")
}
```

그래서 핵심은 이 문장이다.

`setContent { ... }`는 `setContent` 함수에 이름 없는 Composable 함수를 넘기는 코드다.

## 5. Compose에서 자주 보이는 이유

Compose에서는 람다가 자주 나온다. 화면을 선언하는 방식 자체가 "이 안에 무엇을 그릴지"를 코드 블록으로 넘기는 경우가 많기 때문이다.

예를 들어 버튼 클릭도 람다로 넘긴다.

```kotlin
Button(
    onClick = {
        println("버튼 클릭")
    }
) {
    Text("확인")
}
```

`Button` 함수 원형을 단순화해서 보면 이런 모양이다. 실제 Material3 `Button`에는 `modifier`, `enabled`, `shape`, `colors` 같은 옵션이 더 있지만, 람다를 이해할 때 먼저 볼 부분은 `onClick`과 `content`다.

```kotlin
@Composable
fun Button(
    onClick: () -> Unit,
    // modifier, enabled, colors 같은 다른 인자들...
    content: @Composable RowScope.() -> Unit,
)
```

여기서 `onClick`도 람다고, `content`도 람다다.

- `onClick: () -> Unit` : 버튼을 눌렀을 때 실행할 코드
- `content: @Composable RowScope.() -> Unit` : 버튼 안에 그릴 Compose UI

그래서 위 코드를 괄호 안으로 모두 풀어 쓰면 이렇게 볼 수 있다.

```kotlin
Button(
    onClick = {
        println("버튼 클릭")
    },
    content = {
        Text("확인")
    }
)
```

머릿속으로는 `Button(onClick = { ... }, content = { Text("확인") })`처럼 읽으면 된다. 다만 `Button(onClick = {}, { Text("확인") })`처럼 이름 붙인 인자 뒤에 위치 인자를 섞어 쓰기보다는, 풀어 쓸 때는 `content =`까지 적는 편이 훨씬 명확하다.

여기에는 람다가 두 번 나온다.

첫 번째 람다는 클릭했을 때 실행할 코드다.

```kotlin
onClick = {
    println("버튼 클릭")
}
```

두 번째 람다는 버튼 안에 그릴 UI다.

```kotlin
{
    Text("확인")
}
```

마지막 람다는 괄호 밖으로 빠질 수 있기 때문에 Compose 코드는 이런 모양이 된다.

```kotlin
Button(onClick = { println("버튼 클릭") }) {
    Text("확인")
}
```

처음에는 중괄호가 여기저기 있어서 복잡해 보이지만, 대부분은 "함수에 람다를 넘기고 있다"로 읽으면 된다.

## 설명하면서 정리한 방식

주니어에게 설명하면서 처음부터 Compose 개념으로 들어가면 더 헷갈릴 수 있겠다고 느꼈다. `setContent { ... }`를 Compose만의 특별한 문법처럼 보기보다, Kotlin 람다 문법 위에 Compose가 얹혀 있다고 보는 편이 훨씬 이해하기 쉬웠다.

내가 이해한 순서는 이랬다.

1. `{ ... }`는 이름 없는 함수, 즉 람다다.
2. Kotlin에서는 람다를 변수에 담거나 함수 인자로 넘길 수 있다.
3. 함수의 마지막 인자가 람다면 괄호 밖으로 뺄 수 있다.
4. `setContent { ... }`는 그 문법을 Compose에서 사용하는 대표적인 예다.

이렇게 보고 나면 `setContent`뿐 아니라 `Button`, `Column`, `LazyColumn` 같은 Compose 코드도 조금 덜 낯설어진다. 중괄호가 갑자기 튀어나온 것이 아니라, UI를 그리는 람다를 넘기고 있는 것이다.

## 정리

`setContent { Navigation3BasicApp() }`에서 중요한 Kotlin 문법은 두 가지였다.

- 람다 함수: `{ ... }`처럼 이름 없는 함수를 값처럼 다루는 문법
- trailing lambda: 마지막 인자가 람다이면 괄호 밖으로 빼는 문법

그래서 아래 코드는:

```kotlin
setContent {
    Navigation3BasicApp()
}
```

이렇게 읽으면 된다.

```kotlin
setContent(
    content = {
        Navigation3BasicApp()
    }
)
```

Compose를 처음 볼 때는 새로운 함수 이름들이 먼저 눈에 들어온다. 하지만 그 아래에는 Kotlin 문법이 있다. 주니어에게 `setContent`를 설명하다가 람다를 먼저 이야기하게 된 것도 그래서 꽤 자연스러운 순서였던 것 같다.

## 함께 읽기

- [[navigation3-basic-sample-notes|Navigation3 샘플 앱으로 이해한 backStack 화면 이동]]
- [[android-ui-state-layer-compose|안정적인 Compose 화면을 위한 UI State 설계]]
- [[learn-compose-by-building-small-screens|Compose를 익힐 때 작은 화면부터 만들어야 하는 이유]]
