---
title: "Compose derivedStateOf, 파생 상태가 헷갈릴 때"
date: "2025-10-23"
category: "Android"
group: "Compose State"
series: "Compose State"
tags: ["jetpack-compose", "derivedstateof", "remember", "state", "recomposition", "kotlin"]
description: "derivedStateOf가 새로운 State를 만든다는 말, remember와의 차이, key가 필요한 경우, 그리고 굳이 쓰지 않아도 되는 경우를 차근차근 정리합니다."
---

![Compose derivedStateOf, 파생 상태가 헷갈릴 때](/images/compose-derivedstateof-cover.png)

Compose 코드를 읽다 보면 이런 코드를 만난다.

```kotlin
val favoriteIds by remember(state.favorites) {
    derivedStateOf {
        state.favorites.map { it.id }.toSet()
    }
}
```

처음에는 여러 질문이 한꺼번에 튀어나온다.

```text
remember만 쓰면 되는 것 아닌가?
derivedStateOf는 새로운 State를 만든다는 건가?
by는 .value만 꺼내는 것 아닌가?
state.favorites는 Compose State인가?
key를 빼도 되는가?
```

이 글은 그 질문을 하나씩 풀어보는 글이다.

먼저 결론부터 적어두면 이렇다.

```text
derivedStateOf는 다른 상태나 값으로부터
계산된 읽기 전용 Compose State를 만들 때 사용한다.
```

조금 더 실전적으로 말하면 이렇다.

```text
원본 값은 자주 바뀌는데
UI가 실제로 관심 있는 계산 결과는 덜 자주 바뀔 때
derivedStateOf가 의미 있다.
```

반대로 단순히 리컴포지션 때 계산을 다시 하고 싶지 않은 목적이라면 `remember(key)`만으로 충분한 경우가 많다.

## 먼저 State와 값부터 나누기

Compose에서 `State`라고 하면 보통 이 타입을 말한다.

```kotlin
androidx.compose.runtime.State<T>
```

간단히 보면 이런 형태다.

```kotlin
interface State<out T> {
    val value: T
}
```

즉 `State<T>`는 `T` 타입의 값을 담고 있는 Compose용 상태 객체다.

예를 들어 아래 코드는 `String` 값을 담는 `MutableState`를 만든다.

```kotlin
var username by remember {
    mutableStateOf("")
}
```

`by`를 걷어내면 이런 느낌이다.

```kotlin
val usernameState = remember {
    mutableStateOf("")
}

val username = usernameState.value
```

중요한 점은 이것이다.

```text
Compose가 관찰하는 기준은
Composable 실행 중 State.value가 읽혔는가이다.
```

`by`는 마법이 아니다. `.value`를 편하게 꺼내 쓰게 해주는 Kotlin 위임 문법이다.

```kotlin
val name by nameState
```

는 사실상 아래처럼 값을 읽는 것과 같다.

```kotlin
val name = nameState.value
```

그래서 Compose는 Composable 실행 중에 `State.value`가 읽히면 기록해둔다.

```text
이 Composable은 이 State 값을 읽었구나.
나중에 이 State 값이 바뀌면 다시 실행 대상으로 볼 수 있겠다.
```

이게 리컴포지션과 연결된다.

## derivedStateOf는 계산된 State를 만든다

`derivedStateOf`는 이름 그대로 파생된 상태를 만든다.

파생 상태는 어렵게 들리지만, 뜻은 단순하다.

```text
원본 값을 직접 저장하는 것이 아니라
원본 값으로부터 계산해서 만든 값
```

예를 들어 사용자 이름을 입력받는 화면이 있다고 해보자.

```kotlin
var username by remember {
    mutableStateOf("")
}

val submitEnabled by remember {
    derivedStateOf {
        isUsernameValid(username)
    }
}
```

여기서 원본은 `username`이다.

```text
username = 원본 상태
submitEnabled = username으로 계산한 파생 상태
```

사용자가 입력할 때마다 `username`은 바뀐다.

```text
""
"j"
"ja"
"jaemin"
```

