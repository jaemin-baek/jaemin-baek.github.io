---
title: "코틀린 sealed class 문법"
date: "2025-10-21"
category: "Kotlin"
group: "Kotlin Basics"
series: "Kotlin Basics"
tags: ["kotlin", "sealed class", "android", "compose", "ui state", "when", "result"]
description: "Kotlin sealed class의 기본 문법, when 전체 분기, enum class와의 차이, Android UI State와 Result 모델링 예시까지 정리합니다."
---

![코틀린 sealed class 문법](/images/kotlin-sealed-class-cover.png)

앞에서 [[kotlin-object-keyword|object 키워드]]와 [[kotlin-data-class-syntax|data class 문법]]을 정리했다.

`sealed class`는 이 두 문법과 자주 같이 등장한다. 값이 없는 상태는 `object`나 `data object`로 만들고, 값이 필요한 상태는 `data class`로 만들기 때문이다.

Kotlin 코드를 보다 보면 `sealed class`를 자주 만난다.

특히 Android에서는 화면 상태를 표현할 때 많이 나온다.

```kotlin
sealed class UiState {
    data object Loading : UiState()
    data class Success(val users: List<User>) : UiState()
    data class Error(val message: String) : UiState()
}
```

처음 보면 질문이 생긴다.

```text
class 앞에 sealed가 붙으면 뭐가 달라질까?
enum class랑 비슷한 건가?
왜 UI State 예제에 자주 나올까?
```

한 줄로 먼저 정리하면 이렇다.

```text
sealed class는 하위 타입의 종류를 제한해서
상태를 타입으로 안전하게 표현하는 Kotlin 문법이다.
```

여기서 중요한 말은 `하위 타입의 종류를 제한한다`와 `상태를 타입으로 표현한다`다.

## sealed는 닫힌 타입 계층이다

`sealed`는 영어로 봉인된, 밀봉된 정도의 뜻이다.

Kotlin에서는 이렇게 이해하면 쉽다.

```text
이 타입을 상속할 수 있는 하위 타입을
정해진 범위 안에서만 만들 수 있게 한다.
```

예를 들어 로그인 화면 상태를 표현한다고 해보자.

![sealed class는 닫힌 타입 계층](/images/kotlin-sealed-class-closed-hierarchy-handdrawn.png)

로그인 화면에는 대략 이런 상태가 있을 수 있다.

```text
아직 아무 일도 안 한 상태
로그인 중인 상태
로그인 성공 상태
로그인 실패 상태
```

이 상태를 문자열로 표현할 수도 있다.

```kotlin
val state: String = "loading"
```

하지만 문자열은 너무 열려 있다.

```kotlin
val state: String = "loadding"
val state2: String = "successed"
val state3: String = "network_error_maybe"
```

오타도 들어갈 수 있고, 누군가 약속하지 않은 문자열을 넣을 수도 있다. 컴파일러는 이 값들이 올바른 상태인지 알기 어렵다.

`sealed class`를 쓰면 가능한 상태를 타입으로 고정할 수 있다.

```kotlin
sealed class LoginState {
    data object Idle : LoginState()
    data object Loading : LoginState()
    data class Success(val user: User) : LoginState()
    data class Error(val message: String) : LoginState()
}
```

이제 `LoginState`는 아무 문자열이나 받는 상태가 아니다.

```text
LoginState는 Idle, Loading, Success, Error 중 하나다.
```

그리고 각 상태가 필요한 데이터도 자기 타입 안에 담을 수 있다.

```kotlin
val state: LoginState = LoginState.Success(
    user = User(id = 1L, name = "Jaemin")
)
```

성공 상태에는 `User`가 필요하고, 에러 상태에는 메시지가 필요하다. 이 차이를 타입으로 표현할 수 있다는 점이 중요하다.

## 기본 문법

기본 형태는 이렇다.

```kotlin
sealed class 클래스이름 {
    하위타입들
}
```

가장 단순한 예시는 이렇게 쓸 수 있다.

