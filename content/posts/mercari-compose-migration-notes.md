---
title: "Mercari의 Compose 전환 사례에서 배운 점"
date: "2024-01-07"
category: "Android"
tags: ["compose","migration","case-study","ui"]
description: "2023-03-27에 발행된 Android 개발 글을 바탕으로 Mercari의 Compose 전환 사례에서 배운 점를 정리합니다."
---

![Mercari의 Compose 전환 사례에서 배운 점](/images/mercari-compose-migration-notes.svg)

Mercari의 Compose 전환 사례는 Compose의 장점을 단순히 코드가 짧아진다는 말로 끝내지 않는다. 더 중요한 변화는 화면을 이해하고 수정하는 방식이 단순해졌다는 점이다. UI 선언, 상태, Preview가 가까워지면 리뷰와 실험 속도도 달라진다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Mercari reduces lines of code by rebuilding with Jetpack Compose](https://android-developers.googleblog.com/2023/03/mercari-reduces-lines-of-code-by-rebuilding-with-jetpack-compose.html) (2023-03-27)

## 읽고 남긴 포인트

- Compose 전환의 효과는 코드 라인 수보다 변경 범위가 작아지는 데서 더 크게 나타난다.
- 기존 View 기반 화면과 Compose 화면을 한 번에 교체하려 하지 않아도 된다.
- 디자인 변경이 잦은 화면일수록 Compose의 피드백 루프가 더 크게 체감된다.

## 프로젝트에 적용한다면

- 전환 후보 화면은 “자주 바뀌는가”, “독립적으로 검증 가능한가”를 기준으로 고른다.
- 전환 전후의 코드 라인 수보다 리뷰 시간과 버그 수정 시간을 기록한다.
- 공통 컴포넌트부터 정리해 이후 화면 전환 비용을 낮춘다.

## 정리

마이그레이션은 기술 교체가 아니라 팀이 화면을 다루는 습관을 바꾸는 일이다

## 함께 읽기

- [[clue-compose-design-system-case|Clue 사례로 보는 Compose와 디자인 시스템]]
- [[gradual-compose-transition-turo|Fragment 기반 앱에서 Compose로 점진 전환하기]]
- [[compose-interop-migration-real-world|Compose와 View가 함께 있는 화면을 다루는 법]]
