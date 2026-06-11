---
title: "DataStore와 SharedPreferences 차이 이해하기"
date: "2026-06-12"
category: "Android"
group: "Android Storage"
series: "Android Storage"
tags: ["android", "datastore", "sharedpreferences", "coroutine", "flow", "proto-datastore", "preferences-datastore"]
description: "Android DataStore가 무엇인지, SharedPreferences와 어떤 차이가 있는지, coroutine과 Flow 기반 저장소라는 말이 어떤 의미인지 정리합니다."
---

![DataStore와 SharedPreferences 차이 이해하기](/images/android-datastore-basics-cover.png)

Android에서 작은 값을 저장할 때 가장 먼저 떠올리는 API는 오래전부터 `SharedPreferences`였다. 다크 모드 여부, 마지막 선택 탭, 간단한 토큰 상태, 사용자 설정처럼 "키 하나에 값 하나"를 저장하기 좋았기 때문이다.

그런데 요즘 Android 코드에서는 같은 위치에 `DataStore`가 자주 등장한다.

처음 접하면 이름이 꽤 포괄적이라, 어디까지를 DataStore라고 봐야 하는지 헷갈릴 수 있다.

```text
DataStore는 DB인가?
SharedPreferences와 같은 건가?
Room 대신 쓰는 건가?
민감 데이터를 안전하게 저장해주는 보안 저장소인가?
```

나는 DataStore를 이렇게 잡으면 덜 헷갈린다고 본다.

```text
DataStore는 작은 로컬 데이터를
coroutine과 Flow 기반으로
비동기적이고 일관성 있게 읽고 쓰기 위한 Jetpack 저장소다.
```

여기서 중요한 말은 두 가지다.

```text
작은 로컬 데이터
비동기/Flow 기반
```

DataStore는 모든 저장 문제를 해결하는 만능 DB가 아니다. 하지만 `SharedPreferences`로 처리하던 작은 설정값이나 간단한 구조화 데이터를 더 안전한 흐름으로 다루기에 좋다.

## 먼저 저장소의 역할을 나눠보기

DataStore를 이해할 때는 저장소와 보안 계층을 먼저 나누는 게 좋다.

```text
DataStore
= 데이터를 저장하는 계층

Tink AEAD
= 데이터를 암호화하고 위변조를 검증하는 계층

Android Keystore
= 암호화 키를 보호하는 계층
```

즉 DataStore는 그 자체로 암호화 저장소가 아니다. DataStore에 넣는 값이 평문이면 평문이 저장되고, 암호문이면 암호문이 저장된다.

민감한 값을 다룬다면 보통 이런 흐름이 더 자연스럽다.

```text
원문 데이터
-> Tink AEAD로 암호화
-> 암호문을 DataStore에 저장
```

여기서 `ciphertext`라는 말을 쓰기도 하는데, 한국어로는 그냥 **암호문**이라고 말하면 된다. 영어로 읽으면 "사이퍼텍스트"에 가깝다.

```text
plaintext
= 평문

ciphertext
= 암호문
```

이 구분이 중요하다. DataStore를 선택했다는 말은 "암호화를 DataStore가 해준다"는 뜻이 아니다. DataStore는 암호문과 그에 필요한 작은 메타데이터를 저장하는 역할에 가깝다.

## SharedPreferences는 어떤 저장소였나

`SharedPreferences`는 Android에서 아주 오래 쓰인 key-value 저장소다.

사용 방식은 단순하다.

```kotlin
val prefs = context.getSharedPreferences(
    "settings",
    Context.MODE_PRIVATE
)

val enabled = prefs.getBoolean("pin_enabled", false)

prefs.edit()
    .putBoolean("pin_enabled", true)
    .apply()
```

장점은 분명하다.

- 사용법이 쉽다.
- 작은 설정값을 빠르게 저장하기 좋다.
- 오래된 Android 코드와 라이브러리에서 흔히 볼 수 있다.
- key-value 형태라 단순한 값에는 부담이 적다.

하지만 앱 구조가 커질수록 아쉬운 점도 보인다.

