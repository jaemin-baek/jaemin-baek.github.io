---
title: Gradle KTS 사용기
# description: desc
date: 2023-04-10
slug: gradle-kts
# image: helena-hertz-wWZzXlDpMog-unsplash.jpg
categories:
    - gradle
draft: false
---

# Kotlin script (KTS)

Gradle 5.0 부터 도입

## 장점

- IDE 의 지원으로 향상된 편집환경 - 컴파일 타임에 에러 확인 / 코드탐색/ 자동완성/ 구문 강조
- 익숙한 코틀린 언어로 작성 가능

## 단점

- BuildSrc 같은 경우 버전 변경할때마다 전체 모듈을 다시 컴파일해야함
- 빌드 캐시가 Invalidate 됐거나 클린 빌드시에는 Groovy DSL 보다 느림
- Java 8 이상이 필요
- Newer dependency version inspection 기능 미지원 - 별도 플러그인으로 해결가능하지만 번거롭다

## 추후 포스팅 
- buildSrd
- [versionCatalog](https://velog.io/@ams770/Version-Catalog%EB%A5%BC-%ED%86%B5%ED%95%9C-%EB%B2%84%EC%A0%84-%EA%B4%80%EB%A6%AC)

## 빌드 속도 차이

[The Kotlin and Groovy DSLs should have similar performance characteristics · Issue #15886 · gradle/gradle](https://github.com/gradle/gradle/issues/15886#issuecomment-1036085182)


## 결론
구글 I/O 앱, 구글의 now in android 프로젝트도 현재 KTS 를 사용하고

now in android 부터는 buildSrc 가 아닌 toml 을 이용한 versionCatalog 기능을 사용하고있다.

ref: https://github.com/android/nowinandroid/blob/main/gradle/libs.versions.toml
