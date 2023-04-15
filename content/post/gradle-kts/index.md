---
title: Using Gradle Kotlin DSL (KTS)
# description: desc
date: 2023-04-01
slug: gradle-kts
# image: helena-hertz-wWZzXlDpMog-unsplash.jpg
categories:
    - gradle
draft: false
---

# Kotlin script (KTS)

Introduced in Gradle 5.0

## Advantages of KTS

- Improved editing environment with IDE support
- Ability to check errors during compile-time, code navigation, auto-completion, and syntax highlighting
- Ability to write Gradle scripts in a familiar Kotlin language

## Disadvantages of KTS

- For BuildSrc, the entire module must be recompiled each time a version is changed.
- During a clean build or when the build cache is invalidated, Kotlin DSL is slower than Groovy DSL.
- Java 8 or higher is required.
- Newer dependency version inspection functionality is not supported

## Difference in build speed

[The Kotlin and Groovy DSLs should have similar performance characteristics · Issue #15886 · gradle/gradle](https://github.com/gradle/gradle/issues/15886#issuecomment-1036085182)


## Conclusion
Google's I/O app and Google's "Now in Android" project both currently use KTS, and "Now in Android" uses the versionCatalog feature with toml instead of buildSrc.

kts ❤️ versionCatalog 

ref: https://github.com/android/nowinandroid/blob/main/gradle/libs.versions.toml



## Ref.
- [versionCatalog](https://velog.io/@ams770/Version-Catalog%EB%A5%BC-%ED%86%B5%ED%95%9C-%EB%B2%84%EC%A0%84-%EA%B4%80%EB%A6%AC)
- https://velog.io/@vov3616/Gradle-2.-Version-Catalog-%EC%95%8C%EC%95%84%EB%B3%B4%EA%B8%B0
- [Google Official Doc](https://developer.android.com/build/migrate-to-catalogs)