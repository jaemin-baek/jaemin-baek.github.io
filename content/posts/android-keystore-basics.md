---
title: "Android Keystore 이해하기"
date: "2026-06-13"
category: "Blockchain"
group: "Blockchain Basics"
series: "Blockchain Basics"
tags: ["android", "keystore", "security", "strongbox", "tee", "key-attestation", "wallet"]
description: "Android Keystore가 무엇인지, 키 원본을 앱 밖에서 보호한다는 말의 의미, alias와 master key, TEE와 StrongBox, Tink keyset과의 관계를 정리합니다."
---

![Android Keystore 이해하기](/images/android-keystore-basics-cover.png)

Android에서 개인키나 암호화 키를 다루다 보면 `Android Keystore`라는 말을 자주 만난다. 처음에는 이름 때문에 "안전한 DB인가?", "키를 넣어두는 파일인가?", "앱이 필요할 때 키를 꺼내오는 건가?"처럼 느껴질 수 있다.

하지만 Android Keystore를 이렇게 이해하면 훨씬 덜 헷갈린다.

```text
Android Keystore는 키 원본을 앱 파일에 두지 않고,
OS 보안 계층 안에서 생성하고 보관하고 사용하게 해주는 키 관리 시스템이다.
```

여기서 중요한 말은 "사용"이다. 앱이 키 원본을 직접 꺼내서 들고 있는 구조가 아니라, 보통은 alias로 키를 가리키고 "이 키로 암호화해줘", "이 키로 서명해줘"처럼 연산을 요청한다.

```text
앱이 받는 것:
암호문, 복호화 결과, 서명값 같은 작업 결과

앱이 받지 않는 것:
Keystore 안에 있는 키의 원본 바이트
```

이 글은 Android 지갑 앱에서 키 저장 구조를 볼 때 자주 나오는 Keystore, alias, master key, TEE, StrongBox 같은 말을 정리한 메모다.

## Keystore는 데이터를 저장하는 DB가 아니다

가장 먼저 나눠야 할 것은 데이터 저장소와 키 저장소다.

```text
DataStore, Room, 파일
= 앱 데이터나 암호문을 저장하는 곳

Android Keystore
= 암호화나 서명에 쓰는 키를 생성하고 보호하고 사용하게 해주는 곳
```

예를 들어 개인키를 Tink AEAD로 암호화해서 로컬에 저장한다고 해보자.

```text
개인키 원문
-> Tink AEAD로 암호화
-> 암호문은 DataStore에 저장
```

이때 DataStore가 개인키를 안전하게 만들어주는 것은 아니다. DataStore는 암호문을 저장할 뿐이다. 실제 암호화 키를 어떻게 보호할지가 별도 문제로 남는다.

여기서 Android Keystore가 등장한다.

```text
Tink keyset
-> Android Keystore의 master key로 보호
```

즉 Keystore는 보통 "암호문을 저장하는 곳"이 아니라, **암호화에 쓰는 키를 보호하는 계층**에 가깝다.

## alias로 키를 사용한다는 것

Keystore에 있는 키는 이름표 같은 alias로 식별한다.

앱 코드는 대략 이런 식으로 생각할 수 있다.

```text
"my_key_alias"라는 키를 써서 암호화해줘.
"my_key_alias"라는 키를 써서 서명해줘.
```

여기서 앱이 받는 것은 키 원본이 아니라 작업 결과다.

![앱은 alias로 Android Keystore를 사용한다](/images/android-keystore-alias-master-key-handdrawn.png)

흐름을 단순화하면 이렇다.

```text
앱
-> alias로 Keystore에 작업 요청
-> Keystore가 내부 키로 연산
-> 결과 반환
```

이 구조가 중요한 이유는 키 원본을 앱 저장소에 두지 않기 때문이다. 앱의 일반 파일 영역이나 SharedPreferences에 키를 평문으로 저장하면, 앱 데이터가 노출될 때 키도 같이 노출될 수 있다.

Keystore를 쓰면 적어도 키 원본을 앱 파일에 직접 남기지 않을 수 있다.

```text
나쁜 방향:
암호화 키를 파일에 저장
-> 파일이 노출되면 키도 노출

좋은 방향:
키는 Keystore에서 생성/보관
-> 앱은 alias로 사용 요청
```

물론 Keystore를 쓴다고 모든 문제가 사라지는 것은 아니다. 앱이 복호화한 평문을 로그에 남기거나, 사용자 인증 없이 민감한 서명을 허용하거나, 백업/복원 상태를 고려하지 않으면 여전히 위험하다.

