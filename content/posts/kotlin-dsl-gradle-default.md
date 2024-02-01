---
title: "Kotlin DSL이 기본이 된 뒤 Gradle 파일을 읽는 법"
date: "2024-01-09"
category: "Android"
tags: ["gradle","kotlin-dsl","build","android"]
description: "2023-04-13에 발행된 Android 개발 글을 바탕으로 Kotlin DSL이 기본이 된 뒤 Gradle 파일을 읽는 법를 정리합니다."
---

![Kotlin DSL이 기본이 된 뒤 Gradle 파일을 읽는 법](/images/kotlin-dsl-gradle-default.svg)

Kotlin DSL이 새 Gradle 빌드의 기본값이 되면서 빌드 파일도 IDE 지원을 더 자연스럽게 받게 되었다. 하지만 문법이 Kotlin처럼 보인다고 해서 빌드 로직을 앱 코드처럼 마음껏 복잡하게 만들어도 된다는 뜻은 아니다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Kotlin DSL is now the default for new Gradle builds](https://android-developers.googleblog.com/2023/04/kotlin-dsl-is-now-default-for-new-gradle-builds.html) (2023-04-13)

## 읽고 남긴 포인트

- Kotlin DSL의 장점은 자동완성과 타입 안정성이다.
- 빌드 파일은 실행 순서와 캐시 영향을 받기 때문에 단순하게 유지하는 것이 중요하다.
- 공통 설정은 복붙보다 convention plugin으로 모으는 편이 오래 간다.

## 프로젝트에 적용한다면

- 버전은 Version Catalog로 모으고, 모듈별 설정은 최소화한다.
- 빌드 파일에서 조건문과 동적 로직이 늘어나면 convention plugin 분리를 검토한다.
- 빌드 변경 후에는 기능 테스트뿐 아니라 clean build 시간도 확인한다.

## 정리

좋은 Gradle 설정은 똑똑해 보이는 설정이 아니라, 팀원이 읽고 이유를 바로 알 수 있는 설정이다

## 함께 읽기

- [[compose-dependency-updates-automation|Compose 프로젝트의 의존성 업데이트를 자동화하는 기준]]
- [[android-studio-giraffe-upgrade|Android Studio Giraffe 업데이트에서 챙길 실무 포인트]]
- [[baseline-profiles-nordvpn-case|Baseline Profiles로 앱 시작 속도를 관리하기]]
