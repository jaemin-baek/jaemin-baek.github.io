---
title: "안드로이드 디바운스: delay와 뭐가 다를까?"
date: "2026-06-07"
category: "Android"
group: "Android Basics"
series: "Android Basics"
tags: ["android", "debounce", "debouncing", "kotlin", "flow", "coroutines", "lifecycle"]
description: "디바운스가 단순한 delay와 어떻게 다른지, Android 검색창과 ProcessLifecycleOwner 예제로 delay + 취소/리셋 관점에서 정리합니다."
---

![안드로이드 디바운스: delay와 뭐가 다를까?](/images/android-debounce-cover.png)

앞 글에서 [[process-lifecycle-owner-foreground-background|ProcessLifecycleOwner의 700ms 지연]]을 이야기했다. Activity 전환이나 화면 회전처럼 잠깐 흔들리는 이벤트에 바로 반응하지 않고, 조금 기다렸다가 진짜 백그라운드인지 판단한다는 내용이었다.

여기서 자연스럽게 질문이 생긴다.

```text
그럼 결국 delay 아닌가?
```

맞다. 기다린다는 점에서는 delay가 들어간다. 하지만 디바운스의 핵심은 delay 자체가 아니다.

```text
디바운스 = delay + 취소/리셋
```

이 글은 디바운스가 무엇인지, 그냥 delay와 무엇이 다른지, Android에서는 어디에 쓰는지 정리한 메모다.

## 디바운스란 무엇일까

디바운스(debounce)는 이벤트가 연달아 들어올 때 바로바로 반응하지 않고, 이벤트가 잠잠해질 때까지 기다렸다가 마지막에 한 번만 반응하는 방식이다.

한 문장으로 줄이면 이렇다.

```text
마지막 이벤트 이후 일정 시간 동안 새 이벤트가 없으면 실행한다.
```

예를 들어 검색창에 `카페인`을 입력한다고 해보자.

```text
ㅋ
카
카페
카페인
```

사용자는 하나의 검색어를 입력하고 있지만, 앱 입장에서는 입력 이벤트가 여러 번 들어온다.

만약 입력이 바뀔 때마다 바로 API를 호출하면 이런 일이 생긴다.

```text
search("ㅋ")
search("카")
search("카페")
search("카페인")
```

대부분은 불필요한 호출이다. 사용자는 아직 입력 중이기 때문이다.

디바운스를 걸면 이렇게 바뀐다.

```text
입력 중에는 계속 기다림
마지막 입력 뒤 300ms 동안 조용함
-> search("카페인") 한 번만 호출
```

그래서 검색창, 자동완성, 필터 입력, 화면 크기 변경, 연속 클릭 방지 같은 곳에서 자주 등장한다.

## delay와 debounce의 차이

디바운스를 처음 보면 그냥 `delay(300)`을 넣은 것처럼 보인다.

하지만 둘은 결과가 다르다.

![delay와 debounce의 차이](/images/android-debounce-delay-vs-debounce.png)

그냥 delay는 실행을 늦출 뿐이다.

```kotlin
fun onQueryChanged(query: String) {
    viewModelScope.launch {
        delay(300)
        search(query)
    }
}
```

이 코드는 입력이 4번 들어오면 작업도 4번 예약된다.

```text
0ms    "ㅋ" 입력    -> 300ms 뒤 search("ㅋ")
100ms  "카" 입력    -> 400ms 뒤 search("카")
200ms  "카페" 입력  -> 500ms 뒤 search("카페")
300ms  "카페인" 입력 -> 600ms 뒤 search("카페인")
```

결과적으로 API 호출은 4번 발생한다. 단지 300ms씩 늦게 실행될 뿐이다.

디바운스는 다르다. 새 이벤트가 들어오면 이전 예약을 취소한다.

```kotlin
private var searchJob: Job? = null

fun onQueryChanged(query: String) {
    searchJob?.cancel()
    searchJob = viewModelScope.launch {
        delay(300)
        search(query)
    }
}
```

이제 입력이 다시 들어올 때마다 이전 작업이 취소된다.

```text
0ms    "ㅋ" 입력    -> 300ms 뒤 검색 예약
100ms  "카" 입력    -> 이전 예약 취소, 새 예약
200ms  "카페" 입력  -> 이전 예약 취소, 새 예약
300ms  "카페인" 입력 -> 이전 예약 취소, 새 예약
600ms  조용함       -> search("카페인") 한 번 실행
```

