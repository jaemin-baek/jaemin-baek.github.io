---
title: "Swap 이해하기"
date: "2026-01-13"
category: "Blockchain"
group: "Blockchain Basics"
series: "Blockchain Basics"
tags: ["blockchain", "defi", "swap", "dex", "erc-20", "approve", "allowance", "router", "slippage"]
description: "블록체인과 DeFi에서 말하는 swap이 무엇인지, transfer와 어떻게 다른지, ERC-20 approve 흐름과 swap 관련 표준 및 프로토콜 인터페이스를 초심자 관점에서 정리합니다."
---

![Swap 이해하기](/images/swap-token-exchange-cover.png)

DeFi를 공부하다 보면 `swap`이라는 단어를 아주 자주 본다. Uniswap에서도 swap을 하고, 지갑 앱에서도 swap 버튼이 있고, 브릿지나 애그리게이터에서도 swap이라는 표현을 쓴다.

처음에는 그냥 "코인을 바꾸는 것" 정도로 이해해도 된다. 그런데 조금 더 들어가면 `transfer`, `approve`, `allowance`, `router`, `pool`, `slippage` 같은 단어가 같이 따라온다.

이 글은 [[uniswap-dex-basics|Uniswap 이해하기]] 다음에 이어서, swap이라는 행동 자체를 조금 더 천천히 풀어보는 메모다.

## 먼저 한 문장으로 보기

Swap을 한 문장으로 줄이면 이렇게 볼 수 있다.

```text
Swap은 내가 가진 토큰을 다른 토큰으로 교환하는 온체인 실행 흐름이다.
```

여기서 중요한 단어는 세 개다.

- 토큰 교환
- 온체인 실행
- 흐름

Swap은 단순히 내 지갑에서 토큰 하나가 다른 토큰으로 이름만 바뀌는 일이 아니다. 보통은 스마트 컨트랙트가 실행되고, 유동성 풀이 움직이고, 내 토큰 잔액과 풀의 토큰 잔액이 함께 바뀐다.

처음에는 이렇게 보면 좋다.

```text
내가 토큰 A를 낸다.
스마트 컨트랙트가 정해진 규칙으로 교환한다.
나는 토큰 B를 받는다.
```

## Transfer와 Swap은 다르다

초심자가 먼저 나눠야 하는 것은 transfer와 swap이다.

`transfer`는 토큰을 다른 주소로 보내는 일이다. 내가 가진 `USDC`를 친구 주소로 보내면, 친구도 `USDC`를 받는다. 토큰 종류는 바뀌지 않는다.

반면 `swap`은 토큰의 종류가 바뀐다. 내가 `ETH`를 넣고 `USDC`를 받거나, `USDC`를 넣고 `UNI`를 받는 식이다.

| 구분 | Transfer | Swap |
| --- | --- | --- |
| 의미 | 같은 토큰을 다른 주소로 전송 | 한 토큰을 다른 토큰으로 교환 |
| 예시 | 내 USDC -> 친구 USDC | 내 ETH -> 내 USDC |
| 주요 상대 | 받는 주소 | DEX 컨트랙트, 유동성 풀 |
| 가격 계산 | 보통 없음 | 필요함 |
| 자주 보는 값 | 받는 주소, 수량 | 예상 수령량, 슬리피지, 경로 |

transfer는 "누구에게 보낼까"가 중요하다.

swap은 "무엇을 무엇으로, 어떤 가격과 경로로 바꿀까"가 중요하다.

## Swap은 매수와 매도보다 교환에 가깝다

거래소에 익숙하면 swap을 "매수"나 "매도"로 생각할 수 있다. 틀린 표현은 아니지만, 온체인 DEX에서는 교환이라는 감각이 더 잘 맞는다.

예를 들어 `ETH -> USDC` swap은 이렇게 볼 수 있다.

```text
내 ETH를 풀에 넣는다.
풀에서 USDC를 받는다.
```

반대로 `USDC -> ETH` swap은 이렇게 볼 수 있다.

```text
내 USDC를 풀에 넣는다.
풀에서 ETH를 받는다.
```

중앙화 거래소에서는 주문서에서 누군가의 매수 주문과 매도 주문이 매칭된다. 하지만 [[uniswap-dex-basics|Uniswap]] 같은 AMM 기반 DEX에서는 사용자가 특정 사람과 직접 거래한다기보다, 유동성 풀과 상호작용하는 경우가 많다.

그래서 swap을 볼 때는 아래 질문이 더 도움이 된다.

```text
내 토큰은 어떤 컨트랙트로 들어갔고,
어떤 토큰이 내 주소로 돌아왔는가?
```

