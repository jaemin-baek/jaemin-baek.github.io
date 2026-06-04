---
title: "Hilt의 @HiltAndroidApp과 @Inject 쉽게 이해하기"
date: "2026-06-04"
category: "Android"
group: "Android Basics"
series: "Android Basics"
tags: ["android", "hilt", "dagger", "dependency-injection", "application", "kotlin"]
description: "Android Application 클래스에서 @HiltAndroidApp과 @Inject lateinit var가 왜 함께 쓰이는지, 생성자 주입과 필드 주입의 차이로 쉽게 정리합니다."
---

![Hilt의 @HiltAndroidApp과 @Inject 쉽게 이해하기](/images/hilt-androidapp-inject-cover.png)

Hilt 코드를 보다 보면 `Application` 클래스에 이런 코드가 들어 있는 경우가 있다.

```kotlin
@HiltAndroidApp
class DemoApplication : Application() {

    @Inject
    lateinit var sessionRepository: SessionRepository

    override fun onCreate() {
        super.onCreate()

        sessionRepository.prepare()
    }
}
```

처음 보면 질문이 생긴다.

```text
@HiltAndroidApp은 왜 Application에 붙을까?
@Inject lateinit var는 왜 생성자가 아니라 필드에 붙을까?
```

이 글은 이 두 질문을 이해하기 위한 메모다. 핵심은 하나다.

```text
객체를 누가 만드느냐
```

Hilt가 객체를 만들면 생성자 주입을 사용할 수 있다. 하지만 Android 프레임워크가 객체를 먼저 만들면, Hilt는 생성자에 끼어들 수 없다. 그래서 객체가 만들어진 뒤 필드를 채우는 방식이 필요하다.

## 먼저 DI를 다시 떠올리기

DI는 의존성 주입이다.

말은 딱딱하지만 생각은 단순하다.

```text
객체가 필요한 것을 직접 만들지 않고,
밖에서 넣어주는 방식
```

예를 들어 어떤 Repository가 API와 로컬 저장소가 필요하다고 해보자.

```kotlin
class SessionRepository(
    private val api: SessionApi,
    private val localStore: LocalStore
)
```

이 클래스는 `SessionApi`와 `LocalStore`를 직접 만들지 않는다. 생성자로 받는다.

Hilt를 사용하면 보통 이렇게 쓴다.

```kotlin
class SessionRepository @Inject constructor(
    private val api: SessionApi,
    private val localStore: LocalStore
)
```

이 코드는 Hilt에게 이렇게 말하는 것과 같다.

```text
SessionRepository를 만들 때는
SessionApi와 LocalStore를 생성자로 넣어주면 돼.
```

이런 방식을 생성자 주입이라고 한다. 가능하다면 이 방식이 가장 좋다. 필요한 값이 생성자에 드러나고, 객체가 만들어지는 순간부터 완전한 상태가 되기 때문이다.

그런데 `Application`은 조금 다르다.

## Application은 누가 만들까

일반 Repository나 UseCase는 Hilt가 만들 수 있다.

```text
Hilt
-> 필요한 의존성 준비
-> 생성자 호출
-> 객체 생성
```

하지만 `Application`은 Hilt가 직접 만드는 객체가 아니다. 앱 프로세스가 시작될 때 Android 프레임워크가 먼저 만든다.

흐름을 단순화하면 이렇게 볼 수 있다.

```text
앱 프로세스 시작
-> Android 프레임워크가 AndroidManifest.xml 확인
-> Application 클래스 생성
-> Application.onCreate() 호출
```

즉 `Application`은 Android 앱의 진입점이다. Hilt가 앱 안에서 일하려면 `Application`이 먼저 존재해야 한다.

여기서 생성자 주입이 어색해진다.

```kotlin
class DemoApplication @Inject constructor(
    private val sessionRepository: SessionRepository
) : Application()
```

이렇게 쓰고 싶어질 수 있다. 하지만 실제 앱 시작 흐름에서는 Android 프레임워크가 `Application`을 생성한다. Android는 Hilt 그래프를 보고 `SessionRepository`를 생성자에 넣어주는 방식으로 `Application`을 만들지 않는다.

한 문장으로 정리하면 이렇다.

```text
Android가 Application을 먼저 만들어버리기 때문에,
Hilt는 Application의 생성자에 의존성을 넣을 수 없다.
```

