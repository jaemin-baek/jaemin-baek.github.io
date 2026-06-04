---
title: "Hilt @Inject는 어디서 호출될까? @Binds로 이해하기"
date: "2026-06-05"
category: "Android"
group: "Android Basics"
series: "Android Basics"
tags: ["android", "hilt", "dagger", "inject", "binds", "dependency-injection", "kotlin"]
description: "@Inject로 인터페이스 타입을 요청했을 때 Hilt가 어디서 구현체를 찾는지, @Binds가 하는 일을 커피 머신 예제로 쉽게 정리합니다."
---

![Hilt @Inject는 어디서 호출될까? @Binds로 이해하기](/images/hilt-inject-binds-cover.png)

앞 글에서 [[hilt-androidapp-inject-application|Application에 붙은 @HiltAndroidApp과 @Inject lateinit var]]를 정리했다.

거기서 자연스럽게 다음 질문이 생긴다.

```text
@Inject라고 선언하면
대체 어디가 호출되는 걸까?
```

처음에는 나도 `@Inject`가 붙은 필드나 함수가 런타임에 직접 호출되는 것처럼 상상했다. 그런데 Hilt를 조금 더 보면 핵심은 "호출"이라는 단어보다 **타입 요청을 어떻게 해결하느냐**에 가깝다.

특히 주입받는 타입이 인터페이스라면 질문이 더 선명해진다.

```kotlin
@Inject
lateinit var heater: Heater
```

Hilt 입장에서는 이렇게 묻는 것과 같다.

```text
Heater 타입이 필요하네.
그런데 Heater는 인터페이스인데,
실제로는 어떤 구현체를 넣어야 하지?
```

이 질문의 답을 적어두는 곳이 `@Binds`다.

## 아주 작은 커피 머신 예제

실제 프로젝트 코드 대신 커피 머신으로 생각해보자.

커피 머신은 커피를 만들 때 물을 데워야 한다. 그래서 `Heater`가 필요하다.

```kotlin
interface Heater {
    fun heat()
}
```

그리고 실제로 물을 데우는 구현체가 있다.

```kotlin
class ElectricHeater @Inject constructor() : Heater {
    override fun heat() {
        println("물을 데웁니다")
    }
}
```

커피 머신은 구체적인 `ElectricHeater`를 직접 알고 싶지 않다. 그냥 `Heater`만 필요하다고 말한다.

```kotlin
class CoffeeMachine @Inject constructor(
    private val heater: Heater
) {
    fun brew() {
        heater.heat()
        println("커피를 만듭니다")
    }
}
```

이 구조 자체는 좋다.

```text
CoffeeMachine
-> Heater 인터페이스에만 의존
-> ElectricHeater 구현체는 모름
```

하지만 Hilt 입장에서는 아직 답이 부족하다.

```text
CoffeeMachine을 만들려면 Heater가 필요하다.
그런데 Heater는 인터페이스라서 직접 만들 수 없다.
그럼 어떤 구현체를 넣어야 하지?
```

여기서 `@Binds`가 등장한다.

## @Binds는 인터페이스와 구현체를 연결한다

Hilt 모듈에 이런 코드를 추가한다.

```kotlin
@Module
@InstallIn(SingletonComponent::class)
abstract class HeaterModule {

    @Binds
    abstract fun bindHeater(
        impl: ElectricHeater
    ): Heater
}
```

처음 보면 조금 이상하다.

```kotlin
abstract fun bindHeater(
    impl: ElectricHeater
): Heater
```

함수인데 본문이 없다. `return`도 없다. 그런데 이 코드가 정말 무슨 일을 하는 걸까?

한 줄로 보면 이렇다.

```text
Heater가 필요하면 ElectricHeater를 사용해.
```

`@Binds` 함수는 실행할 로직을 적는 함수가 아니다. Hilt에게 타입 연결 정보를 알려주는 선언이다.

