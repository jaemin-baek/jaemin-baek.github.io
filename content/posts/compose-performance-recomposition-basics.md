---
title: "Compose 성능을 볼 때 recomposition부터 확인하기"
date: "2024-01-22"
category: "Android"
tags: ["compose","performance","recomposition","android"]
description: "2023-08-01에 발행된 Android 개발 글을 바탕으로 Compose 성능을 볼 때 recomposition부터 확인하기를 정리합니다."
---

![Compose 성능을 볼 때 recomposition부터 확인하기](/images/compose-performance-recomposition-basics.svg)

Compose 성능 문제를 만나면 먼저 복잡한 최적화부터 떠올리기 쉽다. 하지만 시작점은 대개 recomposition이다. 어떤 상태가 바뀌었고, 어느 Composable이 다시 그려졌으며, 실제로 그릴 필요가 있었는지를 보는 것이 우선이다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Jetpack Compose Performance](https://www.droidcon.com/2023/08/01/jetpack-compose-performance/) (2023-08-01)

## 읽고 남긴 포인트

- recomposition은 나쁜 것이 아니라 Compose가 동작하는 방식이다.
- 문제는 다시 그려도 되는 범위보다 더 넓게 다시 그려지는 경우다.
- 성능 최적화는 감으로 하는 것이 아니라 측정과 관찰로 시작해야 한다.

## 프로젝트에 적용한다면

- 상태는 필요한 Composable에 최대한 가깝게 전달한다.
- 목록 아이템에는 안정적인 key를 제공한다.
- Layout Inspector와 recomposition count를 이용해 실제 변경 범위를 확인한다.

## 정리

Compose 성능을 잘 다루려면 “덜 그리기”보다 “필요한 곳만 다시 그리기”를 목표로 삼는 편이 좋다

## 함께 읽기

- [[whats-new-compose-2023-practical-view|2023년 Compose 업데이트를 실무 관점으로 보기]]
- [[compose-august-2023-release-notes|Compose 2023년 8월 릴리즈에서 챙길 것]]
- [[live-edit-compose-feedback|Live Edit가 바꾸는 Compose UI 수정 방식]]
