---
title: "Kotlin 코루틴 디버깅 스레드 이름 표시 설정 (with @coroutine#)"
date: 2025-03-13
draft: false
categories: ["Kotlin"]
tags: ["Coroutines", "Debugging", "IntelliJ", "JVM Options"]
---

# Kotlin 코루틴 디버깅 스레드 이름 표시 설정 (with @coroutine#)

Kotlin의 코루틴에서 `Thread.currentThread().name`을 출력했을 때, 강의에서는 `main @coroutine#1` 같은 형식이 나오는데 내 코드에선 그냥 `main`만 나오는 이유는 **JVM 디버깅 옵션 설정 여부** 때문입니다.

---

## 문제 상황

```kotlin
fun main() = runBlocking {
    println(Thread.currentThread().name)
}
```

출력 결과:

```
main
```

하지만 강의에서는:

```
main @coroutine#1
```

이렇게 출력됨.

---

## 원인

Kotlinx Coroutines는 디버깅 용도로 **스레드 이름에 `@coroutine#N` 수식어**를 붙일 수 있습니다.  
이 기능은 기본적으로 비활성화되어 있으며, JVM 옵션을 통해 활성화할 수 있습니다.

---

## IntelliJ에서 설정하는 방법

1. **Run > Edit Configurations...** 메뉴로 이동  
2. 실행할 애플리케이션 선택
3. **VM Options** 항목에 아래 입력 추가:

```
-Dkotlinx.coroutines.debug=on
```

4. 실행하면 결과:

```
main @coroutine#1
```

---

## Gradle 테스트에서도 적용하기 (선택)

`build.gradle.kts` 또는 `build.gradle`에 다음을 추가:

### Kotlin DSL (`build.gradle.kts`)

```kotlin
tasks.withType<Test> {
    jvmArgs("-Dkotlinx.coroutines.debug=on")
}
```

### Groovy DSL (`build.gradle`)

```groovy
tasks.withType(Test) {
    jvmArgs "-Dkotlinx.coroutines.debug=on"
}
```

---

## 결과 확인

이제 코루틴이 실행되는 스레드 이름에는 다음처럼 **코루틴 ID가 수식어로 표시**됩니다.

```
DefaultDispatcher-worker-1 @coroutine#2
main @coroutine#1
```

이런 수식어는 **디버깅과 로깅에 매우 유용**합니다.

---

## 요약

| 항목 | 설명 |
|------|------|
| 목적 | 코루틴 실행 스레드 이름에 `@coroutine#` ID 붙이기 |
| 방법 | `-Dkotlinx.coroutines.debug=on` JVM 옵션 설정 |
| IntelliJ | Run Configurations > VM options |
| Gradle 테스트 | `tasks.withType<Test> { jvmArgs(...) }` 설정 |

---

실제 디버깅 중이라면 이 옵션을 항상 켜두는 것을 추천합니다.
