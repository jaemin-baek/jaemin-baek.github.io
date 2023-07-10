---
title: "Appium 아키텍처 및 내부 동작 원리 심층 분석"
date: "2026-05-22"
category: "Android"
group: "Android Testing"
series: "Appium Architecture"
hub: true
tags: ["appium", "e2e-test", "android", "uiautomator2", "webdriver", "device-farm"]
description: "Appium의 클라이언트-서버 구조, W3C WebDriver 프로토콜, UiAutomator2 Driver 내부 동작, Locator 전략과 DeviceFarm 확장성을 정리합니다."
---

![Appium 아키텍처 및 내부 동작 원리](/images/appium-architecture-cover.png)

E2E 테스트 표준 프레임워크인 Appium의 내부 동작 원리, 클라이언트-서버 통신 메커니즘, 그리고 Android/iOS 단말기 제어의 기술적 기반을 코드 레벨에서 정리한다.

Appium을 단순히 "모바일 테스트를 돌려주는 도구"로만 보면 속도, 안정성, Locator 전략에서 왜 특정 문제가 반복되는지 이해하기 어렵다. 내부 구조를 보면 Appium이 왜 강력한지, 동시에 왜 latency와 flakiness를 완전히 피하기 어려운지 조금 더 명확해진다.

## Appium의 철학과 포지셔닝

Appium은 전문 QA 자동화 엔지니어와 대규모 Device Farm 인프라 연동에 적합하게 설계된 엔터프라이즈급 오픈소스 프레임워크다.

가장 중요한 철학은 이 문장에 가깝다.

```text
테스트를 위해 앱을 재컴파일하거나 수정할 필요가 없어야 한다.
```

이를 위해 Appium은 Google, Apple 같은 각 플랫폼 벤더가 제공하는 기본 자동화 프레임워크를 직접 대체하지 않는다. 대신 Android의 UiAutomator, iOS의 XCUITest 같은 네이티브 자동화 프레임워크를 감싸는 방식으로 동작한다.

또한 하나의 프레임워크 생태계 안에서 Android와 iOS 자동화 테스트를 모두 관리할 수 있다. Java, Kotlin, Python, JavaScript처럼 팀이 이미 사용 중이거나 익숙한 언어로 테스트 스크립트를 작성할 수 있다는 점도 Appium의 큰 장점이다.

## Appium의 3-Tier 구조

Appium은 테스트 스크립트가 단말기와 직접 통신하지 않는다. 중간에 Appium Server가 있고, 이 서버가 플랫폼별 Driver와 단말기 내부의 보조 서버를 거쳐 실제 명령을 수행한다.

![Appium 아키텍처](/images/appium-architecture-overview.png)

큰 흐름은 다음과 같다.

1. 테스트 스크립트가 Appium Client 라이브러리를 호출한다.
2. Client 라이브러리가 명령을 W3C WebDriver 규격의 HTTP 요청으로 직렬화한다.
3. Appium Server가 요청을 받고 세션과 플랫폼 Driver를 찾는다.
4. 플랫폼 Driver가 단말기 내부의 보조 서버와 통신한다.
5. 보조 서버가 네이티브 자동화 API를 호출하고 결과를 반환한다.

## W3C WebDriver 프로토콜

클라이언트와 Appium Server 간 통신은 W3C WebDriver 프로토콜을 기반으로 한다. 개발자가 작성한 테스트 코드는 단말기에서 네이티브 명령으로 즉시 실행되지 않는다.

각 언어별 Client 라이브러리가 메서드 호출을 HTTP REST API 형태의 JSON payload로 직렬화해서 Appium Server에 전송한다.

예를 들어 Python 기반 테스트를 시작할 때는 먼저 서버 주소와 단말기 정보를 담아 세션 생성을 요청한다.

```python
from appium import webdriver
from appium.options.android import UiAutomator2Options

# 1. 제어할 단말기 및 앱 정보 정의
options = UiAutomator2Options()
options.platform_name = "Android"
options.automation_name = "UiAutomator2"
options.app_package = "com.wemade.wemixplay.stage"

# 2. Appium Server 위치 지정 및 연결
appium_server_url = "http://127.0.0.1:4723"
driver = webdriver.Remote(appium_server_url, options=options)
```

