---
title: "Tink AEAD 이해하기"
date: "2026-06-14"
category: "Blockchain"
group: "Blockchain Basics"
series: "Blockchain Basics"
tags: ["android", "tink", "aead", "aes-gcm", "encryption", "wallet", "security"]
description: "Tink AEAD가 무엇인지, 암호화와 무결성 검증을 어떻게 함께 제공하는지, Android 지갑 앱의 로컬 비밀 저장소에서 어떻게 볼 수 있는지 정리합니다."
---

![Tink AEAD 이해하기](/images/tink-aead-basics-cover.png)

개인키나 니모닉 같은 값을 로컬에 저장해야 할 때, 가장 먼저 떠올리기 쉬운 말은 "암호화해서 저장하자"다. 그런데 암호화라는 말만으로는 부족하다.

정말 중요한 질문은 조금 더 구체적이다.

```text
무엇으로 암호화할 것인가?
복호화할 때 위변조도 확인할 수 있는가?
이 암호문이 원래 저장 위치의 데이터라는 것도 확인할 수 있는가?
키 관리는 어떻게 할 것인가?
```

이 질문을 볼 때 Tink의 AEAD가 꽤 좋은 출발점이 된다.

이 글은 Tink를 깊게 파는 문서라기보다, Android 지갑 앱에서 개인키 같은 민감 데이터를 저장한다고 가정했을 때 AEAD를 어떻게 이해하면 좋은지 정리한 메모다.

## AEAD는 무엇일까

AEAD는 `Authenticated Encryption with Associated Data`의 줄임말이다.

한 문장으로 줄이면 이렇게 볼 수 있다.

```text
AEAD는 암호화와 무결성 검증을 함께 제공하는 방식이다.
```

일반적으로 암호화라고 하면 평문을 알아볼 수 없는 암호문으로 바꾸는 것을 먼저 떠올린다. 하지만 민감 데이터를 저장할 때는 "숨기는 것"만으로 충분하지 않다.

누군가 암호문 일부를 바꿨다면 복호화가 실패해야 한다. 또 같은 암호문을 엉뚱한 위치에 옮겨도 그대로 열리면 곤란할 수 있다.

AEAD는 이 두 가지 감각을 같이 잡는다.

```text
기밀성
= 내용을 모르면 평문을 알 수 없다.

무결성
= 암호문이 바뀌면 복호화가 실패한다.

associated data 검증
= 암호문에 묶어둔 부가 정보가 다르면 복호화가 실패한다.
```

그래서 AEAD는 단순히 "암호문을 만든다"보다 "이 암호문이 같은 키와 같은 문맥에서 만들어진 것이 맞는지 확인한다"에 가깝다.

## Tink는 왜 쓸까

암호화 코드를 직접 만들기는 어렵다. AES-GCM 같은 알고리즘 이름을 안다고 해도, nonce 생성, tag 검증, 키 관리, 알고리즘 선택, 안전하지 않은 조합 방지 같은 세부사항을 계속 신경 써야 한다.

Tink는 이런 암호화 기능을 안전한 primitive 단위로 감싸서 제공한다. 개발자는 낮은 수준의 암호화 세부사항을 직접 조립하기보다, 목적에 맞는 primitive를 선택해서 사용한다.

예를 들어 민감 데이터를 암호화하고 위변조를 검증하려면 `Aead` primitive를 사용한다.

```kotlin
val ciphertext = aead.encrypt(
    plaintext,
    associatedData
)

val plaintext = aead.decrypt(
    ciphertext,
    associatedData
)
```

겉보기에는 단순하다. 하지만 이 단순함이 중요하다. 암호화 코드는 "동작한다"보다 "틀리기 어렵게 쓴다"가 더 중요하기 때문이다.

## 암호화와 복호화 흐름

Tink AEAD의 기본 입력과 출력은 이렇게 볼 수 있다.

![Tink AEAD 암호화 복호화 흐름](/images/tink-aead-encrypt-decrypt-handdrawn.png)

