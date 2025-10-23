---
title: "Compose에서 toSet(), 즐겨찾기 ID를 Set으로 바꾸는 이유"
date: "2025-10-23"
category: "Android"
group: "Compose State"
series: "Compose State"
tags: ["jetpack-compose", "kotlin", "toset", "set", "derivedstateof", "performance"]
description: "derivedStateOf { state.favorites.map { it.id }.toSet() } 코드에서 toSet()이 왜 필요한지, 검색 결과의 즐겨찾기 표시 예시로 정리합니다."
---

![Compose에서 toSet(), 즐겨찾기 ID를 Set으로 바꾸는 이유](/images/compose-derivedstateof-toset-cover.png)

검색 결과 화면을 만들다 보면 이런 코드가 자연스럽게 나온다.

```kotlin
val favoriteIds by remember(state.favorites) {
    derivedStateOf { state.favorites.map { it.id }.toSet() }
}
```

처음 보면 질문이 생긴다.

```text
favorites는 이미 List인데
왜 굳이 id만 뽑아서 toSet()을 할까?
```

한 줄로 답하면 이렇다.

```text
검색 결과의 각 아이템이 즐겨찾기인지 빠르게 확인하려고
List<MediaItem>을 Set<String>으로 바꾼다.
```

여기서 중요한 단어는 `저장`이 아니라 `조회`다.

즐겨찾기 탭에 보여줄 목록은 여전히 `List<MediaItem>`이 필요하다. 순서도 필요하고, 썸네일, 제목, URL, 날짜 같은 화면 데이터도 필요하다.

하지만 검색 결과 목록에서 하트 아이콘을 켜고 끌 때는 전체 `MediaItem`이 필요하지 않다.

```text
이 검색 결과의 id가
즐겨찾기 목록 안에 있는가?
```

이 질문에 답하려면 `id`만 있으면 된다.

## 실제로 필요한 값은 Boolean이다

검색 결과 아이템을 그릴 때 필요한 값은 보통 이런 형태다.

```kotlin
MediaListItem(
    item = item,
    isFavorite = item.id in favoriteIds,
    onToggleFavorite = { onToggleFavorite(item) },
    onClick = { onOpenDetail(item) },
)
```

`MediaListItem`은 `isFavorite`만 받는다. 즉, 이 아이템이 즐겨찾기인지 아닌지만 알면 된다.

처음에는 이렇게 작성할 수도 있다.

```kotlin
MediaListItem(
    item = item,
    isFavorite = state.favorites.any { favorite ->
        favorite.id == item.id
    },
    onToggleFavorite = { onToggleFavorite(item) },
    onClick = { onOpenDetail(item) },
)
```

동작은 맞다. 즐겨찾기 목록을 앞에서부터 보면서 같은 `id`가 있는지 확인한다.

문제는 이 코드가 검색 결과의 각 행마다 실행된다는 점이다.

```text
검색 결과 100개
즐겨찾기 50개

각 검색 결과마다 favorites.any { ... } 실행
```

최악의 경우 검색 결과 한 개를 확인하기 위해 즐겨찾기 50개를 훑는다. 그리고 그 일을 검색 결과 100개에 대해 반복한다.

```text
100 * 50 = 5,000번 비교
```

물론 작은 화면에서는 이 정도가 바로 문제가 되지는 않을 수 있다. 하지만 리스트는 스크롤되고, recomposition은 다시 일어날 수 있고, 검색 결과는 페이지 단위로 늘어날 수 있다.

그래서 반복 조회가 보이면 질문을 바꿔보는 편이 좋다.

```text
매번 List를 훑을 필요가 있을까?
```

## toSet()은 조회용 자료구조를 만든다

`toSet()`은 컬렉션의 원소들을 `Set`으로 바꾼다.

```kotlin
val ids = listOf("img_001", "img_002", "img_001").toSet()

println(ids)
// [img_001, img_002]
```

`Set`의 핵심은 중복 없는 집합이다.

```text
List
-> 순서가 있고 같은 값이 여러 번 들어갈 수 있다.

Set
-> 같은 값은 한 번만 들어간다.
-> 특정 값이 있는지 확인하기 좋다.
```

즐겨찾기 여부를 확인할 때는 같은 `id`가 여러 번 있을 필요가 없다. `img_001`이 한 번 있든 세 번 있든 결과는 같다.

```text
img_001이 즐겨찾기인가?
-> 있다 / 없다
```

그래서 즐겨찾기 목록에서 `id`만 뽑고, 그 `id`들을 `Set`으로 만든다.

```kotlin
val favoriteIds: Set<String> =
    state.favorites
        .map { it.id }
        .toSet()
```

이제 각 검색 결과에서는 이렇게 확인할 수 있다.

