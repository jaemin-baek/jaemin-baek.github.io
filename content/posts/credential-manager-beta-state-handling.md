---
title: "Credential Manager 흐름을 UI State로 다루기"
date: "2024-01-20"
category: "Android"
tags: ["credential-manager","ui-state","auth","android"]
description: "2023-07-27에 발행된 Android 개발 글을 바탕으로 Credential Manager 흐름을 UI State로 다루기를 정리합니다."
---

![Credential Manager 흐름을 UI State로 다루기](/images/credential-manager-beta-state-handling.svg)

Credential Manager를 도입하면 인증 API 호출만 생각하기 쉽지만, 사용자 경험은 여러 상태로 나뉜다. 사용 가능한 credential이 없는 상태, 사용자가 선택을 취소한 상태, 서버 검증이 실패한 상태, 세션 생성이 끝난 상태를 각각 구분해야 한다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Simple and secure sign-in on Android with Credential Manager and passkeys](https://android-developers.googleblog.com/2023/07/simple-and-secure-sign-in-on-android-with-credential-manager-and-passkeys.html) (2023-07-27)

## 읽고 남긴 포인트

- 인증은 성공과 실패 두 상태로 나누기에는 너무 복잡하다.
- 사용자 취소는 오류와 다르게 다뤄야 한다.
- 패스키 도입은 클라이언트 API보다 서버 검증 흐름이 더 중요할 수 있다.

## 프로젝트에 적용한다면

- 로그인 화면의 UI State를 Idle, SelectingCredential, Verifying, SignedIn, RecoverableError로 나눈다.
- 사용자 취소는 조용히 원래 화면으로 돌아가게 한다.
- 서버 오류와 credential 없음 상태는 서로 다른 메시지를 보여준다.

## 정리

인증 흐름이 자연스러우려면 API 성공 여부보다 사용자가 다음에 무엇을 할 수 있는지가 먼저 보여야 한다

## 함께 읽기

- [[credential-manager-passkey-entry|Credential Manager로 로그인 흐름을 단순하게 만들기]]
- [[passkeys-production-migration|패스키를 제품 로그인에 넣을 때의 체크리스트]]
- [[google-identity-credential-manager-migration|Google Identity Services에서 Credential Manager로 넘어가기]]