암호화할 때는 세 가지가 들어간다.

```text
plaintext
associated data
AEAD key
```

결과는 암호문이다. 다만 개념적으로는 암호문에 인증 태그가 함께 붙어 있다고 보면 이해하기 쉽다.

```text
plaintext + associated data + key
-> ciphertext + authentication tag
```

복호화할 때도 같은 키와 같은 associated data가 필요하다.

```text
ciphertext + same associated data + same key
-> plaintext
```

여기서 둘 중 하나라도 맞지 않으면 복호화는 실패한다.

```text
키가 다르면 실패
associated data가 다르면 실패
암호문이 바뀌면 실패
```

그래서 복호화 코드는 실패를 정상적인 보안 신호로 다뤄야 한다. "데이터가 없거나, 키가 틀렸거나, 암호문이 손상됐거나, associated data가 다르다"는 가능성을 열어두고 처리해야 한다.

## associated data는 암호화되지 않는다

AEAD에서 가장 헷갈리기 쉬운 부분은 associated data다.

associated data는 암호화 대상이 아니다. 즉 복호화해서 얻는 평문 안에 들어가는 값이 아니다. 대신 암호문과 함께 검증되는 문맥 정보다.

예를 들어 로컬 저장소에 개인키를 저장한다고 생각해보자.

```text
저장 키: account:1
평문: private key bytes
```

이때 저장 키를 associated data로 넣으면, 암호문은 `account:1`이라는 문맥에 묶인다.

```text
encrypt(privateKeyBytes, "account:1")
```

나중에 복호화할 때도 같은 associated data를 넣어야 한다.

```text
decrypt(ciphertext, "account:1")
```

만약 누군가 이 암호문을 `account:2` 위치에 옮기고, `account:2`라는 associated data로 복호화하려 하면 실패해야 한다.

```text
decrypt(ciphertext, "account:2")
-> 실패
```

이 성질을 이용하면 암호문을 특정 저장 키, 계정, 체인, 메시지 타입 같은 문맥에 묶을 수 있다.

## associated data가 다르면 왜 실패할까

associated data는 암호화되지 않지만, 인증 태그 계산에는 들어간다. 그래서 복호화할 때 같은 associated data가 아니면 태그 검증이 맞지 않는다.

![Tink AEAD associated data 검증](/images/tink-aead-associated-data-handdrawn.png)

세 가지 경우로 보면 쉽다.

```text
같은 AD + 같은 암호문 + 같은 키
-> 복호화 성공

다른 AD + 같은 암호문 + 같은 키
-> 복호화 실패

같은 AD + 변경된 암호문 + 같은 키
-> 복호화 실패
```

여기서 AD는 비밀값이 아니다. 그래서 associated data에 개인키, 니모닉, PIN 같은 값을 넣으면 안 된다. AD는 숨기기 위한 값이 아니라 묶기 위한 값이다.

좋은 associated data는 이런 성격을 가진다.

- 비밀이 아니어도 된다.
- 암호문이 속한 문맥을 설명한다.
- 복호화할 때 다시 계산하거나 다시 알 수 있다.
- 잘못된 위치의 암호문을 열지 못하게 돕는다.

예를 들어 로컬 비밀 저장소라면 저장 키, 계정 타입, 체인 구분, 버전 같은 값이 후보가 될 수 있다. 다만 저장소 파일에 그대로 남을 수 있는 값이므로, 너무 많은 내부 정보를 담지 않는 편이 좋다.

## Android 지갑 저장소에서 보면

Android 지갑 앱의 로컬 비밀 저장소에서는 Tink AEAD를 이런 역할로 볼 수 있다.

```text
SecretStorage.save()
-> plaintext ByteArray를 받는다.
-> Tink AEAD로 암호화한다.
-> 암호문만 로컬 저장소에 저장한다.
-> 입력 ByteArray를 wipe한다.
```

읽을 때는 반대다.

```text
SecretStorage.get()
-> 로컬 저장소에서 암호문을 찾는다.
-> Tink AEAD로 복호화한다.
-> ByteArray를 반환한다.
```

