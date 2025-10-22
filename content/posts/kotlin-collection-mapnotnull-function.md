---
title: "코틀린 컬렉션 함수 mapNotNull 이해하기"
date: "2025-10-22"
category: "Kotlin"
group: "Kotlin Basics"
series: "Kotlin Basics"
tags: ["kotlin", "collection", "mapNotNull", "android", "null safety"]
description: "Kotlin 컬렉션 함수 mapNotNull이 값을 변환하면서 null 결과를 제외하는 방식을 Android 검색 API 예시와 함께 정리합니다."
---

![코틀린 컬렉션 함수 mapNotNull 이해하기](/images/kotlin-mapnotnull-cover.png)

앞에서 [[kotlin-collection-map-function|코틀린 컬렉션 함수 map]]을 정리했다.

`map`은 리스트의 각 요소를 다른 값으로 변환해서 새 리스트를 만든다.

```kotlin
val titles = items.map { item ->
    item.title
}
```

그런데 Android 코드를 작성하다 보면 단순히 바꾸기만 하면 안 되는 순간이 자주 온다.

API 응답에서 필수 값이 비어 있을 수도 있고, 로컬 저장소에 예전 버전의 깨진 데이터가 남아 있을 수도 있고, 문자열을 숫자로 바꾸려는데 실패할 수도 있다.

이럴 때 자주 보게 되는 함수가 `mapNotNull`이다.

한 줄로 말하면 이렇다.

```text
mapNotNull은 각 요소를 변환하되,
변환 결과가 null이면 결과 리스트에 넣지 않는 함수다.
```

즉 `map`과 `filterNotNull`이 합쳐진 느낌으로 읽을 수 있다.

## 가장 작은 예시

문자열 리스트가 있다고 해보자.

```kotlin
val rawNumbers = listOf("1", "2", "abc", "4")
```

각 문자열을 `Int`로 바꾸고 싶다. 그런데 `"abc"`는 숫자로 바꿀 수 없다.

이때 `toIntOrNull()`을 쓰면 변환에 실패했을 때 예외를 던지는 대신 `null`을 돌려준다.

```kotlin
val numbers = rawNumbers.mapNotNull { text ->
    text.toIntOrNull()
}

println(numbers) // [1, 2, 4]
```

흐름은 이렇게 된다.

```text
"1"   -> 1
"2"   -> 2
"abc" -> null  -> 결과에서 제외
"4"   -> 4
```

그래서 결과 타입은 `List<Int?>`가 아니라 `List<Int>`다.

```kotlin
val numbers: List<Int> = rawNumbers.mapNotNull { text ->
    text.toIntOrNull()
}
```

여기서 `mapNotNull`의 장점이 드러난다.

```text
변환에 실패할 수 있다.
실패한 값은 버려도 된다.
최종 리스트에는 성공한 값만 남기고 싶다.
```

이 세 조건이 맞으면 `mapNotNull`이 자연스럽다.

## mapNotNull의 동작 흐름

`mapNotNull`은 이름 그대로 `map`처럼 변환하고, `null`이 아닌 값만 남긴다.

![mapNotNull 동작 흐름](/images/kotlin-mapnotnull-flow.png)

단순하게 직접 풀어 쓰면 이런 느낌이다.

```kotlin
val result = mutableListOf<Int>()

for (text in rawNumbers) {
    val number = text.toIntOrNull()
    if (number != null) {
        result.add(number)
    }
}
```

이 코드를 컬렉션 함수로 표현하면 다음 한 줄이 된다.

```kotlin
val result = rawNumbers.mapNotNull { text ->
    text.toIntOrNull()
}
```

중요한 점은 결과 리스트의 크기가 원본과 다를 수 있다는 것이다.

`map`은 보통 입력 하나당 출력 하나를 만든다.

```text
List<T> -> map -> List<R>
```

반면 `mapNotNull`은 변환 결과가 `null`인 요소를 제외한다.

```text
List<T> -> mapNotNull -> List<R>
```

겉보기는 비슷하지만 의미는 다르다.

```text
map        : 모든 요소를 변환한다.
mapNotNull : 변환할 수 있는 요소만 결과에 남긴다.
```

## 함수 시그니처로 이해하기

Kotlin 표준 라이브러리의 `Iterable.mapNotNull` 시그니처를 단순하게 보면 이런 모양이다.

```kotlin
fun <T, R : Any> Iterable<T>.mapNotNull(
    transform: (T) -> R?
): List<R>
```

여기서 핵심은 두 군데다.

```text
transform: (T) -> R?
결과: List<R>
```

