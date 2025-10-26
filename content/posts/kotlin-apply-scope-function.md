---
title: "코틀린 apply 문법 이해하기"
date: "2025-10-26"
category: "Kotlin"
group: "Kotlin Basics"
series: "Kotlin Basics"
tags: ["kotlin", "apply", "scope function", "android", "lambda"]
description: "Kotlin apply가 왜 객체 설정 코드에서 자주 쓰이는지, this와 반환값을 기준으로 Android 예시와 함께 정리합니다."
---

![코틀린 apply 문법 이해하기](/images/kotlin-apply-cover.png)

Kotlin 코드를 읽다 보면 이런 모양을 자주 만난다.

```kotlin
return ComposeView(requireContext()).apply {
    id = R.id.search_compose_view
    setViewCompositionStrategy(
        ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
    )
    setContent {
        SearchScreen()
    }
}
```

처음 보면 헷갈린다.

```text
apply는 함수인 것 같은데 왜 객체 뒤에 붙어 있을까?
블록 안에서 id는 누구의 id일까?
setContent가 마지막 줄인데 return 값은 setContent 결과일까?
```

나도 `apply`를 처음 볼 때 가장 헷갈렸던 부분은 "블록 안에서 무엇을 가리키는지"와 "무엇이 반환되는지"였다.

`apply`를 한 줄로 말하면 이렇다.

```text
apply는 객체를 만든 뒤,
그 객체를 this로 설정하고,
설정이 끝난 같은 객체를 다시 반환하는 함수다.
```

중요한 단어는 세 가지다.

```text
객체 자신
초기 설정
같은 객체 반환
```

## 가장 작은 예시

먼저 평범한 객체 생성 코드를 보자.

```kotlin
data class User(
    var name: String = "",
    var age: Int = 0,
)
```

`apply` 없이 쓰면 보통 이렇게 된다.

```kotlin
val user = User()
user.name = "철수"
user.age = 20
```

이 코드는 어렵지 않다. 객체를 만들고, 그 객체의 프로퍼티를 하나씩 설정한다.

같은 코드를 `apply`로 쓰면 이렇게 된다.

```kotlin
val user = User().apply {
    name = "철수"
    age = 20
}
```

여기서 `apply` 블록 안의 `name`, `age`는 사실 이렇게 읽을 수 있다.

```kotlin
val user = User().apply {
    this.name = "철수"
    this.age = 20
}
```

즉 `apply` 블록 안에서 `this`는 `User()`로 만든 객체다.

그래서 아래 두 코드는 같은 방향의 코드다.

```kotlin
val user = User()
user.name = "철수"
user.age = 20
```

```kotlin
val user = User().apply {
    name = "철수"
    age = 20
}
```

차이는 설정 코드가 객체 생성 흐름 안에 들어갔다는 점이다.

```text
객체를 만들고
그 객체를 바로 설정하고
설정된 객체를 변수에 담는다
```

## apply의 반환값

`apply`에서 꼭 잡아야 하는 부분은 반환값이다.

![apply의 반환 흐름](/images/kotlin-apply-return-flow-handdrawn.png)

아래 코드를 보자.

```kotlin
val user = User().apply {
    name = "철수"
    age = 20
}
```

이때 `user`에 들어가는 것은 무엇일까?

```text
name = "철수"의 결과?
age = 20의 결과?
apply 블록의 마지막 줄?
```

아니다.

`apply`의 반환값은 항상 **수신 객체**, 즉 `apply`를 호출한 원래 객체다.

```text
User().apply { ... }의 결과는 User다.
```

그래서 아래 코드에서:

```kotlin
val result = User().apply {
    name = "철수"
    age = 20
}
```

`result`의 타입은 `User`다.

```kotlin
val result: User = User().apply {
    name = "철수"
    age = 20
}
```

블록 안의 마지막 줄이 `age = 20`이어도 `result`가 `20`이 되는 것이 아니다. `Unit`이 되는 것도 아니다. 설정이 끝난 `User` 객체가 그대로 돌아온다.