## Android Keystore의 간단한 역사

Android Keystore는 한 번에 지금 형태가 된 것이 아니다. Android 보안 모델이 발전하면서 조금씩 역할이 넓어졌다.

![Android Keystore의 역사](/images/android-keystore-history-handdrawn.png)

큰 흐름만 보면 이렇다.

```text
Android 4.0
-> KeyChain API

Android 4.3
-> Android Keystore Provider

Android 6.0
-> 대칭키와 키 사용 조건 강화

Android 7.0
-> Key Attestation 확장

Android 9
-> StrongBox 지원
```

Android 4.0의 `KeyChain`은 사용자 인증서나 시스템 자격 증명 관리에 가까운 API였다. 앱이 클라이언트 인증서 같은 것을 선택해 사용하는 흐름에서 볼 수 있다.

Android 4.3부터는 `AndroidKeyStore` provider를 통해 앱이 자기 전용 키를 만들고 저장하고 사용할 수 있는 구조가 본격적으로 제공됐다.

Android 6.0에서는 대칭키, 사용자 인증 조건, 키 사용 제한 같은 기능이 더 실용적으로 확장됐다. 예를 들어 "이 키는 암호화/복호화에만 쓰기", "사용자 인증 후 일정 시간 동안만 쓰기" 같은 정책을 붙일 수 있다.

Android 7.0 이후에는 key attestation이 중요해졌다. 서버가 "이 키가 정말 Android 보안 하드웨어 안에서 생성됐는가?", "어떤 보안 수준에서 보호되는가?" 같은 것을 인증서 체인으로 검증할 수 있는 방향이다.

Android 9부터는 StrongBox가 등장했다. 기기가 지원한다면 TEE보다 더 분리된 보안 하드웨어, 예를 들어 별도 보안 칩에 키를 보관하도록 요청할 수 있다.

정리하면 역사는 이렇게 볼 수 있다.

```text
인증서 사용
-> 앱 전용 키 저장
-> 대칭키와 사용 조건
-> 하드웨어 기반 증명
-> 더 강한 분리 보안 영역
```

## TEE는 무엇이고 StrongBox는 무엇일까

Keystore를 설명할 때 TEE와 StrongBox도 같이 나온다.

TEE는 `Trusted Execution Environment`의 줄임말이다. 일반 앱이나 일반 OS 영역과 분리된 실행 환경이라고 보면 된다. 가능한 경우 Keystore 키는 이 보안 영역에서 생성되고 사용된다.

```text
일반 앱 영역
= 앱 코드와 일반 메모리

TEE
= 더 신뢰할 수 있는 분리 실행 영역
```

StrongBox는 더 강한 형태의 하드웨어 격리로 이해하면 된다. Android 9부터 지원된 개념이고, 기기가 StrongBox를 지원하면 별도 보안 하드웨어 안에 키를 만들도록 요청할 수 있다.

```text
TEE
= AP 안의 보안 실행 환경인 경우가 많음

StrongBox
= 별도 보안 하드웨어에 가까운 더 강한 격리
```

다만 모든 Android 기기가 StrongBox를 지원하는 것은 아니다. 그래서 앱은 StrongBox가 있으면 사용하고, 없으면 일반 hardware-backed Keystore나 software-backed Keystore로 fallback하는 전략을 고려해야 한다.

즉 Keystore를 쓴다고 항상 StrongBox가 쓰이는 것은 아니다.

```text
Keystore 사용
!= 항상 StrongBox 사용

StrongBox 사용
= 기기 지원 + 앱이 요청 + 키 생성 성공 필요
```

## KeyGenParameterSpec으로 키의 성격을 정한다

Keystore 키를 만들 때는 단순히 "키 하나 만들어줘"가 아니라, 이 키가 어떤 용도로 쓰일지 같이 지정한다.

Android에서는 `KeyGenParameterSpec`으로 이런 조건을 설정할 수 있다.

```kotlin
val spec = KeyGenParameterSpec.Builder(
    "my_key_alias",
    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
)
    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
    .setUserAuthenticationRequired(true)
    .build()
```

이 코드는 예시일 뿐이다. 핵심은 키에 정책을 붙일 수 있다는 점이다.

예를 들어 이런 질문을 키 생성 시점에 결정한다.

