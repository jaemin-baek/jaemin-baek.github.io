---
title: "EIP-712 구조화 서명 이해하기"
date: "2026-06-06"
category: "Blockchain"
group: "Blockchain Basics"
series: "Blockchain Basics"
tags: ["blockchain", "ethereum", "eip-712", "typed-data", "wallet", "signature", "permit", "android"]
description: "EIP-712가 typed structured data를 어떻게 사람이 읽을 수 있는 서명 요청으로 만들고, domainSeparator와 hashStruct가 replay attack을 줄이는지 정리합니다."
---

![EIP-712 구조화 서명 이해하기](/images/eip-712-typed-data-cover.png)

지갑 앱에서 메시지 서명을 다루다 보면 `signTypedData`, `TypedData`, `EIP-712` 같은 표현을 자주 만난다.

처음에는 그냥 `personal_sign`보다 복잡한 메시지 서명처럼 보인다.

하지만 EIP-712의 목적은 꽤 분명하다.

```text
사용자가 사람이 읽을 수 있는 구조화된 데이터에 서명하게 하자.
그리고 이 서명이 어느 서비스, 어느 체인, 어느 컨트랙트에 대한 것인지 분리하자.
```

이 글은 [[eip-191-message-signing|EIP-191 메시지 서명]]에서 이어지는 글이다. EIP-191이 signed data의 큰 봉투라면, EIP-712는 그 안에서 구조화 데이터를 안전하게 hash하고 서명하는 방법에 가깝다.

## 먼저 한 문장으로 보기

EIP-712를 한 문장으로 줄이면 이렇게 볼 수 있다.

```text
EIP-712는 객체 형태의 데이터를 domain, types, message로 나눠 hash하고,
사용자가 읽을 수 있는 형태로 서명하게 해주는 typed data 서명 표준이다.
```

일반 메시지 서명은 문자열 하나를 보여주는 경우가 많다.

```text
Sign in to Example
Nonce: abc123
```

반면 EIP-712는 데이터의 구조를 명시한다.

```text
domain:
  name
  version
  chainId
  verifyingContract

types:
  Permit(owner, spender, value, nonce, deadline)

message:
  owner = 0x...
  spender = 0x...
  value = 100
  nonce = 7
  deadline = 1715000000
```

이렇게 구조가 있으면 지갑이 사용자에게 더 의미 있는 화면을 보여줄 수 있다.

## 왜 구조화 서명이 필요할까

단순 문자열 서명은 구현하기 쉽다.

하지만 데이터가 복잡해질수록 사용자가 무엇에 서명하는지 알기 어렵다.

예를 들어 토큰 권한 위임을 메시지로만 보여준다고 생각해보자.

```text
Approve 100 TOKEN to 0xDEF...
```

이 문장만으로는 부족할 수 있다.

어느 체인인가?

어느 컨트랙트인가?

언제까지 유효한가?

몇 번째 nonce인가?

어떤 필드가 실제 서명 대상인가?

EIP-712는 이런 정보를 구조로 분리한다.

```text
어느 서비스/컨트랙트의 서명인가:
domain

어떤 형태의 데이터인가:
types

실제 값은 무엇인가:
message
```

그래서 지갑 앱은 단순 hex나 긴 문자열 대신, 필드별 의미를 보여줄 수 있다.

## EIP-712 데이터는 어떻게 생겼을까

EIP-712 요청은 보통 크게 세 부분으로 볼 수 있다.

| 구분 | 의미 |
| --- | --- |
| `domain` | 이 서명이 어느 서비스, 체인, 컨트랙트에 묶이는지 |
| `types` | 서명할 데이터의 구조 |
| `message` | 실제 서명할 값 |

예를 들어 permit 서명은 이런 식으로 생각할 수 있다.

```text
domain:
  name: MyToken
  version: 1
  chainId: 1
  verifyingContract: 0xToken...

types:
  Permit:
    owner: address
    spender: address
    value: uint256
    nonce: uint256
    deadline: uint256

message:
  owner: 0xAAA...
  spender: 0xBBB...
  value: 1000000000000000000
  nonce: 7
  deadline: 1715000000
```

사용자는 이 데이터를 보고 "누가, 누구에게, 얼마만큼, 언제까지 권한을 준다"를 이해할 수 있어야 한다.

지갑 앱은 이 구조를 그대로 JSON처럼 보여주기보다, 가능한 범위에서 의미를 풀어 보여주는 편이 좋다.

```text
요청:
토큰 사용 권한 서명

사용자:
0xAAA...

권한 대상:
0xBBB...

수량:
1 TOKEN

만료:
2026-06-06 12:00
```

## 해시 구조

EIP-712의 최종 서명 대상은 아래 흐름으로 만들어진다.

