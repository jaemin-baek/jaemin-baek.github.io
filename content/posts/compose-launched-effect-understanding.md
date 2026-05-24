---
title: "Compose LaunchedEffect 쉽게 이해하기"
date: "2026-05-24"
category: "Android"
group: "Android Basics"
series: "Android Basics"
tags: ["android", "compose", "launched-effect", "coroutine", "side-effect", "viewmodel", "kotlin"]
description: "Jetpack Compose의 LaunchedEffect를 state, effect, event 흐름과 recomposition 관점에서 쉽게 정리합니다."
---

![Compose LaunchedEffect 쉽게 이해하기](/images/compose-launched-effect-cover.png)

Compose 화면을 처음 공부하다 보면 `LaunchedEffect`에서 한 번 멈칫하게 된다.

`Text`, `Button`, `Column`은 화면을 그리는 코드라서 직관적이다. 그런데 갑자기 `LaunchedEffect(Unit)`이 나오고, 그 안에서 `viewModel.effect.collect { ... }`를 한다.

처음에는 이런 질문이 생긴다.

```text
왜 그냥 Composable 본문에서 collect 하면 안 될까?
왜 Unit을 넘길까?
state.balance가 key면 왜 취소되고 다시 시작될까?
LaunchedEffect는 디바운스 같은 걸까?
```

이 글은 이 질문들을 하나씩 붙여가며 `LaunchedEffect`를 정리한 메모다.

핵심은 하나다.

```text
LaunchedEffect는 Composable의 생명주기에 묶인 코루틴 실행 블록이고,
key가 바뀌면 기존 코루틴을 취소한 뒤 새 코루틴을 시작한다.
```

## 먼저 이름부터 보기

`LaunchedEffect`는 두 단어로 나눌 수 있다.

```text
Launched + Effect
```

`Launched`는 코루틴을 `launch`한다는 뜻에 가깝다. 그래서 `LaunchedEffect` 블록 안에서는 `delay`, `collect`, `showSnackbar()`처럼 suspend 함수가 필요한 작업을 실행할 수 있다.

```kotlin
LaunchedEffect(Unit) {
    delay(1000)
    println("1초 뒤 실행")
}
```

`Effect`는 Compose에서 말하는 side effect다.

Composable의 기본 역할은 상태를 읽고 UI를 그리는 것이다.

```text
State를 읽는다
-> UI를 그린다
```

하지만 실제 앱에서는 화면을 그리는 것만으로는 부족하다.

```text
Flow 수집하기
네비게이션 보내기
Snackbar 띄우기
애니메이션 시작하기
로그 남기기
화면 진입 시 한 번 로딩하기
```

이런 작업은 UI를 직접 그리는 코드는 아니지만 앱 동작에 영향을 준다. 그래서 Compose에서는 이런 일을 effect API로 분리해서 다룬다.

공식 문서에서도 Composable은 가능한 side effect 없이 작성하고, 필요한 side effect는 effect API를 통해 예측 가능하게 실행하라고 설명한다.

## Composable은 다시 호출될 수 있다

`LaunchedEffect`를 이해하려면 먼저 recomposition을 떠올려야 한다.

Composable 함수는 일반 함수처럼 생겼지만, 실제로는 화면 설계도를 다시 계산하는 함수에 가깝다.

```kotlin
@Composable
fun CounterScreen() {
    var count by remember { mutableStateOf(0) }

    Text(text = "count: $count")

    Button(onClick = { count++ }) {
        Text("증가")
    }
}
```

처음 화면에 들어오면 `CounterScreen()`이 호출된다.

버튼을 눌러 `count`가 바뀌면 Compose는 최신 상태로 화면을 다시 계산해야 한다. 그래서 `CounterScreen()`이 다시 호출될 수 있다.

```text
처음 진입
-> CounterScreen() 호출

count 변경
-> CounterScreen() 다시 호출

count 변경
-> CounterScreen() 다시 호출
```

`Text`, `Button`, `Column` 같은 UI 선언은 여러 번 다시 실행되어도 괜찮다. 최신 상태로 화면을 다시 계산하는 것이 Compose의 기본 동작이기 때문이다.

문제는 Composable 본문에 "실제로 실행되는 작업"을 그냥 넣을 때 생긴다.

![Recomposition과 LaunchedEffect의 차이](/images/compose-launched-effect-recomposition-flow.png)

## 본문에서 바로 실행하면 왜 위험할까

아래 코드는 일부러 나쁘게 쓴 예제다.

