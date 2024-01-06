---
title: "Compose 프로젝트의 의존성 업데이트를 자동화하는 기준"
date: "2024-01-06"
category: "Android"
tags: ["compose","dependency-management","gradle","automation"]
description: "2023-03-10에 발행된 Android 개발 글을 바탕으로 Compose 프로젝트의 의존성 업데이트를 자동화하는 기준를 정리합니다."
---

![Compose 프로젝트의 의존성 업데이트를 자동화하는 기준](/images/compose-dependency-updates-automation.svg)

Compose 프로젝트는 Kotlin, Compose Compiler, Compose BOM, Android Gradle Plugin의 호환성을 함께 봐야 한다. 그래서 의존성 업데이트 자동화는 “최신으로 올리기”가 아니라 “안전하게 올릴 수 있는 단위를 정하기”에 가깝다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Automating dependency updates in a Compose project](https://medium.com/androiddevelopers/automating-dependency-updates-in-a-compose-project-168ef5e89ac5) (2023-03-10)

## 읽고 남긴 포인트

- 업데이트 자동화는 사람이 신경 쓰지 않아도 되게 만드는 것이 아니라, 사람이 볼 부분을 줄이는 일이다.
- Compose Compiler와 Kotlin 버전은 특히 함께 관리해야 한다.
- 업데이트 PR은 테스트가 없으면 알림 소음이 되기 쉽다.

## 프로젝트에 적용한다면

- Compose BOM, Kotlin, AGP를 각각 어떤 주기로 업데이트할지 정한다.
- 자동 PR에는 단위 테스트, 스냅샷 테스트, 최소 빌드 검증을 붙인다.
- 한 번에 너무 많은 라이브러리를 올리지 않도록 그룹을 나눈다.

## 정리

의존성 업데이트는 미루면 비용이 커지고, 자동화만 믿으면 위험해진다. 좋은 기준은 작은 업데이트를 자주 검증하게 만드는 것이다.