하지만 버튼 입장에서는 `username` 문자열 전체가 중요한 것이 아니다.

```text
제출 버튼을 활성화할 수 있는가?
```

즉 UI가 실제로 읽는 값은 `submitEnabled`다.

![username에서 submitEnabled가 계산되는 흐름](/images/compose-derivedstateof-username-flow.png)

코드로 보면 이런 식이다.

```kotlin
Button(
    enabled = submitEnabled,
    onClick = onSubmit,
) {
    Text("Submit")
}
```

여기서 `enabled = submitEnabled`가 파생 상태를 읽는 지점이다.

`by`를 쓰지 않으면 더 노골적으로 보인다.

```kotlin
val submitEnabledState = remember {
    derivedStateOf {
        isUsernameValid(username)
    }
}

Button(
    enabled = submitEnabledState.value,
    onClick = onSubmit,
) {
    Text("Submit")
}
```

결국 `derivedStateOf`가 만든 것은 `Boolean` 자체가 아니라 `State<Boolean>`이다.

```kotlin
val submitEnabledState: State<Boolean> =
    derivedStateOf {
        isUsernameValid(username)
    }
```

그리고 `by`를 쓰면 `State<Boolean>.value`를 꺼내서 `Boolean`처럼 쓰게 된다.

## remember와 derivedStateOf는 역할이 다르다

여기서 많이 헷갈린다.

```text
리컴포지션 때 값을 유지하고 싶다
```

이 말은 주로 `remember`의 역할이다.

```kotlin
val formatter = remember {
    SimpleDateFormat("yyyy-MM-dd", Locale.KOREA)
}
```

이 코드는 첫 composition 때 `SimpleDateFormat` 객체를 만들고, 리컴포지션 때는 같은 객체를 재사용한다.

```text
remember
-> 리컴포지션이 와도 객체나 계산 결과를 기억한다.
```

반면 `derivedStateOf`는 계산된 상태를 만든다.

```text
derivedStateOf
-> 다른 상태나 값으로부터 계산되는 State를 만든다.
```

역할을 분리하면 이렇게 볼 수 있다.

![remember와 derivedStateOf의 역할 차이](/images/compose-derivedstateof-remember-vs-derived.png)

`remember`는 상자를 기억한다.

```text
같은 key면 이전 상자를 그대로 쓴다.
```

`derivedStateOf`는 계산식을 가진 State를 만든다.

```text
입력은 바뀌어도 계산 결과가 같으면
파생 상태의 값은 그대로다.
```

그래서 둘을 같이 쓰는 코드는 이렇게 읽으면 된다.

```kotlin
val showButton by remember {
    derivedStateOf {
        listState.firstVisibleItemIndex > 0
    }
}
```

```text
remember
-> derivedStateOf로 만든 State 객체를 기억한다.

derivedStateOf
-> firstVisibleItemIndex로 showButton 값을 계산한다.
```

## key가 없으면 언제 괜찮을까

`remember`는 key 없이도 쓸 수 있다.

```kotlin
val listState = rememberLazyListState()
```

또는:

```kotlin
val formatter = remember {
    SimpleDateFormat("yyyy-MM-dd", Locale.KOREA)
}
```

key가 없으면 뜻은 이렇다.

```text
처음 한 번 만들고
이 Composable이 composition에 남아 있는 동안 계속 재사용한다.
```

그런데 기억할 값이 외부 값에 의존한다면 key가 필요하다.

```kotlin
val canSearch = remember(query) {
    query.length >= 2
}
```

여기서 key는 `query`다.

```text
query가 같으면 이전 canSearch 재사용
query가 바뀌면 다시 계산
```

이때 `remember`가 기억하는 것은 `query`가 아니다.

```text
remember(query)는 query를 기억하는 것이 아니라
query를 기준으로 블록의 결과값을 기억한다.
```

즉 이 코드에서 유지되는 값은 `canSearch`다.

```text
query가 "a"일 때 canSearch = false
query가 그대로면 false 재사용
query가 "ab"로 바뀌면 true로 다시 계산
```

## derivedStateOf에 key가 없는 예시