```kotlin
@Composable
fun BadBalanceScreen(viewModel: BalanceViewModel) {
    val state by viewModel.state.collectAsState()

    GlobalScope.launch {
        viewModel.effect.collect { effect ->
            if (effect is BalanceEffect.NavigateToSend) {
                println("네비게이션 실행")
            }
        }
    }

    Text(text = state.balance)
}
```

여기서 `state.balance`가 바뀌면 화면은 다시 그려질 수 있다. 그러면 Composable 본문도 다시 실행된다.

그때마다 `GlobalScope.launch { ... }`도 다시 실행된다.

```text
처음 진입
-> effect collect 코루틴 1개 시작

state 변경으로 recomposition
-> effect collect 코루틴 1개 추가 시작

state 또 변경
-> effect collect 코루틴 1개 또 추가 시작
```

그러면 같은 `viewModel.effect`를 듣는 collector가 여러 개 생길 수 있다.

```text
collector A
collector B
collector C
```

이 상태에서 ViewModel이 네비게이션 effect를 한 번 보냈다고 해보자.

```kotlin
_effect.emit(BalanceEffect.NavigateToSend(...))
```

그러면 collector들이 모두 반응할 수 있다.

```text
collector A -> 네비게이션 실행
collector B -> 네비게이션 실행
collector C -> 네비게이션 실행
```

사용자는 버튼을 한 번 눌렀는데 화면 이동이 여러 번 발생할 수 있다. 이것이 "중복 collect", "중복 navigation" 문제다.

메모리 누수도 같은 맥락에서 볼 수 있다. 화면은 사라졌는데 예전에 시작한 코루틴이 계속 살아 있으면, 더 이상 필요 없는 화면 관련 작업이 남아 있을 수 있다.

그래서 Composable 본문에는 다시 실행되어도 안전한 UI 선언을 두고, 코루틴 실행 같은 side effect는 `LaunchedEffect` 안에 둔다.

## LaunchedEffect는 코루틴을 관리해준다

같은 일을 `LaunchedEffect`로 옮기면 흐름이 달라진다.

```kotlin
LaunchedEffect(Unit) {
    viewModel.effect.collect { effect ->
        if (effect is BalanceEffect.NavigateToSend) {
            onNavigateToSend(effect.recipientName, effect.recipientAddress)
        }
    }
}
```

이 코드는 이렇게 동작한다고 볼 수 있다.

```text
처음 진입
-> effect collect 코루틴 1개 시작

state 변경으로 recomposition
-> LaunchedEffect(Unit)은 다시 시작하지 않음

state 또 변경
-> 여전히 기존 코루틴 1개만 유지

화면이 사라짐
-> 코루틴 자동 취소
```

공식 문서 기준으로도 `LaunchedEffect`가 Composition에 들어오면 전달된 블록으로 코루틴을 시작하고, Composition에서 나가면 그 코루틴을 취소한다.

즉 `LaunchedEffect`는 아래 역할을 한다.

```text
Composable 생명주기 안에서
코루틴을 시작하고
필요할 때 취소해주는 장치
```

## key가 바뀌면 다시 시작된다

`LaunchedEffect`에서 가장 중요한 개념은 key다.

```kotlin
LaunchedEffect(key) {
    // suspend 작업
}
```

key가 그대로면 기존 코루틴을 유지한다.

key가 바뀌면 기존 코루틴을 취소하고 새 코루틴을 시작한다.

```text
key 유지
-> 기존 코루틴 유지

key 변경
-> 기존 코루틴 취소
-> 새 코루틴 시작
```

이 동작은 검색창 예제로 보면 쉽다.

```kotlin
@Composable
fun SearchScreen(
    onSearch: (String) -> Unit
) {
    var keyword by remember { mutableStateOf("") }

    TextField(
        value = keyword,
        onValueChange = { keyword = it }
    )

    LaunchedEffect(keyword) {
        delay(500)
        onSearch(keyword)
    }
}
```

![LaunchedEffect key 변경과 코루틴 재시작](/images/compose-launched-effect-key-restart.png)

사용자가 빠르게 입력한다고 해보자.

```text
a
ab
abc
```

실제 흐름은 이렇게 된다.

```text
keyword = "a"
-> LaunchedEffect 시작

0.2초 뒤 keyword = "ab"
-> "a" 작업 취소
-> 새 LaunchedEffect 시작

0.2초 뒤 keyword = "abc"
-> "ab" 작업 취소
-> 새 LaunchedEffect 시작

0.5초 동안 변화 없음
-> onSearch("abc") 실행
```

