---
title: "코틀린 lateinit 쉽게 이해하기"
date: "2025-10-18"
category: "Kotlin"
group: "Kotlin Basics"
series: "Kotlin Basics"
tags: ["kotlin", "lateinit", "android", "hilt", "viewbinding"]
description: "Kotlin lateinit이 왜 필요한지, 초기화 전 접근 시 어떤 문제가 생기는지, nullable과 by lazy와 어떻게 다른지 Android 예시로 정리합니다."
---

![코틀린 lateinit 쉽게 이해하기](/images/kotlin-lateinit-cover.png)

Android 코드를 보다 보면 이런 선언을 자주 만난다.

```kotlin
@Inject
lateinit var repository: UserRepository
```

또는 Activity에서 ViewBinding을 쓸 때도 비슷한 코드가 나온다.

```kotlin
private lateinit var binding: ActivityMainBinding
```

처음 보면 `lateinit`이 조금 이상하게 보인다. Kotlin은 null 안정성을 강조하는 언어인데, 왜 굳이 "나중에 초기화하겠다"는 문법이 따로 있을까?

한 줄로 먼저 정리하면 이렇다.

```text
lateinit은 non-null 값을 지금 당장 넣을 수는 없지만,
사용하기 전에는 반드시 초기화하겠다는 약속이다.
```

여기서 중요한 부분은 "나중에"가 아니라 "반드시"다. `lateinit`은 값이 없을 수도 있는 상태를 표현하는 문법이 아니다. 값은 있어야 한다. 다만 객체가 만들어지는 순간에는 아직 넣을 수 없어서, 초기화 시점을 조금 뒤로 미루는 것이다.

## Kotlin은 원래 바로 초기화하라고 한다

Kotlin에서 non-null 프로퍼티는 보통 선언과 동시에 값을 넣거나, 생성자에서 초기화해야 한다.

```kotlin
class UserPresenter {
    private val repository: UserRepository = UserRepository()
}
```

또는 생성자로 받는다.

```kotlin
class UserPresenter(
    private val repository: UserRepository
)
```

이 방식이 Kotlin이 가장 좋아하는 형태다. 객체가 만들어지는 순간 필요한 값이 모두 들어있다. 그래서 `repository`를 사용할 때마다 null인지 확인하지 않아도 된다.

문제는 실제 Android 코드에서 모든 값을 생성자에서 바로 넣을 수 있는 것은 아니라는 점이다.

예를 들어 Activity는 내가 직접 생성자를 호출해서 만드는 객체가 아니다.

```kotlin
class MainActivity : AppCompatActivity()
```

Android 프레임워크가 Activity를 만든다. 그래서 일반 클래스처럼 생성자에 마음대로 `repository`나 `binding`을 넣기 어렵다. Hilt 같은 DI 도구가 나중에 필드에 값을 넣어주거나, `onCreate()`에서 레이아웃을 inflate한 뒤에야 binding을 만들 수 있다.

이때 이런 코드가 필요해진다.

```kotlin
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.saveButton.setOnClickListener {
            save()
        }
    }
}
```

`binding`은 `MainActivity` 객체가 만들어지는 순간에는 아직 없다. 하지만 `onCreate()`에서 초기화한 다음부터는 계속 non-null 값으로 쓰고 싶다. 이럴 때 `lateinit`이 자연스럽다.

## lateinit은 컴파일러와 런타임의 경계에 있다

`lateinit`을 붙이면 Kotlin 컴파일러는 선언 시점에 값이 없어도 일단 허용한다.

```kotlin
private lateinit var viewModel: MainViewModel
```

하지만 이것은 "언제 접근해도 안전하다"는 뜻이 아니다.

![lateinit 초기화 흐름](/images/kotlin-lateinit-initialization-flow-handdrawn.png)

초기화 후에 접근하면 문제없다.

```kotlin
viewModel = MainViewModel()
viewModel.load()
```

반대로 초기화 전에 접근하면 런타임에서 예외가 난다.

```kotlin
private lateinit var viewModel: MainViewModel

fun load() {
    viewModel.load()
}
```

이 상태로 `load()`가 먼저 호출되면 `UninitializedPropertyAccessException`이 발생한다.