```kotlin
sealed class Result {
    data object Loading : Result()
    data class Success(val data: String) : Result()
    data class Failure(val throwable: Throwable) : Result()
}
```

읽는 방식은 이렇다.

```text
Result라는 상위 타입이 있고,
Result가 될 수 있는 구체적인 경우는
Loading, Success, Failure다.
```

`Loading`처럼 추가 데이터가 없는 상태는 `object`로 표현할 수 있다.

```kotlin
sealed class UiState {
    object Loading : UiState()
}
```

Kotlin 버전이 충분히 최신이라면 `data object`도 자주 쓴다.

```kotlin
sealed class UiState {
    data object Loading : UiState()
}
```

`data object`는 `object` 하나짜리 상태를 `data class`처럼 더 읽기 좋은 `toString()` 형태로 다루고 싶을 때 유용하다.

값이 필요한 상태는 보통 `data class`로 만든다.

```kotlin
sealed class UiState {
    data class Content(
        val users: List<User>
    ) : UiState()

    data class Error(
        val message: String
    ) : UiState()
}
```

여기서 `Content`와 `Error`는 각각 `UiState`를 상속한다.

```kotlin
data class Content(...) : UiState()
```

마지막의 `UiState()`가 상속 호출이다. `UiState`가 클래스이기 때문에 생성자를 호출하는 모양으로 쓴다.

## sealed class는 직접 만들 수 없다

`sealed class` 자체는 추상 타입에 가깝다.

```kotlin
sealed class UiState
```

그래서 보통 아래처럼 직접 만들지 않는다.

```kotlin
val state = UiState() // 불가능
```

대신 하위 타입 중 하나를 만든다.

```kotlin
val loading: UiState = UiState.Loading
val content: UiState = UiState.Content(users)
val error: UiState = UiState.Error("네트워크 오류")
```

이렇게 `UiState` 타입 변수 하나에 여러 하위 상태를 담을 수 있다.

```kotlin
fun render(state: UiState) {
    // Loading, Content, Error 중 하나가 들어온다.
}
```

이 구조가 Android 화면 상태와 잘 맞는다.

```text
화면은 현재 하나의 상태를 가진다.
그 상태는 Loading일 수도 있고,
Content일 수도 있고,
Error일 수도 있다.
```

## when과 함께 쓸 때 강력해진다

`sealed class`의 가장 큰 장점은 `when`과 같이 쓸 때 잘 드러난다.

![sealed class와 when 전체 분기](/images/kotlin-sealed-class-when-exhaustive-handdrawn.png)

예를 들어 화면 상태를 그리는 함수가 있다고 해보자.

```kotlin
fun render(state: UiState) {
    when (state) {
        UiState.Loading -> showLoading()
        is UiState.Content -> showContent(state.users)
        is UiState.Error -> showError(state.message)
    }
}
```

여기서 `when`은 `UiState`의 모든 하위 타입을 처리하고 있다.

```text
Loading 처리함
Content 처리함
Error 처리함
```

그래서 `else`가 없어도 된다.

`sealed class`가 아니었다면 컴파일러는 가능한 하위 타입을 전부 알기 어렵다. 하지만 `sealed class`는 하위 타입의 범위가 제한되어 있기 때문에 컴파일러가 이렇게 확인할 수 있다.

```text
UiState의 가능한 경우를 모두 처리했는가?
```

이 점이 상태 처리 코드에서 매우 중요하다.

컴파일러 검사를 코드 모양에서 더 분명하게 드러내고 싶다면 `when`을 expression으로 쓰는 방법도 좋다.

```kotlin
fun titleOf(state: UiState): String {
    return when (state) {
        UiState.Loading -> "로딩 중"
        is UiState.Content -> "${state.users.size}명"
        is UiState.Error -> "에러"
    }
}
```

이렇게 반환값을 만드는 `when`은 모든 경우를 처리해야 한다. 새 하위 타입이 추가되었는데 분기가 빠져 있으면 더 빨리 눈에 띈다.

