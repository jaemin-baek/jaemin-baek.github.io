---
title: "Android 지갑 앱에서 EVM 트랜잭션은 어떻게 전송될까"
date: "2026-06-03"
category: "Blockchain"
group: "Blockchain Basics"
series: "Blockchain Basics"
tags: ["android", "wallet", "evm", "transaction", "raw-transaction", "txhash", "receipt", "web3j"]
description: "Android 지갑 앱에서 EVM 트랜잭션을 구성하고, nonce와 gas를 조회하고, 개인키로 서명한 뒤 RPC로 전송해 txHash와 receipt를 확인하는 흐름을 정리합니다."
---

![Android 지갑 앱에서 EVM 트랜잭션은 어떻게 전송될까](/images/android-wallet-evm-transaction-cover.png)

지갑 앱에서 "트랜잭션을 처리했다"는 말은 생각보다 많은 일을 포함한다.

처음에는 단순히 서버 API를 호출해서 송금 요청을 보내는 것처럼 느껴질 수 있다. 하지만 EVM 계열 지갑에서는 사용자의 거래 요청을 앱에서 트랜잭션 형태로 만들고, 개인키로 서명하고, 서명된 값을 네트워크에 전송해야 한다.

이 글은 [[evm-basics|EVM]] 자체나 [[eoa-externally-owned-account|EOA]] 개념을 다시 설명하는 글은 아니다. Android 지갑 앱에서 실제로 하나의 송금 요청이 어떻게 `RawTransaction`이 되고, 어떻게 `txHash`와 `receipt`까지 이어지는지 정리한 메모다.

```text
사용자 요청
-> 트랜잭션 구성
-> nonce/gas 조회
-> 개인키 서명
-> raw transaction 전송
-> txHash 수신
-> receipt 확인
```

## 먼저 한 문장으로 보기

Android 지갑 앱에서 EVM 트랜잭션 전송을 한 문장으로 줄이면 이렇게 볼 수 있다.

```text
거래에 필요한 필드를 모아 RawTransaction을 만들고,
사용자 개인키로 서명한 뒤,
서명된 raw transaction을 RPC 노드에 보내는 과정이다.
```

여기서 중요한 점은 **개인키를 네트워크로 보내지 않는다**는 것이다.

앱은 개인키로 서명만 만든다. 네트워크로 나가는 것은 개인키가 아니라 서명된 트랜잭션이다.

```text
밖으로 나가면 안 되는 것:
private key
mnemonic
seed

밖으로 나가는 것:
signed raw transaction
txHash
```

이 흐름은 [[android-wallet-secret-storage-keystore-tink|Android Keystore와 Tink AEAD로 개인키 저장하기]]에서 봤던 "서명할 때만 잠깐 꺼내기"와 이어진다. 저장소는 개인키를 안전하게 보관하고, 트랜잭션 전송 시점에는 짧게 로드해 서명한 뒤 메모리에서 지워야 한다.

## 전체 흐름

지갑 앱에서 EVM 트랜잭션을 전송하는 흐름은 대략 이렇게 볼 수 있다.

![EVM 트랜잭션 전송 흐름](/images/android-wallet-evm-transaction-flow-handdrawn.png)

겉으로는 사용자가 "보내기" 버튼을 누르는 하나의 행동처럼 보인다. 하지만 내부에서는 여러 단계가 순서대로 붙어야 한다.

1. 사용자가 송금 또는 컨트랙트 호출을 승인한다.
2. 앱이 `from`, `to`, `value`, `data`, `chainId`를 정리한다.
3. RPC 노드에서 `nonce`와 gas 관련 값을 조회한다.
4. 네트워크 정책에 맞춰 EIP-1559 또는 legacy 수수료 필드를 채운다.
5. 이 값들로 `RawTransaction`을 만든다.
6. 로컬 저장소에서 개인키를 잠깐 꺼내 트랜잭션에 서명한다.
7. 서명된 raw transaction을 RPC로 전송한다.
8. 반환된 `txHash`로 거래 상태를 추적한다.