```text
읽기 API가 동기 방식이다.
값 변경을 Flow로 자연스럽게 관찰하기 어렵다.
여러 값을 함께 갱신할 때 일관성 있는 흐름을 만들기 번거롭다.
타입이 복잡해지면 key 관리와 변환 로직이 쉽게 흩어진다.
오류 처리나 데이터 손상 처리 흐름이 제한적이다.
```

예를 들어 아래 코드는 겉으로는 아주 단순하다.

```kotlin
val enabled = prefs.getBoolean("pin_enabled", false)
```

하지만 호출하는 쪽에서는 "그냥 메모리에서 읽는 값"처럼 보인다. 실제 구현과 시점에 따라 파일 I/O와 엮일 수 있고, 이런 코드를 메인 스레드 곳곳에 흩뿌리면 저장소 접근 흐름을 관리하기 어려워진다.

물론 SharedPreferences가 항상 나쁘다는 뜻은 아니다. 이미 안정적으로 동작하는 오래된 설정값, 아주 단순한 레거시 코드, 마이그레이션 비용이 더 큰 영역에서는 그대로 유지할 수도 있다.

다만 새로 만드는 코드라면 DataStore를 먼저 검토하는 편이 자연스럽다.

## DataStore는 무엇이 다른가

DataStore는 Jetpack에서 제공하는 저장소 라이브러리다. 공식 문서에서는 key-value 쌍이나 Protocol Buffers 기반 typed object를 저장할 수 있는 솔루션으로 설명한다.

DataStore의 큰 특징은 이렇다.

```text
Kotlin coroutine 기반
Flow 기반 읽기
transactional update
Preferences DataStore와 Proto DataStore 제공
SharedPreferences에서 마이그레이션 지원
```

그림으로 보면 SharedPreferences와 DataStore의 차이는 이런 느낌이다.

![SharedPreferences와 DataStore 차이](/images/android-datastore-sharedpreferences-handdrawn.png)

SharedPreferences는 보통 "필요한 순간 값을 바로 꺼내는" 식으로 쓰기 쉽다.

```kotlin
val value = prefs.getString("key", "")
```

DataStore는 값을 `Flow`로 읽는다.

```kotlin
val enabledFlow: Flow<Boolean> =
    context.settingsDataStore.data
        .map { preferences ->
            preferences[PIN_ENABLED] ?: false
        }
```

이 말은 단순히 문법이 달라졌다는 뜻이 아니다. 저장된 값이 바뀌면 Flow를 통해 새 값이 흘러오고, ViewModel이나 UI state와 연결하기 좋아진다는 뜻이다.

```text
DataStore 값 변경
-> Flow가 새 값 emit
-> ViewModel state 갱신
-> 화면이 새 상태를 그림
```

Compose나 MVI 구조에서는 이 흐름이 꽤 자연스럽다. 화면은 저장소를 직접 뒤지는 대신 ViewModel의 상태를 관찰하고, ViewModel은 DataStore의 Flow를 앱 상태로 변환한다.

## coroutine 기반이라는 말

"DataStore는 coroutine 기반이라 좋다"는 말을 자주 듣지만, 처음에는 너무 추상적으로 들릴 수 있다.

쉽게 말하면 저장소 읽기/쓰기를 메인 스레드에서 동기적으로 붙잡고 처리하기보다, `suspend` 함수와 `Flow`를 통해 비동기 흐름으로 다루기 좋다는 뜻이다.

Preferences DataStore 예시는 이렇게 생겼다.

```kotlin
private val Context.settingsDataStore by preferencesDataStore(
    name = "settings"
)

private val PIN_ENABLED = booleanPreferencesKey("pin_enabled")

val pinEnabledFlow: Flow<Boolean> =
    context.settingsDataStore.data
        .map { preferences ->
            preferences[PIN_ENABLED] ?: false
        }

suspend fun setPinEnabled(enabled: Boolean) {
    context.settingsDataStore.edit { preferences ->
        preferences[PIN_ENABLED] = enabled
    }
}
```

읽기는 `Flow`다.

```text
dataStore.data
= 저장된 데이터의 현재 값과 이후 변경을 흘려보내는 스트림
```

쓰기는 `suspend` 함수 안에서 처리한다.

```text
dataStore.edit { ... }
= 저장소를 안전하게 갱신하는 비동기 작업
```

그래서 ViewModel에서는 이런 식으로 이어붙일 수 있다.