```kotlin
val isFavorite = item.id in favoriteIds
```

Kotlin에서 `in`은 컬렉션에 대해 `contains`를 호출하는 문법이다.

```kotlin
item.id in favoriteIds
```

는 대략 이렇게 읽을 수 있다.

```kotlin
favoriteIds.contains(item.id)
```

![즐겨찾기 ID를 Set으로 만들어 검색 결과에서 빠르게 확인하기](/images/compose-toset-favoriteids-flow-handdrawn.png)

그림으로 보면 흐름은 단순하다.

```text
favorites: List<MediaItem>
-> map { it.id }
-> Set<String>
-> item.id in favoriteIds
```

`favorites` 전체를 매번 뒤지는 대신, 먼저 조회하기 좋은 형태를 만들어두고 각 행에서는 그 집합을 읽는다.

## List scan과 Set lookup 차이

`List`로 확인하면 앞에서부터 하나씩 비교한다.

```kotlin
val isFavorite = favorites.any { favorite ->
    favorite.id == item.id
}
```

즐겨찾기 목록이 길어질수록 확인해야 하는 후보도 늘어난다.

반면 `Set`은 특정 값이 들어 있는지 확인하는 데 맞춰진 자료구조다.

```kotlin
val isFavorite = item.id in favoriteIds
```

일반적인 해시 기반 `Set` 조회는 평균적으로 거의 일정한 비용으로 동작한다.

![List scan과 Set lookup 비교](/images/kotlin-list-scan-vs-set-lookup-handdrawn.png)

그래서 비용 감각은 이렇게 잡으면 된다.

```text
List.any
-> 찾을 때마다 목록을 훑는다.
-> 검색 결과 N개, 즐겨찾기 M개라면 N * M에 가까워질 수 있다.

Set.contains
-> 즐겨찾기 id Set을 한 번 만든다.
-> 검색 결과 각 행은 Set에 물어본다.
-> M + N에 가까운 흐름이 된다.
```

정확한 숫자를 외우는 것보다 중요한 건 이 감각이다.

```text
반복해서 "있나?"를 물어볼 값이라면
List보다 Set이 더 자연스러운 후보가 된다.
```

## 왜 MediaItem 전체가 아니라 id만 넣을까

이렇게 할 수도 있다.

```kotlin
val favoriteItems = state.favorites.toSet()
```

하지만 검색 결과에서 하고 싶은 질문은 `MediaItem` 전체 비교가 아니다.

```text
이 item 객체가 favorites 안의 객체와 완전히 같은가?
```

가 아니라

```text
이 item.id가 즐겨찾기 id 목록 안에 있는가?
```

다.

즐겨찾기의 기준이 `id`라면 자료구조도 그 기준에 맞추는 편이 읽기 쉽다.

```kotlin
val favoriteIds: Set<String> =
    state.favorites.map { it.id }.toSet()
```

이 코드는 의도를 바로 보여준다.

```text
즐겨찾기 여부는 id로 판단한다.
```

이 차이는 생각보다 중요하다. 검색 API 응답에서는 같은 콘텐츠라도 제목, 썸네일 URL, 날짜 포맷 같은 부가 데이터가 달라질 수 있다. 그런데 즐겨찾기 여부의 기준이 안정적인 `id`라면, 화면도 그 기준으로 판단해야 한다.

`Set<MediaItem>`을 쓰면 `MediaItem`의 `equals` 구현에 판단을 맡기게 된다. `data class`라면 모든 프로퍼티가 비교 대상이 된다.

```kotlin
data class MediaItem(
    val id: String,
    val title: String,
    val thumbnailUrl: String,
    val contentUrl: String,
)
```

이 경우 `id`는 같지만 `title`이나 `thumbnailUrl`이 달라지면 다른 객체로 볼 수 있다.

즐겨찾기 여부의 기준이 `id`라면, `Set<String>`이 더 정확하다.

## derivedStateOf는 여기서 무엇을 할까

다시 처음 코드를 보자.

```kotlin
val favoriteIds by remember(state.favorites) {
    derivedStateOf { state.favorites.map { it.id }.toSet() }
}
```

여기에는 두 가지 의도가 들어 있다.

```text
1. favoriteIds는 favorites로부터 계산되는 값이다.
2. favorites가 같다면 매 recomposition마다 Set을 새로 만들 필요가 없다.
```

검색 화면에서는 즐겨찾기 외에도 여러 이유로 recomposition이 일어날 수 있다.

```text
검색어 변경
페이지 로딩 상태 변경
스크롤 위치 관찰
에러 다이얼로그 표시
탭 전환
```

그때마다 아래 계산을 계속 반복하고 싶지는 않다.

```kotlin
state.favorites.map { it.id }.toSet()
```

