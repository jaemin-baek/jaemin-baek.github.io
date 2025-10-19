---
title: "코틀린 컬렉션 함수 map 이해하기"
date: "2025-10-19"
category: "Kotlin"
group: "Kotlin Basics"
series: "Kotlin Basics"
tags: ["kotlin", "collection", "map", "android", "lambda"]
description: "Kotlin 컬렉션 함수 map이 각 요소를 어떻게 변환하고 새 리스트를 만드는지 Android 예시와 함께 정리합니다."
---

![코틀린 컬렉션 함수 map 이해하기](/images/kotlin-collection-map-cover.png)

Kotlin 코드를 읽다 보면 `map`을 정말 자주 만난다.

API 응답을 화면 모델로 바꿀 때도 나오고, Room Entity를 도메인 모델로 바꿀 때도 나오고, Compose나 RecyclerView에 넘길 리스트를 만들 때도 나온다.

```kotlin
val names = users.map { user ->
    user.name
}
```

처음 보면 이름 때문에 살짝 헷갈릴 수 있다. Kotlin에는 `Map<K, V>`라는 컬렉션도 있고, 컬렉션 함수 `map`도 있다.

이 글에서 다루는 것은 소문자 `map` 함수다.

한 줄로 말하면 이렇다.

```text
map은 컬렉션의 각 요소를
주어진 규칙으로 변환해서
새 리스트로 돌려주는 함수다.
```

여기서 중요한 단어는 세 가지다.

```text
각 요소
변환
새 리스트
```

`map`은 원본 리스트를 직접 고치는 함수가 아니다. 원본의 각 요소를 하나씩 꺼내서 람다에 넣고, 람다가 반환한 값을 모아 새로운 리스트를 만든다.

## 가장 작은 예시

숫자 리스트가 있다고 해보자.

```kotlin
val numbers = listOf(1, 2, 3)
```

각 숫자를 두 배로 만들고 싶다면 이렇게 쓸 수 있다.

```kotlin
val doubled = numbers.map { number ->
    number * 2
}

println(doubled) // [2, 4, 6]
```

람다 파라미터 이름을 생략하면 `it`으로도 쓸 수 있다.

```kotlin
val doubled = numbers.map {
    it * 2
}
```

짧은 변환이면 `it`이 편하다. 하지만 변환 로직이 길어지거나 여러 값이 섞이면 이름을 붙이는 편이 읽기 쉽다.

```kotlin
val displayNames = users.map { user ->
    "${user.name} (${user.age})"
}
```

`it`이 무조건 나쁜 것은 아니다. 다만 `it.id`, `it.name`, `it.profile.imageUrl`처럼 깊어지기 시작하면, 그때는 `user ->`처럼 이름을 주는 편이 코드를 읽는 사람에게 친절하다.

## map의 핵심 흐름

`map`의 흐름은 그림처럼 생각하면 단순하다.

![map의 핵심 흐름](/images/kotlin-collection-map-flow-handdrawn.png)

입력 리스트가 있다.

```kotlin
val numbers = listOf(1, 2, 3)
```

`map`은 첫 번째 요소부터 마지막 요소까지 차례대로 람다에 넣는다.

```kotlin
val result = numbers.map { number ->
    number * 10
}
```

그러면 내부적으로는 이런 느낌이다.

```text
1 -> number * 10 -> 10
2 -> number * 10 -> 20
3 -> number * 10 -> 30
```

그리고 결과를 모아 새 리스트를 만든다.

```kotlin
println(result) // [10, 20, 30]
```

이때 기억할 점은 세 가지다.

```text
순서가 유지된다.
크기가 유지된다.
원본 리스트는 그대로다.
```

입력이 `[1, 2, 3]`이면 결과도 첫 번째 입력의 결과, 두 번째 입력의 결과, 세 번째 입력의 결과 순서로 들어간다.

또 `map`은 각 요소마다 결과를 하나씩 만든다. 그래서 일반적인 `map` 결과의 크기는 원본 컬렉션의 크기와 같다.

```kotlin
val numbers = listOf(1, 2, 3)
val doubled = numbers.map { it * 2 }

println(numbers) // [1, 2, 3]
println(doubled) // [2, 4, 6]
```

원본을 바꾸는 것이 아니라 새 리스트를 받는다는 점은 Android 상태 관리에서도 중요하다.

