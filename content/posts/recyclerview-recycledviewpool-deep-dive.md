---
title: "RecycledViewPool 내부 흐름 깊게 보기"
date: "2024-05-21"
category: "Android"
group: "RecyclerView"
series: "RecyclerView"
tags: ["android", "recyclerview", "recycledviewpool", "viewholder", "viewtype", "ui-performance"]
description: "RecyclerView.RecycledViewPool이 ViewHolder를 viewType별로 어떻게 보관하고, 중첩 RecyclerView에서 shared pool이 왜 효과적인지 정리합니다."
---

`RecyclerViewPool`이라고 부르기도 하지만, AndroidX RecyclerView에서 실제 API 이름은 `RecyclerView.RecycledViewPool`이다.

이 글은 [[recyclerview-series|RecyclerView 시리즈]]의 두 번째 글이다. 앞 글인 [[recyclerview-mixed-horizontal-vertical-ui|가로/세로 혼합 RecyclerView UI 예제]]에서는 세로 RecyclerView 안에 가로 RecyclerView를 넣고, 각 child RecyclerView에 같은 pool을 연결했다.

```kotlin
val sharedPool = RecyclerView.RecycledViewPool()

row.cardsRecyclerView.apply {
    setRecycledViewPool(sharedPool)
}
```

처음 보면 이 한 줄은 단순해 보인다. 하지만 이 설정을 제대로 설명하려면 아래 질문에 답할 수 있어야 한다.

```text
RecycledViewPool은 무엇을 저장할까?
ViewHolder는 언제 pool에 들어갈까?
pool에서 꺼낸 ViewHolder는 bind가 다시 돌까?
viewType이 다르면 같은 pool을 공유해도 괜찮을까?
setMaxRecycledViews는 언제 조정해야 할까?
```

## 먼저 RecyclerView가 아끼려는 비용

RecyclerView가 재사용하려는 가장 큰 비용은 item view를 새로 만드는 비용이다.

```text
XML inflate 또는 View 생성
-> ViewHolder 생성
-> View 참조 연결
-> 데이터 bind
```

여기서 매번 처음부터 만드는 부분이 비싸다. 그래서 RecyclerView는 화면 밖으로 나간 ViewHolder를 버리지 않고, 나중에 같은 구조가 필요할 때 다시 쓰려고 한다.

단순화하면 흐름은 이렇다.

```text
필요한 position이 생김
-> 해당 position의 viewType 확인
-> 재사용 가능한 ViewHolder가 있는지 찾음
-> 있으면 꺼내서 bind
-> 없으면 onCreateViewHolder로 새로 만들고 bind
```

중요한 점은 재사용돼도 bind는 다시 돈다는 것이다.

```text
재사용
= ViewHolder 껍데기를 다시 쓴다.

bind
= 현재 item 데이터를 다시 입힌다.
```

그래서 RecycledViewPool은 "bind를 안 하게 만드는 장치"가 아니다. ViewHolder 생성과 inflate 빈도를 줄이는 장치에 가깝다.

## RecycledViewPool은 ViewHolder를 담는다

공식 API 기준으로 `RecycledViewPool`은 viewType별로 ViewHolder를 꺼내고 넣는 메서드를 제공한다.

```kotlin
getRecycledView(viewType)
putRecycledView(scrap)
getRecycledViewCount(viewType)
setMaxRecycledViews(viewType, max)
clear()
```

이 이름만 봐도 pool의 단위가 보인다.

```text
viewType 기준으로 꺼낸다.
viewType 기준으로 개수를 본다.
viewType 기준으로 최대 보관 개수를 정한다.
```

즉 pool은 이런 모양에 가깝다.

```text
RecycledViewPool
  viewType = 1
    - NormalCardViewHolder
    - NormalCardViewHolder

  viewType = 2
    - FeaturedCardViewHolder
```