```text
lateinit property viewModel has not been initialized
```

그래서 `lateinit`은 컴파일러 에러를 런타임으로 미루는 문법이라고도 볼 수 있다. 편해지는 만큼 책임이 생긴다.

```text
컴파일러:
선언 시점에 값이 없어도 허용해줄게.

개발자:
대신 사용 전에는 반드시 값을 넣어둘게.
```

이 약속이 지켜지면 코드가 깔끔해진다. 약속이 깨지면 앱은 실행 중에 크래시가 난다.

## 사용할 수 있는 조건

`lateinit`은 아무 프로퍼티에나 붙일 수 없다.

대표 조건은 이렇다.

| 조건 | 이유 |
|---|---|
| `var`이어야 한다 | 나중에 값을 대입해야 하기 때문 |
| non-null 타입이어야 한다 | nullable이면 `null`로 비어 있음을 표현할 수 있기 때문 |
| primitive 타입이면 안 된다 | `Int`, `Boolean`, `Long` 같은 타입에는 사용할 수 없음 |
| custom getter/setter가 없어야 한다 | Kotlin이 초기화 여부를 직접 관리해야 하기 때문 |
| primary constructor 프로퍼티에는 사용할 수 없다 | 생성자 파라미터는 객체 생성 시점의 초기화 계약에 가깝기 때문 |

가능한 예시는 이런 모양이다.

```kotlin
lateinit var name: String
lateinit var repository: UserRepository
lateinit var binding: ActivityMainBinding
```

반대로 아래 코드는 사용할 수 없다.

```kotlin
lateinit val name: String // val은 안 됨
lateinit var count: Int // primitive 타입은 안 됨
lateinit var nickname: String? // nullable 타입은 안 됨
```

`lateinit val`이 안 되는 이유는 단순하다. `lateinit`은 나중에 값을 넣어야 하므로 변경 가능한 `var`이어야 한다. "나중에 한 번만 만들고 계속 같은 값으로 쓰고 싶다"면 보통 `by lazy`가 더 잘 맞는다.

```kotlin
private val formatter by lazy {
    DateTimeFormatter.ofPattern("yyyy-MM-dd")
}
```

`lateinit var count: Int`처럼 primitive 타입에 쓰고 싶을 때도 있다. 이 경우에는 기본값을 줄 수 있는지 먼저 보는 편이 좋다.

```kotlin
private var count: Int = 0
```

정말 나중에 반드시 대입해야 하는 primitive 값이라면 `Delegates.notNull()` 같은 선택지도 있다.

```kotlin
import kotlin.properties.Delegates

private var count: Int by Delegates.notNull()
```

다만 이런 코드가 많아진다면 초기화 흐름이 복잡하다는 신호일 수 있다. 생성자에서 받을 수 있는 값인지, 기본값을 둘 수 있는 값인지 먼저 확인하는 편이 좋다.

## null을 피하려고 쓰는 문법은 아니다

`lateinit`을 처음 알게 되면 nullable을 피하는 편법처럼 쓰고 싶어질 수 있다.

```kotlin
private lateinit var selectedUser: User
```

하지만 선택된 사용자가 아직 없을 수 있는 화면이라면 이 코드는 좋은 표현이 아니다. 이 경우에는 값이 실제로 없을 수 있다.

```kotlin
private var selectedUser: User? = null
```

`lateinit`과 nullable은 의도가 다르다.

![lateinit nullable lazy 비교](/images/kotlin-lateinit-nullable-lazy-handdrawn.png)

이렇게 나눠서 생각하면 쉽다.

| 상황 | 더 자연스러운 선택 |
|---|---|
| 나중에 반드시 초기화되고, 사용 전에는 값이 있어야 한다 | `lateinit` |
| 값이 없을 수 있는 상태도 정상이다 | nullable `?` |
| 처음 접근할 때 만들고 이후 재사용하고 싶다 | `by lazy` |
| 생성 시점에 받을 수 있다 | 생성자 파라미터 |

예를 들어 Activity binding은 `lateinit`이 잘 맞을 수 있다.

```kotlin
private lateinit var binding: ActivityMainBinding
```