그래서 `remember(state.favorites)`로 `state.favorites`가 같을 동안 계산 결과를 기억하게 만든다.

그리고 `derivedStateOf`는 이 값이 원본 상태에서 파생된 값이라는 뜻을 분명하게 만든다.

![favorites가 바뀔 때만 favoriteIds Set 다시 계산하기](/images/compose-derivedstateof-favoriteids-cache-handdrawn.png)

다만 이 지점은 조금 조심해서 설명해야 한다.

`derivedStateOf`는 Compose snapshot state를 읽어서 계산한 값이, 실제로 달라질 때만 다시 읽는 쪽에 변경을 전달하고 싶을 때 특히 잘 맞는다. 예를 들어 스크롤 인덱스처럼 자주 바뀌는 상태에서 `showButton` 같은 파생 값을 만들 때 자주 사용한다.

이 코드처럼 `state.favorites`가 Composable 파라미터로 전달된 일반 `List`라면, 핵심 역할은 `remember(state.favorites)` 쪽에 더 가깝다.

그래서 더 단순하게 쓰면 이렇게도 가능하다.

```kotlin
val favoriteIds = remember(state.favorites) {
    state.favorites.map { it.id }.toSet()
}
```

이 코드도 목적은 같다.

```text
favorites가 바뀔 때만
favoriteIds Set을 다시 만든다.
```

그럼에도 처음 코드가 완전히 이상한 코드는 아니다. `favoriteIds`가 `state.favorites`에서 파생된 상태라는 의도를 드러낸다.

다만 설명할 때는 이렇게 구분해서 말할 수 있어야 한다.

```text
toSet()
-> 즐겨찾기 여부 조회를 빠르게 하기 위한 자료구조 선택

remember(state.favorites)
-> favorites가 같을 동안 Set 재생성을 피하기 위한 Compose 캐싱

derivedStateOf
-> 다른 상태에서 계산된 파생 값이라는 의미
-> snapshot state 기반 파생 값에서 특히 효과가 분명함
```

## item 안에서 toSet() 하면 안 될까

아래 코드는 피하는 편이 좋다.

```kotlin
items(page.items) { item ->
    val favoriteIds = state.favorites.map { it.id }.toSet()

    MediaListItem(
        item = item,
        isFavorite = item.id in favoriteIds,
        onToggleFavorite = { onToggleFavorite(item) },
        onClick = { onOpenDetail(item) },
    )
}
```

이렇게 하면 각 아이템을 그릴 때마다 `Set`을 새로 만들 수 있다.

```text
검색 결과 행 100개
-> favoriteIds Set도 100번 생성될 수 있음
```

`toSet()`으로 조회 비용을 줄이려다가, Set 생성 비용을 불필요하게 늘릴 수 있다.

Set은 행마다 만드는 값이 아니라, 목록을 그리기 전에 한 번 만들어두고 행들이 같이 읽는 값에 가깝다.

```kotlin
val favoriteIds = remember(state.favorites) {
    state.favorites.map { it.id }.toSet()
}

LazyColumn {
    items(page.items) { item ->
        MediaListItem(
            item = item,
            isFavorite = item.id in favoriteIds,
            onToggleFavorite = { onToggleFavorite(item) },
            onClick = { onOpenDetail(item) },
        )
    }
}
```

이렇게 두면 흐름이 명확하다.

```text
즐겨찾기 목록이 바뀜
-> favoriteIds Set을 다시 만듦
-> 검색 결과 행들은 같은 Set을 읽음
```

## toSet()이 중복을 없애는 것도 의미가 있다

`Set`은 같은 값을 하나만 가진다.

```kotlin
val ids = listOf("img_001", "img_001", "vid_003").toSet()

println(ids.size)
// 2
```

즐겨찾기 저장소에서는 보통 같은 `id`가 중복 저장되지 않게 막아야 한다.

```kotlin
if (favorites.none { it.id == item.id }) {
    favorites = favorites + item
}
```

그래도 UI 조회 단계에서 `Set<String>`을 쓰면 "즐겨찾기 여부는 존재 여부다"라는 의미가 더 선명해진다.

단, `toSet()`으로 중복이 사라진다고 해서 저장소의 중복 버그를 방치해도 된다는 뜻은 아니다.

```text
저장소
-> 중복이 생기지 않게 관리한다.

UI 조회
-> id 집합으로 빠르게 확인한다.
```

역할이 다르다.

## 순서가 필요하면 List를 유지한다

Kotlin의 `Iterable<T>.toSet()`은 원본 컬렉션의 iteration order를 보존하는 `Set`을 반환한다. 그래서 단순히 순회해보면 원래 순서처럼 보일 수 있다.

하지만 `Set`을 선택했다는 것은 코드의 의미가 "순서 있는 목록"보다 "중복 없는 집합"에 가깝다는 뜻이다.

