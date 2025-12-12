---
title: "SavedStateHandle 내부 구조 읽기"
date: "2025-12-12"
category: "Android"
group: "Android State"
series: "Android State"
tags: ["android", "savedstatehandle", "saved-state", "viewmodel", "process-death"]
description: "SavedStateHandle이 ViewModel 안에서 어떤 구조로 값을 들고 있고, SavedStateRegistry와 Bundle을 통해 어떻게 저장과 복원을 이어주는지 내부 흐름을 정리합니다."
---

![SavedStateHandle 내부 구조 읽기](/images/savedstatehandle-internals-cover.png)

`SavedStateHandle`은 이름만 보면 단순한 저장소처럼 보인다. `savedStateHandle["query"] = query`처럼 쓰면 값이 저장되고, ViewModel이 다시 만들어질 때 그 값을 다시 꺼낼 수 있다.

처음에는 이 정도로 이해해도 충분하다. 하지만 내부 구조를 조금 들여다보면 `SavedStateHandle`이 단독으로 모든 일을 하는 객체는 아니라는 점이 보인다. 실제로는 `ViewModel`, `SavedStateRegistry`, `SavedStateProvider`, Android의 `Bundle`이 서로 역할을 나눠서 작동한다.

이 글은 2025년 12월 12일 기준으로 안정 버전이었던 `androidx.lifecycle:lifecycle-viewmodel-savedstate:2.10.0`과 `androidx.savedstate:savedstate:1.4.0` 소스 기준으로 정리한 메모다.

## 먼저 한 문장으로 보기

`SavedStateHandle`을 한 문장으로 줄이면 이렇게 볼 수 있다.

```text
SavedStateHandle은 ViewModel에 붙어 있는 작은 key-value 저장 공간이고,
저장 시점에는 SavedStateProvider가 이 값을 Bundle로 바꿔 SavedStateRegistry에 맡긴다.
```

여기서 중요한 단어는 네 개다.

- `ViewModel`
- `SavedStateHandle`
- `SavedStateProvider`
- `SavedStateRegistry`

`SavedStateHandle`은 ViewModel 안에서 값을 읽고 쓰기 쉽게 해주는 API다. 하지만 프로세스 종료 뒤 복원까지 가능하게 만드는 쪽은 `SavedStateRegistry`와 `Bundle`이다.

흐름만 먼저 보면 이렇다.

```text
ViewModel
-> SavedStateHandle
-> SavedStateProvider
-> SavedStateRegistry
-> Bundle
```

복원될 때는 반대로 움직인다.

```text
Bundle
-> SavedStateRegistry
-> SavedStateHandlesProvider
-> SavedStateHandle
-> ViewModel
```

## 저장소라기보다 복원용 연결점이다

`SavedStateHandle`을 처음 쓸 때 가장 흔한 오해는 "여기에 넣으면 안전하게 오래 저장된다"는 생각이다. 하지만 이 객체는 영구 저장소가 아니다.

`SavedStateHandle`이 다루는 상태는 Android의 saved instance state 흐름 위에 있다. 그래서 사용자가 앱을 잠깐 떠났고, 시스템이 나중에 프로세스를 정리했지만 다시 같은 화면으로 돌아오는 경우에 도움을 준다.

반대로 사용자가 명시적으로 앱을 종료하거나, 최근 앱에서 태스크를 제거하거나, 데이터 자체를 오래 보관해야 하는 경우라면 `SavedStateHandle`이 아니라 DataStore, Room, 파일, 서버 같은 저장소가 필요하다.

그래서 `SavedStateHandle`에 넣기 좋은 값은 보통 이런 값이다.

- 검색어
- 선택한 탭
- 입력 중인 폼 값
- 상세 화면에 필요한 id
- 다시 데이터를 불러오기 위한 최소 key

반대로 큰 목록 데이터, 이미지, 서버 응답 전체, 오래 유지해야 하는 사용자 설정은 어울리지 않는다.

## 실제 내부는 Map에 가깝다

`SavedStateHandle`의 공개 API는 단순하다.

```kotlin
class SearchViewModel(
    private val savedStateHandle: SavedStateHandle,
) : ViewModel() {
    var query: String
        get() = savedStateHandle["query"] ?: ""
        set(value) {
            savedStateHandle["query"] = value
        }
}
```

