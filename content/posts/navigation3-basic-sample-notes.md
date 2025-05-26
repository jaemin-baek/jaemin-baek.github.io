---
title: "Navigation3 샘플 앱으로 이해한 backStack 화면 이동"
date: "2025-05-26"
category: "Android"
tags: ["navigation3", "jetpack-compose", "android", "navigation"]
description: "2025년 5월 20일 Android Developers Blog의 Navigation3 발표 글을 읽고, 작은 Compose 샘플 앱을 만들며 남긴 사용기입니다."
---

![Navigation3 샘플 앱 사용기](/images/navigation3-basic-sample-cover.png)

2025년 5월 20일 Android Developers Blog에 올라온 Navigation3 발표 글을 읽었다. 처음에는 "Compose용 Navigation이 하나 더 나온 건가?" 정도로만 생각했다. 그런데 작은 샘플을 만들어보니 핵심은 이름보다 **backStack을 누가 들고 있느냐**에 가까웠다.

이 글은 원문 번역이 아니다. 공식 글을 읽고 바로 작은 앱 하나를 만들어보면서, Android 초보 입장에서 `NavKey`, `backStack`, `NavDisplay`가 각각 어떤 역할을 하는지 정리해둔 메모에 가깝다.

샘플 코드는 GitHub에 올려두었다. 전체 코드는 [jaemin-baek/navigation3-basic-sample](https://github.com/jaemin-baek/navigation3-basic-sample)에서 볼 수 있다.

## 참고한 글

- [Announcing Jetpack Navigation 3](https://android-developers.googleblog.com/2025/05/announcing-jetpack-navigation-3-for-compose.html) (2025-05-20)
- [jaemin-baek/navigation3-basic-sample](https://github.com/jaemin-baek/navigation3-basic-sample)

## 공식 글에서 먼저 잡은 포인트

기존 Navigation에서는 `NavController`에게 화면 이동을 많이 맡긴다. 보통 route 문자열을 넘기거나 `navigate()`를 호출하는 식으로 코드를 작성했다. Navigation3는 이 이동 기록을 Compose에서 다루는 state처럼 앱 코드에서 직접 다루게 한다. 내가 이해한 변화는 이랬다.

- back stack을 개발자가 직접 관리한다.
- 현재 화면 이동 기록을 앱 코드에서 확인하고 수정할 수 있다.
- `NavDisplay`, `entryProvider`, Scene 같은 부품을 조합해서 화면 구조를 만든다.

그래서 이번 샘플은 기능을 욕심내지 않았다. 화면은 `Home`, `Detail`, `Profile` 세 개만 두고, 버튼을 누를 때 backStack이 어떻게 바뀌는지만 보이게 만들었다.

![Navigation3 샘플 앱 화면 흐름](/images/navigation3-sample-screens.png)

## 1. 화면을 NavKey로 정의하기

Navigation3에서 가장 먼저 보인 차이는 화면을 문자열 route가 아니라 타입으로 표현한다는 점이었다. 샘플에서는 `AppDestination`이라는 sealed interface를 만들고, 각 화면을 `NavKey`로 정의했다.

```kotlin
@Serializable
sealed interface AppDestination : NavKey

@Serializable
data object Home : AppDestination

@Serializable
data class Detail(val itemId: Int) : AppDestination

@Serializable
data object Profile : AppDestination
```

여기서 `Detail`은 `itemId`를 가진 `data class`다. 같은 Detail 화면이라도 `Detail(1)`, `Detail(2)`처럼 다른 값으로 backStack에 여러 번 들어갈 수 있다. 처음 보는 입장에서는 route 문자열보다 이쪽이 덜 헷갈렸다. 화면 이동에 필요한 값이 어디서 생기고 어디로 넘어가는지 타입에 드러나기 때문이다.

## 2. backStack을 상태로 보기

샘플은 `rememberNavBackStack(Home)`으로 시작한다.

```kotlin
val backStack: NavBackStack<NavKey> = rememberNavBackStack(Home)
```

처음 상태는 `[Home]`이다. 사용자가 `Detail(1) push` 버튼을 누르면 리스트에 `Detail(1)`이 추가된다. 화면에 보이는 backStack 표시도 `[Home, Detail(1)]`로 바뀐다.

```kotlin
backStack.add(Detail(itemId = 1))
```

기존 Navigation과 가장 다르게 느껴진 부분이 여기였다. "화면을 이동해줘"라는 명령을 별도 객체에 맡기기보다, 내가 가진 stack을 직접 바꾼다. Compose가 state를 보고 UI를 다시 그리듯이, `NavDisplay`도 backStack을 보고 지금 보여줄 화면을 고른다.

![Navigation3 backStack 흐름](/images/navigation3-backstack-flow.svg)

## 3. NavDisplay에 화면 연결하기

backStack이 "어떤 화면 key들이 쌓여 있는지"를 담고 있다면, `NavDisplay`는 그 key에 맞는 Composable을 보여주는 역할을 한다.

```kotlin
NavDisplay(
    backStack = backStack,
    onBack = {
        if (backStack.size > 1) {
            backStack.removeAt(backStack.lastIndex)
        }
    },
    entryProvider = entryProvider<NavKey> {
        entry<Home> {
            HomeScreen(
                stackText = backStack.readableText(),
                onOpenDetail = { backStack.add(Detail(itemId = 1)) },
                onOpenProfile = { backStack.add(Profile) },
            )
        }

        entry<Detail> { key ->
            DetailScreen(
                itemId = key.itemId,
                stackText = backStack.readableText(),
                onOpenNextDetail = { backStack.add(Detail(key.itemId + 1)) },
                onBack = { backStack.pop() },
                onResetHome = { backStack.resetToHome() },
            )
        }

        entry<Profile> {
            ProfileScreen(
                stackText = backStack.readableText(),
                onBack = { backStack.pop() },
                onResetHome = { backStack.resetToHome() },
            )
        }
    },
)
```

처음에는 `entryProvider`라는 이름이 낯설었지만 역할은 단순했다. `Home` key가 오면 `HomeScreen`, `Detail` key가 오면 `DetailScreen`, `Profile` key가 오면 `ProfileScreen`을 보여준다. key와 화면의 매핑표라고 생각하면 이해하기 쉬웠다.

## 4. 화면 이동은 backStack 을 통해서

샘플에서는 화면 이동 코드가 거의 몇 줄로 설명된다.

```kotlin
backStack.add(Detail(1))              // push
backStack.add(Profile)                // push
backStack.removeAt(backStack.lastIndex) // pop

backStack.clear()
backStack.add(Home)                   // reset
```

이 코드는 꽤 직접적이다. 좋게 보면 그만큼 숨겨진 부분이 적다. 지금 앱이 어느 화면에 있고, 뒤로가기를 누르면 어디로 가고, reset을 하면 stack이 어떻게 바뀌는지 코드에서 바로 보인다.

물론 실제 앱에서 이 코드가 화면마다 퍼지면 금방 복잡해질 것이다. 이번 샘플은 학습용이라 `backStack.add()`를 바로 호출했지만, 규모가 있는 앱에서는 `Navigator` 같은 작은 래퍼를 두거나 feature 단위로 entry를 나누는 편이 나을 것 같다.

## 직접 써보고 느낀 점

Navigation3는 "기존 Navigation보다 무조건 쉽다"기보다는 화면 이동 책임을 앱 쪽으로 더 가져오는 도구에 가깝게 느껴졌다. 예전 방식에서는 라이브러리가 stack을 알아서 관리해주는 느낌이 강했다. Navigation3는 그 stack을 앱 코드에서 만질 수 있는 상태로 꺼내 둔다.

Compose를 state 중심으로 배웠다면 이 방식이 꽤 자연스럽다. 반대로 Android를 처음 배우는 입장에서는 "뒤로가기까지 내가 리스트로 관리해야 하나?"라는 생각이 들 수 있다. 그래서 처음에는 큰 앱보다 이번처럼 세 화면짜리 샘플에서 `add`, `remove`, `clear`만 눌러보는 편이 훨씬 낫다.

## 아직 더 봐야 할 것

이번 샘플은 Navigation3의 가장 기본적인 부분만 만졌다. 다음에 더 봐야 할 부분은 남아 있다.

- 화면별 상태 저장과 복원
- deep link 처리
- bottom tab처럼 여러 backStack이 필요한 구조
- 큰 화면에서 여러 destination을 함께 보여주는 Scene API
- feature 모듈이 많아졌을 때 entryProvider를 나누는 방법

특히 공식 글에서 언급한 adaptive layout과 state scoping은 작은 샘플만으로는 감이 오지 않았다. 이 부분은 실제 화면 요구사항이 생겼을 때 다시 봐야 할 주제다.

## 정리

Navigation3를 처음 볼 때는 `NavDisplay`, `entryProvider`, `NavKey` 같은 새 이름들이 먼저 보인다. 하지만 샘플을 만들고 나니 핵심은 더 단순했다.

1. 화면을 타입 key로 정의한다.
2. 현재 이동 상태를 backStack 리스트로 가진다.
3. NavDisplay가 backStack을 보고 알맞은 Composable을 보여준다.

이 정도만 잡고 나면 Navigation3는 막연한 새 라이브러리라기보다 Compose의 state 방식을 화면 이동에도 적용한 도구로 보인다. 다음에는 bottom tab이나 deep link처럼 실제 앱에서 바로 마주칠 문제로 조금 더 넓혀보고 싶다.

## 함께 읽기

- [[nibel-compose-navigation-boundary|Compose 전환기의 Navigation 경계 정리하기]]
- [[android-ui-state-layer-compose|안정적인 Compose 화면을 위한 UI State 설계]]
- [[learn-compose-by-building-small-screens|Compose를 익힐 때 작은 화면부터 만들어야 하는 이유]]
