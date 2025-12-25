---
title: "Navigation3 공부 가이드"
date: "2025-12-25"
category: "Android"
tags: ["navigation3", "jetpack-compose", "android", "navigation", "study-guide"]
description: "사내에 Navigation3를 전파하기 전에 어떤 자료를 어떤 순서로 보면 좋을지 정리한 공부 가이드입니다."
---

![Navigation3 공부 가이드](/images/navigation3-study-guide-cover.png)

사내에서 Navigation3를 같이 볼 일이 생겼다. 처음에는 공식 문서 링크 몇 개만 공유하면 되겠다고 생각했다. 그런데 자료를 다시 훑어보니, 그냥 링크를 던지는 방식으로는 오히려 더 헷갈릴 수 있겠다는 생각이 들었다.

Navigation3는 이름만 보면 기존 Navigation의 다음 버전처럼 보인다. 하지만 실제로 읽어보면 핵심은 "새로운 `NavController` 사용법"이 아니다. 화면 이동 상태를 앱 코드가 직접 들고, 그 상태를 `NavDisplay`가 바라보는 구조에 가깝다.

그래서 처음부터 모든 문서를 순서대로 읽기보다, 먼저 큰 방향을 잡고 작은 샘플을 만져본 뒤, 그 다음에 상태 저장이나 여러 back stack 같은 실전 주제로 넘어가는 편이 낫다.

이 글은 Navigation3 API를 자세히 설명하는 글은 아니다. 사내에 Navigation3를 전파하기 전에, 어떤 자료를 어떤 순서로 보면 덜 막히는지 정리해둔 공부 가이드에 가깝다.

## 먼저 읽을 공식 글

Navigation3를 처음 볼 때는 문서보다 블로그 글을 먼저 읽는 편이 좋았다. 문서는 API 단위로 잘게 나뉘어 있지만, 블로그 글은 왜 이런 방향으로 바뀌었는지를 먼저 보여준다.

먼저 볼 글은 두 개다.