이 패턴은 디바운스와 닮았다.

하지만 중요한 차이가 있다.

```text
LaunchedEffect 자체가 디바운스 API는 아니다.
key 변경 시 코루틴을 취소하고 재시작하는 성질 덕분에
delay와 함께 쓰면 디바운스처럼 동작하게 만들 수 있다.
```

즉 `LaunchedEffect(keyword) + delay(500)` 조합이 디바운스 구현에 잘 어울리는 것이다.

## Unit을 key로 넘기는 이유

이제 아래 코드를 다시 보자.

```kotlin
LaunchedEffect(Unit) {
    viewModel.effect.collect { effect ->
        when (effect) {
            is BalanceEffect.NavigateToSend ->
                onNavigateToSend(effect.recipientName, effect.recipientAddress)
        }
    }
}
```

`Unit`은 변하지 않는 값이다.

그래서 이 effect는 해당 위치가 Composition에 들어올 때 한 번 시작되고, 같은 위치에 남아 있는 동안 계속 유지된다.

```text
LaunchedEffect(Unit)
-> 이 화면 생명주기 동안 한 번 시작해서 유지하고 싶다
```

ViewModel의 `effect`를 collect하는 코드에 잘 맞는다. 네비게이션 같은 일회성 사건은 화면이 살아 있는 동안 계속 듣고 있어야 하지만, state가 바뀔 때마다 collect를 새로 시작하면 안 되기 때문이다.

다만 `LaunchedEffect(Unit)`이나 `LaunchedEffect(true)` 같은 상수 key는 의미가 강하다.

```text
이 effect는 이 위치의 생명주기를 따라간다.
recomposition이 일어나도 다시 시작하지 않는다.
```

그래서 습관처럼 쓰기보다, 정말 "이 위치에서 한 번 시작해서 계속 유지할 작업"인지 확인하는 편이 좋다.

## BalanceScreen에 붙여보기

처음에 봤던 잔액 화면 예제로 돌아와보자.

```kotlin
@Composable
fun BalanceScreen(
    onNavigateToSend: (recipientName: String, recipientAddress: String) -> Unit,
    viewModel: BalanceViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is BalanceEffect.NavigateToSend ->
                    onNavigateToSend(effect.recipientName, effect.recipientAddress)
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        if (state.isLoading) {
            CircularProgressIndicator()
        } else {
            Text(text = "내 잔액")
            Text(text = "${state.balance} ${state.currency}")
            state.errorMessage?.let { Text(text = it) }
        }

        Button(
            onClick = { viewModel.onEvent(BalanceEvent.SendClicked) },
            modifier = Modifier.padding(top = 24.dp),
        ) {
            Text(text = "보내기")
        }
    }
}
```

이 화면은 세 가지 흐름으로 나눠볼 수 있다.

```text
1. state 구독
2. effect 수집
3. event 발사
```

먼저 state 구독이다.

```kotlin
val state by viewModel.state.collectAsState()
```

이 코드는 ViewModel의 state를 Compose state로 구독한다. state가 바뀌면 화면은 다시 그려진다.

```text
state.balance 변경
-> BalanceScreen recomposition
-> Text가 최신 balance를 보여줌
```

다음은 effect 수집이다.

```kotlin
LaunchedEffect(Unit) {
    viewModel.effect.collect { effect ->
        when (effect) {
            is BalanceEffect.NavigateToSend ->
                onNavigateToSend(effect.recipientName, effect.recipientAddress)
        }
    }
}
```

이 코드는 화면이 살아 있는 동안 ViewModel의 일회성 사건을 듣는다.

```text
ViewModel
-> NavigateToSend effect 발행
-> LaunchedEffect 안의 collector가 받음
-> onNavigateToSend 콜백 호출
```

마지막은 event 발사다.

```kotlin
Button(
    onClick = { viewModel.onEvent(BalanceEvent.SendClicked) }
) {
    Text(text = "보내기")
}
```

버튼은 "보내기가 눌렸다"는 사실만 ViewModel에 알려준다.

잔액이 충분한지, 받는 사람이 누구인지, 다음 화면으로 갈 수 있는지는 UI가 판단하지 않는다. 그런 판단은 ViewModel이나 UseCase 쪽으로 보낸다.

그래서 이 화면은 비교적 바보 화면으로 남는다.

```text
State를 받아 그린다.
Effect를 받아 상위 콜백으로 넘긴다.
Event를 ViewModel로 올린다.
```