람다는 `R?`를 반환할 수 있다. 즉 변환하다가 `null`을 돌려줄 수 있다.

하지만 최종 결과는 `List<R>`이다. `List<R?>`가 아니다.

```text
람다 안에서는 null 가능
결과 리스트 안에서는 null 불가능
```

그래서 `mapNotNull` 이후에는 각 요소를 사용할 때 매번 null 체크를 하지 않아도 된다.

```kotlin
val numbers: List<Int> = rawNumbers.mapNotNull { it.toIntOrNull() }

numbers.forEach { number ->
    println(number + 10)
}
```

이 코드는 `number`가 `Int?`가 아니라 `Int`로 다뤄진다.

## Android에서 자주 보이는 이유

Android 앱에서는 외부에서 들어온 데이터를 화면에서 바로 쓰기 좋은 모델로 바꾸는 일이 많다.

예를 들어 검색 API 응답을 생각해보자.

서버 응답은 이미지 결과와 동영상 결과가 따로 내려올 수 있다.

```kotlin
data class ImageDocumentDto(
    val thumbnailUrl: String?,
    val docUrl: String?,
    val displaySiteName: String?,
    val datetime: String?,
)

data class VideoDocumentDto(
    val thumbnail: String?,
    val url: String?,
    val title: String?,
    val datetime: String?,
)
```

하지만 화면에서는 둘을 같은 리스트에 보여주고 싶다.

```kotlin
data class MediaItem(
    val id: String,
    val type: MediaType,
    val thumbnailUrl: String,
    val title: String,
    val contentUrl: String,
    val datetime: Instant,
)

enum class MediaType {
    IMAGE,
    VIDEO,
}
```

이때 DTO를 `MediaItem`으로 바꾸는 mapper를 만들 수 있다.

```kotlin
fun ImageDocumentDto.toMediaItemOrNull(): MediaItem? {
    val thumbnail = thumbnailUrl?.takeIf { it.isNotBlank() } ?: return null
    val url = docUrl?.takeIf { it.isNotBlank() } ?: return null
    val title = displaySiteName
        ?.stripHtml()
        ?.takeIf { it.isNotBlank() }
        ?: url

    return MediaItem(
        id = generateMediaId(MediaType.IMAGE, url, thumbnail),
        type = MediaType.IMAGE,
        thumbnailUrl = thumbnail,
        title = title,
        contentUrl = url,
        datetime = parseDateTime(datetime),
    )
}
```

여기서 `thumbnailUrl`과 `docUrl`은 화면에 꼭 필요한 값이라고 해보자.

둘 중 하나라도 비어 있으면 화면에 정상적인 카드로 보여주기 어렵다. 그래서 `return null`로 이 DTO는 버리겠다는 의도를 표현한다.

동영상도 비슷하다.

```kotlin
fun VideoDocumentDto.toMediaItemOrNull(): MediaItem? {
    val thumbnailUrl = thumbnail?.takeIf { it.isNotBlank() } ?: return null
    val contentUrl = url?.takeIf { it.isNotBlank() } ?: return null
    val safeTitle = title
        ?.stripHtml()
        ?.takeIf { it.isNotBlank() }
        ?: contentUrl

    return MediaItem(
        id = generateMediaId(MediaType.VIDEO, contentUrl, thumbnailUrl),
        type = MediaType.VIDEO,
        thumbnailUrl = thumbnailUrl,
        title = safeTitle,
        contentUrl = contentUrl,
        datetime = parseDateTime(datetime),
    )
}
```

이제 검색 결과를 합칠 때 `mapNotNull`이 자연스럽게 들어간다.

![mapNotNull로 검색 API 응답 합치기](/images/kotlin-mapnotnull-search-flow.png)

```kotlin
val imageItems = imageResponse.documents
    .mapNotNull { document ->
        document.toMediaItemOrNull()
    }

val videoItems = videoResponse.documents
    .mapNotNull { document ->
        document.toMediaItemOrNull()
    }

val mergedItems = (imageItems + videoItems)
    .sortedByDescending { item ->
        item.datetime
    }
```

이 코드는 이렇게 읽으면 된다.

```text
이미지 응답을 MediaItem으로 바꾼다.
바꿀 수 없는 응답은 제외한다.

동영상 응답도 MediaItem으로 바꾼다.
바꿀 수 없는 응답은 제외한다.

남은 항목만 시간순으로 합친다.
```

여기서 좋은 점은 `mergedItems`의 타입이 `List<MediaItem>`이라는 것이다.

```kotlin
val mergedItems: List<MediaItem> = imageItems + videoItems
```

