---
title: "Compose mutableStateOf, 상태 변경은 어떻게 알려질까"
date: "2025-05-30"
category: "Android"
tags: ["jetpack-compose", "mutableStateOf", "state", "recomposition", "android"]
description: "Jetpack Compose에서 mutableStateOf가 왜 필요한지, MutableState의 value 읽기와 쓰기가 recomposition으로 이어지는 과정을 깊게 정리합니다."
---

![Compose mutableStateOf, 상태 변경은 어떻게 알려질까](/images/compose-mutablestateof-cover.png)

앞 글에서는 `remember`를 봤다.

```kotlin
val requester = remember {
    FocusRequester()
}
```

`remember`의 핵심은 "Composable이 다시 실행되어도 같은 값을 기억한다"였다.

그런데 `remember`만으로는 아직 부족하다. 값을 기억하는 것과, 값이 바뀌었을 때 Compose가 그 사실을 아는 것은 다른 문제다.

이번 글에서는 그 두 번째 문제를 본다.

```kotlin
var count by remember { mutableStateOf(0) }
```

여기서 `remember`가 상태 상자를 기억한다면, `mutableStateOf`는 그 상자를 Compose가 관찰할 수 있게 만든다.

조금 더 쉽게 말하면:

```text
remember = 상자를 잃어버리지 않게 기억한다.
mutableStateOf = 상자 안 값이 바뀌면 Compose에 알려준다.
```

이 글은 `mutableStateOf`가 왜 필요한지, `.value`는 무엇인지, 값이 바뀌면 어떻게 recomposition으로 이어지는지, 그리고 실무에서 자주 만나는 함정까지 정리해보려고 한다.

## 먼저 한 줄로 보기

`mutableStateOf`는 Compose가 관찰할 수 있는 `MutableState<T>`를 만드는 함수다.

```kotlin
val countState = mutableStateOf(0)
```

이 함수가 반환하는 값은 단순한 `Int`가 아니다.

```kotlin
MutableState<Int>
```

그 안에 실제 값은 `value`로 들어 있다.

```kotlin
countState.value
```

값을 읽을 때:

```kotlin
Text(countState.value.toString())
```

Compose는 "이 Composable이 `countState.value`를 읽었구나"를 기록할 수 있다.

값을 쓸 때:

```kotlin
countState.value = countState.value + 1
```

Compose는 "`countState.value`가 바뀌었구나. 이 값을 읽던 UI는 다시 계산해야 할 수 있겠다"라고 알 수 있다.

이게 `mutableStateOf`의 핵심이다.

```text
값을 담는 상자이면서,
읽기와 쓰기를 Compose가 관찰할 수 있는 상자.
```

## 일반 변수와 무엇이 다를까

아래 코드는 익숙하다.

```kotlin
@Composable
fun Counter() {
    var count = 0

    Button(onClick = {
        count += 1
    }) {
        Text(count.toString())
    }
}
```

처음 보기에는 `count`가 1씩 올라갈 것 같다. 하지만 Compose UI 코드로는 원하는 방식으로 동작하지 않는다.

문제가 두 개 있다.

첫째, `count`는 일반 지역 변수다. Composable이 다시 실행되면 다시 `0`으로 만들어질 수 있다. 이 문제는 앞 글의 `remember`가 다루던 영역이다.

둘째, `count += 1`이 실행되어도 Compose가 자동으로 그 변경을 관찰할 수 없다. 일반 변수는 Compose Runtime과 연결된 상태가 아니다.

그래서 아래처럼 관찰 가능한 상태로 만들어야 한다.

```kotlin
@Composable
fun Counter() {
    val countState = remember { mutableStateOf(0) }

    Button(onClick = {
        countState.value += 1
    }) {
        Text(countState.value.toString())
    }
}
```

![일반 변수와 mutableStateOf 비교](/images/compose-mutablestateof-normal-vs-state.svg)