이게 `apply`를 이해하는 가장 중요한 기준이다.

```text
apply 블록은 객체를 설정하는 공간이다.
apply 전체 표현식의 결과는 그 객체 자신이다.
```

## 왜 this를 생략할 수 있을까

`apply`의 실제 형태를 단순하게 보면 이런 느낌이다.

```kotlin
inline fun <T> T.apply(block: T.() -> Unit): T
```

여기서 눈여겨볼 부분은 `T.() -> Unit`이다.

이건 일반 람다인 `(T) -> Unit`과 조금 다르다.

```kotlin
// 일반 람다
(T) -> Unit

// 수신 객체가 있는 람다
T.() -> Unit
```

`T.() -> Unit`은 람다 안에서 `T` 객체를 `this`로 사용할 수 있다는 뜻이다.

그래서 `User().apply { ... }` 안에서는 `User`가 `this`가 된다.

```kotlin
User().apply {
    this.name = "철수"
    this.age = 20
}
```

Kotlin에서는 `this.`를 생략할 수 있다.

```kotlin
User().apply {
    name = "철수"
    age = 20
}
```

그래서 처음에는 마치 `name`이라는 지역 변수가 갑자기 나온 것처럼 보인다. 하지만 실제로는 `this.name`이다.

이 감각이 잡히면 `apply` 코드가 훨씬 덜 낯설어진다.

## Android에서 자주 보이는 이유

Android 코드에서는 객체를 만든 뒤 바로 설정해야 하는 일이 많다.

![Android에서 자주 보이는 apply](/images/kotlin-apply-android-examples-handdrawn.png)

예를 들어 `ImageView`를 만든 뒤 `scaleType`을 설정한다고 해보자.

```kotlin
val imageView = ImageView(context)
imageView.scaleType = ImageView.ScaleType.CENTER_CROP
```

`apply`를 사용하면 객체 생성과 설정을 한 덩어리로 묶을 수 있다.

```kotlin
val imageView = ImageView(context).apply {
    scaleType = ImageView.ScaleType.CENTER_CROP
}
```

이 코드는 이렇게 읽으면 된다.

```text
ImageView를 만들고
그 ImageView의 scaleType을 설정한 뒤
설정된 ImageView를 imageView에 담는다
```

`ComposeView`를 만들 때도 비슷하다.

```kotlin
return ComposeView(requireContext()).apply {
    id = R.id.search_compose_view
    setViewCompositionStrategy(
        ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
    )
    setContent {
        SearchScreen()
    }
}
```

여기서 중요한 질문은 이것이다.

```text
return 되는 것은 setContent의 결과일까?
```

아니다.

`apply` 전체의 결과는 `ComposeView`다.

```text
ComposeView(...).apply { ... } -> ComposeView
```

그래서 `onCreateView()`에서 바로 `return`할 수 있다.

`setContent { ... }`는 `ComposeView`를 설정하는 코드일 뿐이다. 마지막 줄에 있어도 반환값이 되지 않는다.

## Builder 패턴과 apply

`apply`는 Builder와도 잘 어울린다.

예를 들어 네트워크 클라이언트를 만든다고 해보자.

```kotlin
val client = OkHttpClient.Builder()
    .connectTimeout(15, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .build()
```

여기까지는 일반적인 체이닝이다.

그런데 특정 조건에서만 옵션을 추가하고 싶다면 중간에 `apply`를 넣을 수 있다.

```kotlin
val client = OkHttpClient.Builder()
    .connectTimeout(15, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .apply {
        if (BuildConfig.DEBUG) {
            addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BODY
                    redactHeader("Authorization")
                }
            )
        }
    }
    .build()
```

이 코드에서 바깥 `apply`의 `this`는 `OkHttpClient.Builder`다.

```kotlin
OkHttpClient.Builder().apply {
    // this == OkHttpClient.Builder
}
```

그래서 `addInterceptor(...)`를 바로 호출할 수 있다.

안쪽 `apply`의 `this`는 `HttpLoggingInterceptor`다.

