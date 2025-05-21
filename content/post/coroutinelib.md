---
title: "주요 코루틴 라이브러리 모듈 종류"
date: 2025-03-09
draft: false
tags: ["kotlin", "coroutine"]
categories: ["Kotlin"]
---


## 주요 코루틴 라이브러리 모듈 종류

### 1. 공통(Core)

![core-jvm 예시](https://github.com/user-attachments/assets/eb25b970-a573-45eb-ad07-5b9d0436f32e)

| 모듈 이름                            | 설명                                   |
| -------------------------------- | ------------------------------------ |
| `kotlinx-coroutines-core`        | 코루틴의 핵심 기능 (공통 플랫폼)                  |
| `kotlinx-coroutines-core-jvm`    | JVM 플랫폼 전용 코어 기능                     |
| `kotlinx-coroutines-core-js`     | JavaScript 플랫폼 전용                    |
| `kotlinx-coroutines-core-native` | Kotlin/Native용 (iOS, macOS, Linux 등) |

kotlinx-coroutines-core는 멀티플랫폼 프로젝트에서 expect/actual 구문 기반으로 각 플랫폼별로 구현됩니다.

### 2. 추가 플랫폼별 지원 모듈

| 모듈 이름                        | 설명                                                 |
| ---------------------------- | -------------------------------------------------- |
| `kotlinx-coroutines-android` | Android에 최적화된 Dispatcher (`Dispatchers.Main`) 등 포함 |
| `kotlinx-coroutines-javafx`  | JavaFX에서 UI 업데이트를 위한 Dispatcher 지원                 |
| `kotlinx-coroutines-swing`   | Swing 앱을 위한 Dispatcher                             |
| `kotlinx-coroutines-test`    | 테스트 환경에서의 코루틴 제어 (가상 시간, 테스트 디스패처 등)               |
| `kotlinx-coroutines-debug`   | 코루틴 디버깅을 위한 도구 (`DebugProbes`, Stack trace 확장 등)   |


### 3. 지원/부가기능 모듈

| 모듈 이름                            | 설명                                                 |
| -------------------------------- | -------------------------------------------------- |
| `kotlinx-coroutines-reactive`    | Reactive Streams (`Publisher`, `Subscriber`) 호환 지원 |
| `kotlinx-coroutines-rx2` / `rx3` | RxJava2, RxJava3 연동용                               |
| `kotlinx-coroutines-guava`       | Google Guava의 `ListenableFuture` 지원                |
| `kotlinx-coroutines-jdk8`        | `CompletableFuture`, `java.time` 지원                |
| `kotlinx-coroutines-jdk9`        | `Flow.Publisher` 등 Java 9 API 통합용                  |


### Gradle 예시

```gradle
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")       // 공통
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")    // Android UI용
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")   // 테스트용
}
```

거의 모든 Kotlin 코루틴 기반 프로젝트에서 kotlinx-coroutines-core 모듈은 필수입니다.

---

## 왜 항상 core가 필요할까?
kotlinx-coroutines-core는 다음을 포함합니다:
  - launch, async, runBlocking, withContext 같은 핵심 함수
  - Job, Deferred, Dispatcher 같은 기본 타입
  - flow {} 등 Flow API의 기반

CoroutineScope, suspend 기반의 구조적 동시성 도구

이 모든 것들이 코루틴 기능의 중심축(core) 역할을 하므로, 다른 모듈(android, test, rx, guava 등)은 전부 core에 의존하거나 core 위에 얹혀 있습니다.

### 모듈 간 관계 예시

```gradle
kotlinx-coroutines-android
 └─> kotlinx-coroutines-core

kotlinx-coroutines-test
 └─> kotlinx-coroutines-core
```

즉, android나 test만 추가해도 내부적으로는 core가 함께 로딩됩니다.
하지만 직접 core를 명시하는 것이 버전 충돌 방지나 멀티플랫폼 세팅 시 더 안정적입니다.

### 예외적으로 core를 직접 추가하지 않아도 되는 경우?

- kotlinx-coroutines-android만 사용하고 있고, 그 모듈이 core를 이미 의존하고 있는 경우
→ 빌드는 되지만 명시적으로 core 추가하는 걸 권장합니다.

- Ktor, Retrofit 등 외부 라이브러리가 내부적으로 코루틴을 쓰고 있음
→ 이 경우에도 core가 이미 transitively 포함되긴 하지만 명확성을 위해 명시하는 게 좋습니다.

kotlinx-coroutines-android나 kotlinx-coroutines-test만 추가하고, core를 명시하지 않으면

Gradle이 각 모듈이 자체적으로 의존하고 있는 core 버전을 가져와서 버전 충돌이 발생하거나, 프로젝트 전체에 다른 버전이 적용될 수 있습니다.

예를 들어, build.gradle이 다음과 같다면

```gradle
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.6.4")

```

Gradle은 **두 가지 다른 버전의 core**를 프로젝트에 끌어오게 되며,
이는 다음 문제를 유발할 수 있습니다:

- 클래스 중복 (duplicate class)

- 버전 mismatch로 인한 런타임 크래시

- Flow, Dispatcher 등이 버전별로 다른 동작


### 서로 core 버전이 다르면 어떤 규칙으로 선택될까?

Kotlin/Gradle 프로젝트에서 서로 다른 버전의 kotlinx-coroutines-core가 의존되는 경우, Gradle은 "의존성 해석(dependency resolution)" 규칙에 따라 하나의 버전만을 선택하게 됩니다.


## Gradle의 기본 규칙: 최신 버전 우선

> "같은 그룹과 이름을 가진 라이브러리 중에서, 가장 높은 버전을 사용한다."


### 예시 1
```gradle
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3") // → core:1.7.3
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.6.4") // → core:1.6.4
```

kotlinx-coroutines-core:1.6.4, 1.7.3이 모두 간접 의존되지만 Gradle은 더 높은 1.7.3을 자동 선택해서 core로 사용합니다.


### 예시 2
```gradle
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.0.0")       // 👈 명시적 (구버전)
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")    // 👉 내부적으로 core:1.7.3 의존
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")   // 👉 내부적으로 core:1.7.3 의존
}
```

kotlinx-coroutines-core:1.7.3이 선택됩니다 (🚫 1.0.0 아님)
- kotlinx-coroutines-android:1.7.3는 내부적으로 kotlinx-coroutines-core:1.7.3에 의존
- kotlinx-coroutines-test:1.7.3도 마찬가지로 core:1.7.3 의존
- core:1.0.0을 명시적으로 선언했지만, Gradle은 모든 버전 후보를 수집한 뒤 가장 높은 버전(1.7.3)을 선택
  

### 해결 방법: 버전 통일
항상 kotlinx-coroutines-core를 명시적으로 추가하고, 다른 모듈도 동일한 버전을 사용

```gradle
val coroutinesVersion = "1.7.3"

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:$coroutinesVersion")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:$coroutinesVersion")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:$coroutinesVersion")
}
```

### 테스트

```gradle
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3") // → core:1.7.3
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.6.4") // → core:1.6.4
}
```

```
./gradlew dependencies --configuration runtimeClasspath
```
### 결과

kotlinx-coroutines-test 가 1.6.4 가 아닌 1.7.3 을 사용하는것으로 나온다.

![Image](https://github.com/user-attachments/assets/469c29bb-f566-453f-aebd-08e813ef21ae)