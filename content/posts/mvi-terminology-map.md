---
title: "MVI 용어 지도: Intent, Event, Action은 같은 말일까?"
date: "2026-06-05"
category: "Android"
group: "Android Basics"
series: "Android Basics"
tags: ["android", "mvi", "mvvm", "compose", "ui-state", "viewmodel", "architecture"]
description: "MVI, Android Compose, Redux에서 Intent, Event, Action, UiState, Effect 같은 용어가 어떻게 대응되는지 정리합니다."
---

![MVI 용어 지도](/images/mvi-terminology-cover.png)

Android 화면 구조를 공부하다 보면 `State`, `Event`, `Effect` 같은 단어가 한꺼번에 나온다. 조금 더 MVI 쪽 글을 보면 `Intent`가 나오고, Redux 글을 보면 `Action`이 나온다.

처음에는 단어가 너무 많아서 헷갈린다.

```text
Event라고 해도 될 것 같은데 왜 Intent라고 하지?
UiState랑 ViewState는 다른 걸까?
Effect랑 SideEffect는 같은 말일까?
```

이 글은 각 패턴을 깊게 설명하는 글은 아니다. 대신 머릿속에 용어 지도를 하나 만들어두는 글이다.

핵심은 이거다.

```text
이름은 달라도 역할이 같으면 같은 칸에 놓고 보면 된다.
```

## 먼저 한 장으로 보기

비슷한 개념이 플랫폼과 커뮤니티마다 다른 이름으로 불린다.

![플랫폼별 MVI 용어 비교](/images/mvi-terminology-comparison.png)

가장 큰 축은 세 개다.

```text
UI에서 올라오는 입력
화면이 그릴 상태
한 번만 처리할 명령
```

이 세 칸만 먼저 잡으면 용어가 훨씬 덜 흔들린다.

## 용어 대응표

실무에서 자주 만나는 이름을 표로 묶으면 이렇게 볼 수 있다.

| 역할 | Android Compose/MVVM 쪽 | MVI 쪽 | Redux 쪽 | 흔한 다른 이름 |
|---|---|---|---|---|
| UI에서 올라오는 입력 | `UiEvent`, `Event` | `Intent` | `Action` | `UserAction`, `Message`, `Input` |
| 화면이 계속 그릴 값 | `UiState` | `State`, `ViewState` | `State` | `ScreenState`, `ViewState` |
| 한 번만 처리할 명령 | `UiEffect`, `Effect` | `Effect`, `SideEffect` | middleware/thunk/saga 쪽 effect | `OneShotEvent`, `Command`, `NavigationEvent` |
| 상태 변경 함수 | ViewModel 내부 로직 | `Reducer` | `Reducer` | `reduce`, `updateState` |
| 외부 작업 | Repository, UseCase | Side effect 처리 | middleware, thunk, saga | API call, navigation, logging |

정확히 1:1로 완전히 같은 개념이라고 말하기는 어렵다. 각 패턴이 나온 배경이 다르기 때문이다. 하지만 화면을 구현할 때는 대체로 이렇게 묶어 이해하면 충분하다.

```text
Event / Intent / Action
-> 화면 밖에서 들어온 입력

State / UiState / ViewState
-> 화면이 지금 그릴 데이터

Effect / UiEffect / SideEffect
-> 상태로 남기지 않고 한 번 처리할 일
```

## Android에서는 Event가 더 익숙하다

Android 공식 문서나 Compose 예제를 보면 보통 `Intent`보다 `event`, `UI event`, `UiState` 같은 표현이 더 자연스럽다.

Compose에서는 화면을 이렇게 설계하라고 많이 설명한다. 여기서 아래와 위는 화면의 위아래가 아니라 **컴포저블 계층의 부모/자식 방향**이다.

```text
부모 화면
  -> 자식 컴포저블로 State를 내려보낸다

자식 컴포저블
  -> 부모 화면으로 Event를 올린다
```

예를 들어 `SearchRoute`가 ViewModel을 알고 있는 부모 화면이고, `SearchScreen`이 실제 UI를 그리는 자식 컴포저블이라고 해보자.

```kotlin
@Composable
fun SearchRoute(viewModel: SearchViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    SearchScreen(
        state = state,
        onQueryChange = { query ->
            viewModel.onEvent(SearchUiEvent.QueryChanged(query))
        },
        onSearch = {
            viewModel.onEvent(SearchUiEvent.SearchSubmitted)
        },
    )
}
```

