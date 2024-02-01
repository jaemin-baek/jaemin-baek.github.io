---
title: "Store5로 생각해보는 네트워크에 강한 앱 구조"
date: "2024-01-16"
category: "Android"
tags: ["kotlin","store5","offline-first","data-layer"]
description: "2023-07-20에 발행된 Android 개발 글을 바탕으로 Store5로 생각해보는 네트워크에 강한 앱 구조를 정리합니다."
---

![Store5로 생각해보는 네트워크에 강한 앱 구조](/images/store5-network-resilient-apps.svg)

네트워크에 강한 앱은 단순히 재시도를 많이 하는 앱이 아니다. 캐시, 로컬 소스, 원격 fetcher, 갱신 정책을 명확히 나눈 앱이다. Store5는 이런 데이터 흐름을 구조화해서 생각하게 해준다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Meet Store5: a Kotlin Multiplatform library for building network resilient applications](https://www.droidcon.com/2023/07/20/meet-store5-a-kotlin-multiplatform-library-for-building-network-resilient-applications/) (2023-07-20)

## 읽고 남긴 포인트

- 데이터 레이어는 “API 호출 함수 모음”이 아니라 데이터의 신뢰도를 관리하는 계층이다.
- 캐시는 성능 최적화만이 아니라 오프라인 UX의 핵심 재료다.
- 로딩, stale data, fresh data를 UI State에서 구분하면 화면이 더 정직해진다.

## 프로젝트에 적용한다면

- Repository에서 원격 호출과 로컬 캐시 갱신 책임을 분리한다.
- 데이터가 오래되었지만 보여줄 수 있는 상태를 UI에 표현한다.
- 오프라인 상태에서 어떤 기능이 읽기 전용으로 동작할지 미리 정한다.

## 정리

좋은 데이터 레이어는 네트워크가 실패했을 때 비로소 가치가 드러난다

## 함께 읽기

- [[kotlin-multiplatform-ecosystem-map|Kotlin Multiplatform을 도입하기 전에 볼 생태계 지도]]
- [[kmp-real-world-boundaries|실무 KMP에서 공유할 것과 남겨둘 것]]
- [[android-ui-state-layer-compose|안정적인 Compose 화면을 위한 UI State 설계]]
