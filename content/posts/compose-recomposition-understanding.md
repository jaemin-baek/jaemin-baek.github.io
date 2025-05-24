---
title: "Compose Recomposition, 화면은 왜 다시 그려질까"
date: "2025-05-24"
category: "Android"
tags: ["jetpack-compose", "recomposition", "state", "android", "compose-runtime"]
description: "MVI와 Compose 상태 코드를 이해하기 전에, recomposition이 왜 필요한지와 Compose가 내부적으로 어떤 방식으로 다시 그리는지 차근차근 정리합니다."
---

![Compose Recomposition 이해하기](/images/compose-recomposition-cover.png)

MVI를 설명하려고 작은 Counter 샘플을 만들다 보니, 막히는 지점이 MVI 자체가 아닐 때가 많았다.

```kotlin
var state by remember { mutableStateOf(CounterState()) }
```

이 한 줄에서 `remember`, `mutableStateOf`, `by`, `copy`, `reduce`가 한꺼번에 나오면 당연히 어렵다. 그런데 그보다 더 앞에 있는 질문이 있다.

**화면을 왜 다시 그리지?**

버튼을 눌렀으면 숫자만 바꾸면 되는 것 아닌가. 굳이 Composable 함수를 다시 실행한다는 건 뭘까. 화면을 다시 그린다는 게 비효율적인 일은 아닐까.

이 글은 그 질문에서 출발한다. Recomposition을 성능 최적화 주제로 바로 들어가기 전에, Compose가 왜 이런 방식으로 설계되었는지부터 천천히 정리해보려고 한다. MVI를 이해하기 위한 사전 글로 읽어도 좋다.

## 먼저 한 줄로 보기

Recomposition은 어렵게 말하면 "상태 변경에 반응해서 Composable을 다시 실행하고, 새 UI 결과를 실제 화면에 반영하는 과정"이다.

쉽게 말하면 이렇다.

```text
State가 바뀜
-> 그 State를 읽던 Composable이 다시 실행됨
-> 새 UI 결과가 계산됨
-> 실제 화면에는 필요한 변경만 반영됨
```

여기서 중요한 건 "화면 전체를 매번 무식하게 다 지운다"가 아니라는 점이다. Compose는 상태를 읽은 위치를 추적하고, 다시 실행할 수 있는 범위를 나누고, 바뀌지 않은 부분은 건너뛰려고 한다.

그래서 recomposition은 피해야 할 나쁜 일이 아니다. Compose가 UI를 상태와 맞추는 기본 방식이다.

## 왜 다시 그리는 방식이 필요할까

기존 View 시스템에서는 보통 화면 객체를 직접 고쳤다.

```kotlin
count += 1
textView.text = count.toString()
```

이 코드는 직관적이다. 값이 바뀌었으니 `TextView`에 새 문자열을 넣는다.

그런데 화면이 커질수록 문제가 생긴다. `count`를 보여주는 곳이 하나가 아니라 여러 곳이라면? 버튼 활성화 여부도 `count`에 따라 바뀐다면? 에러 메시지, 로딩, 빈 화면, 애니메이션 상태까지 같이 맞춰야 한다면?

그때부터 코드는 이런 형태가 되기 쉽다.

```kotlin
count += 1
countTextView.text = count.toString()
minusButton.isEnabled = count > 0
emptyView.isVisible = count == 0
summaryTextView.text = "현재 값은 $count 입니다"
```

상태를 바꾸는 코드와 화면을 고치는 코드가 같이 늘어난다. 어느 순간부터는 "지금 화면이 왜 이런 상태지?"를 추적하기 어려워진다. 어떤 값은 바뀌었는데 어떤 View는 갱신을 빼먹는 일도 생긴다.

Compose는 이 문제를 다르게 푼다.

```kotlin
@Composable
fun CounterScreen(count: Int) {
    Text(text = count.toString())
}
```

Compose에서는 화면을 직접 고치는 대신, **상태가 이러하면 화면은 이렇게 생겨야 한다**고 선언한다.

즉 화면은 `State`의 결과다.

![View 방식과 Compose 방식 비교](/images/compose-recomposition-imperative-vs-declarative.svg)

이 관점이 중요하다. Compose는 "한 번 만든 화면을 계속 조금씩 수리하는 방식"보다, "현재 상태를 기준으로 UI 결과를 다시 계산하는 방식"을 택한다.

