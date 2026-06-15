---
title: "PIN 저장을 SHA-256으로 끝내면 안 되는 이유"
date: "2026-06-15"
category: "Android"
group: "Android Security"
series: "Android Security"
tags: ["android", "pin", "pbkdf2", "argon2", "scrypt", "lockout", "authentication", "security"]
description: "짧은 PIN을 저장할 때 빠른 해시가 왜 부족한지, salt, KDF, pepper, persistent lockout이 각각 어떤 공격을 줄이는지 Android 예제로 정리합니다."
---

![PIN, KDF, Lockout](/images/android-pin-kdf-lockout-handdrawn.png)

PIN을 구현할 때 가장 먼저 떠올리기 쉬운 코드는 이런 모양이다.

```kotlin
val hash = sha256(pin)
save(hash)
```

겉으로는 그럴듯해 보인다. PIN 원문을 저장하지 않았고, SHA-256은 널리 쓰이는 해시 함수이기 때문이다.

하지만 PIN 저장에서는 이 판단이 위험해질 수 있다. 문제는 SHA-256이 약한 알고리즘이라는 데 있지 않다. 문제는 **PIN이 너무 짧고, SHA-256이 너무 빠르다**는 데 있다.

4자리 PIN은 10,000개뿐이다. 6자리 PIN도 1,000,000개뿐이다. 해시 DB나 로컬 저장소가 유출되면 공격자는 서버나 앱의 시도 제한을 거치지 않고 가능한 PIN을 전부 대입해볼 수 있다.

이 글은 Android 앱에서 자체 PIN을 둔다고 가정하고, 어떤 개념을 어떤 역할로 봐야 하는지 정리한 메모다.

```text
salt
= 같은 PIN이 같은 해시로 보이지 않게 한다.

KDF
= PIN 추측 한 번의 비용을 비싸게 만든다.

persistent lockout
= 앱이나 서버를 통한 온라인 추측 속도를 제한한다.

Keystore / OS credential
= 가능하면 검증과 키 사용을 하드웨어 보안 계층에 묶는다.
```

## 먼저 공격을 둘로 나누기

PIN 방어를 볼 때는 온라인 공격과 오프라인 공격을 나눠야 한다.

```text
온라인 공격
= 앱 화면, API, 로그인 엔드포인트를 통해 PIN을 계속 입력해보는 공격

오프라인 공격
= 해시 DB, 로컬 파일, 백업 데이터가 유출된 뒤 공격자 장비에서 PIN을 대입해보는 공격
```

둘은 방어 방법이 다르다.

```text
KDF
-> 오프라인 공격 비용을 올린다.

lockout / rate limit
-> 온라인 공격 속도를 낮춘다.
```

둘 중 하나만 있으면 부족하다. KDF를 써도 앱/API가 무제한 시도를 허용하면 온라인 공격에 약하다. 반대로 lockout이 있어도 해시 파일이 유출되면 공격자는 lockout을 우회해서 오프라인으로 대입할 수 있다.

그래서 PIN 저장은 보통 이렇게 봐야 한다.

```text
PIN
-> unique salt
-> PBKDF2 / Argon2id / scrypt 같은 KDF
-> hash 저장
-> 실패 횟수와 잠금 시각을 영속 저장
```

## 하지 말아야 할 예제

먼저 피해야 할 코드를 보자.

```kotlin
fun sha256(pin: String): ByteArray {
    return MessageDigest
        .getInstance("SHA-256")
        .digest(pin.toByteArray(Charsets.UTF_8))
}
```

이 코드는 PIN 원문을 저장하지 않는다는 점에서는 평문 저장보다 낫다. 하지만 PIN 후보가 작기 때문에 충분하지 않다.

```text
000000 -> SHA-256
000001 -> SHA-256
000002 -> SHA-256
...
999999 -> SHA-256
```

공격자는 같은 함수를 매우 빠르게 반복할 수 있다. salt를 붙여도 "각 사용자마다 다시 계산해야 한다"는 비용은 생기지만, SHA-256 자체가 빠르다는 성질은 그대로 남는다.

```kotlin
fun saltedSha256(pin: String, salt: ByteArray): ByteArray {
    return MessageDigest.getInstance("SHA-256").digest(
        salt + pin.toByteArray(Charsets.UTF_8)
    )
}
```

