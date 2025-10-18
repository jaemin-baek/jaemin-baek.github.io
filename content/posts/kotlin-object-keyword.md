---
title: "코틀린 object 키워드 이해하기"
date: "2025-10-19"
category: "Kotlin"
group: "Kotlin Basics"
series: "Kotlin Basics"
tags: ["kotlin", "object", "singleton", "companion object", "android"]
description: "Kotlin object 키워드가 object 선언, 익명 object, companion object에서 어떻게 다르게 쓰이는지 Android 예시와 함께 정리합니다."
---

![코틀린 object 키워드 이해하기](/images/kotlin-object-keyword-cover.png)

Kotlin 코드를 보다 보면 `object`가 꽤 자주 나온다.

```kotlin
object AppLogger {
    fun d(message: String) {
        println(message)
    }
}
```

또는 이런 코드에서도 만난다.

```kotlin
lifecycle.addObserver(
    object : DefaultLifecycleObserver {
        override fun onStart(owner: LifecycleOwner) {
            // ...
        }
    }
)
```

그리고 Android 코드에서는 `companion object`도 자주 나온다.

```kotlin
class UserFragment : Fragment() {

    companion object {
        private const val ARG_USER_ID = "user_id"

        fun newInstance(userId: String): UserFragment {
            return UserFragment().apply {
                arguments = bundleOf(ARG_USER_ID to userId)
            }
        }
    }
}
```

처음 보면 질문이 생긴다.

```text
object는 키워드인가?
class랑 뭐가 다른가?
companion object는 Java static 같은 건가?
object : Something은 또 왜 이름이 없는가?
```

먼저 짧게 답하면 이렇다.

```text
object는 Kotlin 키워드가 맞다.

그리고 object는 클래스를 정의하는 동시에
그 클래스의 객체까지 하나 만들어주는 문법이다.
```

여기서 핵심은 `클래스 정의`와 `객체 생성`이 함께 일어난다는 점이다.

## object는 세 군데에서 자주 만난다

Kotlin에서 `object`는 보통 세 가지 형태로 만난다.

![Kotlin object의 세 가지 의미](/images/kotlin-object-three-forms-handdrawn.png)

| 형태 | 용도 | 예시 |
|---|---|---|
| `object Name` | 이름 있는 싱글톤 객체 | `object AppLogger` |
| `object : Type` | 그 자리에서 만든 익명 객체 | `object : DefaultLifecycleObserver` |
| `companion object` | 클래스에 붙은 하나짜리 객체 | `UserFragment.newInstance()` |

모두 `object`라는 키워드를 쓰지만, 읽는 방식은 조금씩 다르다.

```text
object AppLogger
-> 이름 있는 객체 하나를 만든다.

object : Listener
-> 이름 없는 객체를 그 자리에서 만들어 넘긴다.

companion object
-> 클래스 이름으로 접근하기 좋은 객체를 클래스 안에 둔다.
```

하나씩 보면 훨씬 덜 헷갈린다.

## 1. object 선언은 이름 있는 싱글톤이다

가장 기본적인 형태는 `object 이름`이다.

```kotlin
object AppLogger {

    fun d(message: String) {
        println("[DEBUG] $message")
    }
}
```

이 코드는 `AppLogger`라는 클래스를 만들고, 그 클래스의 객체를 하나 만들어둔 것처럼 사용할 수 있다.

그래서 따로 생성자를 호출하지 않는다.

```kotlin
AppLogger.d("화면 진입")
```

아래처럼 쓰지 않는다.

```kotlin
val logger = AppLogger()
```

`object AppLogger`는 이미 객체 자체이기 때문이다. `class`처럼 설계도를 만든 뒤 `AppLogger()`로 인스턴스를 여러 개 만드는 문법이 아니다.

비교하면 이렇게 볼 수 있다.

```kotlin
class UserRepository {
    fun load() {
        // ...
    }
}

val repository1 = UserRepository()
val repository2 = UserRepository()
```

`class`는 여러 객체를 만들 수 있다.

```kotlin
object AppConfig {
    const val BASE_URL = "https://example.com"
}

val baseUrl = AppConfig.BASE_URL
```

`object`는 이름으로 바로 접근하는 하나짜리 객체다.

## class와 object를 나눠 보는 기준

`class`와 `object`의 차이는 "몇 개의 객체가 필요한가?"로 먼저 나눠보면 쉽다.

