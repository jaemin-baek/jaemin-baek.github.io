---
title: "Hilt의 @Module, @Provides, @Qualifier 쉽게 이해하기"
date: "2026-05-28"
category: "Android"
group: "Android Basics"
series: "Android Basics"
tags: ["android", "hilt", "dagger", "dependency-injection", "di", "kotlin"]
description: "Android Hilt를 처음 볼 때 헷갈리는 @Module, @Provides, @Qualifier를 Base URL 주입 예제로 쉽게 정리합니다."
---

![Hilt의 @Module, @Provides, @Qualifier 쉽게 이해하기](/images/hilt-module-provides-qualifier-cover.png)

Android에서 Hilt를 처음 보면 `@Module`, `@Provides`, `@Qualifier` 같은 어노테이션이 한꺼번에 등장한다. 이름은 익숙하지 않고, 코드도 뭔가 "설정 파일"처럼 보여서 처음에는 멀게 느껴질 수 있다.

그런데 Hilt는 아주 작은 예제 하나만 제대로 따라가도 구조가 꽤 잘 보인다. 이 글에서는 가상의 날씨 앱 `WeatherApp`을 예시로, API Base URL을 Hilt로 주입하는 흐름을 정리해보려고 한다.

핵심 질문은 하나다.

```text
WeatherApi를 만들 때 필요한 baseUrl은 어디서 오는 걸까?
```

이 질문을 따라가면 `@Module`, `@Provides`, `@Qualifier`가 왜 필요한지 자연스럽게 연결된다.

## 먼저 DI는 무엇일까

DI는 Dependency Injection의 줄임말이고, 한국어로는 의존성 주입이라고 부른다.

말은 조금 딱딱하지만 생각은 단순하다.

```text
객체가 필요한 값을 직접 만들지 않고,
밖에서 넣어주는 방식
```

예를 들어 API 객체가 Base URL을 직접 알고 있다고 해보자.

```kotlin
class WeatherApi {
    private val baseUrl = "https://api.weather.example.com"
}
```

이 코드는 동작은 한다. 하지만 API 주소가 코드 안에 박혀 있다. 개발 서버, QA 서버, 운영 서버 주소를 바꾸고 싶을 때 `WeatherApi` 자체를 건드려야 한다.

DI를 사용하면 이렇게 바꿀 수 있다.

```kotlin
class WeatherApi(
    private val baseUrl: String
)
```

이제 `WeatherApi`는 URL이 어디서 오는지 모른다. 그저 생성자에서 받은 `baseUrl`을 사용할 뿐이다.

이 구조의 장점은 명확하다.

- API 주소를 환경별로 바꾸기 쉽다.
- 테스트할 때 가짜 URL이나 가짜 API를 넣기 쉽다.
- 객체를 만드는 코드와 사용하는 코드가 분리된다.

그럼 누가 `WeatherApi`에 `baseUrl`을 넣어줄까?

Android에서는 그 역할을 Hilt가 맡는다.

## BaseUrlModule 예제

먼저 Base URL을 제공하는 Hilt 모듈을 하나 만들어보자.

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object BaseUrlModule {

    @Provides
    @BaseUrl
    fun provideWeatherBaseUrl(): String {
        return BuildConfig.WEATHER_API_BASE_URL
    }

    @Provides
    @WebUrl
    fun provideWeatherWebUrl(): String {
        return BuildConfig.WEATHER_WEB_URL
    }
}
```

처음 보면 어노테이션이 많아서 복잡해 보이지만, 하나씩 보면 어렵지 않다.

| 어노테이션 | 의미 |
|---|---|
| `@Module` | Hilt에게 객체 생성 방법을 모아둔 곳이라고 알려준다. |
| `@InstallIn(SingletonComponent::class)` | 이 모듈을 앱 전체 범위에서 사용할 수 있게 설치한다. |
| `@Provides` | 이 함수가 어떤 값을 만들어서 제공하는지 알려준다. |
| `@BaseUrl`, `@WebUrl` | 같은 타입을 구분하기 위한 이름표다. |

비유하자면 `@Module`은 레시피 모음집이고, `@Provides`는 그 안에 들어 있는 레시피 하나다.

```text
BaseUrlModule
-> Hilt가 참고할 레시피 모음

