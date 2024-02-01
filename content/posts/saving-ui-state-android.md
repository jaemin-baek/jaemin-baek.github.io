---
title: "프로세스 종료까지 고려한 UI State 저장 전략"
date: "2024-01-13"
category: "Android"
tags: ["ui-state","savedstatehandle","process-death","android"]
description: "2023-05-10에 발행된 Android 개발 글을 바탕으로 프로세스 종료까지 고려한 UI State 저장 전략를 정리합니다."
---

![프로세스 종료까지 고려한 UI State 저장 전략](/images/saving-ui-state-android.svg)

UI State를 설계할 때 화면 회전만 생각하면 충분하지 않다. Android 앱은 언제든 프로세스가 종료될 수 있고, 사용자는 다시 돌아왔을 때 가능한 한 이어서 쓰기를 기대한다. 저장해야 할 상태와 다시 계산할 상태를 구분해야 한다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Saving UI state on Android](https://manuelvivo.dev/saving-ui-state) (2023-05-10)

## 읽고 남긴 포인트

- 모든 UI State를 저장하려 하면 오히려 복원 로직이 복잡해진다.
- 사용자가 직접 입력한 값과 서버에서 다시 가져올 수 있는 값은 다르게 다뤄야 한다.
- SavedStateHandle은 영구 저장소가 아니라 복원을 돕는 작은 저장 공간이다.

## 프로젝트에 적용한다면

- 검색어, 선택한 탭, 스크롤 키처럼 사용자 맥락을 잃으면 불편한 값부터 저장한다.
- 목록 데이터처럼 다시 로드할 수 있는 값은 저장보다 재구성 전략을 세운다.
- 프로세스 종료 복원 시나리오를 QA 체크리스트에 넣는다.

## 정리

좋은 복원 전략은 모든 것을 기억하는 것이 아니라, 사용자가 “끊겼다”고 느끼지 않을 만큼의 맥락을 보존하는 것이다

## 함께 읽기

- [[ui-layer-state-holder-saving-state|State Holder와 저장 가능한 상태를 구분하기]]
- [[android-ui-state-layer-compose|안정적인 Compose 화면을 위한 UI State 설계]]
- [[credential-manager-beta-state-handling|Credential Manager 흐름을 UI State로 다루기]]