그래서 상태가 바뀌면 Composable이 다시 실행된다. 다시 실행된 결과를 보고 Compose가 실제 화면에 필요한 변경을 반영한다.

## 철학적으로 보면, UI를 함수처럼 생각하는 것이다

Compose를 이해할 때 가장 도움이 되는 문장은 이것이다.

```text
UI = f(State)
```

상태가 입력이고, UI가 출력이다.

```kotlin
@Composable
fun Greeting(name: String) {
    Text("Hello $name")
}
```

`name`이 `"Jaemin"`이면 화면에는 `Hello Jaemin`이 나와야 한다.

`name`이 `"Compose"`로 바뀌면 화면에는 `Hello Compose`가 나와야 한다.

이때 우리는 `TextView` 객체를 찾아서 문자열을 직접 바꾸지 않는다. `Greeting(name = "Compose")`라는 새 결과를 계산하면 된다.

물론 실제 안드로이드 화면은 함수 결과처럼 단순하지 않다. 버튼도 있고, 포커스도 있고, 애니메이션도 있고, 텍스트 입력도 있다. 그래도 Compose의 기본 설계 철학은 이 방향에 가깝다.

상태를 한 곳에서 관리하고, 화면은 그 상태를 읽어서 그린다.

이 철학이 좋은 이유는 코드의 책임이 나뉘기 때문이다.

- 상태 변경 로직은 상태를 바꾼다.
- Composable은 상태를 읽고 화면을 설명한다.
- Compose Runtime은 변경된 상태를 보고 필요한 UI 갱신을 처리한다.

개발자가 모든 View를 직접 찾아다니며 맞추는 일을 줄여준다.

## 작은 Counter로 다시 보기

아주 작은 Counter를 보자.

```kotlin
@Composable
fun CounterScreen() {
    var count by remember { mutableStateOf(0) }

    Column {
        Text(text = count.toString())

        Button(
            onClick = {
                count += 1
            }
        ) {
            Text("+1")
        }
    }
}
```

처음 실행되면 `count`는 `0`이다. 그래서 `Text("0")`이 화면에 나온다.

사용자가 `+1` 버튼을 누르면 `count += 1`이 실행된다. `count`가 `1`이 된다.

그러면 Compose는 `count`를 읽던 UI를 다시 계산한다. 다시 계산하면 이제 `Text("1")`이 된다.

이 흐름이 recomposition이다.

```text
count = 0
-> Text("0")

+1 클릭
-> count = 1
-> Text("1")
```

여기서 개발자는 `Text` 객체를 찾아서 직접 바꾸지 않았다. 상태만 바꿨다. 화면은 상태를 따라왔다.

## mutableStateOf는 Compose가 관찰할 수 있는 상태다

그럼 Compose는 `count`가 바뀐 걸 어떻게 알까?

핵심은 `mutableStateOf`다.

```kotlin
var count by remember { mutableStateOf(0) }
```

`mutableStateOf(0)`는 그냥 `Int` 값을 담는 상자가 아니다. Compose가 읽기와 쓰기를 추적할 수 있는 상태 객체다.

조금 풀어 쓰면 이런 느낌이다.

```kotlin
val countState = remember { mutableStateOf(0) }

Text(text = countState.value.toString())

Button(onClick = {
    countState.value = countState.value + 1
}) {
    Text("+1")
}
```

`Text`를 그릴 때 `countState.value`를 읽는다. Compose는 이 읽기를 기록한다.

나중에 `countState.value`가 바뀐다. 그러면 Compose는 "아까 이 값을 읽었던 곳이 있었지"라고 알고, 그 부분을 다시 실행할 수 있게 표시한다.

![Recomposition 기본 흐름](/images/compose-recomposition-flow.svg)

이걸 너무 내부 구현 용어로 말하면 snapshot state, read observation, invalidation, restart scope 같은 말이 나온다. 처음에는 이렇게만 잡으면 된다.

```text
mutableStateOf는 Compose가 지켜보는 상태 상자다.
그 값을 읽은 Composable은, 값이 바뀌면 다시 실행될 수 있다.
```

## remember는 왜 필요할까

여기서 또 하나의 질문이 나온다.

```kotlin
var count by remember { mutableStateOf(0) }
```

왜 그냥 이렇게 쓰면 안 될까?

```kotlin
var count by mutableStateOf(0)
```

이유는 Composable 함수가 다시 실행될 수 있기 때문이다.

Composable 함수는 일반 함수처럼 보인다.

