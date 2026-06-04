---
title: "ProcessLifecycleOwner로 앱 포그라운드/백그라운드 감지하기"
date: "2026-06-06"
category: "Android"
group: "Android Basics"
series: "Android Basics"
tags: ["android", "lifecycle", "processlifecycleowner", "foreground", "background", "kotlin"]
description: "ProcessLifecycleOwner가 Activity 하나가 아니라 앱 프로세스 전체의 포그라운드/백그라운드 상태를 어떻게 알려주는지 쉽게 정리합니다."
---

![ProcessLifecycleOwner로 앱 포그라운드/백그라운드 감지하기](/images/process-lifecycle-owner-cover.png)

앞에서 [[hilt-androidapp-inject-application|Application에서 Hilt 필드 주입을 사용하는 이유]]를 정리했다. 그 다음으로 자연스럽게 보게 되는 코드가 있다.

```kotlin
ProcessLifecycleOwner.get().lifecycle.addObserver(
    object : DefaultLifecycleObserver {
        override fun onStart(owner: LifecycleOwner) {
            realtimeConnection.connect()
        }

        override fun onStop(owner: LifecycleOwner) {
            realtimeConnection.disconnect()
        }
    }
)
```

처음 보면 질문이 생긴다.

```text
Activity에도 lifecycle이 있는데
왜 굳이 ProcessLifecycleOwner를 쓸까?
```

한 줄로 답하면 이렇다.

```text
ProcessLifecycleOwner는 앱 프로세스 전체가
포그라운드인지 백그라운드인지 알려주는 LifecycleOwner다.
```

여기서 중요한 단어는 `Activity 하나`가 아니라 `앱 전체`다.

## Activity 생명주기만으로 부족한 순간

어떤 실시간 연결이 있다고 해보자.

```kotlin
interface RealtimeConnection {
    fun connect()
    fun disconnect()
}
```

이 연결은 사용자가 앱을 보고 있을 때만 유지하고 싶다. 앱이 백그라운드로 가면 끊어서 배터리와 네트워크를 아끼고 싶다.

처음에는 Activity 생명주기에 연결하고 싶어진다.

```kotlin
class MainActivity : AppCompatActivity() {

    override fun onStart() {
        super.onStart()
        realtimeConnection.connect()
    }

    override fun onStop() {
        realtimeConnection.disconnect()
        super.onStop()
    }
}
```

단순한 앱이라면 그럭저럭 동작할 수 있다. 하지만 화면이 여러 개가 되면 애매해진다.

예를 들어 A 화면에서 B 화면으로 이동한다고 해보자.

```text
A 화면 실행 중
-> A.onStop()
-> B.onStart()
-> B 화면 실행 중
```

사용자 입장에서는 앱을 나간 적이 없다. 그냥 앱 안에서 화면을 이동했을 뿐이다.

그런데 A Activity 기준으로 보면 `onStop()`이 호출된다. 여기에 연결 해제 로직을 넣어두면 앱은 계속 보이는데도 연결이 끊겼다가 다시 붙을 수 있다.

화면 회전도 비슷하다.

```text
화면 회전
-> 기존 Activity stop/destroy
-> 새 Activity create/start
```

앱은 계속 화면에 보이지만, Activity 하나만 보면 잠깐 멈춘 것처럼 보인다.

그래서 필요한 질문은 이것이다.

```text
이 Activity가 멈췄는가?
```

가 아니라

```text
앱 전체가 사용자에게 보이는가?
```

다.

## ProcessLifecycleOwner는 앱 전체를 본다

ProcessLifecycleOwner는 개별 Activity가 아니라 앱 프로세스 전체의 Lifecycle을 제공한다.

![Activity 생명주기와 ProcessLifecycleOwner 차이](/images/process-lifecycle-owner-activity-vs-process.png)

생각은 단순하다.

```text
보이는 Activity가 하나라도 있으면
앱은 포그라운드다.

보이는 Activity가 하나도 없으면
앱은 백그라운드다.
```