## 새 상태를 추가하면 빠뜨린 분기를 찾을 수 있다

처음에는 상태가 세 개였다고 해보자.

```kotlin
sealed class UiState {
    data object Loading : UiState()
    data class Content(val users: List<User>) : UiState()
    data class Error(val message: String) : UiState()
}
```

나중에 빈 화면 상태가 추가된다.

```kotlin
sealed class UiState {
    data object Loading : UiState()
    data object Empty : UiState()
    data class Content(val users: List<User>) : UiState()
    data class Error(val message: String) : UiState()
}
```

이때 기존 `when` 코드가 `Empty`를 처리하지 않으면 컴파일러가 알려줄 수 있다.

```kotlin
fun render(state: UiState) {
    when (state) {
        UiState.Loading -> showLoading()
        is UiState.Content -> showContent(state.users)
        is UiState.Error -> showError(state.message)
    }
}
```

이 코드는 이제 모든 경우를 다루지 않는다.

```text
Empty 상태가 추가되었는데 render에서 처리하지 않았다.
```

`else`로 뭉개지 않고 모든 상태를 직접 나눠 쓰면, 새 상태를 추가했을 때 놓친 화면 로직을 찾기 쉬워진다.

그래서 sealed class를 쓸 때는 습관적으로 `else`를 넣기보다, 가능한 하위 타입을 모두 명시하는 편이 좋다.

```kotlin
fun render(state: UiState) {
    when (state) {
        UiState.Loading -> showLoading()
        UiState.Empty -> showEmpty()
        is UiState.Content -> showContent(state.users)
        is UiState.Error -> showError(state.message)
    }
}
```

이렇게 하면 상태가 늘어날 때마다 화면 처리 코드도 같이 따라오게 만들 수 있다.

## is가 붙는 경우와 안 붙는 경우

`when` 예시를 보면 어떤 분기에는 `is`가 있고, 어떤 분기에는 없다.

```kotlin
when (state) {
    UiState.Loading -> showLoading()
    is UiState.Content -> showContent(state.users)
    is UiState.Error -> showError(state.message)
}
```

차이는 간단하다.

```text
object 상태는 값 하나 자체와 비교한다.
data class 상태는 타입 검사 후 내부 값을 꺼낸다.
```

`Loading`이 `object`라면 인스턴스가 하나뿐이다.

```kotlin
data object Loading : UiState()
```

그래서 이렇게 비교한다.

```kotlin
UiState.Loading -> showLoading()
```

반면 `Content`는 데이터를 가진 클래스다.

```kotlin
data class Content(
    val users: List<User>
) : UiState()
```

`Content(users = listOf(...))`처럼 값이 다른 인스턴스가 여러 개 생길 수 있다. 그래서 타입을 검사한다.

```kotlin
is UiState.Content -> showContent(state.users)
```

이 분기 안에서는 Kotlin smart cast가 동작한다. 즉 `state`가 `UiState.Content`로 취급되기 때문에 `state.users`에 바로 접근할 수 있다.

```kotlin
is UiState.Content -> {
    val users = state.users
    showContent(users)
}
```

## enum class와 sealed class의 차이

`sealed class`를 처음 보면 `enum class`와 비슷해 보인다.

둘 다 "정해진 값 중 하나"를 표현할 수 있기 때문이다.

![enum class와 sealed class 비교](/images/kotlin-sealed-class-enum-comparison-handdrawn.png)

`enum class`는 이런 경우에 잘 맞는다.

```kotlin
enum class ThemeMode {
    LIGHT,
    DARK,
    SYSTEM,
}
```

각 값이 같은 모양이다.

```text
LIGHT도 ThemeMode
DARK도 ThemeMode
SYSTEM도 ThemeMode
```

상태마다 다른 데이터를 담을 필요가 없다면 `enum class`가 단순하고 좋다.

반면 `sealed class`는 각 상태가 서로 다른 데이터를 가질 수 있다.