```text
반환 타입: Heater
파라미터 타입: ElectricHeater

의미:
Heater 요청이 오면 ElectricHeater로 해결한다.
```

그래서 함수 이름은 사실 크게 중요하지 않다.

```kotlin
@Binds
abstract fun bindHeater(impl: ElectricHeater): Heater
```

여기서 중요한 것은 함수 이름 `bindHeater`가 아니라 타입이다.

```text
ElectricHeater -> Heater
```

Hilt는 이 매핑을 보고 의존성 그래프에 기록한다.

## @Inject 요청이 구현체로 연결되는 흐름

전체 흐름은 이렇게 볼 수 있다.

![Hilt @Inject 요청이 @Binds를 통해 구현체로 연결되는 흐름](/images/hilt-inject-binds-flow.png)

`CoffeeMachine` 생성자에는 `Heater`가 필요하다.

```kotlin
class CoffeeMachine @Inject constructor(
    private val heater: Heater
)
```

Hilt는 `Heater`를 만들려고 한다. 그런데 인터페이스는 직접 생성할 수 없다.

```text
new Heater()
```

이런 코드는 불가능하다.

그래서 Hilt는 모듈을 확인한다.

```kotlin
@Binds
abstract fun bindHeater(
    impl: ElectricHeater
): Heater
```

이 매핑을 읽고 Hilt는 이렇게 이해한다.

```text
Heater가 필요하면 ElectricHeater를 쓰면 되겠구나.
```

그 다음 질문은 이것이다.

```text
그럼 ElectricHeater는 어떻게 만들지?
```

다행히 `ElectricHeater` 생성자에는 `@Inject`가 붙어 있다.

```kotlin
class ElectricHeater @Inject constructor() : Heater
```

그래서 Hilt는 `ElectricHeater`를 직접 만들 수 있다.

흐름을 글로 풀면 이렇다.

```text
CoffeeMachine 요청
-> CoffeeMachine 생성자에 Heater 필요
-> Heater는 인터페이스라 직접 생성 불가
-> @Binds 매핑 확인
-> Heater = ElectricHeater
-> ElectricHeater @Inject constructor 호출
-> CoffeeMachine 생성자에 주입
```

여기서 런타임에 실제로 실행되는 것은 `@Binds` 함수 본문이 아니다. 애초에 본문이 없다. Hilt와 Dagger가 컴파일 타임에 이 매핑을 읽고, 필요한 Factory 코드를 생성한다.

## 이 흐름은 언제 시작될까

`@Inject`를 붙였다고 해서 앱 시작 순간에 모든 객체가 바로 만들어지는 것은 아니다.

```kotlin
class CoffeeMachine @Inject constructor(
    private val heater: Heater
)
```

이 코드는 Hilt에게 이렇게 알려준다.

```text
CoffeeMachine이 필요해지면
이 생성자로 만들 수 있어.
```

즉 선언 자체가 즉시 실행되는 것이 아니라, Hilt 그래프 안에서 `CoffeeMachine`이 필요해지는 순간에 생성 흐름이 시작된다.

예를 들어 어떤 ViewModel이 `CoffeeMachine`을 필요로 한다고 해보자.

```kotlin
@HiltViewModel
class CoffeeViewModel @Inject constructor(
    private val coffeeMachine: CoffeeMachine
) : ViewModel()
```

화면에서 이 ViewModel이 필요해지면 Hilt는 `CoffeeViewModel`을 만들려고 한다. 그러려면 `CoffeeMachine`이 필요하고, `CoffeeMachine`을 만들려면 `Heater`가 필요하다.

```text
CoffeeViewModel 필요
-> CoffeeMachine 필요
-> Heater 필요
-> @Binds 매핑 확인
-> ElectricHeater 생성
```

필드 주입도 마찬가지다.

```kotlin
@Inject
lateinit var heater: Heater
```