provideWeatherBaseUrl()
-> String 값을 만드는 레시피 하나
```

Hilt는 이 코드를 보고 이렇게 기억한다.

```text
@BaseUrl이 붙은 String이 필요하면
provideWeatherBaseUrl() 함수를 호출하면 되겠구나.
```

## @Provides는 언제 필요할까

Hilt에서 우리가 만든 클래스는 보통 생성자에 `@Inject`를 붙이면 된다.

```kotlin
class WeatherRepository @Inject constructor(
    private val weatherApi: WeatherApi
)
```

이 코드는 Hilt에게 이렇게 말하는 것과 같다.

```text
WeatherRepository를 만들 때는
WeatherApi를 생성자로 넣어주면 돼.
```

하지만 모든 값을 이런 식으로 만들 수 있는 것은 아니다.

예를 들어 `String`, `Boolean`, `Int` 같은 기본 타입은 생성자에 `@Inject`를 붙일 수 없다. Retrofit, OkHttpClient처럼 외부 라이브러리에서 온 클래스도 우리가 소스코드를 직접 고쳐서 `@Inject constructor`를 붙일 수 없다.

이럴 때 `@Provides`를 사용한다.

```kotlin
@Provides
@BaseUrl
fun provideWeatherBaseUrl(): String {
    return BuildConfig.WEATHER_API_BASE_URL
}
```

이 함수는 Hilt에게 알려주는 설명서다.

```text
이 String은 이렇게 만들면 돼.
```

그래서 `@Provides` 함수는 "Hilt가 직접 만들기 어려운 값"을 우리가 대신 만들어서 알려주는 역할을 한다.

## @Qualifier는 왜 필요할까

초보자가 가장 자주 헷갈리는 부분은 `@Qualifier`다.

Base URL도 `String`이고, Web URL도 `String`이다.

```kotlin
fun provideWeatherBaseUrl(): String
fun provideWeatherWebUrl(): String
fun provideImageBaseUrl(): String
```

이 상태에서 어떤 클래스가 Hilt에게 이렇게 요청한다고 해보자.

```kotlin
class SomeClient @Inject constructor(
    private val url: String
)
```

Hilt 입장에서는 곤란해진다.

```text
String을 달라고?
근데 String 만드는 방법이 여러 개인데 어떤 걸 줘야 하지?
```

타입만으로는 구분할 수 없기 때문이다.

그래서 이름표가 필요하다. 이 이름표를 Hilt에서는 Qualifier라고 부른다.

```kotlin
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class BaseUrl

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class WebUrl
```

이제 Hilt는 그냥 `String`이 아니라 서로 다른 `String`으로 구분할 수 있다.

```text
@BaseUrl String
@WebUrl String
```

`@BaseUrl`은 "이 String은 API Base URL이다"라는 이름표다. `@WebUrl`은 "이 String은 웹 URL이다"라는 이름표다.

## 공급과 사용은 같은 이름표로 연결된다

중요한 점은 Qualifier가 공급하는 쪽과 사용하는 쪽에 똑같이 붙어야 한다는 것이다.

![Hilt 의존성 주입 흐름](/images/hilt-module-provides-qualifier-flow.png)

먼저 공급하는 쪽이다.

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object BaseUrlModule {

    @Provides
    @BaseUrl
    fun provideWeatherBaseUrl(): String {
        return BuildConfig.WEATHER_API_BASE_URL
    }
}
```

그리고 사용하는 쪽이다.

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object ApiModule {

    @Provides
    @Singleton
    fun provideWeatherApi(
        @BaseUrl baseUrl: String
    ): WeatherApi {
        return WeatherApi(baseUrl)
    }
}
```

여기서 `provideWeatherApi()` 함수는 `WeatherApi`를 만들기 위해 `baseUrl`이 필요하다.

```kotlin
fun provideWeatherApi(
    @BaseUrl baseUrl: String
): WeatherApi
```

이 코드는 Hilt에게 이렇게 요청하는 것과 같다.

```text
WeatherApi를 만들 건데,
@BaseUrl 이름표가 붙은 String을 하나 가져다줘.
```

그러면 Hilt는 앞에서 봤던 `BaseUrlModule`을 찾아간다.

```kotlin
@Provides
@BaseUrl
fun provideWeatherBaseUrl(): String
```

이름표가 같다. 타입도 같다. 그래서 Hilt는 이 함수의 결과를 `baseUrl` 파라미터에 넣어준다.

전체 흐름은 이렇게 볼 수 있다.

```text
BaseUrlModule
@Provides @BaseUrl
fun provideWeatherBaseUrl(): String
        |
        | Hilt가 기억한다
        v
ApiModule
fun provideWeatherApi(@BaseUrl baseUrl: String)
        |
        | WeatherApi 생성
        v
WeatherRepository
class WeatherRepository @Inject constructor(
    private val weatherApi: WeatherApi
)
```

Repository는 Base URL을 모른다. `WeatherApi`를 어떻게 만드는지도 모른다. 그 연결은 Hilt가 대신 처리한다.

## @InstallIn과 @Singleton은 다르다

여기서 한 가지를 더 구분하면 좋다.

```kotlin
@InstallIn(SingletonComponent::class)
```

이 코드는 모듈이 설치되는 범위를 정한다. `SingletonComponent`는 앱 전체 생명주기에 가까운 가장 넓은 Hilt 컴포넌트다.

하지만 이것만으로 `@Provides` 함수의 결과가 무조건 하나만 만들어진다는 뜻은 아니다.

객체를 하나만 만들어 재사용하고 싶다면 제공 함수에 `@Singleton`을 붙인다.

```kotlin
@Provides
@Singleton
fun provideWeatherApi(
    @BaseUrl baseUrl: String
): WeatherApi {
    return WeatherApi(baseUrl)
}
```

정리하면 이렇게 볼 수 있다.

```text
@InstallIn(SingletonComponent::class)
-> 이 레시피를 어디에 설치할지 정한다.