여기서 `state`는 부모인 `SearchRoute`에서 자식인 `SearchScreen`으로 내려간다.

```kotlin
SearchScreen(
    state = state,
    ...
)
```

반대로 사용자가 검색어를 입력하거나 검색 버튼을 누르는 일은 자식인 `SearchScreen` 안에서 발생한다. 하지만 `SearchScreen`이 직접 ViewModel을 만지지 않고, callback으로 부모에게 알려준다.

```kotlin
onQueryChange = { query ->
    viewModel.onEvent(SearchUiEvent.QueryChanged(query))
}
```

이걸 "event를 위로 올린다"라고 말한다.

정리하면 이런 흐름이다.

```text
ViewModel
-> SearchRoute
-> SearchScreen
-> 사용자가 입력
-> SearchRoute callback
-> ViewModel.onEvent(...)
```

그래서 `onQueryChange`, `onSearch`는 단순한 함수 파라미터처럼 보이지만, 실제로는 UI event를 부모 쪽으로 올리는 통로다.

ViewModel에서는 이렇게 받을 수 있다.

```kotlin
fun onEvent(event: SearchUiEvent) {
    when (event) {
        is SearchUiEvent.QueryChanged -> updateQuery(event.query)
        SearchUiEvent.SearchSubmitted -> search()
    }
}
```

그래서 Android 팀 컨벤션만 본다면 `UiEvent`, `UiState`, `UiEffect`가 가장 덜 헷갈리는 이름일 수 있다.

```text
SearchUiEvent
SearchUiState
SearchUiEffect
```

특히 Android에는 이미 `android.content.Intent`가 있다. 그래서 `SearchIntent`라는 이름을 보면 처음에는 "Activity 이동에 쓰는 Intent인가?" 하고 헷갈릴 여지가 있다.

## 그럼 MVI에서는 왜 Intent라고 할까

MVI의 `Intent`는 Android framework의 `Intent`가 아니다. 여기서 Intent는 "사용자의 의도"에 가깝다.

예를 들어 검색 화면에서 사용자가 검색 버튼을 눌렀다고 하자.

이걸 `Event`로 보면 이렇게 말할 수 있다.

```text
검색 버튼이 눌렸다.
```

이걸 `Intent`로 보면 조금 다르게 말한다.

```text
사용자가 현재 검색어로 검색하고 싶어 한다.
```

둘 다 맞다. 다만 관점이 다르다.

`Event`는 발생한 사실에 초점이 있고, `Intent`는 ViewModel이나 Store가 처리해야 할 의도에 초점이 있다.

```kotlin
sealed interface SearchIntent {
    data class QueryChanged(val query: String) : SearchIntent
    data object SearchSubmitted : SearchIntent
    data class ToggleFavorite(val itemId: String) : SearchIntent
}
```

이 이름은 다음처럼 읽을 수 있다.

| 코드 | 의미 |
|---|---|
| `QueryChanged` | 검색어를 이 값으로 바꾸려는 의도 |
| `SearchSubmitted` | 현재 검색어로 검색하려는 의도 |
| `ToggleFavorite` | 이 아이템의 즐겨찾기 상태를 바꾸려는 의도 |

그래서 면접에서 "왜 Event가 아니라 Intent라고 했나요?"라고 물으면 이렇게 답할 수 있다.

```text
UI에서 발생한 사실 자체보다 ViewModel이 처리할 사용자의 의도를 표현하고 싶었습니다.
그래서 MVI/UDF 관점에서 Intent라는 이름을 사용했습니다.
다만 Android framework Intent와 혼동될 수 있어 팀 컨벤션에 따라 UiEvent로 바꾸는 것도 합리적이라고 봅니다.
```

## Redux에서는 Action이라고 부른다

Redux 쪽에서는 보통 `Action`이라는 이름을 쓴다.

```js
{ type: "search/queryChanged", payload: "kakao" }
{ type: "search/submitted" }
```

Action은 Store에 "이런 일이 일어났다" 또는 "이 변경을 처리해라"라고 전달되는 객체다.

Redux 흐름은 보통 이렇게 설명한다.

```text
Action
-> Reducer
-> State
-> UI
```

Android MVI식 이름으로 바꿔 읽으면 대략 이렇게 된다.

