---
title: "Google Identity Services에서 Credential Manager로 넘어가기"
date: "2024-01-29"
category: "Android"
tags: ["google-identity","credential-manager","migration","auth"]
description: "2023-10-26에 발행된 Android 개발 글을 바탕으로 Google Identity Services에서 Credential Manager로 넘어가기를 정리합니다."
---

![Google Identity Services에서 Credential Manager로 넘어가기](/images/google-identity-credential-manager-migration.svg)

인증 마이그레이션은 일반 기능 마이그레이션보다 조심스럽다. 사용자가 로그인을 못 하면 앱의 나머지 기능은 의미가 없기 때문이다. Google Identity Services에서 Credential Manager로 이동할 때도 기존 사용자 흐름을 유지하면서 새 흐름을 점진적으로 붙이는 전략이 필요하다.

이 글은 원문을 그대로 옮긴 번역이 아니라, 실제 Android 프로젝트에 적용할 때 무엇을 남길 수 있을지 정리한 기록이다.

## 참고한 글

- [Migrate from Google Identity Services to Credential Manager](https://android-developers.googleblog.com/2023/10/migrate-from-google-identity-services-to-credential-manager.html) (2023-10-26)

## 읽고 남긴 포인트

- 인증 마이그레이션은 기능 flag와 단계적 rollout이 잘 맞는 영역이다.
- 기존 계정과 새 credential 흐름의 매핑을 서버와 함께 검증해야 한다.
- 로그인 실패율, 취소율, 복구 성공률 같은 지표가 중요하다.

## 프로젝트에 적용한다면

- 기존 로그인과 Credential Manager 로그인을 같은 화면에 무리하게 섞기보다 단일 진입점으로 정리한다.
- 마이그레이션 기간에는 인증 실패 로그를 더 자세히 수집한다.
- 계정 전환, 로그아웃, 재로그인 시나리오를 회귀 테스트로 고정한다.

## 정리

인증 코드는 사용자가 매일 보지 않을 수 있지만, 한 번 실패하면 신뢰를 크게 잃는다. 그래서 작은 변경도 넓게 검증해야 한다

## 함께 읽기

- [[credential-manager-passkey-entry|Credential Manager로 로그인 흐름을 단순하게 만들기]]
- [[credential-manager-beta-state-handling|Credential Manager 흐름을 UI State로 다루기]]
- [[passkeys-production-migration|패스키를 제품 로그인에 넣을 때의 체크리스트]]