같은 pool을 공유해도 viewType이 다르면 서로 다른 칸에 보관된다. 그래서 `VIEW_TYPE_NORMAL_CARD`와 `VIEW_TYPE_FEATURED_CARD`를 나누는 것은 단순한 코드 취향이 아니라 재사용 경계를 정하는 일이다.

## getItemViewType이 먼저다

예제의 `CardAdapter`는 카드 스타일에 따라 viewType을 나눈다.

```kotlin
override fun getItemViewType(position: Int): Int {
    return when (getItem(position).style) {
        CardStyle.NORMAL -> VIEW_TYPE_NORMAL_CARD
        CardStyle.FEATURED -> VIEW_TYPE_FEATURED_CARD
    }
}
```

RecyclerView는 특정 position의 ViewHolder가 필요할 때 adapter에게 viewType을 묻는다. 그 다음 같은 viewType으로 재사용 가능한 ViewHolder를 찾는다.

```text
position 0 필요
-> adapter.getItemViewType(0)
-> VIEW_TYPE_FEATURED_CARD
-> pool에서 FEATURED 타입 ViewHolder 검색
-> 있으면 재사용
-> 없으면 onCreateViewHolder(parent, VIEW_TYPE_FEATURED_CARD)
```

그래서 viewType 값은 반드시 안정적인 의미를 가져야 한다.

나쁜 예는 이런 식이다.

```text
Adapter A의 viewType 1 = 일반 카드
Adapter B의 viewType 1 = 전혀 다른 배너
두 adapter가 같은 pool을 공유함
```

같은 pool을 공유하면서 같은 viewType 숫자가 다른 ViewHolder 구조를 뜻하면 위험하다. pool은 viewType 숫자를 기준으로 ViewHolder를 꺼내기 때문이다.

안전한 기준은 이렇다.

```text
같은 pool을 공유한다면
같은 viewType 값은 같은 ViewHolder 구조를 뜻해야 한다.
```

## onCreateViewHolder와 onBindViewHolder를 분리해서 보기

RecycledViewPool을 이해할 때는 `onCreateViewHolder`와 `onBindViewHolder`를 꼭 분리해야 한다.

```kotlin
override fun onCreateViewHolder(
    parent: ViewGroup,
    viewType: Int,
): BaseCardViewHolder {
    return when (viewType) {
        VIEW_TYPE_NORMAL_CARD -> {
            CardViewHolder(CardItemView(parent.context))
        }
        VIEW_TYPE_FEATURED_CARD -> {
            FeaturedCardViewHolder(FeaturedCardItemView(parent.context))
        }
        else -> error("Unknown card viewType: $viewType")
    }
}

override fun onBindViewHolder(holder: BaseCardViewHolder, position: Int) {
    holder.bind(getItem(position), onCardClick)
}
```

`onCreateViewHolder`는 ViewHolder 껍데기를 만든다.

```text
CardItemView 생성
TextView 추가
layoutParams 설정
ViewHolder로 감싸기
```

`onBindViewHolder`는 그 껍데기에 현재 데이터를 입힌다.

```text
title 설정
subtitle 설정
click listener 설정
선택 상태 색상 설정
```

pool이 효과를 내는 지점은 주로 create 쪽이다.

```text
pool hit
-> onCreateViewHolder 생략 가능
-> onBindViewHolder는 필요

pool miss
-> onCreateViewHolder 필요
-> onBindViewHolder 필요
```

그래서 "pool을 공유했는데 bind가 계속 찍힌다"는 것은 이상한 일이 아니다. bind는 현재 position의 데이터를 반영하기 위해 계속 필요하다.

## 중첩 RecyclerView에서 shared pool이 중요한 이유

단일 RecyclerView에서는 보통 기본 pool만으로도 충분하다. 화면 밖으로 나간 item이 같은 RecyclerView 안에서 다시 필요해지기 때문이다.

하지만 가로/세로 혼합 UI에서는 child RecyclerView가 여러 개다.

