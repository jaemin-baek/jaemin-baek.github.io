---
title: "Android 14 변경사항을 앱 코드에 반영하는 순서"
date: "2024-01-04"
category: "Android"
tags: ["android-14","compatibility","target-sdk","behavior-changes"]
description: "2023-02-08에 발행된 Android 개발 글을 바탕으로 Android 14 변경사항을 앱 코드에 반영하는 순서를 정리합니다."
---

![Android 14 변경사항을 앱 코드에 반영하는 순서](/images/android-14-developer-preview-checklist.svg)

Android 14 Developer Preview 글은 새 기능 소개보다 “플랫폼이 바뀔 때 앱이 어떤 순서로 대응해야 하는가”를 생각하게 만든다. Target SDK를 올리는 일은 숫자 하나를 바꾸는 작업이 아니다. 권한, 백그라운드 실행, 보안 제한, 호환성 테스트가 함께 움직인다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [First Developer Preview of Android 14](https://android-developers.googleblog.com/2023/02/first-developer-preview-android14.html) (2023-02-08)

## 읽고 남긴 포인트

- 새 Android 버전 대응은 릴리즈 막판에 하는 작업이 아니라 분기 초반에 시작해야 한다.
- 동작 변경은 코드 한 줄보다 QA 시나리오에서 먼저 드러나는 경우가 많다.
- Target SDK 업데이트는 기능 개발과 분리된 별도 트랙으로 관리하는 편이 안전하다.

## 프로젝트에 적용한다면

- 새 버전 대응 브랜치에서 컴파일 SDK와 Target SDK를 단계적으로 올린다.
- 권한 요청, 알림, 백그라운드 작업, 파일 접근처럼 플랫폼 영향을 크게 받는 영역부터 테스트한다.
- 릴리즈 노트에 “플랫폼 변경 대응 항목”을 따로 둔다.

## 정리

플랫폼 대응을 잘하는 팀은 새 기능을 많이 쓰는 팀이 아니라, 앱이 조용히 깨질 수 있는 지점을 먼저 찾는 팀이다.
