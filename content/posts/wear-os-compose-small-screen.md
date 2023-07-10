---
title: "Wear OS에서 Compose를 쓸 때 먼저 생각할 것"
date: "2024-01-12"
category: "Android"
group: "January Reading Challenge"
series: "January Reading Challenge"
tags: ["wear-os","compose","small-screen","android"]
description: "2023-05-10에 발행된 Android 개발 글을 바탕으로 Wear OS에서 Compose를 쓸 때 먼저 생각할 것를 정리합니다."
---

![Wear OS에서 Compose를 쓸 때 먼저 생각할 것](/images/wear-os-compose-small-screen.svg)

Wear OS 화면은 작다. 그래서 스마트폰 앱처럼 많은 정보를 한 화면에 담으려 하면 금방 답답해진다. Compose for Wear OS를 볼 때 가장 먼저 떠올려야 할 기준은 “이 화면이 손목에서 몇 초 안에 이해되는가”다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Watch out: Wear OS updates at I/O 2023](https://android-developers.googleblog.com/2023/05/watch-out-wear-os-updates-at-io-2023.html) (2023-05-10)

## 읽고 남긴 포인트

- Wear OS UI는 탐색보다 즉시성이 중요하다.
- 배터리와 화면 켜짐 시간을 고려하면 애니메이션과 갱신 주기를 신중히 써야 한다.
- Tile, Complication, 앱 화면은 각자 역할이 다르다.

## 프로젝트에 적용한다면

- 핵심 정보 하나와 보조 행동 하나만 남긴 화면부터 설계한다.
- 자주 갱신되는 데이터는 배터리 비용을 함께 검토한다.
- 스마트폰 앱의 화면을 줄이지 말고 Wear OS 전용 사용자 흐름을 만든다.

## 정리

작은 화면은 기능을 줄이는 제약이 아니라, 중요한 행동이 무엇인지 드러내는 필터다

## 함께 읽기

- [[compose-for-tv-living-room-ui|Compose for TV에서 배운 거실 UI의 기준]]
- [[large-screen-zoom-case-study|Zoom 사례로 보는 대화면 Android 앱 설계]]
- [[whats-new-compose-2023-practical-view|2023년 Compose 업데이트를 실무 관점으로 보기]]
