---
title: "코틀린 copy() 문법 이해하기"
date: "2025-10-23"
category: "Kotlin"
group: "Kotlin Basics"
series: "Kotlin Basics"
tags: ["kotlin", "copy", "data class", "android", "compose", "ui state"]
description: "Kotlin data class의 copy()가 기존 객체를 수정하는 것이 아니라 일부 값만 바꾼 새 객체를 만드는 문법이라는 점을 Android UI State 예시로 정리합니다."
---

![코틀린 copy() 문법 이해하기](/images/kotlin-copy-function-cover.png)

앞에서 [[kotlin-data-class-syntax|코틀린 data class 문법]]을 정리하면서 `copy()`를 짧게 언급했다. 그때는 `data class`가 자동으로 만들어주는 함수 중 하나로 봤다.

그런데 Android 코드를 읽다 보면 `copy()`가 훨씬 자주, 그리고 훨씬 실전적인 모양으로 나온다.

```kotlin
_state.update {
    it.copy(query = query, requestError = null)
}
```

또 Compose 코드에서는 이런 식으로도 보인다.

```kotlin
MaterialTheme.typography.bodyLarge.copy(
    color = MaterialTheme.colorScheme.onSurface,
)
```

처음 보면 질문이 생긴다.

```text
.copy는 무슨 문법이지?
기존 객체를 복사하는 건가?
괄호 안에 쓰는 값만 바뀌는 건가?
```

한 줄로 답하면 이렇다.

```text
copy()는 기존 값을 바탕으로
일부 값만 바꾼 새 객체를 만드는 함수다.
```

여기서 중요한 말은 `기존 객체를 수정`이 아니라 `새 객체를 만든다`다.

## .copy는 특별한 연산자가 아니다

먼저 모양부터 보자.

```kotlin
state.copy(query = "kotlin")
```

이 코드는 `state`라는 객체의 `copy` 함수를 호출하는 코드다.

```text
state.copy(...)
```

`.`은 객체의 멤버에 접근할 때 쓰는 Kotlin 문법이고, `copy(...)`는 함수 호출이다. `+`, `-`, `==` 같은 연산자라기보다는 그냥 함수 호출에 가깝다.

다만 `data class`에서는 Kotlin 컴파일러가 이 `copy()` 함수를 자동으로 만들어준다.

```kotlin
data class User(
    val id: Long,
    val name: String,
    val age: Int,
)
```

이런 `data class`가 있으면 아래처럼 쓸 수 있다.

```kotlin
val user = User(
    id = 1L,
    name = "Jaemin",
    age = 28,
)

val nextUser = user.copy(age = 29)
```

`nextUser`는 `id`, `name`은 그대로 두고 `age`만 바꾼 새 객체다.

![copy는 바뀐 필드만 지정해 새 객체를 만든다](/images/kotlin-copy-function-old-new-object-handdrawn.png)

결과는 이런 느낌이다.

```kotlin
User(
    id = 1L,
    name = "Jaemin",
    age = 29,
)
```

원래 `user`의 `age`가 29로 바뀐 것이 아니다. `user`는 그대로 있고, `age`만 다른 새 `User`가 만들어진다.

## copy의 파라미터는 기본값을 가진다

`copy()`가 편한 이유는 파라미터마다 기본값이 들어 있기 때문이다.

위 `User`를 기준으로 생각하면 컴파일러가 대략 이런 함수를 만들어준다고 볼 수 있다.

```kotlin
fun copy(
    id: Long = this.id,
    name: String = this.name,
    age: Int = this.age,
): User
```

정확한 내부 구현을 외울 필요는 없다. 중요한 감각은 이것이다.

```text
copy()에 넘기지 않은 값은
현재 객체의 값을 그대로 사용한다.
```

그래서 아래 코드는 `age`만 바뀐다.

```kotlin
val nextUser = user.copy(age = 29)
```

`id`와 `name`은 따로 넘기지 않았으므로 기존 값이 들어간다.

여기서 `age = 29`는 Kotlin의 named argument다. 파라미터 이름을 직접 적어서 어떤 값을 바꿀지 명시한다.

```kotlin
user.copy(age = 29)
```

이름 덕분에 코드가 꽤 잘 읽힌다.

```text
user를 복사하되,
age만 29로 바꾼다.
```