여기서 `remember`는 `countState`라는 상태 상자를 기억한다. `mutableStateOf`는 그 상자를 Compose가 관찰할 수 있게 만든다.

즉 역할이 다르다.

```text
일반 변수
-> 값은 바뀔 수 있지만 Compose가 변경을 자동으로 추적하지 못한다.

mutableStateOf
-> value 읽기와 쓰기를 Compose가 추적할 수 있다.
```

## MutableState는 value를 가진다

`mutableStateOf(0)`의 결과는 `MutableState<Int>`다.

대략 이렇게 생겼다고 생각하면 된다.

```kotlin
interface MutableState<T> : State<T> {
    override var value: T
}
```

정확한 구현은 Compose Runtime 내부에 있지만, 사용하는 입장에서는 `value`가 핵심이다.

```kotlin
val countState: MutableState<Int> = mutableStateOf(0)

countState.value // 읽기
countState.value = 1 // 쓰기
```

`MutableState`는 값을 그냥 들고만 있는 게 아니다. Compose Snapshot 시스템과 연결되어 있다. 그래서 Composable 실행 중에 `value`가 읽히면 읽은 위치를 추적할 수 있고, `value`가 바뀌면 그 값을 읽은 위치를 다시 실행할 수 있게 표시할 수 있다.

처음에는 내부 이름을 다 외울 필요 없다. 아래 정도로 잡으면 충분하다.

```text
MutableState.value를 읽는다
-> Compose가 읽은 Composable을 기억할 수 있다.

MutableState.value를 쓴다
-> Compose가 변경을 감지하고 필요한 recomposition을 예약할 수 있다.
```

## value를 읽으면 구독이 생긴다

조금 더 구체적으로 보자.

```kotlin
@Composable
fun CounterText(countState: State<Int>) {
    Text(countState.value.toString())
}
```

`CounterText`가 실행되는 동안 `countState.value`를 읽는다.

Compose는 이 읽기를 기록한다. "이 Composable은 이 state의 value에 의존한다"는 정보가 생기는 것이다.

나중에 값이 바뀐다.

```kotlin
countState.value = 1
```

그러면 Compose는 `countState.value`를 읽었던 Composable을 invalid 상태로 표시할 수 있다. invalid는 이전에 계산한 UI 결과가 더 이상 최신 state와 맞지 않을 수 있다는 뜻이다.

그 다음 적절한 시점에 Recomposer가 다시 실행할 범위를 처리한다.

![MutableState 읽기와 쓰기 흐름](/images/compose-mutablestateof-read-write.svg)

이 흐름을 아주 단순화하면 이렇다.

```text
1. Composable이 state.value를 읽는다.
2. Compose가 읽은 위치를 기록한다.
3. state.value가 바뀐다.
4. Compose가 읽은 위치를 다시 실행 대상으로 표시한다.
5. recomposition에서 새 value로 UI를 다시 계산한다.
```

이제 `mutableStateOf`가 왜 필요한지 조금 더 분명해진다.

Compose는 일반 변수의 변경을 마법처럼 알지 못한다. Compose가 알 수 있는 상태로 감싸야 한다. 그 대표 API가 `mutableStateOf`다.

## by를 쓰면 value가 숨겨진다

처음 Compose 코드를 보면 아래 형태가 더 자주 보인다.

```kotlin
var count by remember { mutableStateOf(0) }
```

이 코드는 사실 아래와 비슷하다.

```kotlin
val countState = remember { mutableStateOf(0) }

countState.value = countState.value + 1
Text(countState.value.toString())
```

`by`는 Kotlin의 delegated property 문법이다. Compose가 제공하는 `getValue`, `setValue` 덕분에 `.value`를 직접 쓰지 않고도 값을 읽고 쓸 수 있다.

```kotlin
var count by remember { mutableStateOf(0) }

count += 1
Text(count.toString())
```

여기서 `count`가 그냥 `Int`처럼 보이지만, 실제로는 내부적으로 `MutableState.value`를 읽고 쓰는 것과 연결된다.