## 기본 흐름은 approve와 swap으로 나뉠 수 있다

ERC-20 토큰을 DEX에서 swap할 때는 보통 두 단계가 보인다.

```text
approve
-> swap
```

approve는 "이 컨트랙트가 내 토큰을 사용할 수 있도록 허용한다"는 뜻이다. swap은 "실제로 토큰을 교환한다"는 뜻이다.

예를 들어 내가 `USDC`를 `ETH`로 바꾸려고 한다고 해보자. DEX router가 내 `USDC`를 가져가서 풀에 넣어야 한다. 그런데 아무 컨트랙트나 내 토큰을 마음대로 가져갈 수 있으면 위험하다.

그래서 먼저 사용자가 허용을 준다.

```text
내 주소
-> USDC 컨트랙트에 approve 요청
-> router가 내 USDC를 최대 얼마까지 쓸 수 있는지 기록
```

그 다음 swap 트랜잭션에서 router가 허용된 범위 안에서 내 토큰을 가져가고, 교환을 실행한다.

```text
router
-> 내 USDC를 가져감
-> 풀에서 교환
-> ETH 또는 WETH를 내 주소로 보냄
```

중요한 것은 approve 자체가 swap은 아니라는 점이다.

```text
approve = 사용 권한 부여
swap = 실제 교환 실행
```

## ERC-20이 swap의 바닥을 만든다

그럼 swap에는 표준이 있을까?

먼저 결론부터 보면, "swap"이라는 이름의 범용 ERC 표준이 하나로 정해져 있다고 보기는 어렵다. 대신 swap은 보통 ERC-20 표준의 토큰 기능 위에서 동작한다.

ERC-20은 토큰이 공통으로 제공해야 하는 함수와 이벤트를 정의한다. swap에서 특히 자주 만나는 것은 아래 함수들이다.

```solidity
function transfer(address _to, uint256 _value) public returns (bool success)
function approve(address _spender, uint256 _value) public returns (bool success)
function allowance(address _owner, address _spender) public view returns (uint256 remaining)
function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)
```

처음에는 이렇게 이해하면 된다.

| ERC-20 함수 | swap에서의 역할 |
| --- | --- |
| `approve` | router 같은 컨트랙트가 내 토큰을 쓸 수 있도록 허용 |
| `allowance` | 얼마나 허용했는지 확인 |
| `transferFrom` | 허용된 범위 안에서 컨트랙트가 내 토큰을 가져감 |
| `transfer` | 토큰을 특정 주소로 전송 |

즉 ERC-20은 "토큰을 어떻게 보낼 수 있는가"와 "다른 주소나 컨트랙트가 내 토큰을 어떻게 대신 사용할 수 있는가"를 정한다.

하지만 "어떤 풀에서 어떤 가격으로 교환할 것인가"까지 ERC-20이 정해주지는 않는다. 그 부분은 DEX 프로토콜의 컨트랙트와 라우팅 로직이 맡는다.

## Swap 자체는 프로토콜별 인터페이스다

Uniswap, Curve, Balancer, 1inch 같은 서비스는 모두 swap을 제공할 수 있다. 하지만 내부 컨트랙트 함수 이름과 파라미터는 서로 다를 수 있다.

예를 들어 Uniswap v2 router에서는 이런 함수 이름을 볼 수 있다.

```text
swapExactTokensForTokens
swapTokensForExactTokens
swapExactETHForTokens
swapExactTokensForETH
```

Uniswap v3 쪽에서는 이런 이름을 볼 수 있다.

```text
exactInputSingle
exactInput
exactOutputSingle
exactOutput
```

이름은 다르지만 큰 질문은 비슷하다.

```text
얼마를 넣을 것인가?
최소 얼마를 받을 것인가?
어떤 경로를 지날 것인가?
누가 받을 것인가?
언제까지 유효한 요청인가?
```

그래서 swap에는 "모든 DEX가 반드시 따라야 하는 하나의 ERC swap 함수"가 있다기보다, 각 프로토콜이 자기 방식의 router나 pool 인터페이스를 제공한다고 보는 편이 정확하다.

## Exact input과 exact output

swap 함수를 읽을 때 자주 보이는 표현이 있다.

- exact input
- exact output

exact input은 내가 넣을 수량을 정확히 정하는 방식이다.

```text
나는 1 ETH를 넣겠다.
대신 최소 3,000 USDC 이상은 받고 싶다.
```