| 질문 | 어울리는 문법 |
|---|---|
| 사용자, 게시글, 결제 내역처럼 값이 여러 개 생기는가? | `class`, `data class` |
| 앱 전체에서 하나만 있으면 되는가? | `object` |
| 상태가 없고 함수만 모아둔 도구인가? | `object` 또는 top-level function |
| 특정 타입을 그 자리에서 한 번만 구현하면 되는가? | `object : Type` |

예를 들어 사용자는 여러 명이다.

```kotlin
data class User(
    val id: String,
    val name: String
)
```

그래서 `User`를 `object`로 만들면 이상하다.

```kotlin
object User {
    val id: String = "1"
    val name: String = "Jaemin"
}
```

이렇게 만들면 앱 안에 사용자가 한 명만 있는 구조가 되어버린다.

반대로 로그 포맷터처럼 상태가 없고 앱 전체에서 하나로 충분한 도구라면 `object`가 자연스럽다.

```kotlin
object LogTag {
    const val NETWORK = "Network"
    const val DATABASE = "Database"
}
```

다만 모든 util을 무조건 `object`에 넣는 것도 좋은 습관은 아니다. Kotlin은 파일 최상위에 함수와 상수를 둘 수 있다.

```kotlin
fun String.maskedPhoneNumber(): String {
    return replaceRange(3, length - 4, "****")
}
```

상태가 없고 특정 타입에 붙는 기능이라면 extension function이 더 읽기 좋을 때도 많다.

## object 선언은 언제 초기화될까

`object` 선언은 처음 접근될 때 초기화된다.

```kotlin
object SessionStore {
    init {
        println("SessionStore initialized")
    }

    var token: String? = null
}
```

아무도 `SessionStore`에 접근하지 않으면 초기화되지 않는다.

```kotlin
fun main() {
    println("main start")

    SessionStore.token = "abc"
}
```

대략 이런 순서로 생각할 수 있다.

```text
main start 출력
-> SessionStore에 처음 접근
-> object 초기화
-> token 저장
```

그리고 Kotlin의 object 선언 초기화는 thread-safe 하다. 여러 스레드가 동시에 처음 접근하더라도 하나의 인스턴스로 초기화되도록 보장된다.

그래서 "싱글톤을 직접 double-check locking으로 구현해야 하나?"라는 상황에서는 Kotlin `object`가 훨씬 단순하다.

```kotlin
object TokenValidator {
    fun isValid(token: String): Boolean {
        return token.isNotBlank() && token.length > 10
    }
}
```

단, thread-safe 하다는 말은 "초기화가 안전하다"는 뜻이지, 내부 mutable 상태를 마음껏 바꿔도 안전하다는 뜻은 아니다.

```kotlin
object LoginCounter {
    var count: Int = 0

    fun increase() {
        count++
    }
}
```

이런 mutable 상태를 여러 스레드에서 동시에 바꾸면 여전히 동시성 문제가 생길 수 있다. `object`는 하나뿐이기 때문에 오히려 공유 상태가 더 눈에 잘 띄어야 한다.

## Android에서 object를 쓸 때 조심할 점

Android에서는 `object`가 편해서 전역 저장소처럼 쓰고 싶어질 때가 있다.

```kotlin
object CurrentActivityHolder {
    var activity: Activity? = null
}
```

이런 코드는 위험하다.

`object`는 앱 프로세스 안에서 오래 살아남을 수 있다. 여기에 `Activity`, `View`, `Fragment`, `Context` 같은 화면 생명주기 객체를 강하게 들고 있으면 메모리 누수로 이어질 수 있다.

나쁜 방향은 이런 느낌이다.

```kotlin
object ToastHelper {
    lateinit var context: Context

    fun show(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }
}
```

특히 여기에 Activity Context가 들어가면 화면이 종료된 뒤에도 참조가 남을 수 있다.

차라리 필요한 시점에 `Context`를 인자로 받는 편이 낫다.

```kotlin
object ToastHelper {
    fun show(context: Context, message: String) {
        Toast.makeText(
            context.applicationContext,
            message,
            Toast.LENGTH_SHORT
        ).show()
    }
}
```

또는 의존성 관리가 필요한 객체라면 Hilt 같은 DI 컨테이너에 맡기는 편이 더 적절하다.

```kotlin
@Singleton
class UserRepository @Inject constructor(
    private val api: UserApi,
    private val dao: UserDao
)
```

`object`는 편하지만, 앱 구조 전체를 대신하는 도구는 아니다.

## 2. 익명 object는 그 자리에서 만든 객체다

두 번째로 자주 보는 형태는 `object : Type`이다.