중요한 건 "Android가 못 만든다"가 아니다. Android는 `Application`을 잘 만든다. 오히려 Android가 먼저 만들어버리기 때문에 Hilt가 생성자 단계에 개입할 수 없는 것이다.

## @HiltAndroidApp은 무엇을 할까

그래서 Hilt에게 앱의 시작점을 알려줘야 한다.

```kotlin
@HiltAndroidApp
class DemoApplication : Application()
```

`@HiltAndroidApp`은 Hilt에게 이렇게 말한다.

```text
이 Application을 기준으로
앱 전체에서 사용할 Hilt 의존성 그래프를 준비해줘.
```

Android 공식 문서에서도 Hilt를 사용하는 앱은 `@HiltAndroidApp`이 붙은 `Application` 클래스를 가져야 한다고 설명한다. 이 어노테이션은 Hilt 코드 생성을 시작하고, 앱 수준의 의존성 컨테이너 역할을 하는 기반 클래스를 만든다.

쉽게 말하면 `@HiltAndroidApp`은 Hilt의 전원 스위치에 가깝다.

```text
@HiltAndroidApp
-> Hilt 코드 생성 시작
-> Application 생명주기에 붙는 컴포넌트 준비
-> 앱 전체 DI 그래프의 부모 역할
```

이게 있어야 이후에 Activity, Fragment, ViewModel, Repository 같은 곳에서 Hilt가 의존성을 연결할 수 있다.

## 그럼 @Inject 필드는 무엇일까

`Application`은 생성자 주입을 쓰기 어렵다. 그래서 Hilt는 필드 주입을 사용한다.

```kotlin
@HiltAndroidApp
class DemoApplication : Application() {

    @Inject
    lateinit var sessionRepository: SessionRepository
}
```

여기서 `@Inject`는 Hilt에게 이렇게 요청한다.

```text
DemoApplication 객체가 만들어진 뒤,
sessionRepository 필드에 알맞은 객체를 넣어줘.
```

이 방식은 생성자 주입과 순서가 다르다.

```text
생성자 주입:
의존성 준비 -> 생성자 호출 -> 객체 완성

필드 주입:
객체 생성 -> Hilt가 나중에 필드 채움 -> 객체 사용
```

그래서 `lateinit var`가 등장한다. Kotlin의 `val`은 생성자에서 초기화되어야 하는데, 필드 주입은 객체 생성 후에 Hilt가 값을 넣는다. 즉 처음에는 비어 있다가 나중에 채워지는 필드가 필요하다.

## 흐름으로 보면 더 쉽다

Application에서 Hilt 필드 주입은 이런 순서로 이해하면 된다.

![Application 필드 주입 흐름](/images/hilt-androidapp-field-injection-flow.png)

```text
1. Android가 DemoApplication 인스턴스를 먼저 만든다.
2. DemoApplication.onCreate()가 호출된다.
3. super.onCreate() 안에서 Hilt 주입이 수행된다.
4. @Inject 필드가 채워진다.
5. super.onCreate() 이후부터 필드를 사용할 수 있다.
```

그래서 코드는 보통 이런 모양이 된다.

```kotlin
@HiltAndroidApp
class DemoApplication : Application() {

    @Inject
    lateinit var sessionRepository: SessionRepository

    override fun onCreate() {
        super.onCreate()

        sessionRepository.prepare()
    }
}
```

여기서 중요한 줄은 `super.onCreate()`다.

```kotlin
override fun onCreate() {
    super.onCreate() // 이 이후에 @Inject 필드 사용 가능

    sessionRepository.prepare()
}
```

Hilt 공식 문서도 `Application`의 주입 필드는 `super.onCreate()`가 호출된 뒤 사용할 수 있다고 설명한다.

반대로 이렇게 쓰면 위험하다.

```kotlin
override fun onCreate() {
    sessionRepository.prepare() // 아직 주입 전일 수 있음

    super.onCreate()
}
```

`lateinit` 필드가 아직 초기화되지 않은 상태라면 런타임에서 크래시가 날 수 있다. 그래서 `Application`에서 주입 필드를 사용할 때는 항상 `super.onCreate()` 이후라고 기억하면 된다.

## 생성자 주입과 필드 주입 비교

