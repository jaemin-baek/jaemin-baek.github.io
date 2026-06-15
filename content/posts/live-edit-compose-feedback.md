---
title: "Live Edit가 바꾸는 Compose UI 수정 방식"
date: "2024-01-19"
category: "Android"
group: "January Reading Challenge"
series: "January Reading Challenge"
tags: ["compose","live-edit","android-studio","tooling"]
description: "2023-07-25에 발행된 Android 개발 글을 바탕으로 Live Edit가 바꾸는 Compose UI 수정 방식를 정리합니다."
draft: true
---

![Live Edit가 바꾸는 Compose UI 수정 방식](/images/live-edit-compose-feedback.svg)

Live Edit는 단순히 빌드 시간을 줄이는 기능으로 보이지만, 실제로는 UI를 조정하는 사고방식을 바꾼다. 색, 간격, 조건부 UI를 바꿔보는 시간이 짧아지면 개발자는 더 자주 실험하고 더 빨리 판단할 수 있다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Deep dive into Live Edit for Jetpack Compose UI](https://android-developers.googleblog.com/2023/07/deep-dive-into-live-edit-for-jetpack-compose-ui.html) (2023-07-25)

## 읽고 남긴 포인트

- UI 개발의 병목은 코드를 쓰는 시간이 아니라 결과를 확인하는 시간인 경우가 많다.
- 빠른 피드백은 디자인 완성도에도 영향을 준다.
- 도구가 빨라져도 상태 구조가 복잡하면 확인은 여전히 어렵다.

## 프로젝트에 적용한다면

- Live Edit로 조정하기 쉬운 작은 Composable 단위로 화면을 나눈다.
- 스타일 값은 하드코딩보다 테마나 파라미터로 전달해 실험 비용을 낮춘다.
- 최종 검증은 여전히 실제 빌드와 다양한 디바이스에서 진행한다.

## 정리

Live Edit는 완성된 구조를 대신 만들어주지 않는다. 하지만 좋은 구조를 더 빠르게 다듬을 수 있게 해준다

## 함께 읽기

- [[android-studio-electric-eel-lessons|Android Studio Electric Eel에서 배운 개발 루프 줄이기]]
- [[whats-new-compose-2023-practical-view|2023년 Compose 업데이트를 실무 관점으로 보기]]
- [[compose-performance-recomposition-basics|Compose 성능을 볼 때 recomposition부터 확인하기]]