이때 중요한 값은 `amountIn`과 `amountOutMin`이다. 내가 넣는 수량은 고정되고, 실제로 받는 수량은 풀 상태에 따라 달라질 수 있다. 대신 최소 수령량보다 적게 받게 되면 트랜잭션이 실패하도록 만들 수 있다.

exact output은 내가 받을 수량을 정확히 정하는 방식이다.

```text
나는 정확히 3,000 USDC를 받고 싶다.
대신 최대 1.02 ETH까지만 내겠다.
```

이때 중요한 값은 `amountOut`과 `amountInMax`다. 받는 수량은 고정되고, 그 수량을 받기 위해 최대 얼마까지 낼 수 있는지 제한한다.

처음에는 exact input이 더 직관적이다. 사용자가 "내가 가진 이만큼을 바꾸고 싶다"라고 생각하는 경우가 많기 때문이다.

## Slippage는 예상과 실제 사이의 여유다

swap 화면에서 slippage tolerance를 자주 본다. 이것은 예상 가격과 실제 실행 가격 사이에 허용할 차이를 뜻한다.

예를 들어 swap 화면에서 이렇게 보인다고 해보자.

```text
예상 수령량: 1,000 USDC
slippage tolerance: 0.5%
최소 수령량: 995 USDC
```

이 경우 트랜잭션이 실행될 때 실제 수령량이 995 USDC보다 작아지면 실패하도록 설정할 수 있다.

왜 이런 설정이 필요할까?

블록체인에서는 내가 버튼을 누른 순간과 트랜잭션이 실제로 블록에 들어가는 순간 사이에 시간이 있다. 그 사이 다른 사용자의 거래가 먼저 처리되면 풀의 상태가 바뀔 수 있다. 그러면 내가 처음 봤던 예상 수령량과 실제 수령량이 달라질 수 있다.

slippage를 너무 낮게 잡으면 트랜잭션이 자주 실패할 수 있다. 반대로 너무 높게 잡으면 예상보다 불리한 가격으로 체결될 수 있다.

```text
slippage는 실패 가능성과 불리한 체결 사이의 균형이다.
```

## Price impact는 내 거래가 풀을 얼마나 흔드는가다

slippage와 비슷하게 보이지만 price impact는 조금 다르다.

price impact는 내 거래 자체가 풀의 가격을 얼마나 움직이는지를 나타낸다. 유동성이 큰 풀에서 작은 금액을 swap하면 price impact가 작다. 반대로 유동성이 작은 풀에서 큰 금액을 swap하면 price impact가 커진다.

예를 들어 작은 풀에서 많은 `ETH`를 한 번에 가져가면, 풀 안의 `ETH`는 줄고 상대 토큰은 늘어난다. 그러면 교환 비율이 불리하게 움직인다.

처음에는 이렇게 나눠서 보면 좋다.

| 용어 | 의미 |
| --- | --- |
| price impact | 내 거래가 풀 가격을 움직이는 정도 |
| slippage | 예상 가격과 실제 실행 가격의 차이를 허용하는 범위 |

둘 다 swap 전에 확인해야 하는 값이지만, 원인은 다르다.

## Route와 hop도 swap의 일부다

swap은 항상 토큰 A에서 토큰 B로 바로 가는 것은 아니다.

예를 들어 `USDC -> UNI`를 바꾸고 싶다고 해보자. 직접 `USDC / UNI` 풀이 충분하지 않으면, router가 중간 토큰을 거치는 경로를 고를 수 있다.

```text
USDC -> WETH -> UNI
```

이런 경로에서는 두 개의 풀을 지난다.

```text
USDC / WETH 풀
WETH / UNI 풀
```

이때 각 풀을 지나는 단계를 [[uniswap-dex-basics|hop]]이라고 볼 수 있다.

route는 전체 길이고, hop은 그 길 안의 한 단계다.

```text
route = USDC -> WETH -> UNI
hop 1 = USDC -> WETH
hop 2 = WETH -> UNI
```

중간 토큰을 거치는 이유는 더 좋은 가격이나 더 깊은 유동성을 찾기 위해서다. 다만 hop이 많아지면 gas 비용과 실패 가능성도 같이 봐야 한다.

## Native coin과 wrapped token

swap에서 `ETH`와 `WETH`도 자주 헷갈린다.

ETH는 이더리움의 네이티브 코인이다. ERC-20 토큰이 아니다. 반면 WETH는 ETH를 ERC-20처럼 다루기 위해 감싼 토큰이다.

DEX 컨트랙트는 ERC-20 인터페이스를 기준으로 토큰을 다루는 경우가 많다. 그래서 내부적으로는 ETH를 WETH로 감싸거나, WETH를 다시 ETH로 풀어주는 과정이 보일 수 있다.