```kotlin
@Composable
fun CounterScreen() {
    var count by mutableStateOf(0)
}
```

하지만 상태가 바뀌면 `CounterScreen` 자체가 다시 실행될 수 있다. 함수가 다시 실행될 때마다 `mutableStateOf(0)`를 새로 만들면 어떻게 될까?

숫자가 계속 0으로 돌아갈 수 있다.

그래서 `remember`가 필요하다.

```kotlin
var count by remember { mutableStateOf(0) }
```

`remember`는 "이 Composable이 다시 실행되어도 이 값은 기억해줘"라는 뜻이다. 처음 composition 때 상태 상자를 만들고, recomposition 때는 이전에 만든 상태 상자를 다시 가져온다.

즉 `remember`와 `mutableStateOf`를 같이 쓰면 이런 의미가 된다.

```text
Compose가 관찰할 수 있는 상태 상자를 만들고,
그 상자를 recomposition이 일어나도 계속 기억한다.
```

## Recomposition은 전체 앱을 다시 그리는 게 아니다

초보자 입장에서 "다시 그린다"라는 말이 무섭게 느껴질 수 있다.

앱 전체가 매번 처음부터 다시 만들어지는 걸까? 버튼 하나 눌렀는데 화면 전체를 다시 그리면 느리지 않을까?

Compose는 그렇게 단순하게 움직이지 않는다.

Composable 함수는 tree처럼 연결되어 있다.

```kotlin
@Composable
fun Screen(state: CounterState) {
    Header()
    CounterText(count = state.count)
    Buttons()
}
```

`state.count`가 바뀌었다고 해서 `Header()`까지 반드시 다시 실행해야 하는 것은 아니다. Compose Compiler와 Runtime은 Composable 호출을 그룹 단위로 관리하고, 다시 시작할 수 있는 범위를 만든다. 입력이 바뀌지 않았고 건너뛸 수 있다고 판단되는 부분은 skip될 수 있다.

조금 단순화하면 이런 느낌이다.

![Skipping과 restart scope](/images/compose-recomposition-skip.svg)

여기서 중요한 건 두 가지다.

첫째, recomposition은 필요한 범위를 다시 실행하려는 구조다.

둘째, 다시 실행되더라도 실제 Android View를 전부 새로 만드는 것과는 다르다. Compose는 다시 계산한 UI 설명과 기존 UI tree를 비교하고, 필요한 변경만 적용하려고 한다.

그래서 recomposition 자체를 무조건 나쁘게 보면 안 된다. 문제는 "너무 넓은 범위가 너무 자주, 너무 비싼 일을 하면서 다시 실행되는 경우"다.

## 내부 동작을 한 단계 더 내려가 보기

정확한 내부 구현은 Compose 버전과 컴파일러 최적화에 따라 달라질 수 있다. 그래도 큰 흐름은 이렇게 이해하면 좋다.

처음 화면이 그려질 때 composition이 일어난다.

```text
Composable 실행
-> UI tree 설명 생성
-> 상태를 읽은 위치 기록
-> 실제 UI에 반영
```

그 과정에서 Compose는 어떤 Composable이 어떤 state를 읽었는지 추적한다.

예를 들어 이런 코드가 있다고 하자.

```kotlin
@Composable
fun CounterText(count: Int) {
    Text(text = count.toString())
}
```

`count`가 `mutableStateOf`에서 온 값이라면, `Text`를 만드는 과정에서 그 값이 읽힌다. Compose는 이 읽기를 기록한다.

나중에 상태가 바뀐다.

```kotlin
count += 1
```

그러면 Compose는 해당 state를 읽었던 composition 범위를 invalid 상태로 표시한다. invalid는 "이전 결과가 더 이상 최신 상태와 맞지 않을 수 있다"는 뜻으로 보면 된다.

그 다음 적절한 시점에 Recomposer가 다시 실행할 작업을 처리한다. 보통 한 프레임 안에서 여러 상태 변경을 모아 처리할 수 있다. 그래서 상태가 바뀌는 즉시 매번 화면을 완전히 갈아엎는다고 생각하면 조금 다르다.

다시 실행된 Composable은 새 UI 결과를 만든다. Compose는 이 결과를 기존 결과와 맞춰보고 실제 UI에 필요한 변경을 적용한다.

이 흐름을 아주 간단히 적으면 이렇다.

```text
State write
-> state를 읽은 scope invalidation
-> Recomposer가 작업 예약
-> invalid scope 재실행
-> 변경 사항 apply
-> 필요하면 layout/draw 수행
```