salt는 필요하다. 하지만 salt만으로는 부족하다.

## salt는 무엇을 막을까

salt는 사용자마다, 또는 PIN 레코드마다 새로 만드는 랜덤 값이다. 비밀일 필요는 없고, 해시와 함께 저장해도 된다.

```text
같은 PIN + 다른 salt
-> 다른 결과
```

예를 들어 두 사용자가 모두 `123456`을 쓴다고 해도 salt가 다르면 저장되는 결과는 달라져야 한다.

```text
user A: PBKDF2("123456", saltA) -> hashA
user B: PBKDF2("123456", saltB) -> hashB
```

이렇게 하면 같은 PIN을 쓰는 사용자들이 한 번에 드러나는 문제를 줄일 수 있고, 미리 계산해둔 테이블을 그대로 재사용하기 어렵게 만든다.

하지만 salt는 공격자에게 숨기는 값이 아니다. salt와 hash가 함께 유출된다고 가정해야 한다. 그래서 salt는 "추측을 불가능하게 만드는 값"이 아니라 "추측을 재사용하기 어렵게 만드는 값"에 가깝다.

## KDF는 무엇을 막을까

KDF는 `Key Derivation Function`의 줄임말이다. PIN이나 비밀번호 같은 사람이 기억하는 값을 바로 해시하지 않고, 일부러 비용이 드는 계산을 거쳐 저장용 값이나 암호화 키를 만든다.

PIN 저장에서 KDF의 목적은 단순하다.

```text
PIN 후보 하나를 검증하는 비용을 비싸게 만든다.
```

빠른 해시에서는 공격자가 100만 개 후보를 매우 빠르게 확인할 수 있다. KDF를 쓰면 후보 하나를 확인할 때마다 반복 계산이나 메모리 비용이 들어간다.

대표적으로 이런 선택지가 있다.

```text
Argon2id
= 새 설계에서는 우선 고려할 만한 메모리 하드 KDF

scrypt
= 메모리 비용을 요구하는 KDF

PBKDF2
= Android/JDK에서 기본 제공되는 실용적인 선택지
```

Android 앱 코드만 놓고 보면 `PBKDF2WithHmacSHA256`은 플랫폼에서 바로 사용할 수 있어 예제로 보여주기 좋다. Argon2id는 Android SDK 표준 API가 아니므로 검증된 라이브러리나 서버 측 구현을 별도로 선택해야 한다.

## PBKDF2로 저장하기

PIN 저장 레코드는 나중에 파라미터를 바꿀 수 있도록 버전을 포함하는 편이 좋다.

```kotlin
data class PinHashRecord(
    val version: Int,
    val algorithm: String,
    val iterations: Int,
    val saltBase64: String,
    val hashBase64: String
)
```

새 PIN을 등록할 때는 salt를 새로 만들고 PBKDF2 결과를 저장한다.

```kotlin
object PinKdf {
    private const val Algorithm = "PBKDF2WithHmacSHA256"
    private const val SaltBytes = 16
    private const val HashBits = 256

    fun createRecord(
        pin: CharArray,
        iterations: Int = 600_000
    ): PinHashRecord {
        val salt = ByteArray(SaltBytes)
        SecureRandom().nextBytes(salt)

        val hash = pbkdf2(pin, salt, iterations)

        return PinHashRecord(
            version = 1,
            algorithm = Algorithm,
            iterations = iterations,
            saltBase64 = Base64.encodeToString(salt, Base64.NO_WRAP),
            hashBase64 = Base64.encodeToString(hash, Base64.NO_WRAP)
        )
    }

    fun verify(pin: CharArray, record: PinHashRecord): Boolean {
        require(record.algorithm == Algorithm)

        val salt = Base64.decode(record.saltBase64, Base64.NO_WRAP)
        val expected = Base64.decode(record.hashBase64, Base64.NO_WRAP)
        val actual = pbkdf2(pin, salt, record.iterations)

        return MessageDigest.isEqual(actual, expected)
    }

    private fun pbkdf2(
        pin: CharArray,
        salt: ByteArray,
        iterations: Int
    ): ByteArray {
        val spec = PBEKeySpec(pin, salt, iterations, HashBits)
        return try {
            SecretKeyFactory
                .getInstance(Algorithm)
                .generateSecret(spec)
                .encoded
        } finally {
            spec.clearPassword()
        }
    }
}
```