중간에 깨진 DTO가 있었다고 해서 이후 화면 코드가 `MediaItem?`를 계속 상대하지 않아도 된다.

## mapNotNull은 필터이기도 하고 mapper이기도 하다

`mapNotNull`을 잘 쓰려면 이 함수를 단순한 null 제거 함수로만 보면 안 된다.

```kotlin
val nonNullItems = items.mapNotNull { it }
```

이 코드는 동작은 하지만, 단순히 nullable 리스트에서 null만 제거하고 싶다면 보통 `filterNotNull()`이 더 직접적이다.

```kotlin
val nonNullItems = items.filterNotNull()
```

`mapNotNull`이 빛나는 순간은 변환과 제외 조건이 함께 있을 때다.

```kotlin
val mediaItems = documents.mapNotNull { document ->
    document.toMediaItemOrNull()
}
```

이 한 줄에는 두 가지 의미가 들어 있다.

```text
DocumentDto -> MediaItem 변환
변환 불가능한 DocumentDto 제외
```

그래서 mapper 함수 이름도 중요하다.

```kotlin
fun ImageDocumentDto.toMediaItemOrNull(): MediaItem?
```

`toMediaItem()`이라고만 쓰면 항상 변환에 성공할 것처럼 보인다.

하지만 `toMediaItemOrNull()`이라고 쓰면 호출하는 쪽에서 바로 의도를 알 수 있다.

```text
이 변환은 실패할 수 있다.
실패하면 null을 돌려준다.
호출부에서 mapNotNull과 함께 쓰면 된다.
```

함수 이름 하나가 컬렉션 함수 선택까지 자연스럽게 안내하는 셈이다.

## 람다 안에서 바로 null을 돌려줄 수도 있다

mapper 함수를 따로 만들지 않고 람다 안에서 바로 처리할 수도 있다.

```kotlin
val mediaItems = documents.mapNotNull { document ->
    val thumbnail = document.thumbnailUrl
        ?.takeIf { it.isNotBlank() }
        ?: return@mapNotNull null

    val contentUrl = document.contentUrl
        ?.takeIf { it.isNotBlank() }
        ?: return@mapNotNull null

    MediaItem(
        id = document.id,
        thumbnailUrl = thumbnail,
        contentUrl = contentUrl,
        title = document.title.orEmpty(),
    )
}
```

여기서 `return@mapNotNull null`은 이 요소의 변환 결과를 `null`로 만들겠다는 뜻이다.

다만 람다 안의 검증이 길어지면 읽기 어려워진다. 그럴 때는 앞에서 본 것처럼 helper 함수로 빼는 편이 좋다.

```kotlin
val mediaItems = documents.mapNotNull { document ->
    document.toMediaItemOrNull()
}
```

호출부는 짧아지고, 검증 규칙은 mapper 함수 안에 모인다.

Android 프로젝트에서는 이 쪽이 보통 유지보수하기 편하다.

## 로컬 저장소 복원에도 잘 어울린다

`mapNotNull`은 네트워크 응답뿐 아니라 로컬 저장소를 복원할 때도 유용하다.

예를 들어 즐겨찾기 목록을 JSON으로 저장한다고 해보자.

```kotlin
data class FavoriteStorageSnapshot(
    val schemaVersion: Int = 1,
    val items: List<StoredFavoriteItem?>? = emptyList(),
)

data class StoredFavoriteItem(
    val id: String? = null,
    val type: String? = null,
    val thumbnailUrl: String? = null,
    val title: String? = null,
    val contentUrl: String? = null,
    val datetimeIso: String? = null,
)
```

저장 데이터는 앱 바깥의 세계에 가깝다.

예전 버전에서 저장한 값일 수도 있고, 일부 필드가 비어 있을 수도 있고, JSON 파싱 과정에서 예상보다 느슨하게 들어올 수도 있다.

그래서 복원할 때는 안전하게 도메인 모델로 좁혀주는 과정이 필요하다.

```kotlin
private fun StoredFavoriteItem.toMediaItemOrNull(): MediaItem? {
    val id = id?.takeIf { it.isNotBlank() } ?: return null
    val typeName = type?.takeIf { it.isNotBlank() } ?: return null
    val mediaType = runCatching {
        MediaType.valueOf(typeName)
    }.getOrNull() ?: return null

    val thumbnailUrl = thumbnailUrl?.takeIf { it.isNotBlank() } ?: return null
    val contentUrl = contentUrl?.takeIf { it.isNotBlank() } ?: return null
    val title = title?.takeIf { it.isNotBlank() } ?: contentUrl
    val datetime = runCatching {
        Instant.parse(datetimeIso.orEmpty())
    }.getOrDefault(Instant.EPOCH)

    return MediaItem(
        id = id,
        type = mediaType,
        thumbnailUrl = thumbnailUrl,
        title = title,
        contentUrl = contentUrl,
        datetime = datetime,
    )
}
```

