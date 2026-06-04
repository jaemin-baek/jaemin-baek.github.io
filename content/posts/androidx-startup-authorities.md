---
title: "App Startup과 authorities"
date: "2026-06-04"
category: "Android"
group: "Android Startup"
series: "Android Startup"
tags: ["android", "androidx-startup", "manifest", "contentprovider", "initializer"]
description: "AndroidManifest.xml의 android:authorities=\"${applicationId}.androidx-startup\"가 어떤 역할을 하고, AndroidX App Startup을 언제 사용하면 좋은지 정리합니다."
---

![androidx-startup authorities 흐름](/images/androidx-startup-authorities.png)

AndroidManifest.xml을 보다 보면 이런 Provider 선언을 만날 때가 있다.

```xml
<provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    android:exported="false"
    tools:node="merge">
    <meta-data
        android:name="com.example.app.initializer.SentryInitializer"
        android:value="androidx.startup" />
</provider>
```

처음 보면 `androidx-startup`이라는 이름 때문에 앱 시작과 관련된 설정이라는 것은 눈치챌 수 있다. 하지만 `android:authorities="${applicationId}.androidx-startup"`가 정확히 어떤 일을 하는지는 조금 헷갈린다.

한 문장으로 정리하면 이렇다.

```text
android:authorities는 InitializationProvider라는 ContentProvider의 고유 식별자이고,
AndroidX App Startup은 이 Provider를 앱 시작 시점의 초기화 진입점으로 사용한다.
```

즉, `authorities`가 직접 Sentry나 WorkManager 같은 컴포넌트를 초기화하는 것은 아니다. `authorities`는 Provider를 식별하기 위한 이름이고, 실제 초기화 대상은 Provider 아래에 등록된 `<meta-data>`와 그 안의 `Initializer` 클래스가 결정한다.

이 글은 2026년 6월 4일 기준 AndroidX App Startup 문서와 API 레퍼런스를 기준으로 정리한 메모다.

## AndroidX App Startup이 하는 일

Android 앱에는 시작하자마자 준비되어야 하는 코드가 자주 있다.

- 크래시 리포팅 SDK 초기화
- 로깅 설정
- WorkManager 같은 백그라운드 작업 컴포넌트 준비
- 라이브러리 내부 상태 또는 설정 로딩

가장 익숙한 방법은 `Application.onCreate()`에 코드를 넣는 것이다.

```kotlin
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        initLogger()
        initCrashReporter()
        initWorkManager()
    }
}
```

작은 앱에서는 이 방식도 충분하다. 하지만 초기화 대상이 늘어나면 몇 가지 문제가 생긴다.

- `Application.onCreate()`가 여러 라이브러리 초기화 코드로 길어진다.
- 초기화 순서를 사람이 직접 관리해야 한다.
- 어떤 코드는 앱 시작 시점에 꼭 필요하지 않은데도 매번 실행된다.
- 라이브러리 개발자는 앱 개발자에게 "Application에서 이 코드를 호출해 주세요"라고 요구해야 한다.

AndroidX App Startup은 이런 초기화 코드를 `Initializer`라는 단위로 나누고, 필요한 경우 의존성 순서를 명시할 수 있게 해주는 Jetpack 라이브러리다.

공식 문서에서는 App Startup을 앱 시작 시 컴포넌트를 초기화하기 위한 일관된 방식으로 설명한다. 핵심은 "초기화 코드를 어디에 둘 것인가"와 "어떤 순서로 실행할 것인가"를 Manifest와 `Initializer` API로 정리한다는 점이다.

## 왜 ContentProvider를 사용할까

Android는 앱 프로세스를 만들 때 `Application.onCreate()`보다 먼저 Manifest에 등록된 `ContentProvider`를 생성한다.

App Startup은 이 특성을 이용한다. `androidx.startup.InitializationProvider`라는 특별한 ContentProvider를 Manifest에 등록해 두면, 앱 시작 시 Android 시스템이 이 Provider를 먼저 만들고, Provider는 자신 아래의 `<meta-data>`를 읽어서 초기화할 `Initializer`들을 찾는다.