여기서 중요한 점은 네 가지다.

- salt는 `SecureRandom`으로 매번 새로 만든다.
- 반복 횟수는 레코드에 저장해서 나중에 올릴 수 있게 한다.
- 비교는 `==` 대신 `MessageDigest.isEqual`처럼 timing 차이를 줄이는 비교를 쓴다.
- PIN은 가능하면 `String`보다 `CharArray`로 다루고, 사용 후 지울 수 있는 범위를 줄인다.

완벽한 메모리 삭제를 보장한다는 뜻은 아니다. Android UI 입력 과정에서 이미 `String`이 생길 수 있고, JVM/ART 메모리 관리가 개입한다. 그래도 앱 코드가 직접 오래 들고 있는 비밀값은 줄이는 편이 낫다.

```kotlin
val pin = input.toCharArray()
try {
    val record = PinKdf.createRecord(pin)
    pinRepository.saveHashRecord(record)
} finally {
    pin.fill('\u0000')
}
```

## 반복 횟수는 어떻게 정할까

반복 횟수는 문서의 숫자를 그대로 베끼기보다 목표 검증 시간을 정하고 기기에서 측정하는 편이 좋다.

```text
너무 낮음
-> 오프라인 추측 비용이 낮다.

너무 높음
-> 정상 사용자도 PIN 확인 때마다 느리다.
```

예를 들어 앱 시작 시 PIN 확인이 자주 발생한다면 100ms 안팎의 체감 목표를 두고 중저가 기기에서 측정할 수 있다. 고위험 작업에만 PIN을 요구한다면 더 높은 비용을 감수할 수도 있다.

중요한 것은 파라미터를 코드에만 박아두지 않는 것이다.

```text
record.version
record.algorithm
record.iterations
```

이 값들을 저장해두면 나중에 로그인 성공 시점에 더 강한 파라미터로 재해시할 수 있다.

```kotlin
fun shouldUpgrade(record: PinHashRecord): Boolean {
    return record.algorithm == "PBKDF2WithHmacSHA256" &&
        record.iterations < 600_000
}
```

숫자는 예시다. 실제 값은 앱의 위험도, 대상 기기, 서버 여부, 사용자 경험을 같이 보고 정해야 한다.

## persistent lockout은 무엇을 막을까

KDF는 오프라인 공격을 느리게 만든다. 하지만 앱 화면이나 서버 API가 무제한으로 PIN을 받아주면 공격자는 온라인으로 계속 시도할 수 있다.

그래서 실패 횟수와 잠금 시각을 저장해야 한다.

```kotlin
data class PinLockoutState(
    val failedAttempts: Int,
    val lockedUntilEpochMillis: Long
)
```

메모리에만 두면 앱을 죽였다 켜서 초기화할 수 있다. 그래서 `DataStore`, `Room`, 서버 DB처럼 재시작 뒤에도 남는 저장소에 둬야 한다.

```text
나쁜 방향:
failedAttempts를 ViewModel 필드에만 저장

나은 방향:
failedAttempts와 lockedUntil을 영속 저장
```

간단한 정책은 이렇게 만들 수 있다.

```kotlin
fun lockoutDelayMillis(failedAttempts: Int): Long {
    return when {
        failedAttempts <= 4 -> 0L
        failedAttempts == 5 -> 60_000L
        failedAttempts == 6 -> 5 * 60_000L
        failedAttempts == 7 -> 15 * 60_000L
        failedAttempts == 8 -> 30 * 60_000L
        failedAttempts == 9 -> 90 * 60_000L
        else -> 24 * 60 * 60_000L
    }
}
```

검증 흐름은 아래처럼 볼 수 있다.

```kotlin
sealed interface PinVerifyResult {
    data object Success : PinVerifyResult
    data object Failed : PinVerifyResult
    data class Locked(val remainingMillis: Long) : PinVerifyResult
}

suspend fun verifyPin(
    inputPin: CharArray,
    nowMillis: Long = System.currentTimeMillis()
): PinVerifyResult {
    val state = lockoutRepository.load()

    if (nowMillis < state.lockedUntilEpochMillis) {
        return PinVerifyResult.Locked(
            remainingMillis = state.lockedUntilEpochMillis - nowMillis
        )
    }

    val record = pinRepository.loadHashRecord()
    val matched = PinKdf.verify(inputPin, record)

    if (matched) {
        lockoutRepository.save(
            PinLockoutState(
                failedAttempts = 0,
                lockedUntilEpochMillis = 0L
            )
        )
        return PinVerifyResult.Success
    }

    val nextFailures = state.failedAttempts + 1
    val delay = lockoutDelayMillis(nextFailures)

    lockoutRepository.save(
        PinLockoutState(
            failedAttempts = nextFailures,
            lockedUntilEpochMillis = nowMillis + delay
        )
    )

    return PinVerifyResult.Failed
}
```