차이는 `cancel()`이다.

```text
delay:
늦게 실행한다.

debounce:
늦게 실행하되,
그 사이 새 이벤트가 오면 이전 실행을 취소하고 다시 기다린다.
```

그래서 디바운스는 여러 이벤트를 한 번으로 합칠 수 있다.

## 취소와 리셋이 본질이다

디바운스를 이해할 때 타이머를 떠올리면 쉽다.

```text
이벤트 발생
-> 타이머 시작
-> 새 이벤트 발생
-> 기존 타이머 취소
-> 새 타이머 시작
-> 조용히 끝까지 기다림
-> 실행
```

즉 타이머가 계속 리셋된다.

이벤트가 계속 들어오면 실행은 계속 미뤄진다. 이벤트가 멈추고 나서야 마지막 값으로 한 번 실행된다.

그래서 디바운스는 이런 상황에 잘 맞는다.

```text
사용자가 아직 입력 중인지 모르겠다.
화면 전환이 진짜 끝났는지 모르겠다.
연속 이벤트 중 마지막 결과만 필요하다.
```

반대로 모든 이벤트를 반드시 처리해야 한다면 디바운스가 맞지 않는다. 디바운스는 중간 이벤트를 의도적으로 버린다.

## Kotlin Flow의 debounce

Android에서 코루틴과 Flow를 사용한다면 직접 `Job`을 관리하지 않고 `debounce` 연산자를 사용할 수 있다.

Kotlin 공식 API 문서에서 `Flow.debounce`는 원본 Flow를 반영하되, timeout 안에 더 새로운 값이 따라오는 값은 걸러내고 최신 값은 항상 방출한다고 설명한다.

검색창 예제를 Flow로 쓰면 이런 모양이 된다.

![검색창에서 debounce 사용하기](/images/android-debounce-search-flow.png)

```kotlin
class SearchViewModel(
    private val searchRepository: SearchRepository
) : ViewModel() {

    private val query = MutableStateFlow("")

    fun onQueryChanged(value: String) {
        query.value = value
    }

    init {
        query
            .debounce(300)
            .distinctUntilChanged()
            .filter { it.isNotBlank() }
            .onEach { keyword ->
                search(keyword)
            }
            .launchIn(viewModelScope)
    }

    private suspend fun search(keyword: String) {
        searchRepository.search(keyword)
    }
}
```

흐름은 이렇다.

```text
TextField 입력 변경
-> query.value 변경
-> debounce(300)
-> 300ms 동안 새 입력이 없으면 통과
-> distinctUntilChanged()
-> 이전 검색어와 같으면 무시
-> search(keyword)
```

`debounce(300)`은 입력이 빠르게 바뀌는 동안 값을 바로 내보내지 않는다. 마지막 입력 뒤 300ms 동안 새 값이 없을 때만 다음 단계로 넘긴다.

여기에 `distinctUntilChanged()`를 같이 쓰는 경우가 많다.

```kotlin
.debounce(300)
.distinctUntilChanged()
```

역할이 다르다.

```text
debounce:
짧은 시간에 몰려오는 입력을 마지막 하나로 줄인다.

distinctUntilChanged:
같은 값이 연속으로 들어오면 중복 처리하지 않는다.
```

예를 들어 사용자가 `카페`를 입력하고 잠깐 멈춘 뒤, 다시 같은 `카페` 값이 들어온다면 `distinctUntilChanged()`가 중복 검색을 막아준다.

프로젝트의 coroutines 버전에 따라 `debounce` 사용 시 `@OptIn(FlowPreview::class)`가 필요할 수 있다.

```kotlin
@OptIn(FlowPreview::class)
private fun observeQuery() {
    query
        .debounce(300)
        .onEach { keyword -> search(keyword) }
        .launchIn(viewModelScope)
}
```

## 검색 요청 자체도 취소하고 싶다면

`debounce`는 검색을 시작하기 전의 입력 이벤트를 줄여준다.

그런데 검색 API가 이미 시작된 뒤에 새 검색어가 들어오는 상황도 있다.

```text
"카페" 검색 시작
-> 아직 응답 안 옴
-> 사용자가 "카페인" 입력
-> "카페" 검색 결과는 이제 필요 없음
```

