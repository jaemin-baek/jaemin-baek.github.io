---
title: "EIP-1559 수수료 구조 이해하기"
date: "2026-06-06"
category: "Blockchain"
group: "Blockchain Basics"
series: "Blockchain Basics"
tags: ["blockchain", "ethereum", "eip-1559", "gas", "transaction", "wallet", "fee", "android"]
description: "EIP-1559가 baseFee, priorityFee, maxFeePerGas로 트랜잭션 수수료를 어떻게 나누는지, Android 지갑 앱에서 수수료를 어떻게 계산하고 보여줘야 하는지 정리합니다."
---

![EIP-1559 수수료 구조 이해하기](/images/eip-1559-fee-market-cover.png)

EVM 트랜잭션을 만들다 보면 gas 관련 필드에서 자주 멈춘다.

예전에는 `gasPrice` 하나만 보면 되는 것처럼 느껴졌다. 하지만 EIP-1559 이후에는 `baseFee`, `maxFeePerGas`, `maxPriorityFeePerGas` 같은 값이 같이 나온다.

처음 보면 이름도 길고 헷갈린다.

```text
baseFee는 누가 정하지?
priorityFee는 팁인가?
maxFee는 실제로 내는 금액인가?
사용자에게는 무엇을 보여줘야 하지?
```

이 글은 [[android-wallet-evm-transaction-flow|Android 지갑 앱에서 EVM 트랜잭션 전송]] 글에서 살짝 다뤘던 EIP-1559 수수료 구조를 따로 정리한 메모다.

## 먼저 한 문장으로 보기

EIP-1559를 한 문장으로 줄이면 이렇게 볼 수 있다.

```text
EIP-1559는 gasPrice 하나로 수수료를 정하던 방식을
baseFee, priorityFee, maxFee로 나눠 더 예측 가능한 수수료 구조를 만든 표준이다.
```

핵심은 세 값이다.

| 값 | 의미 |
| --- | --- |
| `baseFeePerGas` | 네트워크가 블록 단위로 정하는 기본 수수료 |
| `maxPriorityFeePerGas` | 검증자 또는 블록 제안자에게 주는 우선순위 수수료 |
| `maxFeePerGas` | 사용자가 gas 한 단위에 낼 의사가 있는 최대 금액 |

예전 legacy 트랜잭션은 `gasPrice` 하나로 gas 단가를 정했다.

```text
legacy:
gasPrice
```

EIP-1559 트랜잭션은 더 나눠서 표현한다.

```text
type 0x02:
maxPriorityFeePerGas
maxFeePerGas
```

여기서 `baseFeePerGas`는 사용자가 직접 트랜잭션 필드에 넣는 값이라기보다, 현재 블록과 네트워크 상태를 보고 계산되는 값이다.

## 전체 구조

EIP-1559 수수료 구조는 `baseFee`, `priorityFee`, `maxFee`를 나눠서 보면 훨씬 덜 헷갈린다.

사용자가 실제로 지불하는 gas 단가는 대략 이렇게 이해할 수 있다.

```text
실제 gas 단가
= baseFee + priorityFee

단, maxFeePerGas를 넘을 수 없음
```

조금 더 정확히는 priority fee도 `maxFeePerGas - baseFeePerGas` 안에서 제한된다.

```text
effective priority fee
= min(maxPriorityFeePerGas, maxFeePerGas - baseFeePerGas)

effective gas price
= baseFeePerGas + effective priority fee
```

사용자가 설정한 `maxFeePerGas`는 "무조건 이만큼 내겠다"가 아니라 "최대 이만큼까지는 낼 수 있다"에 가깝다.

```text
maxFeePerGas = 상한선
baseFeePerGas = 네트워크 기본 비용
maxPriorityFeePerGas = 팁 상한선
```

실제로 쓰이지 않은 `maxFeePerGas`의 나머지는 사용자의 잔액에서 최종 지출로 빠져나가지 않는다.

## baseFee는 누가 정할까

`baseFeePerGas`는 지갑 앱이나 사용자가 임의로 정하는 값이 아니다.

네트워크가 이전 블록의 사용량을 기준으로 다음 블록의 base fee를 조정한다.

![EIP-1559 계산 흐름](/images/eip-1559-fee-calculation-handdrawn.png)

블록이 목표 gas 사용량보다 많이 찼다면 base fee가 올라간다.

```text
gas used > target
-> 다음 baseFee 증가
```

반대로 블록이 덜 찼다면 base fee가 내려간다.

```text
gas used < target
-> 다음 baseFee 감소
```

즉 base fee는 네트워크 혼잡도를 반영한다.

네트워크가 붐비면 기본 비용이 올라가고, 한산하면 내려간다.

사용자는 base fee를 직접 낮출 수 없다. base fee보다 낮은 max fee를 설정하면 트랜잭션이 다음 블록에 포함되기 어렵다.

## baseFee는 어디로 갈까

EIP-1559에서 중요한 특징 중 하나는 base fee가 소각된다는 점이다.

```text
baseFee
-> burn

priorityFee
-> validator 또는 block proposer
```

사용자가 낸 모든 수수료가 검증자에게 가는 것은 아니다.