![익명 object로 observer 구현하기](/images/kotlin-object-anonymous-observer-handdrawn.png)

예를 들어 앞에서 정리한 [[process-lifecycle-owner-foreground-background|ProcessLifecycleOwner]] 코드에 이런 부분이 있었다.

```kotlin
ProcessLifecycleOwner.get().lifecycle.addObserver(
    object : DefaultLifecycleObserver {
        override fun onStart(owner: LifecycleOwner) {
            realtimeConnection.connect()
        }

        override fun onStop(owner: LifecycleOwner) {
            realtimeConnection.disconnect()
        }
    }
)
```

여기서 `object : DefaultLifecycleObserver { ... }`는 이름 없는 객체다.

조금 풀어 쓰면 이런 클래스를 만든 것과 비슷하다.

```kotlin
class AppLifecycleObserver(
    private val realtimeConnection: RealtimeConnection
) : DefaultLifecycleObserver {

    override fun onStart(owner: LifecycleOwner) {
        realtimeConnection.connect()
    }

    override fun onStop(owner: LifecycleOwner) {
        realtimeConnection.disconnect()
    }
}
```

그리고 이렇게 넘기는 것과 비슷하다.

```kotlin
val observer = AppLifecycleObserver(realtimeConnection)

ProcessLifecycleOwner.get().lifecycle.addObserver(observer)
```

하지만 이 observer가 딱 한 곳에서만 쓰이고, 이름을 붙여 재사용할 필요도 없다면 익명 object가 간단하다.

```kotlin
ProcessLifecycleOwner.get().lifecycle.addObserver(
    object : DefaultLifecycleObserver {
        override fun onStart(owner: LifecycleOwner) {
            realtimeConnection.connect()
        }
    }
)
```

핵심은 이것이다.

```text
익명 object는
클래스 이름을 따로 만들지 않고
필요한 자리에서 바로 구현한 객체다.
```

Java의 anonymous class와 비슷한 역할이라고 보면 된다.

## 익명 object는 인터페이스 구현에 자주 쓰인다

예를 들어 콜백 인터페이스가 있다고 해보자.

```kotlin
interface LoginCallback {
    fun onSuccess(user: User)
    fun onFailure(error: Throwable)
}
```

이 콜백을 받는 함수가 있다.

```kotlin
fun login(
    email: String,
    password: String,
    callback: LoginCallback
) {
    // ...
}
```

호출하는 곳에서는 익명 object로 바로 구현할 수 있다.

```kotlin
login(
    email = email,
    password = password,
    callback = object : LoginCallback {
        override fun onSuccess(user: User) {
            renderUser(user)
        }

        override fun onFailure(error: Throwable) {
            showError(error.message)
        }
    }
)
```

`LoginCallback`을 구현하는 이름 있는 클래스를 따로 만들 수도 있지만, 한 번만 쓰는 콜백이라면 이 방식이 더 가볍다.

다만 코드가 길어지면 반대로 읽기 어려워진다.

```kotlin
callback = object : LoginCallback {
    override fun onSuccess(user: User) {
        // 30줄
    }

    override fun onFailure(error: Throwable) {
        // 30줄
    }
}
```

이 정도로 커지면 이름 있는 클래스로 빼거나, 함수로 분리하는 편이 낫다.

```kotlin
private val loginCallback = object : LoginCallback {
    override fun onSuccess(user: User) {
        handleLoginSuccess(user)
    }

    override fun onFailure(error: Throwable) {
        handleLoginFailure(error)
    }
}
```

익명 object는 "이름이 없어도 될 만큼 작을 때" 가장 좋다.

## 람다와 익명 object는 다르다

Kotlin을 막 읽기 시작하면 람다와 익명 object가 비슷해 보일 수 있다.

```kotlin
button.setOnClickListener {
    showToast()
}
```

```kotlin
button.setOnClickListener(
    object : View.OnClickListener {
        override fun onClick(view: View) {
            showToast()
        }
    }
)
```

둘 다 "클릭했을 때 실행할 코드"처럼 보인다.

하지만 문법의 출발점은 다르다.

| 문법 | 의미 |
|---|---|
| `{ ... }` | 람다 함수 |
| `object : Type { ... }` | Type을 구현한 익명 객체 |

Kotlin에서는 Java의 SAM interface를 람다로 간단히 넘길 수 있다. `View.OnClickListener`처럼 추상 메서드가 하나인 인터페이스는 람다로 줄여 쓸 수 있다.