다시 이 코드를 보자.

```kotlin
var username by remember {
    mutableStateOf("")
}

val submitEnabled by remember {
    derivedStateOf {
        isUsernameValid(username)
    }
}
```

여기서 `remember`에는 key가 없다.

```kotlin
remember {
    derivedStateOf { ... }
}
```

그래도 괜찮은 이유는 `username`이 Compose가 추적할 수 있는 상태이기 때문이다.

```kotlin
var username by remember {
    mutableStateOf("")
}
```

`derivedStateOf` 안에서 `username`을 읽으면, 내부적으로는 `usernameState.value`를 읽는 것이다. Compose snapshot 시스템은 그 읽기를 추적할 수 있다.

그래서 `username`이 바뀌면 `derivedStateOf`는 계산 결과를 다시 볼 수 있다.

반대로 이런 경우는 조심해야 한다.

```kotlin
@Composable
fun SearchResultContent(
    state: SearchUiState,
) {
    val favoriteIds by remember {
        derivedStateOf {
            state.favorites.map { it.id }.toSet()
        }
    }
}
```

문법적으로는 가능하다.

하지만 이 경우 `state.favorites`는 `SearchUiState` 안의 일반 프로퍼티다.

```kotlin
state: SearchUiState
state.favorites
```

`state`는 위쪽에서 새 값으로 다시 전달될 수 있다.

```text
ViewModel StateFlow
-> collectAsStateWithLifecycle()
-> 새 SearchUiState
-> SearchResultContent(state)
```

그런데 key 없는 `remember`는 처음 만든 `derivedStateOf` 객체를 계속 재사용한다. 이때 처음 composition 당시의 `state`를 기준으로 잡아버리면, 나중에 새 `state`가 들어와도 예전 값을 보는 문제가 생길 수 있다.

그래서 이런 경우에는 key를 주는 편이 안전하고 의도가 분명하다.

```kotlin
val favoriteIds by remember(state.favorites) {
    derivedStateOf {
        state.favorites.map { it.id }.toSet()
    }
}
```

![remember key가 필요한 경우](/images/compose-derivedstateof-remember-key-warning.png)

이 코드는 이렇게 읽는다.

```text
state.favorites가 같으면
-> 기존 derivedStateOf 객체 재사용

state.favorites가 바뀌면
-> remember 블록 다시 실행
-> 새 derivedStateOf 생성
-> 새 favorites 기준으로 favoriteIds 계산
```

## 그런데 favoriteIds에는 derivedStateOf가 꼭 필요할까

이제 핵심 질문으로 돌아오자.

```kotlin
val favoriteIds by remember(state.favorites) {
    derivedStateOf {
        state.favorites.map { it.id }.toSet()
    }
}
```

이 코드에서 `derivedStateOf`는 필수일까?

내 생각에는 이 상황에서는 필수는 아니다.

왜냐하면 이 코드의 목적은 대부분 이것이기 때문이다.

```text
state.favorites가 바뀌지 않았으면
map + toSet을 다시 하지 말자.
```

그 목적은 `remember(state.favorites)`만으로도 충분히 달성된다.

```kotlin
val favoriteIds = remember(state.favorites) {
    state.favorites.map { it.id }.toSet()
}
```

이 코드는 이렇게 동작한다.

```text
첫 composition
-> map + toSet 실행
-> favoriteIds 기억

리컴포지션 발생
-> state.favorites가 같음
-> 이전 favoriteIds 재사용

state.favorites 변경
-> key 변경
-> map + toSet 다시 실행
-> 새 favoriteIds 기억
```

따라서 단순 캐싱 목적이라면 아래 코드가 더 읽기 쉽다.

```kotlin
val favoriteIds = remember(state.favorites) {
    state.favorites.map { it.id }.toSet()
}
```

`derivedStateOf`를 붙이면 `favoriteIds`가 `state.favorites`에서 계산된 파생 상태라는 표현은 된다.

하지만 코드의 의도에 비해 복잡해질 수 있다.

## derivedStateOf가 진짜 잘 맞는 경우

