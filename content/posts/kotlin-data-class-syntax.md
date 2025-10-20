---
title: "코틀린 data class 문법"
date: "2025-10-20"
category: "Kotlin"
group: "Kotlin Basics"
series: "Kotlin Basics"
tags: ["kotlin", "data class", "android", "compose", "ui state"]
description: "Kotlin data class의 기본 문법, 자동 생성되는 함수, copy와 구조 분해, equals/hashCode 주의점까지 Android 예시로 정리합니다."
---

![코틀린 data class 문법](/images/kotlin-data-class-cover.png)

Kotlin 코드를 읽다 보면 `data class`를 정말 자주 만난다.

API 응답 모델에도 있고, Room Entity에도 있고, Compose UI State에도 있고, MVI 예제에도 있다.

```kotlin
data class User(
    val id: Long,
    val name: String,
    val age: Int,
)
```

처음 보면 그냥 `class` 앞에 `data` 키워드가 하나 붙은 정도로 보인다. 그런데 이 키워드 하나 때문에 Kotlin 컴파일러가 꽤 많은 코드를 대신 만들어준다.

한 줄로 말하면 이렇다.

```text
data class는 데이터를 담는 클래스를
값처럼 다루기 좋게 만들어주는 Kotlin 문법이다.
```

여기서 중요한 말은 "데이터를 담는다"와 "값처럼 다룬다"다.

객체가 어떤 값을 가지고 있는지 비교하고, 로그로 출력하고, 일부 값만 바꾼 새 객체를 만들고, 여러 값으로 나누어 꺼내는 일이 자연스러워진다.

## 일반 class로 만들면 왜 길어질까

먼저 `data class` 없이 `User`를 만든다고 생각해보자.

```kotlin
class User(
    val id: Long,
    val name: String,
    val age: Int,
)
```

이 코드도 객체를 만들 수는 있다.

```kotlin
val user = User(
    id = 1L,
    name = "Jaemin",
    age = 28,
)
```

하지만 값 비교를 해보면 기대와 다를 수 있다.

```kotlin
val user1 = User(1L, "Jaemin", 28)
val user2 = User(1L, "Jaemin", 28)

println(user1 == user2)
```

겉으로 보면 두 객체는 같은 값을 가지고 있다. 그런데 일반 클래스에서 `equals()`를 따로 구현하지 않았다면, 기본 비교는 "같은 객체인가"에 가깝게 동작한다.

즉 이런 질문이 된다.

```text
두 객체가 같은 값을 담았는가?
```

가 아니라

```text
두 변수가 메모리에서 같은 객체를 가리키는가?
```

에 더 가깝다.

값 기준으로 비교하려면 보통 이런 코드를 직접 작성해야 한다.

```kotlin
class User(
    val id: Long,
    val name: String,
    val age: Int,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is User) return false

        return id == other.id &&
            name == other.name &&
            age == other.age
    }

    override fun hashCode(): Int {
        var result = id.hashCode()
        result = 31 * result + name.hashCode()
        result = 31 * result + age
        return result
    }

    override fun toString(): String {
        return "User(id=$id, name=$name, age=$age)"
    }
}
```

데이터 몇 개 담으려고 만든 클래스인데 코드가 길어진다. 필드가 추가되면 `equals`, `hashCode`, `toString`도 같이 고쳐야 한다.

`data class`는 이 반복을 줄여준다.

![일반 class와 data class 비교](/images/kotlin-data-class-class-vs-data-class-handdrawn.png)

같은 `User`를 `data class`로 만들면 이렇게 끝난다.

```kotlin
data class User(
    val id: Long,
    val name: String,
    val age: Int,
)
```

이제 `User(1, "Jaemin", 28)`처럼 같은 값을 담은 객체끼리는 값 기준으로 비교된다.

```kotlin
val user1 = User(1L, "Jaemin", 28)
val user2 = User(1L, "Jaemin", 28)

println(user1 == user2) // true
```

## data class 기본 문법

기본 모양은 단순하다.

```kotlin
data class 클래스이름(
    val 프로퍼티1: 타입,
    val 프로퍼티2: 타입,
)
```

