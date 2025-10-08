---
title: "MVI Counter 샘플로 상태 흐름 이해하기"
date: "2025-10-07"
category: "Android"
tags: ["mvi", "jetpack-compose", "android", "ui-state"]
description: "사내 MVI 스터디를 시작하기 전에 Counter 샘플로 State, Intent, reduce, remember, mutableStateOf, copy를 차근차근 풀어봅니다."
---

![MVI Counter 샘플로 상태 흐름 이해하기](/images/mvi-basic-counter-cover.png)

사내에서 MVI를 같이 볼 일이 생겼다. 처음에는 `State`, `Intent`, `Reducer`, `Effect` 같은 이름을 먼저 정리하면 되겠다고 생각했다. 그런데 막상 작은 샘플 코드를 놓고 보니, MVI보다 먼저 막히는 부분이 따로 있었다.

```kotlin
var state by remember { mutableStateOf(CounterState()) }
```

이 한 줄부터 낯설 수 있다. `remember`는 무엇이고, `mutableStateOf`는 왜 쓰고, `by`는 어디서 나온 문법인지 모르면 그 다음에 나오는 `copy`, `reduce`, `onIntent`도 자연스럽게 이어지지 않는다.

그래서 이 글은 MVI를 거창하게 설명하는 글은 아니다. 아주 작은 Counter 샘플을 보면서, Compose 상태 코드가 어떻게 움직이고 그 위에 MVI 이름을 어떻게 붙일 수 있는지 정리한 스터디 메모에 가깝다.

샘플 코드는 GitHub에 올려두었다.