복원하는 쪽에서는 이렇게 쓸 수 있다.

```kotlin
val storedItems = snapshot.items.orEmpty()

val favorites = storedItems.mapNotNull { item ->
    item?.toMediaItemOrNull()
}
```

이 코드는 두 가지 null을 함께 처리한다.

```text
item 자체가 null인 경우
item은 있지만 MediaItem으로 복원할 수 없는 경우
```

그리고 결과는 안전한 `List<MediaItem>`이다.

```kotlin
val favorites: List<MediaItem> = storedItems.mapNotNull { item ->
    item?.toMediaItemOrNull()
}
```

여기서 한 걸음 더 나아가면 깨진 데이터를 정리하는 로직도 붙일 수 있다.

```kotlin
if (favorites.size != storedItems.size) {
    persist(favorites)
}
```

복원 과정에서 빠진 항목이 있었다면, 정상 항목만 다시 저장한다.

이렇게 하면 다음 실행부터는 같은 깨진 데이터를 계속 만나지 않아도 된다.

## map + filterNotNull과 비교하기

`mapNotNull`은 아래 코드와 비슷한 일을 한다.

```kotlin
val mediaItems = documents
    .map { document ->
        document.toMediaItemOrNull()
    }
    .filterNotNull()
```

이 코드는 먼저 `List<MediaItem?>`를 만든 다음, 그 안에서 `null`을 제거한다.

`mapNotNull`로 쓰면 한 번에 표현할 수 있다.

![map + filterNotNull과 mapNotNull 비교](/images/kotlin-mapnotnull-vs-map-filter.png)

```kotlin
val mediaItems = documents.mapNotNull { document ->
    document.toMediaItemOrNull()
}
```

두 코드의 의미는 비슷하지만 읽는 느낌이 다르다.

```text
map + filterNotNull
-> 일단 바꾸고, 나중에 null을 제거한다.

mapNotNull
-> null이 나올 수 있는 변환을 하고, 성공한 값만 모은다.
```

실제 코드 리뷰에서는 `map { ... }.filterNotNull()`보다 `mapNotNull { ... }`이 의도를 더 잘 드러내는 경우가 많다.

특히 `toSomethingOrNull()` 계열 함수와 같이 쓰면 거의 문장처럼 읽힌다.

```kotlin
val validItems = rawItems.mapNotNull { item ->
    item.toValidItemOrNull()
}
```

```text
rawItems에서 valid item으로 바꿀 수 있는 것만 모은다.
```

## mapNotNull을 쓰면 안 좋은 경우

`mapNotNull`은 편하지만, 실패한 항목을 조용히 버리는 함수이기도 하다.

그래서 다음 상황에서는 조심해야 한다.

```text
몇 개가 실패했는지 알아야 한다.
실패 이유를 사용자에게 보여줘야 한다.
실패한 데이터를 로그나 분석 이벤트로 남겨야 한다.
입력 리스트와 결과 리스트의 위치가 반드시 1:1로 맞아야 한다.
```

예를 들어 업로드할 파일 10개 중 3개가 실패했다면, 조용히 7개만 남기는 것이 좋은 UX가 아닐 수 있다.

```kotlin
val uploadTargets = files.mapNotNull { file ->
    file.toUploadTargetOrNull()
}
```

이 코드만 보면 실패한 파일 3개는 사라진다.

사용자에게 "이 파일은 용량이 너무 큽니다" 같은 이유를 보여줘야 한다면 `mapNotNull`보다 `Result`, sealed class, 별도의 validation 결과 모델이 더 적합하다.

```kotlin
sealed class FileValidationResult {
    data class Valid(val target: UploadTarget) : FileValidationResult()
    data class Invalid(val fileName: String, val reason: String) : FileValidationResult()
}
```

또한 리스트 위치가 중요할 때도 `mapNotNull`을 피해야 한다.

```kotlin
val displayNames = users.map { user ->
    user.nickname
}
```

여기서 `nickname`이 nullable이라도, 사용자 목록과 위치를 맞춰야 한다면 `List<String?>`가 필요할 수 있다.

```kotlin
val displayNames: List<String?> = users.map { user ->
    user.nickname
}
```

이 경우 `mapNotNull`을 쓰면 nickname이 없는 사용자가 리스트에서 사라진다.