서버 API 호출과 가장 다른 지점은 6번이다.

Web2 송금에서는 서버가 사용자 인증 후 내부 DB를 바꾸거나 결제망에 요청을 보낼 수 있다. 반면 비수탁 지갑에서는 서버가 사용자의 개인키를 갖고 있지 않다. 그래서 사용자의 앱 안에서 서명이 만들어져야 한다.

## 트랜잭션에 들어가는 값

트랜잭션을 전송하려면 먼저 네트워크가 검증할 수 있는 입력을 만들어야 한다.

대표적으로 이런 값들이 필요하다.

| 필드 | 의미 |
| --- | --- |
| `from` | 트랜잭션을 보내는 주소 |
| `to` | 받을 주소 또는 호출할 컨트랙트 주소 |
| `value` | 함께 보낼 네이티브 코인 수량 |
| `data` | 컨트랙트 함수 호출 데이터 |
| `nonce` | 해당 주소가 보내는 트랜잭션 순서 |
| `gasLimit` | 이 트랜잭션이 사용할 수 있는 최대 gas |
| `gasPrice` | legacy 트랜잭션의 gas 단가 |
| `maxFeePerGas` | EIP-1559 트랜잭션에서 낼 수 있는 최대 gas 단가 |
| `maxPriorityFeePerGas` | EIP-1559 트랜잭션에서 검증자에게 주는 우선순위 수수료 |
| `chainId` | 어떤 체인에서 유효한 서명인지 구분하는 값 |

`from`은 보통 앱이 선택한 계정 주소다. `to`는 받는 주소일 수도 있고, ERC-20 컨트랙트 주소일 수도 있다.

여기서 초반에 가장 헷갈리는 값은 `value`와 `data`다.

네이티브 코인을 보내는 경우에는 `value`가 중요하다.

```text
to = 받는 사람 주소
value = 0.1 ETH
data = 비어 있음
```

반면 ERC-20 토큰 전송은 조금 다르다. 토큰은 지갑 안에 파일처럼 들어 있는 것이 아니라 컨트랙트 장부에 기록된 값이다. 그래서 받는 사람에게 바로 네이티브 코인을 보내는 것이 아니라, 토큰 컨트랙트의 `transfer(address,uint256)` 함수를 호출한다.

```text
to = ERC-20 토큰 컨트랙트 주소
value = 0
data = transfer(받는 주소, 토큰 수량)을 ABI 인코딩한 값
```

이 차이는 [[token-basics|토큰]] 글에서 봤던 "토큰 전송은 컨트랙트 장부 숫자를 바꾸는 일"과 연결된다.

## RawTransaction 만들기

앱에서 필요한 필드를 모으면 `RawTransaction`을 만들 수 있다.

![RawTransaction 만들기](/images/raw-transaction-building-handdrawn.png)

여기서 `RawTransaction`이라는 이름이 조금 딱딱하게 느껴질 수 있다. 쉽게 말하면 아직 네트워크에 제출되기 전의 트랜잭션 본문이다.

```text
나는 어떤 체인에서,
어떤 주소가,
몇 번째 거래로,
누구에게,
얼마를 보내거나,
어떤 컨트랙트 함수를 호출하겠다.
```

이 본문만으로는 아직 부족하다. 누가 이 내용을 승인했는지 증명해야 하기 때문이다. 그래서 다음 단계에서 개인키로 서명한다.

Kotlin 코드로 아주 단순화하면 이런 모양에 가깝다.

```kotlin
data class EvmSendRequest(
    val from: String,
    val to: String,
    val value: BigInteger,
    val data: String,
    val chainId: Long
)

suspend fun sendTransaction(request: EvmSendRequest): String {
    val nonce = rpc.getTransactionCount(request.from, "pending")
    val gasLimit = rpc.estimateGas(request)
    val fee = rpc.resolveFeePolicy()

    val rawTransaction = rawTransactionFactory.create(
        to = request.to,
        value = request.value,
        data = request.data,
        nonce = nonce,
        gasLimit = gasLimit,
        fee = fee
    )

    val signedRawTransaction = secretStorage.getAndWipe(request.from) { privateKey ->
        signer.sign(rawTransaction, request.chainId, privateKey)
    }

    return rpc.sendRawTransaction(signedRawTransaction)
}
```

