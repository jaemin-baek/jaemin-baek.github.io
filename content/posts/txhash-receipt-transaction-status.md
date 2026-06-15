---
title: "txHash와 receipt로 트랜잭션 상태 추적하기"
date: "2026-06-01"
category: "Blockchain"
group: "Blockchain Basics"
series: "Blockchain Basics"
tags: ["blockchain", "ethereum", "evm", "wallet", "transaction", "txhash", "receipt", "android"]
description: "Android 지갑 앱에서 EVM 트랜잭션을 전송한 뒤 txHash와 receipt를 기준으로 pending, success, fail, timeout 상태를 어떻게 추적할 수 있는지 정리합니다."
---

![EVM 트랜잭션 상태 추적 흐름](/images/evm-tx-status-tracking-handdrawn.png)

지갑 앱에서 트랜잭션을 보낼 때 가장 헷갈렸던 지점은 "전송 완료"라는 말이었다.

사용자 입장에서는 지갑에서 확인 버튼을 누르고, 앱에 `전송 완료` 같은 문구가 뜨면 일이 끝난 것처럼 보인다. 하지만 EVM 트랜잭션에서는 이 시점이 보통 끝이 아니다.

정확히는 이런 흐름에 가깝다.

```text
서명 완료
-> 노드에 raw transaction 전송
-> txHash 수신
-> pending 상태 추적
-> receipt 확인
-> 성공/실패 판정
```

이 글은 txHash와 receipt의 개념을 따로 외우기 위한 글이 아니다. Android 지갑 앱에서 실제 트랜잭션을 보낸 뒤, 화면 상태와 로컬 저장소, 백그라운드 추적을 어떻게 이어가면 좋은지 정리한 구현 메모에 가깝다.

[[web3-service-basics|Web3 기반 서비스]]에서 전체 흐름을 봤다면, 여기서는 그중 "서명된 트랜잭션을 보낸 다음 앱이 무엇을 기다려야 하는가"에 집중한다.

## 먼저 한 문장으로 보기

txHash와 receipt를 한 문장씩 줄이면 이렇게 볼 수 있다.

```text
txHash는 네트워크에 제출한 트랜잭션을 추적하기 위한 접수 번호다.

receipt는 그 트랜잭션이 블록에 포함된 뒤 만들어지는 실행 결과표다.
```

여기서 중요한 차이는 시점이다.

txHash는 보통 `eth_sendRawTransaction` 호출이 성공하면 바로 받을 수 있다. 하지만 이때 트랜잭션이 성공했다는 뜻은 아니다. 노드가 서명된 트랜잭션을 받아들였고, 그 트랜잭션을 가리키는 해시를 돌려준 것이다.

receipt는 나중에 생긴다. 트랜잭션이 블록에 포함되고 실행된 뒤에야 조회된다. 그래서 receipt가 아직 없으면 보통 pending으로 본다.

```text
txHash 있음 + receipt 없음 = 아직 결과를 기다리는 중
txHash 있음 + receipt 있음 = 실행 결과를 판정할 수 있음
```

이 구분을 앱 상태 모델에 넣어두면, "전송했다"와 "성공했다"를 섞지 않을 수 있다.

## txHash는 성공 결과가 아니다

지갑에서 서명된 트랜잭션을 만든 뒤에는 RPC 노드에 전송한다.

```text
eth_sendRawTransaction(rawTransaction)
```

호출이 성공하면 노드는 보통 트랜잭션 해시를 돌려준다.

```json
{
  "result": "0x9f3c..."
}
```

이 값을 받으면 앱 입장에서는 중요한 기준점이 생긴다.

- 사용자가 보낸 트랜잭션을 식별할 수 있다.
- 블록 탐색기 링크를 만들 수 있다.
- 이후 receipt를 조회할 수 있다.
- 앱을 재시작해도 같은 트랜잭션을 다시 추적할 수 있다.

하지만 txHash만 보고 성공 화면을 확정하면 안 된다.

txHash는 "네트워크에 제출된 트랜잭션의 식별자"에 가깝다. 아직 블록에 들어가지 않았을 수 있고, 들어가더라도 컨트랙트 실행이 revert될 수 있다. 수수료 조건이 낮아서 오래 pending일 수도 있다.

