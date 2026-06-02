---
title: "RawTransaction은 어떻게 만들어지고 서명되어 전송될까?"
date: "2026-06-02"
category: "Blockchain"
group: "Blockchain Basics"
series: "Blockchain Basics"
tags: ["blockchain", "ethereum", "evm", "wallet", "rawtransaction", "transaction", "signature", "android"]
description: "Android 지갑 앱에서 EVM RawTransaction을 만들고, 개인키로 서명하고, eth_sendRawTransaction으로 전송한 뒤 txHash와 receipt로 상태를 추적하는 흐름을 정리합니다."
---

![RawTransaction 만들고 서명하고 전송하기](/images/raw-transaction-sign-send-cover.png)

지갑 앱을 만들다 보면 사용자는 버튼 하나만 누른 것처럼 보이지만, 앱 안에서는 꽤 많은 일이 지나간다.

```text
받는 주소와 금액을 확인하고,
nonce와 gas를 채우고,
chainId를 고정하고,
개인키로 서명하고,
서명된 바이트를 RPC 노드로 보낸다.
```

이미 [[eoa-externally-owned-account|EOA]], [[nonce-wallet-login|nonce]], [[simple-payment-blockchain-signature|서명]], [[android-wallet-secret-storage-keystore-tink|지갑 보안]]을 따로 보면 각 개념은 이해할 수 있다. 그런데 실제 지갑 앱에서는 이 개념들이 따로 움직이지 않는다. 사용자가 "보내기" 또는 "확인"을 누르는 순간 하나의 트랜잭션 처리 흐름으로 이어진다.

이 글은 그 흐름을 `RawTransaction`이라는 관점에서 묶어보는 메모다. 특정 라이브러리 문법을 외우려는 글은 아니다. Android 지갑 앱에서 EVM 트랜잭션을 만들 때 어떤 값을 모으고, 언제 서명하고, 무엇을 네트워크로 보내는지 정리하는 쪽에 가깝다.

## 먼저 한 문장으로 보기

RawTransaction 흐름을 한 문장으로 줄이면 이렇게 볼 수 있다.

```text
RawTransaction은 서명 전 트랜잭션 재료를 모은 것이고,
서명된 raw transaction은 네트워크가 검증할 수 있는 최종 바이트다.
```

여기서 중요한 구분은 두 가지다.

```text
서명 전:
nonce, gas, chainId, to, value, data 같은 트랜잭션 필드

서명 후:
위 필드에 개인키 서명이 붙어 직렬화된 hex 문자열
```

라이브러리마다 용어가 조금 다를 수 있다. 예를 들어 어떤 SDK에서는 서명 전 객체를 `RawTransaction`이라고 부르고, JSON-RPC에서는 서명된 hex payload를 raw transaction처럼 부른다.

그래서 이 글에서는 헷갈리지 않도록 이렇게 나눠 부르겠다.

```text
RawTransaction:
서명 전 트랜잭션 객체

Signed Raw Tx:
서명과 인코딩이 끝난 전송용 hex 문자열
```

## 전체 흐름

지갑 앱에서 EVM 트랜잭션을 보내는 흐름은 대략 이렇게 볼 수 있다.

```text
사용자 요청
-> 트랜잭션 필드 수집
-> RawTransaction 생성
-> 사용자 확인
-> 개인키로 서명
-> Signed Raw Tx 생성
-> eth_sendRawTransaction
-> txHash 반환
-> receipt 조회
```

중요한 점은 `eth_sendRawTransaction`에 보내는 값이 "서명 전 객체"가 아니라는 것이다. RPC 노드로 나가는 것은 이미 개인키 서명이 붙은 직렬화된 데이터다.

지갑 앱은 보통 아래 두 역할을 모두 한다.

- 사용자에게 사람이 읽을 수 있는 요청 내용을 보여준다.
- 노드가 검증할 수 있는 서명된 트랜잭션 바이트를 만든다.

화면에서는 "확인" 버튼 하나로 보이지만, 구현에서는 이 두 단계를 나눠서 봐야 한다.

## RawTransaction에는 무엇이 들어갈까

RawTransaction은 트랜잭션에 필요한 필드를 한데 모은 것이다.

![RawTransaction 재료](/images/raw-transaction-fields-handdrawn.png)

처음에는 아래 필드만 잡아도 흐름을 읽을 수 있다.