```kotlin
HttpLoggingInterceptor().apply {
    // this == HttpLoggingInterceptor
    level = HttpLoggingInterceptor.Level.BODY
    redactHeader("Authorization")
}
```

이렇게 `apply`를 쓰면 "객체를 만들고 설정한 뒤 다시 그 객체를 넘긴다"는 흐름이 자연스럽다.

```text
Builder를 설정하고 그대로 Builder를 반환
Interceptor를 설정하고 그대로 Interceptor를 반환
```

그 다음 `.build()`가 호출된다.

```text
Builder().apply { 설정 } -> Builder
Builder.build() -> OkHttpClient
```

## 파일을 읽어 Properties를 준비하는 예시

`apply`는 설정 파일을 읽어서 객체를 준비할 때도 자주 보인다.

```kotlin
val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) {
        file.inputStream().use(::load)
    }
}
```

여기서 `Properties()`가 먼저 만들어진다.

`apply` 블록 안에서는 그 `Properties` 객체가 `this`다.

```kotlin
Properties().apply {
    this.load(inputStream)
}
```

그런데 `load`는 `this.load`처럼 호출할 수 있으므로, 함수 참조로 짧게 쓸 수도 있다.

```kotlin
file.inputStream().use(::load)
```

이 코드는 처음 보면 어렵다. 하지만 큰 흐름은 단순하다.

```text
Properties 객체를 만든다.
파일이 있으면 그 객체에 내용을 load한다.
설정이 끝난 Properties 객체를 localProperties에 담는다.
```

여기서도 `apply`의 역할은 "만든 객체를 설정하고 그대로 반환"이다.

## 테스트 객체를 준비할 때도 쓴다

테스트에서는 fake 객체를 만든 뒤 테스트마다 동작을 조금씩 바꿔야 할 때가 있다.

```kotlin
val repository = FakeSearchRepository().apply {
    handler = { request ->
        SearchResult(
            page = request.page,
            items = listOf(item("item-${request.page}")),
            isEnd = false,
        )
    }
}
```

`FakeSearchRepository()`를 만든 뒤, 이번 테스트에서 사용할 `handler`를 바로 설정한다.

`apply` 없이 쓰면 이렇게 된다.

```kotlin
val repository = FakeSearchRepository()
repository.handler = { request ->
    SearchResult(
        page = request.page,
        items = listOf(item("item-${request.page}")),
        isEnd = false,
    )
}
```

둘 다 가능하다.

하지만 `apply`를 쓰면 이 fake 객체가 어떤 상태로 준비되는지가 생성 위치에서 바로 보인다.

```text
FakeSearchRepository를 만들고
handler를 설정한 뒤
그 repository를 테스트에 사용한다
```

테스트 준비 코드에서는 이런 식의 `apply`가 꽤 읽기 좋다.

## SharedPreferences.Editor와 apply

`apply`는 객체를 설정한 뒤 같은 객체를 반환해야 하는 API를 직접 만들 때도 유용하다.

예를 들어 `SharedPreferences.Editor`는 보통 체이닝이 가능하다.

```kotlin
preferences.edit()
    .putString("name", "철수")
    .putBoolean("isActive", true)
    .apply()
```

이 체이닝이 가능하려면 `putString`, `putBoolean`이 다시 `Editor`를 반환해야 한다.

테스트용 Editor를 직접 만든다면 이런 식으로 구현할 수 있다.

```kotlin
override fun putString(
    key: String?,
    value: String?,
): SharedPreferences.Editor = apply {
    stage(key, value)
}
```

여기서 `apply`의 수신 객체는 `Editor` 자신이다.

```text
stage(key, value)를 실행한다.
그리고 같은 Editor를 반환한다.
```

그래서 호출자는 계속 체이닝할 수 있다.

```kotlin
editor
    .putString("name", "철수")
    .putBoolean("isActive", true)
```

이 예시는 `apply`의 반환 규칙을 잘 보여준다.

```text
블록 안에서 어떤 작업을 하든
apply는 같은 객체를 반환한다.
```