이 정도를 알고 나면 `mutableStateOf`가 왜 중요한지 조금 더 분명해진다. Compose는 아무 변수나 마법처럼 감지하지 않는다. Compose가 관찰할 수 있는 state를 읽고 써야 흐름이 연결된다.

## Composition, Layout, Drawing

Compose가 화면을 만드는 과정은 크게 세 단계로 볼 수 있다.

```text
Composition -> Layout -> Drawing
```

Composition은 무엇을 보여줄지 결정하는 단계다.

```kotlin
if (isLoggedIn) {
    HomeScreen()
} else {
    LoginScreen()
}
```

이런 분기와 Composable 호출이 일어나는 곳이다. 어떤 UI 요소가 tree에 들어갈지 결정한다.

Layout은 어디에 둘지 결정하는 단계다. 크기를 측정하고 위치를 배치한다.

Drawing은 어떻게 그릴지 결정하는 단계다. 색상, 선, 도형, 텍스트 같은 실제 픽셀 결과를 만든다.

![Compose의 세 단계](/images/compose-recomposition-phases.svg)

여기서 흥미로운 점은 Compose가 state read를 단계별로 추적한다는 것이다. Composition에서 읽은 state가 바뀌면 composition이 다시 필요할 수 있다. Layout 단계에서만 읽은 state가 바뀌면 composition을 건너뛰고 layout부터 다시 할 수 있다. Drawing에서만 읽은 state가 바뀌면 더 앞 단계까지 다시 하지 않아도 될 수 있다.

초보 단계에서 이걸 전부 외울 필요는 없다. 다만 "Compose가 매번 다 한다"가 아니라, **어느 단계에서 읽은 값이 바뀌었는지에 따라 필요한 작업을 다시 하려고 한다**는 감각은 중요하다.

## 그래서 Composable은 부작용 없이 작성하는 게 좋다

Composable이 다시 실행될 수 있다는 사실은 코드 작성 방식에도 영향을 준다.

아래 코드는 위험하다.

```kotlin
@Composable
fun ProfileScreen(viewModel: ProfileViewModel) {
    viewModel.loadProfile()

    Text("Profile")
}
```

왜 위험할까?

`ProfileScreen`은 recomposition 때 다시 실행될 수 있다. 그러면 `loadProfile()`도 여러 번 호출될 수 있다.

Composable 본문은 "화면을 설명하는 코드"에 가깝게 유지하는 편이 좋다. 네트워크 요청, 로그 전송, 화면 이동, 토스트 표시 같은 부작용은 `LaunchedEffect`, `SideEffect`, 이벤트 핸들러, ViewModel 로직 같은 적절한 위치로 옮겨야 한다.

예를 들면 이런 식이다.

```kotlin
@Composable
fun ProfileScreen(viewModel: ProfileViewModel) {
    LaunchedEffect(Unit) {
        viewModel.loadProfile()
    }

    Text("Profile")
}
```

이 코드는 `ProfileScreen`이 다시 실행되더라도 `LaunchedEffect(Unit)`의 key가 바뀌지 않는 한 같은 효과를 반복 실행하지 않는다.

Recomposition을 이해하면 왜 Compose에서 "Composable은 여러 번 실행될 수 있으니 안전해야 한다"는 말을 하는지도 자연스럽게 이해된다.

## Recomposition이 많으면 무조건 성능이 나쁠까

아니다.

Recomposition은 Compose의 정상 동작이다. 숫자가 바뀌면 숫자를 읽는 UI가 다시 계산되는 건 당연하다.

문제는 이런 경우다.

- 아주 넓은 화면이 작은 상태 하나 때문에 자주 다시 실행된다.
- Composable 안에서 비싼 계산을 매번 다시 한다.
- 목록 아이템의 key가 불안정해서 재사용이 어렵다.
- 불안정한 객체를 매번 새로 만들어서 skip이 어려워진다.
- 상태를 너무 위에서 읽어서 아래 전체가 같이 흔들린다.

예를 들어 이런 코드를 보자.

```kotlin
@Composable
fun Screen(state: ScreenState) {
    val formattedItems = state.items.map { item ->
        expensiveFormat(item)
    }

    ItemList(formattedItems)
}
```

`Screen`이 recomposition될 때마다 `expensiveFormat`이 다시 돌 수 있다. 이런 계산이 가볍다면 괜찮지만, 무겁다면 문제가 된다.

