---
title: "Compose를 익힐 때 작은 화면부터 만들어야 하는 이유"
date: "2024-01-05"
category: "Android"
group: "January Reading Challenge"
series: "January Reading Challenge"
tags: ["jetpack-compose","learning","ui","android-basics"]
description: "2023-02-27에 발행된 Android 개발 글을 바탕으로 Compose를 익힐 때 작은 화면부터 만들어야 하는 이유를 정리합니다."
---

![Compose를 익힐 때 작은 화면부터 만들어야 하는 이유](/images/learn-compose-by-building-small-screens.svg)

Compose를 배울 때 처음부터 앱 전체 구조를 옮기려 하면 금방 어려워진다. 이 글을 읽고 다시 느낀 점은 Compose 학습의 출발점은 아키텍처가 아니라 작은 화면이라는 것이다. 버튼 하나, 카드 하나, 목록 아이템 하나를 직접 상태와 함께 만들어보는 편이 훨씬 빠르다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Now is the time to learn Android development with Jetpack Compose](https://android-developers.googleblog.com/2023/02/nows-time-to-learn-android-development-with-jetpack-compose.html) (2023-02-27)

## 읽고 남긴 포인트

- Compose는 XML을 Kotlin으로 옮긴 문법이 아니라 상태를 중심으로 UI를 표현하는 방식이다.
- 작은 컴포넌트를 많이 만들어봐야 recomposition과 state hoisting 감각이 생긴다.
- Preview는 학습 단계에서도 가장 좋은 피드백 도구다.

## 프로젝트에 적용한다면

- 기존 화면을 통째로 바꾸기보다 독립적인 리스트 아이템부터 Compose로 바꾼다.
- 컴포넌트마다 “상태를 소유하는 버전”과 “상태를 전달받는 버전”을 구분해본다.
- 학습용 샘플에도 Preview를 반드시 붙인다.

## 정리

Compose를 잘 쓰는 길은 거창한 패턴에서 시작하지 않는다. 작은 UI를 만들고, 상태를 밖으로 빼고, 다시 조립하는 반복에서 시작한다

## 함께 읽기

- [[whats-new-compose-2023-practical-view|2023년 Compose 업데이트를 실무 관점으로 보기]]
- [[compose-performance-recomposition-basics|Compose 성능을 볼 때 recomposition부터 확인하기]]