겉으로 보면 `Map<String, Any?>`처럼 보인다. 실제 내부도 큰 방향은 비슷하다.

단순화하면 구조는 이렇게 볼 수 있다.

```text
SavedStateHandle
├── liveDatas
└── SavedStateHandleImpl
    ├── regular
    ├── providers
    ├── flows
    └── mutableFlows
```

각 필드의 역할은 조금씩 다르다.

| 영역 | 역할 |
| --- | --- |
| `regular` | `set`, `get`으로 다루는 기본 key-value 값 |
| `providers` | `setSavedStateProvider`로 등록한 지연 저장 provider |
| `flows` | `getStateFlow`로 만든 읽기용 `StateFlow` |
| `mutableFlows` | `getMutableStateFlow`로 만든 쓰기 가능한 `MutableStateFlow` |
| `liveDatas` | Android 전용 `getLiveData` 저장 공간 |

핵심은 `regular`다. 대부분의 값은 결국 `regular`라는 Map에 들어간다.

```text
key: "query"
value: "android"

key: "selectedTab"
value: "favorite"
```

`SavedStateHandle`의 `set`은 값을 `regular`에 넣고, 같은 key를 보고 있는 `LiveData`나 `StateFlow`가 있으면 함께 갱신한다.

```text
savedStateHandle["query"] = "android"
-> regular["query"] = "android"
-> query를 바라보는 LiveData 갱신
-> query를 바라보는 StateFlow 갱신
```

그래서 `SavedStateHandle`은 단순한 Map이면서 동시에 관찰 가능한 상태 API와 연결된 Map이라고 볼 수 있다.

## 저장 가능한 타입만 들어간다

Android에서 `SavedState`는 실제로 `Bundle`이다. `SavedStateHandle`에 아무 객체나 넣을 수 없는 이유가 여기에 있다.

저장할 수 있는 값은 `Bundle`에 들어갈 수 있는 타입이어야 한다. 예를 들면 `String`, primitive 타입, `Parcelable`, `Serializable`, `Bundle`, `ArrayList`, `SparseArray`, `Size`, `SizeF` 같은 값이다.

그래서 아래 코드는 자연스럽다.

```kotlin
savedStateHandle["query"] = "compose"
savedStateHandle["page"] = 1
savedStateHandle["isFavorite"] = true
```

하지만 임의의 repository 객체나 coroutine scope, callback, 큰 그래프 객체를 넣는 방식은 맞지 않는다.

```kotlin
savedStateHandle["repository"] = repository // 좋지 않음
savedStateHandle["callback"] = onClick      // 좋지 않음
```

저장 가능한 값이라는 말은 "프로세스 밖으로 나갔다가 다시 들어올 수 있는 형태"라는 뜻에 가깝다. ViewModel 안의 객체 참조를 그대로 붙잡아 두는 기능이 아니다.

## createSavedStateHandle은 어디서 값을 가져올까

ViewModel 생성자에 `SavedStateHandle`이 들어오는 과정도 중요하다.

요즘 AndroidX 컴포넌트에서는 `ComponentActivity`, `Fragment`, `NavBackStackEntry`가 `SavedStateHandle`을 만들 수 있는 환경을 자동으로 준비한다. 내부적으로는 `enableSavedStateHandles()`가 호출되고, `CreationExtras.createSavedStateHandle()`이 필요한 owner와 key를 꺼내서 handle을 만든다.

단순화하면 필요한 재료는 세 가지다.

```text
SavedStateRegistryOwner
ViewModelStoreOwner
VIEW_MODEL_KEY
```

여기서 `VIEW_MODEL_KEY`가 꽤 중요하다. 같은 화면 안에서도 ViewModel은 여러 개일 수 있다. `SavedStateHandle`은 ViewModel마다 따로 있어야 하므로, 복원 데이터도 ViewModel key 단위로 나뉜다.

흐름은 대략 이렇다.

```text
CreationExtras
-> SavedStateRegistryOwner 꺼냄
-> ViewModelStoreOwner 꺼냄
-> ViewModel key 꺼냄
-> SavedStateHandlesProvider에서 해당 key의 복원 데이터 소비
-> SavedStateHandle 생성
```