그래서 `by`는 문법을 짧게 해주는 도구라고 보면 된다.

```text
by가 없으면 state.value를 직접 읽고 쓴다.
by가 있으면 state처럼 보이지만 내부적으로 value를 읽고 쓴다.
```

중요한 점은 `by`가 상태를 관찰 가능하게 만드는 것은 아니라는 점이다. 관찰 가능한 상태를 만드는 역할은 `mutableStateOf`가 한다.

## remember와 mutableStateOf는 같이 다니지만 역할이 다르다

`remember` 글에서 봤듯이 Composable은 다시 실행될 수 있다.

그렇다면 이 코드는 위험하다.

```kotlin
@Composable
fun Counter() {
    var count by mutableStateOf(0)
}
```

Composable이 다시 실행될 때마다 `mutableStateOf(0)`가 다시 호출되면 상태 상자 자체가 새로 만들어질 수 있다. 그러면 이전에 가지고 있던 값의 기준점이 흔들린다.

그래서 보통 이렇게 쓴다.

```kotlin
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }
}
```

![remember와 mutableStateOf 역할 분리](/images/compose-mutablestateof-remember-roles.svg)

이 한 줄을 나누면 이렇게 된다.

```text
mutableStateOf(0)
-> Compose가 관찰할 수 있는 MutableState를 만든다.

remember { ... }
-> 그 MutableState 객체를 recomposition 사이에서 유지한다.

by
-> .value 없이 편하게 읽고 쓰게 한다.
```

그래서 이 세 가지를 한 덩어리로 외우기보다 역할을 나눠서 보는 편이 좋다.

```kotlin
var count by remember { mutableStateOf(0) }
```

읽는 순서는 이렇게 잡으면 된다.

```text
0을 담은 관찰 가능한 상태 상자를 만들고,
그 상자를 화면이 다시 실행되어도 기억하고,
나는 count라는 변수처럼 읽고 쓰겠다.
```

## mutableStateOf는 recomposition을 직접 실행하지 않는다

조금 조심해야 할 표현이 있다.

```text
mutableStateOf가 화면을 다시 그린다.
```

스터디 초반에는 이렇게 말해도 큰 흐름은 통한다. 하지만 정확히는 조금 다르다.

`mutableStateOf`는 관찰 가능한 상태를 만든다. 그 상태의 `value`가 바뀌면 Compose Runtime이 그 state를 읽었던 scope를 invalid로 표시할 수 있다. 이후 Recomposer가 적절한 시점에 recomposition을 수행한다.

즉 `value`를 바꾸는 순간 그 자리에서 즉시 화면 전체를 그리는 것이 아니다.

조금 더 정확히 말하면:

```text
state.value 변경
-> 읽은 scope invalidation
-> recomposition 작업 예약
-> 프레임에 맞춰 필요한 범위 다시 실행
-> 변경 사항 적용
```

이 표현이 중요한 이유는 Compose가 여러 변경을 한 프레임 안에서 모아 처리할 수 있고, 변경된 값과 상관없는 부분은 건너뛸 수 있기 때문이다.

그래서 `mutableStateOf`는 "다시 그리기 버튼"이 아니라, "상태 변경을 Compose Snapshot 시스템에 알려주는 관찰 가능한 상자"에 가깝다.

## 같은 값을 넣으면 항상 다시 그릴까

아래 코드를 보자.

```kotlin
var count by remember { mutableStateOf(0) }

count = 0
```

이미 `count`가 `0`인데 다시 `0`을 넣으면 어떻게 될까?

기본적인 `mutableStateOf`는 구조 동등성 정책을 사용한다. 간단히 말하면 이전 값과 새 값이 `==`로 같다고 판단되면 변경으로 보지 않을 수 있다.

Compose Runtime API 관점에서는 이런 형태로 볼 수 있다.

```kotlin
mutableStateOf(
    value = initialValue,
    policy = structuralEqualityPolicy()
)
```