```text
부모 세로 RecyclerView
  - 섹션 A: 가로 RecyclerView
  - 섹션 B: 가로 RecyclerView
  - 섹션 C: 가로 RecyclerView
```

아무 설정을 하지 않으면 각 child RecyclerView가 자기 pool을 따로 갖는다.

```text
섹션 A pool
섹션 B pool
섹션 C pool
```

카드 UI가 같은데 pool이 나뉘면 섹션 A에서 사라진 카드 ViewHolder를 섹션 B가 바로 쓰기 어렵다.

shared pool을 쓰면 구조가 바뀐다.

```text
섹션 A/B/C 가로 RecyclerView
-> 같은 RecycledViewPool 사용
-> 같은 viewType 카드 ViewHolder를 섹션 간 재사용
```

이 예제에서는 모든 child RecyclerView에 같은 `sharedPool`을 넣는다.

```kotlin
private class SectionViewHolder(
    private val row: SectionRowView,
    sharedPool: RecyclerView.RecycledViewPool,
    onCardClick: (DemoCard) -> Unit,
) : RecyclerView.ViewHolder(row) {

    init {
        row.cardsRecyclerView.apply {
            adapter = cardAdapter
            setRecycledViewPool(sharedPool)
        }
    }
}
```

이제 섹션이 여러 개여도 카드 ViewHolder 재사용 범위가 넓어진다.

## pool에 많이 담으면 항상 좋을까

그렇지는 않다.

pool에 ViewHolder를 더 많이 보관하면 새로 만드는 비용은 줄어들 수 있다. 대신 메모리에 더 많은 ViewHolder와 item view가 남는다.

```text
pool 크기를 키움
-> onCreateViewHolder 감소 가능
-> 메모리 사용량 증가
```

반대로 pool이 너무 작으면 화면 밖으로 나간 ViewHolder를 충분히 담지 못하고 버릴 수 있다.

```text
pool이 가득 참
-> 더 들어온 ViewHolder는 보관하지 못하고 버려짐
-> 나중에 다시 create 필요
```

API에는 viewType별 최대 보관 개수를 조정하는 메서드가 있다.

```kotlin
sharedPool.setMaxRecycledViews(
    VIEW_TYPE_NORMAL_CARD,
    12,
)

sharedPool.setMaxRecycledViews(
    VIEW_TYPE_FEATURED_CARD,
    3,
)
```

숫자는 화면 구조를 보고 정해야 한다.

```text
NORMAL 카드
= 대부분의 섹션에서 반복된다.
= 더 많이 보관할 가치가 있다.

FEATURED 카드
= 일부 섹션에만 나온다.
= 너무 크게 잡을 필요가 적다.
```

그리고 이 값은 "성능을 올리는 마법 숫자"가 아니다. `onCreateViewHolder`가 실제로 많이 발생하는지, ViewHolder가 무거운지, 스크롤 중 프레임 드랍이 있는지 보고 조정하는 값이다.

## getRecycledViewCount로 확인하기

pool을 설명할 때 감으로만 이야기하면 흐릿하다. 디버깅할 때는 viewType별 pool count를 찍어볼 수 있다.

```kotlin
val normalCount = sharedPool.getRecycledViewCount(VIEW_TYPE_NORMAL_CARD)
val featuredCount = sharedPool.getRecycledViewCount(VIEW_TYPE_FEATURED_CARD)
```

또는 adapter에서 create/bind 횟수를 로그로 비교해도 된다.

```kotlin
override fun onCreateViewHolder(
    parent: ViewGroup,
    viewType: Int,
): BaseCardViewHolder {
    Log.d("CardAdapter", "create viewType=$viewType")
    ...
}

override fun onBindViewHolder(holder: BaseCardViewHolder, position: Int) {
    Log.d("CardAdapter", "bind position=$position")
    holder.bind(getItem(position), onCardClick)
}
```

shared pool이 잘 맞으면 스크롤을 반복할수록 create 로그는 줄어들 수 있다. 하지만 bind 로그는 계속 나오는 것이 정상이다.

