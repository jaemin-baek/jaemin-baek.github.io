---
title: "KMP에서 Flow를 Swift 친화적으로 노출하기"
date: "2024-01-24"
category: "Android"
group: "January Reading Challenge"
series: "January Reading Challenge"
tags: ["kmp","flow","swift","interop"]
description: "2023-09-14에 발행된 Android 개발 글을 바탕으로 KMP에서 Flow를 Swift 친화적으로 노출하기를 정리합니다."
draft: true
---

![KMP에서 Flow를 Swift 친화적으로 노출하기](/images/kmp-flow-swift-friendly-api.svg)

KMP에서 Kotlin Flow를 그대로 iOS에 노출하면 Android 개발자에게는 자연스럽지만 Swift 개발자에게는 낯설 수 있다. 공유 코드는 두 플랫폼이 함께 쓰는 코드이기 때문에, API 표면도 양쪽 언어의 사용성을 고려해야 한다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [KMP: Bridging native iOS API with Kotlin Multiplatform](https://www.droidcon.com/2023/09/14/writing-swift-friendly-kotlin-multiplatform-apis-part-ix-flow/) (2023-09-14)

## 읽고 남긴 포인트

- 공유 모듈의 public API는 Kotlin만 보는 것이 아니라 Swift에서의 호출 형태까지 봐야 한다.
- 비동기 스트림은 cancel, lifecycle, error 전달 방식을 명확히 해야 한다.
- 좋은 KMP API는 내부 구현보다 사용하는 쪽의 언어 감각을 존중한다.

## 프로젝트에 적용한다면

- Flow를 iOS에 노출할 때 wrapper나 adapter를 두어 Swift에서 자연스럽게 구독하게 만든다.
- 구독 해제와 메모리 해제를 샘플 코드에 포함한다.
- Android와 iOS 개발자가 함께 API 리뷰를 진행한다.

## 정리

KMP의 성공은 공유 코드가 얼마나 많은지가 아니라, 각 플랫폼 개발자가 그 코드를 편하게 믿고 쓰는지에 달려 있다

## 함께 읽기

- [[kotlin-multiplatform-ecosystem-map|Kotlin Multiplatform을 도입하기 전에 볼 생태계 지도]]
- [[kmm-existing-app-first-step|기존 앱에 Kotlin Multiplatform을 처음 넣는 방법]]
- [[kmp-real-world-boundaries|실무 KMP에서 공유할 것과 남겨둘 것]]