- [Jetpack Navigation 3 is stable](https://android-developers.googleblog.com/2025/11/jetpack-navigation-3-is-stable.html)
- [Learn about our newest Jetpack Navigation library with the Nav3 Spotlight Week](https://android-developers.googleblog.com/2025/12/learn-about-our-newest-jetpack.html)

첫 번째 글에서는 Navigation3가 stable이 되었다는 이야기를 한다. 여기서 가장 중요하게 봐야 할 문장은 "production apps today" 같은 안정화 선언도 있지만, 개인적으로는 그보다 **full control over your back stack** 쪽이었다.

Navigation2에서는 `NavController`가 내부 상태를 많이 들고 있었다. Navigation3에서는 앱이 back stack을 Compose state처럼 직접 들고, `NavDisplay`가 그 상태를 보고 화면을 표시한다. 이 관점이 잡히면 뒤에 나오는 `NavKey`, `entryProvider`, `rememberNavBackStack`이 조금 덜 낯설다.

두 번째 글은 Nav3 Spotlight Week 안내 글이다. 이 글은 공부 순서를 잡을 때 도움이 된다. API Overview, Animations, Deep links, Modularization, Recipes가 어떤 주제로 묶여 있는지 한 번에 보이기 때문이다.

처음부터 레시피 저장소를 뒤지는 것보다, 이 글에서 "아, Google이 이 정도 주제를 Nav3 학습 묶음으로 보고 있구나"를 먼저 보는 편이 좋다.

## 1단계: 이름 세 개만 잡기

처음에는 API 이름을 많이 외우려고 하지 않는 편이 좋다. 나는 아래 세 개만 먼저 잡으면 된다고 생각한다.

- `NavKey`
- `backStack`
- `NavDisplay`

`NavKey`는 화면을 표현하는 key다. 기존 Navigation에서 문자열 route를 쓰던 습관이 있다면, Navigation3에서는 화면을 타입으로 표현한다고 생각하면 된다.

```kotlin
@Serializable
data object Home : NavKey

@Serializable
data class Detail(val id: String) : NavKey
```

`backStack`은 지금까지 사용자가 어떤 화면을 거쳐 왔는지 담는 리스트에 가깝다.

```kotlin
val backStack = rememberNavBackStack(Home)

backStack.add(Detail(id = "1"))
```

`NavDisplay`는 그 back stack을 보고 실제 Composable 화면을 보여준다.

```kotlin
NavDisplay(
    backStack = backStack,
    entryProvider = entryProvider {
        entry<Home> {
            HomeScreen()
        }

        entry<Detail> { key ->
            DetailScreen(id = key.id)
        }
    },
)
```

이 정도만 보면 Navigation3의 첫인상이 조금 단순해진다.

1. 화면을 `NavKey`로 정의한다.
2. 이동하면 `backStack`이 바뀐다.
3. `NavDisplay`가 현재 stack에 맞는 화면을 그린다.

공식 문서에서는 [Navigation 3 overview](https://developer.android.com/guide/navigation/navigation-3)와 [Get started](https://developer.android.com/guide/navigation/navigation-3/get-started)를 이 단계에서 보면 된다.

## 2단계: 작은 샘플을 직접 눌러보기

Navigation3는 글로만 읽으면 조금 추상적으로 느껴진다. 특히 "back stack을 직접 관리한다"는 말은 직접 `add`, `remove`, `clear`를 해보기 전까지 잘 와닿지 않는다.

그래서 나는 처음 보는 사람에게 바로 실무 앱 구조를 보여주기보다, 화면 세 개짜리 샘플을 먼저 보여주는 편이 낫다고 생각한다.

예를 들어 이런 흐름이다.

```text
Home -> Detail(1) -> Detail(2) -> Profile
```

버튼을 누를 때마다 `backStack`에 어떤 key가 추가되는지 화면에 같이 보여주면 이해가 빨라진다.

```kotlin
onOpenDetail = {
    backStack.add(Detail(id = "1"))
}

onBack = {
    if (backStack.size > 1) {
        backStack.removeAt(backStack.lastIndex)
    }
}
```

이 단계에서는 구조를 예쁘게 만들려고 너무 빨리 추상화하지 않는 게 좋았다. `Navigator` 같은 래퍼도 실제 앱에서는 필요하지만, 처음 배우는 단계에서는 오히려 back stack이 어떻게 움직이는지 가릴 수 있다.

이전에 만든 작은 샘플 메모도 이 단계에서 같이 보면 좋다.

- [[navigation3-basic-sample-notes|Navigation3 샘플 앱으로 이해한 backStack 화면 이동]]

## 3단계: 상태 저장을 따로 보기

작은 샘플을 만든 뒤에는 바로 "그럼 화면 회전이나 프로세스 재생성 때는 어떻게 되지?"라는 질문이 나온다.

이때 보는 문서가 [Save and manage navigation state](https://developer.android.com/guide/navigation/navigation-3/save-state)다.

Navigation3에서 `NavKey`에 `@Serializable`을 붙이는 이유도 이 지점에서 더 잘 이해된다. 단순히 타입 예쁘게 만들려고 붙이는 게 아니라, back stack을 저장하고 복원하려면 key를 직렬화할 수 있어야 한다.

```kotlin
@Serializable
data class Detail(val id: String) : NavKey
```

처음 공부할 때는 상태 저장을 너무 뒤로 미루지 않는 편이 좋다. Navigation3는 앱이 navigation state를 직접 들기 때문에, 상태 저장도 "라이브러리가 알아서 하겠지"라고 넘기면 나중에 다시 돌아와야 한다.

다만 처음부터 모든 저장 전략을 외울 필요는 없다. 이 단계에서는 아래 정도만 확인해도 충분하다.

- `NavKey`가 저장 가능한 형태인지
- `rememberNavBackStack`을 언제 쓰는지
- 화면별 UI state와 navigation state를 어디까지 분리할지

## 4단계: 실제 앱에서는 Navigator가 필요하다

작은 샘플에서는 `backStack.add(...)`를 화면에서 바로 호출해도 된다. 오히려 그 편이 배우기 쉽다.

하지만 실제 앱에서 이 코드가 화면마다 퍼지면 금방 관리하기 어려워진다.

```kotlin
backStack.add(SendMoney)
backStack.removeAt(backStack.lastIndex)
backStack.clear()
backStack.add(Home)
```

처음에는 몇 줄 안 되지만, 탭이 생기고, 온보딩이 생기고, 딥링크가 생기면 "어느 화면에서 어떤 stack을 건드려야 하는지"가 화면 코드 안에 흩어진다.

그래서 규모가 있는 앱에서는 보통 `Navigator` 같은 래퍼를 둔다.

```kotlin
class Navigator(
    private val backStack: NavBackStack<NavKey>,
) {
    fun navigate(destination: NavKey) {
        backStack.add(destination)
    }

    fun goBack() {
        if (backStack.size > 1) {
            backStack.removeAt(backStack.lastIndex)
        }
    }
}
```

이 래퍼의 목적은 거창한 프레임워크를 만드는 게 아니다. feature 화면이 "stack을 어떻게 수정할지"까지 알지 않게 만드는 것이다.

화면에서는 이렇게 말하는 편이 더 낫다.

```kotlin
navigator.navigate(Detail(id = "1"))
```

이렇게 해두면 나중에 같은 `navigate` 호출 안에서 중복 destination 제거, top-level 이동, reset, analytics, deep link 처리 같은 정책을 한곳에 모을 수 있다.

## 5단계: 모듈화를 보고 실무 구조로 넘어가기

사내 전파에서 중요한 지점은 여기라고 생각한다. Navigation3를 개인 샘플로만 쓰면 `MainActivity` 안에 `entryProvider`를 다 적어도 된다. 하지만 실무 앱은 feature 모듈이 나뉘어 있고, 화면도 많다.

이때 볼 문서는 [Modularize navigation code](https://developer.android.com/guide/navigation/navigation-3/modularize)다.

핵심은 navigation key와 화면 구현을 분리하는 것이다.

예를 들어 공통 navigation 모듈에는 key만 둔다.

```kotlin
@Serializable
sealed interface HomeDestination : NavKey {
    @Serializable
    data object Main : HomeDestination

    @Serializable
    data object Settings : HomeDestination
}
```

그리고 feature 모듈에는 entry 등록을 둔다.

```kotlin
fun EntryProviderScope<NavKey>.homeNavGraph(
    navigator: Navigator,
) {
    entry<HomeDestination.Main> {
        HomeScreen(
            onOpenSettings = {
                navigator.navigate(HomeDestination.Settings)
            },
        )
    }

    entry<HomeDestination.Settings> {
        SettingsScreen(
            onBack = navigator::goBack,
        )
    }
}
```

마지막으로 app 모듈에서 feature nav graph를 조립한다.

```kotlin
NavDisplay(
    backStack = backStack,
    entryProvider = entryProvider {
        homeNavGraph(navigator)
        profileNavGraph(navigator)
        settingsNavGraph(navigator)
    },
)
```

이 구조는 처음에는 조금 번거롭다. 하지만 feature가 늘어날수록 장점이 생긴다. app 모듈은 전체 조립만 담당하고, 각 feature는 자기 화면 entry를 자기 쪽에 둘 수 있다.

## 6단계: Recipes는 필요할 때 꺼내 보기

Navigation3 공식 문서 왼쪽 목차를 보면 모든 레시피가 보이지는 않는다. 그래서 처음에는 "이게 공식 자료가 맞나?"라는 생각이 들 수 있다.

내가 이해한 바로는, 레시피는 핵심 가이드라기보다 실전 패턴 모음에 가깝다. 공식 블로그에서도 recipes를 common but nuanced use cases를 위한 자료로 소개한다. 즉, 모든 앱이 그대로 따라야 하는 표준 구조라기보다는, 상황에 맞게 가져다 고치는 예제에 가깝다.

그래도 사내 앱 구조를 잡을 때는 레시피가 꽤 중요하다.

- [android/nav3-recipes](https://github.com/android/nav3-recipes)
- [Multiple back stacks recipe](https://developer.android.com/guide/navigation/navigation-3/recipes/multiple-backstacks)

특히 bottom navigation이나 top-level route가 있는 앱이라면 multiple back stacks 예제를 꼭 봐야 한다. 각 탭마다 back stack을 따로 유지할지, 뒤로가기를 눌렀을 때 시작 탭을 거쳐 앱을 종료할지 같은 정책은 앱마다 다르다.

이 지점부터는 "Navigation3 사용법"보다 "우리 앱의 화면 이동 정책"에 가까워진다.

예를 들어 이런 질문을 해야 한다.

- 홈 탭에서 상세 화면에 들어갔다가 다른 탭으로 이동하면, 홈 탭의 상세 화면을 유지할 것인가?
- 알림 딥링크로 들어온 화면에서 뒤로가기를 누르면 홈으로 갈 것인가, 앱을 종료할 것인가?
- 온보딩 stack과 로그인 이후 stack은 같은 navigation state에 둘 것인가?
- top-level destination을 다시 누르면 root로 reset할 것인가, 이전 상태를 유지할 것인가?

Navigation3는 이런 결정을 대신 내려주는 도구라기보다, 이런 결정을 코드로 표현하기 쉽게 해주는 도구에 가깝다.

## 사내 공유 순서

팀에 처음 공유한다면 나는 아래 순서로 진행할 것 같다.

## 1. 20분: 왜 Navigation3인가

먼저 stable 발표 글을 같이 본다. 여기서는 API를 깊게 설명하지 않는다.

대신 아래 질문만 잡는다.

- 왜 `NavController` 중심에서 back stack state 중심으로 넘어왔나?
- Compose state와 navigation state는 어떤 점에서 닮았나?
- "직접 관리한다"는 말이 자유도인지, 책임인지 같이 이야기한다.

## 2. 30분: 작은 샘플에서 add/remove 보기

세 화면짜리 샘플을 실행한다.

```text
Home -> Detail -> Profile
```

그리고 버튼을 누를 때마다 `backStack`이 어떻게 바뀌는지 본다. 이때는 `Navigator`를 아직 숨기고, `backStack.add()`를 직접 보여주는 편이 좋다.

## 3. 30분: 실무 앱 구조로 바꾸기

그 다음에 같은 샘플을 살짝 바꾼다.

- `NavKey`를 별도 파일로 분리한다.
- `entryProvider`를 feature별 확장 함수로 나눈다.
- 화면에서는 `backStack` 대신 `Navigator`를 호출한다.

이 단계에서야 "왜 래퍼가 필요한지"가 자연스럽게 보인다.

## 4. 30분: multiple back stacks 토론하기

마지막으로 multiple back stacks recipe를 본다. 코드를 다 외우려고 하지 말고, 정책을 먼저 본다.

이 레시피에서 중요한 건 "정답 코드"라기보다 이런 구조다.

```text
top-level route A -> A 전용 back stack
top-level route B -> B 전용 back stack
top-level route C -> C 전용 back stack
```

실제 앱에서는 이걸 그대로 쓸 수도 있고, `NavigationState`나 `Navigator`를 앱에 맞게 바꿀 수도 있다. 중요한 건 팀이 back 동작과 탭 상태 유지 정책을 같은 언어로 이야기하게 되는 것이다.

## 처음 공부할 때 주의할 점

Navigation3를 처음 볼 때 가장 헷갈리는 부분은 "내가 직접 back stack을 만진다"는 점이다.

이 말은 화면마다 마음대로 리스트를 수정하라는 뜻은 아니다. 작은 샘플에서는 직접 만져보되, 실제 앱에서는 이동 정책을 한곳에 모아야 한다.

또 하나는 recipes를 공식 가이드와 같은 무게로 읽지 않는 것이다. 레시피는 좋은 출발점이지만, 앱의 요구사항에 맞게 바꾸라고 제공되는 자료에 가깝다. 특히 multiple back stacks는 뒤로가기 정책이 앱마다 달라질 수밖에 없다.

마지막으로 Navigation3를 도입한다고 해서 기존 Navigation 고민이 사라지는 것은 아니다. 딥링크, 인증 전후 stack 분리, 탭별 상태 유지, 화면 결과 반환, ViewModel scope 같은 문제는 여전히 남아 있다. 다만 Navigation3는 그 문제들을 더 명시적인 state와 작은 building block으로 풀 수 있게 해준다.

## 정리

Navigation3를 공부할 때 처음부터 모든 API를 펼쳐놓으면 꽤 복잡해 보인다. 하지만 순서를 나누면 조금 편해진다.

1. stable 발표 글로 방향을 잡는다.
2. `NavKey`, `backStack`, `NavDisplay` 세 개만 먼저 본다.
3. 작은 샘플에서 `add`, `remove`, `clear`를 직접 눌러본다.
4. 상태 저장과 `@Serializable`의 의미를 확인한다.
5. 모듈화 문서로 실무 앱 구조를 본다.
6. multiple back stacks 같은 recipes는 필요한 문제를 만났을 때 꺼내 본다.

Navigation3는 "쉬운 Navigation"이라기보다 "내비게이션 상태를 앱이 더 명확하게 소유하는 방식"에 가깝다. 그래서 처음에는 조금 더 직접적이고 낯설다. 대신 팀이 화면 이동 정책을 직접 설계해야 하는 앱이라면, 그 낯섦이 나중에는 장점이 될 수 있다.

## 함께 읽기

- [[navigation3-basic-sample-notes|Navigation3 샘플 앱으로 이해한 backStack 화면 이동]]
- [[nibel-compose-navigation-boundary|Compose 전환기의 Navigation 경계 정리하기]]
- [[android-ui-state-layer-compose|안정적인 Compose 화면을 위한 UI State 설계]]