이 선언은 "지금 당장 실행"이 아니라 "이 필드를 채울 때 `Heater` 타입을 그래프에서 찾아 넣어줘"라는 요청이다.

그래서 `@Inject`를 볼 때는 이렇게 읽는 편이 좋다.

```text
여기가 바로 호출된다
```

보다는

```text
이 타입이 필요해지는 순간,
Hilt가 그래프에서 해결한다
```

에 가깝다.

## 그래서 @Inject는 어디서 호출될까

질문을 조금 더 정확히 바꿔보자.

```text
@Inject가 붙은 필드나 생성자는 누가 처리할까?
```

답은 Hilt가 생성한 코드다.

Hilt는 컴파일 타임에 어노테이션을 읽고 코드를 만든다. 우리가 직접 보통 호출하지 않는 코드다.

개념적으로는 이런 일이 일어난다고 볼 수 있다.

```kotlin
// 실제 코드가 아니라 이해를 위한 의사 코드
class CoffeeMachineFactory(
    private val heaterProvider: Provider<Heater>
) {
    fun get(): CoffeeMachine {
        return CoffeeMachine(
            heater = heaterProvider.get()
        )
    }
}
```

`heaterProvider.get()`은 다시 `@Binds` 매핑을 따라간다.

```kotlin
// 실제 코드가 아니라 이해를 위한 의사 코드
fun provideHeater(): Heater {
    return electricHeaterProvider.get()
}
```

그리고 `ElectricHeater`는 `@Inject constructor`가 있으므로 생성할 수 있다.

```kotlin
// 실제 코드가 아니라 이해를 위한 의사 코드
class ElectricHeaterFactory {
    fun get(): ElectricHeater {
        return ElectricHeater()
    }
}
```

정리하면 이렇다.

```text
@Inject constructor
-> Hilt가 생성한 Factory 코드가 생성자를 호출한다.

@Inject lateinit var
-> Hilt가 생성한 MembersInjector 코드가 필드에 값을 넣는다.

@Binds
-> Hilt가 컴파일 타임에 읽는 인터페이스-구현체 매핑이다.
```

그래서 "`@Binds` 함수가 호출된다"라고 말하면 조금 부정확하다. 더 정확히는 "`@Binds` 선언을 읽어서 배선을 만든다"이다.

## 필드 주입에서도 원리는 같다

앞 글의 `Application` 예제처럼 필드 주입을 생각해보자.

```kotlin
@HiltAndroidApp
class DemoApplication : Application() {

    @Inject
    lateinit var heater: Heater

    override fun onCreate() {
        super.onCreate()

        heater.heat()
    }
}
```

여기서도 Hilt는 똑같은 질문을 한다.

```text
DemoApplication에 Heater 필드를 채워야 한다.
Heater는 인터페이스다.
어떤 구현체를 넣지?
```

답은 여전히 `@Binds`에 있다.

```kotlin
@Binds
abstract fun bindHeater(
    impl: ElectricHeater
): Heater
```

다만 차이는 "주입 위치"다.

생성자 주입은 객체를 만들 때 생성자 파라미터에 넣는다.

```kotlin
class CoffeeMachine @Inject constructor(
    private val heater: Heater
)
```

필드 주입은 이미 만들어진 객체의 필드에 나중에 넣는다.

```kotlin
@Inject
lateinit var heater: Heater
```

하지만 둘 다 결국은 같은 그래프를 사용한다.

```text
Heater 요청
-> @Binds 매핑 확인
-> ElectricHeater 생성
-> 필요한 위치에 주입
```

## @Binds 함수는 왜 abstract일까

`@Binds` 함수는 본문이 없다.

```kotlin
@Binds
abstract fun bindHeater(
    impl: ElectricHeater
): Heater
```

왜냐하면 우리가 직접 객체를 만들어 반환하지 않기 때문이다.

`@Binds`가 하는 일은 이것뿐이다.

```text
이 구현체는 이 인터페이스로 취급해도 된다.
```