`onCreate()`에서 초기화한 뒤 화면이 살아있는 동안 계속 사용하기 때문이다.

반면 선택된 유저는 nullable이 더 자연스럽다.

```kotlin
private var selectedUser: User? = null
```

아직 아무도 선택하지 않은 상태가 실제 화면 상태이기 때문이다.

무거운 객체를 처음 필요할 때 만들고 싶다면 `by lazy`가 더 자연스럽다.

```kotlin
private val imageLoader by lazy {
    ImageLoader.Builder(context).build()
}
```

`lateinit`은 lazy initialization이 아니다. 이름에 `late`가 들어가서 헷갈리지만, `lateinit`은 "처음 접근할 때 자동으로 만든다"가 아니다. 누군가가 직접 값을 넣어야 한다.

```kotlin
lateinit var repository: UserRepository

// 자동으로 만들어지지 않는다
repository.loadUsers()
```

`repository`에 값을 넣지 않았다면 여기서 바로 크래시가 난다.

## Android에서 자주 보는 예시

### Activity ViewBinding

Activity에서는 ViewBinding을 `lateinit`으로 선언하는 코드가 자주 나온다.

```kotlin
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.titleText.text = "Hello"
    }
}
```

이 코드에서 초기화 순서는 명확하다.

```text
Activity 생성
-> onCreate()
-> binding 초기화
-> setContentView()
-> binding 사용
```

`binding`은 `onCreate()` 안에서 초기화된 뒤 사용된다. 이 흐름이 지켜진다면 `lateinit`은 읽기 좋은 선택이다.

하지만 Fragment의 ViewBinding은 조금 다르게 봐야 한다. Fragment는 Fragment 객체의 생명주기와 View 생명주기가 다르다. View는 `onDestroyView()`에서 사라질 수 있지만, Fragment 객체는 남아 있을 수 있다.

그래서 Fragment에서는 이런 패턴을 더 자주 쓴다.

```kotlin
class UserFragment : Fragment(R.layout.fragment_user) {

    private var _binding: FragmentUserBinding? = null
    private val binding: FragmentUserBinding
        get() = _binding!!

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        _binding = FragmentUserBinding.bind(view)

        binding.titleText.text = "User"
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}
```

여기서 `_binding`을 nullable로 두는 이유는 "View가 없어지는 상태"가 실제로 존재하기 때문이다. 이 상태를 `lateinit`으로 숨겨버리면 View 생명주기를 놓치기 쉽다.

정리하면 이렇게 볼 수 있다.

```text
Activity binding:
Activity 생명주기 동안 한 번 초기화해서 쓴다
-> lateinit이 잘 맞는 경우가 많음

Fragment binding:
View가 생성되고 파괴되는 상태를 표현해야 한다
-> nullable backing property가 더 안전한 경우가 많음
```

### Hilt 필드 주입

Hilt를 쓰면 Android 프레임워크가 생성하는 클래스에서 `@Inject lateinit var`를 자주 본다.

```kotlin
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    @Inject
    lateinit var analyticsTracker: AnalyticsTracker

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        analyticsTracker.trackScreen("Main")
    }
}
```

이 코드는 이렇게 읽으면 된다.

```text
MainActivity 객체는 Android가 만든다.
Hilt가 나중에 analyticsTracker 필드를 채운다.
onCreate()에서 그 값을 사용한다.
```

일반 클래스라면 필드 주입보다 생성자 주입이 더 낫다.

```kotlin
class TrackScreenUseCase @Inject constructor(
    private val analyticsTracker: AnalyticsTracker
)
```

생성자 주입은 객체가 만들어지는 순간 의존성이 모두 들어온다. 그래서 `lateinit`보다 안전하고 테스트하기도 쉽다.

반대로 Activity, Fragment, Application처럼 Android가 먼저 생성하는 진입점에서는 생성자 주입을 쓰기 어렵다. 그래서 `@Inject lateinit var` 필드 주입이 등장한다.

이 부분은 [[hilt-androidapp-inject-application|Application에서 Hilt 필드 주입을 사용하는 이유]]와도 이어진다.

### 테스트 setup

테스트에서도 `lateinit`을 종종 사용한다.