여기서 "소비"라는 표현이 중요하다. 복원된 값은 계속 복사해서 읽는 것이 아니라, 특정 key로 한 번 꺼내고 나면 내부 복원 묶음에서 제거된다.

## handle들을 모으는 provider가 따로 있다

`SavedStateHandle` 하나하나가 바로 `SavedStateRegistry`에 따로 등록될 것 같지만, 최신 구조에서는 중간에 `SavedStateHandlesProvider`가 있다.

이 provider는 하나의 owner와 ViewModelStore 조합에 연결된 여러 `SavedStateHandle`을 모아서 저장한다.

단순화하면 이런 구조다.

```text
SavedStateRegistry
└── "androidx.lifecycle.internal.SavedStateHandlesProvider"
    ├── ViewModelKey A -> SavedStateHandle A의 Bundle
    ├── ViewModelKey B -> SavedStateHandle B의 Bundle
    └── ViewModelKey C -> SavedStateHandle C의 Bundle
```

그리고 현재 살아 있는 handle 객체들은 `SavedStateHandlesVM`이라는 내부 ViewModel에 보관된다.

```text
SavedStateHandlesVM
└── handles: MutableMap<String, SavedStateHandle>
```

이 구조가 필요한 이유는 ViewModel 생명주기와 saved state 생명주기가 완전히 같지 않기 때문이다. ViewModel은 구성 변경에서는 살아남지만, 프로세스가 죽으면 사라진다. 반대로 saved state는 `Bundle` 형태로 시스템 저장 흐름에 올라갔다가 나중에 다시 들어온다.

`SavedStateHandlesProvider`는 이 둘 사이에서 현재 살아 있는 handle의 값을 저장 가능한 묶음으로 바꿔준다.

## 저장 시점에는 provider들이 한 번씩 호출된다

화면이 저장되어야 할 때 `SavedStateRegistry`는 등록된 provider들을 순회하면서 `saveState()`를 호출한다.

큰 흐름은 이렇다.

```text
SavedStateRegistry.performSave(outBundle)
-> 등록된 SavedStateProvider 순회
-> 각 provider.saveState()
-> 결과를 하나의 SavedState에 모음
-> outBundle에 저장
```

`SavedStateHandle` 쪽에서는 `SavedStateHandlesProvider.saveState()`가 호출된다.

이때 하는 일은 두 가지다.

1. 아직 ViewModel이 다시 만들어지지 않아 소비되지 않은 복원 데이터를 유지한다.
2. 현재 살아 있는 ViewModel들의 `SavedStateHandle` 값을 다시 저장한다.

이 두 번째 단계에서 각 handle의 `savedStateProvider()`가 호출된다.

단순화하면 이런 느낌이다.

```text
for each handle:
    handle.savedStateProvider().saveState()
```

handle 내부 provider는 저장 직전에 `mutableFlows`의 현재 값을 `regular`로 동기화한다. 또 `setSavedStateProvider`로 등록된 하위 provider가 있으면 그 결과도 `regular`에 넣는다.

그 다음 `regular` Map을 `SavedState`, Android에서는 `Bundle`, 로 바꿔 반환한다.

```text
MutableStateFlow 현재 값
-> regular에 반영

custom SavedStateProvider 결과
-> regular에 반영

regular
-> Bundle
```

이 흐름 때문에 `getMutableStateFlow()`로 값을 바꿔도 저장 시점에는 handle 값에 반영될 수 있다.

## 복원 시점에는 Bundle이 다시 Map이 된다

복원은 저장의 반대 방향이다.

Activity나 Fragment가 다시 만들어질 때 owner의 `SavedStateRegistry`가 먼저 이전 `Bundle`을 받는다. `SavedStateRegistry`는 그 안에서 자신이 관리하던 저장 묶음을 꺼내 `restoredState`로 들고 있는다.

그 다음 `SavedStateHandlesProvider`가 자기 key에 해당하는 묶음을 소비한다.

```text
SavedStateRegistry
-> "androidx.lifecycle.internal.SavedStateHandlesProvider" 묶음 소비
-> SavedStateHandlesProvider.restoredState에 보관
```