```kotlin
val uiState: StateFlow<SettingsUiState> =
    settingsRepository.pinEnabledFlow
        .map { enabled ->
            SettingsUiState(pinEnabled = enabled)
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = SettingsUiState()
        )
```

이 구조에서는 저장소 값이 바뀌면 UI state도 따라 바뀐다. 직접 "다시 읽어와라"라고 명령하는 코드가 줄어든다.

## Flow로 관찰한다는 말

Flow를 저장소에 붙이면 "현재 값을 한 번 읽는다"와 "값 변화를 계속 관찰한다"가 자연스럽게 이어진다.

![DataStore Flow와 updateData 흐름](/images/android-datastore-flow-update-handdrawn.png)

예를 들어 앱 설정 화면에 생체 인증 사용 여부가 있다고 해보자.

```text
처음 화면 진입
-> DataStore에서 현재 설정값 emit
-> UI가 토글 상태 표시

사용자가 토글 변경
-> DataStore에 새 값 저장
-> Flow가 새 값 emit
-> UI state 갱신
```

이 흐름은 단순하지만 중요하다. 저장소 값이 앱 상태의 source of truth에 가까워질 수 있기 때문이다.

물론 모든 값을 DataStore Flow로 직접 UI에 연결해야 한다는 뜻은 아니다. 네트워크 데이터, 화면 임시 상태, 큰 목록 데이터까지 DataStore에 넣으면 오히려 구조가 이상해진다.

DataStore에 어울리는 값은 보통 이런 쪽이다.

- 사용자 설정
- 마지막 선택값
- 기능 활성화 여부
- 작은 인증/보안 설정 메타데이터
- 암호화된 작은 로컬 데이터
- 앱 시작 시 필요한 작은 구성값

반대로 이런 값은 조심해야 한다.

- 큰 목록
- 이미지나 파일 본문
- 복잡한 검색이 필요한 데이터
- 여러 테이블 관계가 있는 데이터
- 부분 업데이트가 자주 필요한 대용량 데이터

이런 경우에는 Room이나 파일 저장소, 서버 동기화 구조가 더 맞다.

## Preferences DataStore와 Proto DataStore

DataStore에는 크게 두 종류가 있다.

```text
Preferences DataStore
= schema 없는 key-value 저장소

Proto DataStore
= Protocol Buffers schema 기반 typed object 저장소
```

Preferences DataStore는 SharedPreferences와 감각이 비슷하다. key를 만들고 값을 넣는다.

```kotlin
private val THEME = stringPreferencesKey("theme")

val themeFlow =
    context.settingsDataStore.data
        .map { preferences ->
            preferences[THEME] ?: "system"
        }
```

간단한 설정값에는 이 방식이 충분히 편하다.

하지만 저장할 값이 여러 필드를 가진 하나의 모델에 가깝다면 Proto DataStore가 더 낫다.

예를 들어 아래처럼 구조가 있는 설정을 생각해보자.

```text
SecuritySettings
- pinEnabled
- biometricEnabled
- lastChangedAt
```

Preferences DataStore로도 저장할 수는 있다.

```text
pin_enabled = true
biometric_enabled = false
last_changed_at = 123456
```

하지만 key가 늘어나고, 함께 바뀌어야 하는 값이 생기면 모델의 경계가 흐려진다.

Proto DataStore는 `.proto` schema로 타입을 먼저 정의한다.

```proto
syntax = "proto3";

message SecuritySettings {
  bool pin_enabled = 1;
  bool biometric_enabled = 2;
  int64 last_changed_at = 3;
}
```

그러면 Kotlin 코드에서는 하나의 typed object처럼 다룰 수 있다.

```kotlin
val settingsFlow: Flow<SecuritySettings> =
    securitySettingsDataStore.data

suspend fun setPinEnabled(enabled: Boolean) {
    securitySettingsDataStore.updateData { current ->
        current.toBuilder()
            .setPinEnabled(enabled)
            .build()
    }
}
```

정리하면 이렇다.

```text
값 몇 개를 간단히 저장한다
-> Preferences DataStore

하나의 구조화된 모델을 저장한다
-> Proto DataStore

관계형 데이터와 쿼리가 필요하다
-> Room
```

## updateData가 중요한 이유