정책은 "새 값이 이전 값과 같은가?"를 판단한다. 같다고 판단되면 굳이 recomposition을 유발할 필요가 없다.

![SnapshotMutationPolicy 설명](/images/compose-mutablestateof-policy.svg)

예를 들어 아래 코드는 의미 있는 변경이다.

```kotlin
count = 1
```

하지만 아래 코드는 이미 값이 0이라면 의미 있는 변경이 아닐 수 있다.

```kotlin
count = 0
```

이 동작은 대부분의 UI 코드에서 자연스럽다. 같은 값을 다시 넣었는데 화면을 다시 계산할 필요는 없기 때문이다.

다만 이 지점 때문에 "내가 값을 넣었는데 왜 recomposition이 안 되지?" 같은 질문이 생길 수 있다. 이럴 때는 실제로 새 값이 이전 값과 다른지, 또는 내부 mutable 객체만 바꾸고 있는 것은 아닌지 확인해야 한다.

## data class와 copy가 잘 어울리는 이유

MVI 샘플에서는 이런 코드를 썼다.

```kotlin
state = state.copy(
    count = state.count + 1,
    lastIntent = "IncreaseClicked",
)
```

이 방식은 `mutableStateOf`와 잘 맞는다.

`state`가 `CounterState`라고 해보자.

```kotlin
data class CounterState(
    val count: Int = 0,
    val lastIntent: String = "",
)
```

`copy`는 기존 객체를 몰래 고치지 않는다. 일부 값이 바뀐 새 객체를 만든다.

```kotlin
val oldState = CounterState(count = 0)
val newState = oldState.copy(count = 1)
```

그리고 `mutableStateOf`의 value에 새 객체를 넣는다.

```kotlin
state = newState
```

이렇게 하면 변경이 명확하다.

```text
이전 State: count = 0
새 State: count = 1
```

사람이 보기에도 좋고, Compose 입장에서도 value가 새 값으로 교체되는 흐름이 분명하다.

그래서 Compose UI state는 가능하면 immutable하게 다루는 편이 좋다. `var` 프로퍼티를 가진 객체를 내부에서 몰래 바꾸는 방식보다, `val` 중심의 data class와 `copy`가 상태 변경을 추적하기 쉽다.

## mutable object를 넣을 때 조심하기

가장 많이 헷갈리는 함정 중 하나가 mutable collection이다.

아래 코드를 보자.

```kotlin
val itemsState = mutableStateOf(mutableListOf<String>())

itemsState.value.add("A")
```

이 코드는 `itemsState.value`가 들고 있는 `MutableList`의 내부를 바꾼다. 하지만 `itemsState.value = ...` setter를 호출하지 않는다.

즉 `MutableState`의 value 자체가 새 값으로 교체된 것이 아니다.

Compose가 이 변경을 놓칠 수 있다.

![mutable object 함정](/images/compose-mutablestateof-mutable-object.svg)

더 안전한 방향은 새 리스트를 만들어 value에 다시 넣는 것이다.

```kotlin
var items by remember { mutableStateOf(emptyList<String>()) }

items = items + "A"
```

이 코드는 `items`에 새 `List`를 넣는다. value setter가 호출되고, Compose가 변경을 알 수 있다.

또 다른 선택지는 Compose가 제공하는 snapshot-aware collection을 쓰는 것이다.

```kotlin
val items = remember { mutableStateListOf<String>() }

items.add("A")
```

`mutableStateListOf`는 일반 `MutableList`와 다르게 Compose Snapshot과 연결된 collection이다. 그래서 리스트 내부 변경도 Compose가 관찰할 수 있다.

정리하면:

```text
mutableStateOf(mutableListOf())
-> list 내부 변경을 Compose가 놓칠 수 있다.

mutableStateOf(emptyList())
-> 새 list를 만들어 value에 넣으면 변경이 명확하다.

mutableStateListOf()
-> list 자체가 snapshot-aware collection이다.
```