```kotlin
class UserRepositoryTest {

    private lateinit var api: FakeUserApi
    private lateinit var repository: UserRepository

    @Before
    fun setUp() {
        api = FakeUserApi()
        repository = UserRepository(api)
    }

    @Test
    fun loadUsers_returnsCachedUsers() {
        api.givenUsers(listOf(User("jaemin")))

        val result = repository.loadUsers()

        assertThat(result).hasSize(1)
    }
}
```

여기서는 테스트마다 새 객체를 만들고 싶다. `@Before`가 각 테스트 전에 호출되므로 `repository`는 테스트 본문이 실행되기 전에 초기화된다.

이런 흐름은 `lateinit`과 잘 맞는다.

```text
테스트 객체 생성
-> @Before에서 초기화
-> @Test에서 사용
```

초기화 순서가 테스트 프레임워크에 의해 명확하게 보장되기 때문이다.

## 초기화 여부를 확인할 수도 있다

`lateinit` 프로퍼티가 초기화되었는지 확인하고 싶을 때는 `::property.isInitialized`를 사용할 수 있다.

```kotlin
private lateinit var analyticsTracker: AnalyticsTracker

fun flushIfReady() {
    if (::analyticsTracker.isInitialized) {
        analyticsTracker.flush()
    }
}
```

이 코드는 `analyticsTracker`가 초기화된 경우에만 `flush()`를 호출한다.

하지만 `isInitialized`를 너무 자주 쓰는 코드는 조심해서 봐야 한다. 보통 `lateinit`은 "사용 시점에는 이미 초기화되어 있다"는 구조가 명확할 때 가장 좋다.

이런 코드가 많아진다면:

```kotlin
if (::repository.isInitialized) {
    repository.load()
}
```

아래 질문을 먼저 해보는 편이 좋다.

```text
이 값은 정말 항상 있어야 하는가?
없을 수 있는 상태가 정상이라면 nullable이 더 맞지 않을까?
초기화 순서를 더 명확하게 만들 수 없을까?
생성자로 받을 수는 없을까?
```

`isInitialized`는 필요할 때 유용하지만, 초기화 흐름이 흐릿한 코드를 계속 덮어주는 도구는 아니다.

## 자주 헷갈리는 포인트

### lateinit은 값을 여러 번 바꿀 수 있다

`lateinit`은 `var`이다. 그래서 초기화 후에도 값을 다시 넣을 수 있다.

```kotlin
lateinit var repository: UserRepository

repository = RealUserRepository()
repository = FakeUserRepository()
```

테스트에서는 이 특성이 편할 수 있다. 하지만 앱 코드에서 의존성이 여기저기 바뀐다면 흐름을 따라가기 어려워진다. 일반 클래스의 의존성은 가능하면 생성자에서 고정하는 편이 좋다.

### 다시 미초기화 상태로 되돌릴 수는 없다

`lateinit` 프로퍼티를 "초기화 안 된 상태"로 되돌리는 문법은 없다.

```kotlin
lateinit var binding: ActivityMainBinding
```

여기에 값을 넣은 뒤 다시 비우고 싶다면 `lateinit`보다 nullable이 더 자연스러울 수 있다.

```kotlin
private var _binding: FragmentUserBinding? = null
```

Fragment ViewBinding에서 nullable 패턴을 쓰는 이유도 여기에 있다. View가 사라지는 상태를 코드에 드러내야 하기 때문이다.

### lateinit은 스레드 안전을 보장하지 않는다

`lateinit`은 초기화 시점을 늦춰주는 문법이지, 동시성 문제를 해결해주는 문법은 아니다.

예를 들어 한 스레드에서 값을 넣고 다른 스레드에서 바로 읽는 구조라면 별도의 동기화나 상태 관리가 필요할 수 있다.

```kotlin
lateinit var session: UserSession
```

이런 전역 상태를 여러 스레드에서 읽고 쓴다면 `lateinit` 여부보다 상태 소유권과 접근 순서가 더 중요하다. Android 앱에서는 보통 ViewModel, Repository, DI scope 같은 구조 안에서 상태를 명확히 소유하게 만드는 편이 낫다.

### lateinit은 설계를 숨길 수도 있다

