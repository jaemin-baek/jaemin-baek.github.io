---
title: "2023년 Compose 업데이트를 실무 관점으로 보기"
date: "2024-01-10"
category: "Android"
tags: ["jetpack-compose","material3","performance","android"]
description: "2023-05-10에 발행된 Android 개발 글을 바탕으로 2023년 Compose 업데이트를 실무 관점으로 보기를 정리합니다."
---

![2023년 Compose 업데이트를 실무 관점으로 보기](/images/whats-new-compose-2023-practical-view.svg)

2023년 Compose 업데이트를 보면 방향이 분명하다. 더 많은 컴포넌트를 제공하고, 성능을 개선하고, 도구 지원을 강화해 Compose를 실험 기술이 아니라 기본 UI 선택지로 만들려는 흐름이다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [What’s new in Jetpack Compose](https://android-developers.googleblog.com/2023/05/whats-new-in-jetpack-compose.html) (2023-05-10)

## 읽고 남긴 포인트

- Compose 업데이트는 API 추가만 보는 것보다 성능과 도구 개선을 함께 봐야 한다.
- Material3는 디자인 변경보다 상태와 접근성까지 포함한 컴포넌트 품질의 문제다.
- Compose는 계속 변하기 때문에 버전 고정이 아니라 주기적인 업그레이드 전략이 필요하다.

## 프로젝트에 적용한다면

- Compose BOM을 기준으로 팀의 업데이트 주기를 정한다.
- 새 컴포넌트를 도입할 때 기존 커스텀 구현을 줄일 수 있는지 확인한다.
- 성능 개선 릴리즈 후에는 스크롤, 애니메이션, 입력 지연을 다시 측정한다.

## 정리

프레임워크의 성숙도는 기능이 많아지는 순간보다, 기본 선택을 해도 불안하지 않아지는 순간에 체감된다

## 함께 읽기

- [[compose-august-2023-release-notes|Compose 2023년 8월 릴리즈에서 챙길 것]]
- [[compose-performance-recomposition-basics|Compose 성능을 볼 때 recomposition부터 확인하기]]
- [[learn-compose-by-building-small-screens|Compose를 익힐 때 작은 화면부터 만들어야 하는 이유]]
