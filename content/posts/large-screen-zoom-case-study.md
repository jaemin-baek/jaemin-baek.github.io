---
title: "Zoom 사례로 보는 대화면 Android 앱 설계"
date: "2024-01-27"
category: "Android"
tags: ["large-screen","foldable","tablet","case-study"]
description: "2023-10-19에 발행된 Android 개발 글을 바탕으로 Zoom 사례로 보는 대화면 Android 앱 설계를 정리합니다."
---

![Zoom 사례로 보는 대화면 Android 앱 설계](/images/large-screen-zoom-case-study.svg)

대화면 지원은 단순히 여백을 늘리는 일이 아니다. Zoom 사례에서 볼 수 있듯이 사용자는 태블릿, 폴더블, 데스크톱 모드에서 더 많은 정보와 더 나은 멀티태스킹을 기대한다. 화면 크기가 커지면 정보 구조도 달라져야 한다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Zoom improves large screen support on Android](https://android-developers.googleblog.com/2023/10/zoom-improves-large-screen-support-on-android.html) (2023-10-19)

## 읽고 남긴 포인트

- 대화면에서는 단일 컬럼을 늘리는 것보다 역할별 영역을 나누는 것이 중요하다.
- 폴더블은 화면 크기뿐 아니라 접힘 상태와 자세까지 고려해야 한다.
- 대화면 대응은 생산성 앱에서 특히 큰 UX 차이를 만든다.

## 프로젝트에 적용한다면

- WindowSizeClass를 기준으로 compact, medium, expanded 레이아웃을 분리한다.
- 목록과 상세, 도구 영역을 동시에 보여줄 수 있는지 검토한다.
- 태블릿과 폴더블을 별도 QA 대상에 포함한다.

## 정리

대화면 최적화는 “안 깨지게 보이기”에서 끝나지 않는다. 큰 화면이 주는 여유를 기능의 구조로 바꾸는 일이다.
