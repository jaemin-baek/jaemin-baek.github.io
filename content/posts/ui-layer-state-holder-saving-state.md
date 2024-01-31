---
title: "State Holder와 저장 가능한 상태를 구분하기"
date: "2024-01-31"
category: "Android"
tags: ["ui-layer","state-holder","saved-state","compose"]
description: "2023-12-19에 발행된 Android 개발 글을 바탕으로 State Holder와 저장 가능한 상태를 구분하기를 정리합니다."
---

![State Holder와 저장 가능한 상태를 구분하기](/images/ui-layer-state-holder-saving-state.svg)

UI Layer를 정리할 때 State Holder는 자주 등장하지만, 모든 상태를 들고 있는 만능 객체로 생각하면 금방 복잡해진다. State Holder는 이벤트와 데이터 흐름을 UI State로 바꾸는 곳이고, 저장 가능한 상태는 그중 사용자가 잃으면 불편한 최소한의 맥락이다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Crash Course on the Android UI Layer | Part 2](https://manuelvivo.dev/crash-course-ui-layer-part-2) (2023-12-19)

## 읽고 남긴 포인트

- State Holder는 화면 로직을 모으는 곳이지, 모든 앱 로직을 넣는 곳이 아니다.
- 저장할 상태와 다시 계산할 상태를 구분해야 복원 로직이 단순해진다.
- Compose에서는 remember, rememberSaveable, ViewModel, SavedStateHandle의 역할을 나눠야 한다.

## 프로젝트에 적용한다면

- 일시적인 UI 토글은 remember, 구성 변경을 넘어야 하는 입력값은 rememberSaveable을 검토한다.
- 화면 단위 상태와 비즈니스 데이터는 ViewModel에서 조합한다.
- 프로세스 종료 후 복원해야 하는 최소 key만 SavedStateHandle에 둔다.

## 정리

상태 저장 전략은 많이 저장할수록 안전해지는 것이 아니다. 다시 만들 수 있는 것과 반드시 기억해야 하는 것을 구분할 때 안정적이 된다.
