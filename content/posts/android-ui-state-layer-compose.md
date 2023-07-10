---
title: "안정적인 Compose 화면을 위한 UI State 설계"
date: "2024-01-01"
category: "Android"
group: "Compose State"
series: "Compose State"
hub: true
tags: ["android", "jetpack-compose", "architecture", "ui-state", "stateflow"]
description: "Android UI Layer 글에서 출발해, Jetpack Compose 화면을 안정적으로 유지하기 위한 UI State 모델링 원칙을 정리합니다."
---

![Android UI State Flow](/images/android-ui-state-flow-cover.png)

2023년 12월에 Manuel Vivo가 쓴 [Crash Course on the Android UI Layer | Part 1](https://manuelvivo.dev/crash-course-ui-layer-part-1)을 읽고 UI State의 역할을 다시 정리해 보게 되었다. 화면은 데이터를 보여주는 곳이고, UI State는 화면이 지금 무엇을 보여줘야 하는지 정의하는 약속에 가깝다.

이 글은 원문을 번역한 글은 아니다. 원문이 Android UI Layer의 역할을 차분히 정리했다면, 여기서는 Jetpack Compose로 화면을 만들 때 상태를 안정적으로 유지하는 방법을 내 관점으로 풀어보려고 한다. 특히 `ViewModel`, `StateFlow`, `collectAsStateWithLifecycle`, `data class`, `sealed interface` 사이에서 어떤 선택을 해야 화면이 예측 가능하게 동작하는지에 초점을 맞춘다.

## UI State는 화면의 결과물이 아니라 입력이다

Compose를 처음 쓰면 UI State를 화면에서 필요한 값들의 묶음 정도로 생각하기 쉽다. 하지만 조금 큰 화면을 만들기 시작하면 이 정의만으로는 부족하다.

UI State는 단순히 "현재 값"이 아니라, **화면이 렌더링 가능한 상태만 담도록 보장하는 계약**이어야 한다.

예를 들어 게시글 목록 화면이 있다고 해보자.

```kotlin
data class FeedUiState(
    val posts: List<Post> = emptyList(),
    val selectedPostId: String? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
)
```

처음에는 깔끔해 보인다. 하지만 이 모델은 말이 안 되는 상태도 허용한다.

- `posts`는 비어 있는데 `selectedPostId`가 존재한다.
- 로딩 중이면서 동시에 오래된 에러 메시지가 남아 있다.
- 선택된 게시글이 목록 안에 실제로 존재하는지 타입만 보고는 알 수 없다.

Compose는 상태가 바뀌면 빠르게 다시 그린다. 그래서 모델이 이상한 상태를 허용하면 화면도 그 상태를 그대로 보여준다. UI 버그는 종종 렌더링 코드보다 상태 모델에서 먼저 시작된다.

## 상태를 더 명확하게 모델링하기

서로 동시에 존재할 수 없는 상태라면 여러 `nullable` 필드로 표현하기보다 타입으로 분리하는 편이 낫다.

```kotlin
sealed interface FeedUiState {
    data object Loading : FeedUiState

    data class Empty(
        val message: String = "아직 보여줄 글이 없습니다."
    ) : FeedUiState

    data class Content(
        val posts: List<Post>,
        val selectedPost: Post,
        val isRefreshing: Boolean = false,
    ) : FeedUiState

    data class Error(
        val message: String
    ) : FeedUiState
}
```

이렇게 두면 `selectedPost`는 반드시 `posts`가 있는 상태에서만 존재한다. `Loading`과 `Content`가 동시에 존재하는 상태도 만들 수 없다. 화면의 제약을 타입으로 옮긴 셈이다.

반대로 모든 화면을 무조건 `sealed interface`로 만들 필요는 없다. 검색창 입력값, 토글 상태, 정렬 옵션처럼 서로 독립적으로 움직이는 값은 `data class`가 더 단순하다.

내 기준은 이렇다.

- 동시에 존재하면 안 되는 화면 상태가 있다면 `sealed interface`
- 한 화면 안에서 여러 값이 자연스럽게 함께 바뀐다면 `data class`
- 둘 다 필요하면 바깥은 `sealed interface`, 안쪽 값은 `data class`

## StateHolder는 이벤트를 상태로 번역하는 곳이다

Compose 화면은 가능하면 상태를 읽고 이벤트를 전달하는 데 집중해야 한다.

```kotlin
@Composable
fun FeedRoute(
    viewModel: FeedViewModel = viewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    FeedScreen(
        uiState = uiState,
        onRefresh = viewModel::refresh,
        onPostClick = viewModel::selectPost,
    )
}
```

`FeedScreen`은 `uiState`를 보고 그리기만 한다. 새로고침을 누르거나 글을 선택하는 이벤트는 `ViewModel`로 전달한다. 그리고 `ViewModel`은 그 이벤트를 처리해서 다음 UI State를 만든다.

```kotlin
class FeedViewModel(
    private val repository: FeedRepository,
) : ViewModel() {

    private val selectedPostId = MutableStateFlow<String?>(null)

    val uiState: StateFlow<FeedUiState> =
        combine(
            repository.posts,
            selectedPostId,
        ) { posts, selectedId ->
            when {
                posts.isEmpty() -> FeedUiState.Empty()
                else -> {
                    val selectedPost = posts.firstOrNull { it.id == selectedId } ?: posts.first()
                    FeedUiState.Content(
                        posts = posts,
                        selectedPost = selectedPost,
                    )
                }
            }
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = FeedUiState.Loading,
        )

    fun selectPost(post: Post) {
        selectedPostId.value = post.id
    }

    fun refresh() {
        viewModelScope.launch {
            repository.refresh()
        }
    }
}
```

여기서 중요한 점은 `ViewModel`이 "화면에 무엇을 그릴지"를 직접 명령하지 않는다는 것이다. 대신 화면이 그릴 수 있는 상태를 만든다. 이 차이가 작아 보이지만, 코드가 커질수록 꽤 큰 차이를 만든다.

## 여러 스트림보다 하나의 화면 상태

Compose에서는 `StateFlow` 여러 개를 각각 수집하는 방식도 가능하다.

```kotlin
val posts by viewModel.posts.collectAsStateWithLifecycle()
val selectedPost by viewModel.selectedPost.collectAsStateWithLifecycle()
val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
```

값들이 정말 독립적이라면 괜찮다. 하지만 서로 의존하는 값이라면 화면은 어색한 중간 상태를 마주할 수 있다. 목록은 새로 들어왔는데 선택된 글은 이전 목록의 글인 순간, 로딩은 끝났는데 에러는 남아 있는 순간 같은 경우다.

그래서 한 화면을 완성하는 데 함께 필요한 값들은 하나의 `UiState`로 묶는 편을 선호한다.

```kotlin
val uiState by viewModel.uiState.collectAsStateWithLifecycle()
```

이렇게 하면 화면은 하나의 스냅샷을 읽는다. 테스트도 쉬워진다. "이 이벤트 뒤에는 이런 UI State가 나온다"를 검증하면 되기 때문이다.

## UI State가 좋아지면 Preview도 좋아진다

UI State를 잘 모델링하면 Compose Preview가 훨씬 유용해진다.

```kotlin
@Preview
@Composable
private fun FeedScreenContentPreview() {
    FeedScreen(
        uiState = FeedUiState.Content(
            posts = samplePosts,
            selectedPost = samplePosts.first(),
        ),
        onRefresh = {},
        onPostClick = {},
    )
}

@Preview
@Composable
private fun FeedScreenEmptyPreview() {
    FeedScreen(
        uiState = FeedUiState.Empty(),
        onRefresh = {},
        onPostClick = {},
    )
}
```

상태가 명확하면 화면의 각 케이스를 손쉽게 고정해서 볼 수 있다. 반대로 UI State가 모호하면 Preview를 만들 때도 "이 값은 null이어도 되나?", "로딩과 데이터가 같이 있어도 되나?" 같은 질문을 반복하게 된다. 그 불편함은 대체로 모델이 보내는 신호다.

## 정리

Android UI Layer를 설계할 때 핵심은 복잡한 패턴 이름을 외우는 것이 아니다. 화면이 가능한 상태와 불가능한 상태를 구분하고, 가능한 상태만 타입으로 표현하는 것이다.

내가 이 글에서 가져가고 싶은 규칙은 세 가지다.

1. UI는 상태를 읽고 이벤트를 전달한다.
2. StateHolder는 이벤트와 데이터 스트림을 UI State로 번역한다.
3. UI State는 화면이 렌더링 가능한 상태만 표현해야 한다.

이 정도만 지켜도 Compose 화면은 훨씬 예측 가능해진다. 화면에서 매번 예외 상황을 임시로 처리하기보다, 모델이 이상한 상태를 애초에 만들지 못하게 하는 쪽이 오래 간다.

참고한 글과 문서:

- [Crash Course on the Android UI Layer | Part 1 - Manuel Vivo](https://manuelvivo.dev/crash-course-ui-layer-part-1)
- [UI layer - Android Developers](https://developer.android.com/topic/architecture/ui-layer)