둘의 차이는 "어느 방식이 더 멋있나"가 아니다. 객체 생성 주체가 누구냐의 차이다.

![생성자 주입과 필드 주입 비교](/images/hilt-constructor-vs-field-injection.png)

생성자 주입은 Hilt가 객체를 만들 수 있을 때 사용한다.

```kotlin
class SyncUseCase @Inject constructor(
    private val repository: SessionRepository
)
```

Hilt가 `SyncUseCase`를 만들기 때문에 생성자에 필요한 값을 넣을 수 있다.

```text
Hilt가 객체 생성
-> 생성자 파라미터를 채울 수 있음
-> 생성자 주입 가능
```

필드 주입은 Android 프레임워크가 객체를 먼저 만들 때 사용한다.

```kotlin
@HiltAndroidApp
class DemoApplication : Application() {
    @Inject
    lateinit var repository: SessionRepository
}
```

Android가 `DemoApplication`을 먼저 만들고, Hilt가 나중에 필드를 채운다.

```text
Android가 객체 생성
-> Hilt가 생성자에 끼어들 수 없음
-> 객체 생성 후 필드 주입
```

그래서 내가 기억하기 편한 기준은 이렇다.

| 상황 | 추천 방식 |
|---|---|
| 내가 만든 일반 클래스이고 Hilt가 생성할 수 있다 | 생성자 주입 |
| Repository, UseCase, Manager 같은 앱 내부 클래스 | 생성자 주입 |
| Application, Activity, Fragment처럼 Android가 생성한다 | 필드 주입 |
| ViewModel | `@HiltViewModel` + 생성자 주입 |

가능하면 생성자 주입을 기본으로 생각하고, Android 프레임워크 진입점에서는 필드 주입을 사용한다고 보면 된다.

## @Inject 필드는 어디서 값을 가져올까

필드에 `@Inject`를 붙였다고 해서 Hilt가 아무 객체나 갑자기 만들어낼 수 있는 것은 아니다.

```kotlin
@Inject
lateinit var sessionRepository: SessionRepository
```

이 코드는 Hilt에게 이런 요청을 하는 것이다.

```text
SessionRepository 타입의 객체를 하나 넣어줘.
```

그러려면 Hilt는 `SessionRepository`를 만드는 방법을 알고 있어야 한다.

구체 클래스라면 생성자 주입으로 알 수 있다.

```kotlin
class SessionRepository @Inject constructor(
    private val api: SessionApi,
    private val localStore: LocalStore
)
```

인터페이스라면 `@Binds`나 `@Provides` 같은 모듈이 필요하다.

```kotlin
interface SessionRepository

class DefaultSessionRepository @Inject constructor(
    private val api: SessionApi
) : SessionRepository
```

```kotlin
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    abstract fun bindSessionRepository(
        impl: DefaultSessionRepository
    ): SessionRepository
}
```

즉 `@Inject lateinit var`는 "여기에 넣어줘"라는 요청이고, Hilt 모듈이나 생성자 주입은 "이 타입은 이렇게 만들면 돼"라는 설명이다.

이 부분은 이전 글인 [[hilt-module-provides-qualifier|Hilt의 @Module, @Provides, @Qualifier 쉽게 이해하기]]와 이어진다.

## 왜 Application에서 이런 주입이 필요할까

`Application`은 앱 프로세스 전체에서 한 번 만들어진다. 그래서 앱 전체 초기화 코드가 들어오는 경우가 많다.

예를 들면 이런 것들이다.

```text
앱 전역 로그 설정
알림 채널 생성
분석 도구 초기화
프로세스 생명주기 옵저버 등록
앱 시작 시 필요한 작은 상태 준비
```

이런 작업에서 이미 Hilt로 관리하는 객체가 필요할 수 있다.

```kotlin
@HiltAndroidApp
class DemoApplication : Application() {

    @Inject
    lateinit var appInitializer: AppInitializer

    override fun onCreate() {
        super.onCreate()

        appInitializer.initialize()
    }
}
```

이때 `Application`이 직접 `AppInitializer()`를 만들면 Hilt를 쓰는 의미가 약해진다. `AppInitializer`가 또 다른 의존성을 필요로 할 수도 있고, 테스트나 설정 변경도 어려워진다.

