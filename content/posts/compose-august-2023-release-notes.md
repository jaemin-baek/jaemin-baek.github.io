---
title: "Compose 2023년 8월 릴리즈에서 챙길 것"
date: "2024-01-23"
category: "Android"
tags: ["compose","release-notes","performance","android"]
description: "2023-08-09에 발행된 Android 개발 글을 바탕으로 Compose 2023년 8월 릴리즈에서 챙길 것를 정리합니다."
---

![Compose 2023년 8월 릴리즈에서 챙길 것](/images/compose-august-2023-release-notes.svg)

Compose 릴리즈 노트를 읽을 때는 새 API만 보는 것보다 안정성, 성능, 도구 개선을 함께 봐야 한다. 특히 Lazy layout, text, compiler 쪽 개선은 앱 전체 체감 성능에 영향을 줄 수 있다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [What’s new in the Jetpack Compose August 2023 release](https://android-developers.googleblog.com/2023/08/whats-new-in-jetpack-compose-august-2023-release.html) (2023-08-09)

## 읽고 남긴 포인트

- Compose BOM은 여러 Compose 라이브러리 버전을 맞추는 기준점이다.
- 릴리즈 노트의 성능 개선 항목은 실제 앱 화면에서 다시 확인할 가치가 있다.
- 새 버전을 도입할 때는 Preview와 스크린샷 테스트도 함께 확인해야 한다.

## 프로젝트에 적용한다면

- 업데이트 전후로 스크롤이 많은 화면과 입력이 많은 화면을 비교한다.
- Compose Compiler와 Kotlin 버전 호환성을 먼저 확인한다.
- 릴리즈 노트에서 deprecated API를 확인하고 다음 정리 작업으로 남긴다.

## 정리

릴리즈 노트는 단순 공지가 아니라 다음 리팩터링 방향을 알려주는 작은 지도다

## 함께 읽기

- [[whats-new-compose-2023-practical-view|2023년 Compose 업데이트를 실무 관점으로 보기]]
- [[compose-performance-recomposition-basics|Compose 성능을 볼 때 recomposition부터 확인하기]]
- [[compose-dependency-updates-automation|Compose 프로젝트의 의존성 업데이트를 자동화하는 기준]]