즐겨찾기 탭처럼 사용자가 저장한 순서대로 보여줘야 하는 화면에서는 `List<MediaItem>`을 그대로 쓰는 편이 자연스럽다.

```kotlin
FavoriteContent(
    favorites = state.favorites,
    onToggleFavorite = { onToggleFavorite(it) },
    onOpenDetail = { onOpenDetail(it) },
)
```

반대로 검색 결과 행의 하트 표시처럼 존재 여부만 필요할 때는 `Set<String>`이 자연스럽다.

```kotlin
val favoriteIds = remember(state.favorites) {
    state.favorites.map { it.id }.toSet()
}
```

자료구조는 성능만 보고 고르는 게 아니다. 코드가 던지는 질문에 맞춰 고르는 것이다.

```text
순서대로 보여줄 것인가?
-> List

있나 없나 빠르게 물어볼 것인가?
-> Set
```

## 언제 toSet()을 쓰지 않아도 될까

모든 `List.any`를 `toSet()`으로 바꿀 필요는 없다.

예를 들어 한 번만 확인하는 코드라면 `any`가 더 단순하다.

```kotlin
val hasVideo = items.any { it.type == MediaType.VIDEO }
```

이 코드는 한 번 훑고 끝난다. 굳이 `Set`을 만들 이유가 없다.

`toSet()`이 유리해지는 순간은 보통 이런 경우다.

```text
같은 기준으로 contains를 여러 번 호출한다.
목록의 크기가 커질 수 있다.
리스트 렌더링처럼 같은 판단이 많은 행에서 반복된다.
중복이 의미 없는 값이다.
비교 기준이 명확한 key로 표현된다.
```

검색 결과의 즐겨찾기 표시는 여기에 잘 맞는다.

```text
검색 결과의 각 행마다
item.id가 즐겨찾기인지 확인한다.
```

그래서 `favoriteIds: Set<String>`을 미리 만들어두는 선택이 설득력 있다.

## 설명할 수 있어야 하는 질문들

이 코드는 짧지만 생각보다 많은 질문을 품고 있다.

```kotlin
val favoriteIds by remember(state.favorites) {
    derivedStateOf { state.favorites.map { it.id }.toSet() }
}
```

첫째, 왜 `toSet()`인가?

```text
검색 결과 각 행에서 즐겨찾기 여부를 반복 조회하기 때문에
List를 매번 scan하기보다 Set membership으로 확인하려고 사용한다.
```

둘째, 왜 `MediaItem`이 아니라 `id`인가?

```text
즐겨찾기 여부의 기준이 객체 전체 equality가 아니라
안정적인 식별자인 id이기 때문이다.
```

셋째, 왜 `remember(state.favorites)`인가?

```text
favorites가 바뀌지 않았는데 recomposition이 일어날 때마다
map과 toSet을 다시 실행하지 않기 위해서다.
```

넷째, `derivedStateOf`는 반드시 필요한가?

```text
이 코드에서는 remember(state.favorites)만으로도 충분히 표현할 수 있다.
다만 favoriteIds가 favorites에서 계산된 파생 값이라는 의도를 드러낸다.
snapshot state를 직접 읽는 파생 값이라면 derivedStateOf의 효과가 더 분명하다.
```

다섯째, 언제 쓰지 않을 것인가?

```text
한 번만 확인하는 값이라면 any가 더 단순하다.
순서가 중요한 화면 데이터라면 List를 유지한다.
Set 생성 비용보다 조회 반복 이득이 작다면 굳이 바꾸지 않는다.
```

## 마무리

`toSet()`은 단순히 타입을 바꾸는 코드가 아니다.

이 코드에서는 화면이 던지는 질문을 바꾸는 역할을 한다.

```text
favorites 전체를 매번 훑을까?
```

에서

```text
favoriteIds 집합에 이 id가 있을까?
```

로 바꾼다.

그래서 아래 코드는 작은 최적화처럼 보이지만, 사실은 화면의 조회 패턴을 자료구조로 표현한 코드다.

```kotlin
val favoriteIds = remember(state.favorites) {
    state.favorites.map { it.id }.toSet()
}
```

즐겨찾기 탭은 `List<MediaItem>`로 보여주고, 검색 결과 행의 하트 표시는 `Set<String>`으로 확인한다.

그렇게 역할을 나누면 UI 코드는 더 읽기 쉬워진다.

```text
보여줄 데이터는 List.
존재 여부를 물어볼 key는 Set.
```

이 한 줄을 기억하면 된다.

## 참고

- [Kotlin `toSet()` API](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/to-set.html)
- [Jetpack Compose Performance Best Practices - `derivedStateOf`](https://developer.android.com/develop/ui/compose/performance/bestpractices)