```kotlin
sealed class PaymentResult {
    data object Loading : PaymentResult()

    data class Success(
        val receiptId: String,
        val amount: Long,
    ) : PaymentResult()

    data class NetworkError(
        val code: Int,
        val message: String,
    ) : PaymentResult()

    data class AuthError(
        val reason: String,
    ) : PaymentResult()
}
```

이 예시에서 각 상태는 필요한 데이터가 다르다.

| 상태 | 필요한 데이터 |
|---|---|
| `Loading` | 없음 |
| `Success` | 영수증 ID, 금액 |
| `NetworkError` | 코드, 메시지 |
| `AuthError` | 인증 실패 이유 |

이런 경우에는 `enum class`보다 `sealed class`가 자연스럽다.

간단히 나누면 이렇게 볼 수 있다.

| 상황 | 더 자연스러운 선택 |
|---|---|
| 값의 목록만 필요하다 | `enum class` |
| 각 값이 같은 구조를 가진다 | `enum class` |
| 상태마다 필요한 데이터가 다르다 | `sealed class` |
| 성공/실패/로딩처럼 흐름을 타입으로 나누고 싶다 | `sealed class` |
| 여러 구현체가 있지만 외부 확장은 막고 싶다 | `sealed interface` 또는 `sealed class` |

## Android UI State 예시

Android에서 `sealed class`가 자주 나오는 대표 예시는 UI State다.

사용자 목록 화면을 생각해보자.

```text
처음 진입하면 로딩
데이터가 있으면 리스트
데이터가 비어 있으면 빈 화면
실패하면 에러
```

이걸 Boolean과 nullable 값으로 표현하면 상태가 쉽게 꼬인다.

```kotlin
data class UserListUiState(
    val isLoading: Boolean = false,
    val users: List<User>? = null,
    val errorMessage: String? = null,
)
```

겉보기에는 단순하지만 이상한 조합이 가능하다.

```kotlin
UserListUiState(
    isLoading = true,
    users = listOf(user),
    errorMessage = "실패"
)
```

이 상태는 무슨 뜻일까?

```text
로딩 중인가?
데이터 표시 중인가?
에러인가?
```

세 값이 동시에 켜질 수 있기 때문에 화면 상태가 애매해진다.

`sealed class`를 쓰면 서로 동시에 존재하면 안 되는 상태를 타입으로 분리할 수 있다.

```kotlin
sealed class UserListUiState {
    data object Loading : UserListUiState()
    data object Empty : UserListUiState()
    data class Content(val users: List<User>) : UserListUiState()
    data class Error(val message: String) : UserListUiState()
}
```

이제 상태는 항상 하나다.

```kotlin
private val _uiState = MutableStateFlow<UserListUiState>(
    UserListUiState.Loading
)
val uiState: StateFlow<UserListUiState> = _uiState.asStateFlow()
```

로딩을 시작하면 `Loading`.

```kotlin
_uiState.value = UserListUiState.Loading
```

데이터가 비어 있으면 `Empty`.

```kotlin
_uiState.value = UserListUiState.Empty
```

데이터가 있으면 `Content`.

```kotlin
_uiState.value = UserListUiState.Content(users)
```

실패하면 `Error`.

```kotlin
_uiState.value = UserListUiState.Error(
    message = "사용자 목록을 불러오지 못했습니다."
)
```

화면에서는 `when`으로 명확하게 나눈다.

```kotlin
@Composable
fun UserListScreen(
    uiState: UserListUiState,
) {
    when (uiState) {
        UserListUiState.Loading -> LoadingView()
        UserListUiState.Empty -> EmptyView()
        is UserListUiState.Content -> UserList(users = uiState.users)
        is UserListUiState.Error -> ErrorView(message = uiState.message)
    }
}
```

이 코드는 읽는 사람에게도 분명하다.

```text
이 화면은 Loading, Empty, Content, Error 중 하나다.
각 상태에서 무엇을 보여줄지도 바로 보인다.
```