단순화하면 순서는 이렇다.

```text
앱 프로세스 시작
-> Android가 Manifest의 ContentProvider 생성
-> InitializationProvider 생성
-> Provider 아래의 meta-data 읽기
-> 등록된 Initializer 탐색
-> dependencies() 순서 확인
-> Initializer.create(context) 호출
-> Application.onCreate() 호출
```

그래서 App Startup으로 등록한 초기화 코드는 보통 `Application.onCreate()`보다 먼저 실행된다.

이 점은 장점이 될 수도 있고 부담이 될 수도 있다. 예를 들어 크래시 리포팅 SDK는 가능한 한 이른 시점에 켜고 싶을 수 있다. 반대로 사용자 동의, 로그인 정보, Activity context, 무거운 네트워크 요청이 필요한 코드는 너무 일찍 실행되면 오히려 문제가 된다.

## authorities의 역할

`android:authorities`는 ContentProvider의 고유 이름이다.

ContentProvider는 원래 다른 컴포넌트가 `content://...` 형태의 URI로 데이터를 조회하거나 조작할 수 있게 해주는 컴포넌트다. 이때 어떤 Provider에 접근할지 식별하는 값이 authority다.

예를 들어 아래 URI에서 authority는 `com.example.notes.provider`다.

```text
content://com.example.notes.provider/items/1
```

App Startup의 `InitializationProvider`는 실제 데이터를 외부에 제공하려는 목적의 Provider는 아니다. 그래도 Android 시스템 입장에서는 ContentProvider이기 때문에 고유한 `authorities` 값이 반드시 필요하다.

그래서 다음 선언은 "이 앱 안에서 App Startup용 Provider의 authority를 앱 ID 기반으로 만들겠다"는 의미가 된다.

```xml
android:authorities="${applicationId}.androidx-startup"
```

여기서 중요한 부분은 두 가지다.

`"${applicationId}"`는 빌드 시 실제 애플리케이션 ID로 치환된다. 예를 들어 applicationId가 `com.example.wallet`이라면 최종 Manifest에는 `com.example.wallet.androidx-startup`처럼 들어간다.

`".androidx-startup"`은 이 Provider가 AndroidX App Startup용이라는 것을 나타내는 접미사다. 앱의 다른 Provider와 이름이 겹치지 않게 만드는 역할도 한다.

## 왜 applicationId를 붙일까

ContentProvider의 authority는 기기 안에서 고유해야 한다. 서로 다른 앱이 같은 authority를 사용하면 설치나 실행 과정에서 충돌이 생길 수 있다.

그래서 라이브러리가 고정 문자열을 쓰면 위험하다.

```xml
android:authorities="androidx-startup"
```

이렇게 모든 앱이 같은 값을 쓰면 같은 기기에 여러 앱을 설치할 때 충돌 가능성이 생긴다. 반면 `${applicationId}`를 붙이면 앱마다 authority가 달라진다.

```text
com.example.wallet.androidx-startup
com.example.wallet.debug.androidx-startup
com.company.partnerapp.androidx-startup
```

또한 `applicationIdSuffix`가 있는 debug 빌드나 flavor 빌드에서도 실제 빌드 결과의 applicationId가 반영된다. 같은 기기에 release와 debug 앱을 함께 설치해도 authority가 겹치지 않게 된다.

## meta-data가 실제 초기화 대상을 정한다

`InitializationProvider`만 선언한다고 아무 컴포넌트가 초기화되는 것은 아니다. App Startup은 Provider 아래의 `<meta-data>`를 보고 어떤 `Initializer`를 실행할지 판단한다.

```xml
<provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    android:exported="false"
    tools:node="merge">

    <meta-data
        android:name="com.example.app.initializer.SentryInitializer"
        android:value="androidx.startup" />
</provider>
```