처음에는 이렇게 기억하면 된다.

```text
ETH = 네트워크의 기본 자산
WETH = ERC-20처럼 다룰 수 있게 감싼 ETH
```

화면에서는 ETH를 swap하는 것처럼 보여도, 컨트랙트 내부에서는 WETH가 경로에 들어갈 수 있다.

## Permit은 approve를 서명으로 줄여주는 방식이다

ERC-20 토큰을 swap할 때 approve 트랜잭션을 먼저 보내야 하면 번거롭다. 사용자는 approve 한 번, swap 한 번, 이렇게 두 번 서명해야 할 수 있다.

이 문제를 줄이기 위해 EIP-2612 `permit`이라는 방식이 있다.

permit은 토큰 사용 권한을 온체인 approve 트랜잭션으로 먼저 기록하는 대신, 사용자의 서명을 이용해 allowance를 설정할 수 있게 한다.

흐름은 대략 이렇다.

```text
사용자가 permit 메시지에 서명한다.
컨트랙트가 그 서명을 검증한다.
허용 권한을 설정한다.
바로 swap을 이어서 실행할 수 있다.
```

다만 모든 ERC-20 토큰이 permit을 지원하는 것은 아니다. EIP-2612는 ERC-20의 기본 필수 함수라기보다, approve UX를 개선하기 위한 확장에 가깝다.

Uniswap 생태계에서는 Permit2라는 컨트랙트도 많이 언급된다. Permit2는 여러 토큰 승인과 서명 기반 전송 흐름을 더 일관되게 다루기 위한 Uniswap 쪽 컨트랙트 시스템이다. 이것도 "swap이라는 ERC 표준"이라기보다는, 토큰 권한 관리를 더 편하게 만들기 위한 별도 인프라로 보는 편이 좋다.

## 표준인 것과 표준이 아닌 것

swap을 공부할 때는 아래처럼 나눠두면 덜 헷갈린다.

| 구분 | 표준인가 | 설명 |
| --- | --- | --- |
| ERC-20 | 예 | 토큰의 기본 함수와 이벤트 표준 |
| `approve`, `allowance`, `transferFrom` | 예 | ERC-20에 포함된 권한 부여와 전송 함수 |
| EIP-2612 `permit` | 표준 제안 | 서명으로 allowance를 설정하는 ERC-20 확장 |
| Uniswap router 함수 | 프로토콜 인터페이스 | Uniswap에서 swap을 실행하기 위한 함수 |
| `swap`이라는 일반 행동 | 개념 | 토큰을 교환한다는 사용자 행동 |
| 모든 DEX 공통 swap ABI | 보편 표준이라고 보기 어려움 | 프로토콜마다 함수와 파라미터가 다를 수 있음 |

결론은 이렇다.

```text
토큰을 다루는 기본은 ERC-20 표준에 가깝다.
하지만 swap 실행 방식은 DEX 프로토콜마다 다를 수 있다.
```

그래서 개발자가 swap을 붙일 때는 "ERC-20만 알면 끝"이 아니다. 어떤 DEX의 router를 쓸 것인지, 어떤 버전의 인터페이스를 호출할 것인지, native coin을 어떻게 처리할 것인지, permit이나 Permit2를 쓸 것인지까지 봐야 한다.

## 블록 탐색기에서 swap 읽기

실제 swap 트랜잭션을 블록 탐색기에서 보면 처음에는 복잡해 보인다. 그래도 아래 항목부터 보면 된다.

| 항목 | 확인할 것 |
| --- | --- |
| `From` | 어떤 지갑이 서명했는가 |
| `To` | 어떤 router나 컨트랙트를 호출했는가 |
| `Input Data` | 어떤 함수가 호출됐는가 |
| `Token Transfers` | 어떤 토큰이 나가고 들어왔는가 |
| `Logs` | pool이나 token 컨트랙트가 어떤 이벤트를 남겼는가 |
| `Gas` | 실행 비용이 얼마나 들었는가 |

swap 트랜잭션에서는 토큰 전송 이벤트가 여러 개 보일 수 있다. 내 주소에서 router로, router에서 pool로, pool에서 내 주소로 이동하는 식으로 중간 단계가 나뉠 수 있기 때문이다.

그래서 한 줄만 보고 판단하기보다 전체 흐름을 봐야 한다.

```text
내 주소에서 어떤 토큰이 빠져나갔는가?
최종적으로 내 주소로 어떤 토큰이 들어왔는가?
중간에 어떤 풀과 router가 관여했는가?
```

