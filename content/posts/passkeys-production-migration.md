---
title: "패스키를 제품 로그인에 넣을 때의 체크리스트"
date: "2024-01-28"
category: "Android"
tags: ["passkeys","credential-manager","authentication","security"]
description: "2023-10-25에 발행된 Android 개발 글을 바탕으로 패스키를 제품 로그인에 넣을 때의 체크리스트를 정리합니다."
---

![패스키를 제품 로그인에 넣을 때의 체크리스트](/images/passkeys-production-migration.svg)

패스키는 사용자에게 비밀번호 없는 로그인을 제공하지만, 제품 입장에서는 가입, 로그인, 복구, 기기 변경, 서버 검증까지 전체 흐름을 다시 살펴보게 만든다. API 도입보다 중요한 것은 실패와 복구 경험이다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Sign in with passkeys on Android using Credential Manager](https://android-developers.googleblog.com/2023/10/sign-in-with-passkeys-on-android-using-credential-manager.html) (2023-10-25)

## 읽고 남긴 포인트

- 패스키 등록은 로그인 성공 이후의 자연스러운 다음 행동으로 설계하는 편이 좋다.
- 기기 변경과 계정 복구 시나리오가 준비되어야 사용자가 안심한다.
- 서버 검증과 클라이언트 UI State가 함께 맞아야 한다.

## 프로젝트에 적용한다면

- 패스키 생성, 로그인, 취소, credential 없음, 서버 검증 실패 상태를 따로 기록한다.
- 기존 비밀번호 로그인과 패스키 로그인이 공존하는 전환 기간을 설계한다.
- 보안 이벤트 로그와 사용자 안내 문구를 함께 준비한다.

## 정리

패스키의 장점은 사용자가 보안을 덜 의식해도 안전해지는 데 있다. 그래서 복잡함은 앱과 서버가 가져가야 한다.