실제 구현은 이보다 더 복잡하다. 주소 검증, 단위 변환, 토큰 decimals, 네트워크 선택, 에러 처리, 사용자 인증, timeout 같은 처리가 붙는다.

하지만 큰 흐름은 변하지 않는다.

```text
필드 준비
-> raw transaction 생성
-> 개인키 서명
-> signed raw transaction 전송
```

## Nonce는 왜 조회할까

`nonce`는 해당 EOA가 보내는 트랜잭션 순서다.

첫 번째 트랜잭션이 `0`, 다음이 `1`, 그 다음이 `2`처럼 증가한다. 네트워크는 이 값을 보고 같은 계정에서 나온 트랜잭션의 순서를 판단한다.

```text
0xAAA의 nonce 7 트랜잭션
-> 이미 처리됨

0xAAA의 nonce 7 트랜잭션을 다시 제출
-> 같은 순서 번호라 그대로 다시 실행될 수 없음
```

그래서 앱이 트랜잭션을 만들 때는 현재 계정의 nonce를 알아야 한다.

보통 RPC의 `eth_getTransactionCount`로 조회한다. 이때 지갑 앱에서는 `latest`와 `pending`의 차이를 조심해야 한다.

```text
latest:
이미 블록에 포함된 트랜잭션 기준 nonce

pending:
아직 대기 중인 트랜잭션까지 고려한 nonce
```

사용자가 짧은 시간 안에 여러 트랜잭션을 보낼 수 있다면 `pending` 기준을 고려해야 한다. 그렇지 않으면 이미 대기 중인 nonce를 다시 사용해서 충돌이 날 수 있다.

[[nonce-wallet-login|Nonce 발급과 지갑 로그인 이해하기]]에서 다룬 로그인 nonce와도 구분해야 한다. 로그인 nonce는 서버가 만든 일회용 인증 질문이고, 트랜잭션 nonce는 EOA의 온체인 트랜잭션 순서 번호다.

## Gas는 어떻게 채울까

gas는 트랜잭션 실행 비용을 제한하고 가격을 정하는 값이다.

앱에서 보통 나눠서 보는 값은 두 가지다.

```text
gasLimit:
이 트랜잭션이 사용할 수 있는 최대 실행량

gas fee:
gas 한 단위에 얼마를 낼 것인지
```

`gasLimit`은 보통 `eth_estimateGas`로 추정한다. 단순 네이티브 코인 전송은 대체로 `21000` gas가 보이지만, 컨트랙트 호출은 함수 실행 경로에 따라 더 많이 필요하다.

수수료 방식은 네트워크가 EIP-1559를 지원하는지에 따라 달라진다.

EIP-1559를 지원하는 네트워크에서는 보통 이런 필드를 채운다.

```text
maxPriorityFeePerGas
maxFeePerGas
```

지원하지 않는 네트워크나 legacy 방식에서는 `gasPrice`를 사용한다.

```text
gasPrice
```

앱 구현에서는 최신 블록의 `baseFeePerGas`를 확인하거나 네트워크 설정을 보고 분기할 수 있다.

```kotlin
val latestBlock = rpc.getLatestBlock()

val fee = if (latestBlock.baseFeePerGas != null) {
    FeePolicy.Eip1559(
        maxPriorityFeePerGas = rpc.getPriorityFee(),
        maxFeePerGas = latestBlock.baseFeePerGas * BigInteger.TWO + rpc.getPriorityFee()
    )
} else {
    FeePolicy.Legacy(
        gasPrice = rpc.getGasPrice()
    )
}
```

정확한 정책은 서비스마다 다를 수 있다. 중요한 것은 사용자가 보는 수수료와 실제 트랜잭션에 들어가는 수수료 필드가 같은 기준으로 계산되어야 한다는 점이다.