하지만 메서드가 여러 개라면 람다 하나로 표현할 수 없다.

```kotlin
interface ScreenCallback {
    fun onStart()
    fun onStop()
}
```

이런 경우에는 각각의 메서드를 구현해야 하므로 익명 object가 자연스럽다.

```kotlin
val callback = object : ScreenCallback {
    override fun onStart() {
        connect()
    }

    override fun onStop() {
        disconnect()
    }
}
```

`DefaultLifecycleObserver`도 여러 콜백을 가질 수 있기 때문에 `object : DefaultLifecycleObserver` 형태가 잘 어울린다.

## 익명 object의 타입은 공개 범위에서 조심해야 한다

익명 object는 이름 없는 타입이다. 그래서 public API로 노출할 때는 조심해야 한다.

private 범위에서는 익명 object의 멤버에 접근할 수 있다.

```kotlin
private val debugTool = object {
    val name = "debug"

    fun print() {
        println(name)
    }
}

fun runDebug() {
    debugTool.print()
}
```

하지만 public 함수나 public 프로퍼티의 반환값으로 익명 object를 그대로 노출하면, 외부에서는 그 익명 타입의 구체 멤버를 알 수 없다.

```kotlin
fun createTool() = object {
    val name = "debug"
}
```

이런 코드는 외부에서 `name`에 기대기 어렵다. API로 내보낼 값이라면 명시적인 인터페이스나 클래스를 두는 편이 안전하다.

```kotlin
interface DebugTool {
    val name: String
}

fun createTool(): DebugTool {
    return object : DebugTool {
        override val name: String = "debug"
    }
}
```

읽는 사람 입장에서도 "이 함수는 DebugTool을 준다"가 더 선명하다.

## 3. companion object는 클래스에 붙은 객체다

세 번째는 `companion object`다.

![companion object로 상수와 팩토리 메서드 묶기](/images/kotlin-object-companion-factory-handdrawn.png)

`companion object`는 클래스 안에 선언하는 object다.

```kotlin
class User private constructor(
    val id: String,
    val name: String
) {
    companion object {
        fun create(id: String, name: String): User {
            require(id.isNotBlank())
            return User(id, name)
        }
    }
}
```

사용할 때는 클래스 이름으로 접근할 수 있다.

```kotlin
val user = User.create(
    id = "100",
    name = "Jaemin"
)
```

그래서 Java의 static method처럼 보인다.

하지만 Kotlin 관점에서는 `companion object`도 객체다.

```kotlin
class User {
    companion object Factory {
        fun create(): User = User()
    }
}
```

이 companion object에는 이름을 붙일 수도 있다.

```kotlin
val factory = User.Factory
val user = factory.create()
```

이렇게 보면 `companion object`가 "클래스 옆에 붙은 하나짜리 객체"라는 느낌이 조금 더 선명하다.

## companion object가 Android에서 자주 보이는 이유

Android에서는 클래스에 강하게 묶인 상수나 생성 함수를 둘 때 `companion object`가 자주 쓰인다.

예를 들어 Fragment argument key는 해당 Fragment와 함께 읽히는 편이 좋다.

```kotlin
class ProfileFragment : Fragment() {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val userId = requireArguments().getString(ARG_USER_ID)
    }

    companion object {
        private const val ARG_USER_ID = "arg_user_id"

        fun newInstance(userId: String): ProfileFragment {
            return ProfileFragment().apply {
                arguments = bundleOf(ARG_USER_ID to userId)
            }
        }
    }
}
```

이 코드는 이렇게 읽힌다.

```text
ProfileFragment와 관련된 상수와 생성 규칙을
ProfileFragment 안에 같이 둔다.
```

Room Database에서도 비슷한 구조를 볼 수 있다.

```kotlin
@Database(
    entities = [UserEntity::class],
    version = 1
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun userDao(): UserDao

    companion object {
        const val DATABASE_NAME = "app.db"
    }
}
```

`DATABASE_NAME`이 앱 전체 설정이라면 별도 `object DatabaseConfig`도 가능하다. 하지만 `AppDatabase`와만 강하게 관련되어 있다면 companion object 안에 두는 편이 자연스럽다.

## companion object는 static과 같지 않다

Kotlin에서 companion object 멤버를 이렇게 호출할 수 있다.

```kotlin
User.create()
```

겉보기에는 Java static method와 거의 같다.

하지만 개념적으로는 다르다.

```text
Java static:
클래스 자체에 붙은 멤버

Kotlin companion object:
클래스 안에 선언된 하나짜리 객체의 멤버
```