이럴 때는 `mapLatest`나 `flatMapLatest`를 함께 생각할 수 있다.

```kotlin
@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
val results: StateFlow<List<SearchItem>> =
    query
        .debounce(300)
        .distinctUntilChanged()
        .filter { it.isNotBlank() }
        .mapLatest { keyword ->
            searchRepository.search(keyword)
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList()
        )
```

여기서 역할을 나눠보면 이렇다.

```text
debounce:
검색 시작 전, 너무 잦은 입력을 줄인다.

mapLatest:
새 검색어가 오면 이전 검색 작업을 취소하고 최신 검색만 유지한다.
```

검색 기능에서는 둘을 같이 쓰는 일이 많다.

## Compose TextField에서는 어떻게 연결할까

Compose에서는 `TextField`의 `onValueChange`에서 ViewModel로 입력값을 넘긴다.

```kotlin
@Composable
fun SearchScreen(
    viewModel: SearchViewModel
) {
    val query by viewModel.query.collectAsStateWithLifecycle()

    TextField(
        value = query,
        onValueChange = viewModel::onQueryChanged,
        placeholder = {
            Text("검색어를 입력하세요")
        }
    )
}
```

그리고 ViewModel 안에서 debounce를 처리한다.

```kotlin
class SearchViewModel : ViewModel() {
    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    fun onQueryChanged(value: String) {
        _query.value = value
    }

    init {
        _query
            .debounce(300)
            .distinctUntilChanged()
            .onEach { keyword ->
                // 검색 실행
            }
            .launchIn(viewModelScope)
    }
}
```

중요한 점은 UI에서 직접 `delay`를 걸기보다, 입력 상태를 ViewModel에 전달하고 ViewModel의 Flow에서 이벤트를 다루는 편이 흐름을 이해하기 쉽다는 것이다.

## 버튼 중복 클릭도 디바운스일까

Android에서 "버튼 디바운스"라는 말을 자주 쓴다.

예를 들어 결제 버튼이나 로그인 버튼을 빠르게 여러 번 누르는 것을 막고 싶을 때다.

```text
버튼 클릭
버튼 클릭
버튼 클릭
```

이때 마지막 클릭만 처리하고 싶다면 디바운스라고 볼 수 있다. 하지만 실무에서는 보통 첫 클릭은 즉시 처리하고, 잠깐 동안 다음 클릭을 막는 방식도 많이 쓴다.

```kotlin
class ClickGuard(
    private val intervalMillis: Long = 700L
) {
    private var lastClickTime = 0L

    fun canClick(): Boolean {
        val now = SystemClock.elapsedRealtime()
        if (now - lastClickTime < intervalMillis) return false

        lastClickTime = now
        return true
    }
}
```

이 방식은 엄밀히 말하면 debounce보다는 throttle이나 click guard에 가깝다.

왜냐하면 마지막 클릭을 기다렸다가 실행하는 것이 아니라, 첫 클릭을 바로 실행하고 일정 시간 안의 다음 클릭을 무시하기 때문이다.

```text
debounce:
마지막 이벤트 뒤 조용해지면 실행

click guard:
첫 이벤트는 실행하고 잠깐 동안 다음 이벤트 무시
```

둘 다 "이벤트 폭주를 줄인다"는 목적은 같지만, 사용자 경험은 다르다.

검색창은 마지막 입력이 중요하다. 그래서 debounce가 잘 맞는다.

버튼은 첫 클릭에 즉시 반응하는 편이 자연스럽다. 그래서 click guard나 throttle이 더 맞을 수 있다.

## ProcessLifecycleOwner의 700ms도 같은 생각이다

이전 글의 ProcessLifecycleOwner 예제를 다시 보자.

```text
화면 회전
0ms   Activity onStop
50ms  새 Activity onStart
```

만약 그냥 delay라면 이런 일이 생긴다.

```text
0ms   onStop -> 700ms 뒤 disconnect 예약
50ms  onStart
700ms disconnect 실행
```

앱은 계속 보이고 있는데 연결이 끊길 수 있다.

디바운스처럼 동작하면 다르다.

```text
0ms   onStop -> 700ms 뒤 onStop 이벤트 예약
50ms  onStart -> 예약 취소
700ms 실행할 것 없음
```

이 차이가 핵심이다.

```text
그냥 delay:
늦게라도 결국 실행한다.

디바운스:
새 이벤트가 오면 이전 실행을 없애버린다.
```

