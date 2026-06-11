---
title: "DataStore, Tink keyset, Android Keystore 관계 정리"
date: "2026-06-11"
category: "Android"
group: "Android Security"
series: "Android Security"
tags: ["android", "datastore", "tink", "aead", "keyset", "keystore", "encryption", "security"]
description: "DataStore에 저장된 암호문을 Tink AEAD가 어떻게 복호화하고, Tink keyset과 Android Keystore master key가 어떤 관계인지 정리합니다."
---

![DataStore, Tink keyset, Android Keystore 관계 흐름도](/images/android-datastore-keyset-masterkey-flow-handdrawn.png)

민감한 값을 로컬에 저장하는 구조를 보면 `DataStore`, `Tink AEAD`, `Tink keyset`, `Android Keystore`, `master key` 같은 말이 한꺼번에 나온다.

처음에는 이 말들이 서로 비슷하게 들린다.

```text
DataStore가 암호화해주는 건가?
암호문을 복호화하는 키가 keyset인가?
master key가 최종 복호화 키인가?
Keystore에는 개인키가 들어가는 건가?
```

헷갈리는 이유는 각 단어가 모두 "보안 저장" 근처에서 등장하기 때문이다. 하지만 실제로는 맡은 역할이 다르다.

이 글은 로컬 저장소에 암호문을 저장하는 구조를 기준으로, 각 계층의 책임을 나눠 보는 메모다.

## 먼저 한 문장으로 보기

전체 구조를 한 문장으로 줄이면 이렇게 볼 수 있다.

```text
DataStore에는 암호문을 저장하고,
Tink AEAD는 그 암호문을 만들고 다시 열며,
Tink keyset은 AEAD가 사용하는 키 묶음이고,
Android Keystore master key는 그 keyset을 보호한다.
```

역할만 분리하면 훨씬 덜 헷갈린다.

```text
DataStore
= 저장소

Tink AEAD
= 암호화/복호화 도구

Tink keyset
= Tink가 쓰는 암호화 키 묶음

Android Keystore master key
= keyset을 보호하는 상위 키
```

여기서 중요한 것은 DataStore와 Keystore를 같은 종류의 저장소처럼 보면 안 된다는 점이다.

```text
DataStore
= 앱 데이터나 암호문을 저장한다.

Android Keystore
= 암호화 키를 안전한 영역에서 생성하고 사용하게 한다.
```

둘 다 "Store"처럼 들리지만, DataStore는 데이터 저장소이고 Keystore는 키 관리 계층이다.

## DataStore에는 무엇이 저장될까

민감한 값을 저장해야 한다고 해보자.

예를 들어 개인키나 seed 같은 값을 그대로 DataStore에 넣으면 안 된다. DataStore는 암호화 저장소가 아니기 때문이다.

더 안전한 흐름은 아래와 같다.

```text
민감 데이터 원문
-> Tink AEAD로 암호화
-> 암호문을 DataStore에 저장
```

즉 DataStore에 저장되는 값은 평문이 아니라 암호문이어야 한다.

```text
plaintext
= 원문, 평문

ciphertext
= 암호화된 결과, 암호문
```

DataStore에는 보통 이런 값이 들어갈 수 있다.

```text
id
ciphertext
createdAt
version
keyId
```

여기서 `ciphertext`는 "사이퍼텍스트"라고 읽을 수 있지만, 한국어로는 그냥 암호문이라고 말하는 편이 자연스럽다.

핵심은 이거다.

```text
DataStore가 데이터를 안전하게 만들어주는 것이 아니라,
안전하게 만든 결과인 암호문을 DataStore에 저장한다.
```

## Tink AEAD는 무엇을 할까

Tink AEAD는 암호화와 복호화를 수행하는 도구다.

앱 코드에서는 보통 이런 식으로 보인다.

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

`encrypt()`는 평문을 암호문으로 바꾼다.

```text
평문
-> AEAD encrypt
-> 암호문
```

`decrypt()`는 암호문을 다시 평문으로 연다.

```text
암호문
-> AEAD decrypt
-> 평문
```

AEAD에서 중요한 점은 단순히 숨기는 것만 하지 않는다는 것이다. 암호문이 바뀌었거나, associated data가 다르거나, 키가 다르면 복호화가 실패해야 한다.

```text
같은 키 + 같은 associated data + 변경되지 않은 암호문
-> 복호화 성공

키가 다름
-> 실패

associated data가 다름
-> 실패

암호문이 바뀜
-> 실패
```

그래서 로컬 저장소에서는 AEAD가 "암호문을 만들고, 나중에 이 암호문이 같은 문맥에서 만들어진 것이 맞는지 확인하며 다시 여는 도구" 역할을 한다.

## 그럼 복호화 키는 keyset일까

여기서 자주 헷갈리는 질문이 나온다.

```text
DataStore에 저장된 암호문을 복호화할 때 쓰는 키가 keyset인가?
```

