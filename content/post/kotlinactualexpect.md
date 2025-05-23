---
title: "Kotlin Multiplatform의 expect/actual 정리"
date: 2025-03-13
draft: false
categories: ["Kotlin"]
tags: ["Multiplatform", "expect", "actual", "Kotlin"]
---


# Kotlin Multiplatform의 expect/actual 정리

Kotlin Multiplatform(KMP)을 이해하기 위해 반드시 알아야 할 키워드가 바로 `expect`와 `actual`입니다. 이 키워드는 플랫폼마다 다른 구현을 제공하면서도, 공통 인터페이스를 유지하는 **다형성 선언 방식**을 가능하게 합니다.

이 글에서는 `expect`/`actual` 키워드의 개념부터 컴파일 타임 처리 방식, IDE에서 보이지 않는 이유까지 자세히 설명합니다.

---

## 기본 개념: `expect`와 `actual`이란?

| 키워드 | 설명 |
|--------|------|
| `expect` | 공통 코드에 선언된 API 인터페이스 (stub) |
| `actual` | 각 플랫폼에서의 실제 구현 |

즉, `expect`는 **계약(Contract)**이고,  
`actual`은 그 계약에 맞는 **실제 구현(Implementation)**입니다.

---

## 예시 코드

### commonMain (공통 모듈)

```kotlin
// 선언만 있고 구현 없음
expect fun getPlatformName(): String
```

### jvmMain

```kotlin
actual fun getPlatformName(): String = "JVM"
```

### iosMain

```kotlin
actual fun getPlatformName(): String = "iOS"
```

`expect`는 인터페이스만 정의하고, 각 플랫폼에 맞는 `actual` 구현이 연결됩니다.

---

## 왜 `.jar`에서는 `expect`가 안 보일까?

### External Libraries에서는 `expect`를 찾을 수 없음

Gradle에서 다운받은 JAR 파일(`kotlinx-coroutines-core-jvm-1.7.3.jar`)은 **JVM에서 실행 가능한 바이트코드**만 포함합니다.

- `expect`는 **컴파일 타임에만 존재하는 추상 선언**입니다
- JVM에는 `actual` 구현만 컴파일되고 포함됨
- 따라서 `.jar` 안에서는 `expect` 선언을 확인할 수 없습니다

🔎 대신 `expect`를 확인하려면:

- GitHub 저장소: https://github.com/Kotlin/kotlinx.coroutines
- 경로 예: `kotlinx-coroutines-core/commonMain/kotlin/kotlinx/coroutines/Builders.kt`

---

## 사용 목적

| 상황 | 이유 |
|------|------|
| 플랫폼별 파일 경로 필요 | Android: `Context.filesDir`, iOS: `NSFileManager` 등 |
| UI, 시스템 API 분리 | JVM은 `Swing`, iOS는 `UIKit` 사용 등 |
| 네이티브 코드 연동 | `actual`에서 C/C++ 호출 가능 |

---

## IDE 팁: `expect/actual` 관계 보기

1. `commonMain`에 `expect` 선언 추가  
2. `jvmMain`/`iosMain`에 `actual` 구현 작성  
3. IntelliJ나 Android Studio에서는 `Cmd+B`로 상호 이동 가능  
   (단, 소스가 연결되어 있어야 함)

> `expect`에 커서 올리면 구현된 `actual` 목록을 툴팁으로 확인할 수 있음

---

## 정리 요약

| 키워드 | 목적 | 컴파일 타임 존재 | 런타임 존재 |
|--------|------|------------------|--------------|
| `expect` | 공통 선언 | ✅ 있음 | ❌ 없음 |
| `actual` | 플랫폼 구현 | ✅ 있음 | ✅ 있음 |

- `.jar`에는 `actual`만 존재 → `expect`는 보이지 않음
- `expect`는 **다형성의 선언부**, `actual`은 **구현부** 역할
- Kotlin Multiplatform에서 플랫폼 특화 코드를 안전하게 관리할 수 있게 해 줌

---

## 🔗 참고 링크

- Kotlin 공식 문서: https://kotlinlang.org/docs/multiplatform.html
- GitHub: https://github.com/Kotlin/kotlinx.coroutines
- Expect/Actual 예제: https://kotlinlang.org/docs/mpp-connect-to-apis.html

이제부터 `.jar`에서 `expect`가 안 보이는 이유를 분명하게 이해하셨을 겁니다.  
Kotlin MPP를 활용한 크로스 플랫폼 개발에서 가장 핵심적인 문법이니 반드시 익혀두세요!