## ChainId는 왜 필요할까

`chainId`는 트랜잭션 서명이 어느 체인에서 유효한지 구분하는 값이다.

Ethereum 메인넷, Polygon, BNB Chain, WEMIX 계열 네트워크처럼 EVM 호환 체인은 비슷한 트랜잭션 구조를 사용할 수 있다. 그래서 서명값이 다른 체인에서 재사용되면 위험하다.

`chainId`는 이런 replay 문제를 줄이기 위해 서명에 포함된다.

```text
chainId 1에서 유효한 서명
!=
chainId 137에서 유효한 서명
```

앱에서는 사용자가 선택한 네트워크의 chainId와 트랜잭션 서명에 들어가는 chainId가 맞는지 확인해야 한다.

지갑 UI에 Polygon을 보여주면서 실제로는 다른 chainId로 서명하면 사용자가 생각한 네트워크와 다른 곳에 트랜잭션이 나갈 수 있다.

## 서명은 어디서 일어날까

서명은 로컬에서 일어난다.

비수탁 지갑이라면 서버가 사용자의 개인키를 갖고 있지 않다. 그래서 Android 앱은 로컬 저장소에서 개인키를 복호화한 뒤, 트랜잭션에 서명하고, 서명 결과만 밖으로 내보낸다.

```text
사용자 인증
-> 개인키 로드
-> RawTransaction 서명
-> signed raw transaction 생성
-> 개인키 wipe
```

여기서 조심해야 할 점은 개인키의 생명주기다.

개인키를 함수 밖으로 오래 들고 있거나, 로그로 찍거나, 예외 메시지에 섞거나, 서버로 보내면 안 된다. 가능하면 `ByteArray`로 다루고 사용 후 덮어쓰는 식으로 범위를 줄인다.

서명 결과는 보통 hex 문자열 형태의 signed raw transaction으로 변환된다.

```text
0xf86c8085...
```

이 값은 네트워크에 제출할 수 있다. 하지만 이 값을 제출한다고 해서 곧바로 성공이 보장되는 것은 아니다. 노드는 서명, nonce, 잔액, gas, chainId, 컨트랙트 실행 조건을 검증한다.

## eth_sendRawTransaction은 무엇을 할까

서명된 raw transaction을 만들었다면 RPC 노드에 전송한다.

EVM 계열에서는 보통 `eth_sendRawTransaction`을 사용한다.

```text
signed raw transaction
-> eth_sendRawTransaction
-> txHash
```

여기서 반환되는 값이 `txHash`다.

`txHash`는 트랜잭션의 고유 식별자다. 사용자가 송금한 뒤 받는 접수번호처럼 볼 수 있다.

```text
0x9f8b2e7c3d4a...
```

하지만 `txHash`를 받았다는 것은 "네트워크에 전송 요청이 접수되었다"에 가깝다. 아직 블록에 포함되어 성공했다는 뜻은 아니다.

그래서 앱은 보통 다음 단계에서 receipt를 확인한다.

## txHash와 receipt로 상태 추적하기

트랜잭션 상태를 확인하는 흐름은 이렇게 볼 수 있다.

![txHash와 receipt로 거래 상태 확인하기](/images/txhash-receipt-status-handdrawn.png)

`txHash`를 받은 뒤 앱은 `eth_getTransactionReceipt`로 receipt를 조회할 수 있다.

처음에는 receipt가 없을 수 있다.

```text
receipt == null
-> 아직 블록에 포함되지 않았을 수 있음
-> pending으로 표시
```

블록에 포함되면 receipt가 생긴다. 이때 `status`를 보고 성공과 실패를 나눌 수 있다.

```text
status = 1
-> 성공

status = 0
-> 실패 또는 revert
```

여기서 실패는 "전송 자체가 안 됐다"와 다를 수 있다.