Proto DataStore에서는 `updateData`를 자주 보게 된다.

```kotlin
suspend fun saveSecret(
    id: String,
    ciphertext: ByteArray
) {
    secretDataStore.updateData { current ->
        current.toBuilder()
            .putEntries(
                id,
                SecretEntry.newBuilder()
                    .setCiphertext(ciphertext.toByteString())
                    .build()
            )
            .build()
    }
}
```

코드는 예시다. 핵심은 `current`를 읽고, 새 객체를 만들어, 한 번의 업데이트로 저장한다는 점이다.

이런 방식은 여러 곳에서 동시에 값을 바꾸는 상황을 다룰 때 중요하다. 저장소 갱신 로직을 DataStore가 순서 있게 처리하고, Flow 구독자는 갱신된 결과를 다시 받는다.

SharedPreferences에서도 여러 값을 한 번에 `edit()`할 수 있다.

```kotlin
prefs.edit()
    .putBoolean("pin_enabled", true)
    .putLong("last_changed_at", now)
    .apply()
```

하지만 DataStore는 처음부터 coroutine/Flow 흐름과 transactional update를 중심으로 설계되어 있다. 그래서 Repository, ViewModel, UI state로 이어지는 현대 Android 앱 구조에 더 잘 맞는다.

## SharedPreferences보다 항상 DataStore가 좋은가

항상 그렇지는 않다.

SharedPreferences가 이미 잘 동작하고 있고, 값이 아주 단순하며, 마이그레이션이 오히려 위험하다면 그대로 둘 수도 있다.

하지만 새 기능이라면 DataStore를 먼저 볼 이유가 있다.

```text
비동기 API가 기본이다.
Flow로 값 변화를 관찰하기 좋다.
쓰기 작업을 suspend 함수로 표현하기 좋다.
Proto를 쓰면 schema 기반 타입 안정성을 얻을 수 있다.
SharedPreferences에서 마이그레이션 경로가 있다.
```

특히 앱 설정이나 로컬 보안 메타데이터처럼 "값이 바뀌면 화면 상태도 같이 바뀌어야 하는" 데이터에는 Flow 기반 모델이 잘 맞는다.

다만 DataStore도 한계가 있다.

```text
작고 단순한 데이터에 적합하다.
복잡한 관계형 데이터에는 맞지 않는다.
대용량 목록이나 검색에는 맞지 않는다.
부분 업데이트나 참조 무결성이 필요하면 Room이 낫다.
암호화를 자동으로 해주지는 않는다.
```

그래서 선택 기준은 이렇게 두면 좋다.

```text
임시 화면 상태
-> remember, ViewModel, SavedStateHandle

작은 설정값
-> Preferences DataStore

구조화된 작은 로컬 모델
-> Proto DataStore

관계형 데이터, 목록, 검색
-> Room

파일 자체
-> File storage

민감 데이터
-> 암호화한 뒤 필요한 저장소에 저장
```

## 암호문 저장 관점에서 DataStore 보기

개인키, seed, 토큰 같은 민감한 값을 다룬다고 해보자. 이때 DataStore를 쓴다는 말은 "민감값을 그대로 DataStore에 넣는다"가 아니다.

더 안전한 흐름은 아래에 가깝다.

```text
민감값 원문
-> Tink AEAD로 암호화
-> 암호문과 메타데이터를 DataStore에 저장
```

DataStore에는 이런 값이 들어갈 수 있다.

```text
id
ciphertext
createdAt
version
keyId
```

여기서 중요한 건 `ciphertext`다. 저장소에 남는 것은 원문이 아니라 암호문이어야 한다.

복호화가 필요한 순간에는 저장소에서 암호문을 읽고, Tink AEAD로 복호화한 뒤, 필요한 작업을 끝내면 평문 노출 시간을 줄인다.

```text
DataStore
-> 암호문 읽기
-> AEAD 복호화
-> 필요한 작업 수행
-> 평문 사용 범위 종료
```

이 구조에서 DataStore는 보안의 주인공이 아니라 저장의 담당자다.

```text
DataStore
= 암호문을 안정적으로 보관

Tink AEAD
= 암호화와 무결성 검증

Android Keystore
= Tink keyset 보호
```