그래서 앱 문구도 다르게 잡는 편이 좋다.

```text
좋은 표현:
트랜잭션을 전송했어요.
네트워크에서 처리 중이에요.
블록에 포함되면 결과가 업데이트돼요.

위험한 표현:
전송에 성공했어요.
처리가 완료됐어요.
자산 이동이 완료됐어요.
```

txHash를 받은 시점에는 "접수" 또는 "제출"에 가깝고, "완료"는 receipt를 확인한 뒤에 말하는 편이 안전하다.

## receipt는 실행 결과표다

receipt는 트랜잭션이 블록에 포함된 뒤 조회할 수 있다.

```text
eth_getTransactionReceipt(txHash)
```

아직 블록에 포함되지 않았다면 결과는 보통 `null`이다. 이 상태가 pending이다.

블록에 포함되면 receipt 안에서 이런 값을 볼 수 있다.

| 필드 | 앱에서 보는 의미 |
| --- | --- |
| `transactionHash` | 추적하던 txHash와 같은지 확인 |
| `blockNumber` | 어떤 블록에 포함됐는지 |
| `status` | EVM 실행 성공 여부. 보통 `1`은 성공, `0`은 실패 |
| `gasUsed` | 실제 사용된 gas |
| `effectiveGasPrice` | 실제 적용된 gas 가격 |
| `logs` | 컨트랙트 이벤트 로그 |
| `from`, `to` | 보낸 주소와 대상 주소 |

여기서 앱 상태를 가르는 핵심은 보통 `status`다.

```text
receipt.status == 1 -> 성공
receipt.status == 0 -> 실패 또는 revert
receipt == null -> 아직 pending
```

중요한 점은 실패한 트랜잭션도 receipt가 생긴다는 것이다. 컨트랙트 실행이 revert되면 상태 변경은 반영되지 않지만, 네트워크가 실행을 시도했기 때문에 gas는 소모될 수 있다.

```text
receipt 있음 + status 0 = 처리 실패
receipt 없음 = 아직 결과 모름
```

이 둘을 나누지 않으면 앱에서 "오래 걸린다"와 "실패했다"를 잘못 섞게 된다.

## txHash와 receipt 차이

두 값을 그림으로 나누면 이렇게 볼 수 있다.

![txHash와 receipt의 차이](/images/txhash-receipt-difference-handdrawn.png)

처음 구현할 때는 아래 표처럼 나눠두면 편하다.

| 구분 | txHash | receipt |
| --- | --- | --- |
| 생기는 시점 | raw transaction을 노드에 보낸 직후 | 트랜잭션이 블록에 포함된 뒤 |
| 의미 | 추적 식별자 | 실행 결과 |
| 아직 결과가 없을 수 있는가 | 그렇다 | 조회 결과가 `null`일 수 있다 |
| 성공/실패 판정 가능 | 불가능 | `status`로 판정 가능 |
| UI에서 쓸 곳 | pending 화면, 탐색기 링크, 추적 키 | 완료 화면, 실패 화면, gas/log 표시 |

그래서 지갑 앱에서는 txHash를 받는 즉시 로컬에 저장하고, receipt는 별도의 추적 작업으로 기다리는 편이 좋다.

## Android 앱에서는 상태를 먼저 나눈다

트랜잭션 상태를 단순히 `loading`, `success`, `error`로만 두면 금방 애매해진다.

지갑 앱에서는 최소한 아래 정도의 상태를 나누는 편이 낫다.

```kotlin
sealed interface TxTrackState {
    data object Signing : TxTrackState
    data object Broadcasting : TxTrackState
    data class Pending(
        val txHash: String,
        val submittedAtMillis: Long,
    ) : TxTrackState

    data class Success(
        val txHash: String,
        val blockNumber: Long,
        val gasUsed: String,
    ) : TxTrackState

    data class Failed(
        val txHash: String,
        val blockNumber: Long,
        val reason: String? = null,
    ) : TxTrackState

    data class Timeout(
        val txHash: String,
    ) : TxTrackState
}
```

핵심은 `Pending`, `Failed`, `Timeout`을 분리하는 것이다.