이 차이 때문에 companion object는 인터페이스를 구현할 수도 있다.

```kotlin
interface JsonFactory<T> {
    fun fromJson(json: String): T
}

class User(
    val id: String
) {
    companion object : JsonFactory<User> {
        override fun fromJson(json: String): User {
            return User(id = json)
        }
    }
}
```

그리고 companion object 자체를 값처럼 넘길 수도 있다.

```kotlin
fun <T> parse(
    json: String,
    factory: JsonFactory<T>
): T {
    return factory.fromJson(json)
}

val user = parse(
    json = "100",
    factory = User
)
```

여기서 `User`는 `User.Companion`을 가리키는 것처럼 동작한다.

Java 코드에서 정말 static method처럼 보이게 하고 싶다면 `@JvmStatic`을 붙일 수 있다.

```kotlin
class User {
    companion object {
        @JvmStatic
        fun create(): User = User()
    }
}
```

하지만 Kotlin 코드끼리만 본다면 `@JvmStatic`을 습관적으로 붙일 필요는 없다. Java 호출부와의 호환성이 필요할 때 선택하면 된다.

## object 안에 생성자를 직접 둘 수는 없다

`class`에는 constructor가 있다.

```kotlin
class UserRepository(
    private val api: UserApi
)
```

하지만 `object` 선언에는 생성자 파라미터를 직접 둘 수 없다.

```kotlin
object UserRepository(private val api: UserApi) // 불가능
```

왜냐하면 `object`는 객체를 하나만 만들겠다는 선언이고, 호출하는 쪽에서 매번 생성자 인자를 넘겨 새 인스턴스를 만드는 구조가 아니기 때문이다.

의존성이 필요한 객체라면 보통 `class`로 만들고 DI를 사용한다.

```kotlin
class UserRepository @Inject constructor(
    private val api: UserApi,
    private val dao: UserDao
)
```

반대로 정말 앱 전체에서 공유되는 단순 설정이나 상태 없는 helper라면 `object`가 어울릴 수 있다.

```kotlin
object DateFormatPatterns {
    const val ISO_DATE = "yyyy-MM-dd"
    const val DISPLAY_DATE = "yyyy.MM.dd"
}
```

## object를 상속하거나 구현할 수 있다

`object` 선언도 클래스나 인터페이스를 상속 또는 구현할 수 있다.

```kotlin
interface ErrorMapper {
    fun messageOf(throwable: Throwable): String
}

object DefaultErrorMapper : ErrorMapper {
    override fun messageOf(throwable: Throwable): String {
        return throwable.message ?: "알 수 없는 오류가 발생했습니다."
    }
}
```

이 코드는 `DefaultErrorMapper`라는 구현체가 앱 전체에서 하나만 필요할 때 잘 맞는다.

RecyclerView의 `DiffUtil.ItemCallback` 같은 곳에서도 이름 있는 object를 사용할 수 있다.

```kotlin
object UserDiffCallback : DiffUtil.ItemCallback<User>() {
    override fun areItemsTheSame(oldItem: User, newItem: User): Boolean {
        return oldItem.id == newItem.id
    }

    override fun areContentsTheSame(oldItem: User, newItem: User): Boolean {
        return oldItem == newItem
    }
}
```

이 콜백은 상태가 없고 여러 adapter에서 재사용할 수도 있으니 이름 있는 `object`로 빼기 좋다.

한 화면 안에서만 쓰고 재사용하지 않는다면 익명 object도 가능하다.

```kotlin
private val adapter = UserAdapter(
    diffCallback = object : DiffUtil.ItemCallback<User>() {
        override fun areItemsTheSame(oldItem: User, newItem: User): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: User, newItem: User): Boolean {
            return oldItem == newItem
        }
    }
)
```

기준은 재사용성과 이름의 가치다.

```text
여러 곳에서 재사용하고 이름이 의미를 주면
-> object UserDiffCallback

한 곳에서 짧게 쓰고 끝나면
-> object : DiffUtil.ItemCallback<User>()
```

## sealed 계층에서는 data object도 자주 쓴다

상태 모델링을 하다 보면 `data object`도 볼 수 있다.

```kotlin
sealed interface UiState {
    data object Loading : UiState
    data class Success(val items: List<Item>) : UiState
    data class Error(val message: String) : UiState
}
```

`Loading`은 추가 데이터가 없다. 앱 전체에서 `Loading`이라는 값은 하나면 충분하다.