## navigation을 effect로 다루는 이유

네비게이션은 상태처럼 오래 보관할 값이 아니다.

예를 들어 `state.navigateToSend = true` 같은 값을 state에 넣었다고 해보자. 화면이 다시 그려질 때 이 값이 여전히 true라면 네비게이션이 또 실행될 수 있다.

```text
state.navigateToSend = true
-> 화면 이동

recomposition
-> 아직 true
-> 화면 이동 또 실행
```

네비게이션은 보통 "한 번 소비되는 사건"이다.

```text
보내기 버튼 클릭
-> 조건 확인
-> NavigateToSend effect 1회 발행
-> UI가 받아서 네비게이션 콜백 호출
```

그래서 MVI나 단방향 흐름에서는 상태와 effect를 분리하는 경우가 많다.

```text
State
-> 화면에 계속 남아 있어야 하는 값
-> balance, loading, errorMessage

Effect
-> 한 번 처리하고 끝나는 사건
-> navigation, snackbar, toast

Event
-> 사용자가 UI에서 올려보내는 입력
-> SendClicked, AmountChanged
```

`LaunchedEffect(Unit)`은 여기서 effect를 안전하게 수집하는 통로가 된다.

## key로 무엇을 넣어야 할까

`LaunchedEffect`의 key는 "이 값이 바뀌면 작업을 다시 시작해야 하는가?"라는 질문으로 고르면 된다.

예를 들어 검색어가 바뀔 때마다 이전 검색 예약을 취소하고 싶다면 key는 `keyword`가 자연스럽다.

```kotlin
LaunchedEffect(keyword) {
    delay(500)
    onSearch(keyword)
}
```

특정 사용자 id가 바뀔 때마다 데이터를 다시 로딩해야 한다면 key는 `userId`가 될 수 있다.

```kotlin
LaunchedEffect(userId) {
    viewModel.loadUser(userId)
}
```

화면이 살아 있는 동안 effect stream을 한 번만 collect하고 싶다면 key는 `Unit`이 될 수 있다.

```kotlin
LaunchedEffect(Unit) {
    viewModel.effect.collect { effect ->
        handleEffect(effect)
    }
}
```

반대로 key를 잘못 고르면 의도치 않은 재시작이 일어난다.

```kotlin
LaunchedEffect(state.balance) {
    viewModel.effect.collect { effect ->
        handleEffect(effect)
    }
}
```

이 코드는 balance가 바뀔 때마다 기존 collect를 취소하고 새로 시작한다. effect stream을 계속 듣는 용도라면 어색하다.

질문은 단순하다.

```text
이 값이 바뀌면 기존 코루틴을 취소하고 다시 시작해야 하는가?
```

대답이 yes면 key로 넣는다. no면 key로 넣지 않는다.

## 최신 값은 쓰고 싶지만 재시작은 싫을 때

가끔 이런 경우가 있다.

```text
effect 안에서 최신 콜백은 쓰고 싶다.
하지만 콜백이 바뀐다고 effect를 다시 시작하고 싶지는 않다.
```

예를 들어 스플래시 화면에서 2초 뒤 `onTimeout()`을 호출한다고 해보자.

```kotlin
@Composable
fun SplashScreen(onTimeout: () -> Unit) {
    LaunchedEffect(Unit) {
        delay(2000)
        onTimeout()
    }
}
```

대부분의 경우에는 이 정도로 충분할 수 있다. 하지만 `onTimeout`이 recomposition 과정에서 새 람다로 바뀔 수 있고, effect를 재시작하지 않으면서 최신 람다를 호출하고 싶다면 `rememberUpdatedState`를 사용한다.

```kotlin
@Composable
fun SplashScreen(onTimeout: () -> Unit) {
    val currentOnTimeout by rememberUpdatedState(onTimeout)

    LaunchedEffect(Unit) {
        delay(2000)
        currentOnTimeout()
    }
}
```

이렇게 하면 `delay(2000)`은 다시 시작하지 않지만, 2초 뒤에는 최신 `onTimeout`을 호출한다.

공식 문서도 effect 안에서 사용하는 값이 바뀌었을 때 effect를 재시작하고 싶지 않다면 `rememberUpdatedState`를 사용하라고 설명한다.

## rememberCoroutineScope와는 무엇이 다를까

`LaunchedEffect`를 공부하다 보면 `rememberCoroutineScope`도 같이 보인다.

둘 다 코루틴과 관련 있지만 쓰임새가 다르다.