| 필드 | 의미 |
| --- | --- |
| `nonce` | 이 EOA가 보내는 트랜잭션 순서 번호 |
| `gasLimit` | 이 트랜잭션이 사용할 수 있는 최대 gas |
| `gasPrice` 또는 EIP-1559 fee | gas 한 단위당 지불할 가격 정보 |
| `chainId` | 어떤 EVM 네트워크용 트랜잭션인지 구분 |
| `to` | 받을 주소 또는 호출할 컨트랙트 주소 |
| `value` | 함께 보낼 네이티브 코인 수량 |
| `data` | 컨트랙트 호출 데이터 |

단순 코인 전송이면 `to`와 `value`가 중심이고, `data`는 비어 있을 수 있다.

```text
ETH 전송:
to = 받는 주소
value = 보낼 ETH
data = 비어 있음
```

반대로 ERC-20 토큰 전송은 조금 다르다. 토큰은 네이티브 코인이 아니라 컨트랙트 안의 장부이기 때문이다.

```text
ERC-20 transfer:
to = 토큰 컨트랙트 주소
value = 0
data = transfer(받는 주소, 수량)를 ABI encoding한 값
```

사용자 화면에서는 둘 다 "전송"처럼 보일 수 있다. 하지만 RawTransaction 필드로 보면 전혀 다르다.

```text
네이티브 코인 전송:
value로 금액을 보낸다.

토큰 전송:
data로 컨트랙트 함수를 호출한다.
```

이 차이를 이해하면 지갑 UI에서 `to`가 왜 사용자 주소가 아니라 토큰 컨트랙트 주소로 보이는지, `value`가 왜 0인지 덜 헷갈린다.

## nonce는 언제 가져올까

`nonce`는 EOA의 트랜잭션 순서 번호다. 지갑 앱은 보통 트랜잭션을 만들기 직전에 노드에서 현재 nonce를 조회한다.

```text
from 주소
-> eth_getTransactionCount
-> nonce
```

여기서 `latest`와 `pending` 관점이 중요해질 수 있다.

```text
latest:
이미 블록에 포함된 트랜잭션 기준 nonce

pending:
아직 대기 중인 트랜잭션까지 고려한 nonce
```

지갑 앱에서 사용자가 연속으로 두 번 전송한다면, 이미 보낸 첫 번째 트랜잭션이 아직 pending일 수 있다. 이때 `latest`만 보고 nonce를 가져오면 같은 nonce를 다시 쓰는 문제가 생길 수 있다.

그래서 지갑 구현에서는 보통 pending 상태까지 고려하거나, 앱 내부에서 같은 계정의 전송 큐를 관리한다.

```text
같은 EOA에서 동시에 여러 트랜잭션을 만들 때는
nonce가 겹치지 않게 해야 한다.
```

nonce가 낮으면 노드가 이미 처리된 번호라고 거절할 수 있고, nonce가 너무 높으면 앞 번호가 채워질 때까지 대기할 수 있다. 그래서 nonce는 단순 숫자 하나처럼 보이지만, 지갑 앱의 전송 안정성에는 꽤 중요하다.

## gas는 추정값과 한도값을 나눠서 본다

트랜잭션을 만들 때 지갑은 gas도 채워야 한다.

처음에는 두 가지를 나눠서 보면 좋다.

```text
gasLimit:
이 트랜잭션 실행에 허용할 최대 gas

fee:
gas 한 단위에 얼마를 지불할지
```

단순 전송은 보통 필요한 gas가 비교적 예측 가능하다. 하지만 컨트랙트 호출은 상태, 입력값, 컨트랙트 로직에 따라 gas 사용량이 달라질 수 있다. 그래서 앱은 보통 `eth_estimateGas`로 실행 비용을 미리 추정하고, 그 값을 바탕으로 `gasLimit`을 정한다.

```text
트랜잭션 후보 생성
-> eth_estimateGas
-> gasLimit 결정
```

fee 쪽은 네트워크 방식에 따라 표현이 다를 수 있다.

```text
legacy 방식:
gasPrice

EIP-1559 방식:
maxFeePerGas
maxPriorityFeePerGas
```

요즘 EVM 네트워크에서는 EIP-1559 형식을 많이 보지만, 모든 체인과 SDK가 같은 방식으로만 보이는 것은 아니다. 지갑 앱에서는 연결된 체인이 어떤 fee 모델을 쓰는지 확인하고, 사용자가 이해할 수 있는 형태로 예상 수수료를 보여줘야 한다.

여기서 주의할 점이 있다.