그래서 Activity 전환에 덜 민감하다.

```text
A 화면 -> B 화면 이동
```

이 과정에서 A가 멈추더라도 B가 곧 시작된다. 앱 전체로 보면 사용자는 계속 앱을 보고 있다.

ProcessLifecycleOwner는 이런 내부 전환을 앱 백그라운드 전환으로 쉽게 오해하지 않도록 도와준다.

## 이벤트는 어떻게 들어올까

ProcessLifecycleOwner의 이벤트를 Activity 이벤트와 똑같이 생각하면 조금 헷갈린다.

대략 이렇게 이해하면 된다.

| 이벤트 | ProcessLifecycleOwner에서의 의미 |
|---|---|
| `ON_CREATE` | 앱 프로세스 생명주기에서 한 번 발생 |
| `ON_START` | 앱이 포그라운드로 들어옴 |
| `ON_RESUME` | 앱이 사용자와 상호작용 가능한 상태로 들어옴 |
| `ON_PAUSE` | 앱이 백그라운드로 가기 직전 상태 |
| `ON_STOP` | 앱이 백그라운드로 들어감 |
| `ON_DESTROY` | 발생하지 않음 |

AndroidX 문서에서도 ProcessLifecycleOwner는 `ON_CREATE`는 한 번 보내지만 `ON_DESTROY`는 보내지 않는다고 설명한다.

이 점이 꽤 중요하다.

```text
프로세스 종료 순간에 정리해야지
```

라고 생각하고 `onDestroy()`를 기다리면 안 된다. 앱 프로세스는 OS에 의해 콜백 없이 종료될 수 있다.

그래서 실시간 연결 같은 것은 보통 `onStop()`에서 정리한다.

```text
앱이 백그라운드로 감
-> 더 이상 화면에 보이지 않음
-> 연결 해제
```

영구 저장이 필요한 중요한 데이터라면 ProcessLifecycleOwner의 `ON_DESTROY` 같은 것에 기대지 말고, 상태가 바뀌는 시점에 바로 저장하는 편이 안전하다.

## 700ms 지연이 왜 중요할까

ProcessLifecycleOwner의 재미있는 부분은 `ON_STOP`, `ON_PAUSE` 계열 이벤트를 바로 보내지 않는다는 점이다.

현재 AndroidX 구현에는 `TIMEOUT_MS = 700L` 지연이 들어 있다.

이 지연은 내부 화면 전환과 진짜 백그라운드 전환을 구분하는 데 도움을 준다.

```text
Activity가 멈춤
-> 바로 앱 백그라운드라고 판단하지 않음
-> 잠깐 기다림
-> 그 사이 새 Activity가 시작되면 백그라운드 이벤트 취소
```

예를 들어 화면 A에서 화면 B로 이동하면 A는 멈춘다. 하지만 곧 B가 시작된다.

```text
A.onStop()
-> 잠깐 기다림
-> B.onStart()
-> 앱은 계속 포그라운드
```

이 덕분에 앱 안에서 화면을 이동할 때마다 연결이 끊겼다 붙는 일을 줄일 수 있다.

반대로 사용자가 홈 버튼을 누르거나 다른 앱으로 이동하면 새 Activity가 올라오지 않는다.

```text
마지막 Activity가 멈춤
-> 잠깐 기다림
-> 여전히 보이는 Activity가 0개
-> ON_STOP 발생
```

이때가 진짜 앱 백그라운드 진입으로 볼 수 있다.

다만 700ms라는 숫자 자체를 앱 로직의 정밀한 타이머처럼 의존하지는 않는 편이 좋다. 여기서 중요한 건 "내부 전환에 속지 않도록 잠깐 기다린다"는 개념이다.

## Application에서 어떻게 사용할까

앱 전체 생명주기를 보고 싶다면 보통 `Application`에서 observer를 등록한다.

![Application에서 ProcessLifecycleOwner 사용하기](/images/process-lifecycle-owner-observer-flow.png)

예시는 이렇게 만들 수 있다.