```text
이 키는 암호화용인가, 서명용인가?
AES인가, RSA인가, EC인가?
GCM 모드를 쓸 것인가?
사용자 인증 후에만 쓸 것인가?
인증 후 몇 초 동안 유효한가?
StrongBox를 요청할 것인가?
```

키 사용 목적을 제한하면 실수의 여지를 줄일 수 있다. 암호화용으로 만든 키를 서명에 쓰거나, 서명용 키를 복호화에 쓰는 식의 잘못된 사용을 막을 수 있기 때문이다.

## 사용자 인증과 Keystore는 같은 것이 아니다

Keystore를 쓰면 PIN이나 생체 인증이 자동으로 붙는다고 생각하기 쉽다. 하지만 둘은 분리해서 봐야 한다.

```text
Keystore
= 키를 어디서 어떻게 보호하고 사용할지

사용자 인증
= 지금 이 사용자가 키 사용을 허용해도 되는지
```

Keystore 키에는 사용자 인증 조건을 붙일 수 있다. 예를 들어 "사용자가 잠금 화면 인증을 통과해야 이 키를 사용할 수 있다"는 식이다.

하지만 지갑 앱에서는 이것만으로 충분하지 않을 수 있다. 사용자가 어떤 트랜잭션에 서명하는지 보여주고, 앱 레벨에서 별도 확인 UI를 거치게 하는 것도 중요하다.

```text
Keystore 인증 조건
= 키 사용 가능 여부를 OS 레벨에서 제한

앱 승인 화면
= 사용자가 어떤 행위를 승인하는지 이해하게 함
```

특히 지갑에서 서명은 단순 로그인과 다를 수 있다. 어떤 서명은 자산 이동이나 권한 부여로 이어진다. 그래서 Keystore 보안과 사용자 승인 UX는 함께 봐야 한다.

## master key는 앱이 꺼내오는 값이 아니다

Tink와 Android Keystore를 함께 쓰면 master key라는 말이 나온다. 여기서 헷갈리기 쉽다.

마스터키를 "앱이 Keystore에서 꺼내서 변수에 담는 값"이라고 생각하면 안 된다. 보통 앱은 master key의 원본 바이트를 받지 않는다. alias나 Keystore URI로 그 키를 참조할 뿐이다.

Tink Android 연동에서는 이런 식의 표현을 볼 수 있다.

```text
android-keystore://my_key_alias
```

이 말은 대략 이렇게 해석할 수 있다.

```text
Android Keystore 안의 my_key_alias 키를
Tink keyset 보호용 master key로 사용하겠다.
```

즉 앱은 master key의 실제 값을 획득하지 않는다.

```text
앱이 하는 일:
alias를 지정한다.

Tink/Keystore가 하는 일:
해당 alias의 키를 만들거나 찾고,
그 키로 keyset을 보호하거나 해제한다.

앱이 하지 않는 일:
master key 원문을 직접 저장하거나 전달한다.
```

이 지점이 중요하다. 만약 master key를 앱이 평문으로 들고 있다면, 결국 그 키를 어디에 안전하게 저장할지 문제가 다시 생긴다. Keystore의 목적은 이 상위 키를 앱 파일 밖, 가능한 경우 하드웨어 보안 영역 안에서 지키는 것이다.

## Tink keyset과 Keystore의 관계

[[tink-aead-basics-android-wallet|Tink AEAD]] 글에서 keyset은 Tink가 암호화 키를 관리하는 묶음이라고 정리했다.

Android에서 이 keyset을 보호하는 한 가지 방식이 Keystore master key를 사용하는 것이다.

```text
개인키 원문
-> Tink AEAD keyset으로 암호화
-> 암호문은 로컬 저장소에 저장

Tink keyset
-> Android Keystore master key로 보호
```

계층으로 보면 이렇다.

```text
로컬 저장소
= 암호문 저장

Tink AEAD
= 데이터를 암호화/복호화

Tink keyset
= Tink가 쓰는 암호화 키 묶음

Android Keystore master key
= keyset을 보호하는 상위 키
```

이 구조에서 Keystore가 개인키를 직접 매번 암호화한다고 말하면 조금 부정확하다. 더 정확히는, Keystore가 Tink keyset을 보호하고, Tink AEAD가 실제 데이터 암호화에 쓰인다.

물론 다른 설계도 가능하다. Keystore 안의 키를 직접 사용해서 작은 데이터를 암호화하거나, 서명 키를 Keystore에서 직접 생성해 서명 연산을 맡길 수도 있다. 하지만 지갑 개인키처럼 외부 표준 서명 라이브러리와 연결해야 하는 값은 별도 암호화 저장 구조를 쓰는 경우가 많다.