이럴 때는 `remember`나 `derivedStateOf`를 검토할 수 있다.

```kotlin
val formattedItems = remember(state.items) {
    state.items.map { item ->
        expensiveFormat(item)
    }
}
```

하지만 이것도 무조건 붙이는 만능 처방은 아니다. 먼저 코드를 단순하게 쓰고, 실제로 문제가 보이면 측정한 뒤 좁히는 게 좋다.

Compose 성능을 볼 때 목표는 "recomposition을 0으로 만들기"가 아니다.

목표는 이쪽에 가깝다.

```text
필요한 곳은 자연스럽게 다시 그리고,
필요 없는 곳은 건너뛰게 만들기.
```

## State는 필요한 곳 가까이에서 읽는 편이 좋다

Recomposition 범위를 줄이는 가장 실용적인 감각은 이거다.

**State를 너무 위에서 읽지 않는다.**

예를 들어 이런 구조가 있다고 하자.

```kotlin
@Composable
fun Screen(state: CounterState) {
    val countText = state.count.toString()

    Header()
    CounterText(countText)
    Footer()
}
```

`Screen`에서 `state.count`를 읽고 있다. 그러면 `count`가 바뀔 때 `Screen` 범위가 다시 실행될 수 있다.

더 작은 범위에서 읽을 수 있다면 이렇게 나눌 수 있다.

```kotlin
@Composable
fun Screen(state: CounterState) {
    Header()
    CounterText(count = state.count)
    Footer()
}

@Composable
fun CounterText(count: Int) {
    Text(text = count.toString())
}
```

실제로 어떤 범위가 다시 실행되는지는 안정성, 파라미터, compiler 판단, inline 여부 등 여러 요소가 섞인다. 그래도 기본 방향은 같다.

상태를 읽는 범위를 좁히면, 상태 변경이 흔드는 UI 범위도 좁아질 가능성이 높다.

## Skipping을 돕는 코드 모양

Compose는 다시 실행할 수 있는 부분과 건너뛸 수 있는 부분을 나눠서 본다.

건너뛰려면 Compose가 "이 입력은 이전과 같고, 다시 실행하지 않아도 결과가 같겠다"고 판단할 수 있어야 한다.

그래서 UI state는 가능하면 예측 가능한 값으로 만드는 편이 좋다.

```kotlin
data class CounterState(
    val count: Int = 0,
    val isLoading: Boolean = false,
)
```

`val` 중심의 data class는 읽기 쉽고, 이전 상태와 새 상태의 차이도 분명하다.

반대로 이런 식의 mutable 객체를 여기저기서 바꾸면 Compose 입장에서도, 사람 입장에서도 추적이 어려워진다.

```kotlin
class CounterState {
    var count: Int = 0
    var isLoading: Boolean = false
}
```

물론 Compose가 모든 data class를 자동으로 완벽하게 최적화한다는 뜻은 아니다. 타입 안정성, 컬렉션, lambda, compiler 설정에 따라 달라질 수 있다. 여기서 말하고 싶은 건 성능 최적화 이전에 **상태를 값처럼 다루는 습관**이 recomposition 이해에도 좋다는 점이다.

MVI에서 `state.copy(...)`를 자주 쓰는 것도 이 감각과 잘 맞는다.

```kotlin
state = state.copy(count = state.count + 1)
```

기존 객체를 몰래 바꾸는 대신, 새 상태를 만든다. 그러면 "무엇이 바뀌었는지"가 코드에 남는다.

## MVI와 Recomposition은 어떻게 연결될까

이제 MVI 쪽으로 돌아와 보자.

MVI에서는 보통 이런 흐름을 말한다.

```text
UI -> Intent -> reduce -> State -> UI
```

처음 들으면 조금 추상적이다. 그런데 recomposition을 알고 나면 더 구체적으로 보인다.

1. UI가 현재 `State`를 읽는다.
2. 사용자가 버튼을 누르면 `Intent`를 보낸다.
3. `reduce`가 현재 `State`와 `Intent`로 새 `State`를 만든다.
4. 새 `State`가 Compose state로 반영된다.
5. Compose가 그 `State`를 읽던 UI를 recomposition한다.

즉 MVI는 "상태를 어떻게 바꿀 것인가"를 정리하는 패턴이고, Compose recomposition은 "바뀐 상태를 어떻게 화면에 반영할 것인가"를 담당한다.