개인키처럼 민감한 값이라면 보통 `get()`보다 사용 범위를 줄인 API가 더 낫다.

```kotlin
fun <T> getAndWipe(
    key: String,
    block: (ByteArray) -> T
): T?
```

이런 API는 복호화된 값이 블록 안에서만 쓰이게 만든다.

```kotlin
storage.getAndWipe(key) { privateKey ->
    signer.sign(message, privateKey)
}
```

서명이 끝나면 `finally`에서 `privateKey.fill(0)`을 호출할 수 있다. 완벽한 메모리 삭제라고 말할 수는 없지만, 앱 코드가 직접 관리할 수 있는 민감 바이트 배열의 노출 시간을 줄이는 효과가 있다.

## Tink keyset은 또 무엇일까

Tink를 쓰다 보면 key와 keyset이라는 말이 나온다.

대략 이렇게 이해하면 된다.

```text
AEAD key
= 실제 암호화에 쓰이는 키

keyset
= 하나 이상의 키와 메타데이터를 담은 묶음

keyset handle
= keyset을 다루기 위한 객체
```

keyset에는 현재 암호화에 쓰는 primary key가 있을 수 있고, 키 교체를 위해 여러 키가 함께 관리될 수 있다. 새 데이터는 primary key로 암호화하고, 예전 데이터는 과거 키로도 복호화할 수 있게 만드는 식이다.

Android에서는 Tink keyset 자체도 안전하게 보호해야 한다. keyset을 평문으로 로컬 파일에 그대로 두면, 개인키를 암호화해도 암호화 키가 노출될 수 있다.

그래서 Android 환경에서는 keyset을 Android Keystore의 master key로 보호하는 구성을 사용할 수 있다.

```text
Android Keystore
-> master key 보호

Tink keyset
-> master key로 보호됨

AEAD primitive
-> keyset에서 꺼내 사용하는 암호화 도구
```

이 구조에서 Tink AEAD는 실제 데이터 암호화를 담당하고, Android Keystore는 그 암호화 키를 보호하는 상위 보호막 역할을 한다.

## AES-GCM을 직접 쓰는 것과 무엇이 다를까

Tink AEAD 구현에서 AES-GCM 템플릿을 사용할 수 있다. 그렇다고 앱 코드가 직접 AES-GCM을 조립하는 것과 같은 의미는 아니다.

직접 구현하면 이런 것들을 계속 직접 챙겨야 한다.

- nonce를 안전하게 생성하는가
- nonce를 재사용하지 않는가
- 인증 tag를 반드시 검증하는가
- 실패한 복호화를 안전하게 처리하는가
- 키를 어디에 어떤 형태로 저장하는가
- 알고리즘과 파라미터를 잘못 조합하지 않는가

Tink는 이런 부분을 높은 수준의 API로 감싸준다. 그래서 앱 코드에서는 `Aead`라는 목적 중심의 인터페이스를 사용하고, 세부 알고리즘 선택은 검증된 템플릿에 맡길 수 있다.

```kotlin
.withKeyTemplate(AeadKeyTemplates.AES256_GCM)
```

이런 코드는 "AES-256-GCM을 쓰겠다"는 선택은 드러내지만, 매번 nonce와 tag 처리를 직접 구현하지 않는다.

## 같은 평문이면 같은 암호문일까

보통 AEAD 암호화에서는 같은 평문을 같은 키로 암호화해도 매번 다른 암호문이 나올 수 있다. 내부적으로 nonce나 IV 같은 값이 달라지기 때문이다.

그래서 암호문을 비교해서 평문이 같은지 판단하면 안 된다.

```text
encrypt("hello")
-> ciphertext A

encrypt("hello")
-> ciphertext B

A와 B는 다를 수 있다.
```

이 성질은 자연스럽고 바람직하다. 같은 값이 저장되어도 암호문 패턴만 보고 평문이 같다고 추측하기 어렵게 만들기 때문이다.