```kotlin
@HiltAndroidApp
class DemoApplication : Application() {

    @Inject
    lateinit var realtimeConnection: RealtimeConnection

    override fun onCreate() {
        super.onCreate()

        ProcessLifecycleOwner.get()
            .lifecycle
            .addObserver(object : DefaultLifecycleObserver {
                override fun onStart(owner: LifecycleOwner) {
                    realtimeConnection.connect()
                }

                override fun onStop(owner: LifecycleOwner) {
                    realtimeConnection.disconnect()
                }
            })
    }
}
```

이 코드는 이렇게 읽으면 된다.

```text
앱이 포그라운드로 들어오면
-> connect()

앱이 백그라운드로 들어가면
-> disconnect()
```

여기서 `DefaultLifecycleObserver`를 쓰면 필요한 콜백만 골라 구현할 수 있다.

```kotlin
object : DefaultLifecycleObserver {
    override fun onStart(owner: LifecycleOwner) {
        // 앱 포그라운드
    }

    override fun onStop(owner: LifecycleOwner) {
        // 앱 백그라운드
    }
}
```

`onCreate`, `onResume`, `onPause`, `onDestroy`까지 모두 구현할 필요가 없다. 필요한 이벤트만 오버라이드하면 된다.

## onStart와 onStop을 쓰는 이유

앱이 보이면 연결하고, 앱이 숨으면 끊는 목적이라면 보통 `onStart`와 `onStop`이 잘 맞는다.

```kotlin
override fun onStart(owner: LifecycleOwner) {
    realtimeConnection.connect()
}

override fun onStop(owner: LifecycleOwner) {
    realtimeConnection.disconnect()
}
```

이렇게 생각하면 된다.

```text
onStart:
보이는 Activity가 생김
앱이 화면에 보이기 시작함

onStop:
보이는 Activity가 모두 사라짐
앱이 화면에서 사라짐
```

`onResume`과 `onPause`도 사용할 수 있지만, "화면에 보이는지"가 핵심이면 `onStart`와 `onStop`이 더 직관적이다.

## 의존성은 무엇이 필요할까

ProcessLifecycleOwner는 `lifecycle-process` 아티팩트에 들어 있다.

```kotlin
dependencies {
    implementation("androidx.lifecycle:lifecycle-process:<version>")
}
```

버전은 프로젝트의 AndroidX Lifecycle 버전에 맞추면 된다.

이 의존성이 들어오면 보통 별도의 수동 초기화는 필요하지 않다. `ProcessLifecycleOwner.get()`으로 가져와 사용할 수 있다. AndroidX 내부에서는 `ProcessLifecycleInitializer`가 App Startup을 통해 초기화를 담당한다.

다만 프로젝트에서 App Startup initializer를 직접 비활성화하고 있다면 초기화 경로를 확인해야 한다.

## 무거운 작업은 바로 하지 않기

Lifecycle observer 콜백은 메인 스레드에서 호출되는 흐름으로 생각하는 것이 안전하다.

그래서 `onStart`, `onStop` 안에서 무거운 네트워크 작업이나 DB 작업을 직접 오래 붙잡고 있으면 좋지 않다.

나쁜 예시는 이런 느낌이다.

```kotlin
override fun onStart(owner: LifecycleOwner) {
    // 오래 걸리는 네트워크 작업을 여기서 직접 블로킹하면 안 좋다
    realtimeConnection.connectBlocking()
}
```

대신 내부에서 코루틴이나 별도 스레드로 넘기는 구조가 낫다.

```kotlin
class RealtimeConnectionImpl @Inject constructor(
    private val scope: CoroutineScope
) : RealtimeConnection {

    override fun connect() {
        scope.launch {
            // 네트워크 연결 준비
        }
    }

    override fun disconnect() {
        scope.launch {
            // 연결 해제
        }
    }
}
```

Application에서는 "앱 상태가 바뀌었다"는 신호만 전달하고, 실제 무거운 일은 담당 객체가 처리하게 두는 편이 읽기도 좋다.

