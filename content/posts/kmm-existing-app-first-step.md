---
title: "기존 앱에 Kotlin Multiplatform을 처음 넣는 방법"
date: "2024-01-21"
category: "Android"
tags: ["kmm","kotlin-multiplatform","existing-app","architecture"]
description: "2023-07-31에 발행된 Android 개발 글을 바탕으로 기존 앱에 Kotlin Multiplatform을 처음 넣는 방법를 정리합니다."
---

![기존 앱에 Kotlin Multiplatform을 처음 넣는 방법](/images/kmm-existing-app-first-step.svg)

기존 앱에 KMP를 넣을 때 가장 위험한 접근은 처음부터 핵심 비즈니스 로직을 크게 옮기는 것이다. 작은 shared module을 만들고, 플랫폼 의존이 낮은 코드부터 옮겨야 빌드와 배포 흐름을 안정적으로 배울 수 있다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Adding Kotlin Multiplatform to an existing project](https://medium.com/@huawei_developers/adding-kotlin-multiplatform-to-an-existing-project-e41e67063467) (2023-07-31)

## 읽고 남긴 포인트

- KMP 도입의 첫 목표는 코드 공유율이 아니라 빌드 파이프라인을 이해하는 것이다.
- 플랫폼별 의존성이 많은 코드는 초기에 옮기기 어렵다.
- 작은 성공 사례가 있어야 팀이 공유 모듈을 신뢰한다.

## 프로젝트에 적용한다면

- 공유할 첫 모듈은 날짜 포맷, validation, DTO 변환처럼 작고 테스트하기 쉬운 영역으로 고른다.
- Android와 iOS에서 같은 테스트 데이터를 사용해 결과를 비교한다.
- 공유 모듈 릴리즈와 앱 릴리즈의 버전 관리 방식을 먼저 정한다.

## 정리

KMP는 한 번에 크게 도입할수록 설득이 어려워진다. 작게 넣고, 안정적으로 빌드되고, 반복해서 배포되는 경험이 먼저다.
