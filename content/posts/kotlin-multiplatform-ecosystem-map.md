---
title: "Kotlin Multiplatform을 도입하기 전에 볼 생태계 지도"
date: "2024-01-15"
category: "Android"
tags: ["kotlin-multiplatform","kmp","architecture","shared-code"]
description: "2023-06-21에 발행된 Android 개발 글을 바탕으로 Kotlin Multiplatform을 도입하기 전에 볼 생태계 지도를 정리합니다."
---

![Kotlin Multiplatform을 도입하기 전에 볼 생태계 지도](/images/kotlin-multiplatform-ecosystem-map.svg)

KMP를 볼 때 “코드를 얼마나 공유할 수 있는가”만 묻기 쉽다. 하지만 더 중요한 질문은 어떤 코드를 공유하면 제품 개발이 쉬워지는가다. 네트워크, 데이터 모델, 비즈니스 규칙은 공유하기 좋지만 UI와 플랫폼 기능은 신중해야 한다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Exploring the Kotlin Multiplatform ecosystem](https://www.droidcon.com/2023/06/21/exploring-the-kotlin-multiplatform-ecosystem/) (2023-06-21)

## 읽고 남긴 포인트

- 공유율이 높다고 항상 좋은 KMP 구조는 아니다.
- 플랫폼별 UX 차이가 큰 영역은 공통화보다 경계 설계가 중요하다.
- 라이브러리 생태계와 팀의 iOS 이해도가 함께 준비되어야 한다.

## 프로젝트에 적용한다면

- 먼저 네트워크 클라이언트, DTO, use case처럼 플랫폼 의존이 낮은 영역부터 공유한다.
- 공유 모듈은 Android 팀만 이해하는 구조로 만들지 않는다.
- iOS 빌드와 배포 흐름을 CI에서 함께 검증한다.

## 정리

KMP는 “한 번 만들고 두 번 쓰기”보다 “같은 규칙을 두 플랫폼에서 다르게 표현하기”에 더 가깝다.