여기서 `android:name`에는 실행할 `Initializer` 클래스의 전체 이름이 들어간다. `android:value="androidx.startup"`은 이 meta-data가 App Startup 초기화 항목이라는 표시다.

초기화 클래스는 `Initializer<T>`를 구현한다.

```kotlin
class SentryInitializer : Initializer<Unit> {
    override fun create(context: Context) {
        SentryAndroid.init(context) { options ->
            options.dsn = BuildConfig.SENTRY_DSN
        }
    }

    override fun dependencies(): List<Class<out Initializer<*>>> {
        return emptyList()
    }
}
```

`create()`는 실제 초기화 코드가 실행되는 곳이다. `dependencies()`는 이 Initializer보다 먼저 실행되어야 하는 다른 Initializer 목록을 반환한다.

예를 들어 `ExampleLoggerInitializer`가 `WorkManagerInitializer`에 의존한다면, App Startup은 WorkManager를 먼저 초기화한 뒤 Logger를 초기화한다.

```kotlin
class ExampleLoggerInitializer : Initializer<ExampleLogger> {
    override fun create(context: Context): ExampleLogger {
        return ExampleLogger(WorkManager.getInstance(context))
    }

    override fun dependencies(): List<Class<out Initializer<*>>> {
        return listOf(WorkManagerInitializer::class.java)
    }
}
```

이 구조 덕분에 초기화 순서를 `Application.onCreate()`의 코드 위치가 아니라 `Initializer` 사이의 의존성으로 표현할 수 있다.

## tools:node="merge"는 왜 붙을까

App Startup을 쓰다 보면 Provider에 `tools:node="merge"`가 붙어 있는 경우가 많다.

```xml
<provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    android:exported="false"
    tools:node="merge">
    ...
</provider>
```

이 값은 Manifest merger에게 "같은 Provider 선언이 이미 있으면 새 Provider를 따로 만들지 말고 기존 선언에 합쳐 달라"는 의미에 가깝다.

App Startup은 여러 라이브러리가 같은 `InitializationProvider` 아래에 자기 Initializer를 `<meta-data>`로 추가하는 구조로 동작한다. 예를 들어 WorkManager, ProfileInstaller, 커스텀 SentryInitializer가 모두 App Startup을 사용한다면, 최종 Manifest에는 하나의 `InitializationProvider` 아래에 여러 meta-data가 합쳐질 수 있다.

그래서 앱에서 커스텀 Initializer를 추가할 때도 Provider를 새로 만들기보다 기존 Provider에 meta-data를 병합하는 방식이 자연스럽다.

## exported=false인 이유

`android:exported="false"`도 중요하다.

App Startup의 `InitializationProvider`는 외부 앱에 데이터를 제공하는 용도가 아니다. 앱 내부 초기화를 트리거하기 위한 진입점에 가깝다. 따라서 외부 앱에서 이 Provider에 접근할 필요가 없다.

```xml
android:exported="false"
```

이렇게 설정하면 외부 앱에서 접근할 수 없다. 보안 측면에서도 App Startup Provider는 exported false가 맞다.

## 언제 사용하면 좋을까

App Startup은 모든 초기화 코드를 대체하는 도구는 아니다. 하지만 아래 상황에서는 꽤 잘 맞는다.

첫째, 앱 시작 시점에 반드시 준비되어야 하는 작은 초기화 코드가 있을 때다.

예를 들어 크래시 리포팅, 로깅, 가벼운 SDK 설정처럼 앱 전역에서 일찍 준비되어야 하는 코드에 어울린다.

둘째, 초기화 순서가 명확해야 할 때다.

`A`를 초기화하기 전에 `B`가 먼저 준비되어야 한다면 `dependencies()`로 그 관계를 드러낼 수 있다. `Application.onCreate()`에서 호출 순서를 눈으로 맞추는 것보다 의도가 분명하다.

셋째, 라이브러리 개발자가 초기화 진입점을 제공하고 싶을 때다.