이 코드는 개념 예제다. 실제 앱에서는 상태 저장을 트랜잭션처럼 다뤄야 한다. 특히 서버 인증이라면 실패 횟수 증가는 서버에서 원자적으로 처리해야 한다.

로컬 앱 PIN도 마찬가지로 주의가 필요하다. 루팅된 기기나 백업 파일을 조작할 수 있는 공격자는 앱 저장소의 lockout 상태를 바꿔치기할 수 있다. 앱 레벨 lockout은 UX와 기본 방어로는 의미가 있지만, Android OS 잠금화면의 Gatekeeper나 Weaver 같은 하드웨어 기반 rate limit과 같은 강도라고 보면 안 된다.

## pepper는 언제 볼까

pepper는 salt와 다르다.

```text
salt
= 레코드마다 다르고, 해시와 함께 저장된다.

pepper
= 애플리케이션 또는 서버가 별도로 보관하는 비밀값이다.
```

서버에서 PIN을 검증한다면 pepper를 KMS나 Secret Manager에 두고 해시 계산에 섞는 전략을 볼 수 있다.

```text
PIN + salt + server-side pepper
-> KDF
-> hash
```

이렇게 하면 DB만 유출된 상황에서 공격자가 바로 대입을 시작하기 어려워진다. 하지만 pepper까지 같이 유출되면 효과가 사라지고, pepper 회전 전략도 필요하다.

Android 앱 로컬에 pepper를 하드코딩하는 것은 좋은 방어가 아니다. 앱 바이너리에서 추출될 수 있기 때문이다. 로컬만 있는 구조라면 "앱 안에 숨긴 비밀값"을 과신하지 않는 편이 좋다.

## Keystore를 같이 쓰면 무엇이 좋아질까

자체 PIN을 구현하는 대신, 가능하다면 Android의 기기 인증을 사용하는 편이 더 낫다.

Android Keystore는 키 원본을 앱 밖의 보안 계층에 두고, 키 사용 조건으로 사용자 인증을 요구할 수 있다.

```kotlin
val spec = KeyGenParameterSpec.Builder(
    "app_secret_key",
    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
)
    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
    .setUserAuthenticationRequired(true)
    .setUserAuthenticationParameters(
        0,
        KeyProperties.AUTH_DEVICE_CREDENTIAL or
            KeyProperties.AUTH_BIOMETRIC_STRONG
    )
    .build()
```

이 코드는 Android 11, API 30 이상에서의 예시다. 이런 키는 사용자가 기기 PIN, 패턴, 비밀번호 또는 강한 생체 인증을 통과해야 사용할 수 있다. 앱이 자체 PIN 해시를 비교하는 구조보다 Android 보안 모델에 더 잘 올라탄다.

앱 화면에서는 `BiometricPrompt`를 통해 기기 인증을 요청할 수 있다.

```kotlin
val promptInfo = BiometricPrompt.PromptInfo.Builder()
    .setTitle("인증")
    .setAllowedAuthenticators(
        BiometricManager.Authenticators.BIOMETRIC_STRONG or
            BiometricManager.Authenticators.DEVICE_CREDENTIAL
    )
    .build()
```

물론 제품 요구사항상 별도의 앱 PIN이 필요한 경우도 있다. 예를 들어 서버 계정 PIN, 결제 PIN, 특정 지갑 PIN처럼 기기 잠금화면과 독립된 지식 요소를 두고 싶을 수 있다.

그 경우에도 자체 PIN은 이렇게 위치를 잡는 것이 좋다.

```text
가능하면:
서버 검증 + 서버 rate limit + KDF 저장

로컬만 가능하다면:
KDF 저장 + 영속 lockout + Keystore로 민감 키 보호

고위험 자산이라면:
자체 PIN만으로 보호한다고 말하지 않기
```

