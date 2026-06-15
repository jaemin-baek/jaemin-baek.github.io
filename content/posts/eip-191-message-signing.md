---
title: "EIP-191 메시지 서명 이해하기"
date: "2026-06-06"
category: "Blockchain"
group: "Blockchain Basics"
series: "Blockchain Basics"
tags: ["blockchain", "ethereum", "eip-191", "wallet", "signature", "personal-sign", "android"]
description: "EIP-191이 왜 메시지 서명 앞에 prefix와 version byte를 붙이는지, personal_sign과 트랜잭션 서명의 차이를 Android 지갑 앱 관점에서 정리합니다."
---

![EIP-191 메시지 서명 이해하기](/images/eip-191-message-signing-cover.png)

지갑 앱에서 서명이라고 하면 처음에는 전부 비슷해 보인다.

```text
개인키로 서명한다.
서명값을 서버나 네트워크에 보낸다.
서명자를 검증한다.
```

하지만 실제로는 서명 대상이 다르다.

트랜잭션 서명은 블록체인 상태를 바꿀 수 있는 요청에 서명하는 것이고, 메시지 서명은 로그인이나 약관 동의처럼 오프체인 문장에 서명하는 경우가 많다.

EIP-191은 이 중 **signed data**, 즉 임의의 데이터에 서명할 때 어떤 형태로 감싸야 하는지를 정의하는 표준이다.

이 글은 EIP-191을 암호학적으로 깊게 파고드는 글은 아니다. [[nonce-wallet-login|지갑 로그인 nonce]], [[simple-payment-blockchain-signature|블록체인 서명]], [[android-wallet-evm-transaction-flow|EVM 트랜잭션 전송]] 글에서 봤던 흐름을 이어서, Android 지갑 앱이 `personal_sign` 같은 메시지 서명 요청을 어떻게 봐야 하는지 정리한다.

## 먼저 한 문장으로 보기

EIP-191을 한 문장으로 줄이면 이렇게 볼 수 있다.

```text
EIP-191은 서명할 데이터 앞에 0x19와 version 정보를 붙여,
이 서명이 어떤 종류의 데이터에 대한 서명인지 구분하게 해주는 표준이다.
```

핵심은 `0x19`와 version byte다.

EIP-191의 기본 형태는 이렇게 볼 수 있다.

```text
0x19
+ 1 byte version
+ version specific data
+ data to sign
```

왜 굳이 앞에 무언가를 붙일까?

가장 큰 이유는 **서명 대상의 의미를 분리하기 위해서**다.

사용자가 메시지에 서명했다고 해서, 그 서명이 바로 트랜잭션처럼 실행되면 안 된다. 반대로 트랜잭션 서명과 로그인 메시지 서명이 같은 형태로 섞여도 위험하다.

```text
메시지 서명:
서비스에 "내가 이 주소의 소유자다"를 증명

트랜잭션 서명:
네트워크에 "이 상태 변경을 실행해도 된다"를 증명
```

EIP-191은 이 둘이 같은 서명 도구를 쓰더라도, 서명할 데이터의 봉투를 다르게 만든다.

## 전체 흐름

EIP-191 메시지 서명 흐름은 이렇게 볼 수 있다.

![EIP-191 메시지 서명 흐름](/images/eip-191-flow-handdrawn.png)

단순화하면 이렇다.

```text
원문 메시지
-> prefix와 version 정보 추가
-> hash 계산
-> 개인키로 서명
-> signature 생성
-> 주소 복구로 검증
```

사용자가 보는 화면은 "이 메시지에 서명하시겠습니까?"처럼 보일 수 있다.

하지만 실제 서명 대상은 원문 메시지 그대로가 아니라, EIP-191 규칙에 따라 감싼 데이터다.

대표적인 `personal_sign` 계열 메시지는 이런 형태로 볼 수 있다.

```text
"\x19Ethereum Signed Message:\n"
+ message length
+ message
```

그래서 같은 문장이라도 어떤 prefix를 붙였는지에 따라 최종 hash와 signature가 달라진다.

## 0x19는 왜 붙을까

EIP-191에서 가장 눈에 띄는 값은 `0x19`다.

이 값은 signed data가 일반 트랜잭션처럼 해석되지 않도록 앞에 붙는 구분자에 가깝다.

처음에는 작아 보이지만, 지갑 앱에서는 이 구분이 중요하다.