그래서 `Application`도 필요한 객체를 Hilt에게 받아서 사용한다.

## 하지만 Application 주입은 가볍게

한 가지 조심할 점이 있다.

`Application.onCreate()`는 앱 시작 경로에 있다. 여기서 너무 많은 객체를 한꺼번에 만들면 앱 시작이 느려질 수 있다.

```kotlin
@Inject
lateinit var heavyManager: HeavyManager
```

이 객체가 정말 앱 시작 순간에 필요한지 생각해봐야 한다.

나중에 필요하거나 조건부로 필요한 객체라면 `Provider`를 써서 실제 사용 시점까지 생성을 미룰 수 있다.

```kotlin
@HiltAndroidApp
class DemoApplication : Application() {

    @Inject
    lateinit var reportManagerProvider: Provider<ReportManager>

    override fun onCreate() {
        super.onCreate()

        if (shouldStartReport()) {
            reportManagerProvider.get().start()
        }
    }
}
```

이렇게 하면 `ReportManager`가 항상 앱 시작과 동시에 만들어지는 것이 아니라, 실제로 필요할 때 꺼내 쓸 수 있다.

Application에 주입한다고 해서 모든 초기화를 Application에 모아도 된다는 뜻은 아니다. 앱 시작에 꼭 필요한 것만 두고, 화면이나 기능 단위에서 할 수 있는 초기화는 해당 위치로 보내는 편이 좋다.

## 자주 헷갈리는 포인트

첫 번째, `@HiltAndroidApp`은 모든 클래스에 붙이는 어노테이션이 아니다.

앱의 `Application` 클래스에 붙인다. Activity나 Fragment에는 `@AndroidEntryPoint`를 붙이고, ViewModel에는 `@HiltViewModel`을 사용한다.

```kotlin
@HiltAndroidApp
class DemoApplication : Application()

@AndroidEntryPoint
class MainActivity : ComponentActivity()

@HiltViewModel
class MainViewModel @Inject constructor(
    private val repository: SessionRepository
) : ViewModel()
```

두 번째, 필드 주입 대상은 `private`이면 안 된다.

```kotlin
@Inject
lateinit var repository: SessionRepository
```

Hilt가 필드에 값을 넣어야 하기 때문에 `private` 필드 주입은 사용할 수 없다.

세 번째, `@Inject` 하나만 붙인다고 모든 게 해결되지는 않는다.

```kotlin
@Inject
lateinit var repository: SessionRepository
```

이 코드는 요청이다. Hilt가 이 요청을 해결하려면 `SessionRepository`를 어떻게 만들지 알고 있어야 한다. 생성자 주입, `@Binds`, `@Provides` 중 어딘가에 그 정보가 있어야 한다.

네 번째, 생성자 주입을 쓸 수 있는 곳에서는 생성자 주입을 먼저 생각한다.

```kotlin
class SyncUseCase @Inject constructor(
    private val repository: SessionRepository
)
```

필드 주입은 Android 프레임워크가 생성하는 진입점에서 필요한 방식이다. 일반 클래스까지 습관적으로 `lateinit var` 필드 주입으로 만들면 의존성이 숨고, 테스트하기도 불편해진다.

## 한 줄로 정리하기

`@HiltAndroidApp`은 `Application`을 Hilt DI 그래프의 시작점으로 만든다.

`@Inject lateinit var`는 Android가 먼저 만든 `Application` 객체에 Hilt가 나중에 의존성을 채워 넣는 방식이다.

그리고 가장 중요한 기준은 이거다.

```text
Hilt가 객체를 만들 수 있으면 생성자 주입,
Android가 객체를 먼저 만들면 필드 주입.
```

이 기준을 잡고 나면 `Application`의 `@HiltAndroidApp`과 `@Inject` 조합이 덜 낯설어진다. Hilt가 마법처럼 모든 것을 만드는 게 아니라, Android 프레임워크가 만든 객체와 Hilt 그래프를 이어주는 작은 약속이라고 보면 된다.

## 참고자료

- [Android Developers - Dependency injection with Hilt](https://developer.android.com/training/dependency-injection/hilt-android)
- [Dagger - Hilt Application](https://dagger.dev/hilt/application.html)
- [Dagger - Android Entry Points](https://dagger.dev/hilt/android-entry-point.html)
