---
title: "코틀린 함수 참조(function reference) 이해하기"
date: "2025-10-24"
category: "Kotlin"
group: "Kotlin Basics"
series: "Kotlin Basics"
tags: ["kotlin", "function reference", "callable reference", "lambda", "android", "compose"]
description: "코틀린의 :: 함수 참조를 람다와 비교하면서, Android Compose 콜백과 Flow collect 예제로 언제 쓰면 좋은지 정리합니다."
---

![코틀린 함수 참조(function reference) 이해하기](/images/kotlin-function-reference-cover.png)

앞에서 [[kotlin-lambda-function|코틀린 람다함수]]를 정리했다. 람다를 이해하고 나면 Kotlin 코드에서 또 하나 자주 보이는 기호가 있다.

```kotlin
viewModel.state.collect(::render)
```

또는 Compose 화면을 Fragment에서 연결할 때 이런 코드도 볼 수 있다.

```kotlin
SearchRoute(
    state = state,
    errorMessage = errorMessage,
    onDismissError = { viewModel.onIntent(SearchIntent.DismissError) },
    onIntent = viewModel::onIntent,
    onOpenDetail = ::openDetail,
)
```

처음 보면 `::render`, `viewModel::onIntent`, `::openDetail`이 조금 낯설다.

```text
함수를 호출하는 건가?
함수 이름 앞에 왜 ::가 붙지?
람다랑 뭐가 다르지?
```

이 글은 그 질문을 풀어보는 글이다. 한 줄로 말하면 이렇다.

```text
함수 참조는 이미 존재하는 함수를
값처럼 넘기기 위한 문법이다.
```

## 함수 호출과 함수 참조는 다르다

먼저 가장 헷갈리는 부분부터 보자.

```kotlin
render(state)
```

이 코드는 `render` 함수를 **지금 호출**한다. 괄호 안에 `state`를 넣고, 그 자리에서 함수 본문을 실행한다.

반면 아래 코드는 다르다.

```kotlin
::render
```

이 코드는 `render`를 지금 실행하지 않는다. 대신 `render`라는 함수를 가리키는 값을 만든다.

![함수 호출과 함수 참조의 차이](/images/kotlin-function-reference-call-later.png)

비유하면 함수 호출은 버튼을 지금 누르는 것이고, 함수 참조는 버튼이 어디 있는지 알려주는 것이다.

```kotlin
fun render(state: DetailUiState) {
    // 화면 갱신
}

viewModel.state.collect(::render)
```

이 코드는 이렇게 읽을 수 있다.

```text
state Flow에서 값이 들어오면
그 값을 render 함수에 그대로 넘겨서 실행해줘.
```

직접 람다로 쓰면 아래와 같다.

```kotlin
viewModel.state.collect { state ->
    render(state)
}
```

`collect(::render)`는 이 람다를 더 짧게 쓴 형태에 가깝다.

```kotlin
viewModel.state.collect(::render)
```

단, 조건이 있다.

```text
받는 쪽이 기대하는 함수 타입과
넘기는 함수의 모양이 맞아야 한다.
```

`render`가 `DetailUiState` 하나를 받아서 화면을 갱신하는 함수라면, `collect`가 전달해주는 값 하나를 그대로 받을 수 있다. 그래서 함수 참조로 넘기기 좋다.

## 함수도 타입이 있다

람다를 다룰 때 본 것처럼 함수에도 타입이 있다.

```kotlin
val onClick: () -> Unit
val onQueryChange: (String) -> Unit
val onOpenDetail: (MediaItem, Boolean) -> Unit
```

각각 이렇게 읽으면 된다.

| 타입 | 의미 |
|---|---|
| `() -> Unit` | 인자 없이 실행되고 반환값이 없다 |
| `(String) -> Unit` | `String` 하나를 받아 실행되고 반환값이 없다 |
| `(MediaItem, Boolean) -> Unit` | `MediaItem`, `Boolean`을 받아 실행되고 반환값이 없다 |

함수 참조는 이런 함수 타입 자리에 들어갈 수 있다.

예를 들어 아래 함수가 있다고 하자.