![EIP-712 해시 구조](/images/eip-712-hash-structure-handdrawn.png)

단순화하면 이렇게 볼 수 있다.

```text
0x1901
+ domainSeparator
+ hashStruct(message)
```

그리고 이 값을 `keccak256`으로 hash한 뒤 개인키로 서명한다.

여기서 `0x1901`은 [[eip-191-message-signing|EIP-191]]과 이어지는 부분이다.

```text
0x19:
EIP-191 signed data prefix

0x01:
structured data, 즉 EIP-712 버전
```

그래서 EIP-712는 완전히 별개의 서명 세계라기보다, EIP-191의 version `0x01`을 사용하는 구조화 데이터 서명 흐름으로 이해하면 좋다.

## domainSeparator는 왜 중요할까

`domainSeparator`는 이 서명이 어느 영역에서 유효한지 묶어주는 값이다.

대표적으로 이런 값들이 들어갈 수 있다.

| 필드 | 의미 |
| --- | --- |
| `name` | 서비스 또는 컨트랙트 이름 |
| `version` | 도메인 버전 |
| `chainId` | 어느 체인에서 유효한지 |
| `verifyingContract` | 검증할 컨트랙트 주소 |
| `salt` | 추가 구분값 |

모든 필드가 항상 필요한 것은 아니지만, `chainId`와 `verifyingContract`는 replay attack을 줄이는 데 중요한 역할을 한다.

예를 들어 같은 permit 메시지가 두 체인에서 똑같이 유효하면 위험하다.

```text
Ethereum mainnet에서 의도한 서명
-> 다른 EVM 체인에서 재사용되면 안 됨
```

`chainId`가 domain에 포함되면 이 서명은 특정 체인에 묶인다.

또 `verifyingContract`가 포함되면 특정 컨트랙트에서 검증할 서명이라는 맥락이 생긴다.

```text
같은 owner, spender, value라도
chainId나 verifyingContract가 다르면
최종 hash가 달라진다.
```

## nonce와 deadline은 왜 자주 보일까

EIP-712 예제에서 `nonce`와 `deadline`이 자주 보인다.

이 둘은 EIP-712 자체만의 필수 필드는 아니다. 하지만 permit, meta transaction, 위임 서명 같은 흐름에서 매우 자주 쓰인다.

`nonce`는 같은 서명이 여러 번 재사용되는 것을 줄인다.

```text
nonce 7 서명 사용
-> 컨트랙트가 nonce를 8로 증가
-> 같은 nonce 7 서명은 다시 사용할 수 없음
```

`deadline`은 서명의 유효 시간을 제한한다.

```text
deadline 이전:
검증 가능

deadline 이후:
만료된 서명으로 거절
```

이 두 값이 없으면 과거 서명이 너무 오래 살아남을 수 있다.

그래서 지갑 화면에서도 nonce와 deadline은 가능한 한 숨기지 않는 편이 좋다. 특히 deadline은 사용자가 이해할 수 있는 시간 형태로 바꿔 보여주는 것이 좋다.

## personal_sign과 어떻게 다를까

EIP-712와 `personal_sign`은 모두 메시지 서명처럼 보일 수 있다.

하지만 사용자 경험과 검증 구조가 다르다.

| 구분 | personal_sign | EIP-712 |
| --- | --- | --- |
| 데이터 형태 | 문자열 중심 | 구조화된 typed data |
| 사용자 표시 | 긴 문장 또는 원문 메시지 | 필드별 의미 표시 가능 |
| 도메인 분리 | 메시지 내용에 직접 넣어야 함 | domainSeparator로 분리 |
| 대표 메서드 | `personal_sign` | `eth_signTypedData` 계열 |
| 대표 사용 | 로그인, 단순 인증 | permit, 위임, typed approval |

단순 로그인 메시지는 `personal_sign`으로도 충분할 수 있다.

하지만 토큰 권한 위임, 컨트랙트 검증 서명, meta transaction처럼 필드가 명확한 요청은 EIP-712가 더 적합한 경우가 많다.

## Android 지갑 앱에서 볼 것

Android 지갑 앱에서 EIP-712를 처리할 때는 단순히 JSON을 받아 서명하는 것으로 끝나면 안 된다.

확인할 부분이 많다.

| 책임 | 확인할 것 |
| --- | --- |
| 요청 파싱 | `domain`, `types`, `primaryType`, `message`가 올바른지 |
| 체인 확인 | `domain.chainId`와 현재 지갑 네트워크가 맞는지 |
| 컨트랙트 표시 | `verifyingContract`를 사용자에게 보여주는지 |
| 타입 해석 | `Permit`, `Order`, `Delegation` 같은 primary type을 구분하는지 |
| 값 표시 | address, uint256, deadline 등을 사람이 읽을 수 있게 변환하는지 |
| 서명 | `0x1901 + domainSeparator + hashStruct` 흐름으로 서명하는지 |
| 보안 | 개인키를 로컬에서만 사용하고 signature만 반환하는지 |