`Failed`는 receipt가 있고 `status`가 실패일 때다. 반면 `Timeout`은 앱이 정한 시간 안에 receipt를 확인하지 못한 상태다. timeout은 실패가 아니다.

```text
timeout = 앱이 기다리기를 멈춘 것
failed = 체인에서 실행 결과가 실패로 나온 것
```

그래서 timeout 화면에서는 "실패했습니다"보다 "처리가 지연되고 있어요"에 가깝게 안내해야 한다. 블록 탐색기 링크를 함께 보여주면 사용자가 앱 밖에서도 상태를 확인할 수 있다.

## 로컬에는 무엇을 저장할까

txHash를 받은 뒤 앱이 바로 종료될 수도 있다. 사용자가 네트워크가 느린 상태에서 앱을 백그라운드로 보낼 수도 있다.

그래서 txHash를 메모리에만 두면 위험하다. 최소한 로컬 DB에는 이런 정보를 저장해두는 편이 좋다.

| 값 | 이유 |
| --- | --- |
| `localId` | 앱 내부에서 만든 요청 식별자 |
| `chainId` | 어떤 네트워크의 트랜잭션인지 구분 |
| `from` | 보낸 지갑 주소 |
| `nonce` | 같은 계정의 트랜잭션 순서 추적 |
| `txHash` | receipt 조회와 탐색기 링크에 사용 |
| `submittedAt` | timeout 판단에 사용 |
| `state` | pending, success, failed 등 현재 상태 |
| `actionType` | transfer, swap, approve 같은 화면 문맥 |

개인키나 시드 구문은 당연히 저장 대상이 아니다. raw transaction도 꼭 필요하지 않다면 오래 저장하지 않는 편이 좋다. 이미 txHash를 받은 뒤의 추적에는 보통 txHash와 chainId가 핵심이다.

[[android-wallet-secret-storage-keystore-tink|Android 지갑에서 Secret을 저장하는 방식]]을 다룰 때와 마찬가지로, 추적용 데이터와 비밀키 데이터는 성격을 분리해서 봐야 한다.

## polling은 receipt 기준으로 한다

가장 단순한 추적 방식은 주기적으로 receipt를 조회하는 것이다.

```kotlin
suspend fun waitForReceipt(
    txHash: String,
    timeoutMillis: Long,
): TxTrackState {
    val startedAt = clock.nowMillis()

    while (clock.nowMillis() - startedAt < timeoutMillis) {
        val receipt = rpc.getTransactionReceipt(txHash)

        if (receipt != null) {
            return if (receipt.status == "0x1") {
                TxTrackState.Success(
                    txHash = txHash,
                    blockNumber = receipt.blockNumber.toLong(),
                    gasUsed = receipt.gasUsed,
                )
            } else {
                TxTrackState.Failed(
                    txHash = txHash,
                    blockNumber = receipt.blockNumber.toLong(),
                )
            }
        }

        delay(nextPollingDelay())
    }

    return TxTrackState.Timeout(txHash)
}
```

실제 앱에서는 이 로직을 화면에만 붙이지 않는 편이 좋다. 화면이 닫혀도 추적은 이어질 수 있기 때문이다.

Android에서는 보통 이런 식으로 역할을 나눈다.

```text
Repository:
txHash와 receipt 조회 결과를 저장한다.

Worker:
pending 트랜잭션을 주기적으로 확인한다.

ViewModel:
로컬 DB의 상태를 Flow로 구독해 화면에 보여준다.
```

화면은 RPC를 직접 계속 때리는 주체가 아니라, 로컬 상태를 관찰하는 쪽에 가까워진다. 그래야 앱 재시작, 화면 회전, 백그라운드 복귀에도 상태가 덜 흔들린다.

## 상태 모델은 이렇게 흘러간다

앱의 상태 모델을 그림으로 보면 이런 느낌이다.

![Android 지갑 앱의 트랜잭션 상태 모델](/images/android-wallet-transaction-state-machine-handdrawn.png)

실제 흐름은 대략 이렇다.