```text
LaunchedEffect
-> Composable 안에서 자동으로 시작되는 코루틴
-> key 변화에 따라 취소/재시작
-> 화면 진입 시 collect, delay, animation 같은 작업에 적합

rememberCoroutineScope
-> 직접 launch할 수 있는 CoroutineScope를 얻음
-> 클릭 이벤트 같은 곳에서 수동으로 코루틴 실행
-> snackbar, bottom sheet, 사용자 액션 처리에 적합
```

예를 들어 버튼을 눌렀을 때 snackbar를 띄우는 코드는 `rememberCoroutineScope`가 더 자연스럽다.

```kotlin
val scope = rememberCoroutineScope()

Button(
    onClick = {
        scope.launch {
            snackbarHostState.showSnackbar("완료되었습니다")
        }
    }
) {
    Text("저장")
}
```

그래서 `LaunchedEffect`는 디바운스, `rememberCoroutineScope`는 스로틀링처럼 외우기보다는 이렇게 보는 편이 정확하다.

```text
LaunchedEffect
-> 상태나 key 변화에 반응해 Compose가 관리하는 코루틴

rememberCoroutineScope
-> 사용자 이벤트 안에서 내가 직접 launch하는 코루틴 손잡이
```

`rememberCoroutineScope`는 다음 글에서 따로 정리해도 좋을 주제다.

## 언제 쓰면 좋을까

`LaunchedEffect`는 이런 상황에 잘 맞는다.

```text
화면 진입 시 한 번 실행할 작업
Composable 생명주기 동안 Flow를 collect해야 하는 작업
특정 key가 바뀔 때마다 다시 실행해야 하는 suspend 작업
Snackbar나 navigation 같은 UI 관련 side effect 처리
애니메이션을 시작하거나 반복하는 작업
```

반대로 아래처럼 여러 번 실행되면 위험한 작업을 Composable 본문에 직접 두는 것은 피하는 편이 좋다.

```text
Flow collect
launch
navigation 호출
snackbar 표시
API 요청 트리거
analytics 전송
```

Composable 본문에는 "어떻게 그릴지"를 두고, 실제 실행은 effect API 안으로 옮기는 것이다.

## 출시 시점도 살짝 보기

`LaunchedEffect`라는 이름은 Compose 초창기부터 있었다.

공식 Compose Runtime 릴리스 노트 기준으로는 `1.0.0-alpha07`, 2020년 11월 11일에 `LaunchedTask`가 `LaunchedEffect`로 이름이 바뀌었다.

정식 stable 기준으로는 Compose Runtime `1.0.0`이 2021년 7월 28일에 출시되었고, `LaunchedEffect`도 그 stable API 흐름 안에 포함되었다.

이름이 `LaunchedTask`에서 `LaunchedEffect`가 된 이유도 의미가 있다.

```text
SideEffect
DisposableEffect
LaunchedEffect
```

Compose의 effect API들과 이름을 맞춘 것이다. 단순히 "작업"이라는 뜻의 Task보다, Compose 안에서 side effect를 실행하는 API라는 의미가 더 분명해진다.

## 한 문장으로 정리하기

`LaunchedEffect`를 처음 볼 때는 어렵지만, 결국 세 가지를 잡으면 된다.

```text
1. Composition에 들어오면 코루틴을 시작한다.
2. Composition에서 나가면 코루틴을 취소한다.
3. key가 바뀌면 기존 코루틴을 취소하고 새로 시작한다.
```

`BalanceScreen`에서는 이 역할이 명확하다.

```text
state는 collectAsState()로 구독해서 화면을 다시 그린다.
effect는 LaunchedEffect(Unit)으로 한 번 수집을 시작한다.
event는 버튼 클릭에서 ViewModel로 올려보낸다.
```

이 구분이 잡히면 Compose 화면 코드가 훨씬 덜 섞여 보인다.

화면은 State를 받아 그리고, Event를 올리고, Effect를 받아 한 번 처리한다.

그 사이에서 `LaunchedEffect`는 "화면 생명주기 안에서 안전하게 코루틴을 실행하는 자리"를 만들어준다.

## 참고하면 좋은 공식 문서

- [Android Developers - Side-effects in Compose](https://developer.android.com/develop/ui/compose/side-effects)
- [Android Developers - Compose Runtime release notes](https://developer.android.com/jetpack/androidx/releases/compose-runtime)
- [Kotlin Docs - Coroutines basics](https://kotlinlang.org/docs/coroutines-basics.html)