만약 "같은 입력이면 같은 출력"이 필요한 암호화가 있다면, 일반 AEAD가 아니라 deterministic AEAD 같은 별도 primitive를 검토해야 한다. 하지만 개인키 저장처럼 단순히 값을 안전하게 보관하고 다시 읽는 용도라면 일반 AEAD가 더 자연스럽다.

## 실패를 예외로 숨기지 않기

복호화 실패는 버그일 수도 있지만, 보안 관점에서는 정상적으로 일어날 수 있는 상황이다.

```text
저장 파일이 손상됐다.
다른 associated data로 열려고 했다.
keyset이 바뀌었다.
암호문이 변조됐다.
앱 재설치나 백업 복원으로 Keystore 상태가 달라졌다.
```

그래서 복호화 코드는 실패를 명확히 처리해야 한다.

```kotlin
private fun decrypt(
    ciphertext: ByteArray,
    associatedData: ByteArray
): ByteArray? {
    return try {
        aead.decrypt(ciphertext, associatedData)
    } catch (_: GeneralSecurityException) {
        null
    }
}
```

여기서 실패 원인을 사용자에게 너무 자세히 노출할 필요는 없다. 하지만 앱 내부에서는 "복호화 실패"를 데이터 없음과 구분해서 볼 수 있게 설계하는 편이 좋다. 예를 들어 저장소 손상, 키 접근 실패, 사용자가 지갑을 다시 복구해야 하는 상태는 UX가 달라질 수 있다.

## 로그에 남기면 모든 게 무너진다

Tink AEAD로 암호화해 저장하더라도, 복호화한 값을 로그에 남기면 구조가 무너진다.

조심해야 할 값은 이런 것들이다.

- plaintext 개인키
- 니모닉
- seed
- 복호화된 `ByteArray`
- 사용자가 입력한 PIN
- raw 서명 요청 payload 중 민감한 값

암호화 저장은 저장소를 보호하는 일이다. 런타임에서 민감값을 어떻게 다루는지는 별도의 문제다.

그래서 민감 데이터를 다루는 코드는 아래 원칙을 같이 가져가야 한다.

```text
평문은 로그에 남기지 않는다.
복호화한 값은 짧게 사용한다.
가능하면 ByteArray로 다루고 사용 후 지운다.
String 변환은 최소화한다.
오류 메시지에 민감값을 넣지 않는다.
```

## 한 문장으로 정리하면

Tink AEAD는 이렇게 정리할 수 있다.

```text
Tink AEAD는 평문을 암호문으로 숨기고,
암호문과 associated data가 바뀌지 않았는지 검증하며,
잘못된 키나 문맥으로는 복호화되지 않게 해주는 암호화 primitive다.
```

Android 지갑 앱에서는 이 역할이 특히 중요하다.

```text
개인키 원문
-> Tink AEAD 암호화
-> 암호문 저장
-> 서명할 때만 복호화
-> 사용 후 wipe
```

여기서 Tink가 모든 보안을 대신해주는 것은 아니다. 키 저장, 사용자 인증, 로그 정책, 메모리 노출 시간, 백업/복구 정책은 여전히 앱이 설계해야 한다.

그래도 Tink AEAD를 쓰면 "암호화 알고리즘을 직접 조립하는 위험"을 줄이고, 앱 코드에서는 더 중요한 질문에 집중할 수 있다.

```text
이 데이터는 어떤 문맥에 묶여야 하는가?
언제 복호화되어야 하는가?
복호화된 값은 어디까지 전달되는가?
언제 지워지는가?
```

이 질문에 답할 수 있으면 Tink AEAD는 단순한 라이브러리 이름이 아니라, 지갑 앱의 키 생명주기를 안전하게 만들기 위한 한 조각으로 보이기 시작한다.

## 참고하면 좋은 문서

- [Tink - AEAD](https://developers.google.com/tink/aead)
- [Tink - Manage Keys](https://developers.google.com/tink/key-management-overview)
- [Android Keystore system](https://developer.android.com/privacy-and-security/keystore)
