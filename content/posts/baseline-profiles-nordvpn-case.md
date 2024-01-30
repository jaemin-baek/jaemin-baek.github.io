---
title: "Baseline Profiles로 앱 시작 속도를 관리하기"
date: "2024-01-30"
category: "Android"
tags: ["baseline-profiles","performance","startup","case-study"]
description: "2023-11-29에 발행된 Android 개발 글을 바탕으로 Baseline Profiles로 앱 시작 속도를 관리하기를 정리합니다."
---

![Baseline Profiles로 앱 시작 속도를 관리하기](/images/baseline-profiles-nordvpn-case.svg)

앱 시작 속도는 사용자가 가장 먼저 체감하는 성능이다. Baseline Profiles는 자주 실행되는 코드 경로를 미리 최적화해 cold start 경험을 개선하는 데 도움을 준다. 중요한 것은 프로파일을 만들고 끝내는 것이 아니라 릴리즈 흐름에 포함하는 것이다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [NordVPN improves app startup with Baseline Profiles](https://android-developers.googleblog.com/2023/11/nordvpn-improves-app-startup-with-baseline-profiles.html) (2023-11-29)

## 읽고 남긴 포인트

- 성능 최적화는 측정 가능한 사용자 흐름에서 시작해야 한다.
- Baseline Profiles는 앱 시작, 주요 화면 진입처럼 반복되는 경로와 잘 맞는다.
- 프로파일은 코드가 바뀌면 함께 갱신되어야 한다.

## 프로젝트에 적용한다면

- Macrobenchmark로 앱 시작과 핵심 화면 이동을 측정한다.
- Baseline Profile 생성 작업을 CI나 릴리즈 체크리스트에 포함한다.
- 성능 개선은 평균값뿐 아니라 느린 기기에서의 체감도 함께 본다.

## 정리

성능은 한 번 잡고 끝나는 작업이 아니다. 릴리즈마다 다시 확인할 수 있는 체계를 만들어야 유지된다.
