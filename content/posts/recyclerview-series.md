---
title: "RecyclerView 시리즈"
date: "2024-05-21"
category: "Android"
group: "RecyclerView"
series: "RecyclerView"
hub: true
tags: ["android", "recyclerview", "android-ui"]
description: "RecyclerView의 재사용, viewType, RecycledViewPool, 중첩 목록 최적화를 코드 예제로 정리하는 시리즈입니다."
---

RecyclerView는 오래된 View 기반 API처럼 보이지만, 복잡한 목록 화면을 설명할 때 여전히 배울 게 많다. 특히 홈 화면처럼 세로 섹션과 가로 카드가 섞이면 단순히 adapter를 만드는 수준을 넘어, ViewHolder 재사용과 상태 복원을 어떻게 설계할지 생각해야 한다.

이 시리즈는 RecyclerView를 "목록을 띄우는 방법"이 아니라 "재사용과 갱신을 어떻게 통제하는 구조인지"에 초점을 맞춰 정리한다.

## 글 목록

- [[recyclerview-mixed-horizontal-vertical-ui|가로/세로 혼합 RecyclerView UI 예제로 최적화 포인트 정리하기]]
- [[recyclerview-recycledviewpool-deep-dive|RecycledViewPool 내부 흐름 깊게 보기]]

## 같이 볼 질문

```text
ViewHolder는 언제 새로 만들어지고 언제 재사용될까?
viewType이 다르면 pool도 다르게 관리될까?
중첩 RecyclerView에서 shared pool은 어떤 비용을 줄일까?
DiffUtil, payload, RecycledViewPool은 각각 어떤 문제를 해결할까?
```

이 질문들을 코드와 함께 따라가면 RecyclerView 최적화가 API 암기보다 훨씬 선명해진다.
