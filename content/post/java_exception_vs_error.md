---
title: "[v0.0] Java에서 Exception과 Error의 차이와 명명 이유"
date: 2025-03-13
draft: false
categories: ["Java"]
tags: ["Exception", "Error", "Java", "language design"]
---

# Java에서 Exception과 Error의 차이와 명명 이유

Java에서 `Exception`이라는 용어를 사용한 이유는 단순한 문법의 선택이 아니라 **철학적으로 오류를 "예외적인 상황(exceptional situation)"으로 분류하려는 시도**에 뿌리를 두고 있습니다. 이 개념은 C++ 등 객체지향 언어에서 비롯되었고, Java는 이를 명시적 언어 설계 요소로 적극 도입했습니다.

---

## 🔍 Java가 `Exception`이라는 용어를 채택한 배경

### 1. 예외(Exception)와 오류(Error)의 구분

Java에서는 예외(Exception)와 오류(Error)를 **논리적으로 명확히 구분**합니다.

| 구분         | 설명                                | Java 클래스                                      |
|--------------|-------------------------------------|--------------------------------------------------|
| **Exception**| 애플리케이션에서 예측 가능한 문제, 복구 가능 | `IOException`, `SQLException`, `NullPointerException` 등 |
| **Error**    | 시스템 수준의 복구 불가능한 심각한 문제     | `OutOfMemoryError`, `StackOverflowError` 등       |

---

### 2. 예외는 비정상적이지만 제어 가능한 흐름

- 예외(Exception)는 **일반적이지 않은 제어 흐름**을 나타냅니다.
- Java는 `try-catch-finally`를 통해 예외 발생 시에도 **프로그램 흐름을 유지하면서 처리**할 수 있도록 지원합니다.
- 이는 코드 실행 중 조건이 깨졌을 때의 대응 절차를 정의할 수 있게 합니다.

---

### 3. Exception vs. Error: 철학

- `Exception`: **프로그래머가 처리할 수 있는 예외 상황**
- `Error`: **JVM 또는 시스템 레벨의 문제로, 처리하지 않기를 기대**

---

## 📚 용어 비교 (Java vs Swift vs Kotlin)

| 언어    | 주요 용어             | 처리 방식            | 특징                                          |
|---------|----------------------|----------------------|-----------------------------------------------|
| Java    | `Exception`, `Error` | `try-catch`          | 체크 예외/언체크 예외 구분, 명확한 계층 구조   |
| Swift   | `Error` (Protocol)   | `try-catch`, `throws`| 대부분 `enum`, 구조체 기반, 복구 중심         |
| Kotlin  | `Exception`          | `try-catch`          | Java 계승, 체크 예외 없음                     |

---

## ✨ 결론

Java에서 `Exception`이라는 용어는 오류를 **논리적으로 설명 가능한 '예외적 사건'** 으로 정의하며, 개발자가 이를 **정제된 방식으로 처리**하도록 유도하기 위해 선택된 개념입니다.  
반면 `Error`는 시스템적 결함을 나타내며 **정상적인 흐름에서의 개입을 금지**하는 철학을 따릅니다.