예를 들어 로그인한 사용자의 간단한 프로필을 표현하면 이렇게 쓸 수 있다.

```kotlin
data class UserProfile(
    val userId: Long,
    val nickname: String,
    val profileImageUrl: String?,
)
```

상태를 표현할 때도 자주 쓴다.

```kotlin
data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
)
```

`data class`가 되려면 몇 가지 조건이 있다.

```text
주 생성자에 최소 하나 이상의 파라미터가 있어야 한다.
주 생성자의 파라미터는 val 또는 var여야 한다.
data class 자체는 abstract, open, sealed, inner가 될 수 없다.
```

그래서 아래 코드는 안 된다.

```kotlin
// 주 생성자 파라미터가 없음
data class Empty
```

```kotlin
// val 또는 var가 없음
data class User(id: Long)
```

올바른 형태는 이렇게 프로퍼티로 선언하는 것이다.

```kotlin
data class User(
    val id: Long,
)
```

`var`도 가능하다.

```kotlin
data class User(
    var name: String,
)
```

하지만 Android UI State나 DTO처럼 값을 담는 용도라면 보통 `val` 중심으로 만든다. 값이 바뀌어야 할 때 객체 내부를 직접 바꾸기보다, 새 값을 담은 새 객체를 만드는 쪽이 상태 흐름을 추적하기 쉽기 때문이다.

## 자동으로 만들어지는 함수

`data class`를 쓰면 Kotlin 컴파일러가 주 생성자에 선언된 프로퍼티를 기준으로 몇 가지 함수를 만들어준다.

![data class가 자동으로 만들어주는 함수](/images/kotlin-data-class-generated-functions-handdrawn.png)

대표적으로 다음이 있다.

```text
equals()
hashCode()
toString()
copy()
componentN()
```

하나씩 보면 감이 훨씬 잘 온다.

## equals는 값을 비교한다

`data class`의 `equals()`는 주 생성자 프로퍼티 값을 비교한다.

```kotlin
data class User(
    val id: Long,
    val name: String,
)

val a = User(1L, "Jaemin")
val b = User(1L, "Jaemin")
val c = User(2L, "Jaemin")

println(a == b) // true
println(a == c) // false
```

`a`와 `b`는 서로 다른 객체지만, `id`와 `name`이 같으므로 `==` 결과가 `true`다.

Kotlin에서 `==`는 보통 `equals()`를 호출한다. 같은 참조인지 확인하고 싶다면 `===`를 쓴다.

```kotlin
println(a == b)  // 값 비교
println(a === b) // 참조 비교
```

데이터 모델에서는 보통 값 비교가 더 자주 필요하다. 예를 들어 서버에서 같은 사용자 정보를 다시 받아왔는지, 화면 상태가 실제로 달라졌는지 확인할 때 유용하다.

## hashCode는 컬렉션에서 중요하다

`equals()`를 이야기하면 `hashCode()`도 같이 봐야 한다.

`HashSet`, `HashMap` 같은 해시 기반 컬렉션은 `hashCode()`와 `equals()`를 함께 사용한다.

```kotlin
data class User(
    val id: Long,
    val name: String,
)

val set = hashSetOf(
    User(1L, "Jaemin")
)

println(set.contains(User(1L, "Jaemin"))) // true
```

일반 클래스에서 `equals()`만 구현하고 `hashCode()`를 빼먹으면 이런 컬렉션에서 이상한 버그가 생길 수 있다. `data class`는 둘을 한 쌍으로 만들어주기 때문에 이런 기본 실수를 줄여준다.

다만 `var` 프로퍼티를 조심해야 한다.

```kotlin
data class User(
    var id: Long,
    val name: String,
)

val user = User(1L, "Jaemin")
val set = hashSetOf(user)

user.id = 2L

println(set.contains(user)) // 기대와 다를 수 있음
```

`id`가 `hashCode()` 계산에 들어가는데, `HashSet`에 넣은 뒤 값을 바꿔버렸다. 컬렉션 입장에서는 객체를 넣을 때의 해시 위치와 찾을 때의 해시 위치가 달라질 수 있다.