```kotlin
private fun openDetail(item: MediaItem, fromFavorite: Boolean) {
    val entry = if (fromFavorite) {
        DetailEntryParcelable.Favorite(item.id)
    } else {
        DetailEntryParcelable.SearchResult(item.toParcelable())
    }

    findNavController().navigate(
        SearchFragmentDirections.actionSearchFragmentToDetailFragment(entry),
    )
}
```

이 함수의 모양은 대략 이렇다.

```kotlin
(MediaItem, Boolean) -> Unit
```

그래서 `SearchRoute`가 `onOpenDetail: (MediaItem, Boolean) -> Unit`을 요구한다면 아래처럼 그대로 넘길 수 있다.

```kotlin
SearchRoute(
    onOpenDetail = ::openDetail,
)
```

풀어 쓰면 이런 람다와 비슷하다.

```kotlin
SearchRoute(
    onOpenDetail = { item, fromFavorite ->
        openDetail(item, fromFavorite)
    },
)
```

함수 참조를 쓰면 "인자를 그대로 받아서 기존 함수에 그대로 전달한다"는 의도가 더 잘 보인다.

## bound reference: 이미 주인이 정해진 함수 참조

함수 참조에는 자주 보는 형태가 몇 가지 있다.

먼저 이런 코드가 있다.

```kotlin
onIntent = viewModel::onIntent
```

여기서 `onIntent`는 `viewModel`의 멤버 함수다.

```kotlin
class SearchViewModel : ViewModel() {
    fun onIntent(intent: SearchIntent) {
        // intent 처리
    }
}
```

`viewModel::onIntent`는 이렇게 읽으면 된다.

```text
이 viewModel 객체의 onIntent 함수를 넘긴다.
```

`viewModel`이라는 수신 객체가 이미 정해져 있기 때문에, 이런 함수 참조를 **bound function reference**라고 볼 수 있다.

타입은 대략 이렇게 맞는다.

```kotlin
(SearchIntent) -> Unit
```

그래서 아래 두 코드는 의미가 비슷하다.

```kotlin
onIntent = viewModel::onIntent
```

```kotlin
onIntent = { intent ->
    viewModel.onIntent(intent)
}
```

함수 참조를 쓰면 "SearchRoute에서 올라오는 intent는 ViewModel의 onIntent로 그대로 보낸다"는 연결이 짧고 선명해진다.

## 검색 화면에서 보면 더 자연스럽다

검색 화면의 상위 composable은 콜백을 받는다.

```kotlin
@Composable
fun SearchRoute(
    state: SearchUiState,
    errorMessage: String?,
    onDismissError: () -> Unit,
    onIntent: (SearchIntent) -> Unit,
    onOpenDetail: (MediaItem, Boolean) -> Unit,
) {
    // ...
}
```

여기서 `SearchRoute`는 ViewModel이나 NavController를 직접 몰라도 된다. 필요한 행동을 함수 타입으로 받는다.

Fragment에서는 그 슬롯에 실제 동작을 연결한다.

```kotlin
SearchRoute(
    state = state,
    errorMessage = errorMessage,
    onDismissError = { viewModel.onIntent(SearchIntent.DismissError) },
    onIntent = viewModel::onIntent,
    onOpenDetail = ::openDetail,
)
```

![Fragment와 SearchRoute 콜백 연결](/images/kotlin-function-reference-callback-wiring.png)

여기서 세 줄의 차이가 중요하다.

```kotlin
onDismissError = { viewModel.onIntent(SearchIntent.DismissError) }
```

이건 람다를 쓰는 편이 자연스럽다. `onDismissError`는 인자가 없는 `() -> Unit`인데, 실제로는 `SearchIntent.DismissError`라는 값을 새로 만들어서 ViewModel에 보내야 한다. 단순히 기존 함수 하나를 그대로 넘기는 상황이 아니다.

반면 아래는 함수 참조가 잘 맞는다.

```kotlin
onIntent = viewModel::onIntent
```

`SearchRoute`가 넘겨주는 `SearchIntent`를 `viewModel.onIntent`가 그대로 받을 수 있다.

아래도 마찬가지다.

```kotlin
onOpenDetail = ::openDetail
```