```kotlin
val displayNames: List<String> = users.mapNotNull { user ->
    user.nickname
}
```

이게 의도한 동작인지 먼저 확인해야 한다.

```text
null을 제거해도 되는가?
결과 리스트가 짧아져도 되는가?
실패 이유를 버려도 되는가?
```

이 질문에 모두 "그렇다"라고 답할 수 있을 때 `mapNotNull`이 잘 맞는다.

## 자주 같이 나오는 함수들

`mapNotNull` 주변에는 비슷한 이름의 함수가 많다.

먼저 `filterNotNull()`은 이미 nullable 값이 들어 있는 리스트에서 null만 제거한다.

```kotlin
val names: List<String?> = listOf("A", null, "B")
val nonNullNames: List<String> = names.filterNotNull()
```

변환이 필요 없다면 `filterNotNull()`이 더 정확하다.

`mapIndexedNotNull()`은 index가 필요할 때 쓴다.

```kotlin
val numberedTitles = titles.mapIndexedNotNull { index, title ->
    title?.let {
        "${index + 1}. $it"
    }
}
```

`firstNotNullOfOrNull()`은 리스트 전체를 바꾸는 것이 아니라, 처음으로 null이 아닌 변환 결과 하나만 찾고 싶을 때 쓴다.

```kotlin
val firstImageUrl = items.firstNotNullOfOrNull { item ->
    item.thumbnailUrl?.takeIf { it.isNotBlank() }
}
```

정리하면 이렇게 볼 수 있다.

| 함수 | 언제 쓰나 |
|---|---|
| `map` | 모든 요소를 다른 값으로 바꿀 때 |
| `filterNotNull` | 이미 있는 nullable 리스트에서 null만 제거할 때 |
| `mapNotNull` | 변환하면서 실패한 결과를 제외할 때 |
| `mapIndexedNotNull` | 변환하면서 index도 필요할 때 |
| `firstNotNullOfOrNull` | 처음으로 성공한 변환 결과 하나만 필요할 때 |

## 테스트에서는 무엇을 확인할까

`mapNotNull`이 들어간 mapper나 repository를 테스트할 때는 단순히 "성공 케이스가 나온다"만 보면 부족하다.

다음 세 가지를 확인하는 편이 좋다.

```text
필수 값이 모두 있으면 결과에 포함된다.
필수 값이 없으면 결과에서 제외된다.
제외된 항목 때문에 나머지 순서나 정렬이 깨지지 않는다.
```

예를 들어 검색 결과를 시간순으로 합치는 로직이라면 이런 테스트가 필요하다.

```kotlin
@Test
fun searchPage_mergesValidImageAndVideoItemsByDate() = runTest {
    fakeApi.imageDocuments = listOf(
        imageDocument(title = "older-image", datetime = "2025-10-21T10:00:00.000Z"),
        imageDocument(thumbnailUrl = null),
    )
    fakeApi.videoDocuments = listOf(
        videoDocument(title = "newer-video", datetime = "2025-10-22T10:00:00.000Z"),
    )

    val result = repository.searchPage(
        query = "android",
        page = 1,
        previousImageEnd = false,
        previousVideoEnd = false,
    )

    assertEquals(
        listOf("newer-video", "older-image"),
        result.items.map { it.title },
    )
}
```

이 테스트가 확인하는 것은 단순히 `mapNotNull`을 썼느냐가 아니다.

```text
깨진 응답은 제외된다.
정상 응답은 남는다.
이미지와 동영상을 합친 뒤 정렬된다.
화면에 넘기는 결과는 null 없는 리스트다.
```

이 정도까지 확인하면 `mapNotNull`이 비즈니스 규칙 안에서 제대로 쓰였는지 볼 수 있다.

## 마무리

`mapNotNull`은 어렵게 생긴 함수는 아니지만, 실무 코드에서는 꽤 중요한 의도를 담는다.

```text
변환할 수 있으면 변환한다.
변환할 수 없으면 결과에서 제외한다.
이후 단계에는 안전한 값만 넘긴다.
```

그래서 API DTO를 도메인 모델로 바꿀 때, 저장 데이터를 복원할 때, 문자열 파싱처럼 실패 가능한 변환을 할 때 자주 어울린다.

다만 실패한 값을 조용히 버려도 되는지 항상 먼저 확인해야 한다.

```kotlin
val items = documents.mapNotNull { document ->
    document.toMediaItemOrNull()
}
```

이 한 줄은 단순히 짧은 코드가 아니다.

```text
화면에서 쓸 수 있는 데이터만 다음 단계로 넘기겠다.
```

라는 설계 판단이 들어간 코드다.