큰 방향에서는 맞다. 다만 더 정확하게는 이렇게 말하는 편이 좋다.

```text
Tink keyset 안에 AEAD가 사용할 암호화 키가 있고,
Tink는 그 keyset을 바탕으로 AEAD primitive를 만들어
encrypt/decrypt를 수행한다.
```

즉 앱 코드가 keyset 안의 raw key를 직접 꺼내서 복호화 함수에 넣는 구조가 아니다.

관계를 나눠보면 이렇다.

```text
Tink keyset
-> 하나 이상의 키와 메타데이터를 담은 묶음

Aead primitive
-> keyset을 기반으로 만들어진 암호화/복호화 도구

앱 코드
-> Aead 객체에 encrypt/decrypt를 요청
```

그래서 `aead.decrypt(ciphertext, associatedData)`를 호출하면, 앱이 직접 raw key를 다루는 것이 아니라 Tink가 keyset을 기반으로 복호화를 수행한다.

이 차이가 중요하다.

```text
부정확한 표현:
keyset으로 DataStore를 복호화한다.

더 정확한 표현:
Tink keyset을 기반으로 만든 AEAD가
DataStore에 저장된 암호문을 복호화한다.
```

일상적인 설명에서는 "암호문을 푸는 키가 keyset 안에 있다" 정도로 말해도 된다. 하지만 구조를 정확히 설명할 때는 keyset과 AEAD primitive를 구분하는 편이 좋다.

## keyset도 보호해야 한다

DataStore에는 암호문만 저장했다고 해보자. 그러면 끝일까?

아니다. 암호문을 열 수 있는 키가 어딘가에 있어야 한다.

그 키가 그대로 파일에 저장되어 있으면, 암호문을 저장한 의미가 약해진다.

```text
DataStore 암호문만 노출
-> keyset이 없으면 열기 어렵다.

DataStore 암호문 + keyset 원문 노출
-> 암호문을 열 수 있는 위험이 커진다.
```

그래서 Tink keyset 자체도 민감한 데이터로 봐야 한다.

Tink keyset에는 현재 암호화에 쓰는 키뿐 아니라, 키 ID, 키 상태, primary key 같은 메타데이터가 함께 들어갈 수 있다. 키 교체를 고려하면 하나 이상의 키가 keyset 안에서 관리될 수도 있다.

```text
keyset
= 현재 키
+ 이전 키
+ key id
+ key status
+ primary key 정보
```

이 keyset을 평문으로 그대로 로컬 파일에 두면, 누군가 keyset과 암호문을 함께 가져갔을 때 복호화 위험이 커진다.

그래서 Android에서는 keyset을 한 번 더 보호하는 계층이 필요하다.

## master key는 무엇을 보호할까

여기서 Android Keystore의 master key가 등장한다.

`master key`라는 이름 때문에 이 키가 DataStore에 저장된 암호문을 직접 복호화하는 키처럼 들릴 수 있다. 하지만 Tink keyset과 함께 보는 구조에서는 보통 이렇게 이해하는 게 더 정확하다.

```text
Tink keyset
= 실제 데이터 암호화에 쓰이는 키 묶음

Android Keystore master key
= 그 keyset을 보호하는 상위 키
```

즉 master key는 민감 데이터 원문을 직접 암호화하는 키라기보다, 그 민감 데이터를 암호화하는 데 쓰는 keyset을 보호하는 키에 가깝다.

비유하면 이렇다.

```text
민감 데이터
= 중요한 문서

Tink keyset
= 문서를 잠그고 여는 열쇠

Android Keystore master key
= 그 열쇠를 넣어둔 금고를 잠그는 상위 열쇠
```

이 구조를 envelope encryption처럼 볼 수도 있다.

```text
데이터
-> data encryption key로 암호화

data encryption key
-> key encryption key로 보호
```

여기서는 Tink keyset이 데이터 암호화 키 묶음에 가깝고, Android Keystore master key가 그 keyset을 보호하는 상위 키에 가깝다.

## 앱은 master key 원문을 받지 않는다

중요한 점이 하나 더 있다.

앱이 Android Keystore에서 master key 원문을 꺼내서 변수에 담는 구조가 아니다.

보통 앱은 alias나 Keystore URI로 "이 키를 사용해 달라"고 요청한다.

```text
android-keystore://my_master_key
```

이 표현은 대략 이런 의미다.

```text
Android Keystore 안의 my_master_key를
keyset 보호용 master key로 사용한다.
```

앱이 하는 일은 alias를 지정하는 것이다.

```text
앱
-> alias로 master key 사용 요청

Android Keystore
-> master key를 내부에서 사용
-> keyset 보호/해제 작업 수행

앱
-> master key 원문은 받지 않음
```

이 구조가 중요한 이유는 master key까지 앱 파일에 평문으로 남기면 결국 같은 문제가 반복되기 때문이다.