## Android OS 잠금화면은 어떻게 다를까

Android OS 잠금화면 PIN은 앱이 직접 `if (hash == savedHash)`로 비교하는 구조가 아니다.

AOSP에서는 PIN, 패턴, 비밀번호를 LSKF, 즉 `Lock Screen Knowledge Factor`로 다룬다. 현재 AOSP의 Synthetic Password 구조에서는 LSKF를 scrypt로 늘리고, Gatekeeper 또는 Weaver 같은 보안 컴포넌트가 검증과 rate limiting에 관여한다.

흐름을 단순화하면 이렇다.

```text
사용자 PIN
-> scrypt 기반 stretching
-> Gatekeeper 또는 Weaver 검증
-> Synthetic Password 해제
-> Credential Encrypted storage / Keystore key 사용 가능
```

Gatekeeper는 TEE에서 잠금화면 credential을 검증하고, 실패 시 timeout을 반환해 brute-force를 제한한다. Weaver가 있는 기기에서는 Weaver가 LSKF 검증과 rate limiting을 맡을 수 있다.

Android 공식 rate-limiting 문서도 PIN이나 패턴 같은 LSKF가 낮은 엔트로피 값이므로 brute-force 방어가 필요하다고 설명한다.

이 지점이 앱 자체 PIN 구현에서 중요한 비교점이다.

```text
Android OS 잠금화면
= TEE/SE 기반 검증과 rate limiting 가능

앱 자체 PIN
= 앱 저장소와 앱 프로세스 안에서 끝나기 쉬움
```

그래서 앱 자체 PIN을 만들 때는 OS 잠금화면과 같은 강도를 쉽게 흉내 낼 수 있다고 생각하면 안 된다. 가능하면 기기 인증과 Keystore를 활용하고, 자체 PIN이 필요하다면 KDF와 persistent lockout, 서버 정책을 함께 설계해야 한다.

## 구현 체크리스트

PIN 구현을 리뷰할 때는 아래 질문을 던져볼 수 있다.

- PIN 원문을 저장하지 않는가?
- SHA-256 같은 빠른 해시만 사용하고 있지 않은가?
- salt를 레코드마다 랜덤으로 만들고 있는가?
- PBKDF2, Argon2id, scrypt 같은 KDF를 쓰는가?
- KDF 파라미터를 저장해서 나중에 업그레이드할 수 있는가?
- 비교 시 timing 차이를 줄이는 비교 함수를 쓰는가?
- 실패 횟수와 잠금 시각을 영속 저장하는가?
- 앱 재시작, 프로세스 종료, 네트워크 재시도에도 lockout이 유지되는가?
- 서버 인증이라면 실패 횟수를 서버에서 원자적으로 증가시키는가?
- PIN 입력값을 로그, analytics, crash report에 남기지 않는가?
- PIN 재설정과 계정 복구 흐름이 준비되어 있는가?
- 고위험 기능은 Android Keystore와 기기 인증을 함께 쓰는가?

## 정리

PIN 저장에서 중요한 문장은 이것이다.

```text
SHA-256은 나쁜 해시라서 문제가 아니라,
짧은 PIN을 너무 빠르게 검증하게 만들기 때문에 문제가 된다.
```

그래서 각 개념의 역할을 나눠야 한다.

```text
salt
-> 같은 PIN과 미리 계산된 공격을 덜 유용하게 만든다.

KDF
-> 오프라인 추측 하나하나의 비용을 올린다.

persistent lockout
-> 온라인 추측 속도를 제한한다.

Keystore / 기기 인증
-> 가능하면 검증과 키 사용을 Android 보안 계층에 묶는다.
```

PIN은 짧다. 그래서 "해시했으니 안전하다"보다 "짧은 비밀값을 공격자가 얼마나 빠르게 추측할 수 있는가"로 봐야 한다.

## 참고한 자료

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST SP 800-63B: Authentication and Lifecycle Management](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Android Gatekeeper](https://source.android.com/docs/security/features/authentication/gatekeeper)
- [Android Weaver](https://source.android.com/docs/security/features/authentication/weaver)
- [Android LSKF Rate-limiting](https://source.android.com/docs/security/features/authentication/rate-limiting)
- [Android Keystore system](https://developer.android.com/privacy-and-security/keystore)