그래서 해시 기반 컬렉션의 key로 쓰거나, 식별자로 쓰는 값은 `val`로 두는 편이 훨씬 안전하다.

## toString은 로그를 읽기 좋게 만든다

일반 객체를 로그로 찍으면 이런 식으로 나올 수 있다.

```text
User@7a81197d
```

`data class`는 주 생성자 프로퍼티를 포함한 문자열을 만들어준다.

```kotlin
data class User(
    val id: Long,
    val name: String,
    val age: Int,
)

val user = User(1L, "Jaemin", 28)

println(user)
```

출력은 이런 모양이다.

```text
User(id=1, name=Jaemin, age=28)
```

Android에서 로그를 볼 때 꽤 편하다.

```kotlin
Log.d("User", "loaded user=$user")
```

다만 민감한 값은 주의해야 한다.

```kotlin
data class LoginRequest(
    val email: String,
    val password: String,
)
```

이런 모델을 그대로 로그에 찍으면 `password`까지 `toString()`에 포함될 수 있다.

민감 정보가 들어가는 클래스라면 로그를 남기지 않거나, `toString()`을 직접 제어하거나, 애초에 로그에 들어가도 되는 모델과 분리하는 편이 좋다.

## copy는 일부 값만 바꾼 새 객체를 만든다

`copy()`는 `data class`에서 가장 자주 체감되는 기능이다.

```kotlin
data class User(
    val id: Long,
    val name: String,
    val age: Int,
)

val user = User(
    id = 1L,
    name = "Jaemin",
    age = 28,
)

val olderUser = user.copy(age = 29)
```

`olderUser`는 `id`, `name`은 그대로 두고 `age`만 바꾼 새 객체다.

```kotlin
println(user)      // User(id=1, name=Jaemin, age=28)
println(olderUser) // User(id=1, name=Jaemin, age=29)
```

기존 객체를 바꾸는 것이 아니다.

```text
old object를 수정
```

이 아니라

```text
old object를 바탕으로 new object를 생성
```

에 가깝다.

이 감각은 Compose UI State에서 특히 중요하다.

![copy로 불변 상태 업데이트하기](/images/kotlin-data-class-copy-shallow-handdrawn.png)

예를 들어 로그인 화면 상태가 있다고 해보자.

```kotlin
data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
)
```

사용자가 이메일을 입력하면 기존 상태를 직접 바꾸는 대신 새 상태를 만든다.

```kotlin
state = state.copy(
    email = newEmail,
    errorMessage = null,
)
```

로딩을 시작할 때도 비슷하다.

```kotlin
state = state.copy(
    isLoading = true,
    errorMessage = null,
)
```

실패하면 이렇게 바꿀 수 있다.

```kotlin
state = state.copy(
    isLoading = false,
    errorMessage = "로그인에 실패했습니다.",
)
```

이렇게 하면 상태 변화가 코드에 드러난다.

```text
이전 상태
-> 사용자의 액션
-> 일부 값을 바꾼 새 상태
-> 화면은 새 상태를 그림
```

Compose에서는 UI를 직접 수정한다기보다, 새 상태를 넘겨 다시 그리게 하는 방식으로 생각하면 편하다. `data class`와 `copy()`는 이 흐름에 잘 맞는다.

## copy는 얕은 복사다

여기서 중요한 함정이 있다.

`copy()`는 깊은 복사가 아니라 얕은 복사다.

객체 안에 다른 mutable 객체가 들어 있으면, 그 내부 객체까지 새로 복사해주지는 않는다.

```kotlin
data class User(
    val name: String,
    val tags: MutableList<String>,
)

val user1 = User(
    name = "Jaemin",
    tags = mutableListOf("android"),
)

val user2 = user1.copy()

user2.tags.add("kotlin")

println(user1.tags) // [android, kotlin]
println(user2.tags) // [android, kotlin]
```

`user1`과 `user2`는 서로 다른 `User` 객체다. 하지만 둘의 `tags`는 같은 `MutableList`를 바라본다.