그래서 Hilt에게 필요한 정보는 타입뿐이다.

```text
파라미터 타입: ElectricHeater
반환 타입: Heater
```

본문에 쓸 로직이 없으니 함수도 `abstract`가 된다. 그리고 이런 함수를 담는 모듈도 보통 `abstract class`가 된다.

```kotlin
@Module
@InstallIn(SingletonComponent::class)
abstract class HeaterModule
```

비유하면 `@Binds`는 배선표다.

```text
Heater 콘센트에
ElectricHeater 전선을 연결한다.
```

전기가 실제로 흐르는 코드는 Hilt가 생성한 Factory 쪽에 있고, `@Binds`는 어떤 선을 어디에 꽂을지 알려주는 표지판에 가깝다.

## @Binds와 @Provides는 어떻게 다를까

둘 다 Hilt에게 "이 타입은 이렇게 준비하면 된다"라고 알려준다.

하지만 방식이 다르다.

![Hilt @Binds와 @Provides 차이](/images/hilt-binds-vs-provides.png)

`@Binds`는 구현체를 직접 만들지 않는다. 이미 Hilt가 만들 수 있는 구현체를 인터페이스 타입으로 연결한다.

```kotlin
@Binds
abstract fun bindHeater(
    impl: ElectricHeater
): Heater
```

이 코드는 이렇게 읽으면 된다.

```text
ElectricHeater는 Heater로 써도 돼.
```

반면 `@Provides`는 함수 본문에서 직접 객체를 만든다.

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    fun provideRetrofit(): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://api.example.com")
            .build()
    }
}
```

이 함수는 실제로 실행될 본문이 있다.

```text
Retrofit.Builder()
    .baseUrl(...)
    .build()
```

그래서 기준은 이렇게 잡으면 편하다.

| 상황 | 사용 |
|---|---|
| 인터페이스를 구현체로 연결하고 싶다 | `@Binds` |
| 구현체 생성자에 `@Inject constructor`가 있다 | `@Binds` 사용 가능 |
| 외부 라이브러리 객체라 생성자에 `@Inject`를 붙일 수 없다 | `@Provides` |
| 객체를 만드는 로직을 직접 적어야 한다 | `@Provides` |
| 기본 타입, 설정값, Builder 패턴이 필요하다 | `@Provides` |

커피 예제로 다시 보면 이렇다.

```kotlin
// Hilt가 ElectricHeater를 만들 수 있으니 연결만 한다
@Binds
abstract fun bindHeater(
    impl: ElectricHeater
): Heater
```

```kotlin
// 직접 만드는 과정이 필요하니 본문을 적는다
@Provides
fun provideCoffeeBeans(): CoffeeBeans {
    return CoffeeBeans(origin = "Colombia")
}
```

## @Singleton은 어디에 붙을까

실제 코드에서는 `@Binds`와 함께 `@Singleton`도 자주 보인다.

```kotlin
@Binds
@Singleton
abstract fun bindHeater(
    impl: ElectricHeater
): Heater
```

이건 매핑 자체를 싱글톤으로 만든다는 느낌보다, 이 바인딩으로 제공되는 객체를 `SingletonComponent` 범위에서 하나로 재사용하겠다는 의미에 가깝다.

```text
Heater 요청
-> ElectricHeater로 해결
-> 같은 SingletonComponent 안에서는 같은 인스턴스 재사용
```

다만 `@Singleton`은 아무 곳에나 붙이면 좋은 어노테이션은 아니다. 상태를 들고 있거나 앱 전체에서 하나만 있어야 하는 객체인지 생각해야 한다.

커피 머신 예제의 `ElectricHeater`는 단순해서 싱글톤이 꼭 필요하지 않을 수 있다. 하지만 앱 전역 캐시, 세션 저장소, 네트워크 클라이언트처럼 하나로 공유해야 하는 객체라면 스코프가 의미가 있다.

## 컴파일 에러가 알려주는 것

만약 `@Binds`를 빼고 `CoffeeMachine`만 두면 어떻게 될까?

```kotlin
class CoffeeMachine @Inject constructor(
    private val heater: Heater
)
```

Hilt는 `Heater`를 해결하지 못한다.

```text
Heater cannot be provided without an @Provides-annotated method.
```

비슷한 컴파일 에러를 볼 수 있다.

처음에는 이 메시지가 조금 헷갈린다. `@Provides`만 말하는 것처럼 보이기 때문이다. 하지만 실제 해결 방법은 상황에 따라 둘 중 하나다.

```text
인터페이스 -> 구현체 연결이면 @Binds
직접 생성 로직이 필요하면 @Provides
```

`Heater`처럼 구현체 `ElectricHeater`가 있고, 그 구현체를 Hilt가 생성할 수 있다면 `@Binds`가 더 잘 맞는다.

## 전체 코드로 다시 보기

마지막으로 전체 코드를 한 번에 보자.

```kotlin
interface Heater {
    fun heat()
}
```

```kotlin
class ElectricHeater @Inject constructor() : Heater {
    override fun heat() {
        println("물을 데웁니다")
    }
}
```

```kotlin
class CoffeeMachine @Inject constructor(
    private val heater: Heater
) {
    fun brew() {
        heater.heat()
        println("커피를 만듭니다")
    }
}
```

```kotlin
@Module
@InstallIn(SingletonComponent::class)
abstract class HeaterModule {

