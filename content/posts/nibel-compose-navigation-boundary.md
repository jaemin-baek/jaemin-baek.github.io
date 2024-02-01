---
title: "Compose 전환기의 Navigation 경계 정리하기"
date: "2024-01-17"
category: "Android"
tags: ["compose","navigation","fragment","migration"]
description: "2023-07-20에 발행된 Android 개발 글을 바탕으로 Compose 전환기의 Navigation 경계 정리하기를 정리합니다."
---

![Compose 전환기의 Navigation 경계 정리하기](/images/nibel-compose-navigation-boundary.svg)

Compose로 전환할 때 가장 헷갈리는 영역 중 하나가 Navigation이다. 화면은 Compose로 만들었지만 앱의 back stack은 Fragment나 기존 Navigation 구조가 들고 있는 경우가 많기 때문이다. 전환기에는 누가 화면 이동의 책임을 갖는지 먼저 정해야 한다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Introducing Nibel: A Navigation Library for Adopting Jetpack Compose in Fragment-Based Apps](https://medium.com/turo-engineering/introducing-nibel-a-navigation-library-for-adopting-jetpack-compose-in-fragment-based-apps-87b4c79b95ec) (2023-07-20)

## 읽고 남긴 포인트

- Navigation은 UI 문제가 아니라 앱 구조의 경계 문제다.
- Compose 화면 안에 기존 앱의 navigation 지식을 너무 많이 넣으면 전환 비용이 커진다.
- 화면 이동 이벤트는 명확한 타입으로 밖으로 전달하는 편이 테스트하기 쉽다.

## 프로젝트에 적용한다면

- Composable은 destination을 직접 열기보다 onNavigate 이벤트를 노출한다.
- Fragment 기반 back stack을 유지한다면 Compose 화면은 route 단위로만 생각한다.
- 뒤로가기, deep link, 결과 전달 시나리오를 먼저 정리한다.

## 정리

마이그레이션 중인 앱에서 Navigation을 단번에 아름답게 만들기는 어렵다. 대신 책임 경계를 흐리지 않는 것이 더 현실적인 목표다

## 함께 읽기

- [[gradual-compose-transition-turo|Fragment 기반 앱에서 Compose로 점진 전환하기]]
- [[compose-interop-migration-real-world|Compose와 View가 함께 있는 화면을 다루는 법]]
- [[mercari-compose-migration-notes|Mercari의 Compose 전환 사례에서 배운 점]]
