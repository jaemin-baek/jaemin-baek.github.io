---
title: "Compose와 View가 함께 있는 화면을 다루는 법"
date: "2024-01-25"
category: "Android"
tags: ["compose","interop","view-system","migration"]
description: "2023-09-21에 발행된 Android 개발 글을 바탕으로 Compose와 View가 함께 있는 화면을 다루는 법를 정리합니다."
---

![Compose와 View가 함께 있는 화면을 다루는 법](/images/compose-interop-migration-real-world.svg)

Compose 마이그레이션에서는 View와 Compose가 함께 있는 시간이 생각보다 길다. 이 구간을 불편하다고만 보면 구조가 지저분해지지만, 명확한 interop 규칙을 두면 점진 전환의 안전장치가 된다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Adding Jetpack Compose to an existing project](https://medium.com/@softaai-blogs/jetpack-compose-adding-jetpack-compose-to-an-existing-project-889148330ea5) (2023-09-21)

## 읽고 남긴 포인트

- ComposeView를 어디에 두는지가 화면 책임의 경계를 결정한다.
- View lifecycle과 Compose composition lifecycle을 함께 이해해야 한다.
- 상태 소유권을 View와 Compose가 동시에 갖지 않도록 해야 한다.

## 프로젝트에 적용한다면

- ComposeView를 사용하는 Fragment에서는 dispose 전략을 명확히 지정한다.
- ViewModel은 View와 Compose 양쪽에서 같은 UI State를 읽게 한다.
- 한 화면 안에서 같은 이벤트를 두 체계가 중복 처리하지 않게 한다.

## 정리

interop은 임시 코드처럼 보이지만, 실제 제품에서는 꽤 오래 남는다. 그래서 처음부터 읽기 쉽게 만드는 편이 낫다

## 함께 읽기

- [[gradual-compose-transition-turo|Fragment 기반 앱에서 Compose로 점진 전환하기]]
- [[nibel-compose-navigation-boundary|Compose 전환기의 Navigation 경계 정리하기]]
- [[mercari-compose-migration-notes|Mercari의 Compose 전환 사례에서 배운 점]]
