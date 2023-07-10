---
title: "Android Studio Electric Eel에서 배운 개발 루프 줄이기"
date: "2024-01-02"
category: "Android"
group: "January Reading Challenge"
series: "January Reading Challenge"
tags: ["android-studio","compose","emulator","developer-experience"]
description: "2023-01-12에 발행된 Android 개발 글을 바탕으로 Android Studio Electric Eel에서 배운 개발 루프 줄이기를 정리합니다."
---

![Android Studio Electric Eel에서 배운 개발 루프 줄이기](/images/android-studio-electric-eel-lessons.svg)

Electric Eel 발표에서 눈에 띄는 지점은 새 기능의 개수보다 개발자가 화면을 확인하는 루프를 얼마나 줄이려 했는지였다. Compose Preview, Layout Inspector, Emulator 기능은 서로 다른 기능처럼 보이지만 결국 같은 문제를 겨냥한다. 코드를 바꾼 뒤 실제 화면이 어떻게 바뀌었는지 확인하기까지의 시간을 줄이는 것이다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Android Studio Electric Eel is stable](https://android-developers.googleblog.com/2023/01/android-studio-electric-eel.html) (2023-01-12)

## 읽고 남긴 포인트

- Compose 화면은 Preview를 먼저 믿을 수 있게 만들수록 수정 속도가 빨라진다.
- 에뮬레이터는 마지막 확인 수단이 아니라, 센서와 화면 크기를 바꿔가며 빠르게 검증하는 도구로 써야 한다.
- IDE 기능은 편의 기능이 아니라 팀의 개발 리듬을 바꾸는 인프라가 될 수 있다.

## 프로젝트에 적용한다면

- 새 컴포넌트를 만들 때 기본, 로딩, 빈 화면, 에러 Preview를 함께 둔다.
- 화면 버그를 잡을 때 로그부터 보기보다 Layout Inspector로 실제 트리와 상태를 먼저 확인한다.
- 리뷰 기준에 “Preview로 주요 상태를 볼 수 있는가”를 포함한다.

## 정리

도구의 업데이트를 단순히 버전 변경으로만 보면 놓치는 것이 많다. 좋은 도구는 코드를 덜 쓰게 해주는 것보다, 확인을 덜 불안하게 해주는 쪽에 가깝다

## 함께 읽기

- [[android-studio-giraffe-upgrade|Android Studio Giraffe 업데이트에서 챙길 실무 포인트]]
- [[live-edit-compose-feedback|Live Edit가 바꾸는 Compose UI 수정 방식]]
- [[learn-compose-by-building-small-screens|Compose를 익힐 때 작은 화면부터 만들어야 하는 이유]]