아래 코드는 동작할 수는 있다.

```kotlin
class SyncManager {
    lateinit var repository: UserRepository

    fun sync() {
        repository.sync()
    }
}
```

하지만 이 코드는 `SyncManager`를 만들 때 어떤 의존성이 필요한지 겉으로 잘 드러나지 않는다.

더 좋은 형태는 보통 생성자 주입이다.

```kotlin
class SyncManager(
    private val repository: UserRepository
) {
    fun sync() {
        repository.sync()
    }
}
```

이제 `SyncManager`를 만들려면 반드시 `UserRepository`가 필요하다는 사실이 타입에 드러난다.

```text
필수 의존성은 생성자로 드러낸다.
프레임워크나 테스트 setup 때문에 나중에 채워지는 값만 lateinit을 고려한다.
```

이 기준을 잡아두면 `lateinit`을 어디에 써야 할지 훨씬 선명해진다.

## 기준을 하나로 잡아보기

`lateinit`을 쓸지 고민될 때는 아래 질문을 순서대로 해보면 된다.

```text
1. 생성자에서 받을 수 있는가?
   -> 받을 수 있으면 생성자로 받는다.

2. 값이 없을 수 있는 상태가 정상인가?
   -> 정상이라면 nullable로 표현한다.

3. 처음 접근할 때 만들면 되는가?
   -> 그렇다면 by lazy를 고려한다.

4. Android lifecycle, DI, 테스트 setup 때문에 나중에 채워지는가?
   -> 사용 전 초기화가 명확하면 lateinit을 고려한다.
```

예시로 다시 나눠보면 이렇다.

```kotlin
// 생성자에서 받을 수 있는 필수 의존성
class GetUserUseCase(
    private val repository: UserRepository
)
```

```kotlin
// 아직 선택되지 않을 수 있는 화면 상태
private var selectedUser: User? = null
```

```kotlin
// 처음 필요할 때 만들고 재사용할 값
private val dateFormatter by lazy {
    DateTimeFormatter.ofPattern("yyyy-MM-dd")
}
```

```kotlin
// Android lifecycle에서 나중에 초기화되는 값
private lateinit var binding: ActivityMainBinding
```

각 문법은 서로를 대체하기보다, 다른 상태를 표현한다.

## 한 줄로 정리하기

`lateinit`은 "이 값은 null이 아니어야 하지만, 지금은 초기화할 수 없고, 사용 전에는 반드시 초기화하겠다"는 Kotlin의 약속이다.

좋은 사용처는 초기화 시점이 명확한 곳이다.

```text
Activity onCreate()에서 초기화되는 binding
Hilt가 Android entry point에 주입하는 필드
테스트 @Before에서 매번 준비하는 fixture
```

반대로 값이 없을 수 있는 상태라면 nullable이 맞고, 처음 접근할 때 자동으로 만들고 싶다면 `by lazy`가 맞다. 일반 클래스의 필수 의존성은 생성자로 드러내는 편이 가장 안전하다.

결국 `lateinit`을 잘 쓰는 기준은 문법을 외우는 것보다 초기화 흐름을 설명할 수 있는지에 가깝다.

```text
누가,
언제,
어떤 순서로,
이 값을 채우는가?
```

이 질문에 답할 수 있다면 `lateinit`은 코드가 깔끔해지는 도구가 된다. 답하기 어렵다면 nullable, `by lazy`, 생성자 주입 중 더 솔직한 표현이 있는지 다시 보는 편이 좋다.

## 함께 읽기

- [[kotlin-lambda-function|코틀린 람다함수]]
- [[hilt-androidapp-inject-application|Application에서 Hilt 필드 주입을 사용하는 이유]]
- [[hilt-inject-binds-flow|Hilt @Inject와 @Binds 흐름 이해하기]]

## 참고자료

- [Kotlin Docs - Properties: Late-initialized properties and variables](https://kotlinlang.org/docs/properties.html#late-initialized-properties-and-variables)
- [Kotlin API - UninitializedPropertyAccessException](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/-uninitialized-property-access-exception/)
- [Android Developers - Dependency injection with Hilt](https://developer.android.com/training/dependency-injection/hilt-android)