## 네트워크 결과 모델링 예시

`sealed class`는 UI뿐 아니라 네트워크 결과를 표현할 때도 자주 쓴다.

```kotlin
sealed class ApiResult<out T> {
    data class Success<T>(
        val data: T,
    ) : ApiResult<T>()

    data class HttpError(
        val code: Int,
        val body: String?,
    ) : ApiResult<Nothing>()

    data class NetworkError(
        val throwable: Throwable,
    ) : ApiResult<Nothing>()

    data object Unauthorized : ApiResult<Nothing>()
}
```

여기서 `out T`와 `Nothing`이 조금 낯설 수 있다.

먼저 `Success<T>`는 성공했을 때 실제 데이터를 담는다.

```kotlin
ApiResult.Success(data = users)
```

반면 실패 상태에는 성공 데이터가 없다. 그래서 `ApiResult<Nothing>`으로 표현할 수 있다.

```kotlin
ApiResult.NetworkError(throwable)
ApiResult.Unauthorized
```

`Nothing`은 실제 값이 존재하지 않는 타입이다. 실패 상태에는 `T` 타입 데이터가 없다는 뜻을 타입으로 드러낼 수 있다.

사용하는 쪽에서는 이렇게 분기한다.

```kotlin
suspend fun loadUsers(): UserListUiState {
    return when (val result = userRepository.getUsers()) {
        is ApiResult.Success -> {
            if (result.data.isEmpty()) {
                UserListUiState.Empty
            } else {
                UserListUiState.Content(result.data)
            }
        }

        is ApiResult.HttpError -> {
            UserListUiState.Error("서버 오류가 발생했습니다. code=${result.code}")
        }

        is ApiResult.NetworkError -> {
            UserListUiState.Error("네트워크 연결을 확인해주세요.")
        }

        ApiResult.Unauthorized -> {
            UserListUiState.Error("로그인이 필요합니다.")
        }
    }
}
```

이런 구조의 장점은 실패를 대충 `null`로 숨기지 않는다는 점이다.

```kotlin
val users: List<User>? = repository.getUsers()
```

이렇게만 보면 `null`이 무엇을 의미하는지 알기 어렵다.

```text
서버 오류인가?
네트워크 오류인가?
로그인이 만료되었나?
데이터가 없다는 뜻인가?
```

`sealed class`로 결과를 나누면 실패 이유를 타입과 데이터로 드러낼 수 있다.

## sealed class의 하위 타입 위치

`sealed class`의 하위 타입은 아무 곳에서나 만들 수 없다.

일반적으로 직접 하위 타입은 같은 패키지와 같은 모듈 안에 있어야 한다.

```kotlin
package com.example.login

sealed class LoginState

data object Idle : LoginState()

data class Success(
    val user: User,
) : LoginState()
```

같은 파일 안에 둘 수도 있고, 같은 패키지 안의 다른 파일에 둘 수도 있다.

```text
com.example.login/LoginState.kt
com.example.login/LoginSuccess.kt
```

중요한 것은 외부 모듈에서 마음대로 직접 하위 타입을 추가할 수 없다는 점이다.

```text
라이브러리가 sealed class를 제공한다.
다른 앱 모듈이 그 sealed class의 직접 하위 타입을 새로 추가한다.
```

이런 식으로 타입 계층이 외부에서 무한히 열리면 컴파일러가 전체 경우를 안정적으로 알기 어렵다. 그래서 sealed는 하위 타입의 범위를 제한한다.

단, sealed class의 하위 타입이 다시 `open`이면 그 아래로는 확장될 수 있다.

```kotlin
sealed class ScreenState

open class ErrorState : ScreenState()

class NetworkErrorState : ErrorState()
```

이런 구조가 필요할 때도 있지만, 보통 상태 모델링에서는 하위 타입까지 닫힌 형태로 명확하게 유지하는 편이 읽기 쉽다.

## sealed class와 sealed interface

Kotlin에는 `sealed class`뿐 아니라 `sealed interface`도 있다.