- [jaemin-baek/mvi-basic-sample](https://github.com/jaemin-baek/mvi-basic-sample)

## 먼저 전체 흐름만 보기

이번 샘플은 숫자를 하나 보여준다. `+1`을 누르면 숫자가 올라가고, `-1`을 누르면 내려가고, `Reset`을 누르면 다시 0으로 돌아간다.

중요한 점은 버튼이 직접 `count++`를 하지 않는다는 것이다.

```text
UI -> Intent -> reduce -> State -> UI
```

조금 풀어 쓰면 이렇게 볼 수 있다.

1. 사용자가 버튼을 누른다.
2. UI는 `CounterIntent`를 보낸다.
3. `reduce` 함수가 현재 `CounterState`와 `CounterIntent`를 받는다.
4. `reduce` 함수가 새로운 `CounterState`를 만든다.
5. Compose가 새 `CounterState`를 보고 화면을 다시 그린다.

![MVI 버튼 클릭 흐름](/images/mvi-basic-button-flow.svg)

처음에는 이 흐름만 잡아도 충분하다. MVI에서 말하는 "단방향 흐름"은 결국 상태가 여기저기서 막 바뀌지 않고, 한 방향으로 읽히게 만들자는 이야기다.

## 샘플에서 먼저 볼 코드

샘플의 핵심 코드는 거의 [MainActivity.kt](https://github.com/jaemin-baek/mvi-basic-sample/blob/main/app/src/main/java/com/example/mvibasicsample/MainActivity.kt) 한 파일에 있다.

처음에는 아래 네 개만 보면 된다.

```kotlin
data class CounterState(...)

sealed interface CounterIntent

private fun reduce(...)

@Composable
private fun CounterScreen(...)
```

이 네 개가 이번 글의 전부라고 생각해도 된다.

## 1. State는 화면의 현재 값이다

먼저 `CounterState`다.

```kotlin
data class CounterState(
    val count: Int = 0,
    val lastIntent: String = "아직 버튼을 누르지 않았습니다.",
)
```

`State`는 화면이 지금 어떤 모습이어야 하는지 담는 값이다.

이 샘플에서는 화면에 보여줄 값이 두 개뿐이다.

- `count`: 현재 숫자
- `lastIntent`: 마지막으로 들어온 행동 이름

즉 화면에 `count = 0`이 보여야 하는지, `count = 1`이 보여야 하는지는 `CounterState`가 결정한다.

여기서 중요한 건 `CounterState`가 "서버에서 받은 데이터 모델"이 아니라는 점이다. 이 샘플에서는 서버가 없지만, 실무에서도 `UiState`나 `State`는 보통 **화면을 그리기 위한 현재 값**에 가깝다.

## 2. remember와 mutableStateOf는 상태를 기억하는 상자다

이제 처음에 막혔던 줄을 다시 보자.

```kotlin
var state by remember { mutableStateOf(CounterState()) }
```

이 코드는 한 번에 읽으려고 하면 어렵다. 나눠서 보면 조금 낫다.

![remember와 mutableStateOf](/images/mvi-basic-state-box.svg)

먼저 `CounterState()`는 처음 상태다.

```kotlin
CounterState()
```

기본값을 쓰기 때문에 처음에는 이런 상태가 된다.

```kotlin
CounterState(
    count = 0,
    lastIntent = "아직 버튼을 누르지 않았습니다.",
)
```

그 다음 `mutableStateOf`는 Compose가 지켜볼 수 있는 상태 상자를 만든다.

```kotlin
mutableStateOf(CounterState())
```

이 상자 안의 값이 바뀌면 Compose는 "아, 화면을 다시 그려야겠구나"라고 알 수 있다.

그런데 Compose 화면은 상태가 바뀌면 다시 실행될 수 있다. 이걸 recomposition이라고 부른다. 화면 함수가 다시 실행될 때마다 상태 상자를 새로 만들면 숫자가 계속 초기화될 것이다.

그래서 `remember`를 쓴다.

```kotlin
remember { mutableStateOf(CounterState()) }
```

`remember`는 아주 편하게 말하면 "이 값을 화면이 다시 그려져도 기억해줘"에 가깝다.

마지막으로 `by`는 Kotlin 문법이다.

```kotlin
var state by remember { mutableStateOf(CounterState()) }
```

`by`를 쓰지 않으면 대략 이런 식으로 읽을 수 있다.

```kotlin
val stateBox = remember { mutableStateOf(CounterState()) }

stateBox.value = CounterState(count = 1)
Text(stateBox.value.count.toString())
```

`by`를 쓰면 `.value`를 매번 쓰지 않아도 된다.

```kotlin
var state by remember { mutableStateOf(CounterState()) }

state = CounterState(count = 1)
Text(state.count.toString())
```

처음 볼 때는 `by`가 MVI 문법처럼 보일 수 있지만, 사실은 Kotlin과 Compose 상태를 편하게 쓰기 위한 문법이다.

## 3. Intent는 사용자의 행동을 이름 붙인 것이다

다음은 `CounterIntent`다.

```kotlin
sealed interface CounterIntent {
    data object IncreaseClicked : CounterIntent
    data object DecreaseClicked : CounterIntent
    data object ResetClicked : CounterIntent
}
```

여기서 `Intent`는 Android의 `Intent`와는 다른 뜻이다. 이 글에서는 "사용자가 어떤 의도를 가지고 한 행동" 정도로 보면 된다.

예를 들어 `+1` 버튼을 누르면 이런 일이 생긴다.

```kotlin
CounterIntent.IncreaseClicked
```

`-1` 버튼을 누르면 이런 일이 생긴다.

```kotlin
CounterIntent.DecreaseClicked
```

이렇게 행동에 이름을 붙여두면, 나중에 ViewModel이나 reducer 쪽에서 "어떤 일이 들어왔는지"를 한곳에서 처리할 수 있다.

## 4. UI는 값을 직접 바꾸지 않는다

`CounterScreen`에서 버튼 부분을 보면 숫자를 직접 바꾸지 않는다.

```kotlin
Button(onClick = { onIntent(CounterIntent.IncreaseClicked) }) {
    Text("+1")
}
```

여기에는 `state.count++` 같은 코드가 없다.

UI는 그냥 말한다.

```text
"+1 버튼이 눌렸어요"
```

그리고 그 말을 `CounterIntent.IncreaseClicked`라는 값으로 보낸다.

이게 익숙하지 않으면 돌아가는 길처럼 보인다. 하지만 화면이 커질수록 장점이 생긴다. 버튼마다 상태를 직접 바꾸면, 나중에 상태가 어디서 바뀌었는지 찾기 어려워진다. 반대로 모든 행동을 `Intent`로 보내면, "사용자 행동이 들어오는 입구"를 좁힐 수 있다.

## 5. send는 Intent를 reduce로 넘긴다

`MviBasicApp` 안에는 `send` 함수가 있다.

```kotlin
fun send(intent: CounterIntent) {
    state = reduce(state, intent)
}
```

이 함수도 처음에는 조금 낯설 수 있다. 하지만 역할은 단순하다.

```text
현재 state와 새 intent를 reduce에 넣고,
reduce가 돌려준 새 state로 교체한다.
```

즉 `+1` 버튼을 누르면 흐름은 이렇게 된다.

```kotlin
send(CounterIntent.IncreaseClicked)
```

그리고 `send` 안에서 이렇게 이어진다.

```kotlin
state = reduce(state, CounterIntent.IncreaseClicked)
```

여기서 `state = ...`가 실행되면 Compose가 상태 변경을 감지하고 화면을 다시 그린다.

## 6. reduce는 현재 State와 Intent로 새 State를 만든다

이제 `reduce`를 보자.

```kotlin
private fun reduce(
    state: CounterState,
    intent: CounterIntent,
): CounterState {
    return when (intent) {
        CounterIntent.IncreaseClicked -> {
            val nextCount = state.count + 1
            state.copy(
                count = nextCount,
                lastIntent = "IncreaseClicked",
            )
        }

        CounterIntent.DecreaseClicked -> {
            val nextCount = state.count - 1
            state.copy(
                count = nextCount,
                lastIntent = "DecreaseClicked",
            )
        }

        CounterIntent.ResetClicked -> {
            CounterState(lastIntent = "ResetClicked")
        }
    }
}
```

`reduce`는 현재 상태를 받는다.

```kotlin
state: CounterState
```

그리고 사용자의 행동도 받는다.

```kotlin
intent: CounterIntent
```

그 다음 새 상태를 돌려준다.

```kotlin
CounterState
```

즉 `reduce`는 이렇게 읽으면 된다.

```text
현재 상태 + 사용자의 행동 = 다음 상태
```

## 7. copy는 data class가 만들어주는 새 State 생성 함수다

여기서 또 하나 막히기 쉬운 코드가 `copy`다.

```kotlin
state.copy(
    count = nextCount,
    lastIntent = "IncreaseClicked",
)
```

`CounterState`는 `data class`다.

```kotlin
data class CounterState(...)
```

Kotlin의 `data class`는 `copy` 함수를 자동으로 만들어준다. `copy`는 기존 값을 바탕으로 일부 값만 바꾼 새 객체를 만든다.

![copy로 새 State 만들기](/images/mvi-basic-copy-state.svg)

예를 들어 이전 상태가 이렇다고 해보자.

```kotlin
CounterState(
    count = 0,
    lastIntent = "아직 버튼을 누르지 않았습니다.",
)
```

여기서 `copy`를 호출한다.

```kotlin
state.copy(
    count = 1,
    lastIntent = "IncreaseClicked",
)
```

그러면 새 상태는 이렇게 된다.

```kotlin
CounterState(
    count = 1,
    lastIntent = "IncreaseClicked",
)
```

기존 `state` 객체를 직접 고치는 느낌이라기보다, 다음 화면을 위한 새 `CounterState`를 만든다고 생각하면 된다.

MVI에서 이 방식이 중요한 이유는 상태 변경이 눈에 잘 보이기 때문이다.

```kotlin
state.copy(...)
```

이 코드가 있는 곳을 찾으면 "여기서 화면 상태가 바뀌는구나"를 알 수 있다.

## 버튼 하나를 처음부터 끝까지 따라가보기

이제 `+1` 버튼 하나만 처음부터 끝까지 따라가보자.

처음 상태는 이렇다.

```kotlin
CounterState(
    count = 0,
    lastIntent = "아직 버튼을 누르지 않았습니다.",
)
```

사용자가 `+1` 버튼을 누른다.

```kotlin
Button(onClick = { onIntent(CounterIntent.IncreaseClicked) }) {
    Text("+1")
}
```

`CounterIntent.IncreaseClicked`가 `send`로 전달된다.

```kotlin
fun send(intent: CounterIntent) {
    state = reduce(state, intent)
}
```

`reduce`가 현재 상태와 intent를 받는다.

```kotlin
reduce(
    state = CounterState(count = 0, ...),
    intent = CounterIntent.IncreaseClicked,
)
```

`reduce`는 새 상태를 만든다.

```kotlin
state.copy(
    count = 1,
    lastIntent = "IncreaseClicked",
)
```

그 새 상태가 다시 `state`에 들어간다.

```kotlin
state = CounterState(
    count = 1,
    lastIntent = "IncreaseClicked",
)
```

그리고 Compose는 새 상태를 보고 화면을 다시 그린다.

```kotlin
Text("count = ${state.count}")
Text("lastIntent = ${state.lastIntent}")
```

그래서 화면에는 `count = 1`이 보인다.

## 이 샘플이 MVI 전부는 아니다

이 샘플은 MVI를 처음 이해하기 위해 아주 작게 줄인 버전이다. 실무에서 보는 MVI와는 차이가 있다.

지금 샘플에는 아래가 없다.

- `ViewModel`
- `StateFlow`
- `Effect`
- `Repository`
- 비동기 API 호출

실무형 Android MVI는 보통 이런 모양에 가깝다.

```text
Composable UI
-> Event / Intent
-> ViewModel
-> UseCase / Repository
-> StateFlow<State>
-> Composable UI

+ Effect
```

하지만 처음부터 이 구조를 다 보면 오히려 핵심이 흐려질 수 있다. 그래서 이 샘플에서는 일부러 `ViewModel`과 `StateFlow`를 빼고, 가장 작은 흐름만 남겼다.

```text
UI -> Intent -> reduce -> State -> UI
```

이 감각이 잡힌 뒤에 `state`를 ViewModel 안으로 옮기고, `StateFlow`로 노출하고, Toast나 Navigation 같은 일회성 동작을 `Effect`로 분리하면 된다.

## 정리

이번 샘플에서 먼저 기억할 것은 세 가지다.

1. `State`는 화면의 현재 값이다.
2. `Intent`는 사용자의 행동을 이름 붙인 것이다.
3. `reduce`는 현재 `State`와 `Intent`로 다음 `State`를 만든다.

그리고 Compose 쪽에서는 이 한 줄을 이렇게 읽으면 된다.

```kotlin
var state by remember { mutableStateOf(CounterState()) }
```

```text
화면이 기억할 수 있고,
값이 바뀌면 다시 그려지는,
CounterState 상태를 하나 만든다.
```

이 정도까지 보이면 MVI가 조금 덜 무섭다. 다음 단계에서는 같은 구조를 `ViewModel`, `StateFlow`, `Effect`까지 확장해서 실제 프로젝트에서 보는 모양에 더 가깝게 바꿔볼 수 있다.

## 함께 읽기

- [[kotlin-lambda-function|코틀린 람다함수]]
- [[navigation3-basic-sample-notes|Navigation3 샘플 앱으로 이해한 backStack 화면 이동]]
- [[navigation3-study-guide|Navigation3 공부 가이드]]