    @Binds
    abstract fun bindHeater(
        impl: ElectricHeater
    ): Heater
}
```

이 코드를 Hilt 관점에서 읽으면 이렇게 된다.

```text
CoffeeMachine은 Heater가 필요하다.
Heater는 인터페이스다.
Heater 요청은 @Binds에 따라 ElectricHeater로 해결한다.
ElectricHeater는 @Inject constructor가 있으니 Hilt가 만들 수 있다.
만든 ElectricHeater를 Heater 타입으로 CoffeeMachine에 넣는다.
```

이 흐름이 잡히면 `@Inject`와 `@Binds`가 따로 떨어진 어노테이션처럼 보이지 않는다.

`@Inject`는 "이 타입이 필요하다" 또는 "이 타입은 이렇게 만들 수 있다"를 표시한다.

`@Binds`는 "인터페이스 요청이 오면 이 구현체로 연결해라"를 표시한다.

## 한 줄로 정리하기

`@Inject`가 붙은 곳을 보고 "여기가 호출되나?"라고 묻기 시작하면, 실제 핵심은 `@Binds`까지 이어진다.

정확히는 이렇게 이해하는 편이 좋다.

```text
@Inject는 타입 요청을 만든다.
@Binds는 인터페이스 요청을 구현체로 매핑한다.
Hilt는 컴파일 타임에 그 매핑을 읽고 Factory 코드를 생성한다.
런타임에는 생성된 코드가 생성자 호출이나 필드 대입을 수행한다.
```

그래서 `@Binds`는 "호출되는 함수"라기보다 "Hilt가 읽는 연결 선언"이다.

이렇게 생각하면 `@Inject lateinit var someRepository: SomeRepository` 같은 코드를 봤을 때도 덜 막막하다.

```text
SomeRepository는 인터페이스인가?
그럼 어떤 구현체와 @Binds로 연결되어 있지?
그 구현체는 @Inject constructor로 만들 수 있나?
아니면 @Provides가 필요한가?
```

이 질문들을 따라가면 Hilt 그래프가 훨씬 잘 보인다.

## 참고자료

- [Android Developers - Dependency injection with Hilt](https://developer.android.com/training/dependency-injection/hilt-android)
- [Dagger - Hilt modules](https://dagger.dev/hilt/modules.html)
- [Dagger - Dependency injection with Dagger](https://dagger.dev/dev-guide/)