그래서 `user2.tags`를 바꿨는데 `user1.tags`도 같이 바뀐 것처럼 보인다.

이 문제를 줄이려면 mutable 컬렉션을 모델 밖으로 밀어내거나, 읽기 전용 타입을 쓰거나, 정말 복사가 필요할 때 내부 값까지 새로 만들어야 한다.

```kotlin
val user2 = user1.copy(
    tags = user1.tags.toMutableList()
)
```

UI State라면 가능하면 이런 식으로 두는 편이 낫다.

```kotlin
data class UserUiState(
    val name: String,
    val tags: List<String>,
)
```

`List`라고 해서 런타임에서 항상 완전한 불변 컬렉션이라는 뜻은 아니지만, 적어도 이 모델을 사용하는 쪽에서는 리스트를 직접 바꾸지 않는다는 의도를 드러낼 수 있다.

## componentN과 구조 분해

`data class`는 프로퍼티 순서대로 `componentN()` 함수도 만들어준다.

```kotlin
data class User(
    val id: Long,
    val name: String,
    val age: Int,
)
```

대략 이런 함수들이 생긴다고 생각하면 된다.

```kotlin
operator fun component1(): Long
operator fun component2(): String
operator fun component3(): Int
```

덕분에 구조 분해가 가능하다.

```kotlin
val user = User(1L, "Jaemin", 28)

val (id, name, age) = user

println(id)
println(name)
println(age)
```

반복문에서도 쓸 수 있다.

```kotlin
val users = listOf(
    User(1L, "Jaemin", 28),
    User(2L, "Minji", 30),
)

for ((id, name) in users) {
    println("$id: $name")
}
```

다만 구조 분해는 선언 순서에 의존한다.

```kotlin
data class User(
    val id: Long,
    val name: String,
    val age: Int,
)
```

이 순서에서는 `component1()`이 `id`, `component2()`가 `name`이다.

프로퍼티 순서가 바뀌면 구조 분해 결과도 바뀐다.

```kotlin
data class User(
    val name: String,
    val id: Long,
    val age: Int,
)
```

그래서 중요한 비즈니스 코드에서는 구조 분해가 오히려 읽기 어려울 수 있다.

```kotlin
val (_, name) = user
```

이 코드만 보면 두 번째 값이 정말 `name`인지, 모델 선언을 다시 확인해야 한다. 간단한 지역 코드에서는 편하지만, 의미가 중요한 곳에서는 `user.name`처럼 명시적으로 쓰는 편이 더 안전하다.

## body에 선언한 프로퍼티는 자동 생성 함수에서 빠진다

`data class`에서 가장 헷갈리기 쉬운 부분이 이것이다.

컴파일러가 자동 생성 함수에 사용하는 값은 **주 생성자에 선언된 프로퍼티**다.

```kotlin
data class User(
    val id: Long,
    val name: String,
) {
    var isSelected: Boolean = false
}
```

여기서 `id`, `name`은 주 생성자 프로퍼티다. `isSelected`는 클래스 body에 선언된 프로퍼티다.

이 경우 `equals`, `hashCode`, `toString`, `copy`, `componentN`은 기본적으로 `id`, `name`만 기준으로 만들어진다.

```kotlin
val user1 = User(1L, "Jaemin").apply {
    isSelected = true
}

val user2 = User(1L, "Jaemin").apply {
    isSelected = false
}

println(user1 == user2) // true
println(user1)          // User(id=1, name=Jaemin)
```

처음 보면 이상하다. `isSelected` 값이 다른데도 두 객체가 같다고 나온다.

하지만 `isSelected`가 주 생성자에 없기 때문에 값 비교에서 빠진다.

이게 의도라면 괜찮다. 예를 들어 서버에서 내려온 사용자 값은 `id`, `name`이고, 화면에서 잠깐 쓰는 선택 상태는 별도로 두고 싶은 경우가 있을 수 있다.

하지만 대부분의 UI State에서는 이런 방식이 오히려 혼란을 만든다.

```kotlin
data class UserItemUiState(
    val id: Long,
    val name: String,
    val isSelected: Boolean,
)
```