@Singleton
-> 이 레시피로 만든 결과를 하나만 재사용할지 정한다.
```

둘은 비슷해 보이지만 역할이 다르다.

## BuildConfig와 함께 쓰는 이유

Base URL은 보통 환경마다 달라진다.

```text
개발 환경: https://dev-api.weather.example.com
QA 환경: https://qa-api.weather.example.com
운영 환경: https://api.weather.example.com
```

이런 값을 코드 곳곳에 직접 쓰면 관리하기 어렵다.

```kotlin
private val baseUrl = "https://dev-api.weather.example.com"
```

대신 Gradle에서 `BuildConfig` 값으로 넣어두면 빌드 variant에 따라 다른 값을 사용할 수 있다.

```kotlin
android {
    buildTypes {
        debug {
            buildConfigField(
                "String",
                "WEATHER_API_BASE_URL",
                "\"https://dev-api.weather.example.com\""
            )
        }

        release {
            buildConfigField(
                "String",
                "WEATHER_API_BASE_URL",
                "\"https://api.weather.example.com\""
            )
        }
    }
}
```

그리고 Hilt 모듈에서는 그 값을 읽어서 제공한다.

```kotlin
@Provides
@BaseUrl
fun provideWeatherBaseUrl(): String {
    return BuildConfig.WEATHER_API_BASE_URL
}
```

이렇게 하면 앱의 나머지 코드는 환경을 신경 쓰지 않아도 된다.

```kotlin
class WeatherApi(
    private val baseUrl: String
)
```

`WeatherApi`는 지금 개발 서버를 바라보는지, 운영 서버를 바라보는지 몰라도 된다. 그 결정은 빌드 설정과 Hilt 모듈 쪽에서 끝난다.

## 자주 헷갈리는 실수

### 사용하는 쪽에 Qualifier를 빼먹는 경우

공급하는 쪽에는 `@BaseUrl`을 붙였는데 사용하는 쪽에 빼먹으면 연결이 되지 않는다.

```kotlin
@Provides
@BaseUrl
fun provideWeatherBaseUrl(): String {
    return BuildConfig.WEATHER_API_BASE_URL
}
```

```kotlin
fun provideWeatherApi(
    baseUrl: String
): WeatherApi
```

이 경우 Hilt는 `@BaseUrl String`이 아니라 그냥 `String`을 찾는다. 그래서 원하는 바인딩을 찾지 못하거나, 다른 `String` 바인딩과 충돌할 수 있다.

사용하는 쪽에도 같은 이름표를 붙여야 한다.

```kotlin
fun provideWeatherApi(
    @BaseUrl baseUrl: String
): WeatherApi
```

### 같은 타입을 여러 개 제공하면서 이름표를 붙이지 않는 경우

아래처럼 `String`을 여러 개 제공하면 Hilt는 어느 것을 사용해야 할지 알 수 없다.

```kotlin
@Provides
fun provideBaseUrl(): String = "https://api.weather.example.com"

@Provides
fun provideWebUrl(): String = "https://weather.example.com"
```

이럴 때는 Qualifier를 붙여야 한다.

```kotlin
@Provides
@BaseUrl
fun provideBaseUrl(): String = "https://api.weather.example.com"

@Provides
@WebUrl
fun provideWebUrl(): String = "https://weather.example.com"
```

### @Module만 만들고 @Provides를 빼먹는 경우

`@Module`은 레시피 모음집이라는 표시다. 실제 레시피는 `@Provides` 함수다.

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object BaseUrlModule {
    fun provideWeatherBaseUrl(): String {
        return BuildConfig.WEATHER_API_BASE_URL
    }
}
```

이렇게 쓰면 Hilt는 이 함수를 제공 함수로 보지 않는다.

```kotlin
@Provides
fun provideWeatherBaseUrl(): String {
    return BuildConfig.WEATHER_API_BASE_URL
}
```

Hilt에게 알려주고 싶은 값이라면 `@Provides`가 필요하다.

## 한 문장으로 정리하기

`BaseUrlModule` 같은 Hilt 모듈은 작지만 Hilt의 핵심 개념을 잘 보여준다.

```text
@Module
-> Hilt가 참고할 객체 생성 방법 모음

@Provides
-> 실제 값을 만들어주는 함수

@Qualifier
-> 같은 타입을 구분하기 위한 이름표

@BaseUrl baseUrl: String
-> @BaseUrl 이름표가 붙은 String을 요청한다는 뜻
```

결국 흐름은 단순하다.

```text
공급하는 쪽에서 이름표를 붙여 값을 제공한다.
사용하는 쪽에서 같은 이름표로 값을 요청한다.
Hilt가 둘을 찾아서 자동으로 연결한다.
```

Hilt를 처음 공부할 때는 거대한 앱 구조부터 보려고 하면 어렵다. 오히려 `String` 하나가 어디서 제공되고 어디로 들어가는지 따라가는 편이 더 쉽다.

Base URL 하나를 따라가다 보면 Hilt가 하는 일이 보인다.

```text
객체를 직접 만들지 않아도 되게,
필요한 값을 필요한 곳에 대신 넣어주는 것
```

그게 Hilt의 가장 기본적인 역할이다.