```text
gas estimate는 성공 보장이 아니다.
```

estimate가 성공해도 실제 전송 시점의 상태가 바뀌면 실패할 수 있다. 반대로 컨트랙트 실행이 실패하면 상태 변경은 되돌아가더라도, 이미 실행을 시도한 gas는 일부 또는 전부 소모될 수 있다.

## chainId는 네트워크를 고정한다

`chainId`는 이 트랜잭션이 어떤 네트워크용인지 고정하는 값이다.

예를 들어 Ethereum mainnet, Polygon, Arbitrum, 테스트넷은 모두 EVM 계열일 수 있지만 같은 네트워크가 아니다. 같은 주소 형식을 쓰고, 비슷한 트랜잭션 구조를 쓰더라도 상태와 노드는 분리되어 있다.

그래서 지갑은 사용자가 선택한 네트워크와 트랜잭션의 `chainId`가 맞는지 확인해야 한다.

```text
사용자 선택 네트워크
-> chainId 확인
-> RPC endpoint 확인
-> RawTransaction에 같은 chainId 사용
```

chainId는 replay protection에도 연결된다. 예전에는 한 네트워크에서 서명한 트랜잭션이 다른 네트워크에서 재사용될 위험이 있었다. chainId가 서명에 포함되면 "이 서명은 이 체인용"이라는 의미가 붙는다.

지갑 앱 관점에서는 이렇게 기억하면 충분하다.

```text
chainId가 틀리면
사용자가 생각한 네트워크와 다른 곳에 서명할 수 있다.
```

그래서 서명 화면에는 네트워크 이름이 반드시 보여야 한다.

## data는 컨트랙트 호출의 실제 내용이다

`data`는 초심자에게 가장 낯선 필드다.

단순 전송에서는 비어 있을 수 있지만, 컨트랙트를 호출할 때는 `data`가 핵심이다. `data` 안에는 어떤 함수를 호출할지와 어떤 인자를 넘길지가 ABI encoding된 형태로 들어간다.

예를 들어 ERC-20 토큰 전송은 사람이 보기에는 이렇게 보인다.

```text
transfer(0x받는주소, 10 TOKEN)
```

하지만 트랜잭션의 `data`에는 사람이 읽는 문자열 그대로 들어가지 않는다.

```text
함수 selector
+ 인자 encoding
-> 0xa9059cbb...
```

그래서 지갑 앱은 가능하면 `data`를 해석해서 사용자에게 보여줘야 한다.

```text
그냥 보여주면:
0xa9059cbb000000000...

해석해서 보여주면:
TOKEN transfer
받는 주소: 0x...
수량: 10
```

물론 모든 컨트랙트 호출을 완벽히 해석하기는 어렵다. 그래도 알려진 토큰 표준, `approve`, `transfer`, `swap`처럼 자주 쓰이는 호출은 지갑이 더 친절하게 보여줄수록 사용자가 위험한 요청을 알아차리기 쉬워진다.

## Android 앱에서는 언제 RawTransaction을 만들까

Android 지갑 앱에서는 보통 사용자 행동에서 RawTransaction 생성까지 이런 단계가 지나간다.

```text
1. 사용자가 전송 화면에서 받는 주소와 금액을 입력한다.
2. 앱이 현재 선택된 체인과 from 주소를 확인한다.
3. 노드에서 nonce, fee, gas estimate를 가져온다.
4. to, value, data, gas, chainId를 모아 RawTransaction을 만든다.
5. 사용자에게 최종 확인 화면을 보여준다.
6. 사용자가 확인하면 인증을 수행한다.
7. 개인키를 짧게 로드해 서명한다.
8. 서명된 raw transaction을 노드로 보낸다.
```

개념 코드로 보면 이런 모양에 가깝다.

```kotlin
data class EvmTransactionDraft(
    val chainId: Long,
    val from: String,
    val to: String,
    val valueWei: BigInteger,
    val data: String,
)

suspend fun buildRawTransaction(draft: EvmTransactionDraft): RawTransaction {
    val nonce = rpc.getTransactionCount(draft.from, blockTag = "pending")
    val gasLimit = rpc.estimateGas(draft)
    val fee = rpc.suggestFee(draft.chainId)

    return RawTransaction(
        chainId = draft.chainId,
        nonce = nonce,
        gasLimit = gasLimit,
        fee = fee,
        to = draft.to,
        value = draft.valueWei,
        data = draft.data,
    )
}
```