라이브러리가 App Startup Initializer를 제공하면 앱 개발자는 `Application.onCreate()`에 별도 코드를 넣지 않아도 된다. 필요한 경우 Manifest에서 해당 Initializer를 제거하고 수동 초기화로 바꿀 수도 있다.

넷째, 당장 필요하지 않은 초기화를 lazy initialization으로 미루고 싶을 때다.

App Startup은 자동 초기화뿐 아니라 `AppInitializer`를 통한 수동 초기화도 지원한다. 앱 시작 비용을 줄이고 싶은 컴포넌트는 자동 초기화에서 제외한 뒤 필요한 시점에 직접 초기화할 수 있다.

## 언제 피하는 게 좋을까

반대로 아래 코드들은 App Startup에 넣기 전에 다시 생각해보는 편이 좋다.

무거운 디스크 I/O나 네트워크 요청은 피하는 것이 좋다. App Startup은 앱 시작 경로에 올라타기 때문에 초기화가 무거우면 cold start가 느려진다.

사용자 동의가 필요한 SDK 초기화도 조심해야 한다. 개인정보 수집, 분석, 광고 SDK처럼 동의 상태에 따라 실행 여부가 달라지는 코드는 너무 이른 시점에 자동 실행되면 정책상 문제가 될 수 있다.

로그인 정보나 사용자 세션이 필요한 초기화도 맞지 않을 수 있다. App Startup은 보통 Application보다 이른 시점에 실행되므로, 아직 사용자 상태가 준비되지 않았을 가능성이 있다.

Activity나 화면 context가 필요한 초기화도 넣지 않는 편이 좋다. `Initializer.create()`로 전달되는 것은 application context다. UI나 Activity lifecycle에 기대는 코드는 다른 진입점이 더 적절하다.

정리하면 App Startup에는 "작고, 전역적이고, application context만으로 실행 가능하고, 앱 시작 시점에 의미가 있는 초기화"를 넣는 것이 좋다.

## 자동 초기화를 끄고 직접 호출하기

어떤 컴포넌트는 App Startup 구조를 쓰되 앱 시작 시 자동 실행하고 싶지 않을 수 있다. 이때는 Manifest에서 해당 meta-data를 제거한다.

```xml
<provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    android:exported="false"
    tools:node="merge">

    <meta-data
        android:name="com.example.app.initializer.SentryInitializer"
        tools:node="remove" />
</provider>
```

이후 필요한 시점에 직접 호출한다.

```kotlin
AppInitializer.getInstance(context)
    .initializeComponent(SentryInitializer::class.java)
```

이 방식은 "초기화 코드는 Initializer로 관리하되, 실행 시점은 내가 정하고 싶다"는 경우에 유용하다.

모든 자동 초기화를 끄고 싶다면 `InitializationProvider` 자체를 제거할 수도 있다.

```xml
<provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    tools:node="remove" />
```

다만 Provider를 제거하면 그 아래에 자동 등록되던 다른 라이브러리 Initializer도 함께 영향을 받을 수 있으므로, 최종 merged manifest를 확인하는 것이 좋다.

## 멀티 프로세스에서는 더 조심해야 한다

앱에 별도 프로세스에서 실행되는 Service나 Provider가 있다면 App Startup도 프로세스 관점에서 봐야 한다.

ContentProvider는 자신이 속한 프로세스가 시작될 때 생성된다. 따라서 어떤 초기화 코드가 main process에서만 필요하다면 secondary process에서 실행되지 않도록 확인해야 한다. 반대로 특정 secondary process에서도 자동 초기화가 필요하다면 그 프로세스에 맞는 Provider 선언과 고유 authority를 따로 고려해야 한다.

AndroidX Startup 1.1.0 이후에는 여러 `InitializationProvider` 선언을 사용할 수 있어, 여러 프로세스에서 자동 초기화가 필요한 경우를 다룰 수 있다. 다만 멀티 프로세스 초기화는 중복 실행, 순서, 비용 문제가 쉽게 생기므로 실제 merged manifest와 프로세스 설정을 함께 확인해야 한다.