예를 들어 컨트랙트 호출 트랜잭션이 블록에 포함되었지만, 실행 중 조건이 맞지 않아 revert될 수 있다. 이 경우에도 gas는 일부 또는 전부 소모될 수 있다.

그래서 지갑 앱의 상태는 최소한 아래처럼 나눠야 한다.

| 상태 | 의미 |
| --- | --- |
| `created` | 앱에서 트랜잭션을 구성한 상태 |
| `signed` | 로컬 개인키로 서명한 상태 |
| `submitted` | RPC에 전송해 txHash를 받은 상태 |
| `pending` | 아직 receipt가 없는 상태 |
| `success` | receipt status가 성공인 상태 |
| `failed` | receipt status가 실패이거나 전송이 거절된 상태 |
| `timeout` | 일정 시간 안에 최종 상태를 확인하지 못한 상태 |

`timeout`은 특히 조심해야 한다.

timeout이 곧 실패는 아니다. 앱이 정한 시간 안에 확인하지 못했을 뿐, 나중에 블록에 포함될 수도 있다. 그래서 timeout 상태에서도 `txHash`가 있다면 사용자가 블록 탐색기에서 확인할 수 있게 해주는 편이 좋다.

## 전송 전 실패와 전송 후 실패는 다르다

트랜잭션 실패를 볼 때는 실패 위치를 나눠야 한다.

전송 전에 실패할 수 있다.

```text
주소 형식이 잘못됨
잔액 부족
gas 추정 실패
개인키 로드 실패
사용자 인증 실패
서명 실패
```

이 경우에는 아직 `txHash`가 없다.

반대로 전송 후에 실패할 수 있다.

```text
RPC가 raw transaction을 거절
nonce too low
replacement transaction underpriced
insufficient funds for gas
receipt status = 0
timeout
```

이 경우에는 상황에 따라 `txHash`가 있을 수도 있고 없을 수도 있다.

면접이나 실무 설명에서 "실패 처리도 했다"고 말할 때는 이 차이를 나눠 말하는 편이 좋다.

```text
전송 전 실패:
트랜잭션을 만들거나 서명하기 전에 막는다.

전송 후 실패:
txHash 또는 receipt 기준으로 상태를 추적한다.
```

## 거래 내역은 Transfer 로그를 봐야 할 때도 있다

네이티브 코인 전송은 트랜잭션의 `from`, `to`, `value`만 봐도 비교적 단순하다.

하지만 ERC-20 토큰 전송은 다르게 봐야 한다.

토큰 전송 트랜잭션의 `to`는 보통 받는 사람 주소가 아니라 토큰 컨트랙트 주소다.

```text
to = 토큰 컨트랙트 주소
data = transfer(받는 사람, 수량)
```

그래서 거래 내역을 만들 때 트랜잭션의 `to`만 보고 "누구에게 보냈다"고 판단하면 틀릴 수 있다.

ERC-20 토큰 이동은 receipt의 event log, 특히 `Transfer(address,address,uint256)` 로그를 파싱해서 보는 경우가 많다.

```text
Transfer(
  from = 보내는 주소,
  to = 받는 주소,
  value = 토큰 수량
)
```

이 흐름까지 들어가면 지갑 앱은 단순히 트랜잭션을 보내는 것에서 끝나지 않는다.

```text
전송
-> txHash 저장
-> receipt 확인
-> event log 파싱
-> 사용자 거래 내역 갱신
```

## Android 앱에서 나눠볼 책임

Android 지갑 앱에서는 이 흐름을 한 클래스에 모두 밀어 넣기보다 책임을 나눠보는 편이 좋다.

예를 들면 이렇게 나눌 수 있다.

| 책임 | 역할 |
| --- | --- |
| `TransactionInteractor` | 사용자의 거래 요청을 전체 흐름으로 조립 |
| `RpcClient` | nonce, gas, block, receipt, sendRawTransaction 호출 |
| `FeePolicyResolver` | EIP-1559와 legacy 수수료 정책 계산 |
| `RawTransactionFactory` | 네트워크 타입에 맞는 RawTransaction 생성 |
| `TransactionSigner` | chainId 포함 서명 수행 |
| `SecretStorage` | 개인키를 안전하게 로드하고 사용 후 wipe |
| `TransactionHistoryRepository` | txHash, receipt, 로그 파싱 결과 저장 |