base fee는 프로토콜에 의해 소각되고, priority fee가 블록에 트랜잭션을 포함시키는 쪽에 대한 보상으로 간다.

이 구조 때문에 `priorityFee`는 흔히 tip처럼 설명된다.

다만 지갑 UI에서는 "팁"이라는 말만 쓰면 가벼워 보일 수 있다. "우선순위 수수료" 또는 "검증자에게 가는 수수료"처럼 표현하는 편이 사용자가 이해하기 좋다.

## maxFeePerGas는 왜 필요할까

base fee는 블록마다 변할 수 있다.

사용자가 지금 보는 base fee가 30 gwei라고 해도, 실제 트랜잭션이 다음 블록이나 그 다음 블록에 들어갈 때는 달라질 수 있다.

그래서 사용자는 `maxFeePerGas`로 상한선을 둔다.

```text
현재 baseFee = 30 gwei
priorityFee = 2 gwei
maxFeePerGas = 50 gwei

=> baseFee가 조금 올라가도 50 gwei 안에서는 포함 가능
```

반대로 max fee가 너무 낮으면 pending에 오래 머물 수 있다.

```text
baseFee = 60 gwei
maxFeePerGas = 50 gwei

=> 현재 baseFee를 감당하지 못함
=> 포함되기 어려움
```

지갑 앱에서는 사용자가 보는 예상 수수료와 실제 트랜잭션 필드가 이어져야 한다.

```text
예상 최대 수수료:
gasLimit * maxFeePerGas

예상 실제 수수료:
gasLimit * (baseFee + priorityFee)
```

둘을 구분해서 보여주면 사용자가 "최대로 잡힌 금액"과 "대략 실제로 나갈 금액"을 덜 헷갈린다.

## priority fee는 왜 필요할까

priority fee는 트랜잭션을 블록에 포함시키는 쪽에 주는 우선순위 수수료다.

네트워크가 혼잡할수록 사용자는 더 높은 priority fee를 설정해 자신의 트랜잭션이 더 빨리 포함되길 기대할 수 있다.

하지만 무조건 높게 잡는 것이 좋은 것은 아니다.

지갑 앱은 보통 아래처럼 속도 옵션을 제공할 수 있다.

```text
느리게:
낮은 priority fee

보통:
네트워크 추천 priority fee

빠르게:
조금 높은 priority fee
```

이때도 base fee와 priority fee를 섞어서 하나의 숫자로만 보여주면 사용자가 이해하기 어렵다.

```text
기본 수수료:
네트워크 혼잡도에 따라 변동

우선순위 수수료:
빠른 포함을 위해 추가로 설정
```

이렇게 나눠 보여주는 편이 좋다.

## type 0x02 트랜잭션

EIP-1559 트랜잭션은 typed transaction 형식에서 type `0x02`로 표현된다.

지갑 SDK나 라이브러리를 사용할 때는 보통 직접 `0x02` 바이트를 만지는 일은 많지 않을 수 있다. 하지만 개념은 알고 있어야 한다.

```text
legacy transaction:
gasPrice 사용

EIP-1559 transaction:
type 0x02
maxPriorityFeePerGas
maxFeePerGas
```

Android 지갑 앱에서 네트워크별 트랜잭션을 만들 때는 이 차이를 분기해야 한다.

모든 EVM 호환 체인이 같은 시점에 EIP-1559를 지원하는 것은 아니다. 어떤 체인에서는 legacy gasPrice 방식만 필요할 수도 있고, 어떤 체인에서는 EIP-1559 필드를 기대할 수도 있다.

## Android 지갑 앱에서 계산하기

지갑 앱에서는 보통 다음 정보를 RPC에서 가져온다.

| 값 | 가져오는 방법 예시 |
| --- | --- |
| 최신 블록의 `baseFeePerGas` | `eth_getBlockByNumber` |
| 추천 priority fee | `eth_maxPriorityFeePerGas` 또는 `eth_feeHistory` |
| gas limit 추정 | `eth_estimateGas` |
| legacy gas price | `eth_gasPrice` |

단순화한 Kotlin 흐름은 이렇게 볼 수 있다.

```kotlin
val latestBlock = rpc.getBlockByNumber("latest")
val gasLimit = rpc.estimateGas(transactionRequest)

val fee = if (latestBlock.baseFeePerGas != null) {
    val priorityFee = rpc.suggestPriorityFee()
    val maxFee = latestBlock.baseFeePerGas * BigInteger.TWO + priorityFee

    Fee.Eip1559(
        maxPriorityFeePerGas = priorityFee,
        maxFeePerGas = maxFee
    )
} else {
    Fee.Legacy(
        gasPrice = rpc.getGasPrice()
    )
}
```

여기서 `baseFee * 2 + priorityFee`는 자주 보이는 단순한 안전 버퍼 예시다. 실제 서비스에서는 체인 특성, 최근 fee history, 사용자 속도 옵션을 함께 봐야 한다.

중요한 것은 분기 기준이다.

```text
baseFeePerGas가 있는 네트워크:
EIP-1559 방식 고려

baseFeePerGas가 없는 네트워크:
legacy gasPrice 방식 사용
```

