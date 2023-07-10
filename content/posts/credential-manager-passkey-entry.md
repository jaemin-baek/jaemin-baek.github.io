---
title: "Credential Manager로 로그인 흐름을 단순하게 만들기"
date: "2024-01-03"
category: "Android"
group: "January Reading Challenge"
series: "January Reading Challenge"
tags: ["credential-manager","passkeys","authentication","android"]
description: "2023-02-10에 발행된 Android 개발 글을 바탕으로 Credential Manager로 로그인 흐름을 단순하게 만들기를 정리합니다."
---

![Credential Manager로 로그인 흐름을 단순하게 만들기](/images/credential-manager-passkey-entry.svg)

Credential Manager의 핵심은 로그인 방식을 하나 더 추가하는 데 있지 않다. 비밀번호, 패스키, 연동 로그인처럼 서로 다른 인증 수단을 앱 입장에서는 하나의 진입점으로 다루게 만드는 데 있다. 사용자는 더 적은 선택지를 보고, 앱은 더 일관된 인증 흐름을 갖는다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Bringing together sign-in solutions and passkeys with Credential Manager](https://android-developers.googleblog.com/2023/02/bringing-together-sign-in-solutions-and-passkeys-android-new-credential-manager.html) (2023-02-10)

## 읽고 남긴 포인트

- 로그인 화면의 복잡도는 보안 기능을 추가할수록 쉽게 늘어난다.
- 인증 수단을 UI에 그대로 노출하기보다 계정 선택이라는 하나의 흐름으로 묶는 편이 낫다.
- 패스키는 비밀번호를 대체하는 기술이지만, 앱 코드에서는 세션 관리와 실패 처리까지 함께 설계해야 한다.

## 프로젝트에 적용한다면

- 로그인 버튼을 여러 개 늘리기 전에 Credential Manager가 제공하는 계정 선택 흐름을 먼저 검토한다.
- 인증 실패, 취소, 사용 가능한 자격 증명 없음 상태를 UI State로 분리한다.
- 서버 세션 생성과 클라이언트 credential 요청을 한 함수에 섞지 않는다.

## 정리

로그인 UX는 사용자가 앱을 믿을지 결정하는 첫 장면이다. 기술적으로 안전한 것만큼, 사용자가 덜 헷갈리게 만드는 것도 중요하다

## 함께 읽기

- [[credential-manager-beta-state-handling|Credential Manager 흐름을 UI State로 다루기]]
- [[passkeys-production-migration|패스키를 제품 로그인에 넣을 때의 체크리스트]]
- [[google-identity-credential-manager-migration|Google Identity Services에서 Credential Manager로 넘어가기]]