```kotlin
sealed interface UiEvent {
    data object RetryClick : UiEvent
    data class SearchTextChanged(val text: String) : UiEvent
}
```

차이를 단순하게 보면 이렇다.

| 문법 | 특징 |
|---|---|
| `sealed class` | 공통 상태나 생성자, 프로퍼티를 둘 수 있음 |
| `sealed interface` | 여러 타입 계층에 함께 붙이기 쉬움 |

공통 값을 상위 타입에 두고 싶다면 `sealed class`가 자연스럽다.

```kotlin
sealed class AppError(
    open val message: String,
) {
    data class Network(
        override val message: String,
        val code: Int,
    ) : AppError(message)

    data class Unknown(
        override val message: String,
    ) : AppError(message)
}
```

반대로 클래스 상속 구조를 이미 쓰고 있거나, 여러 타입에 공통 표시를 붙이고 싶다면 `sealed interface`가 편할 수 있다.

```kotlin
sealed interface RefreshAction

data object PullToRefresh : RefreshAction
data object RetryButtonClick : RefreshAction
```

Android 화면 상태처럼 단순히 닫힌 상태 집합을 만들 때는 둘 다 사용할 수 있다. 팀 컨벤션과 모델의 성격에 맞춰 고르면 된다.

## 생성자는 기본적으로 protected다

`sealed class`의 생성자는 기본적으로 `protected`다.

```kotlin
sealed class UiState
```

이 말은 외부에서 `UiState()`를 직접 만들 수 없고, 하위 타입을 통해서만 만들어야 한다는 뜻이다.

필요하면 생성자를 `private`으로 더 좁힐 수도 있다.

```kotlin
sealed class UiState private constructor() {
    data object Loading : UiState()
    data class Content(val users: List<User>) : UiState()
}
```

대부분의 상태 모델링에서는 기본 형태만으로 충분하다.

```kotlin
sealed class UiState {
    data object Loading : UiState()
    data class Content(val users: List<User>) : UiState()
}
```

## nullable 대신 sealed class를 고려할 때

상태 모델링에서 nullable이 나쁘다는 뜻은 아니다.

정말 값이 없을 수 있는 경우라면 nullable이 자연스럽다.

```kotlin
val selectedUser: User? = null
```

하지만 nullable 하나에 여러 의미를 담기 시작하면 문제가 생긴다.

```kotlin
val user: User? = null
```

이 `null`은 무엇일까?

```text
아직 로딩 전인가?
로딩 중인가?
사용자가 없는 것인가?
네트워크 실패인가?
권한이 없는 것인가?
```

의미가 둘 이상이면 sealed class를 고려할 수 있다.

```kotlin
sealed class UserDetailState {
    data object Idle : UserDetailState()
    data object Loading : UserDetailState()
    data class Content(val user: User) : UserDetailState()
    data object NotFound : UserDetailState()
    data class Error(val message: String) : UserDetailState()
}
```

이렇게 나누면 `null`의 의미를 추측하지 않아도 된다.

```text
NotFound는 사용자가 없다는 뜻
Error는 실패했다는 뜻
Loading은 아직 불러오는 중이라는 뜻
```

## 너무 잘게 쪼개면 오히려 복잡하다

`sealed class`가 좋다고 해서 모든 상태를 무조건 sealed로 만들 필요는 없다.

예를 들어 단순한 on/off 값이라면 Boolean이 더 낫다.

```kotlin
val isDarkMode: Boolean
```

단순한 고정 목록이라면 enum이 더 낫다.

```kotlin
enum class SortOrder {
    LATEST,
    POPULAR,
}
```

`sealed class`가 특히 잘 맞는 순간은 이런 경우다.

```text
상태의 종류가 정해져 있다.
상태마다 필요한 데이터가 다르다.
모든 상태를 빠짐없이 처리해야 한다.
외부에서 상태 종류를 마음대로 늘리면 안 된다.
```