## UI State에서 특히 자주 보이는 이유

검색 화면 상태가 있다고 해보자.

```kotlin
data class SearchUiState(
    val query: String = "",
    val selectedTab: SearchTab = SearchTab.SEARCH,
    val pages: List<SearchPage> = emptyList(),
    val favorites: List<MediaItem> = emptyList(),
    // ...
    val isInitialLoading: Boolean = false,
    val isNextPageLoading: Boolean = false,
    val isEndReached: Boolean = false,
    val hasSearched: Boolean = false,
    val requestError: SearchRequestError? = null,
)
```

이 상태는 화면을 그리는 데 필요한 값들을 한곳에 모아둔다.

```text
검색어
선택된 탭
검색 결과 페이지
즐겨찾기 목록
로딩 여부
에러 상태
```

사용자가 검색어를 입력하면 전체 상태 중 `query`가 바뀐다. 그리고 이전 요청 에러가 떠 있었다면 새 입력과 함께 지우고 싶을 수 있다.

이때 기존 상태를 직접 수정하지 않고 새 상태를 만든다.

```kotlin
_state.update {
    it.copy(
        query = query,
        requestError = null,
    )
}
```

이 코드는 이렇게 읽으면 된다.

```text
현재 SearchUiState를 가져온다.
query는 새 검색어로 바꾼다.
requestError는 null로 바꾼다.
나머지 값은 그대로 둔 새 SearchUiState를 만든다.
```

![StateFlow update와 copy 흐름](/images/kotlin-copy-function-stateflow-update-handdrawn.png)

`MutableStateFlow.update`는 현재 값을 람다의 `it`으로 넘겨준다.

```kotlin
_state.update { currentState ->
    currentState.copy(query = query)
}
```

람다 안에서는 다음 상태를 반환해야 한다. 그래서 `copy()`가 잘 맞는다.

```text
현재 상태 -> copy로 다음 상태 생성 -> StateFlow에 새 상태 반영 -> UI 다시 그림
```

Compose나 Android UI 상태 관리에서 `copy()`를 자주 보는 이유가 여기에 있다. 화면 상태를 값처럼 다루면, 어떤 사용자 행동이 어떤 상태 변화를 만들었는지 코드에 잘 남는다.

## 여러 값을 한 번에 바꿀 수도 있다

`copy()`는 하나의 값만 바꿀 때만 쓰는 함수가 아니다.

검색어가 비어 있으면 검색 결과를 초기화해야 한다고 해보자.

```kotlin
_state.update {
    it.copy(
        pages = emptyList(),
        isInitialLoading = false,
        isNextPageLoading = false,
        isEndReached = false,
        hasSearched = false,
        requestError = null,
    )
}
```

이 코드는 길지만 의도는 선명하다.

```text
검색 결과 목록을 비운다.
로딩 상태를 끈다.
마지막 페이지 여부를 초기화한다.
검색한 적 없는 상태로 되돌린다.
에러도 지운다.
```

다른 값은 그대로 둔다. 예를 들어 `selectedTab`을 넘기지 않았다면 현재 선택된 탭은 유지된다.

이게 `copy()`의 장점이다. 전체 상태를 새로 만들면서도, 실제로 바꾸려는 값만 코드에 드러난다.

## copy는 기존 객체를 고치지 않는다

이 부분이 가장 중요하다.

```kotlin
val user = User(
    id = 1L,
    name = "Jaemin",
    age = 28,
)

val nextUser = user.copy(age = 29)
```

이 코드는 `user.age`를 바꾸지 않는다.

```kotlin
println(user.age)     // 28
println(nextUser.age) // 29
```

그래서 `copy()`를 이렇게 이해하면 편하다.

```text
기존 객체를 수정한다
```

가 아니라

```text
기존 객체를 참고해서 새 객체를 만든다
```

다.

Android UI State에서는 이 차이가 중요하다.

```kotlin
data class DetailUiState(
    val items: List<MediaItem> = emptyList(),
    val currentIndex: Int = 0,
    val isFavorite: Boolean = false,
)
```

페이지가 바뀌면 현재 인덱스와 즐겨찾기 여부만 바꾼 새 상태를 만들 수 있다.

```kotlin
_state.update {
    it.copy(
        currentIndex = index,
        isFavorite = favoriteRepository.isFavorite(item.id),
    )
}
```

