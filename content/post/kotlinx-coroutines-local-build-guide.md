---
title: "[v.0.0] Kotlinx.coroutines 커스텀 수정 후 IntelliJ에서 테스트하는 전체 과정"
date: 2025-03-13
draft: false
categories: ["Kotlin"]
tags: ["Coroutines", "Gradle", "Local Build", "IntelliJ"]
---

# Kotlinx.coroutines 커스텀 수정 후 IntelliJ에서 테스트하는 전체 과정

Kotlin의 코루틴 라이브러리인 `kotlinx.coroutines`의 소스코드를 직접 수정하고, 이를 빌드해서 내가 사용하는 프로젝트에 적용해보는 과정을 정리합니다.

---

## 목표

수정한 `kotlinx.coroutines`를 로컬 빌드한 뒤, 내 IntelliJ 프로젝트에서 직접 불러와 테스트하는 것.

---

## 1. GitHub 저장소 클론 및 코드 수정

```bash
git clone https://github.com/Kotlin/kotlinx.coroutines.git
cd kotlinx.coroutines
```

- 예: `Delay.kt`, `CancellableContinuation.kt` 등 내부 로직 수정

---

## 2. Gradle 빌드 수행

```bash
./gradlew :kotlinx-coroutines-core:build
```

빌드 결과물 위치:
```
build/libs/kotlinx-coroutines-core-1.7.3.jar
```

---

## 3. IntelliJ 프로젝트에서 사용하는 방법

### 방법 1: libs 폴더에 직접 넣기

1. 앱 프로젝트에 `libs/` 폴더 생성
2. 빌드된 JAR 복사:

```bash
cp build/libs/kotlinx-coroutines-core-1.7.3.jar <your_project>/libs/
```

3. `build.gradle.kts` 혹은 `build.gradle`에 추가:

```kotlin
dependencies {
    implementation(files("libs/kotlinx-coroutines-core-1.7.3.jar"))
}
```

4. Gradle sync 및 리빌드

---

### 방법 2: Maven Local로 배포

```bash
./gradlew publishToMavenLocal
```

그 후 앱 프로젝트에서 설정:

```kotlin
repositories {
    mavenLocal()
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
}
```

> Maven Local 경로: `~/.m2/repository/org/jetbrains/kotlinx/kotlinx-coroutines-core/1.7.3/`

---

## 4. IntelliJ에서 테스트

- 디버깅, 로그, 단위 테스트 등을 통해 수정된 코드가 잘 반영되었는지 확인

---

## 5. 참고 팁

| 항목 | 설명 |
|------|------|
| 캐시 문제 | `./gradlew clean` 후 재시도 |
| 충돌 검사 | `./gradlew dependencies --configuration runtimeClasspath` 로 확인 |
| 클래스 확인 | IntelliJ에서 `.class` 디컴파일 확인 가능 |

---

## 정리

| 단계 | 설명 |
|------|------|
| 수정 | GitHub 클론 후 코드 변경 |
| 빌드 | Gradle로 로컬 빌드 or Maven local 배포 |
| 연결 | JAR 직접 추가 or Maven Local 참조 |
| 실행 | IntelliJ에서 테스트, 디버깅 |