## Sentry 초기화에 쓴다면

질문에 나온 예시처럼 Sentry 초기화를 `SentryInitializer`로 등록하는 경우를 생각해보자.

```xml
<meta-data
    android:name="com.example.app.initializer.SentryInitializer"
    android:value="androidx.startup" />
```

이렇게 하면 앱 시작 시 `InitializationProvider`가 `SentryInitializer`를 발견하고 `create()`를 호출한다. 결과적으로 Sentry는 `Application.onCreate()`보다 이른 시점에 준비될 수 있다.

크래시나 에러 리포팅은 가능한 한 빨리 켜고 싶은 경우가 많기 때문에 App Startup과 잘 맞는 편이다. 하지만 이른 시점에 켜진다는 것은 그만큼 필터링도 이른 시점부터 안전해야 한다는 뜻이다.

예를 들어 지갑, 결제, 인증 같은 도메인에서는 아래 값을 절대 이벤트로 보내지 않도록 별도 방어가 필요하다.

- 니모닉
- 개인키
- PIN
- access token
- 사용자의 식별 가능한 민감 정보

Sentry라면 `beforeSend` 같은 콜백에서 이벤트를 한 번 더 가공하거나 폐기하는 방식을 고려할 수 있다. App Startup은 초기화 시점을 앞당겨 줄 뿐이고, 어떤 데이터를 보낼지 결정하는 책임은 여전히 앱 코드에 있다.

## 체크리스트

Manifest에서 `android:authorities="${applicationId}.androidx-startup"`를 봤다면 아래 순서로 확인하면 된다.

1. `android:name`이 `androidx.startup.InitializationProvider`인지 확인한다.
2. Provider 아래에 어떤 `<meta-data>`가 들어 있는지 확인한다.
3. 각 meta-data의 `android:name`에 적힌 `Initializer` 클래스를 찾는다.
4. `Initializer.create()`에서 어떤 초기화가 실행되는지 확인한다.
5. `dependencies()`로 실행 순서가 달라지는지 확인한다.
6. 앱 시작 시 자동 실행이 맞는지, lazy initialization이 더 나은지 판단한다.
7. 민감 정보나 사용자 동의가 필요한 코드가 너무 이르게 실행되지 않는지 확인한다.
8. debug, flavor, multi-process 환경에서 최종 merged manifest가 의도대로 나오는지 확인한다.

## 정리

`android:authorities="${applicationId}.androidx-startup"`는 AndroidX App Startup의 `InitializationProvider`를 식별하기 위한 ContentProvider authority다.

이 값 자체가 초기화 코드를 실행하는 것은 아니다. Android가 앱 시작 시 Provider를 만들고, `InitializationProvider`가 자신의 `<meta-data>`를 읽고, 거기에 등록된 `Initializer`의 `create()`를 호출하면서 초기화가 일어난다.

그래서 이 선언을 볼 때는 `authorities`만 보지 말고 Provider 아래의 `<meta-data>`와 연결된 `Initializer`를 같이 봐야 한다.

```text
authorities
-> Provider 식별자

meta-data
-> 실행할 Initializer 등록

Initializer.create()
-> 실제 초기화 코드
```

App Startup은 초기화 코드를 정리하고 순서를 명확히 만드는 좋은 도구다. 다만 앱 시작 경로에 올라가는 만큼, 무겁거나 사용자 상태에 민감한 코드는 자동 초기화에서 제외하고 필요한 시점에 직접 실행하는 편이 더 낫다.

## 참고한 문서

- [App Startup - Android Developers](https://developer.android.com/topic/libraries/app-startup)
- [Initializer API reference - Android Developers](https://developer.android.com/reference/androidx/startup/Initializer)
- [Startup release notes - Android Developers](https://developer.android.com/jetpack/androidx/releases/startup)