```text
Intent 또는 Event
-> reduce/updateState
-> UiState
-> UI
```

그래서 `Action`, `Intent`, `Event`는 많은 경우 같은 자리에 놓고 볼 수 있다.

## State 이름은 비교적 덜 헷갈린다

상태 쪽은 이름이 비교적 비슷하다.

```text
State
UiState
ViewState
ScreenState
```

다만 Android에서는 `UiState`라는 이름이 꽤 실용적이다.

```kotlin
data class SearchUiState(
    val query: String = "",
    val isLoading: Boolean = false,
    val results: List<SearchResult> = emptyList(),
    val requestError: SearchRequestError? = null,
)
```

`UiState`라고 쓰면 이 값이 "도메인 상태 전체"가 아니라 "UI가 그릴 상태"라는 점이 드러난다.

예를 들어 서버 응답 DTO나 DB entity를 그대로 state에 넣는 것이 아니라, 화면에 필요한 형태로 정리한 값이라는 뜻이다.

```text
Repository 결과
-> ViewModel에서 화면용으로 가공
-> UiState
-> 화면 렌더링
```

그래서 Android 과제나 실무 코드에서는 `State`보다 `UiState`가 더 설명력이 좋은 경우가 많다.

## Effect는 왜 따로 둘까

가장 자주 헷갈리는 부분은 `Effect`다.

![UiState와 Effect 판단 기준](/images/mvi-state-effect-decision.png)

기준은 단순하다.

```text
화면에 남아 있어야 하면 UiState
한 번 실행하고 끝나야 하면 Effect
```

예를 들어 로딩은 화면 상태다.

```kotlin
data class SearchUiState(
    val isLoading: Boolean = false,
)
```

검색 결과도 화면 상태다.

```kotlin
data class SearchUiState(
    val results: List<SearchResult> = emptyList(),
)
```

사용자가 닫기 전까지 떠 있는 에러 다이얼로그도 상태로 볼 수 있다.

```kotlin
data class SearchUiState(
    val requestError: SearchRequestError? = null,
)
```

반면 화면 이동은 상태로 남겨두기 애매하다.

```kotlin
sealed interface DetailEffect {
    data object Finish : DetailEffect
}
```

`Finish`는 화면에 계속 보여줄 데이터가 아니다. Fragment나 NavController에게 `navigateUp()`을 한 번 실행하라고 알려주는 명령이다.

그래서 effect로 분리한다.

```kotlin
viewModel.effect.collect { effect ->
    when (effect) {
        DetailEffect.Finish -> findNavController().navigateUp()
    }
}
```

이렇게 분리하면 recomposition이나 lifecycle 재진입 때 같은 navigation이 반복 실행되는 문제를 줄일 수 있다.

## 내 코드에 적용하면

예를 들어 검색 화면 contract를 이렇게 잡을 수 있다.

```kotlin
sealed interface SearchIntent {
    data class QueryChanged(val query: String) : SearchIntent
    data object SearchSubmitted : SearchIntent
    data object LoadNextPage : SearchIntent
    data class ToggleFavorite(val itemId: String) : SearchIntent
    data object DismissError : SearchIntent
}

data class SearchUiState(
    val query: String = "",
    val isInitialLoading: Boolean = false,
    val results: List<SearchResult> = emptyList(),
    val requestError: SearchRequestError? = null,
)
```

이 구조에서는 검색 실패 다이얼로그를 `Effect`로 보내지 않아도 된다.

```text
다이얼로그가 화면에 떠 있다
-> 사용자가 확인을 누를 때까지 유지된다
-> UiState로 관리한다
```

그래서 dismiss도 intent로 올린다.

```kotlin
SearchIntent.DismissError
```

ViewModel은 상태를 지운다.

```kotlin
private fun dismissError() {
    _state.update { it.copy(requestError = null) }
}
```

반대로 상세 화면에서 즐겨찾기가 모두 사라져 화면을 닫아야 한다면 effect가 더 자연스럽다.

```kotlin
sealed interface DetailEffect {
    data object Finish : DetailEffect
}
```

이건 "화면에 표시할 값"이 아니라 "상위 화면으로 돌아가라"는 one-shot 명령이기 때문이다.

## 이름보다 중요한 규칙

결국 이름은 팀마다 달라질 수 있다.

```text
Intent / State / Effect
Event / UiState / UiEffect
Action / State / SideEffect
```

