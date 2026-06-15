---
title: "Android Keystore와 Tink AEAD로 개인키 저장하기"
date: "2026-06-15"
category: "Blockchain"
group: "Blockchain Basics"
series: "Blockchain Basics"
tags: ["android", "keystore", "tink", "aead", "wallet", "private-key", "security"]
description: "Android 지갑 앱에서 니모닉과 개인키를 만들고, Keystore와 Tink AEAD를 이용해 로컬에 안전하게 저장하는 구조를 정리합니다."
---

![Android Keystore와 Tink AEAD로 개인키 저장하기](/images/android-wallet-secret-storage-cover.png)

지갑 앱을 만들 때 가장 조심해야 하는 값은 개인키다. 주소는 공개되어도 되지만, 개인키는 그 주소의 권한을 행사하는 값이다. 개인키가 밖으로 나가면 사용자가 승인하지 않은 서명도 만들어질 수 있다.

그래서 지갑 앱의 키 저장 구조를 볼 때는 먼저 이 질문부터 잡는 편이 좋다.

```text
개인키를 어디에 저장하고,
언제 복호화하고,
얼마나 오래 메모리에 들고 있는가?
```

이 글은 특정 서비스 설명이 아니라, Android 지갑 앱을 만들 때 개인키 저장을 어떻게 나눠 생각할 수 있는지 정리한 메모다. 흐름은 크게 세 부분이다.

```text
키 생성과 파생
-> 암호화 저장
-> 서명할 때만 잠깐 로드
```

## 먼저 전체 흐름만 보기

개인키 저장 구조를 한 장으로 줄이면 이렇게 볼 수 있다.

```text
니모닉과 개인키는 앱 내부에서 만들고,
저장할 때는 Tink AEAD로 암호화하고,
그 암호화 키는 Android Keystore가 보호한다.
```

여기서 중요한 점은 "Keystore에 개인키를 그대로 넣는다"가 아니라는 것이다. 보통 지갑에서 말하는 EVM 개인키는 서명에 직접 쓰이는 데이터다. 이 값을 그대로 평문 저장소에 넣지 않고, 암호화한 뒤 로컬 저장소에 보관한다.

구조를 더 단순하게 표현하면 이렇다.

```text
개인키 원문
-> Tink AEAD 암호화
-> 암호문 저장

Tink keyset
-> Android Keystore의 master key로 보호
```

즉 로컬 저장소에는 개인키 평문이 아니라 암호문만 남기고, 암호화에 필요한 상위 키는 Android Keystore의 보호를 받게 한다.

## 개인키는 어떻게 만들어질까

비수탁 지갑에서는 보통 서버가 계정을 발급하지 않는다. 앱이 로컬에서 충분히 안전한 난수를 만들고, 그 난수에서 니모닉과 키를 파생한다.

![Android 지갑 개인키 라이프사이클](/images/android-wallet-key-lifecycle-handdrawn.png)

흐름은 대략 이렇다.

```text
SecureRandom
-> entropy
-> BIP-39 mnemonic
-> seed
-> BIP-44 path
-> private key
-> address
```

예를 들어 16바이트 엔트로피를 만들면 128비트 난수가 된다. 이 엔트로피에서 BIP-39 니모닉을 만들고, 니모닉에서 seed를 만든 다음, EVM 계열에서 자주 쓰는 BIP-44 경로로 계정 키를 파생할 수 있다.

```text
m/44'/60'/0'/0/index
```

여기서 `60`은 Ethereum 계열 coin type이다. 같은 seed에서 index를 바꾸면 여러 계정을 만들 수 있다.

중요한 점은 개인키가 만들어진 다음이다. 개인키는 앱 기능을 위해 필요하지만, 평문으로 오래 들고 있으면 위험하다. 그래서 저장 경로로 넘어가기 전에 "이 값을 어디에 넣을지"를 먼저 추상화한다.

## SecretStorage로 저장소를 추상화하기

지갑 코어에서는 Android 저장 기술을 직접 알 필요가 없다. 코어 입장에서는 "비밀 값을 저장하고 꺼낼 수 있는 저장소"만 있으면 된다. 그래서 저장소를 인터페이스로 분리할 수 있다.

```kotlin
interface SecretStorage {
    fun save(key: String, value: ByteArray)
    fun get(key: String): ByteArray?
    fun <T> getAndWipe(key: String, block: (ByteArray) -> T): T?
    fun delete(key: String)
}
```

이 인터페이스에서 가장 눈에 띄는 함수는 `getAndWipe`다.

보통 저장소는 `get()`만 제공한다. 하지만 개인키처럼 민감한 값을 다룰 때는 "꺼낸다"보다 "꺼내서 짧게 쓰고 바로 지운다"가 더 중요하다.

```text
get()
= 호출자가 값을 받은 뒤 직접 관리해야 한다.

getAndWipe()
= 저장소가 값을 꺼내고, block이 끝나면 finally에서 지운다.
```

