---
title: "Navigation3 샘플 앱을 만들며 본 backStack 중심 화면 이동"
date: "2025-05-26"
category: "Android"
tags: ["navigation3", "jetpack-compose", "android", "navigation"]
description: "2025년 5월 20일 Android Developers Blog의 Navigation3 발표 글을 읽고, 작은 Compose 샘플 앱을 만들며 남긴 사용기입니다."
---

![Navigation3 샘플 앱 사용기](/images/navigation3-basic-sample-cover.png)

2025년 5월 20일 Android Developers Blog에 올라온 Navigation3 발표 글을 읽었다. 처음에는 "Compose용 Navigation이 하나 더 나온 건가?" 정도로 봤는데, 샘플을 직접 만들어보니 포인트는 라이브러리 이름보다 **backStack을 누가 소유하느냐**에 있었다.

이 글은 원문을 번역한 글은 아니다. 공식 글에서 말한 방향을 아주 작은 앱으로 확인해 보고, Android 초보 입장에서 `NavKey`, `backStack`, `NavDisplay`가 각각 어떤 역할을 하는지 정리한 사용기다.

샘플 코드는 GitHub에 올려두었다. 전체 코드는 [jaemin-baek/navigation3-basic-sample](https://github.com/jaemin-baek/navigation3-basic-sample)에서 볼 수 있다.

## 참고한 글

- [Announcing Jetpack Navigation 3](https://android-developers.googleblog.com/2025/05/announcing-jetpack-navigation-3-for-compose.html) (2025-05-20)
- [jaemin-baek/navigation3-basic-sample](https://github.com/jaemin-baek/navigation3-basic-sample)

## 공식 글에서 먼저 잡은 포인트

기존 Navigation은 `NavController`가 앱의 이동 상태를 많이 들고 있었다. 화면 이동은 보통 route 문자열을 넘기거나 `navigate()`를 호출하는 방식으로 읽혔다. 반면 Navigation3는 Compose 상태 모델에 더 가깝게 설계됐다. 공식 글에서 강조한 방향을 내가 이해한 말로 풀면 이렇게 정리할 수 있었다.

- 개발자가 back stack을 소유한다.
- 화면 이동 기록을 라이브러리 내부에만 숨기지 않고, 앱 코드에서 직접 보고 바꿀 수 있게 한다.
- 모든 기능이 한 덩어리로 묶인 API보다 `NavDisplay`, `entryProvider`, Scene 같은 작은 도구를 필요에 맞게 조합하게 한다.

그래서 이번 샘플은 기능을 욕심내지 않았다. 화면은 `Home`, `Detail`, `Profile` 세 개만 두고, 버튼을 누를 때 backStack이 어떻게 바뀌는지만 보이게 만들었다.

![Navigation3 샘플 앱 화면 흐름](/images/navigation3-sample-screens.png)

## 1. 화면을 NavKey로 정의하기

Navigation3에서 먼저 눈에 들어온 부분은 화면을 문자열 route가 아니라 타입으로 표현한다는 점이었다. 샘플에서는 `AppDestination`이라는 sealed interface를 만들고, 각 화면을 `NavKey`로 정의했다.

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

여기서 `Detail`은 `itemId`를 갖는 `data class`다. 같은 Detail 화면이라도 `Detail(1)`, `Detail(2)`처럼 서로 다른 값으로 backStack에 여러 번 들어갈 수 있다. 초보 입장에서는 이 부분이 route 문자열보다 읽기 편했다. 화면 이동 인자가 어디서 생기고 어디로 전달되는지 타입에 드러나기 때문이다.

## 2. backStack을 상태로 보기

샘플의 시작점은 `rememberNavBackStack(Home)`이다.

```kotlin
val backStack: NavBackStack<NavKey> = rememberNavBackStack(Home)
```

처음 상태는 `[Home]`이다. 사용자가 `Detail(1) push` 버튼을 누르면 리스트에 `Detail(1)`이 추가되고, 화면에는 `[Home, Detail(1)]` 상태가 반영된다.

```kotlin
backStack.add(Detail(itemId = 1))
```

이 느낌이 기존 Navigation과 가장 다르게 느껴졌다. "화면을 이동한다"는 명령을 어딘가에 보내는 대신, 화면 이동의 결과인 stack 자체를 내가 바꾼다. Compose가 상태를 보고 UI를 다시 그리는 것처럼, `NavDisplay`도 backStack을 보고 화면을 다시 고른다.

![Navigation3 backStack 흐름](/images/navigation3-backstack-flow.svg)

## 3. NavDisplay에 화면 연결하기

backStack이 "어떤 화면들이 쌓여 있는지"를 담는다면, `NavDisplay`는 그 key를 실제 Composable 화면으로 바꿔주는 쪽에 가깝다.

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

처음에는 `entryProvider`라는 이름이 낯설었는데, 역할은 단순했다. `Home` key가 오면 `HomeScreen`, `Detail` key가 오면 `DetailScreen`, `Profile` key가 오면 `ProfileScreen`을 보여준다. key와 화면의 매핑표라고 생각하면 이해가 쉬웠다.

## 4. 이동은 stack 조작이다

샘플에서 화면 이동 코드는 네 가지 정도로 끝난다.

```kotlin
backStack.add(Detail(1))              // push
backStack.add(Profile)                // push
backStack.removeAt(backStack.lastIndex) // pop

backStack.clear()
backStack.add(Home)                   // reset
```

이 코드는 작게 보면 너무 직접적이다. 하지만 그 직접성이 Navigation3의 장점처럼 느껴졌다. 지금 앱이 어느 화면에 있고, 뒤로가기를 누르면 어디로 갈지, reset을 하면 stack이 어떻게 되는지 코드에서 바로 보인다.

물론 실제 앱에서는 이 코드를 화면마다 흩뿌리면 금방 복잡해질 것이다. 샘플에서는 학습을 위해 `backStack.add()`를 바로 호출했지만, 규모가 있는 앱에서는 `Navigator` 같은 작은 래퍼를 두거나 feature 단위로 entry를 나누는 편이 나을 것 같다.

## 써보고 남은 감각

Navigation3는 "기존 Navigation보다 무조건 쉽다"기보다는 책임의 위치가 바뀐 라이브러리로 느껴졌다. 예전에는 Navigation이 내부에서 stack을 관리해 주는 느낌이 강했다면, Navigation3는 stack을 앱 상태의 일부로 끌어올린다.

이 변화는 Compose를 이미 상태 중심으로 이해하고 있다면 자연스럽다. 반대로 처음 Android를 배우는 입장에서는 "뒤로가기까지 내가 리스트로 관리해야 하나?"라는 부담도 생길 수 있다. 그래서 처음에는 큰 앱보다 이번처럼 세 화면짜리 샘플로 `add`, `remove`, `clear`만 눌러보는 편이 훨씬 낫다.

## 아직 더 봐야 할 것

이번 샘플은 Navigation3의 가장 얇은 표면만 만졌다. 다음에 더 봐야 할 부분은 남아 있다.

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

이 정도만 잡고 나면 Navigation3는 막연한 새 라이브러리라기보다 Compose의 상태 모델을 화면 이동에도 적용한 도구로 보인다. 다음에는 bottom tab이나 deep link처럼 실제 앱에서 바로 마주칠 문제로 한 단계 더 넓혀보고 싶다.

## 함께 읽기

- [[nibel-compose-navigation-boundary|Compose 전환기의 Navigation 경계 정리하기]]
- [[android-ui-state-layer-compose|안정적인 Compose 화면을 위한 UI State 설계]]
- [[learn-compose-by-building-small-screens|Compose를 익힐 때 작은 화면부터 만들어야 하는 이유]]