`SearchRoute`가 넘겨주는 `MediaItem`, `Boolean`을 `openDetail` 함수가 그대로 받을 수 있다.

그래서 이 예제는 함수 참조를 언제 쓰면 좋은지 꽤 잘 보여준다.

```text
인자를 가공해야 하면 람다.
기존 함수에 그대로 전달하면 함수 참조.
```

## 아래쪽 composable에서는 다시 람다가 필요하다

그렇다고 함수 참조가 항상 더 좋은 것은 아니다.

`SearchRoute` 내부를 보면 다시 람다가 많이 나온다.

```kotlin
SearchTopArea(
    query = state.query,
    selectedTab = state.selectedTab,
    onQueryChange = { onIntent(SearchIntent.QueryChanged(it)) },
    onSearch = { onIntent(SearchIntent.SearchSubmitted) },
    onSelectTab = { onIntent(SearchIntent.SelectTab(it)) },
)
```

왜 여기서는 `onIntent`를 함수 참조로 넘기지 않을까?

`SearchTopArea`가 기대하는 콜백 타입이 다르기 때문이다.

```kotlin
onQueryChange: (String) -> Unit
onSearch: () -> Unit
onSelectTab: (SearchTab) -> Unit
```

하지만 상위로 올리고 싶은 값은 `SearchIntent`다.

```kotlin
SearchIntent.QueryChanged(query)
SearchIntent.SearchSubmitted
SearchIntent.SelectTab(tab)
```

즉 중간에서 변환이 필요하다.

```text
String -> SearchIntent.QueryChanged(String)
SearchTab -> SearchIntent.SelectTab(SearchTab)
() -> SearchIntent.SearchSubmitted
```

이럴 때는 람다가 맞다.

```kotlin
onQueryChange = { query ->
    onIntent(SearchIntent.QueryChanged(query))
}
```

함수 참조는 "이미 있는 함수를 그대로 넘기는 문법"이지, 중간에 새 객체를 만들거나 여러 줄 로직을 넣기 위한 문법은 아니다.

## 람다와 함수 참조 선택 기준

![람다와 함수 참조 비교](/images/kotlin-function-reference-lambda-vs-reference.png)

둘 중 무엇을 쓸지 고민될 때는 아래 기준으로 보면 된다.

| 상황 | 더 자연스러운 선택 |
|---|---|
| 기존 함수의 인자와 반환 타입이 정확히 맞는다 | 함수 참조 |
| 인자를 다른 타입으로 감싸야 한다 | 람다 |
| 클릭 전에 로그를 남기거나 상태를 저장해야 한다 | 람다 |
| 두 개 이상의 함수를 순서대로 호출해야 한다 | 람다 |
| 멤버 함수를 특정 객체에 묶어서 넘기고 싶다 | bound function reference |
| 코드가 짧아졌지만 오히려 읽기 어려워졌다 | 람다 |

예를 들어 이 코드는 함수 참조가 잘 어울린다.

```kotlin
viewModel.state.collect(::render)
```

하지만 이 코드는 람다가 낫다.

```kotlin
MediaListItem(
    item = item,
    isFavorite = item.id in favoriteIds,
    onToggleFavorite = { onToggleFavorite(item) },
    onClick = {
        flushScrollPosition()
        onOpenDetail(item)
    },
)
```

`onToggleFavorite`는 클릭 시점에 현재 `item`을 함께 넘겨야 한다. `onClick`은 상세 화면으로 이동하기 전에 스크롤 위치도 저장해야 한다.

이런 곳에 억지로 함수 참조를 쓰려고 하면 오히려 코드가 부자연스러워진다.

## property reference도 같이 보인다

Kotlin에서 `::`는 함수에만 쓰이지 않는다. 프로퍼티에도 쓸 수 있다.

```kotlin
data class MediaItem(
    val id: String,
    val title: String,
)
```

아래 코드는 람다로 `id`만 뽑는다.

```kotlin
val ids = items.map { it.id }
```

프로퍼티 참조로 쓰면 이렇게도 표현할 수 있다.

```kotlin
val ids = items.map(MediaItem::id)
```

`MediaItem::id`는 "MediaItem을 하나 받으면 그 id를 꺼내는 참조"처럼 사용할 수 있다.