이 차이는 작아 보이지만, 키 사용 범위를 코드 구조로 제한한다는 점에서 중요하다.

## Android 구현은 Keystore와 Tink로 맡기기

Android 쪽 구현체에서는 `SecretStorage`를 Android 전용 저장소로 구현한다. 여기서 맡는 일은 크게 네 가지다.

![Android Keystore와 Tink AEAD 저장 구조](/images/android-wallet-secret-storage-handdrawn.png)

```text
1. Tink AEAD 초기화
2. 개인키 ByteArray 암호화
3. 암호문을 로컬 저장소에 저장
4. 복호화한 값은 사용 뒤 wipe
```

Tink의 AEAD는 authenticated encryption with associated data의 줄임말이다. 단순히 암호화만 하는 것이 아니라, 복호화할 때 데이터가 위변조되지 않았는지도 함께 확인한다.

구조를 단순화하면 이런 식이다.

```kotlin
val keysetHandle = AndroidKeysetManager.Builder()
    .withSharedPref(context, "...", "...")
    .withKeyTemplate(AeadKeyTemplates.AES256_GCM)
    .withMasterKeyUri("android-keystore://...")
    .build()
    .keysetHandle

val aead = keysetHandle.getPrimitive(Aead::class.java)
```

여기서 실제 개인키 암호화는 Tink AEAD가 담당한다. Tink keyset은 Android 환경에 저장되지만, 그 keyset을 보호하는 master key는 Android Keystore를 바라보게 만든다.

```text
Android Keystore
= master key 보호

Tink AEAD
= 개인키 ByteArray 암호화와 인증

DataStore 또는 로컬 저장소
= 암호문 보관
```

이렇게 나누면 각 계층의 역할이 분명해진다. Keystore는 OS 보안 영역에서 master key를 보호하고, Tink는 안전한 암호화 API를 제공하고, 앱의 로컬 저장소는 암호문만 들고 있는 구조가 된다.

## associated data는 왜 넣을까

AEAD에서 `associatedData`는 암호문과 함께 검증되는 부가 데이터다. 암호화되지는 않지만, 복호화할 때 같은 값이 들어와야 한다.

예를 들어 저장 키 문자열을 associated data로 사용하면 이런 효과가 있다.

```text
저장할 때:
encrypt(privateKey, storageKey)

읽을 때:
decrypt(ciphertext, storageKey)
```

만약 누군가 암호문을 다른 저장 키 아래로 옮기거나, 잘못된 키 이름으로 읽으려 하면 복호화가 실패할 수 있다. 즉 "이 암호문은 이 논리적 저장 키에 묶여 있다"는 성질을 얻는다.

물론 associated data는 비밀값이 아니다. 그래서 저장 키 자체에 너무 많은 민감 정보를 담지 않는 편이 좋다. 실제 저장소에는 원본 키 문자열 대신 해시한 식별자를 저장하고, 체인이나 주소처럼 조회에 필요한 메타데이터만 제한적으로 분리할 수 있다.

```text
원본 저장 키
-> SHA-256
-> key id
-> 저장소 검색용 식별자
```

이렇게 하면 로컬 저장소를 열어봤을 때 원본 키 이름이 그대로 드러나는 일을 줄일 수 있다.

## 저장할 때는 입력값도 지워야 한다

개인키를 저장할 때 흔히 놓치는 부분이 있다. 암호문을 저장했다고 끝이 아니다. 암호화 함수에 넘겼던 원본 `ByteArray`도 메모리에 남아 있을 수 있다.

그래서 저장 함수는 이런 흐름을 갖는 편이 좋다.

```kotlin
override fun save(key: String, value: ByteArray) {
    try {
        val ciphertext = encrypt(value, key)
        saveCiphertext(key, ciphertext)
    } finally {
        value.fill(0)
    }
}
```

암호화 과정에서 만들어진 중간 `ciphertext` 배열도 문자열로 변환한 뒤 지울 수 있다.

```kotlin
private fun encrypt(plaintext: ByteArray, associatedData: String): String {
    val ciphertext = aead.encrypt(
        plaintext,
        associatedData.toByteArray(Charsets.UTF_8)
    )

    return try {
        Base64.encodeToString(ciphertext, Base64.NO_WRAP)
    } finally {
        ciphertext.fill(0)
    }
}
```

여기서 `fill(0)`이 완벽한 보안 장치라는 뜻은 아니다. JVM과 Android 런타임에서는 객체 복사, GC, 문자열 불변성 같은 한계가 있다. 그래도 직접 다룰 수 있는 `ByteArray`는 사용 후 명시적으로 지워서 노출 시간을 줄이는 것이 좋다.

특히 니모닉은 `String`으로 다루는 순간 완전히 지우기 어렵다. 그래서 UI 표시나 검증 때문에 문자열이 필요하더라도, 저장과 서명에 쓰는 민감 바이트 배열은 가능한 짧은 범위 안에서만 살아 있게 만드는 편이 안전하다.