## 타입이 바뀌어도 된다

`map`은 값을 조금 고치는 함수로만 생각하기 쉽다.

```kotlin
val doubled: List<Int> = numbers.map { it * 2 }
```

하지만 더 중요한 특징은 **타입을 바꿀 수 있다**는 점이다.

예를 들어 `User` 리스트에서 이름만 뽑아낼 수 있다.

```kotlin
data class User(
    val id: Long,
    val name: String,
    val age: Int,
)

val users = listOf(
    User(id = 1L, name = "Jaemin", age = 28),
    User(id = 2L, name = "Minji", age = 26),
)

val names: List<String> = users.map { user ->
    user.name
}
```

입력은 `List<User>`였지만 결과는 `List<String>`이다.

```text
List<User> -> map -> List<String>
```

이 감각이 잡히면 `map`이 훨씬 자연스럽게 읽힌다. 리스트 안의 요소 타입을 다른 타입으로 바꾸는 함수라고 봐도 좋다.

Kotlin 표준 라이브러리의 `Iterable.map` 시그니처를 단순하게 보면 이런 모양이다.

```kotlin
fun <T, R> Iterable<T>.map(transform: (T) -> R): List<R>
```

여기서 `T`는 원본 요소 타입이고, `R`은 변환 결과 타입이다.

```text
T 하나를 받아서 R 하나를 돌려주는 람다
```

를 넘기면, Kotlin이 그 결과를 모아 `List<R>`을 만들어준다.

`transform: (T) -> R`이 어색하다면 [[kotlin-lambda-function|코틀린 람다함수]]를 먼저 보고 오면 `map { ... }` 모양이 훨씬 편하게 읽힌다.

## Android에서 자주 보이는 이유

Android 앱에서는 서버, DB, 화면이 원하는 데이터 모양이 서로 다른 경우가 많다.

서버 응답은 서버 기준의 필드를 가진다.

```kotlin
data class UserDto(
    val id: Long,
    val username: String,
    val fullName: String,
    val avatarUrl: String?,
)
```

하지만 화면에서는 조금 다른 모델이 필요할 수 있다.

```kotlin
data class UserUiModel(
    val id: Long,
    val title: String,
    val subtitle: String,
    val imageUrl: String,
)
```

이때 `map`으로 DTO 리스트를 UI 모델 리스트로 바꾼다.

![Android에서 자주 쓰는 map](/images/kotlin-collection-map-android-dto-ui-handdrawn.png)

```kotlin
val uiModels: List<UserUiModel> = userDtos.map { dto ->
    UserUiModel(
        id = dto.id,
        title = dto.fullName,
        subtitle = "@${dto.username}",
        imageUrl = dto.avatarUrl ?: DEFAULT_PROFILE_IMAGE_URL,
    )
}
```

이 코드는 단순히 필드 이름만 바꾸는 것이 아니다.

서버에서 내려준 값을 화면에서 쓰기 좋은 형태로 정리한다.

```text
username -> "@username" 형식의 subtitle
fullName -> 화면의 title
avatarUrl null -> 기본 이미지 URL
```

서버 모델을 화면에서 그대로 쓰면 처음에는 빠르게 느껴진다. 하지만 화면 요구사항이 바뀔수록 서버 모델에 화면 로직이 묻기 쉽다.

`map`으로 변환 단계를 두면 경계가 조금 더 분명해진다.

```text
API DTO는 서버 응답 모양을 표현한다.
UI Model은 화면에 필요한 값을 표현한다.
map은 둘 사이의 변환 지점이다.
```

이런 변환 코드는 Repository, UseCase, ViewModel 중 어디에 둘지 프로젝트 구조에 따라 달라질 수 있다. 중요한 것은 `map`을 통해 "리스트의 모든 항목을 같은 규칙으로 변환한다"는 의도를 드러낼 수 있다는 점이다.

## UI 상태를 갱신할 때도 자주 쓴다

`map`은 DTO 변환뿐 아니라 리스트 상태를 갱신할 때도 많이 쓴다.

예를 들어 선택된 아이템만 표시해야 한다고 해보자.

```kotlin
data class MenuItemUiState(
    val id: Long,
    val title: String,
    val isSelected: Boolean,
)
```

사용자가 특정 메뉴를 누르면, 전체 리스트 중 해당 아이템만 선택 상태로 만들고 싶다.