## apply와 헷갈리는 스코프 함수

Kotlin에는 `apply` 말고도 비슷한 스코프 함수가 있다.

![apply와 헷갈리는 스코프 함수](/images/kotlin-apply-scope-functions-handdrawn.png)

처음에는 이름보다 두 가지 기준을 먼저 보면 된다.

```text
블록 안에서 객체를 this로 쓰는가, it으로 쓰는가?
블록 결과를 반환하는가, 원래 객체를 반환하는가?
```

간단히 정리하면 이렇다.

| 함수 | 블록 안 객체 이름 | 반환값 | 주로 쓰는 상황 |
|---|---|---|---|
| `apply` | `this` | 원래 객체 | 객체 설정 |
| `also` | `it` | 원래 객체 | 로그, 부가 작업 |
| `let` | `it` | 람다 결과 | null 체크 후 변환 |
| `run` | `this` | 람다 결과 | 객체를 사용해 값 계산 |

`apply`와 `also`는 둘 다 원래 객체를 반환한다.

```kotlin
val user = User().apply {
    name = "철수"
}
```

```kotlin
val user = User().also {
    println("created: $it")
}
```

차이는 블록 안에서 객체를 부르는 이름이다.

`apply`는 `this`다. 그래서 프로퍼티 설정이 자연스럽다.

```kotlin
val user = User().apply {
    name = "철수"
    age = 20
}
```

`also`는 `it`이다. 그래서 객체를 그대로 두고 로그를 찍거나 부가 작업을 할 때 읽기 좋다.

```kotlin
val user = createUser()
    .also { user ->
        logger.debug("created user=$user")
    }
```

`let`과 `run`은 원래 객체가 아니라 람다의 마지막 결과를 반환한다.

```kotlin
val nameLength = user.let {
    it.name.length
}
```

```kotlin
val label = user.run {
    "$name ($age)"
}
```

그래서 기준은 꽤 단순하다.

```text
객체를 설정하고 그 객체를 계속 쓸 거면 apply
객체는 그대로 두고 부가 작업을 할 거면 also
다른 값으로 바꿀 거면 let 또는 run
```

## 헷갈리는 지점 1. 마지막 줄이 반환값이라고 착각하기

`apply`를 처음 보면 블록이 있으니 마지막 줄이 반환값처럼 느껴진다.

```kotlin
val result = User().apply {
    name = "철수"
    age = 20
}
```

하지만 `result`는 `age`도 아니고 `20`도 아니다.

```kotlin
val result: User = User().apply {
    name = "철수"
    age = 20
}
```

`apply`는 람다의 결과를 버리고 원래 객체를 반환한다.

다른 값을 만들고 싶다면 `apply`가 아니라 `run`이나 `let`이 더 맞다.

```kotlin
val label = User(name = "철수", age = 20).run {
    "$name ($age)"
}
```

이 코드에서 `label`은 `String`이다.

```text
apply -> 원래 객체 반환
run   -> 람다 결과 반환
```

## 헷갈리는 지점 2. this가 누구인지 놓치기

`apply` 안에서 `this`는 수신 객체다.

```kotlin
val textView = TextView(context).apply {
    text = "Hello"
    textSize = 16f
}
```

여기서 `this`는 `TextView`다.

그런데 `apply`가 중첩되면 헷갈릴 수 있다.

```kotlin
val container = LinearLayout(context).apply {
    orientation = LinearLayout.VERTICAL

    val titleView = TextView(context).apply {
        text = "Title"
        textSize = 18f
    }

    addView(titleView)
}
```

바깥 `apply`의 `this`는 `LinearLayout`이다.

```kotlin
LinearLayout(context).apply {
    // this == LinearLayout
}
```

안쪽 `apply`의 `this`는 `TextView`다.

```kotlin
TextView(context).apply {
    // this == TextView
}
```

다행히 위 예시는 크게 어렵지 않다. 안쪽 `TextView` 설정을 끝낸 뒤, 바깥 블록에서 `addView(titleView)`를 호출하기 때문이다.

