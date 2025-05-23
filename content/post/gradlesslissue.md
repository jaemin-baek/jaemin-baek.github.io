---
title: "[v.0.0] Gradle에서 Naver Map SDK SSL 오류 해결 (macOS 기준)"
date: 2025-03-11
draft: false
categories: ["Android", "Gradle", "네이버 지도"]
tags: ["SSL", "PKIX", "Gradle", "네이버 지도", "인증서"]
---


# Gradle에서 Naver Map SDK SSL 오류 해결 (macOS 기준)

네이버 지도 SDK를 사용하는 Android 프로젝트에서 다음과 같은 Gradle 에러를 겪었다면, 이 글이 도움이 될 수 있습니다.

```kotlin
PKIX path building failed: sun.security.provider.certpath.SunCertPathBuilderException:
unable to find valid certification path to requested target
```

브라우저로는 잘 열리는데, Gradle에서는 계속 실패하는… 바로 그 상황입니다.

## ✅ 상황 정리

```kotlin
// build.gradle.kts 또는 build.gradle
implementation("com.naver.maps:map-sdk:3.21.0")
```

을 추가했더니 Gradle에서 아래와 같은 SSL 오류가 발생합니다

```kotlin
Could not GET 'https://repository.map.naver.com/archive/maven/...'
PKIX path building failed: unable to find valid certification path to requested target
```

하지만 브라우저에서는 해당 .pom 파일이 정상 다운로드됩니다. 이때 우리는 아래를 의심해야 합니다.

## 🔍 문제 원인

✅ Gradle은 브라우저와 달리 자체 JDK 인증서 저장소(cacerts)를 사용합니다

macOS는 시스템 Keychain을 사용해 프록시 인증서를 신뢰

하지만 Gradle은 JVM 내부의 cacerts만 신뢰함

네이버 저장소의 SSL 인증서 또는 프록시가 삽입한 인증서를 신뢰하지 못하면 위 오류 발생

## 🧭 문제 해결을 위한 삽질 과정

❌ 처음에는 Android Studio 내장 JDK에 인증서를 등록했지만...

```kotlin
/Applications/Android\ Studio.app/Contents/jbr/Contents/Home/lib/security/cacerts
```

이 경로에 인증서를 등록했는데, Gradle은 여전히 실패했습니다.

✅ ./gradlew -version 으로 확인해보니?

```kotlin
JVM: 22.0.2 (Oracle Corporation)
JVM home: /Users/.../openjdk-22.0.2/Contents/Home
```

👉 Gradle은 시스템 JDK (OpenJDK 22)를 사용 중이었던 것!

✅ 그래서 해당 경로로 다시 인증서 등록

```kotlin
sudo keytool -importcert \
  -alias naver-map \
  -file ~/Downloads/naver-map.cer \
  -keystore /Users/you/Library/Java/JavaVirtualMachines/openjdk-22.0.2/Contents/Home/lib/security/cacerts \
  -storepass changeit
```

-file은 브라우저에서 DER 형식으로 저장한 인증서

-storepass 기본값은 changeit

등록 완료 후 ./gradlew clean build 성공! 🎉

## 🧪 인증서 추출 방법 (macOS 기준)

Safari 또는 Chrome으로 https://repository.map.naver.com 접속

주소창 자물쇠 클릭 → 인증서 보기

인증서 계층에서 서버 인증서 또는 루트 인증서 선택

[Export] 클릭 → DER encoded .cer 형식으로 저장

⚠️ 주의: 회사 네트워크에서는 프록시가 인증서를 바꿨을 수도 있습니다

많은 회사는 HTTPS 트래픽을 검사하기 위해 SSL 프록시 (중간자 공격 구조)를 사용합니다.
이 경우 네이버의 인증서 대신 사내 인증서가 삽입되어 브라우저는 OK, Gradle은 실패할 수 있습니다.



✅ 마무리

이번 경험을 통해 아래를 다시 한번 정리할 수 있었습니다:

Gradle의 SSL은 브라우저와 별개의 JDK 인증서 체인에 의존

시스템 JDK인지 Android Studio 내장 JDK인지 반드시 확인

프록시 환경에선 SSL 인증서가 중간에 바뀔 수 있음