이럴 때 일반 `object`로도 만들 수 있다.

```kotlin
sealed interface UiState {
    object Loading : UiState
}
```

하지만 `data class`들과 함께 sealed 계층을 만들 때는 `data object`가 더 균형 있게 읽힌다.

```kotlin
sealed interface LoginResult {
    data object Idle : LoginResult
    data object Loading : LoginResult
    data class Success(val user: User) : LoginResult
    data class Failure(val reason: String) : LoginResult
}
```

`data object`는 `toString()`이 보기 좋게 생성된다.

```kotlin
println(LoginResult.Loading)
// Loading
```

그리고 `data class`와 달리 `copy()`나 `componentN()`은 없다. 하나뿐인 객체라서 복사할 필요가 없기 때문이다.

Compose 화면 상태에서도 이런 형태를 자주 쓴다.

```kotlin
sealed interface FeedUiState {
    data object Loading : FeedUiState
    data object Empty : FeedUiState
    data class Content(
        val posts: List<PostUiModel>
    ) : FeedUiState
}
```

이 코드는 `when`과 함께 읽기 좋다.

```kotlin
when (val state = uiState) {
    FeedUiState.Loading -> LoadingScreen()
    FeedUiState.Empty -> EmptyScreen()
    is FeedUiState.Content -> FeedList(state.posts)
}
```

추가 데이터가 없는 상태는 `data object`, 데이터가 있는 상태는 `data class`로 나뉘기 때문에 모델의 의도가 선명해진다.

## 자주 헷갈리는 포인트 정리

첫 번째, `object`는 인스턴스를 매번 새로 만드는 문법이 아니다.

```kotlin
object AppLogger
```

이건 하나의 객체다. `AppLogger()`로 새로 만들지 않는다.

두 번째, `object : Type`은 이름 없는 객체를 그 자리에서 만드는 문법이다.

```kotlin
object : DefaultLifecycleObserver {
    override fun onStart(owner: LifecycleOwner) {
        // ...
    }
}
```

이름 있는 싱글톤인 `object AppLogger`와는 읽는 방식이 다르다.

세 번째, `companion object`는 Java static과 비슷하게 호출되지만, Kotlin에서는 객체다.

```kotlin
class User {
    companion object {
        fun create(): User = User()
    }
}

val user = User.create()
```

네 번째, `object`에 mutable 상태를 넣으면 전역 공유 상태가 된다.

```kotlin
object AuthState {
    var token: String? = null
}
```

이런 구조가 꼭 나쁜 것은 아니지만, 생명주기와 동시성, 테스트 격리를 생각해야 한다. 특히 Android 화면 객체를 담는 것은 피하는 편이 좋다.

다섯 번째, 이름이 의미를 주면 object 선언으로 빼고, 한 번만 쓰는 작은 구현이면 익명 object를 사용한다.

```kotlin
object UserDiffCallback : DiffUtil.ItemCallback<User>() {
    // 재사용되는 이름 있는 콜백
}
```

```kotlin
object : DefaultLifecycleObserver {
    // 이 자리에서만 쓰는 임시 observer
}
```

## 한 줄로 정리하기

`object`는 Kotlin에서 클래스를 정의하면서 객체까지 하나 만드는 키워드다.

`object AppLogger`는 이름 있는 싱글톤 객체를 만든다. `object : Listener`는 필요한 자리에서 이름 없는 객체를 만들어 넘긴다. `companion object`는 클래스에 붙은 하나짜리 객체를 만들어 클래스 이름으로 접근하기 좋게 해준다.

그래서 `object`를 볼 때는 먼저 이렇게 물어보면 된다.

```text
이 object는 이름 있는 싱글톤인가?
그 자리에서 넘기는 익명 구현체인가?
클래스에 붙은 companion object인가?
```

이 세 가지가 구분되면 Android 코드에서 보이는 `object` 문법 대부분은 훨씬 편하게 읽힌다.

## 함께 읽기

- [[kotlin-lambda-function|코틀린 람다함수]]
- [[process-lifecycle-owner-foreground-background|ProcessLifecycleOwner로 앱 포그라운드/백그라운드 감지하기]]
- [[hilt-module-provides-qualifier|Hilt Module, Provides, Qualifier 이해하기]]

## 참고자료

- [Kotlin Docs - Object declarations and expressions](https://kotlinlang.org/docs/object-declarations.html)
- [Kotlin Docs - Calling Kotlin from Java](https://kotlinlang.org/docs/java-to-kotlin-interop.html)