이전 상태 객체를 몰래 바꾸는 방식이 아니기 때문에 상태 흐름을 추적하기 쉽다.

```text
이전 상태
-> 사용자 행동
-> copy로 만든 새 상태
-> UI 갱신
```

## copy는 얕은 복사다

다만 조심할 점이 있다.

`copy()`는 깊은 복사가 아니라 얕은 복사다.

![copy는 얕은 복사다](/images/kotlin-copy-function-shallow-copy-handdrawn.png)

객체 안에 또 다른 객체나 mutable 컬렉션이 들어 있으면, 그 내부 값까지 자동으로 새로 복사해주지는 않는다.

```kotlin
data class User(
    val name: String,
    val tags: MutableList<String>,
)

val user1 = User(
    name = "Jaemin",
    tags = mutableListOf("android", "kotlin"),
)

val user2 = user1.copy()

user2.tags.add("compose")

println(user1.tags) // [android, kotlin, compose]
println(user2.tags) // [android, kotlin, compose]
```

`user1`과 `user2`는 서로 다른 `User` 객체다. 하지만 `tags`는 같은 `MutableList`를 바라본다.

그래서 한쪽에서 리스트를 바꾸면 다른 쪽에서도 바뀐 것처럼 보인다.

이 문제를 줄이려면 UI State에는 mutable 컬렉션을 직접 넣지 않는 편이 좋다.

```kotlin
data class UserUiState(
    val name: String,
    val tags: List<String>,
)
```

새 태그를 추가해야 한다면 리스트 자체를 새로 만들어 넘기는 식으로 작성한다.

```kotlin
val nextUser = user.copy(
    tags = user.tags + "compose",
)
```

`SearchUiState`의 `pages`, `favorites`도 `List`로 들고 있는 이유를 이런 관점에서 볼 수 있다. 상태를 직접 변경하기보다, 새 리스트나 새 상태를 만들어 내려주는 쪽이 UI 갱신 흐름을 읽기 쉽다.

## body에 있는 값은 copy 파라미터가 아니다

`data class`에서 `copy()`는 주 생성자에 선언된 프로퍼티를 기준으로 만들어진다.

예를 들어 이런 상태가 있다고 해보자.

```kotlin
data class SearchUiState(
    val pages: List<SearchPage> = emptyList(),
    val isInitialLoading: Boolean = false,
) {
    val currentPage: Int = pages.lastOrNull()?.page ?: 0

    val canPersistSearchListScrollPosition: Boolean
        get() = !isInitialLoading && pages.any { it.items.isNotEmpty() }
}
```

여기서 `pages`, `isInitialLoading`은 주 생성자 프로퍼티다. 그래서 `copy()`에서 바꿀 수 있다.

```kotlin
state.copy(
    pages = nextPages,
    isInitialLoading = false,
)
```

하지만 `currentPage`와 `canPersistSearchListScrollPosition`은 클래스 body에 있는 계산 값이다. 그래서 이런 코드는 쓸 수 없다.

```kotlin
state.copy(currentPage = 2) // 불가능
```

`currentPage`는 직접 바꾸는 값이 아니라 `pages`에서 계산되는 값이다. 따라서 페이지를 바꾸고 싶다면 `currentPage`를 수정하는 것이 아니라 `pages`를 바꿔야 한다.

이 차이를 알고 있으면 `data class`를 읽을 때 훨씬 덜 헷갈린다.

```text
주 생성자 프로퍼티
-> copy 파라미터가 된다.

body의 계산 프로퍼티
-> copy 파라미터가 아니다.
```

## 모든 .copy가 data class copy는 아니다

코드에서 보이는 `.copy()`가 전부 `data class`가 자동으로 만든 함수는 아니다.

예를 들어 Compose에서는 이런 코드도 자주 나온다.

```kotlin
MaterialTheme.typography.bodyLarge.copy(
    color = MaterialTheme.colorScheme.onSurface,
)
```

또 색상 테마도 비슷하게 바꿀 수 있다.

```kotlin
MaterialTheme.colorScheme.copy(
    background = Color.White,
)
```

이 경우에도 감각은 비슷하다.

```text
기존 스타일 값을 바탕으로
일부 속성만 바꾼 새 스타일 값을 만든다.
```