이 세 가지를 보면 swap 트랜잭션이 조금 덜 무섭게 보인다.

## Swap할 때 조심할 것

swap은 편하지만, 사용자가 직접 서명하는 온체인 행동이라는 점을 잊으면 위험하다.

- 토큰의 [[ticker-token-symbol|티커]]만 보고 진짜 토큰이라고 믿지 않는다.
- contract address와 chain을 확인한다.
- approve 요청인지 swap 요청인지 구분한다.
- 무제한 approve는 필요한 경우에만 신중하게 허용한다.
- 예상 수령량과 최소 수령량을 나눠서 본다.
- slippage를 너무 높게 잡지 않는다.
- price impact가 크면 풀 유동성이 충분한지 의심한다.
- 처음 보는 사이트의 router 주소를 그대로 믿지 않는다.

특히 swap 화면에서 가장 조용히 위험한 것은 approve다. swap 자체보다 먼저 내 토큰 사용 권한을 크게 열어주는 경우가 있기 때문이다.

그래서 지갑 팝업이 뜨면 "교환 버튼을 눌렀으니 다 같은 요청이겠지"라고 생각하지 말고, 요청 종류를 한 번 더 봐야 한다.

## 처음 실습할 때 볼 것

처음에는 소액이나 테스트 환경에서 아래 순서로 확인해보면 좋다.

1. swap할 chain을 확인한다.
2. 입력 토큰과 출력 토큰의 contract address를 확인한다.
3. approve 요청이 필요한지 본다.
4. 허용 수량이 얼마인지 확인한다.
5. 예상 수령량과 최소 수령량을 비교한다.
6. route와 hop이 표시되면 중간 토큰을 확인한다.
7. 트랜잭션 성공 후 블록 탐색기에서 token transfers를 따라간다.

이 실습의 목표는 좋은 가격을 찾는 것이 아니다. 내가 누른 swap 버튼이 어떤 컨트랙트 호출과 토큰 이동으로 바뀌는지 보는 것이다.

처음에는 이 질문만 잡아도 충분하다.

```text
나는 어떤 토큰을 허용했고,
어떤 컨트랙트가 그 토큰을 가져갔고,
최종적으로 어떤 토큰을 받았는가?
```

## 참고하면 좋은 공식 문서

Swap과 관련 표준을 확인하려면 아래 문서를 먼저 보면 좋다.

- [ERC-20 Token Standard](https://eips.ethereum.org/EIPS/eip-20)
- [EIP-2612: permit](https://eips.ethereum.org/EIPS/eip-2612)
- [Uniswap: Swaps](https://developers.uniswap.org/docs/get-started/concepts/traders/swaps)
- [Uniswap v2 Router02](https://docs.uniswap.org/contracts/v2/reference/smart-contracts/router-02)
- [Uniswap v3 ISwapRouter](https://docs.uniswap.org/contracts/v3/reference/periphery/interfaces/ISwapRouter)
- [Uniswap Permit2 Overview](https://docs.uniswap.org/contracts/permit2/overview)

문서를 읽을 때는 "swap이라는 단어가 있는가"보다 "이 문서가 토큰 표준을 설명하는지, router 인터페이스를 설명하는지, 사용자 UX를 설명하는지"를 나눠서 보면 덜 헷갈린다.

## 정리

Swap은 DeFi에서 가장 자주 만나는 행동 중 하나다. 하지만 안쪽을 보면 단순한 버튼 하나가 아니다.

```text
토큰 권한을 허용한다.
router나 pool 컨트랙트를 호출한다.
유동성 풀의 비율에 따라 가격이 계산된다.
최소 수령량과 slippage로 실행 조건을 제한한다.
결과적으로 내 주소의 토큰 잔액이 바뀐다.
```

그리고 표준 관점에서는 이렇게 정리할 수 있다.

```text
ERC-20은 토큰을 다루는 표준이다.
approve와 transferFrom은 swap의 바닥이 된다.
permit은 approve 경험을 줄여주는 확장이다.
swap 자체의 실행 인터페이스는 DEX마다 다를 수 있다.
```

그래서 swap을 이해한다는 것은 단순히 "A를 B로 바꾼다"를 넘어서, 권한 부여, 컨트랙트 호출, 유동성 풀, 경로, 최소 수령량을 함께 읽는 일에 가깝다.

처음에는 이 문장만 기억해도 좋다.

```text
Swap은 토큰 교환이지만, 그 전에 누가 내 토큰을 쓸 수 있는지부터 확인해야 한다.
```