```text
사용자가 로그인 메시지에 서명했다.
-> 이 서명이 트랜잭션으로 실행되면 안 된다.

사용자가 트랜잭션에 서명했다.
-> 이 서명은 네트워크 상태 변경에 쓰인다.
```

즉 `0x19`는 "이건 일반 Ethereum 트랜잭션 RLP가 아니라, 별도의 signed data 형식이다"라는 표시로 이해하면 편하다.

## Version byte는 무엇을 구분할까

EIP-191은 `0x19` 뒤에 1바이트 version을 둔다.

대표적으로 이런 값들이 있다.

| version | 의미 |
| --- | --- |
| `0x00` | intended validator를 포함하는 데이터 |
| `0x01` | EIP-712 구조화 데이터 |
| `0x45` | `personal_sign`에서 자주 보는 Ethereum Signed Message |

여기서 `0x45`는 ASCII 문자 `E`에 해당한다.

그래서 `personal_sign` 계열에서 보이는 prefix는 이렇게 이어진다.

```text
0x19 + "Ethereum Signed Message:\n" + length + message
```

개발할 때는 "EIP-191 = personal_sign"으로만 외우면 조금 좁다.

더 정확히는 EIP-191이 signed data의 큰 봉투를 정의하고, `personal_sign`은 그중 `0x45` 버전으로 자주 쓰이는 방식에 가깝다.

## personal_sign은 어디에 쓰일까

지갑 앱에서 `personal_sign`은 보통 로그인이나 단순 메시지 확인에 쓰인다.

예를 들어 Web3 로그인 흐름에서는 서버가 nonce를 만들고, 사용자는 그 nonce가 포함된 메시지에 서명한다.

```text
서비스 서버
-> nonce 발급
-> 로그인 메시지 생성

지갑
-> 메시지 표시
-> 개인키로 personal_sign
-> signature 반환

서비스 서버
-> signature에서 주소 복구
-> 요청 주소와 같은지 확인
-> nonce 사용 완료 처리
```

여기서 중요한 점은 메시지 서명이 온체인 트랜잭션을 만들지 않는다는 것이다.

`personal_sign`을 했다고 해서 gas가 들지 않는다. 블록에 기록되지도 않는다. 서버가 그 서명값을 보고 "이 주소의 개인키를 가진 사용자가 이 메시지를 승인했구나"라고 판단하는 데 쓴다.

그래서 [[nonce-wallet-login|지갑 로그인 nonce]] 글에서 본 것처럼 nonce, domain, issuedAt, expirationTime 같은 값이 중요해진다.

## 트랜잭션 서명과 어떻게 다를까

EIP-191 메시지 서명과 트랜잭션 서명은 모두 개인키를 사용한다.

하지만 서명 대상과 결과의 사용처가 다르다.

| 구분 | EIP-191 메시지 서명 | 트랜잭션 서명 |
| --- | --- | --- |
| 대상 | 메시지 또는 임의 데이터 | `to`, `value`, `data`, `nonce`, gas, chainId가 포함된 트랜잭션 |
| 결과 | 서버 검증, 주소 복구 등에 사용 | 네트워크에 제출 가능한 signed raw transaction |
| gas | 들지 않음 | 들 수 있음 |
| 블록 포함 | 없음 | 블록에 포함될 수 있음 |
| 대표 사용 | 로그인, 약관 동의, 단순 인증 | 송금, 토큰 전송, 컨트랙트 호출 |

이 차이를 모르면 지갑 화면을 설계할 때 위험하다.

사용자는 "서명" 버튼 하나만 보지만, 내부 의미는 완전히 다를 수 있다.

```text
메시지 서명:
"이 문장에 동의합니다"

트랜잭션 서명:
"이 상태 변경을 실행해도 됩니다"
```

지갑 앱은 이 둘을 UI와 코드 경로에서 명확하게 나눠야 한다.

## Android 지갑 앱에서 볼 것

Android 지갑 앱에서 EIP-191 메시지 서명을 처리할 때는 보통 이런 책임을 나눠볼 수 있다.

| 책임 | 확인할 것 |
| --- | --- |
| 요청 파싱 | `personal_sign`인지, typed data인지, transaction signing인지 구분 |
| 메시지 표시 | 사용자가 읽을 수 있는 원문 메시지를 보여주는지 |
| 도메인 확인 | 어떤 서비스가 요청했는지 표시하는지 |
| 인증 | PIN이나 생체 인증을 통과한 뒤 서명하는지 |
| 키 사용 | 개인키를 잠깐 로드하고 서명 후 wipe하는지 |
| 반환 | signature만 반환하고 개인키는 절대 밖으로 내보내지 않는지 |

