---
title: "Compose for TV에서 배운 거실 UI의 기준"
date: "2024-01-11"
category: "Android"
tags: ["compose-for-tv","android-tv","focus","large-screen"]
description: "2023-05-10에 발행된 Android 개발 글을 바탕으로 Compose for TV에서 배운 거실 UI의 기준를 정리합니다."
---

![Compose for TV에서 배운 거실 UI의 기준](/images/compose-for-tv-living-room-ui.svg)

TV UI는 모바일 화면을 크게 늘린 버전이 아니다. 사용자는 터치하지 않고 리모컨으로 이동하며, 멀리 떨어진 화면을 본다. Compose for TV는 이 차이를 컴포넌트와 포커스 처리 수준에서 다루게 해준다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Building pixel-perfect living room experiences with Compose for TV](https://android-developers.googleblog.com/2023/05/building-pixel-perfect-living-room-experiences-compose-for-tv.html) (2023-05-10)

## 읽고 남긴 포인트

- TV 화면에서 가장 중요한 상태는 포커스다.
- 카드 간 간격, 선택 상태, 스크롤 위치는 모바일보다 훨씬 명확해야 한다.
- 동일한 콘텐츠라도 입력 장치가 바뀌면 UI 구조도 바뀐다.

## 프로젝트에 적용한다면

- TV 대응 화면은 터치 없이 리모컨 방향키만으로 전체 흐름을 테스트한다.
- 선택된 카드와 선택되지 않은 카드의 시각적 차이를 크게 둔다.
- 모바일 컴포넌트를 공유하더라도 포커스와 레이아웃 정책은 TV 전용으로 둔다.

## 정리

대화면 대응은 단순한 반응형 레이아웃이 아니다. 사용자의 자세와 입력 방식까지 포함해 다시 설계하는 일이다.