```text
create가 줄어든다
= ViewHolder 재사용이 늘었다.

bind는 계속 나온다
= 현재 item 데이터를 다시 입히고 있다.
```

이 차이를 구분해야 RecycledViewPool을 제대로 설명할 수 있다.

## clear는 언제 쓸까

`clear()`는 pool 안의 ViewHolder를 모두 버린다.

```kotlin
sharedPool.clear()
```

자주 호출할 일은 많지 않다. 하지만 pool을 오래 들고 있거나, 같은 pool을 여러 목록이 공유하는 구조라면 "이 pool 안의 ViewHolder가 아직도 현재 화면 구조와 호환되는가"를 생각해야 한다.

예를 들어 이런 상황에서는 pool을 비우거나, 아예 pool을 공유하지 않는 편이 안전할 수 있다.

```text
같은 viewType 숫자의 의미가 바뀌었다.
테마나 화면 모드가 바뀌면서 item view 구조가 크게 달라졌다.
화면 생명주기보다 긴 범위에 pool을 보관하고 있다.
```

대부분의 화면에서는 Activity, Fragment, 화면 scope 안에서 pool을 만들고, 그 화면 안의 child RecyclerView끼리만 공유하는 구조가 무난하다.

## RecycledViewPool이 해결하지 않는 것

RecycledViewPool은 중요한 도구지만 모든 목록 성능 문제를 해결하지는 않는다.

해결하는 쪽에 가까운 문제는 이것이다.

```text
같은 viewType의 ViewHolder를 반복 생성하는 비용
```

해결하지 않는 문제는 이것이다.

```text
bind 안에서 무거운 작업을 하는 문제
이미지 로딩이 늦는 문제
DiffUtil 없이 전체 갱신하는 문제
payload 없이 작은 변경도 전체 bind하는 문제
가로 스크롤 위치가 초기화되는 문제
```

그래서 앞 글의 혼합 RecyclerView 예제에서는 pool만 쓰지 않았다.

```text
RecycledViewPool
-> ViewHolder 생성 비용을 줄인다.

DiffUtil
-> 변경된 item만 찾는다.

payload
-> 선택 상태 같은 작은 변경만 부분 갱신한다.

scroll state 저장
-> 사용자가 보던 가로 위치를 유지한다.

initialPrefetchItemCount
-> 중첩 RecyclerView의 첫 item 준비를 앞당긴다.
```

목록 성능은 보통 한 가지 API보다 여러 작은 선택이 합쳐져 좋아진다.

## 설명할 때 잡아야 할 핵심

RecycledViewPool을 설명할 때는 아래 순서가 가장 안전하다.

```text
1. RecyclerView는 ViewHolder를 새로 만들지 않고 재사용하려고 한다.
2. pool은 ViewHolder를 viewType별로 보관한다.
3. pool에서 꺼낸 ViewHolder도 현재 item에 맞게 다시 bind해야 한다.
4. 중첩 RecyclerView에서는 child RecyclerView가 많으므로 shared pool이 효과적일 수 있다.
5. viewType 숫자의 의미가 같아야 안전하게 공유할 수 있다.
6. pool 크기를 키우면 create 비용은 줄 수 있지만 메모리 사용량은 늘 수 있다.
```

짧게 말하면 이렇다.

```text
RecycledViewPool은 bind를 없애는 도구가 아니라,
같은 viewType의 ViewHolder 생성 비용을 줄이기 위한 viewType별 저장소다.
```

이 한 문장을 잡고 있으면 shared pool, viewType, setMaxRecycledViews, payload의 역할을 섞지 않고 설명할 수 있다.

## 참고

- [RecyclerView.RecycledViewPool API reference](https://developer.android.com/reference/androidx/recyclerview/widget/RecyclerView.RecycledViewPool)
- [LinearLayoutManager API reference](https://developer.android.com/reference/androidx/recyclerview/widget/LinearLayoutManager)