화면을 그리는 데 영향을 주는 값이라면 주 생성자에 넣는 편이 상태 비교와 로그가 직관적이다.

## 기본값을 넣으면 생성이 편해진다

UI State에서는 기본값을 자주 넣는다.

```kotlin
data class SearchUiState(
    val query: String = "",
    val results: List<SearchResult> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
)
```

그러면 초기 상태를 간단히 만들 수 있다.

```kotlin
val initialState = SearchUiState()
```

테스트에서도 필요한 값만 바꿔 만들기 쉽다.

```kotlin
val loadingState = SearchUiState(
    query = "kotlin",
    isLoading = true,
)
```

기본값이 없으면 모든 값을 매번 넘겨야 한다.

```kotlin
SearchUiState(
    query = "",
    results = emptyList(),
    isLoading = false,
    errorMessage = null,
)
```

모든 모델에 무조건 기본값을 넣어야 하는 건 아니다. 특히 서버 응답 DTO에서 값이 반드시 있어야 한다면 기본값이 오히려 오류를 숨길 수 있다.

```kotlin
data class UserResponse(
    val id: Long,
    val nickname: String,
)
```

여기서 `id`가 없으면 모델 생성이 실패하는 편이 더 나을 수 있다.

반대로 UI State는 "처음 화면에 들어왔을 때의 빈 상태"가 자연스럽게 존재하므로 기본값이 잘 맞는다.

## Android에서 자주 쓰는 예시

### API 응답 DTO

서버 응답을 담는 DTO는 `data class`와 잘 맞는다.

```kotlin
data class UserResponse(
    val id: Long,
    val email: String,
    val nickname: String,
    val profileImageUrl: String?,
)
```

값을 담고, 비교하고, 로그로 확인하는 일이 많기 때문이다.

다만 DTO를 그대로 화면 모델로 계속 끌고 가기보다, 화면에 필요한 모델로 변환하는 편이 더 명확할 때가 많다.

```kotlin
data class UserUiModel(
    val id: Long,
    val displayName: String,
    val avatarUrl: String?,
)

fun UserResponse.toUiModel(): UserUiModel {
    return UserUiModel(
        id = id,
        displayName = nickname.ifBlank { email },
        avatarUrl = profileImageUrl,
    )
}
```

### Compose UI State

화면 상태는 `data class`가 특히 잘 어울린다.

```kotlin
data class ProfileUiState(
    val isLoading: Boolean = false,
    val user: UserUiModel? = null,
    val errorMessage: String? = null,
)
```

ViewModel에서는 새 상태를 만들어 내려준다.

```kotlin
class ProfileViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    fun loadProfile() {
        _uiState.update { state ->
            state.copy(isLoading = true, errorMessage = null)
        }
    }
}
```

핵심은 `ProfileUiState` 안의 값을 직접 바꾸지 않고, `copy()`로 새 상태를 만든다는 점이다.

```kotlin
state.copy(isLoading = true)
```

이 코드만 봐도 어떤 값이 바뀌었는지 드러난다.

### 리스트 아이템 모델

RecyclerView나 Compose 리스트에서도 자주 쓴다.

```kotlin
data class ArticleItemUiModel(
    val id: Long,
    val title: String,
    val summary: String,
    val isBookmarked: Boolean,
)
```

북마크 상태를 바꿀 때는 기존 리스트 안의 아이템을 직접 수정하기보다 새 리스트를 만들 수 있다.

```kotlin
val newItems = oldItems.map { item ->
    if (item.id == targetId) {
        item.copy(isBookmarked = !item.isBookmarked)
    } else {
        item
    }
}
```

이렇게 하면 이전 리스트와 새 리스트의 차이가 값으로 드러난다.

다만 여기서도 "동일한 아이템인지"와 "내용이 같은지"는 구분해서 생각해야 한다.

```text
id가 같다
-> 같은 아이템이다

title, summary, isBookmarked까지 모두 같다
-> 화면에 그릴 내용도 같다
```

DiffUtil이나 LazyColumn key를 다룰 때는 이 둘을 섞지 않는 것이 중요하다.