테스트 코드에서 이런 형태도 볼 수 있다.

```kotlin
assertEquals(
    listOf("image-1"),
    repository.favorites.value.map { it.id },
)
```

이론적으로는 아래처럼 쓸 수 있다.

```kotlin
repository.favorites.value.map(MediaItem::id)
```

다만 실제 코드에서는 문맥에 따라 `{ it.id }`가 더 익숙하고 잘 읽히기도 한다. 특히 바로 옆에 조건이나 null 처리 로직이 있으면 람다가 더 편하다.

```kotlin
val favoriteIds by remember(state.favorites) {
    derivedStateOf { state.favorites.map { it.id }.toSet() }
}
```

여기서는 `map { it.id }` 뒤에 `toSet()`까지 이어지는 흐름이 중요하다. 함수 참조로 바꿔도 되지만, 이 정도는 팀의 스타일과 가독성을 보고 선택하면 된다.

## 생성자 참조도 있다

함수 참조와 비슷하게 생성자도 참조할 수 있다.

```kotlin
data class SearchKeyword(
    val value: String,
)
```

문자열 목록을 `SearchKeyword` 목록으로 바꾸고 싶다면 람다로 이렇게 쓸 수 있다.

```kotlin
val keywords = rawKeywords.map { keyword ->
    SearchKeyword(keyword)
}
```

생성자 참조를 쓰면 이렇게 된다.

```kotlin
val keywords = rawKeywords.map(::SearchKeyword)
```

`::SearchKeyword`는 `String`을 받아서 `SearchKeyword`를 만드는 함수처럼 동작한다.

```kotlin
(String) -> SearchKeyword
```

이런 코드는 DTO를 UI 모델로 감쌀 때, 값 객체를 만들 때 종종 보인다.

## 확장 함수 참조

확장 함수도 참조할 수 있다.

예를 들어 검색 API 응답 DTO를 도메인 모델로 바꾸는 확장 함수가 있다고 하자.

```kotlin
fun KakaoImageDocumentDto.toMediaItemOrNull(): MediaItem? {
    val thumbnail = thumbnailUrl?.takeIf { it.isNotBlank() } ?: return null
    val url = docUrl?.takeIf { it.isNotBlank() } ?: return null

    return MediaItem(
        id = MediaIdGenerator.generate(MediaType.IMAGE, url, thumbnail),
        type = MediaType.IMAGE,
        thumbnailUrl = thumbnail,
        title = displaySiteName?.stripHtml()?.takeIf { it.isNotBlank() } ?: url,
        contentUrl = url,
        datetime = DateTimeFormatters.parseKakaoDateTime(datetime),
        collection = collection?.takeIf { it.isNotBlank() },
    )
}
```

실제 변환은 보통 이렇게 쓴다.

```kotlin
val imageItems = imageResponse
    ?.documents
    .orEmpty()
    .mapNotNull { it.toMediaItemOrNull() }
```

확장 함수 참조로는 이런 형태를 생각할 수 있다.

```kotlin
val imageItems = imageResponse
    ?.documents
    .orEmpty()
    .mapNotNull(KakaoImageDocumentDto::toMediaItemOrNull)
```

여기서도 선택 기준은 같다.

```text
함수 이름이 충분히 설명적이고
타입을 읽는 데 부담이 없으면 함수 참조.

수신 객체나 null 처리 흐름이 람다로 더 자연스러우면 람다.
```

개인적으로는 확장 함수 이름이 길거나 수신 타입 이름을 적는 순간 코드가 무거워지면 람다를 유지하는 편이 낫다고 본다.

## unbound reference는 수신 객체까지 필요하다

`viewModel::onIntent`는 특정 `viewModel` 객체에 묶인 함수 참조였다.

반대로 클래스 이름으로 멤버 함수를 참조할 수도 있다.

```kotlin
SearchViewModel::onIntent
```

이건 특정 ViewModel 객체가 정해져 있지 않다. 그래서 호출하려면 수신 객체가 추가로 필요하다.

개념적으로는 타입이 이렇게 된다.

```kotlin
(SearchViewModel, SearchIntent) -> Unit
```