```kotlin
fun selectMenu(
    items: List<MenuItemUiState>,
    selectedId: Long,
): List<MenuItemUiState> {
    return items.map { item ->
        item.copy(
            isSelected = item.id == selectedId,
        )
    }
}
```

여기서도 원본 리스트를 직접 바꾸지 않는다. 각 아이템을 보면서 새 상태를 담은 아이템을 만든다.

```text
선택된 id와 같으면 isSelected = true
다르면 isSelected = false
```

`data class`의 `copy`와 함께 쓰면 상태 변경 의도가 잘 드러난다.

```kotlin
val nextItems = currentItems.map { item ->
    if (item.id == selectedId) {
        item.copy(isSelected = true)
    } else {
        item.copy(isSelected = false)
    }
}
```

위 코드는 조금 더 줄여서 이렇게 쓸 수 있다.

```kotlin
val nextItems = currentItems.map { item ->
    item.copy(isSelected = item.id == selectedId)
}
```

Compose, MVI, Redux 스타일 상태 관리에서는 이런 패턴이 특히 자주 나온다.

```text
현재 상태를 직접 수정하지 않고
다음 상태를 새 객체로 만든다.
```

이 흐름을 이해하면 `map`이 단순한 문법이 아니라 상태를 안전하게 갱신하는 도구로 보인다.

## map과 forEach는 다르다

`map`을 처음 쓸 때 흔한 실수 중 하나는 결과를 쓰지 않는 것이다.

```kotlin
users.map { user ->
    println(user.name)
}
```

이 코드는 동작은 한다. 하지만 의도가 애매하다.

`map`은 변환 결과를 모아 새 리스트를 만들기 위한 함수다. 출력만 하고 결과 리스트를 쓰지 않는다면 `forEach`가 더 자연스럽다.

```kotlin
users.forEach { user ->
    println(user.name)
}
```

반대로 새 리스트가 필요하다면 `map`을 쓴다.

```kotlin
val names = users.map { user ->
    user.name
}
```

이 기준이 꽤 중요하다.

```text
결과 리스트가 필요하면 map
실행만 하고 끝낼 거면 forEach
```

물론 `map` 안에서 로그를 찍거나 디버깅을 할 수는 있다. 하지만 핵심 목적이 부수 효과라면 `map`을 쓰지 않는 편이 코드 의도를 더 정확하게 보여준다.

## filter와 같이 읽기

`map`과 같이 자주 나오는 함수가 `filter`다.

`filter`는 남길 요소를 고른다.

```kotlin
val activeUsers = users.filter { user ->
    user.isActive
}
```

`map`은 남아 있는 요소의 모양을 바꾼다.

```kotlin
val activeUserNames = users
    .filter { user -> user.isActive }
    .map { user -> user.name }
```

이 코드는 이렇게 읽으면 된다.

```text
활성 사용자만 남긴다.
남은 사용자에서 이름만 뽑는다.
```

순서를 바꾸면 의미가 달라질 수 있다.

```kotlin
val names = users
    .map { user -> user.name }
    .filter { name -> name.isNotBlank() }
```

이 코드는 먼저 이름으로 바꾼 뒤, 빈 이름을 제거한다.

```text
사용자 기준으로 고를 것인가?
변환된 값 기준으로 고를 것인가?
```

이 질문에 따라 `filter`와 `map`의 순서를 정하면 된다.

## null이 섞이면 mapNotNull

`map`은 각 요소마다 결과를 하나씩 만든다. 그래서 결과가 `null`일 수도 있다.

```kotlin
data class User(
    val id: Long,
    val nickname: String?,
)

val nicknames: List<String?> = users.map { user ->
    user.nickname
}
```

결과 타입은 `List<String?>`이다. `nickname`이 없는 사용자도 결과 리스트에 `null`로 들어간다.

```text
["jaemin", null, "android"]
```

`null`은 버리고 실제 값만 모으고 싶다면 `mapNotNull`을 쓴다.

```kotlin
val nicknames: List<String> = users.mapNotNull { user ->
    user.nickname
}
```

이제 결과 타입은 `List<String>`이다.

```text
["jaemin", "android"]
```

즉 `mapNotNull`은 이런 상황에 잘 맞는다.

```text
변환도 해야 하고
결과가 null이면 제외도 해야 한다.
```