## Key Attestation은 무엇일까

Key Attestation은 키가 어떤 환경에서 생성됐고 어떤 속성을 갖는지 증명하는 기능이다.

서버가 이런 것을 확인하고 싶을 수 있다.

```text
이 키는 Android Keystore에서 생성됐는가?
하드웨어 보안 영역에서 보호되는가?
사용자 인증 조건이 붙어 있는가?
기기가 변조된 상태는 아닌가?
```

Attestation을 사용하면 기기는 키와 관련된 인증서 체인을 제공하고, 서버는 그 인증서를 검증할 수 있다. 이 기능은 결제, 인증, 높은 보안이 필요한 환경에서 중요해질 수 있다.

다만 모든 앱이 attestation까지 써야 하는 것은 아니다. 로컬 비밀 저장소를 만들 때는 먼저 키가 앱 저장소에 평문으로 남지 않도록 하고, 암호문과 키 생명주기를 안전하게 관리하는 것이 출발점이다.

Attestation은 그 다음 단계에서 "서버가 이 키의 출처와 보안 수준까지 믿어도 되는가"를 다루는 주제에 가깝다.

## Keystore가 막아주는 것과 못 막아주는 것

Keystore는 강력하지만 만능은 아니다.

도와주는 것은 이런 쪽이다.

- 키 원본을 앱 파일에 직접 저장하지 않는다.
- 가능한 경우 키를 하드웨어 보안 영역에서 보호한다.
- 키 사용 목적을 제한할 수 있다.
- 사용자 인증 조건을 붙일 수 있다.
- key attestation으로 키 출처를 증명할 수 있다.

하지만 이런 문제까지 자동으로 해결하지는 않는다.

- 복호화된 평문을 앱이 로그에 남기는 문제
- 사용자가 피싱 화면에서 서명을 승인하는 문제
- 앱이 승인 UX 없이 자동 서명하는 문제
- 루팅/디버깅/메모리 공격 같은 런타임 위협
- 백업/복원 후 Keystore 키와 암호문이 맞지 않는 문제
- 기기마다 StrongBox 지원 여부가 다른 문제

그래서 Keystore는 전체 보안 구조의 한 층으로 봐야 한다.

```text
Keystore
= 키를 안전하게 보호하고 사용하게 해주는 계층

앱 보안 설계
= 언제 키를 쓰고, 무엇을 보여주고, 무엇을 저장하고, 무엇을 로그에 남기지 않을지 결정하는 계층
```

## 한 문장으로 정리하면

Android Keystore는 이렇게 정리할 수 있다.

```text
Android Keystore는 앱이 키 원본을 직접 저장하거나 꺼내지 않고,
OS 보안 계층에 alias로 키 사용을 요청할 수 있게 해주는 키 관리 시스템이다.
```

Tink와 함께 쓰는 구조에서는 이렇게 보면 된다.

```text
Tink AEAD
= 개인키 같은 데이터를 암호화한다.

Tink keyset
= Tink가 쓰는 암호화 키 묶음이다.

Android Keystore master key
= 그 keyset을 보호하는 상위 키다.

앱
= master key 원문을 꺼내지 않고 alias로 사용을 요청한다.
```

결국 핵심은 이 한 줄이다.

```text
Keystore는 데이터를 저장하는 DB가 아니라,
데이터를 지키는 데 필요한 키를 안전하게 생성하고 사용하는 Android 보안 계층이다.
```

이 관점이 잡히면 [[android-wallet-secret-storage-keystore-tink|Android Keystore와 Tink AEAD로 개인키 저장하기]] 같은 구조도 덜 낯설어진다. 로컬 저장소에는 암호문만 남기고, Tink는 데이터를 암호화하고, Keystore는 그 암호화 키를 보호하는 식으로 각 계층의 책임이 나뉜다.

## 참고하면 좋은 문서

- [Android Keystore system](https://developer.android.com/privacy-and-security/keystore)
- [Android KeyChain](https://developer.android.com/reference/android/security/KeyChain)
- [KeyGenParameterSpec](https://developer.android.com/reference/android/security/keystore/KeyGenParameterSpec)
- [AOSP - Keystore](https://source.android.com/docs/security/features/keystore)
- [AOSP - Key Attestation](https://source.android.com/docs/security/features/keystore/attestation)
- [AOSP - StrongBox](https://source.android.com/docs/security/features/keystore#strongbox)