서버로부터 세션 ID를 발급받은 뒤에는 코드 레벨의 메서드 호출이 WebDriver 프로토콜에 맞춘 네트워크 요청으로 바뀐다.

## 명령 직렬화 흐름

버튼을 찾고 클릭하는 테스트 코드를 보자.

```python
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

wait_10 = WebDriverWait(driver, 10)
login_btn = wait_10.until(
    EC.element_to_be_clickable((AppiumBy.ID, "btn_login"))
)

login_btn.click()
```

`WebDriverWait` 객체 자체는 클라이언트 로컬 메모리에서 동작한다. 하지만 `until` 조건이 충족될 때까지 Client 라이브러리는 서버를 향해 `findElement` HTTP POST 요청을 지정된 주기로 계속 전송한다.

요소를 찾은 뒤 `login_btn.click()`이 호출되면 Client 라이브러리는 세션 ID와 요소 ID를 결합하여 한 번의 HTTP 요청으로 직렬화한다.

![클라이언트 명령 직렬화 흐름](/images/appium-client-serialization-flow.png)

버튼 클릭은 대략 이런 요청으로 변환된다.

```text
Method: POST
Endpoint: http://127.0.0.1:4723/session/{session_id}/element/{element_id}/click
Headers: Content-Type: application/json; charset=utf-8
Payload: {}
```

클릭 행위 자체에는 추가 데이터가 필요 없으므로 payload는 빈 JSON 객체다.

텍스트 입력은 다르다.

```text
Method: POST
Endpoint: http://127.0.0.1:4723/session/{session_id}/element/{element_id}/value
Headers: Content-Type: application/json; charset=utf-8
Payload: { "text": "Wemade!@34" }
```

## Appium Server의 라우팅

Node.js 환경에서 구동되는 Appium Core Server는 W3C 표준 규격을 구현한 중앙 Router이자 Session Manager다. 서버 자체가 기기를 직접 제어하지는 않는다.

![Appium Server 라우팅 흐름](/images/appium-server-routing-flow.png)

서버가 하는 일은 크게 두 가지다.

첫째, 세션을 식별한다. Appium Server는 수신된 HTTP Request의 URL에서 `{session_id}`를 추출하고 내부 메모리의 Session Map과 대조한다. 이를 통해 현재 연결된 여러 단말기 중 어떤 단말기를 향한 명령인지 찾는다.

둘째, 명령을 플랫폼 Driver로 위임한다. 세션 객체에는 초기화 시점에 생성된 특정 플랫폼 Driver, 예를 들어 `appium-uiautomator2-driver`나 `appium-xcuitest-driver` 인스턴스가 바인딩되어 있다. Appium Server는 JSON payload의 유효성을 검증한 뒤 해당 Driver 인스턴스의 내부 메서드로 명령을 위임한다.

## 플랫폼별 Driver와 On-Device Server

Node.js 기반 Appium Server 내부의 플랫폼 Driver도 단말기를 직접 제어하지 않는다. 대신 기기 내부에 설치된 보조 서버와 통신하여 실제 네이티브 계측 API를 호출한다.

![UiAutomator2 Driver 흐름](/images/appium-uiautomator2-driver-flow.png)

Android에서는 UiAutomator2 Driver가 단말기에 Appium UiAutomator2 Server APK를 설치하고, 이를 Instrumentation 프로세스로 구동한다. 이 서버는 내부적으로 Netty 프레임워크를 통해 Appium Core와 통신한다.

사용자가 요소 클릭 명령을 내리면 On-Device Server는 해당 요소의 `AccessibilityNodeInfo`를 조회한다. 여기서 요소의 화면상 영역인 `bounds` 데이터를 추출하고, 중앙 좌표를 계산한다.

그 다음에는 두 가지 방식 중 하나로 네이티브 이벤트를 주입한다.

- High-level: `androidx.test.uiautomator.UiObject2.click()`을 호출한다.
- Low-level: `android.app.UiAutomation.injectInputEvent()`로 터치 down/up 이벤트를 좌표에 직접 주입한다.

iOS에서는 `appium-xcuitest-driver`가 WebDriverAgent를 빌드하고 설치해 구동한다. WebDriverAgent는 Apple의 XCTest를 HTTP REST API 형태로 감싼 서버 앱에 가깝다. `click` 요청이 오면 WDA는 `XCUIApplication`의 요소 트리에서 해당 요소를 찾고, XCTest의 `tap()` 메서드를 통해 시스템이 허용하는 합성 클릭 이벤트를 생성한다.