```text
암호문을 보호하려고 keyset을 만들었다.
keyset을 보호하려고 master key를 만들었다.
그런데 master key를 앱 파일에 저장했다.

-> 보호 계층이 약해진다.
```

Keystore의 목적은 이런 상위 키를 앱의 일반 파일 저장소 밖에서, 가능한 경우 하드웨어 보안 영역 안에서 보호하는 데 있다.

## 저장 흐름 다시 보기

저장 흐름은 이렇게 볼 수 있다.

```text
1. 앱이 민감 데이터 원문을 준비한다.
2. Tink가 keyset 기반 AEAD를 준비한다.
3. AEAD가 원문을 암호화한다.
4. 암호문을 DataStore에 저장한다.
5. keyset은 Android Keystore master key로 보호된 상태로 관리된다.
```

그림의 초록 화살표가 이 저장 흐름에 가깝다.

```text
평문
-> Tink AEAD encrypt
-> 암호문
-> DataStore 저장
```

여기서 DataStore는 암호문을 받는 저장소다. 암호화 자체는 Tink AEAD가 담당한다.

## 조회 흐름 다시 보기

조회 흐름은 반대다.

```text
1. 앱이 DataStore에서 암호문을 읽는다.
2. Tink가 보호된 keyset을 사용할 수 있는 상태로 준비한다.
3. AEAD가 암호문을 복호화한다.
4. 앱은 필요한 작업에만 평문을 짧게 사용한다.
```

그림의 보라 화살표가 이 흐름에 가깝다.

```text
DataStore 암호문
-> Tink AEAD decrypt
-> 평문
-> 필요한 작업 수행
```

여기서 "keyset을 사용할 수 있는 상태로 준비한다"는 말이 중요하다. 앱이 keyset의 raw key를 꺼내서 직접 복호화하는 것이 아니라, Tink가 keyset을 기반으로 AEAD를 제공하고 앱은 그 AEAD를 사용한다.

복호화된 평문은 오래 들고 있지 않는 편이 좋다.

```text
평문은 로그에 남기지 않는다.
필요한 작업에만 사용한다.
가능하면 ByteArray로 다루고 사용 후 지운다.
String 변환은 최소화한다.
```

저장소 암호화는 "디스크에 남는 값"을 보호하는 일이다. 런타임에서 평문을 어떻게 다루는지는 별도의 문제로 계속 남는다.

## 자주 헷갈리는 표현 다듬기

이 구조를 설명할 때는 아래처럼 표현을 다듬으면 덜 위험하다.

```text
DataStore가 개인키를 안전하게 저장한다.
-> DataStore에는 암호문만 저장한다.
```

```text
keyset으로 암호문을 복호화한다.
-> keyset을 기반으로 만든 Tink AEAD가 암호문을 복호화한다.
```

```text
master key로 개인키를 복호화한다.
-> master key는 Tink keyset을 보호하는 상위 키다.
```

```text
앱이 Keystore에서 master key를 가져온다.
-> 앱은 alias로 Keystore 키 사용을 요청하고, master key 원문은 직접 받지 않는다.
```

이 정도만 구분해도 구조가 훨씬 선명해진다.

## 전체 관계를 다시 한 번 정리하면

마지막으로 그림을 말로 다시 옮기면 이렇다.

```text
DataStore
= 암호문을 저장한다.

Tink AEAD
= 평문을 암호문으로 만들고,
  암호문을 다시 평문으로 복호화한다.

Tink keyset
= AEAD가 사용하는 키 묶음이다.

Android Keystore master key
= Tink keyset을 보호하는 상위 키다.

앱
= master key 원문을 직접 받지 않고,
  alias나 Keystore URI로 사용을 요청한다.
```

이 구조의 핵심은 책임 분리다.

```text
저장소는 저장만 한다.
암호화 도구는 암호화와 검증을 한다.
키 묶음은 암호화 키를 관리한다.
Keystore는 그 키 묶음을 보호하는 상위 키를 지킨다.
```

그래서 로컬에 민감 데이터를 저장할 때는 "DataStore를 썼다"만으로는 충분한 설명이 아니다.

더 정확하게는 이렇게 말해야 한다.

```text
민감 데이터 원문은 Tink AEAD로 암호화하고,
암호문만 DataStore에 저장한다.
AEAD가 사용하는 Tink keyset은 Android Keystore master key로 보호한다.
앱은 master key 원문을 직접 다루지 않는다.
```

이렇게 보면 DataStore, Tink, Keystore가 한 덩어리로 뭉개지지 않고, 각자 어떤 책임을 맡는지 분리해서 볼 수 있다.

## 참고하면 좋은 문서

- [Android Developers - DataStore](https://developer.android.com/topic/libraries/architecture/datastore)
- [Tink - AEAD](https://developers.google.com/tink/aead)
- [Tink - Key management](https://developers.google.com/tink/key-management-overview)
- [Android Keystore system](https://developer.android.com/privacy-and-security/keystore)