여기서 더 들어가면 `DataStore`보다는 암호화 키 계층의 이야기가 된다. DataStore 입장에서는 "암호문을 저장한다"까지만 맡고, 그 암호문을 만들고 다시 여는 흐름은 Tink AEAD, Tink keyset, Android Keystore가 나눠 가진다.

이 관계는 [[android-local-ciphertext-keyset-keystore-flow|DataStore, Tink keyset, Android Keystore 관계 정리]]에서 따로 정리했다.

그래서 `DataStore를 선택한 이유`를 기술적으로 말한다면 이렇게 정리할 수 있다.

```text
저장해야 하는 값이 대용량 관계형 데이터가 아니라
암호문과 작은 메타데이터였기 때문에,
coroutine/Flow 기반으로 안정적으로 읽고 쓸 수 있는 DataStore가 적합했다.
```

## 자주 헷갈리는 포인트

DataStore를 공부할 때 헷갈렸던 지점을 짧게 정리하면 이렇다.

```text
DataStore는 암호화 저장소인가?
-> 아니다. 암호화가 필요하면 저장 전에 별도로 암호화해야 한다.

DataStore는 Room 대체재인가?
-> 아니다. 작은 key-value 또는 typed object 저장소에 가깝다.

SharedPreferences를 무조건 바꿔야 하나?
-> 새 코드에는 DataStore가 권장되지만, 기존 코드의 마이그레이션은 비용과 위험을 같이 봐야 한다.

Flow를 쓴다는 건 무슨 뜻인가?
-> 저장된 값의 현재 상태와 변경 사항을 비동기 스트림으로 관찰할 수 있다는 뜻이다.

Proto DataStore를 쓰면 DB처럼 쿼리할 수 있나?
-> 아니다. 하나의 구조화된 객체를 저장하고 읽는 것에 가깝다.
```

또 실무 코드에서는 이런 점도 조심해야 한다.

- 같은 파일에 대해 DataStore 인스턴스를 여러 개 만들지 않는다.
- Composable 내부에서 DataStore를 매번 생성하지 않는다.
- 큰 데이터나 자주 바뀌는 대용량 목록을 넣지 않는다.
- 읽기 실패, 파일 손상, 마이그레이션 실패를 처리한다.
- 민감값을 평문으로 저장하지 않는다.
- 로그에 저장값이나 복호화된 값을 남기지 않는다.

## 한 문장으로 정리하면

DataStore는 이렇게 이해하면 된다.

```text
DataStore는 SharedPreferences가 맡던 작은 로컬 데이터 저장을
coroutine과 Flow 기반으로 더 현대적인 Android 앱 구조에 맞게 다루는 저장소다.
```

SharedPreferences와의 차이는 단순히 "새 API"라는 데 있지 않다.

```text
SharedPreferences
= 간단한 동기 key-value 저장소로 쓰기 쉽다.

DataStore
= 비동기 읽기/쓰기, Flow 관찰, transactional update, typed schema 선택지가 있다.
```

그리고 민감 데이터 관점에서는 이 구분이 제일 중요하다.

```text
DataStore는 안전한 저장 흐름의 저장소 역할을 할 수 있지만,
암호화 자체를 대신하지는 않는다.
```

그래서 로컬에 민감값을 저장한다면 DataStore만 보는 것이 아니라, [[tink-aead-basics-android-wallet|Tink AEAD]]와 [[android-keystore-basics|Android Keystore]]까지 함께 봐야 한다. 저장소에는 암호문만 남기고, 암호화 키는 별도의 보안 계층에서 보호하는 식으로 책임을 나눠야 구조가 선명해진다. 이 전체 관계는 [[android-local-ciphertext-keyset-keystore-flow|DataStore, Tink keyset, Android Keystore 관계 정리]]에서 이어서 볼 수 있다.

## 참고하면 좋은 문서

- [Android Developers - DataStore](https://developer.android.com/topic/libraries/architecture/datastore)
- [Android Developers - SharedPreferences](https://developer.android.com/reference/android/content/SharedPreferences)
- [Preferences DataStore codelab](https://developer.android.com/codelabs/android-preferences-datastore)
- [Proto DataStore codelab](https://developer.android.com/codelabs/android-proto-datastore)
- [Android Developers - Room](https://developer.android.com/training/data-storage/room)