이 조건이 보이면 sealed class를 떠올리면 된다.

## 자주 하는 실수

### 1. else로 모든 장점을 지워버리기

아래 코드는 동작은 한다.

```kotlin
when (state) {
    UiState.Loading -> showLoading()
    else -> showContentOrError()
}
```

하지만 이렇게 쓰면 새 상태가 추가되어도 놓치기 쉽다.

```kotlin
sealed class UiState {
    data object Loading : UiState()
    data object Empty : UiState()
    data class Content(val users: List<User>) : UiState()
    data class Error(val message: String) : UiState()
}
```

`Empty`가 추가되어도 `else`가 받아버린다. 그래서 상태별 처리가 중요한 코드에서는 하위 타입을 직접 나열하는 편이 좋다.

```kotlin
when (state) {
    UiState.Loading -> showLoading()
    UiState.Empty -> showEmpty()
    is UiState.Content -> showContent(state.users)
    is UiState.Error -> showError(state.message)
}
```

### 2. 상태와 이벤트를 한 타입에 섞기

화면 상태와 사용자 이벤트를 하나의 sealed class에 섞으면 읽기 어려워진다.

```kotlin
sealed class UserListThing {
    data object Loading : UserListThing()
    data class Content(val users: List<User>) : UserListThing()
    data object RetryClick : UserListThing()
}
```

`Loading`과 `Content`는 화면 상태다.

`RetryClick`은 사용자가 발생시킨 이벤트다.

둘은 흐름이 다르다.

보통은 나눠서 모델링한다.

```kotlin
sealed class UserListUiState {
    data object Loading : UserListUiState()
    data class Content(val users: List<User>) : UserListUiState()
    data class Error(val message: String) : UserListUiState()
}

sealed interface UserListEvent {
    data object RetryClick : UserListEvent
    data class UserClick(val userId: Long) : UserListEvent
}
```

이렇게 하면 상태를 그리는 코드와 이벤트를 처리하는 코드가 분리된다.

### 3. 데이터가 없는 상태를 data class로 만들기

데이터가 없는 상태를 매번 새 인스턴스로 만들 필요는 없다.

```kotlin
sealed class UiState {
    data class Loading(val unused: Unit = Unit) : UiState()
}
```

이런 경우에는 `object`나 `data object`가 더 자연스럽다.

```kotlin
sealed class UiState {
    data object Loading : UiState()
}
```

반대로 상태마다 값이 필요하다면 `data class`가 맞다.

```kotlin
sealed class UiState {
    data class Error(val message: String) : UiState()
}
```

## 정리

`sealed class`는 가능한 하위 타입을 제한하는 문법이다.

그래서 상태의 종류가 정해져 있고, 그 상태들을 빠짐없이 처리해야 할 때 강하다.

Android에서는 특히 UI State, API Result, Error Type 같은 모델링에 잘 맞는다.

핵심만 다시 정리하면 이렇다.

```text
sealed class는 닫힌 타입 계층이다.
하위 타입의 종류를 컴파일러가 알 수 있다.
when에서 모든 상태를 빠짐없이 처리하기 좋다.
상태마다 다른 데이터를 담을 수 있다.
단순한 고정 목록은 enum class가 더 단순할 수 있다.
```

결국 sealed class는 이런 코드를 만들기 위한 도구다.

```kotlin
when (state) {
    UiState.Loading -> showLoading()
    UiState.Empty -> showEmpty()
    is UiState.Content -> showContent(state.users)
    is UiState.Error -> showError(state.message)
}
```

읽는 사람도 현재 가능한 상태를 알 수 있고, 컴파일러도 빠진 상태를 잡아줄 수 있다.

상태가 많아질수록 이 차이가 꽤 커진다.

## 참고 자료

- [Kotlin 공식 문서 - Sealed classes and interfaces](https://kotlinlang.org/docs/sealed-classes.html)
- [Android Developers - UI layer state holders](https://developer.android.com/topic/architecture/ui-layer/stateholders)