1. 사용자가 지갑 화면에서 트랜잭션을 확인한다.
2. 앱이 트랜잭션에 서명하고 raw transaction을 만든다.
3. `eth_sendRawTransaction`으로 노드에 전송한다.
4. txHash를 받으면 로컬 DB에 pending으로 저장한다.
5. Worker나 Repository가 receipt를 주기적으로 조회한다.
6. receipt가 아직 없으면 pending을 유지한다.
7. receipt가 있으면 `status`를 보고 success 또는 failed로 바꾼다.
8. 너무 오래 receipt가 없으면 timeout으로 표시하되, 실패로 확정하지 않는다.

이렇게 두면 UI 문구도 자연스럽게 나뉜다.

| 상태 | 사용자에게 보여줄 말 |
| --- | --- |
| `Signing` | 지갑에서 트랜잭션을 확인하고 있어요 |
| `Broadcasting` | 네트워크에 트랜잭션을 보내는 중이에요 |
| `Pending` | 블록에 포함되기를 기다리고 있어요 |
| `Success` | 트랜잭션이 성공했어요 |
| `Failed` | 트랜잭션 실행이 실패했어요 |
| `Timeout` | 처리가 지연되고 있어요. 탐색기에서 계속 확인할 수 있어요 |

작은 차이지만, 사용자는 이 문구를 보고 지금 무엇을 기다리는지 판단한다.

## timeout은 실패가 아니다

지갑 앱에서 특히 조심해야 하는 상태가 timeout이다.

앱은 보통 무한정 polling하지 않는다. 예를 들어 3분이나 10분 동안 receipt가 없으면 화면에서는 기다리기를 멈출 수 있다.

하지만 이때 체인에서 실패가 확정된 것은 아니다.

```text
앱의 timeout:
우리가 정한 시간 안에 receipt를 못 봤다.

체인의 실패:
receipt가 있고 status가 실패다.
```

수수료가 낮거나 네트워크가 혼잡하면 트랜잭션이 오래 pending일 수 있다. RPC 노드가 일시적으로 불안정해서 receipt 조회가 늦을 수도 있다. 사용자가 앱을 닫은 뒤 나중에 블록에 포함될 수도 있다.

그래서 timeout 상태에서는 txHash를 버리지 말아야 한다.

좋은 처리 방식은 이렇다.

- txHash와 chainId를 계속 저장한다.
- 블록 탐색기 링크를 제공한다.
- 앱 재진입 시 pending 또는 timeout 트랜잭션을 다시 확인한다.
- receipt가 뒤늦게 발견되면 success 또는 failed로 업데이트한다.

timeout을 실패로 저장해버리면 나중에 실제로 성공한 트랜잭션과 앱 상태가 어긋날 수 있다.

## 실패한 트랜잭션도 gas를 쓸 수 있다

receipt의 `status`가 실패라고 해서 "아무 일도 없었다"는 뜻은 아니다.

예를 들어 컨트랙트 호출이 조건을 만족하지 못해 revert될 수 있다.

```text
잔액 부족
allowance 부족
slippage 초과
이미 처리된 요청
컨트랙트 내부 require 실패
```

이런 경우 상태 변경은 되돌아가지만, 네트워크가 실행을 시도한 gas는 소모될 수 있다.

그래서 실패 화면에서는 단순히 "취소되었습니다"라고 표현하면 안 될 수 있다. 사용자가 수수료가 왜 빠졌는지 이해하지 못하기 때문이다.

```text
트랜잭션 실행은 실패했지만,
네트워크 실행 비용은 발생할 수 있어요.
```

이 문장이 모든 서비스 화면에 꼭 들어가야 한다는 뜻은 아니다. 다만 지갑 앱 내부 모델에서는 `Failed`와 `Cancelled`를 섞지 않는 편이 좋다.

## 같은 nonce의 새 txHash를 조심한다

pending 트랜잭션이 오래 걸리면 사용자는 speed up 또는 cancel을 누를 수 있다. EVM 계열에서는 보통 같은 `from`과 같은 `nonce`로 더 높은 수수료의 새 트랜잭션을 보내는 식으로 처리한다.

이때 새 txHash가 생긴다.

```text
원래 트랜잭션:
nonce 12, txHash A

speed up 트랜잭션:
nonce 12, txHash B
```

블록에는 둘 중 하나만 들어갈 수 있다. 같은 계정의 같은 nonce는 한 번만 처리되기 때문이다.