## mutableStateOf 안에 객체를 넣을 때 기준

`mutableStateOf` 안에는 어떤 값이든 넣을 수 있다.

```kotlin
mutableStateOf(0)
mutableStateOf("")
mutableStateOf(UserUiState())
mutableStateOf(emptyList<Message>())
```

하지만 어떤 값을 넣는지가 코드의 예측 가능성을 크게 바꾼다.

좋은 후보는 이런 값들이다.

- `Int`, `Boolean`, `String`처럼 값 자체가 단순한 타입
- `val` 프로퍼티 중심의 data class
- 새 값으로 교체하는 immutable collection
- UI가 직접 그리는 데 필요한 UiState

주의가 필요한 값은 이런 것들이다.

- 내부를 직접 바꾸는 mutable object
- `var` 프로퍼티가 많은 class
- Compose 밖에서도 동시에 변경되는 객체
- 생명주기가 화면보다 긴 repository, manager, client

이 기준은 어렵지 않다.

```text
value 자체를 교체해서 변경을 표현할 수 있는가?
이 값이 바뀌면 화면도 바뀌어야 하는가?
이 값의 생명주기가 Composable과 맞는가?
```

이 질문에 답하면서 `mutableStateOf`를 쓰면 된다.

## Snapshot은 왜 나올까

`mutableStateOf`를 깊게 보면 Snapshot이라는 단어를 만나게 된다.

Compose의 Snapshot 시스템은 여러 state read/write를 일관성 있게 다루기 위한 기반이다. 단순히 "값 하나 바뀌면 화면 다시 그림" 정도보다 더 깊은 장치다.

예를 들어 Composable이 실행되는 동안 여러 state를 읽을 수 있다.

```kotlin
Text("${userState.value.name} / ${countState.value}")
```

Compose는 이 실행이 어떤 state들을 읽었는지 알고 있어야 한다. 그래야 나중에 `userState`나 `countState` 중 하나가 바뀌었을 때 해당 UI를 다시 계산할 수 있다.

또 state write가 일어났을 때 언제 그것을 적용하고, 어떤 reader에게 알릴지도 정해야 한다. Snapshot 시스템은 이런 read/write 추적과 적용을 안정적으로 처리하는 데 관여한다.

처음부터 Snapshot의 내부 자료구조를 공부할 필요는 없다. 하지만 아래 감각은 유용하다.

```text
mutableStateOf는 Compose Snapshot 시스템에 연결된 state다.
그래서 value read/write가 추적될 수 있다.
```

이 감각이 있으면 `mutableStateOf`, `snapshotFlow`, `derivedStateOf`, `mutableStateListOf` 같은 API가 조금 덜 흩어져 보인다. 모두 Compose가 상태 read/write를 추적하는 방식과 연결되어 있기 때문이다.

## derivedStateOf와는 무엇이 다를까

`mutableStateOf`를 공부하다 보면 `derivedStateOf`도 곧 보인다.

둘은 역할이 다르다.

`mutableStateOf`는 직접 변경 가능한 상태를 만든다.

```kotlin
var query by remember { mutableStateOf("") }
```

`derivedStateOf`는 다른 상태로부터 계산되는 값을 만든다.

```kotlin
val showClearButton by remember {
    derivedStateOf {
        query.isNotEmpty()
    }
}
```

즉 `showClearButton`은 직접 수정하는 값이 아니다. `query`가 바뀌면 그 결과로 계산되는 값이다.

처음에는 이렇게만 나누면 된다.

```text
mutableStateOf
-> 직접 바뀌는 원본 상태

derivedStateOf
-> 다른 상태에서 계산되는 파생 상태
```

다만 `derivedStateOf`도 남용하면 코드가 복잡해진다. 정말 계산 비용이 있거나, 입력 변화보다 출력 변화가 적어서 recomposition 범위를 줄이는 데 도움이 되는 경우에 검토하는 편이 좋다.

