---
title: "Fragment 기반 앱에서 Compose로 점진 전환하기"
date: "2024-01-14"
category: "Android"
group: "January Reading Challenge"
series: "January Reading Challenge"
tags: ["compose","fragment","migration","architecture"]
description: "2023-06-05에 발행된 Android 개발 글을 바탕으로 Fragment 기반 앱에서 Compose로 점진 전환하기를 정리합니다."
---

![Fragment 기반 앱에서 Compose로 점진 전환하기](/images/gradual-compose-transition-turo.svg)

이미 Fragment 기반으로 운영 중인 앱이라면 Compose 전환은 새 프로젝트처럼 깔끔하게 시작되지 않는다. Turo의 글에서 중요한 포인트는 기존 구조를 인정한 상태에서 Compose를 끼워 넣는 경계선을 설계했다는 점이다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Designing Jetpack Compose architecture for a gradual transition from Fragments](https://medium.com/turo-engineering/designing-jetpack-compose-architecture-for-a-gradual-transition-from-fragments-on-android-b11ee5f19ba8) (2023-06-05)

## 읽고 남긴 포인트

- 마이그레이션의 핵심은 새 구조보다 기존 구조와 만나는 지점을 안정적으로 만드는 것이다.
- Fragment가 navigation owner라면 Compose는 화면 렌더링에 집중하게 할 수 있다.
- 점진 전환에서는 완벽한 아키텍처보다 되돌릴 수 있는 작은 변경이 더 중요하다.

## 프로젝트에 적용한다면

- Fragment 안에서는 ComposeView를 명확한 진입점으로 둔다.
- Compose 화면은 ViewModel의 UI State를 받아 그리는 구조로 제한한다.
- 새 화면부터 Compose로 만들고, 오래된 핵심 화면은 위험도를 따져 천천히 옮긴다.

## 정리

점진 전환은 타협이 아니라 운영 중인 제품을 지키는 방식이다. 좋은 경계만 있으면 두 UI 체계는 꽤 오래 공존할 수 있다

## 함께 읽기

- [[nibel-compose-navigation-boundary|Compose 전환기의 Navigation 경계 정리하기]]
- [[compose-interop-migration-real-world|Compose와 View가 함께 있는 화면을 다루는 법]]
- [[mercari-compose-migration-notes|Mercari의 Compose 전환 사례에서 배운 점]]