## Latency가 생기는 이유

Appium의 클라이언트-서버 구조는 범용성과 확장성 면에서 강력하다. 하지만 명령 실행 시 여러 통신 단계를 거치기 때문에 latency가 생긴다.

![Appium latency 흐름](/images/appium-latency-overhead.png)

단순한 클릭 한 번도 테스트 코드에서 곧바로 단말기 이벤트로 바뀌는 것이 아니다.

```text
Client Library
-> HTTP Request
-> Appium Server
-> Platform Driver
-> On-Device Server
-> Native Automation Framework
-> OS Event
-> Response
```

이 구조를 이해하면 Appium 테스트가 왜 단위 테스트나 로컬 UI 테스트보다 느린지 자연스럽게 보인다. Appium은 빠른 로컬 함수 호출이 아니라, 표준 프로토콜과 플랫폼별 중계 계층 위에서 동작한다.

## UiAutomator2 Driver 내부 동작

Android 자동화를 위해 Appium은 플랫폼 Driver 인스턴스를 초기화할 때 단말기에 특수한 Helper 앱을 설치한다.

![실제 단말기에 설치된 Appium Helper 앱 목록](/images/appium-helper-apps.png)

대표적으로 다음 앱들이 설치된다.

- `Appium Settings`: 네트워크 설정, 단말기 상태 제어 등 보조 역할
- `io.appium.uiautomator2.server`: 실제 UI 제어 및 정보 추출을 수행하는 핵심 서버
- `io.appium.uiautomator2.server.test`: 서버를 Instrumentation으로 실행하기 위한 테스트 타겟 앱

`getPageSource` 명령을 기준으로 보면 단말기 내부 흐름은 다섯 단계로 나눌 수 있다.

## 1단계: 테스트 러너 진입과 Netty HTTP 서버 구동

모든 과정은 단말기에 설치된 `io.appium.uiautomator2.server.test` 패키지가 실행되면서 시작된다. Android OS는 Appium Server에서 실행한 `adb shell am instrument` 명령을 통해 테스트 러너를 실행한다.

실제 진입점은 `AppiumUiAutomator2Server.java`이고, 서버 관리는 `ServerInstrumentation.java`가 담당한다.

흐름은 이렇다.

1. Android OS가 `AppiumUiAutomator2Server` 클래스의 `@Test startServer()` 메서드를 실행한다.
2. 이 메서드 내부에서 `ServerInstrumentation.getInstance().start()`가 호출된다.
3. Netty 기반 HTTP 서버가 백그라운드 스레드에서 구동되어 PC의 요청을 기다린다.
4. 테스트 메서드는 `shutdownLatch.await()`를 호출해 종료되지 않고 대기한다.

## 2단계: Accessibility Framework 쿼리

PC의 Client가 `getPageSource` 명령을 HTTP GET 요청으로 보내면, 서버는 화면 UI 정보를 얻기 위해 Android OS의 Accessibility Framework를 호출한다.

Appium에서는 `Source.java` 핸들러가 이 요청을 처리한다.

1. Netty HTTP 서버로 들어온 요청이 라우팅을 거쳐 `Source` 핸들러로 전달된다.
2. 서버는 내부적으로 Android OS의 `UiAutomation` 인스턴스를 가져온다.
3. 이 인스턴스는 접근성 서비스를 통해 타겟 앱의 화면 루트 노드 정보를 OS 레벨에서 쿼리한다.

## 3단계: UI 트리 순회와 데이터 추출

확보한 루트 노드를 시작으로 전체 화면 구조를 순회하며 데이터를 추출한다.

관련 Android API는 `android.view.accessibility.AccessibilityNodeInfo`다. Appium 쪽에서는 `AccessibilityNodeInfoDumper.java`가 중요한 역할을 한다.

1. `UiElementSnapshot.take()`를 통해 현재 화면의 `AccessibilityNodeInfo` 루트부터 순회한다.
2. `serializeUiElement` 메서드가 재귀적으로 호출되며 DFS 방식으로 자식 요소를 방문한다.
3. 각 노드에서 `bounds`, `text`, `content-desc`, `className`, `packageName`, `resource-id`, `enabled`, `focused` 같은 정보를 추출한다.