이렇게 나누면 테스트하기도 쉬워진다.

예를 들어 수수료 계산은 RPC 응답을 가짜로 넣고 검증할 수 있다. receipt polling은 성공, 실패, timeout 응답을 각각 넣어 상태 전이를 확인할 수 있다. 서명 로직은 테스트 키를 사용해 특정 chainId에서 같은 raw transaction이 같은 signed payload를 만드는지 확인할 수 있다.

## 사용자가 보는 화면도 중요하다

트랜잭션 처리는 내부 구현만의 문제가 아니다.

사용자는 자신이 무엇에 서명하는지 알아야 한다.

지갑 화면에서는 적어도 아래 정보가 명확해야 한다.

- 보내는 네트워크
- 보내는 주소
- 받는 주소 또는 컨트랙트 주소
- 네이티브 코인 수량
- 토큰 수량과 토큰 심볼
- 예상 gas fee
- 컨트랙트 호출이면 가능한 범위의 함수 의미

특히 `data`가 있는 트랜잭션은 사용자가 읽기 어렵다. 단순히 `0xa9059cbb...` 같은 hex만 보여주면 실제로 무슨 행동인지 알기 어렵다.

그래서 지갑은 가능한 범위에서 `transfer`, `approve`, `swap` 같은 의미를 해석해 보여줘야 한다. 물론 모든 컨트랙트 호출을 완벽히 해석할 수는 없으니, 모르는 요청은 모른다고 보여주는 것도 중요하다.

## 처음에는 이렇게 외우기

처음에는 모든 필드를 한 번에 외우려고 하지 않아도 된다.

지갑 앱의 트랜잭션 전송은 이 흐름으로 잡으면 된다.

```text
1. 사용자가 거래 내용을 확인한다.
2. 앱이 nonce, gas, chainId를 포함해 RawTransaction을 만든다.
3. 개인키로 로컬에서 서명한다.
4. signed raw transaction만 네트워크로 보낸다.
5. txHash를 받고 receipt로 성공 여부를 확인한다.
```

그리고 면접에서 "트랜잭션 처리를 해봤다"를 설명한다면 이렇게 말할 수 있다.

```text
사용자의 송금 요청을 EVM RawTransaction으로 만들고,
nonce와 gas fee를 조회한 뒤,
EIP-1559 또는 legacy 방식에 맞춰 수수료 필드를 구성했습니다.
이후 로컬 SecretStorage에서 개인키를 잠깐 로드해 chainId 포함 서명을 수행하고,
eth_sendRawTransaction으로 전송해 txHash를 받은 뒤 receipt로 성공/실패 상태를 추적했습니다.
```

이렇게 말하면 단순히 "송금 API를 호출했다"가 아니라, 지갑 앱이 실제 블록체인 네트워크에 제출 가능한 거래를 어떻게 만들고 추적했는지 드러난다.

## 정리

Android 지갑 앱에서 EVM 트랜잭션 전송은 하나의 버튼 클릭 뒤에 숨어 있는 여러 단계의 조합이다.

```text
트랜잭션 필드 구성
-> nonce/gas 조회
-> RawTransaction 생성
-> 개인키 서명
-> raw transaction 전송
-> txHash 수신
-> receipt 확인
```

핵심은 개인키가 밖으로 나가지 않는다는 점이다. 앱은 개인키로 서명만 만들고, 네트워크에는 signed raw transaction을 보낸다.

그리고 `txHash`는 성공 결과가 아니라 추적을 시작할 수 있는 거래 식별자다. 최종 성공 여부는 receipt를 확인해야 한다.

이 감각이 잡히면 EVM 지갑에서 말하는 송금, 토큰 전송, 컨트랙트 호출, 거래 내역 파싱이 하나의 흐름으로 이어진다.