`map { ... }.filterNotNull()`로도 비슷하게 만들 수 있지만, 의도가 처음부터 `null 제거`라면 `mapNotNull`이 더 직접적이다.

## flatMap은 리스트를 펼친다

`map`의 람다는 요소 하나를 결과 하나로 바꾼다.

```kotlin
val words = listOf("kotlin", "android")

val lengths = words.map { word ->
    word.length
}
```

그런데 요소 하나가 리스트를 만들어내는 경우가 있다.

```kotlin
val lines = listOf(
    "kotlin android",
    "compose flow",
)
```

각 문장을 단어 리스트로 바꾸면 결과는 리스트 안의 리스트가 된다.

```kotlin
val nested: List<List<String>> = lines.map { line ->
    line.split(" ")
}

println(nested) // [[kotlin, android], [compose, flow]]
```

이 중첩 리스트를 하나로 펼치고 싶다면 `flatMap`을 쓴다.

```kotlin
val words: List<String> = lines.flatMap { line ->
    line.split(" ")
}

println(words) // [kotlin, android, compose, flow]
```

감각적으로는 이렇게 구분하면 된다.

```text
map: 요소 하나 -> 결과 하나
flatMap: 요소 하나 -> 여러 결과, 그리고 한 리스트로 펼침
```

## 비슷한 함수들과 비교

컬렉션 함수는 이름만 외우면 금방 섞인다. 그래서 목적 기준으로 나눠두는 편이 좋다.

![map과 헷갈리는 함수들](/images/kotlin-collection-map-helper-functions-handdrawn.png)

| 함수 | 목적 | 예시 |
|---|---|---|
| `map` | 각 요소를 다른 값으로 변환 | `users.map { it.name }` |
| `filter` | 조건에 맞는 요소만 남김 | `users.filter { it.isActive }` |
| `forEach` | 각 요소에 대해 실행만 함 | `users.forEach { log(it) }` |
| `mapNotNull` | 변환 결과가 null이면 제외 | `users.mapNotNull { it.nickname }` |
| `flatMap` | 각 요소가 만든 리스트를 펼침 | `posts.flatMap { it.tags }` |

가장 먼저 물어볼 질문은 이것이다.

```text
나는 새 값의 리스트가 필요한가?
```

그렇다면 `map`을 떠올리면 된다.

```text
나는 일부만 남기고 싶은가?
```

그렇다면 `filter`다.

```text
나는 결과 리스트가 아니라 실행만 필요한가?
```

그렇다면 `forEach`다.

## Map 컬렉션과 map 함수는 다르다

대문자 `Map`과 소문자 `map`은 다르다.

```kotlin
val scores: Map<String, Int> = mapOf(
    "kotlin" to 90,
    "android" to 95,
)
```

여기서 `Map<String, Int>`는 키와 값을 가진 컬렉션 타입이다.

이 `Map`에도 소문자 `map` 함수를 호출할 수 있다.

```kotlin
val labels: List<String> = scores.map { entry ->
    "${entry.key}: ${entry.value}"
}
```

주의할 점은 `Map`에 `map`을 호출하면 결과는 다시 `Map`이 아니라 `List`라는 점이다.

```text
Map<String, Int> -> map -> List<String>
```

키는 유지하고 값만 바꾸고 싶다면 `mapValues`가 더 맞다.

```kotlin
val percentLabels: Map<String, String> = scores.mapValues { entry ->
    "${entry.value}%"
}
```

키를 바꾸고 싶다면 `mapKeys`를 쓴다.

```kotlin
val upperCaseKeys: Map<String, Int> = scores.mapKeys { entry ->
    entry.key.uppercase()
}
```

정리하면 이렇게 볼 수 있다.

```text
List의 각 요소를 바꾸고 싶다 -> map
Map의 값을 유지한 채 value만 바꾸고 싶다 -> mapValues
Map의 값을 유지한 채 key만 바꾸고 싶다 -> mapKeys
```

## map은 즉시 새 리스트를 만든다

일반적인 `List.map`은 즉시 실행되고 새 리스트를 만든다.

```kotlin
val result = users
    .filter { it.isActive }
    .map { it.name }
```

이 코드는 컬렉션 크기가 작거나 보통 수준이면 충분히 읽기 좋고 실용적이다.

다만 데이터가 매우 크고, 여러 변환을 길게 연결하고, 앞쪽 일부 결과만 필요한 상황이라면 `Sequence`를 고려할 수 있다.