## 4단계: XML 직렬화

메모리상의 UI 트리 데이터는 W3C WebDriver 표준에 맞춰 텍스트 형태의 XML로 직렬화된다.

`AccessibilityNodeInfoDumper`가 노드 트리를 XML로 변환하는 핵심 역할을 한다. Android 표준 `XmlSerializer`를 사용해 `<hierarchy>`, `<node>` 태그를 차례로 열고, 앞 단계에서 추출한 정보를 XML 속성으로 기록한다.

예시는 이런 형태다.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<hierarchy rotation="0" width="1080" height="1920">
  <node
      index="0"
      class="android.widget.FrameLayout"
      package="com.example.myapp"
      content-desc=""
      checkable="false"
      checked="false"
      clickable="false"
      enabled="true"
      focusable="false"
      focused="false"
      scrollable="false"
      long-clickable="false"
      password="false"
      selected="false"
      bounds="[0,0][1080,1920]"
      displayed="true" />
</hierarchy>
```

## 5단계: XML Dump 응답 전송

마지막으로 생성된 XML 데이터는 PC의 Appium Client로 반환된다.

`Source.java` 핸들러는 `AccessibilityNodeInfoDumper`로부터 받은 XML 문자열을 `AppiumResponse` 객체의 `value` 필드에 담는다. 이 응답은 W3C WebDriver 프로토콜에 따라 다음 형태의 JSON 구조를 가진다.

```json
{
  "sessionId": "...",
  "value": "XML데이터..."
}
```

그 다음 `BaseRequestHandler`가 이 객체를 JSON으로 변환하고, Netty의 `ChannelHandlerContext`를 사용해 HTTP 200 OK 응답을 PC로 보낸다.

## Locator 전략과 XPath의 한계

Appium은 전달받은 거대한 XML dump 데이터를 Client 측에서 파싱해 요소를 탐색한다. 그래서 Locator 전략은 테스트 속도와 안정성에 직접적인 영향을 준다.

가장 권장되는 방식은 테스트 전용 고유 ID를 부여하는 것이다.

Android Jetpack Compose에서는 `Modifier.testTag("btn_login")`을 사용해 화면에 보이지 않는 테스트 전용 ID를 부여할 수 있다. Appium에서는 `By.id`로 탐색한다. 접근성 텍스트인 `contentDescription`은 `AppiumBy.accessibilityId`로 탐색할 수 있다.

![Compose testTag 예시](/images/appium-compose-testtag-code.png)

iOS SwiftUI에서는 `.accessibilityIdentifier("btn_login")`를 사용한다. Android의 `testTag`와 거의 같은 역할이다.

![SwiftUI accessibilityIdentifier 예시](/images/appium-swiftui-accessibilityidentifier-code.png)

ID가 없는 경우에는 화면에 보이는 텍스트나 계층 구조를 활용해 XPath를 사용하기도 한다.

```kotlin
val btnByText = By.xpath("//*[@text='로그인']")
val btnByClassAndText = By.xpath("//android.widget.Button[@text='확인']")
```

![XPath locator 예시](/images/appium-xpath-locator-code.png)

하지만 XPath 탐색은 전체 UI XML 트리를 파싱해 구조적으로 접근한다. 데이터 연산과 전송 오버헤드가 발생하므로 처리 속도가 상대적으로 느리다.

더 큰 문제는 구조적 의존성이다. 화면의 시각적인 변화가 없더라도 내부 레이아웃 depth나 부모-자식 클래스 구조가 조금만 바뀌면 탐색 경로가 어긋나 테스트가 깨질 수 있다.

## 클릭은 결국 좌표 기반 터치다

Appium 스크립트에서 `.click()` 명령을 호출하면 겉으로는 요소 객체 자체를 논리적으로 클릭하는 것처럼 보인다. 하지만 내부 동작은 좌표 기반의 물리적 터치에 가깝다.

![접근성 트리를 통한 UI 식별 및 좌표 변환 과정](/images/appium-touch-bounds-flow.png)

UiAutomator2는 `AccessibilityNodeInfo`가 반환하는 요소 영역 정보인 `bounds="[x1,y1][x2,y2]"`를 추출한다.

예를 들어 bounds가 다음과 같다고 하자.

```text
bounds="[42,1022][1038,1148]"
```

시스템은 내부적으로 정중앙 좌표를 계산한다.

```text
centerX = (42 + 1038) / 2 = 540
centerY = (1022 + 1148) / 2 = 1085
```

그 뒤 Android OS의 InputManager를 통해 해당 픽셀 지점에 물리적인 터치 이벤트인 `MotionEvent`를 주입한다.

## Flakiness와 명시적 대기

모바일 앱은 네트워크 지연, 애니메이션, 비동기 렌더링 때문에 UI가 준비되는 시간이 매번 달라질 수 있다.

Appium은 요소를 찾을 때 기본적으로 프레임워크가 모든 상황을 알아서 기다려주지 않는다. 개발자가 명시적 대기 로직을 직접 구현해야 한다.

```kotlin
// 예: "로그인" 버튼이 클릭 가능해질 때까지 최대 5초 대기
val wait = WebDriverWait(driver, Duration.ofSeconds(5))
val targetId = By.id("app:id/btn_login")
val loginBtn = wait.until(ExpectedConditions.elementToBeClickable(targetId))