특히 `chainId` 불일치는 꼭 막아야 한다.

사용자는 지갑에서 Polygon을 보고 있다고 생각하는데, 실제 typed data의 domain에는 다른 chainId가 들어 있을 수 있다.

```text
현재 지갑 네트워크:
chainId 137

typed data domain:
chainId 1

=> 사용자에게 경고하거나 서명을 막아야 함
```

## Permit 예제로 보기

EIP-712를 이해할 때 가장 자주 만나는 예시는 permit이다.

기존 ERC-20 권한 위임은 보통 온체인 `approve` 트랜잭션을 보낸다.

```text
approve(spender, value)
-> 트랜잭션
-> gas 필요
-> 블록에 포함
```

permit 계열은 사용자가 EIP-712 메시지에 서명하고, 그 서명을 나중에 컨트랙트에 제출해 권한을 설정할 수 있게 한다.

```text
사용자
-> Permit typed data 서명
-> signature 생성

서비스 또는 relayer
-> permit(owner, spender, value, deadline, signature)
-> 컨트랙트가 서명 검증
-> allowance 변경
```

사용자 입장에서는 "서명만 했는데 권한이 생길 수 있다"는 점이 중요하다.

즉 EIP-712 서명은 gas가 들지 않는 오프체인 서명일 수 있지만, 그 서명이 나중에 온체인 상태 변경의 재료가 될 수 있다.

그래서 지갑 화면에서는 단순히 "메시지 서명"이라고만 보여주면 부족하다.

```text
이 서명은 나중에 토큰 사용 권한을 부여하는 데 쓰일 수 있습니다.
```

같은 맥락을 사용자가 이해할 수 있어야 한다.

## 자주 헷갈리는 것

첫째, EIP-712는 트랜잭션이 아니다.

서명 자체는 오프체인에서 만들어질 수 있다. 하지만 그 서명값이 컨트랙트에 제출되면 온체인 상태 변경에 사용될 수 있다.

둘째, 사람이 읽을 수 있다고 해서 자동으로 안전한 것은 아니다.

지갑이 typed data를 잘못 해석하거나, 중요한 필드를 숨기면 사용자는 위험한 서명에 동의할 수 있다.

셋째, `value`는 항상 사람이 기대하는 단위가 아니다.

typed data의 `value`는 보통 정수다. 토큰 decimals를 고려하지 않고 그대로 보여주면 `1000000000000000000` 같은 값이 나온다. 지갑은 가능한 경우 토큰 메타데이터와 decimals를 이용해 사람이 읽을 수 있게 바꿔야 한다.

## 처음에는 이렇게 외우기

EIP-712는 이렇게 잡으면 된다.

```text
EIP-712:
구조화된 데이터를 사람이 읽을 수 있게 서명하기 위한 표준

핵심 구조:
domain + types + message

최종 hash:
0x1901 + domainSeparator + hashStruct(message)

지갑 앱 관점:
chainId, verifyingContract, nonce, deadline을 반드시 주의해서 보여준다.
```

면접에서 짧게 말하면 이렇게 정리할 수 있다.

```text
EIP-712는 typed structured data 서명 표준입니다.
단순 문자열 대신 domain, types, message를 나눠 hash하고,
chainId와 verifyingContract를 domain에 포함해 서명 맥락을 분리합니다.
지갑 앱에서는 signTypedData 요청을 파싱해 사용자가 owner, spender, value, deadline 같은 필드를 읽을 수 있게 보여주는 것이 중요합니다.
```

## 참고하면 좋은 공식 문서

- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)
- [ERC-191: Signed Data Standard](https://eips.ethereum.org/EIPS/eip-191)

## 정리

EIP-712는 지갑 서명을 더 구조화하고, 더 사람이 읽을 수 있게 만들기 위한 표준이다.

```text
domain
-> 이 서명이 어느 서비스/체인/컨트랙트에 묶이는지

types
-> 데이터 구조가 무엇인지

message
-> 실제 값이 무엇인지
```

Android 지갑 앱에서는 EIP-712 요청을 단순 JSON으로 보지 말고, 사용자에게 의미 있는 승인 화면으로 바꿔야 한다.

특히 permit이나 권한 위임처럼 나중에 온체인 상태 변경으로 이어질 수 있는 서명은 더 조심해서 보여줘야 한다.

결국 EIP-712를 이해한다는 것은 "서명할 메시지"를 문자열이 아니라 구조화된 권한 요청으로 읽는 일이다.