`derivedStateOf`가 잘 맞는 대표적인 상황은 스크롤 임계값이다.

```kotlin
val listState = rememberLazyListState()

val showButton by remember {
    derivedStateOf {
        listState.firstVisibleItemIndex > 0
    }
}

AnimatedVisibility(visible = showButton) {
    ScrollToTopButton()
}
```

여기서 `firstVisibleItemIndex`는 현재 화면에서 첫 번째로 보이는 리스트 아이템의 index다.

```text
맨 위
-> firstVisibleItemIndex = 0

조금 내려가서 1번 아이템이 첫 번째가 됨
-> firstVisibleItemIndex = 1

더 내려감
-> firstVisibleItemIndex = 2, 3, 4 ...
```

스크롤하면 원본 값은 계속 바뀐다.

```text
0 -> 1 -> 2 -> 3 -> 4 -> 5
```

하지만 UI가 관심 있는 값은 이것뿐이다.

```text
맨 위를 지났는가?
```

즉 결과는 이렇게 바뀐다.

```text
false -> true -> true -> true -> true
```

의미 있는 변화는 `false`에서 `true`가 되는 순간이다.

이런 상황에서는 `derivedStateOf`가 잘 맞는다.

```text
원본 상태는 자주 바뀐다.
하지만 계산 결과는 덜 자주 바뀐다.
UI는 계산 결과만 읽으면 된다.
```

![derivedStateOf가 잘 맞는 경우와 remember만으로 충분한 경우](/images/compose-derivedstateof-good-fit-vs-enough.png)

Android 공식 문서에서도 이 스크롤 버튼 예시를 `derivedStateOf`의 적절한 사용 사례로 든다. `firstVisibleItemIndex`는 스크롤 중 자주 바뀌지만, 버튼 표시 여부는 첫 번째 아이템을 지났는지만 보면 되기 때문이다.

## derivedStateOf가 과한 경우

반대로 이런 코드는 보통 필요 없다.

```kotlin
var firstName by remember { mutableStateOf("") }
var lastName by remember { mutableStateOf("") }

val fullName by remember {
    derivedStateOf {
        "$firstName $lastName"
    }
}
```

이 경우 `fullName`은 `firstName`이나 `lastName`이 바뀔 때마다 같이 바뀌어야 한다.

```text
firstName 변경
-> fullName 변경

lastName 변경
-> fullName 변경
```

원본의 변화 빈도와 결과의 변화 빈도가 거의 같다.

그렇다면 그냥 이렇게 쓰는 편이 낫다.

```kotlin
val fullName = "$firstName $lastName"
```

이건 `favoriteIds` 예시와도 닮아 있다.

```kotlin
val favoriteIds = remember(state.favorites) {
    state.favorites.map { it.id }.toSet()
}
```

`state.favorites`가 바뀌면 `favoriteIds`도 대부분 바뀐다.

```text
favorites = [A, B]
favoriteIds = {A, B}

favorites = [A, B, C]
favoriteIds = {A, B, C}
```

원본이 바뀔 때 결과도 같이 바뀌는 구조다.

그리고 `remember(state.favorites)`가 이미 `favorites가 바뀔 때만 다시 계산`을 처리한다.

따라서 이 경우에는 `derivedStateOf`가 틀렸다고까지 말할 필요는 없지만, 꼭 필요한 코드라고 보기는 어렵다.

## 읽는다는 말의 의미

`derivedStateOf`로 만든 값은 읽힐 때 의미가 생긴다.

```kotlin
val submitEnabled by remember {
    derivedStateOf {
        isUsernameValid(username)
    }
}
```

만들기만 하고 아무 데서도 쓰지 않으면 UI에 아무 영향이 없다.

```kotlin
Text("회원가입")
```

이 경우 `submitEnabled`는 필요 없는 값이다.

읽는다는 것은 이런 식으로 실제 UI 조건이나 파라미터에 사용하는 것이다.

```kotlin
Button(
    enabled = submitEnabled,
    onClick = onSubmit,
) {
    Text("Submit")
}
```

또는:

```kotlin
if (submitEnabled) {
    Text("입력값이 유효합니다")
}
```

`favoriteIds`도 마찬가지다.

```kotlin
val favoriteIds = remember(state.favorites) {
    state.favorites.map { it.id }.toSet()
}
```

이 값은 아래에서 읽힐 때 의미가 있다.

```kotlin
MediaListItem(
    item = item,
    isFavorite = item.id in favoriteIds,
)
```

여기서 `item.id in favoriteIds`는 현재 아이템이 즐겨찾기인지 확인하는 코드다.

```text
현재 검색 결과 item의 id가
즐겨찾기 id 집합 안에 있는가?
```

## 다시 한 줄로 정리하기

`remember`는 값을 기억한다.

```text
리컴포지션이 와도
key가 같으면 이전 값을 재사용한다.
```

`derivedStateOf`는 계산된 State를 만든다.

```text
다른 상태를 읽어서
그 결과로 새로운 읽기 전용 State를 만든다.
```

그리고 `derivedStateOf`가 특히 의미 있는 경우는 이것이다.

```text
입력은 자주 바뀌지만
결과는 덜 자주 바뀌고
UI는 그 결과만 읽으면 되는 경우
```

그래서 아래 코드는 좋은 예시다.

```kotlin
val showButton by remember {
    derivedStateOf {
        listState.firstVisibleItemIndex > 0
    }
}
```

하지만 아래 코드는 단순하게 쓸 수 있다.

```kotlin
val favoriteIds = remember(state.favorites) {
    state.favorites.map { it.id }.toSet()
}
```

이 코드는 다음 의도가 분명하다.

```text
favorites가 바뀔 때만
id Set을 다시 만들자.
```

만약 원래 코드처럼 작성되어 있다면 이렇게 설명할 수 있다.

```kotlin
val favoriteIds by remember(state.favorites) {
    derivedStateOf {
        state.favorites.map { it.id }.toSet()
    }
}
```

```text
state.favorites를 key로 사용해서
즐겨찾기 목록이 같으면 기존 파생 State를 재사용하고,
즐겨찾기 목록이 바뀌면 새 favorites 기준으로 favoriteIds를 다시 계산한다.

다만 이 경우에는 remember(state.favorites)만으로도 충분해서
derivedStateOf는 필수라기보다 다소 과한 표현일 수 있다.
```

## 판단 기준

`derivedStateOf`를 볼 때는 이 질문을 하면 된다.

```text
원본 값이 바뀌는 빈도보다
계산 결과가 바뀌는 빈도가 확실히 적은가?
```

그렇다면 `derivedStateOf`가 도움이 될 가능성이 있다.

```kotlin
val showButton by remember {
    derivedStateOf {
        listState.firstVisibleItemIndex > 0
    }
}
```

반대로 계산 결과가 원본과 거의 같이 바뀐다면, 단순한 `val`이나 `remember(key)`가 더 낫다.

```kotlin
val fullName = "$firstName $lastName"
```

또는:

```kotlin
val favoriteIds = remember(state.favorites) {
    state.favorites.map { it.id }.toSet()
}
```

정리하면 이렇다.

```text
값을 유지하고 싶다
-> remember

외부 값이 바뀔 때 다시 만들고 싶다
-> remember(key)

상태로부터 계산된 결과를 만들고,
그 결과 변경만 UI가 관심 있게 만들고 싶다
-> derivedStateOf
```

`derivedStateOf`는 어려운 문법이라기보다, 쓰는 상황이 좁은 도구에 가깝다. 이름 때문에 커 보이지만, 핵심은 작다.

```text
자주 바뀌는 입력에서
UI가 필요한 결과만 뽑아내는 읽기 전용 State
```

이렇게 기억하면 된다.

## 참고

- Android Developers, [Side-effects in Compose](https://developer.android.com/develop/ui/compose/side-effects)
- Android Developers, [Lazy lists and lazy grids](https://developer.android.com/develop/ui/compose/lists)
- Android Developers, [Jetpack Compose phases](https://developer.android.com/develop/ui/compose/phases)