하지만 규칙은 비슷하다.

| 질문 | 답 |
|---|---|
| UI에서 ViewModel로 올라오는 입력인가? | `Event`, `Intent`, `Action` 계열 |
| 화면이 계속 그려야 하는 값인가? | `State`, `UiState`, `ViewState` 계열 |
| 한 번만 실행하고 끝나야 하는가? | `Effect`, `UiEffect`, `Command` 계열 |
| 상태를 어떻게 바꾸는가? | `Reducer`, `updateState`, `copy` |
| 외부 작업은 어디서 하는가? | Repository, UseCase, middleware, side effect 처리 |

그래서 네이밍을 고를 때는 먼저 팀 컨벤션을 확인하는 것이 좋다.

내가 Android Compose 프로젝트에서 새로 정한다면 가장 무난한 조합은 이쪽이다.

```text
SearchUiEvent
SearchUiState
SearchUiEffect
```

Android 개발자가 읽었을 때 framework `Intent`와 부딪히지 않고, 셋 다 `Ui` 접두어로 묶이기 때문이다.

하지만 MVI 의도를 더 드러내고 싶다면 이 조합도 충분히 가능하다.

```text
SearchIntent
SearchUiState
SearchEffect
```

이 경우에는 문서나 README에 규칙을 한 줄로 적어두면 좋다.

```text
UI 입력은 Intent, 화면 렌더링 상태는 UiState, one-shot 명령은 Effect로 부른다.
```

## 면접에서 말하는 법

면접에서는 용어를 외운 것처럼 말하기보다, 왜 그렇게 나눴는지 말하는 편이 좋다.

예를 들어 `Intent`를 사용한 이유는 이렇게 설명할 수 있다.

```text
MVVM 기반이지만 UI와 ViewModel 사이의 흐름은 MVI/UDF 형태로 설계했습니다.
UI 입력을 단순 event보다 사용자의 의도로 보고 Intent라고 이름 붙였습니다.
예를 들어 SearchSubmitted는 검색 버튼 클릭 사실보다 현재 검색어로 검색하려는 의도를 나타냅니다.
```

그리고 단점도 같이 말하면 더 좋다.

```text
다만 Android에는 framework Intent가 있어 혼동될 수 있다는 점은 알고 있습니다.
팀 컨벤션이 UiEvent라면 그 이름도 충분히 합리적이라고 생각합니다.
이번 코드에서는 Intent, UiState, Effect의 역할 구분을 문서화하는 쪽을 선택했습니다.
```

`Effect`에 대한 답변은 이렇게 가져갈 수 있다.

```text
화면에 지속적으로 남는 값은 UiState로 두고,
네비게이션처럼 한 번만 실행해야 하는 명령은 Effect로 분리했습니다.
검색 실패 다이얼로그는 사용자가 닫기 전까지 화면에 존재하므로 requestError 상태로 관리했고,
상세 화면 종료는 navigateUp을 한 번 실행하는 명령이므로 DetailEffect.Finish로 처리했습니다.
```

이 정도면 단어의 출처보다 설계 기준이 더 잘 보인다.

## 마무리

MVI를 공부할 때 가장 피곤한 부분은 개념보다 이름일 때가 있다.

하지만 머릿속에 세 칸만 만들면 정리가 된다.

```text
입력: Event / Intent / Action
상태: State / UiState / ViewState
명령: Effect / UiEffect / SideEffect
```

이름은 팀과 플랫폼에 맞게 고르면 된다. 중요한 것은 같은 화면 안에서 기준이 흔들리지 않는 것이다.

```text
남아 있으면 State
한 번이면 Effect
사용자 입력이면 Event 또는 Intent 또는 Action
```

이렇게 기억하면 `Intent`, `Event`, `Action`이 한꺼번에 나와도 같은 자리에 놓고 비교할 수 있다.

## 참고

- [Android Developers: UI events](https://developer.android.com/topic/architecture/ui-layer/events)
- [Android Developers: Compose architecture](https://developer.android.com/develop/ui/compose/architecture)
- [Redux: State, Actions, and Reducers](https://redux.js.org/tutorials/fundamentals/part-3-state-actions-reducers)
- [[mvi-basic-counter-sample|MVI Counter 샘플로 상태 흐름 이해하기]]
- [[android-ui-state-layer-compose|안정적인 Compose 화면을 위한 UI State 설계]]