즉 아래 두 형태는 다르다.

```kotlin
viewModel::onIntent
```

```kotlin
SearchViewModel::onIntent
```

첫 번째는 이미 `viewModel`이 정해져 있다.

```text
이 ViewModel의 onIntent를 호출해줘.
```

두 번째는 아직 어느 ViewModel인지 정해져 있지 않다.

```text
어떤 SearchViewModel을 줄 테니,
그 객체의 onIntent를 호출해줘.
```

Android UI 콜백에서는 보통 첫 번째처럼 bound reference를 더 자주 본다.

## 함수 참조가 좋은 코드

함수 참조는 코드를 짧게 만드는 문법처럼 보이지만, 핵심은 짧음보다 의도다.

아래 코드는 함수 참조가 잘 어울린다.

```kotlin
viewModel.state.collect(::render)
```

이 코드는 "state를 render에 그대로 넘긴다"는 뜻이 바로 보인다.

아래도 좋다.

```kotlin
SearchRoute(
    onIntent = viewModel::onIntent,
    onOpenDetail = ::openDetail,
)
```

UI는 콜백 슬롯만 알고, 실제 처리는 Fragment와 ViewModel 쪽에 남아 있다.

반면 아래처럼 변환이 들어가면 람다가 낫다.

```kotlin
onQueryChange = { query ->
    onIntent(SearchIntent.QueryChanged(query))
}
```

이 코드는 단순 전달이 아니라 `String`을 `SearchIntent`로 바꾸는 코드다. 이 변환이 드러나는 편이 읽기 좋다.

## 말로 설명해야 한다면

이 주제는 문법 자체보다 "언제 쓰는가"를 설명할 수 있어야 한다.

첫 번째, 함수 참조는 함수를 호출하는 문법이 아니다.

```kotlin
render(state)  // 지금 호출
::render       // 함수 자체를 값으로 넘김
```

두 번째, 함수 참조는 함수 타입과 모양이 맞아야 한다.

```kotlin
fun render(state: DetailUiState)

val action: (DetailUiState) -> Unit = ::render
```

세 번째, 특정 객체의 멤버 함수는 객체에 묶어서 넘길 수 있다.

```kotlin
val action: (SearchIntent) -> Unit = viewModel::onIntent
```

네 번째, 람다와 함수 참조는 경쟁 관계가 아니다.

```kotlin
// 그대로 넘기면 함수 참조
onIntent = viewModel::onIntent

// 변환하거나 부가 작업이 있으면 람다
onQueryChange = { onIntent(SearchIntent.QueryChanged(it)) }
```

다섯 번째, `::`는 함수뿐 아니라 프로퍼티와 생성자에도 쓰인다.

```kotlin
items.map(MediaItem::id)
rawKeywords.map(::SearchKeyword)
```

이 정도를 말할 수 있으면 `::`를 단순 암기 문법이 아니라 Kotlin이 함수를 값으로 다루는 방식으로 이해하고 있다고 볼 수 있다.

## 정리

함수 참조는 어려운 문법이라기보다, 람다를 이해한 다음 만나는 자연스러운 축약이다.

```kotlin
{ state -> render(state) }
```

이 람다가 "인자를 그대로 기존 함수에 전달하는 일"만 한다면 아래처럼 쓸 수 있다.

```kotlin
::render
```

하지만 모든 람다를 함수 참조로 바꿀 필요는 없다. 콜백 안에서 새 intent를 만들거나, 현재 item을 캡처하거나, 로그와 네비게이션을 함께 처리한다면 람다가 더 정확하다.

그래서 기준은 간단하다.

```text
그대로 전달하면 함수 참조.
가공하거나 설명이 필요하면 람다.
```

이 기준만 잡아도 Compose 콜백, Flow collect, 컬렉션 변환 코드에서 `::`가 훨씬 덜 낯설어진다.

## 참고

- [Kotlin Docs - Callable references](https://kotlinlang.org/docs/reflection.html#callable-references)
- [Kotlin Docs - Function references](https://kotlinlang.org/docs/reflection.html#function-references)
- [[kotlin-lambda-function|코틀린 람다함수]]