다만 이 `copy()`는 Kotlin `data class`가 자동 생성한 함수가 아니라, 해당 타입이 직접 제공하는 함수일 수 있다. 즉 `.copy()`라는 이름은 같지만 출처는 다를 수 있다.

그래도 읽는 방법은 거의 같다.

```text
왼쪽 객체를 기준으로
괄호 안에 적은 값만 바꾼 새 값을 만든다.
```

## 언제 copy를 쓰면 좋을까

`copy()`가 잘 어울리는 상황은 값을 담는 객체에서 일부 값만 바꾸고 싶을 때다.

```text
UI State의 일부 필드 갱신
리스트 아이템의 선택 상태 변경
즐겨찾기 여부 토글
Compose TextStyle, ColorScheme 일부 속성 변경
```

예를 들어 리스트 아이템 하나만 즐겨찾기 상태를 바꾸고 싶다면 `map`과 `copy()`를 함께 쓸 수 있다.

```kotlin
val nextItems = items.map { item ->
    if (item.id == targetId) {
        item.copy(isFavorite = !item.isFavorite)
    } else {
        item
    }
}
```

이 코드는 이렇게 읽힌다.

```text
대상 아이템이면 isFavorite만 바꾼 새 아이템을 만든다.
대상이 아니면 기존 아이템을 그대로 둔다.
```

반대로 아래 같은 객체에는 `copy()`가 꼭 어울리지는 않는다.

```text
Repository
UseCase
네트워크 연결 객체
CoroutineScope나 Context를 오래 들고 있는 객체
생명주기와 리소스를 관리하는 객체
```

이런 객체는 단순한 데이터 그릇이라기보다 동작과 책임이 중심이다. 일부 값을 바꾼 복사본을 만드는 모델과는 잘 맞지 않을 수 있다.

## 자주 헷갈리는 지점 정리

첫 번째, `copy()`는 기존 객체를 수정하지 않는다. 일부 값만 바꾼 새 객체를 만든다.

두 번째, `data class`의 `copy()`는 Kotlin 컴파일러가 주 생성자 프로퍼티를 기준으로 자동 생성한다.

세 번째, `copy(query = "kotlin")`처럼 쓰는 것은 named argument로 특정 파라미터만 바꾸는 코드다.

네 번째, 넘기지 않은 파라미터는 기존 객체의 값을 그대로 사용한다.

다섯 번째, `copy()`는 얕은 복사다. 내부 mutable 객체까지 새로 복사하지 않는다.

여섯 번째, Compose의 `TextStyle.copy()`나 `ColorScheme.copy()`처럼 직접 정의된 `copy()`도 있다. 출처는 다를 수 있지만 "일부 속성만 바꾼 새 값"이라는 읽는 법은 비슷하다.

## 한 줄로 정리하기

`.copy(...)`는 기존 객체를 바탕으로 일부 값만 바꾼 새 객체를 만드는 함수 호출이다.

```kotlin
_state.update {
    it.copy(
        query = query,
        requestError = null,
    )
}
```

이 코드는 이렇게 읽으면 된다.

```text
현재 상태를 직접 고치지 않고,
query와 requestError만 바꾼 다음 상태를 만든다.
```

이전 글에서 `data class`의 기능 중 하나로 `copy()`를 봤다면, 이번에는 Android UI State 흐름 안에서 `copy()`가 왜 자주 등장하는지까지 연결해서 보면 좋다.

상태를 값처럼 다루고, 바뀐 값만 코드에 드러내고, UI는 새 상태를 보고 다시 그린다. 이 흐름이 익숙해지면 `_state.update { it.copy(...) }` 같은 코드는 꽤 편하게 읽힌다.

## 함께 읽기

- [[kotlin-data-class-syntax|코틀린 data class 문법]]
- [[kotlin-collection-map-function|코틀린 컬렉션 함수 map 이해하기]]
- [[android-ui-state-layer-compose|안정적인 Compose 화면을 위한 UI State 설계]]
- [[compose-mutablestateof-state-change|mutableStateOf와 state 변경]]

## 참고자료

- [Kotlin Docs - Data classes](https://kotlinlang.org/docs/data-classes.html)
- [Kotlin Docs - Functions: named arguments](https://kotlinlang.org/docs/functions.html#named-arguments)
- [Android Developers - State and Jetpack Compose](https://developer.android.com/develop/ui/compose/state)
