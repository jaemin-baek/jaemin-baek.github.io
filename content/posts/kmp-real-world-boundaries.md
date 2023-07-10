---
title: "실무 KMP에서 공유할 것과 남겨둘 것"
date: "2024-01-26"
category: "Android"
group: "January Reading Challenge"
series: "January Reading Challenge"
tags: ["kotlin-multiplatform","architecture","android","ios"]
description: "2023-10-06에 발행된 Android 개발 글을 바탕으로 실무 KMP에서 공유할 것과 남겨둘 것를 정리합니다."
---

![실무 KMP에서 공유할 것과 남겨둘 것](/images/kmp-real-world-boundaries.svg)

실무에서 KMP를 도입할 때 가장 어려운 문제는 기술 자체보다 경계다. 무엇을 공유하고, 무엇을 플랫폼에 남기고, 어느 팀이 어떤 책임을 갖는지 정하지 않으면 공유 코드는 금방 부담이 된다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Adopting Kotlin Multiplatform in real life](https://www.droidcon.com/2023/10/06/adopting-kotlin-multiplatform-in-real-life/) (2023-10-06)

## 읽고 남긴 포인트

- 공유 코드는 중복을 줄이지만 의사결정 비용을 늘릴 수 있다.
- 도메인 규칙과 데이터 변환은 공유하기 좋지만 화면 UX는 플랫폼별 차이를 존중해야 한다.
- KMP는 Android 팀의 전유물이 아니라 모바일 팀 전체의 계약이다.

## 프로젝트에 적용한다면

- 공유 후보 코드를 변경 빈도, 플랫폼 의존도, 테스트 용이성으로 평가한다.
- 공유 모듈 owner와 리뷰 규칙을 명확히 둔다.
- 공유 코드 실패 시 플랫폼별 fallback 전략을 마련한다.

## 정리

KMP의 목표는 모든 차이를 없애는 것이 아니라, 제품 규칙의 중복을 줄이고 플랫폼 경험은 살리는 것이다

## 함께 읽기

- [[kotlin-multiplatform-ecosystem-map|Kotlin Multiplatform을 도입하기 전에 볼 생태계 지도]]
- [[kmm-existing-app-first-step|기존 앱에 Kotlin Multiplatform을 처음 넣는 방법]]
- [[kmp-flow-swift-friendly-api|KMP에서 Flow를 Swift 친화적으로 노출하기]]
