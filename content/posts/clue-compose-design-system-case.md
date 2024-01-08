---
title: "Clue 사례로 보는 Compose와 디자인 시스템"
date: "2024-01-08"
category: "Android"
tags: ["compose","design-system","case-study","ui"]
description: "2023-04-06에 발행된 Android 개발 글을 바탕으로 Clue 사례로 보는 Compose와 디자인 시스템를 정리합니다."
---

![Clue 사례로 보는 Compose와 디자인 시스템](/images/clue-compose-design-system-case.svg)

Clue의 Compose 전환 사례에서 흥미로운 점은 UI 프레임워크 교체가 디자인 시스템과 연결된다는 점이다. Compose는 컴포넌트를 함수로 다루기 때문에 색, 간격, 타이포그래피, 상태 표현을 코드 안에서 더 일관되게 조립할 수 있다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Clue’s development speed improves after rebuilding with Jetpack Compose](https://android-developers.googleblog.com/2023/04/clues-development-speed-improves-after-rebuilding-with-jetpack-compose.html) (2023-04-06)

## 읽고 남긴 포인트

- 디자인 시스템은 Figma에만 있는 규칙이 아니라 코드에서 재사용 가능한 컴포넌트여야 한다.
- Compose의 Theme 구조는 디자인 토큰을 앱 전체에 전달하기 좋다.
- 공통 컴포넌트가 안정적이면 화면 개발 속도보다 화면 품질이 먼저 좋아진다.

## 프로젝트에 적용한다면

- 버튼, 카드, 입력 필드처럼 반복되는 요소부터 Compose 컴포넌트로 고정한다.
- 색상과 간격 값을 화면별로 직접 쓰지 말고 Theme나 토큰으로 모은다.
- 상태별 Preview를 디자인 리뷰 자료로 활용한다.

## 정리

Compose를 잘 쓰려면 화면을 빨리 만드는 것보다, 같은 결정을 반복하지 않게 만드는 구조가 먼저다.