## 사용자에게 어떻게 보여줄까

EIP-1559 수수료는 내부 계산보다 화면 표현이 더 어렵다.

사용자는 `maxFeePerGas`, `maxPriorityFeePerGas` 같은 이름을 알고 싶지 않을 수 있다.

지갑 화면에서는 이런 식으로 나눠 보여줄 수 있다.

```text
예상 네트워크 수수료:
0.0012 ETH

최대 지불 가능 수수료:
0.0018 ETH

기본 수수료:
네트워크 혼잡도에 따라 결정

우선순위 수수료:
빠른 처리를 위해 추가
```

중요한 것은 "최대"와 "예상"을 섞지 않는 것이다.

`gasLimit * maxFeePerGas`만 보여주면 사용자는 실제보다 큰 비용이 무조건 빠져나가는 것처럼 느낄 수 있다.

반대로 예상값만 보여주면 base fee가 올라갔을 때 왜 더 필요했는지 이해하기 어렵다.

## 트랜잭션 실패와 연결해서 보기

EIP-1559 수수료가 낮으면 트랜잭션은 pending에 오래 머물 수 있다.

대표적으로 이런 상황이 있다.

```text
maxFeePerGas < 현재 baseFeePerGas
-> 현재 블록에 포함되기 어려움

maxPriorityFeePerGas가 너무 낮음
-> 혼잡할 때 우선순위가 밀릴 수 있음
```

또 이미 pending인 트랜잭션을 더 높은 수수료로 대체하려면 같은 nonce를 사용하면서 충분히 높은 fee를 제시해야 한다.

이때 `replacement transaction underpriced` 같은 에러를 볼 수 있다.

그래서 [[android-wallet-evm-transaction-flow|트랜잭션 상태 추적]]에서는 `txHash`와 receipt만 보는 것이 아니라, pending이 길어질 때 fee replacement나 취소 흐름까지 고려할 수 있다.

## 자주 헷갈리는 것

첫째, `maxFeePerGas`는 실제 지불액이 아니다.

이름 그대로 상한선이다. 실제 지불 gas 단가는 base fee와 priority fee를 기준으로 계산되고, max fee를 넘지 않는다.

둘째, base fee는 지갑이 가져가는 돈이 아니다.

base fee는 소각된다. 지갑 서비스나 검증자가 모두 가져가는 구조가 아니다.

셋째, EIP-1559가 gas를 항상 싸게 만드는 것은 아니다.

EIP-1559의 핵심은 수수료 예측 가능성과 구조 개선에 가깝다. 네트워크가 매우 혼잡하면 base fee는 여전히 높아질 수 있다.

넷째, 모든 EVM 체인이 같은 fee 모델을 쓰지는 않는다.

Ethereum 기준으로만 구현해두면 다른 EVM 호환 체인에서 문제가 생길 수 있다. 지갑 앱은 체인별 fee policy를 분리하는 편이 좋다.

## 처음에는 이렇게 외우기

EIP-1559는 이렇게 잡으면 된다.

```text
baseFee:
네트워크가 정하는 기본 비용, 소각됨

priorityFee:
블록에 포함시키는 쪽에 주는 우선순위 수수료

maxFee:
사용자가 gas 한 단위당 낼 수 있는 최대 상한선
```

면접에서 짧게 말하면 이렇게 정리할 수 있다.

```text
EIP-1559는 gasPrice 하나로 수수료를 정하던 방식을
baseFee, maxPriorityFeePerGas, maxFeePerGas로 나눈 수수료 구조입니다.
baseFee는 네트워크 혼잡도에 따라 블록마다 조정되고 소각되며,
priority fee는 검증자에게 가는 우선순위 수수료입니다.
지갑 앱에서는 최신 블록의 baseFee를 보고 EIP-1559 지원 여부를 판단한 뒤,
legacy gasPrice 방식과 type 0x02 트랜잭션 생성을 분기했습니다.
```

## 참고하면 좋은 공식 문서

- [EIP-1559: Fee market change for ETH 1.0 chain](https://eips.ethereum.org/EIPS/eip-1559)
- [EIP-2718: Typed Transaction Envelope](https://eips.ethereum.org/EIPS/eip-2718)

## 정리

EIP-1559는 지갑 앱에서 수수료를 계산하고 설명하는 방식을 바꾼 표준이다.

```text
legacy:
gasPrice

EIP-1559:
baseFeePerGas
maxPriorityFeePerGas
maxFeePerGas
```

Android 지갑 앱에서는 네트워크가 EIP-1559를 지원하는지 확인하고, 사용자에게 예상 수수료와 최대 수수료를 구분해 보여줘야 한다.

그리고 트랜잭션을 만들 때는 단순히 gas 값을 채우는 것이 아니라, pending, replacement, timeout 같은 상태 처리까지 함께 봐야 한다.

결국 EIP-1559를 이해한다는 것은 "gas fee가 얼마인가"를 넘어, 사용자가 어떤 상한선을 설정하고 네트워크가 어떤 기본 비용을 요구하는지 나눠 보는 일이다.