그래서 ProcessLifecycleOwner의 700ms 지연은 단순히 늦게 알려주는 장치가 아니라, Activity 전환 중 생기는 짧은 흔들림을 걸러내는 완충 장치로 이해하면 좋다.

## debounce와 throttle 구분하기

디바운스와 쓰로틀은 둘 다 이벤트를 줄이는 기법이라 자주 헷갈린다.

| 구분 | debounce | throttle |
|---|---|---|
| 실행 기준 | 마지막 이벤트 이후 조용해진 뒤 | 정해진 시간 간격마다 |
| 비유 | 말이 끝나면 대답하기 | 1초에 한 번만 듣기 |
| 잘 맞는 예 | 검색창 입력, 화면 전환 안정화 | 스크롤 위치 추적, 연속 드래그 처리 |
| 중간 이벤트 | 대부분 버림 | 주기마다 일부 처리 |

검색창처럼 "마지막 값"이 중요하면 debounce가 자연스럽다.

스크롤처럼 "계속 움직이는 중간 상태도 어느 정도 필요하지만 너무 자주 처리하면 부담"인 경우에는 throttle이 더 잘 맞는다.

## 너무 긴 debounce는 답답하다

디바운스 시간이 길수록 호출은 줄어든다. 하지만 사용자는 느리다고 느낄 수 있다.

```text
100ms:
빠르지만 호출이 많을 수 있음

300ms:
검색창에서 자주 쓰기 좋은 출발점

1000ms:
호출은 많이 줄지만 반응이 답답할 수 있음
```

정답 숫자는 없다. 기능의 성격에 따라 다르다.

검색 자동완성은 보통 짧게 잡고, 무거운 서버 요청은 조금 더 길게 잡을 수 있다. 사용자가 Enter나 검색 버튼을 누르는 명시적 액션이 있다면 debounce 없이 즉시 실행하는 편이 더 자연스러울 수도 있다.

## 테스트할 때는 시간을 직접 기다리지 않기

디바운스 로직은 시간에 의존한다. 그래서 테스트에서 실제로 `delay(300)`을 기다리면 테스트가 느려진다.

코루틴 테스트를 사용할 때는 가상 시간을 움직이는 방식이 더 좋다.

개념적으로는 이런 식이다.

```kotlin
@Test
fun debounceSearch() = runTest {
    viewModel.onQueryChanged("카")
    advanceTimeBy(100)

    viewModel.onQueryChanged("카페")
    advanceTimeBy(299)

    // 아직 검색 안 됨

    advanceTimeBy(1)

    // search("카페") 실행됨
}
```

핵심은 실제 300ms를 기다리는 게 아니라 테스트 스케줄러의 시간을 앞으로 당기는 것이다.

## 한 줄로 정리하기

디바운스는 그냥 delay가 아니다.

```text
delay는 실행을 미룬다.
debounce는 실행을 미루고,
그 사이 새 이벤트가 오면 이전 실행을 취소한다.
```

그래서 Android에서는 검색창 입력처럼 빠르게 바뀌는 이벤트를 마지막 값 하나로 줄이고 싶을 때 유용하다.

그리고 ProcessLifecycleOwner의 700ms 지연도 같은 관점으로 이해할 수 있다. Activity 전환 중 생기는 짧은 흔들림에 바로 반응하지 않고, 새 Activity가 올라오면 이전 백그라운드 판단을 취소한다.

정리하면 기준은 이렇다.

```text
마지막 이벤트만 중요하다
-> debounce

첫 이벤트를 바로 처리하고 잠깐 막고 싶다
-> click guard 또는 throttle

정해진 간격마다 계속 처리하고 싶다
-> throttle
```

이 기준이 잡히면 `delay(300)`을 볼 때도 한 번 더 생각하게 된다.

```text
이건 그냥 늦추는 코드인가?
아니면 이전 예약을 취소하고 마지막만 남기는 코드인가?
```

그 차이가 디바운스의 본질이다.

## 참고자료

- [Kotlinx.coroutines - Flow.debounce](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines.flow/debounce.html)
- [Kotlin Documentation - Asynchronous Flow](https://kotlinlang.org/docs/flow.html)
- [Android Developers - ProcessLifecycleOwner](https://developer.android.com/reference/androidx/lifecycle/ProcessLifecycleOwner)