실제 SDK에서는 생성자나 타입 이름이 다를 수 있다. 중요한 것은 `RawTransaction`을 만들기 전에 앱이 사용자 입력값과 네트워크 조회값을 합친다는 점이다.

```text
사용자 입력:
to, value, data

네트워크 조회:
nonce, gas, fee

앱 설정:
chainId, from, RPC endpoint
```

이 셋이 합쳐져야 서명 가능한 트랜잭션이 된다.

## 서명은 RawTransaction을 잠그는 단계다

RawTransaction을 만들었다고 아직 네트워크가 받아줄 수 있는 것은 아니다. 이 객체는 아직 "이 주소의 주인이 승인했다"는 증거가 없다.

서명 단계에서 RawTransaction은 개인키로 서명되고, 전송 가능한 바이트로 직렬화된다.

![RawTransaction 서명 흐름](/images/raw-transaction-signing-handdrawn.png)

흐름은 단순화하면 이렇다.

```text
RawTransaction
-> 직렬화할 데이터 정리
-> 트랜잭션 해시 대상 생성
-> 개인키로 서명
-> v, r, s 서명값 추가
-> signed raw transaction bytes
-> hex 문자열
```

여기서 개인키는 밖으로 나가지 않는다. 밖으로 나가는 것은 서명 결과가 포함된 바이트다.

Android 보안 구조와 연결하면 이렇게 볼 수 있다.

```text
사용자 인증
-> 보안 저장소에서 개인키 복호화
-> 메모리 안에서 RawTransaction 서명
-> signed bytes 생성
-> 개인키 ByteArray wipe
```

이 부분은 [[android-wallet-secret-storage-keystore-tink|Android Keystore와 Tink AEAD로 개인키 저장하기]]에서 봤던 원칙과 이어진다.

```text
보관은 암호문으로,
사용은 짧게,
밖으로 나가는 것은 서명값만.
```

트랜잭션 서명에서도 같은 원칙이 적용된다. 지갑 앱이 RPC 노드나 서버에 개인키를 보내서 서명해달라고 하면 안 된다. 논커스토디얼 지갑이라면 서명은 사용자의 기기 안에서 끝나야 한다.

## Signed Raw Tx는 무엇일까

서명이 끝나면 긴 hex 문자열이 만들어진다.

```text
0x02f86b0185...
```

이 값은 그냥 보기에는 의미 없는 문자열처럼 보인다. 하지만 안에는 트랜잭션 필드와 서명값이 인코딩되어 있다.

```text
chainId
nonce
fee
gasLimit
to
value
data
signature
```

노드는 이 값을 받아서 서명을 검증한다. 서명에서 보낸 계정을 복구하고, nonce와 잔액과 gas 조건을 확인한다. 조건이 맞으면 mempool에 받아들이거나 다른 노드로 전파한다.

즉 Signed Raw Tx는 이런 의미에 가깝다.

```text
이 계정이 이 체인에서 이 트랜잭션을 보내겠다고 서명한 최종 요청
```

그래서 이 값은 조심해서 다뤄야 한다. 개인키는 아니지만, 아직 처리되지 않은 signed raw transaction을 누군가 가져가면 대신 브로드캐스트할 수 있다. 이미 사용자가 서명한 최종 요청이기 때문이다.

## eth_sendRawTransaction은 성공 완료가 아니다

서명된 트랜잭션은 보통 JSON-RPC의 `eth_sendRawTransaction`으로 보낸다.

![전송과 상태 추적](/images/raw-transaction-broadcast-tracking-handdrawn.png)

요청은 개념적으로 이런 모양이다.

```json
{
  "jsonrpc": "2.0",
  "method": "eth_sendRawTransaction",
  "params": ["0x02f86b..."],
  "id": 1
}
```

응답으로는 보통 `txHash`가 돌아온다.

```text
0xabc123...
```

여기서 아주 중요한 점이 있다.

```text
txHash를 받았다는 것은
트랜잭션이 최종 성공했다는 뜻이 아니다.
```

txHash는 노드가 서명된 트랜잭션을 받아들였고, 그 트랜잭션을 식별할 해시를 돌려준 것에 가깝다. 아직 블록에 포함되지 않았을 수 있고, 나중에 실패할 수도 있고, 네트워크 상황에 따라 오래 pending일 수도 있다.

그래서 지갑 앱은 보통 txHash를 받은 뒤 상태 추적을 이어간다.