Counter 샘플을 다시 보면 이렇다.

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

`reduce`는 새 `CounterState`를 만든다.

```kotlin
state = reduce(state, intent)
```

`state`가 바뀐다.

```kotlin
Text(text = state.count.toString())
```

`Text`는 `state.count`를 읽고 있었으니 새 값으로 다시 계산된다.

이렇게 보면 MVI의 단방향 흐름이 Compose와 꽤 자연스럽게 맞는다.

```text
MVI: 상태 변경 규칙을 한 방향으로 정리한다.
Compose: 변경된 상태를 읽은 UI를 다시 계산한다.
```

## "다시 그리기"라는 표현을 조심해서 이해하기

한국어로 recomposition을 "다시 그리기"라고 부르면 입문자에게는 편하다. 하지만 정확히는 조금 섞인 표현이다.

Compose에는 composition, layout, drawing 단계가 있다. Recomposition은 그중 composition을 다시 수행하는 의미에 가깝다. 실제 픽셀을 다시 그리는 draw와는 구분된다.

그럼에도 스터디 초반에는 "상태가 바뀌면 화면이 다시 그려진다"라고 말해도 괜찮다고 생각한다. 단, 머릿속에는 이런 보정이 있으면 좋다.

```text
다시 그린다
= Composable을 다시 실행해서 새 UI 설명을 만들고,
  실제 화면에는 필요한 변경만 반영한다.
```

이렇게 이해하면 "다시 그리기"가 낭비처럼 느껴지지 않는다. 오히려 상태와 화면을 일치시키는 안전장치처럼 보인다.

## 처음 공부할 때 잡으면 좋은 순서

Recomposition을 처음 공부한다면 아래 순서가 가장 덜 헷갈린다.

1. Composable 함수는 여러 번 실행될 수 있다.
2. State가 바뀌면 그 State를 읽은 UI가 다시 실행될 수 있다.
3. `remember`는 recomposition 사이에서 값을 기억한다.
4. `mutableStateOf`는 Compose가 관찰할 수 있는 상태를 만든다.
5. Composable 본문에는 반복 실행되면 안 되는 일을 바로 두지 않는다.
6. 성능 문제는 recomposition 자체보다 범위와 비용을 본다.

이 순서가 잡히면 아래 코드도 덜 낯설어진다.

```kotlin
var state by remember { mutableStateOf(CounterState()) }
```

이제 이 한 줄은 이렇게 읽을 수 있다.

```text
CounterState를 담는 Compose 상태 상자를 만들고,
그 상자를 recomposition이 일어나도 기억한다.
그리고 by 덕분에 .value 없이 state처럼 읽고 쓴다.
```

## 정리

Recomposition은 Compose가 똑똑해서 생긴 복잡한 최적화 기능이라기보다, Compose가 UI를 바라보는 기본 방식에 가깝다.

상태가 바뀌면 화면도 바뀌어야 한다. 기존 View 방식은 개발자가 화면 객체를 직접 찾아 바꿨다. Compose는 상태를 기준으로 UI를 다시 계산하고, 실제 변경은 Runtime이 반영한다.

그래서 recomposition을 이해하면 `remember`, `mutableStateOf`, `copy`, `reduce`, MVI 흐름이 한 줄로 이어진다.

```text
상태가 바뀐다
-> Compose가 상태를 읽은 UI를 다시 계산한다
-> MVI는 그 상태 변경 과정을 예측 가능하게 정리한다
```

처음에는 이 정도면 충분하다. 성능 최적화는 그 다음이다. 먼저 recomposition을 두려워하지 않는 게 중요하다. Compose는 다시 그리기 위해 만들어진 UI 도구이고, 좋은 Compose 코드는 그 흐름을 거스르지 않는다.

## 참고한 공식 문서

- [Thinking in Compose](https://developer.android.com/develop/ui/compose/mental-model)
- [State and Jetpack Compose](https://developer.android.com/develop/ui/compose/state)
- [Jetpack Compose phases](https://developer.android.com/develop/ui/compose/phases)
- [Stability in Compose](https://developer.android.com/develop/ui/compose/performance/stability)

## 함께 읽기

- [[mvi-basic-counter-sample|MVI Counter 샘플로 상태 흐름 이해하기]]
- [[compose-performance-recomposition-basics|Compose 성능을 볼 때 recomposition부터 확인하기]]
- [[android-ui-state-layer-compose|Android UI Layer와 Compose State 정리하기]]