## Flow, StateFlow와는 어떻게 연결될까

실무에서는 화면 상태가 ViewModel의 `StateFlow`에서 내려오는 경우가 많다.

```kotlin
val uiState by viewModel.uiState.collectAsStateWithLifecycle()
```

이 경우 직접 `mutableStateOf`를 만들지 않는다. 하지만 Compose 입장에서 결과는 비슷하다. Flow에서 새 값이 emit되면 Compose가 관찰 가능한 `State` 형태로 값을 받게 되고, 그 값을 읽는 Composable이 다시 계산될 수 있다.

즉 `mutableStateOf`는 Compose 내부 상태를 직접 만들 때 쓰는 가장 기본 API이고, `collectAsStateWithLifecycle`은 Flow를 Compose가 읽을 수 있는 State로 연결하는 API라고 볼 수 있다.

작은 샘플에서는:

```kotlin
var state by remember { mutableStateOf(CounterState()) }
```

실무 ViewModel에서는:

```kotlin
val state by viewModel.state.collectAsStateWithLifecycle()
```

이런 식으로 모양이 바뀐다.

하지만 기본 원리는 비슷하다.

```text
Composable이 State를 읽는다.
State 값이 바뀐다.
읽은 UI가 다시 계산된다.
```

## MVI와 mutableStateOf

MVI Counter 샘플에서 핵심 흐름은 이랬다.

```text
UI -> Intent -> reduce -> State -> UI
```

`mutableStateOf`는 마지막 연결을 담당한다.

```kotlin
var state by remember { mutableStateOf(CounterState()) }

fun send(intent: CounterIntent) {
    state = reduce(state, intent)
}
```

`reduce`는 새 `CounterState`를 만든다.

```kotlin
private fun reduce(
    state: CounterState,
    intent: CounterIntent,
): CounterState {
    return when (intent) {
        CounterIntent.IncreaseClicked ->
            state.copy(count = state.count + 1)

        CounterIntent.DecreaseClicked ->
            state.copy(count = state.count - 1)

        CounterIntent.ResetClicked ->
            CounterState()
    }
}
```

`state = reduce(state, intent)`가 실행되면 `MutableState.value`가 새 `CounterState`로 바뀐다.

그 `state`를 읽던 UI는 다시 계산될 수 있다.

```kotlin
Text(text = state.count.toString())
```

이렇게 보면 MVI와 Compose가 만나는 지점이 보인다.

```text
MVI reduce
-> 새 State 생성

mutableStateOf
-> 새 State가 들어왔음을 Compose에 알림

Compose
-> 그 State를 읽은 UI를 다시 계산
```

그래서 작은 Compose 샘플에서 `mutableStateOf`는 단순한 문법이 아니다. 상태 변경이 화면 갱신으로 이어지는 다리다.

## 자주 헷갈리는 질문

`mutableStateOf`와 `remember`는 같은 건가?

아니다. `remember`는 값을 기억한다. `mutableStateOf`는 관찰 가능한 상태를 만든다. 보통 둘을 같이 쓰기 때문에 헷갈릴 뿐이다.

`mutableStateOf`만 쓰면 안 되나?

Composable 안에서 상태를 만들고 recomposition 사이에 유지해야 한다면 보통 `remember`도 필요하다. `mutableStateOf`만 쓰면 상태 상자 자체가 다시 만들어질 수 있다.

`remember`만 쓰면 안 되나?

값을 단순히 기억만 하면 되는 경우에는 가능하다. 하지만 값이 바뀌었을 때 UI를 다시 계산해야 한다면 Compose가 관찰할 수 있는 상태가 필요하다.

`by`는 꼭 써야 하나?

아니다. `by` 없이 `.value`를 직접 읽고 써도 된다. 다만 `by`를 쓰면 코드가 더 짧고 자연스럽다.

같은 값을 다시 넣으면 recomposition이 일어나나?