이후 ViewModel이 실제로 요청되면, provider는 ViewModel key에 해당하는 작은 `SavedState`만 다시 꺼낸다.

```text
ViewModel key: "SearchViewModel"
-> SearchViewModel에 해당하는 SavedState 꺼냄
-> SavedStateHandle.createHandle(restoredState, defaultArgs)
```

Android 구현에서는 `SavedState`가 `Bundle`이므로, 마지막에는 `Bundle`의 key-value 값이 다시 Map으로 바뀌어 `SavedStateHandleImpl.regular`의 초기값이 된다.

```text
Bundle
-> toMap()
-> SavedStateHandleImpl(initialState)
-> regular
```

여기서 복원된 값이 있으면 그 값이 기준이 된다. `defaultArgs`는 복원 데이터가 없을 때 초기값으로 쓰이는 쪽에 가깝다.

## LiveData와 MutableStateFlow는 같은 key에서 섞지 않는다

`SavedStateHandle`에는 `getLiveData`, `getStateFlow`, `getMutableStateFlow`가 있다. 이름은 비슷하지만 같은 key에 아무렇게나 섞어 쓰면 안 된다.

Android 구현에서는 같은 key에 대해 `getLiveData()`와 `getMutableStateFlow()`를 동시에 쓰지 못하게 막는다.

예를 들어 이런 식은 피해야 한다.

```kotlin
val liveData = savedStateHandle.getLiveData<String>("query")
val flow = savedStateHandle.getMutableStateFlow("query", "")
```

둘 다 같은 저장 값을 바라보는 API처럼 보이지만, 쓰기 가능한 관찰 객체가 둘이 되면 동기화 기준이 흐려진다. 그래서 내부 구현은 같은 key에 대해 LiveData와 MutableStateFlow를 상호 배타적으로 다룬다.

반면 `getStateFlow()`는 읽기용이다. 이미 `MutableStateFlow`가 있는 key라면 그 값을 읽기용 `StateFlow`로 감싸서 돌려줄 수 있다.

처음부터 Flow 중심으로 ViewModel을 구성한다면 보통은 이렇게 단순하게 가져가는 편이 좋다.

```kotlin
private val queryFlow = savedStateHandle.getMutableStateFlow("query", "")

fun onQueryChange(query: String) {
    queryFlow.value = query
}
```

또는 명령형으로 저장하고 읽기용 Flow만 노출할 수도 있다.

```kotlin
val query = savedStateHandle.getStateFlow("query", "")

fun onQueryChange(value: String) {
    savedStateHandle["query"] = value
}
```

중요한 것은 한 key에 대해 쓰기 경로를 하나로 유지하는 것이다.

## setSavedStateProvider는 지연 저장 장치다

`SavedStateHandle`에는 일반적인 `set` 말고 `setSavedStateProvider`도 있다.

이 API는 값을 바로 넣기보다, 저장 시점에 `SavedState`를 만들어주는 provider를 등록한다.

```kotlin
savedStateHandle.setSavedStateProvider("editor") {
    savedState {
        putString("draft", currentDraft)
    }
}
```

이 방식은 저장할 값이 항상 단순한 primitive 하나가 아닐 때 유용하다. 저장 시점에 현재 객체를 `SavedState`로 변환하고 싶을 때 provider를 붙여둘 수 있다.

내부적으로는 이 provider도 `providers` Map에 들어간다. 그리고 handle이 저장될 때 provider의 `saveState()` 결과가 `regular`에 합쳐진다.

```text
providers["editor"].saveState()
-> regular["editor"] = SavedState(...)
-> 전체 regular가 Bundle로 저장됨
```

최근 AndroidX에는 Kotlin serialization을 이용하는 `saved` delegate도 있다. 이 delegate 역시 큰 방향에서는 `SavedStateHandle`에 provider를 붙이고, 값이 필요해질 때 restore/init을 처리하는 층으로 볼 수 있다.

## 전체 흐름을 다시 연결하기

이제 저장과 복원을 한 번에 이어서 보면 구조가 조금 더 선명해진다.