## 서명할 때만 잠깐 꺼내기

저장보다 더 중요한 순간은 서명이다. 서명할 때는 결국 개인키 원문이 필요하다. 다만 그 원문이 밖으로 나가야 하는 것은 아니다.

![안전한 서명 시점 흐름](/images/android-wallet-signing-flow-handdrawn.png)

흐름은 이렇게 볼 수 있다.

```text
사용자 인증
-> 저장소에서 개인키 복호화
-> 메모리 안에서 서명
-> 서명값만 반환
-> 개인키 ByteArray wipe
```

서명 함수는 대략 이런 모양이 된다.

```kotlin
return storage.getAndWipe(key) { privateKey ->
    signer.sign(message, privateKey)
}
```

핵심은 `privateKey`가 이 블록 안에서만 쓰인다는 점이다. 블록 밖으로 개인키를 반환하지 않고, 네트워크로도 보내지 않는다. 밖으로 나가는 것은 서명값이다.

```text
밖으로 나가면 안 되는 것:
private key
mnemonic
seed

밖으로 나갈 수 있는 것:
address
signature
signed transaction
```

사용자 인증은 이 앞단에 붙일 수 있다. PIN이나 생체 인증이 활성화되어 있다면, 서명 요청 전에 인증을 통과시킨 뒤 실제 서명 로직을 호출한다.

```text
인증 성공
-> getAndWipe
-> sign

인증 실패
-> 키 로드하지 않음
```

이렇게 보면 인증과 저장은 같은 것이 아니다. 인증은 "지금 이 사용자가 서명을 진행해도 되는가"를 확인하는 게이트이고, Keystore와 Tink는 "개인키를 로컬에 어떤 형태로 보관할 것인가"를 담당한다.

## 삭제도 과장하면 안 된다

`delete(key)`를 호출하면 저장소에서 해당 항목을 제거할 수 있다. 하지만 로컬 저장소 삭제를 물리적인 보안 삭제로 과장하면 안 된다. 플래시 저장장치나 파일 시스템 특성 때문에 과거 바이트가 즉시 완전히 사라진다고 말하기는 어렵다.

그래서 앱 레벨에서 할 수 있는 현실적인 방어는 이런 쪽에 가깝다.

- 처음부터 평문을 저장하지 않는다.
- 암호문도 필요한 항목만 남긴다.
- master key와 keyset 보호를 Android 보안 기능에 맡긴다.
- 복호화된 `ByteArray`는 가능한 짧게 살리고 지운다.
- 로그, 크래시 리포트, analytics에 민감값을 절대 남기지 않는다.

즉 삭제는 마지막 방어선이 아니라, 평문 저장을 피하고 키 사용 시간을 줄이는 전체 구조 안에서 봐야 한다.

## 이 구조를 한 문장으로 정리하면

Android 지갑 앱의 개인키 저장 구조는 이렇게 말할 수 있다.

```text
개인키와 니모닉은 로컬에서 생성하고,
개인키는 Tink AEAD로 암호화해 저장하며,
Tink keyset은 Android Keystore의 master key로 보호하고,
서명할 때만 복호화해 사용한 뒤 즉시 wipe한다.
```

조금 더 개발자식으로 줄이면 이렇다.

```text
WalletKeyManager
-> SecretStorage
-> AndroidSecretStorage
-> Tink AEAD
-> Android Keystore
```

여기서 좋은 점은 코어 로직과 Android 보안 구현이 분리된다는 점이다. 키 생성, 니모닉 검증, BIP-44 파생, 서명 같은 도메인 로직은 `wallet-core` 같은 순수 Kotlin 영역에 둘 수 있고, 실제 Android 저장 방식은 `SecretStorage` 구현체가 책임진다.

그래서 테스트에서는 인메모리 저장소를 넣어 키 파생과 저장 로직을 검증할 수 있고, Android 앱에서는 Keystore와 Tink 기반 저장소를 주입할 수 있다.

## 정리

개인키 저장은 "어떤 암호화 라이브러리를 썼다"만으로 끝나지 않는다. 중요한 것은 값의 생명주기다.

```text
생성할 때 안전한 난수를 쓰는가?
저장할 때 평문이 남지 않는가?
복호화할 때 사용 범위가 짧은가?
서명 뒤 메모리에서 지우는가?
로그나 외부 전송으로 새지 않는가?
```

Android Keystore와 Tink AEAD는 이 구조를 만들기 좋은 조합이다. Keystore는 master key 보호를 맡고, Tink는 AEAD 암호화 API를 안전하게 감싸준다. 여기에 `getAndWipe` 같은 사용 패턴을 붙이면, 개인키가 앱 안에서 필요한 순간에만 짧게 살아 있도록 만들 수 있다.

결국 핵심은 단순하다.

```text
보관은 암호문으로,
사용은 짧게,
밖으로 나가는 것은 서명값만.
```
