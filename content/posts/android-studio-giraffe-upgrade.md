---
title: "Android Studio Giraffe 업데이트에서 챙길 실무 포인트"
date: "2024-01-18"
category: "Android"
tags: ["android-studio","giraffe","build","tools"]
description: "2023-07-25에 발행된 Android 개발 글을 바탕으로 Android Studio Giraffe 업데이트에서 챙길 실무 포인트를 정리합니다."
---

![Android Studio Giraffe 업데이트에서 챙길 실무 포인트](/images/android-studio-giraffe-upgrade.svg)

Android Studio Giraffe 업데이트는 IDE 기능만의 이야기가 아니다. Android Gradle Plugin, 빌드 분석, 디바이스 관리, Compose 도구가 함께 움직인다. 그래서 IDE 업데이트는 팀 전체 개발 환경 업데이트로 봐야 한다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Android Studio Giraffe is stable](https://android-developers.googleblog.com/2023/07/android-studio-giraffe-is-stable.html) (2023-07-25)

## 읽고 남긴 포인트

- IDE 버전과 AGP 버전은 따로 움직이는 듯 보여도 실제로는 함께 검증해야 한다.
- 새 도구 기능은 개인 취향이 아니라 팀 생산성에 영향을 준다.
- 업데이트 후 빌드 속도와 테스트 실행 속도를 함께 기록하면 다음 업그레이드 판단이 쉬워진다.

## 프로젝트에 적용한다면

- IDE 업데이트 전에 현재 AGP, Gradle, Kotlin 버전을 기록한다.
- 업데이트 후 clean build, incremental build, instrumentation test를 한 번씩 측정한다.
- 팀 문서에 권장 IDE 버전과 플러그인 버전을 남긴다.

## 정리

도구 업데이트를 잘하는 팀은 새 기능을 빨리 쓰는 팀이 아니라, 모두가 같은 환경에서 같은 문제를 재현할 수 있는 팀이다.