특히 WalletConnect 같은 흐름에서는 외부 dApp이 지갑에 서명을 요청한다.

이때 지갑은 단순 전달자가 아니다. 사용자가 서명하는 메시지를 가능한 한 사람이 읽을 수 있게 보여줘야 한다.

```text
나쁜 화면:
0x48656c6c6f...

좋은 화면:
서비스: example.com
요청: 로그인
메시지: Sign in with Ethereum...
Nonce: 7f3a...
만료 시간: 2026-06-06 12:00
```

물론 모든 메시지를 완벽하게 해석할 수는 없다. 하지만 최소한 "이건 트랜잭션이 아니라 메시지 서명"이라는 점은 분명히 보여줘야 한다.

## 주소 복구는 왜 가능할까

서명 검증에서 자주 나오는 말이 "주소를 복구한다"다.

Ethereum 계열 서명에서는 signature와 원래 서명 대상 hash를 이용해 공개키 또는 주소를 복구할 수 있다. 서버는 이 복구된 주소가 사용자가 주장한 주소와 같은지 비교한다.

```text
message
-> EIP-191 prefix 적용
-> hash
-> signature
-> recover address
```

검증할 때 조심할 점은 서버와 지갑이 같은 메시지를 같은 방식으로 hash해야 한다는 것이다.

서버는 원문 메시지에 대해 검증하는 것이 아니라, 지갑이 서명한 것과 같은 EIP-191 prefix 규칙을 적용한 hash를 기준으로 검증해야 한다.

## 자주 헷갈리는 것

첫째, `personal_sign`은 송금이 아니다.

사용자가 `personal_sign`으로 로그인 메시지에 서명해도 gas가 들지 않는다. 네트워크 상태도 바뀌지 않는다.

둘째, 메시지 서명이라고 해서 항상 안전한 것은 아니다.

메시지 안에 어떤 권한 위임이나 약관 동의가 들어갈 수 있다. 사용자는 "가스가 안 드니까 안전하다"고 느낄 수 있지만, 서비스가 그 서명값을 어떤 의미로 사용하는지 봐야 한다.

셋째, EIP-191과 EIP-712는 경쟁 관계가 아니다.

EIP-712는 구조화 데이터를 사람이 읽기 좋게 서명하기 위한 표준이고, EIP-191의 version `0x01` 흐름과 연결된다. 그래서 EIP-191은 큰 봉투, EIP-712는 구조화 메시지 서명 방식으로 이해하면 편하다.

## 처음에는 이렇게 외우기

EIP-191은 이렇게 잡으면 된다.

```text
EIP-191:
메시지 서명을 트랜잭션 서명과 구분하기 위한 signed data 봉투

personal_sign:
EIP-191의 0x45 버전으로 자주 쓰이는 메시지 서명 방식

핵심:
0x19 prefix를 붙여 "이건 트랜잭션이 아니다"를 명확히 한다
```

면접에서 짧게 말하면 이렇게 정리할 수 있다.

```text
EIP-191은 임의 메시지 서명에 prefix와 version 정보를 붙여,
트랜잭션 서명과 메시지 서명을 구분하게 해주는 표준입니다.
지갑 로그인에서 personal_sign으로 nonce가 포함된 메시지에 서명하고,
서버는 같은 prefix 규칙으로 hash한 뒤 signature에서 주소를 복구해 검증합니다.
```

## 참고하면 좋은 공식 문서

- [ERC-191: Signed Data Standard](https://eips.ethereum.org/EIPS/eip-191)
- [EIP-712: Typed structured data hashing and signing](https://eips.ethereum.org/EIPS/eip-712)

## 정리

EIP-191은 메시지 서명을 안전하게 구분하기 위한 표준이다.

```text
원문 메시지
-> 0x19 prefix
-> version 정보
-> hash
-> 개인키 서명
-> signature
```

Android 지갑 앱에서는 이 흐름을 트랜잭션 서명과 분리해서 다뤄야 한다.

사용자에게는 "이 서명으로 gas가 나가지는 않지만, 이 메시지에 동의한다는 증거가 만들어진다"는 맥락을 보여줘야 한다.

결국 EIP-191을 이해한다는 것은 "서명했다"라는 말을 더 정확히 나누는 일이다.