```text
eth_sendRawTransaction
-> txHash 반환
-> pending 상태 표시
-> eth_getTransactionReceipt 반복 조회
-> receipt 확인
-> success 또는 fail 표시
```

receipt가 생겼다는 것은 트랜잭션이 블록에 포함되어 실행 결과가 기록되었다는 뜻이다. EVM 트랜잭션에서는 receipt의 `status`를 보고 성공과 실패를 나눌 수 있다.

```text
status = 1:
실행 성공

status = 0:
실행 실패 또는 revert
```

실패해도 txHash는 존재할 수 있다. 실패한 트랜잭션도 블록에 포함되어 실행을 시도했기 때문이다.

## 지갑 앱의 상태는 최소 네 단계로 나누면 좋다

사용자에게는 "전송 중" 하나로 보일 수 있지만, 앱 내부 상태는 조금 더 나눠두는 편이 좋다.

| 상태 | 의미 |
| --- | --- |
| `Signing` | 사용자가 확인했고, 앱이 로컬에서 서명 중 |
| `Broadcasting` | signed raw transaction을 RPC로 보내는 중 |
| `Pending` | txHash를 받았고, 블록 포함을 기다리는 중 |
| `Confirmed` | receipt를 확인했고, 결과가 확정됨 |
| `Failed` | 전송 거절, 실행 실패, timeout 등 |

이 구분이 있으면 UI와 에러 처리가 훨씬 선명해진다.

예를 들어 사용자가 "전송 실패"를 봤을 때 실패 지점이 다를 수 있다.

```text
서명 실패:
사용자 인증 실패, 키 로드 실패

브로드캐스트 실패:
nonce too low, insufficient funds, invalid chainId

실행 실패:
컨트랙트 revert, gas 부족, 권한 부족

추적 실패:
RPC timeout, receipt 지연, dropped/replaced
```

같은 실패처럼 보여도 사용자가 해야 할 행동은 다르다. 그래서 지갑 앱에서는 실패 단계와 원인을 가능한 한 분리해서 저장하는 편이 좋다.

## 자주 만나는 에러

RawTransaction을 직접 만들고 보내다 보면 아래 종류의 에러를 자주 만난다.

| 에러 | 흔한 원인 |
| --- | --- |
| `nonce too low` | 이미 처리된 nonce를 다시 사용 |
| `replacement transaction underpriced` | 같은 nonce로 대체하려 했지만 fee가 충분히 높지 않음 |
| `insufficient funds` | value와 gas 비용을 합친 금액보다 잔액이 부족 |
| `intrinsic gas too low` | 기본 실행에 필요한 gasLimit보다 낮음 |
| `invalid sender` | 서명, chainId, from 복구가 맞지 않음 |
| receipt `status = 0` | 트랜잭션은 포함됐지만 컨트랙트 실행이 revert |

이 중에서 `insufficient funds`는 초심자에게 특히 헷갈릴 수 있다. 사용자가 1 ETH를 보내려고 할 때 잔액이 정확히 1 ETH면 부족할 수 있다. gas 비용도 from 계정이 내야 하기 때문이다.

```text
필요 금액 = value + 최대 gas 비용
```

토큰 전송에서도 마찬가지다. 토큰 잔액이 충분해도 gas는 네이티브 코인으로 내야 한다. 예를 들어 어떤 체인에서 토큰을 보내려면 그 체인의 네이티브 코인이 수수료로 필요하다.

## 사용자 확인 화면에는 무엇을 보여줘야 할까

RawTransaction을 만들고 서명하기 전에 지갑은 사용자에게 확인 화면을 보여줘야 한다. 이 화면은 단순한 장식이 아니라 보안 경계에 가깝다.

최소한 아래 정보는 확인할 수 있어야 한다.

- 네트워크 이름과 chainId
- 보내는 주소
- 받는 주소 또는 컨트랙트 주소
- 전송할 네이티브 코인 수량
- 컨트랙트 호출이라면 해석 가능한 함수와 인자
- 예상 gas 비용
- 총 필요 금액
- 위험한 요청이라면 별도 경고

특히 `approve` 같은 요청은 사용자에게 명확히 보여줘야 한다.

```text
단순 로그인처럼 보이지만
실제로는 토큰 사용 권한을 주는 트랜잭션일 수 있다.
```

RawTransaction의 `data`가 사람이 읽기 어렵기 때문에, 지갑 UI가 그 의미를 얼마나 잘 풀어주느냐가 중요해진다.

## 서버는 어디까지 관여할 수 있을까