## data class가 어울리지 않는 경우

`data class`가 편하다고 모든 클래스를 `data class`로 만들 필요는 없다.

이런 클래스는 보통 일반 class가 더 자연스럽다.

```text
상태보다 동작이 중심인 객체
안에서 리소스나 생명주기를 관리하는 객체
Context, CoroutineScope, Listener 같은 외부 객체를 오래 들고 있는 객체
식별자만 같으면 같은 객체로 봐야 하는 도메인 객체
상속 구조 자체가 중요한 객체
```

예를 들어 연결을 관리하는 객체는 단순한 데이터 그릇이 아니다.

```kotlin
class RealtimeConnection(
    private val socket: Socket,
) {
    fun connect() {
        // 연결 시작
    }

    fun disconnect() {
        // 연결 해제
    }
}
```

이런 객체를 `data class`로 만들어서 `copy()`하거나 `toString()`으로 내부 리소스를 드러내는 것은 어색하다.

또 어떤 도메인에서는 값 전체가 아니라 `id`만 같으면 같은 객체로 봐야 할 수도 있다.

```kotlin
class User(
    val id: Long,
    val name: String,
)
```

이 경우 `name`이 바뀌어도 같은 사용자로 볼지, 값이 다르니 다른 객체로 볼지 기준을 먼저 정해야 한다. `data class`는 주 생성자 프로퍼티 전체를 값 비교에 넣으므로, 도메인 기준과 맞지 않을 수 있다.

## 자주 헷갈리는 지점 정리

첫 번째, `data class`는 자동으로 `equals`, `hashCode`, `toString`, `copy`, `componentN`을 만든다.

두 번째, 이 자동 생성 함수들은 주 생성자에 선언된 프로퍼티를 기준으로 한다.

세 번째, `copy()`는 일부 값만 바꾼 새 객체를 만들지만 얕은 복사다.

네 번째, `componentN()` 덕분에 구조 분해가 가능하지만 선언 순서에 의존한다.

다섯 번째, `var` 프로퍼티가 `equals/hashCode`에 들어가면 해시 컬렉션에서 위험할 수 있다.

여섯 번째, Android UI State에서는 `val` 중심의 `data class`와 `copy()` 조합이 상태 변화를 읽기 쉽게 만든다.

## 한 줄로 정리하기

`data class`는 데이터를 담는 클래스를 값처럼 다루기 좋게 만들어주는 Kotlin 문법이다.

```kotlin
data class User(
    val id: Long,
    val name: String,
    val age: Int,
)
```

이 한 줄에 가까운 선언으로 Kotlin은 값 비교, 해시 계산, 문자열 출력, 복사, 구조 분해를 위한 함수를 만들어준다.

그래서 단순히 "코드를 짧게 쓰는 문법"이라고만 보면 아깝다.

`data class`를 제대로 이해하려면 이런 질문까지 같이 떠올리는 편이 좋다.

```text
이 객체는 정말 데이터를 담는 용도인가?
값 비교 기준은 주 생성자 프로퍼티 전체가 맞는가?
copy()로 새 객체를 만들 때 내부 mutable 값은 안전한가?
로그에 찍히면 안 되는 값이 toString()에 들어가지는 않는가?
```

이 질문들까지 같이 잡히면 `data class`는 Android 코드에서 꽤 믿을 만한 기본 도구가 된다.

## 함께 읽기

- [[kotlin-lambda-function|코틀린 람다함수]]
- [[android-ui-state-layer-compose|안정적인 Compose 화면을 위한 UI State 설계]]
- [[compose-mutablestateof-state-change|mutableStateOf와 state 변경]]
- [[mvi-basic-counter-sample|MVI Basic Counter 샘플]]

## 참고자료

- [Kotlin Docs - Data classes](https://kotlinlang.org/docs/data-classes.html)
- [Android Developers - Where to hoist state](https://developer.android.com/develop/ui/compose/state-hoisting)
- [Android Developers - State and Jetpack Compose](https://developer.android.com/develop/ui/compose/state)