loginBtn.click()
```

이런 대기 코드가 누락되거나 예상치 못한 네트워크 지연이 발생하면 요소를 찾지 못해 예외가 발생하고, 테스트는 쉽게 flaky해진다.

## Appium의 인프라 확장성

구조적 복잡성에도 불구하고 Appium이 엔터프라이즈 환경에서 강력한 이유는 인프라 확장성이다.

Appium Dashboard 같은 플러그인을 사용하면 테스트 로그, 비디오 녹화, 디바이스 로그를 한곳에서 확인할 수 있다.

![Appium Dashboard](/images/appium-dashboard.png)

STF 같은 로컬 Device Farm 도구를 사용하면 사내에 있는 여러 Android/iOS 기기를 브라우저에서 중앙 관리하고 Appium과 연동할 수 있다.

![DeviceFarm 기기 목록](/images/appium-devicefarm-list.png)

![DeviceFarm 단말 상세 화면](/images/appium-devicefarm-detail.png)

클라우드에서는 BrowserStack, AWS Device Farm 같은 서비스와 연동할 수 있다. 또한 JUnit XML 포맷의 `report.xml`을 생성하면 GitHub Actions나 Jenkins 같은 CI/CD 대시보드에서 성공률과 실패 원인을 시각화하기 쉽다.

아래는 Android Device 로그와 Appium 로그 예시다.

![Android Device 로그](/images/appium-android-device-log.png)

![Appium 로그 예시](/images/appium-kakaopay-log.png)

## 정리

Appium을 이해할 때 핵심은 "테스트 코드가 바로 단말기를 누른다"는 그림에서 벗어나는 것이다.

실제 흐름은 더 길다.

```text
Test Script
-> Appium Client Library
-> W3C WebDriver HTTP Request
-> Appium Server
-> Platform Driver
-> On-Device Server
-> Native Automation Framework
-> OS Event
```

이 구조 덕분에 Appium은 플랫폼과 언어를 넓게 지원한다. 반대로 이 구조 때문에 latency가 생기고, Locator 전략과 명시적 대기가 테스트 안정성에 큰 영향을 준다.

내가 가져가고 싶은 기준은 세 가지다.

1. 가능한 한 테스트 전용 ID를 부여한다.
2. XPath는 마지막 수단으로 사용한다.
3. Appium 테스트는 네트워크와 UI 렌더링 지연을 전제로 명시적 대기를 설계한다.

Appium은 단순한 클릭 자동화 도구라기보다, 표준 프로토콜과 플랫폼별 네이티브 자동화 프레임워크를 연결하는 중계 아키텍처다. 이 관점이 잡히면 테스트가 느리거나 불안정할 때 어디를 봐야 하는지도 조금 더 선명해진다.

## 함께 읽기

- [[android-ui-state-layer-compose|안정적인 Compose 화면을 위한 UI State 설계]]
- [[compose-recomposition-understanding|Compose recomposition 다시 그리기 이해하기]]
- [[mvi-basic-counter-sample|MVI Counter 샘플로 상태 흐름 이해하기]]