```text
1. ViewModel 생성 요청
2. CreationExtras에서 owner와 ViewModel key 확인
3. SavedStateHandlesProvider가 복원 묶음에서 ViewModel key에 맞는 값 소비
4. SavedStateHandle 생성
5. ViewModel이 SavedStateHandle에 작은 UI 맥락 저장
6. 시스템 저장 시점에 SavedStateRegistry.performSave 호출
7. SavedStateHandlesProvider.saveState 호출
8. 각 SavedStateHandle이 regular/providers/flows 값을 Bundle로 변환
9. 다음 복원 때 다시 ViewModel key 기준으로 handle 생성
```

짧게 줄이면 이렇다.

```text
쓰기: ViewModel -> SavedStateHandle -> Map
저장: Map -> SavedStateProvider -> SavedStateRegistry -> Bundle
복원: Bundle -> SavedStateRegistry -> SavedStateHandle -> ViewModel
```

`SavedStateHandle`은 이 전체 흐름 중 ViewModel이 직접 만지는 문이다. 하지만 문 뒤에는 `SavedStateRegistry`와 `Bundle` 기반 저장 흐름이 있다.

## 그래서 무엇을 저장해야 할까

내부 구조를 보면 사용 기준도 조금 분명해진다.

`SavedStateHandle`에는 화면을 다시 만들기 위한 최소 맥락만 넣는 편이 좋다.

예를 들어 검색 화면이라면 검색 결과 목록 전체보다 검색어와 필터를 저장하는 쪽이 낫다.

```text
좋음
-> query
-> selectedTab
-> selectedItemId
-> filter

조심
-> response 전체
-> 큰 리스트
-> 이미지 데이터
-> repository 객체
```

이유는 단순하다. 내부적으로 마지막에는 `Bundle`로 가야 하기 때문이다. `Bundle`은 작은 상태를 복원하기 위한 통로이지, 앱 데이터 저장소가 아니다.

또 하나의 기준은 "다시 계산할 수 있는가"다.

서버에서 다시 가져올 수 있는 목록은 id나 query만 저장해도 된다. 사용자가 직접 입력했고 잃어버리면 불편한 값은 저장할 가치가 있다.

## 정리

`SavedStateHandle`은 겉으로는 ViewModel 안의 작은 key-value API다. 하지만 내부적으로는 여러 층이 맞물려 있다.

- 값 자체는 주로 `SavedStateHandleImpl.regular` Map에 들어간다.
- `LiveData`, `StateFlow`, `MutableStateFlow`는 같은 저장 값을 관찰하거나 갱신하는 입구다.
- 저장 시점에는 `SavedStateProvider`가 handle 값을 `SavedState`로 바꾼다.
- Android에서 `SavedState`는 `Bundle`이다.
- 여러 handle은 `SavedStateHandlesProvider`가 ViewModel key 단위로 모아 저장한다.
- 복원 시에는 `SavedStateRegistry`에서 owner key를 소비하고, 다시 ViewModel key별 handle을 만든다.

결국 `SavedStateHandle`을 잘 쓴다는 것은 많은 것을 저장한다는 뜻이 아니다. ViewModel이 다시 만들어졌을 때 사용자가 하던 일을 이어갈 수 있을 만큼의 작은 단서를 남기는 일에 가깝다.

## 참고한 코드와 문서

- [Saved State module for ViewModel](https://developer.android.com/topic/libraries/architecture/viewmodel/viewmodel-savedstate)
- [Lifecycle 2.10.0 release notes](https://developer.android.com/jetpack/androidx/releases/lifecycle#2.10.0)
- [SavedState 1.4.0 release notes](https://developer.android.com/jetpack/androidx/releases/savedstate#1.4.0)
- [lifecycle-viewmodel-savedstate-android 2.10.0 sources](https://dl.google.com/dl/android/maven2/androidx/lifecycle/lifecycle-viewmodel-savedstate-android/2.10.0/lifecycle-viewmodel-savedstate-android-2.10.0-sources.jar)
- [savedstate-android 1.4.0 sources](https://dl.google.com/dl/android/maven2/androidx/savedstate/savedstate-android/1.4.0/savedstate-android-1.4.0-sources.jar)