```kotlin
val firstTenNames = users
    .asSequence()
    .filter { it.isActive }
    .map { it.name }
    .take(10)
    .toList()
```

`Sequence`는 중간 연산을 지연해서 처리한다. 하지만 마지막에 `toList()` 같은 최종 연산을 호출해야 실제 결과가 만들어진다.

그렇다고 모든 코드에 습관적으로 `asSequence()`를 붙일 필요는 없다.

보통 Android 화면에서 다루는 적당한 크기의 리스트라면 `filter`, `map`을 바로 연결하는 코드가 더 단순하고 읽기 쉽다. 성능 문제가 실제로 보이거나 데이터 크기가 큰 흐름에서만 `Sequence`를 선택해도 늦지 않다.

## map을 읽는 연습

실제 코드에서는 `map`이 한 줄로만 나오지 않는다.

```kotlin
val sections = categories.map { category ->
    CategorySectionUiState(
        id = category.id,
        title = category.name,
        products = products
            .filter { product -> product.categoryId == category.id }
            .map { product ->
                ProductCardUiState(
                    id = product.id,
                    name = product.name,
                    priceText = priceFormatter.format(product.price),
                )
            },
    )
}
```

처음 보면 복잡해 보이지만 바깥부터 읽으면 된다.

```text
categories를 CategorySectionUiState 리스트로 바꾼다.
각 category 안에서 해당 category의 products만 고른다.
그 products를 ProductCardUiState 리스트로 바꾼다.
```

여기에는 `map`이 두 번 나온다.

첫 번째 `map`은 카테고리를 섹션으로 바꾼다.

```text
Category -> CategorySectionUiState
```

두 번째 `map`은 상품을 카드 상태로 바꾼다.

```text
Product -> ProductCardUiState
```

이렇게 타입의 변화를 따라가면 긴 컬렉션 체인도 훨씬 덜 막힌다.

## 자주 하는 실수

`map`을 쓸 때 자주 보이는 실수는 크게 세 가지다.

첫 번째는 결과를 버리는 것이다.

```kotlin
users.map { user ->
    analytics.logUser(user.id)
}
```

결과 리스트를 쓰지 않는다면 `forEach`가 더 맞다.

```kotlin
users.forEach { user ->
    analytics.logUser(user.id)
}
```

두 번째는 원본이 바뀐다고 생각하는 것이다.

```kotlin
val numbers = mutableListOf(1, 2, 3)

numbers.map { it * 2 }

println(numbers) // [1, 2, 3]
```

`map`의 결과를 변수에 담아야 한다.

```kotlin
val doubled = numbers.map { it * 2 }
```

세 번째는 `null`을 만들고 나중에 처리하지 않는 것이다.

```kotlin
val nicknames: List<String?> = users.map { user ->
    user.nickname
}
```

`null`이 필요 없는 결과라면 처음부터 `mapNotNull`을 쓰는 편이 낫다.

```kotlin
val nicknames: List<String> = users.mapNotNull { user ->
    user.nickname
}
```

## 정리

`map`은 Kotlin 컬렉션을 읽을 때 반드시 익숙해져야 하는 함수 중 하나다.

핵심은 단순하다.

```text
각 요소를 하나씩 꺼낸다.
람다로 새 값으로 바꾼다.
그 결과를 모아 새 리스트를 만든다.
```

그래서 아래 코드는:

```kotlin
val names = users.map { user ->
    user.name
}
```

이렇게 읽으면 된다.

```text
users의 각 User를
name 문자열로 바꿔서
List<String>을 만든다.
```

Android 코드에서는 특히 DTO를 UI Model로 바꿀 때, Entity를 도메인 모델로 바꿀 때, 화면 상태 리스트를 새 상태로 갱신할 때 자주 나온다.

`map`을 잘 읽는다는 것은 단순히 컬렉션 함수를 하나 아는 것에서 끝나지 않는다. 코드에서 데이터가 어떤 타입에서 어떤 타입으로 이동하는지 따라갈 수 있다는 뜻이다.

## 함께 읽기

- [[kotlin-lambda-function|코틀린 람다함수]]
- [[kotlin-data-class-syntax|코틀린 data class 문법]]
- [[mvi-basic-counter-sample|MVI Counter 샘플로 상태 흐름 이해하기]]