## 언제 쓰면 좋을까

ProcessLifecycleOwner가 잘 맞는 경우는 앱 전체 포그라운드 상태가 중요한 작업이다.

```text
앱이 보일 때만 실시간 연결 유지
앱이 보일 때만 위치 업데이트 수신
앱 전역 분석 세션 시작/종료
앱 백그라운드 진입 시 임시 리소스 정리
```

반대로 특정 화면에서만 필요한 작업이라면 Activity나 Fragment의 lifecycle이 더 낫다.

```text
특정 화면에서만 카메라 프리뷰 시작
특정 화면에서만 센서 수집
특정 Fragment가 보일 때만 데이터 관찰
```

기준은 이것이다.

```text
화면 하나의 생명주기인가?
-> Activity/Fragment lifecycle

앱 전체의 보임/숨김 상태인가?
-> ProcessLifecycleOwner
```

## 주의할 점

첫 번째, `ON_DESTROY`를 기다리지 말자.

ProcessLifecycleOwner는 프로세스 종료 이벤트를 안정적으로 알려주는 도구가 아니다. 백그라운드 진입 시점에 할 정리는 `onStop`에서 하고, 중요한 데이터는 더 이른 시점에 저장하는 편이 안전하다.

두 번째, foreground service와는 별개로 생각하자.

ProcessLifecycleOwner는 주로 Activity 상태를 바탕으로 앱이 화면에 보이는지 판단한다. foreground service가 돌고 있어도 화면에 보이는 Activity가 없으면 앱 UI 관점에서는 백그라운드일 수 있다.

세 번째, 멀티 프로세스 앱이라면 프로세스 단위를 의식하자.

이름 그대로 process lifecycle이다. 앱이 여러 프로세스를 사용한다면 각 프로세스의 생명주기와 초기화 경로를 따로 봐야 할 수 있다.

네 번째, 700ms를 비즈니스 규칙으로 쓰지 말자.

현재 구현의 지연값은 내부 전환을 완충하기 위한 세부 구현이다. "정확히 700ms 뒤에 무언가를 해야 한다" 같은 요구사항에는 별도의 타이머나 상태 관리가 필요하다.

## 한 줄로 정리하기

ProcessLifecycleOwner는 앱 프로세스 전체가 포그라운드인지 백그라운드인지 알려주는 LifecycleOwner다.

Activity 하나의 `onStart`, `onStop`은 화면 전환이나 회전에 민감할 수 있다. 반면 ProcessLifecycleOwner는 여러 Activity 상태를 모아 앱 전체가 실제로 보이는지를 판단한다.

그래서 이런 코드가 자연스럽다.

```kotlin
ProcessLifecycleOwner.get().lifecycle.addObserver(
    object : DefaultLifecycleObserver {
        override fun onStart(owner: LifecycleOwner) {
            realtimeConnection.connect()
        }

        override fun onStop(owner: LifecycleOwner) {
            realtimeConnection.disconnect()
        }
    }
)
```

앱이 보이면 연결하고, 앱이 숨으면 해제한다. 이 목적이라면 ProcessLifecycleOwner는 Activity마다 직접 카운트를 세고 지연 처리까지 구현하던 일을 깔끔하게 대신해주는 도구라고 보면 된다.

## 참고자료

- [Android Developers - ProcessLifecycleOwner](https://developer.android.com/reference/androidx/lifecycle/ProcessLifecycleOwner)
- [AndroidX source - ProcessLifecycleOwner.kt](https://android.googlesource.com/platform/frameworks/support/+/refs/heads/androidx-main/lifecycle/lifecycle-process/src/main/java/androidx/lifecycle/ProcessLifecycleOwner.kt)
- [AndroidX source - ProcessLifecycleInitializer.kt](https://android.googlesource.com/platform/frameworks/support/+/refs/heads/androidx-main/lifecycle/lifecycle-process/src/main/java/androidx/lifecycle/ProcessLifecycleInitializer.kt)