기본 정책에서는 이전 값과 새 값이 같다고 판단되면 변경으로 보지 않을 수 있다. 그래서 같은 값을 반복해서 넣는다고 항상 UI가 다시 계산되는 것은 아니다.

`MutableList`를 `mutableStateOf`에 넣어도 되나?

가능은 하지만 주의해야 한다. 일반 `MutableList` 내부만 바꾸면 `MutableState.value` setter가 호출되지 않을 수 있다. 새 list를 만들어 value에 넣거나, Compose의 `mutableStateListOf`를 검토하는 편이 안전하다.

## 공부할 때 같이 보면 좋은 글

이번 글은 공식 문서와 API 레퍼런스를 중심으로 확인했다. 처음 공부할 때는 아래 순서가 좋다.

- [State and Jetpack Compose](https://developer.android.com/develop/ui/compose/state)
- [Jetpack Compose state codelab](https://developer.android.com/codelabs/jetpack-compose-state)
- [Thinking in Compose](https://developer.android.com/develop/ui/compose/mental-model)
- [Jetpack Compose phases](https://developer.android.com/develop/ui/compose/phases)
- [Stability in Compose](https://developer.android.com/develop/ui/compose/performance/stability)
- [SnapshotMutationPolicy API reference](https://developer.android.com/reference/kotlin/androidx/compose/runtime/SnapshotMutationPolicy)
- [State and MutableState API reference](https://developer.android.com/reference/kotlin/androidx/compose/runtime/State)

처음에는 `State and Jetpack Compose`와 state codelab을 먼저 보는 편이 좋다. `mutableStateOf`, `remember`, `by`가 가장 현실적인 예제로 나온다.

그 다음 `Thinking in Compose`를 보면 왜 상태가 바뀌면 UI를 다시 계산하는 방식이 자연스러운지 연결된다.

조금 더 깊게 보고 싶다면 `Jetpack Compose phases`와 `SnapshotMutationPolicy`를 보면 좋다. value를 읽은 단계와 변경 판단 정책까지 내려가면서, "왜 어떤 변경은 recomposition으로 이어지고 어떤 변경은 아닌지"를 이해하는 데 도움이 된다.

## 정리

`mutableStateOf`는 Compose 상태 코드를 이해할 때 꼭 잡아야 하는 API다.

처음에는 이렇게 외워도 된다.

```text
mutableStateOf는 Compose가 관찰할 수 있는 상태 상자를 만든다.
```

하지만 조금 더 정확히는 이렇다.

```text
MutableState.value를 읽으면 Compose가 그 읽기를 추적할 수 있다.
MutableState.value를 쓰면 Compose가 변경을 감지할 수 있다.
변경된 value를 읽던 UI는 recomposition 대상이 될 수 있다.
```

`remember`가 "상자를 기억"한다면, `mutableStateOf`는 "상자 안 값의 변경을 알린다".

이 둘이 합쳐져서 우리가 자주 보는 한 줄이 된다.

```kotlin
var count by remember { mutableStateOf(0) }
```

이제 이 한 줄은 이렇게 읽을 수 있다.

```text
0을 담은 관찰 가능한 상태 상자를 만들고,
그 상자를 recomposition 사이에서 기억하고,
나는 count라는 값처럼 편하게 읽고 쓰겠다.
```

MVI를 볼 때도 마찬가지다. `reduce`가 새 State를 만들고, `mutableStateOf`가 그 새 State를 Compose에 알리고, Compose가 그 State를 읽던 UI를 다시 계산한다.

그래서 `mutableStateOf`를 이해하면 MVI의 `State -> UI` 흐름이 훨씬 덜 추상적으로 보인다.

## 함께 읽기

- [[compose-remember-why-needed|Compose remember, 왜 필요한 걸까]]
- [[compose-recomposition-understanding|Compose Recomposition, 화면은 왜 다시 그려질까]]
- [[mvi-basic-counter-sample|MVI Counter 샘플로 상태 흐름 이해하기]]