그래서 앱에서 추적 단위를 txHash 하나로만 잡으면 헷갈릴 수 있다. 사용자의 한 액션과 여러 후보 txHash를 연결할 수 있어야 한다.

```text
local action id
-> txHash A
-> txHash B
```

receipt가 B에서 발견되면 A는 더 이상 최종 트랜잭션이 아닐 수 있다. 이 경우 화면에서는 "대체된 트랜잭션" 또는 "새 트랜잭션으로 처리 중"처럼 보여줄 수 있다.

처음부터 이 케이스를 완벽히 처리하지 않더라도, 로컬 DB에 `from`, `nonce`, `chainId`, `localId`를 같이 저장해두면 나중에 확장하기 쉽다.

## 앱에서 실수하기 쉬운 지점

구현하면서 자주 헷갈리는 지점은 대략 이런 쪽이다.

첫째, txHash를 받자마자 성공으로 표시하는 것이다. txHash는 추적 키이지 성공 결과가 아니다.

둘째, receipt가 `null`인 것을 실패로 처리하는 것이다. receipt가 없으면 아직 결과를 모르는 상태다.

셋째, timeout을 실패로 저장하는 것이다. timeout은 앱의 관찰 시간이 끝난 것이지 체인의 실패가 아니다.

넷째, 실패 receipt를 취소처럼 보여주는 것이다. 실패한 트랜잭션도 gas를 쓸 수 있다.

다섯째, 앱 재시작 후 pending 상태를 잃는 것이다. txHash를 로컬에 저장하지 않으면 사용자가 다시 들어왔을 때 추적을 이어가기 어렵다.

여섯째, chainId를 빼고 txHash만 저장하는 것이다. 지갑 앱은 여러 네트워크를 다룰 수 있으므로 어떤 체인의 txHash인지 함께 남겨야 한다.

## UX에서 보여주면 좋은 것

트랜잭션 상태 화면에서는 너무 많은 필드를 한꺼번에 보여줄 필요는 없다. 하지만 아래 정보는 도움이 된다.

- 현재 상태: 처리 중, 성공, 실패, 지연
- txHash 축약값
- 블록 탐색기 링크
- 네트워크 이름
- 보낸 주소와 받는 주소
- 금액 또는 호출한 액션
- 실패 시 가능한 원인
- 성공 후 block number 또는 완료 시간

특히 txHash는 사용자가 고객지원이나 팀 내부 디버깅에서 상태를 공유할 때도 유용하다.

```text
"안 됐어요"보다
"이 txHash가 아직 pending이에요"가 훨씬 추적하기 쉽다.
```

지갑 앱에서 txHash를 복사하는 버튼과 탐색기 열기 버튼을 제공하는 이유가 여기에 있다.

## 정리

txHash와 receipt를 나눠서 보면 지갑 앱의 트랜잭션 상태가 훨씬 선명해진다.

```text
txHash는 접수 번호다.
receipt는 실행 결과표다.
receipt가 없으면 pending이다.
receipt.status가 1이면 성공이다.
receipt.status가 0이면 실패다.
timeout은 실패가 아니다.
```

Android 지갑 앱에서는 이 차이를 로컬 상태 모델에 그대로 반영하는 편이 좋다.

```text
서명한다.
전송한다.
txHash를 저장한다.
receipt를 기다린다.
결과를 판정한다.
늦어지면 실패가 아니라 지연으로 다룬다.
```

이 흐름을 지키면 사용자에게도 더 정확한 화면을 보여줄 수 있고, 개발자도 트랜잭션 이슈를 훨씬 안정적으로 추적할 수 있다.

트랜잭션 처리는 결국 "버튼을 눌렀다"에서 끝나지 않는다. 지갑 앱은 사용자의 의도가 블록체인 위에서 실제 결과로 확정될 때까지, txHash와 receipt 사이의 시간을 잘 다뤄야 한다.

## 참고하면 좋은 공식 문서

- [Ethereum JSON-RPC API](https://ethereum.org/en/developers/docs/apis/json-rpc/)
- [Ethereum transactions](https://ethereum.org/en/developers/docs/transactions/)
- [Ethereum gas and fees](https://ethereum.org/en/developers/docs/gas/)