하지만 중첩이 깊어지면 `this`가 누구인지 바로 보이지 않는다. 그럴 때는 `apply`를 줄이거나 중간 변수를 두는 편이 낫다.

```kotlin
val titleView = TextView(context).apply {
    text = "Title"
    textSize = 18f
}

val container = LinearLayout(context).apply {
    orientation = LinearLayout.VERTICAL
    addView(titleView)
}
```

조금 길어져도 읽는 사람 입장에서는 훨씬 편하다.

## 헷갈리는 지점 3. 모든 체이닝에 apply를 붙이기

`apply`가 편해지면 모든 곳에 붙이고 싶어진다.

```kotlin
val name = user.apply {
    println(name)
}.name
```

이런 코드는 굳이 `apply`가 필요하지 않다.

로그가 목적이라면 `also`가 더 자연스럽다.

```kotlin
val name = user
    .also { println(it.name) }
    .name
```

값 변환이 목적이라면 `let`이 더 자연스럽다.

```kotlin
val name = user.let {
    it.name
}
```

`apply`는 아무 데나 쓰는 예쁜 문법이 아니다. 객체 설정을 한 블록 안에 모으고, 그 객체를 그대로 이어서 사용하고 싶을 때 가장 잘 맞는다.

## 언제 apply를 쓰면 좋을까

내 기준으로는 아래 조건이 맞으면 `apply`가 잘 어울린다.

```text
객체를 새로 만든다.
그 객체의 프로퍼티나 메서드로 초기 설정을 한다.
설정된 같은 객체를 변수에 담거나 바로 반환한다.
```

예시는 이런 코드들이다.

```kotlin
val intent = Intent(context, DetailActivity::class.java).apply {
    putExtra("id", itemId)
    putExtra("title", title)
}
```

```kotlin
val paint = Paint().apply {
    color = Color.RED
    strokeWidth = 4f
    isAntiAlias = true
}
```

```kotlin
val imageView = ImageView(context).apply {
    scaleType = ImageView.ScaleType.CENTER_CROP
}
```

반대로 아래 상황에서는 다시 생각해본다.

```text
다른 값으로 변환하려는가?
로그만 찍으려는가?
블록이 너무 길어지는가?
this가 여러 개 겹치는가?
```

이 경우에는 `let`, `run`, `also`, 중간 변수, 별도 함수가 더 읽기 좋을 수 있다.

## 정리

`apply`는 객체를 설정할 때 쓰기 좋은 Kotlin 스코프 함수다.

핵심은 이 문장 하나로 정리된다.

```text
apply 블록 안의 this는 원래 객체이고,
apply의 반환값도 원래 객체다.
```

그래서 아래 코드는:

```kotlin
val user = User().apply {
    name = "철수"
    age = 20
}
```

이렇게 읽으면 된다.

```text
User 객체를 만들고
그 User를 this로 삼아 name과 age를 설정하고
설정된 User를 user에 담는다
```

Android 코드에서 `apply`가 자주 보이는 이유도 여기에 있다. `View`, `Intent`, `Paint`, `Builder`, 테스트 fake 객체처럼 "만든 직후 설정해야 하는 객체"가 많기 때문이다.

`apply`를 읽을 때는 두 질문만 기억하면 된다.

```text
이 블록 안의 this는 누구인가?
이 apply 전체는 무엇을 반환하는가?
```

답은 보통 이렇다.

```text
this는 apply 앞의 객체다.
반환값도 apply 앞의 객체다.
```

이 기준만 잡히면 `ComposeView(...).apply { ... }`, `ImageView(...).apply { ... }`, `Builder().apply { ... }.build()` 같은 코드가 훨씬 자연스럽게 읽힌다.

## 함께 읽기

- [[kotlin-lambda-function|코틀린 람다함수]]
- [[kotlin-data-class-syntax|코틀린 data class 문법]]
- [[kotlin-collection-map-function|코틀린 컬렉션 함수 map 이해하기]]