지갑 앱에서 서버가 도와줄 수 있는 부분은 있다.

예를 들어 서버나 백엔드 API가 다음 정보를 제공할 수 있다.

- 추천 RPC endpoint
- 토큰 메타데이터
- 컨트랙트 ABI
- gas fee 추천값
- 위험 주소 목록
- 트랜잭션 시뮬레이션 결과

하지만 논커스토디얼 지갑이라면 선을 넘어가면 안 되는 부분이 있다.

```text
서버가 개인키를 받으면 안 된다.
서버가 사용자 몰래 서명하면 안 된다.
서버가 보여준 값과 실제 서명할 값이 달라지면 안 된다.
```

서버는 트랜잭션 이해를 돕는 보조자일 수 있다. 하지만 최종 서명은 사용자 기기 안에서, 사용자가 확인한 값에 대해 이루어져야 한다.

## 구현 체크리스트

Android 지갑 앱에서 RawTransaction 흐름을 만들 때는 아래 질문을 따라가면 좋다.

```text
1. 현재 선택된 chainId와 RPC endpoint가 일치하는가?
2. from 주소의 pending nonce를 안전하게 가져오는가?
3. 같은 계정에서 동시 전송할 때 nonce 충돌을 막는가?
4. gasLimit과 fee를 네트워크에 맞게 계산하는가?
5. value와 gas 비용을 합쳐 잔액 검사를 하는가?
6. data를 가능한 범위에서 사람이 읽을 수 있게 해석하는가?
7. 사용자 확인 화면의 값과 실제 서명 값이 같은가?
8. 개인키는 서명 순간에만 짧게 로드되는가?
9. signed raw transaction만 RPC로 전송되는가?
10. txHash 이후 receipt까지 추적하는가?
```

이 체크리스트는 개념 학습용이기도 하지만, 실제 앱 구현에서도 버그를 줄이는 데 도움이 된다. 특히 "확인 화면의 값"과 "실제 서명할 값"이 달라지는 문제는 지갑 앱에서 치명적이다.

## 처음에는 이렇게 외우기

RawTransaction 흐름은 아래 문장으로 기억하면 좋다.

```text
RawTransaction은 재료다.
서명은 재료를 사용자 승인 요청으로 잠그는 단계다.
Signed Raw Tx는 네트워크에 제출할 수 있는 최종 바이트다.
txHash는 접수 번호에 가깝고, receipt가 최종 실행 결과다.
```

지갑 앱에서 "전송" 버튼을 누른다는 것은 단순히 API 하나를 호출하는 일이 아니다.

```text
값을 모으고,
사용자에게 보여주고,
개인키로 서명하고,
네트워크에 제출하고,
결과를 끝까지 추적하는 흐름
```

이다.

이 관점이 잡히면 EVM 트랜잭션을 볼 때 흩어진 필드들이 하나로 이어진다. `nonce`는 순서를 잡고, `gas`는 실행 비용을 제한하고, `chainId`는 네트워크를 고정하고, `to/value/data`는 무엇을 할지 설명한다. 그리고 서명은 이 모든 내용을 해당 EOA가 승인했다는 증거가 된다.

## 참고하면 좋은 문서

더 확인하고 싶다면 아래 문서를 같이 보면 좋다.

- [Ethereum transactions](https://ethereum.org/developers/docs/transactions/)
- [Ethereum JSON-RPC: eth_sendRawTransaction](https://ethereum.org/developers/docs/apis/json-rpc/#eth_sendrawtransaction)
- [Ethereum JSON-RPC: eth_getTransactionReceipt](https://ethereum.org/developers/docs/apis/json-rpc/#eth_gettransactionreceipt)
- [EIP-155: Simple replay attack protection](https://eips.ethereum.org/EIPS/eip-155)
- [EIP-1559: Fee market change for ETH 1.0 chain](https://eips.ethereum.org/EIPS/eip-1559)

처음부터 모든 필드와 인코딩 규칙을 외울 필요는 없다. 지갑 앱 관점에서는 먼저 이 질문에 답할 수 있으면 충분하다.

```text
이 트랜잭션은 어떤 값으로 만들어졌고,
사용자는 무엇을 확인했고,
어떤 개인키로 서명됐고,
네트워크에는 어떤 signed raw transaction이 제출됐는가?
```

이 질문이 RawTransaction을 단순한 SDK 객체가 아니라, 지갑 앱의 실제 전송 흐름으로 보게 해준다.
