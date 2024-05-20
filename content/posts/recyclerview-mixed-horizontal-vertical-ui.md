---
title: "가로/세로 혼합 RecyclerView UI 예제로 최적화 포인트 정리하기"
date: "2024-05-20"
category: "Android"
group: "Android UI"
series: "Android UI"
tags: ["android", "recyclerview", "diffutil", "listadapter", "viewtype", "ui-performance"]
description: "세로 RecyclerView 안에 가로 RecyclerView를 넣는 혼합형 UI 예제를 보면서 RecycledViewPool, viewType, prefetch, DiffUtil, payload, 스크롤 상태 저장을 정리합니다."
---

![가로/세로 혼합 RecyclerView UI](/images/recyclerview-mixed-ui-cover.png)

Android 앱에서 홈 화면이나 추천 화면을 만들다 보면 이런 구성을 자주 만나게 된다.

```text
세로로 내려가는 섹션 목록
-> 각 섹션 안에는 가로로 넘기는 카드 목록
```

쇼핑 앱의 "최근 본 상품", 금융 앱의 "추천 서비스", 미디어 앱의 "이번 주 인기 콘텐츠" 같은 화면이 보통 이런 구조다.

UI만 보면 단순하다. 그런데 구현할 때는 생각보다 조심할 부분이 많다. 세로 RecyclerView의 item 안에 다시 가로 RecyclerView가 들어가면, 스크롤 방향이 두 개가 되고 ViewHolder 재사용도 두 층에서 일어난다.

이 글은 작은 예제 프로젝트를 기준으로, 가로/세로 혼합 RecyclerView를 만들 때 어떤 지점을 봐야 하는지 정리한 메모다. 작성 시점은 2024년 5월이고, 핵심은 특정 버전보다 RecyclerView를 다루는 기본 구조에 있다.

## 예제 화면 구조

예제 화면은 크게 보면 이렇다.

```text
Vertical RecyclerView
  - Section 1
    - Horizontal RecyclerView
      - Card 1
      - Card 2
      - Card 3

  - Section 2
    - Horizontal RecyclerView
      - Card 1
      - Card 2
      - Card 3
```

데이터 모델도 단순하게 나눌 수 있다.

```kotlin
private data class DemoSection(
    val id: Long,
    val title: String,
    val cards: List<DemoCard>,
)

private data class DemoCard(
    val id: Long,
    val title: String,
    val subtitle: String,
    val style: CardStyle = CardStyle.NORMAL,
    val isSelected: Boolean = false,
)

private enum class CardStyle {
    NORMAL,
    FEATURED,
}
```

`DemoSection`은 세로 목록의 한 줄이고, `DemoCard`는 각 섹션 안에 들어가는 가로 카드다.

화면에서 사용자는 세로로 섹션을 넘기고, 각 섹션 안에서는 가로로 카드를 넘긴다. 카드를 누르면 선택 상태가 바뀐다.

이 작은 기능만으로도 아래 요소를 같이 볼 수 있다.

```text
ViewHolder 재사용
다른 카드 UI viewType 분리
가로 item prefetch
DiffUtil 기반 부분 갱신
payload bind
가로 스크롤 위치 복원
```

![혼합 RecyclerView 스크롤 흐름](/images/recyclerview-mixed-scroll-flow-handdrawn.png)

## 왜 그냥 만들면 아쉬울까

가장 단순하게 구현하면 세로 RecyclerView의 ViewHolder가 bind될 때마다 내부 가로 RecyclerView에 adapter와 layoutManager를 매번 새로 붙일 수 있다.

처음에는 동작한다. 하지만 섹션이 많아지고 카드 UI가 조금만 복잡해져도 문제가 보이기 쉽다.

```text
세로 스크롤 중 가로 RecyclerView가 계속 새로 준비된다.
같은 카드 ViewHolder를 섹션마다 따로 만든다.
카드 하나의 선택 상태만 바뀌어도 전체 bind가 다시 돈다.
일반 카드와 강조 카드가 같은 ViewHolder로 섞인다.
아래로 갔다가 돌아오면 가로 스크롤 위치가 처음으로 돌아간다.
```

혼합 RecyclerView에서는 "목록을 보여준다"보다 "재활용되는 시점에 무엇을 유지하고 무엇을 다시 만들지"가 더 중요해진다.

## 코드 흐름 먼저 따라가기

이 예제를 설명할 때는 최적화 키워드를 먼저 외우는 것보다, 코드가 어떤 순서로 연결되는지 따라가는 편이 낫다.

전체 흐름은 이렇게 볼 수 있다.

```text
MainActivity
-> shared RecycledViewPool 생성
-> SectionAdapter 생성
-> 부모 세로 RecyclerView에 SectionAdapter 연결
-> SectionAdapter가 SectionViewHolder 생성
-> SectionViewHolder 안에서 자식 가로 RecyclerView 구성
-> CardAdapter가 NORMAL / FEATURED 카드 ViewHolder 생성
-> 카드 클릭 시 새 리스트를 만들어 submitList
-> DiffUtil이 바뀐 카드와 payload를 계산
-> 필요한 ViewHolder만 bind
```

`MainActivity`의 시작점은 단순하다.

```kotlin
val sharedPool = RecyclerView.RecycledViewPool()

sectionAdapter = SectionAdapter(
    sharedPool = sharedPool,
    onCardClick = ::toggleSelected,
)

val recyclerView = RecyclerView(this).apply {
    layoutManager = LinearLayoutManager(this@MainActivity)
    adapter = sectionAdapter
    setHasFixedSize(true)
}

setContentView(recyclerView)
sectionAdapter.submitList(sections)
```

여기서 부모 RecyclerView는 세로 섹션만 책임진다. 실제 가로 카드 목록은 부모 item 안에 들어 있는 `SectionViewHolder`가 만든다.

```kotlin
private class SectionViewHolder(
    private val row: SectionRowView,
    sharedPool: RecyclerView.RecycledViewPool,
    onCardClick: (DemoCard) -> Unit,
) : RecyclerView.ViewHolder(row) {

    private val horizontalLayoutManager = LinearLayoutManager(
        row.context,
        RecyclerView.HORIZONTAL,
        false,
    ).apply {
        initialPrefetchItemCount = 4
    }

    private val cardAdapter = CardAdapter(onCardClick)

    init {
        row.cardsRecyclerView.apply {
            layoutManager = horizontalLayoutManager
            adapter = cardAdapter
            setRecycledViewPool(sharedPool)
            setHasFixedSize(true)
            itemAnimator = null
        }
    }
}
```

이 구조에서 중요한 점은 adapter가 두 층이라는 것이다.

```text
SectionAdapter
= 세로 섹션을 관리한다.

CardAdapter
= 각 섹션 안의 가로 카드를 관리한다.
```

즉 부모 RecyclerView가 재사용하는 것은 "섹션 row"이고, 자식 RecyclerView가 재사용하는 것은 "카드 item"이다. 가로/세로 혼합 UI를 설명할 때는 이 두 재사용 단위를 구분해야 한다.

`setHasFixedSize(true)`도 같은 맥락에서 보면 된다.

```kotlin
val recyclerView = RecyclerView(this).apply {
    setHasFixedSize(true)
}

row.cardsRecyclerView.apply {
    setHasFixedSize(true)
}
```

이 설정은 "모든 item 크기가 무조건 같다"는 뜻이라기보다, adapter 내용이 바뀌어도 RecyclerView 자체의 크기가 바뀌지 않는다는 힌트에 가깝다.

이 예제에서는 부모 RecyclerView가 화면 전체를 차지하고, 자식 가로 RecyclerView도 `dp(128)` 높이로 고정되어 있다. 카드 선택 상태가 바뀌거나 카드 내용이 갱신되어도 RecyclerView 자체의 width/height가 바뀌는 구조가 아니다.

```text
선택 상태 변경
-> 카드 색상 변경
-> RecyclerView 자체 크기는 그대로
```

이런 경우에는 RecyclerView가 불필요한 크기 재계산을 덜 하도록 힌트를 줄 수 있다. 반대로 item 내용에 따라 RecyclerView 자체 높이가 달라지는 구조라면 신중해야 한다.

또 하나 생각할 질문은 "왜 하나의 세로 RecyclerView에 여러 viewType을 넣지 않고, 자식 RecyclerView를 중첩했나"이다.

만약 모든 item이 세로로만 쌓인다면 `ConcatAdapter`나 단일 adapter의 여러 viewType으로 충분할 수 있다. 하지만 이 화면은 각 섹션 안에서 독립적인 가로 스크롤이 필요하다.

```text
세로 스크롤
= 섹션 사이를 이동한다.

가로 스크롤
= 한 섹션 안의 카드들을 이동한다.
```

스크롤 축이 다르기 때문에, 섹션 row 안에 별도의 가로 RecyclerView를 두는 구조가 자연스럽다. 대신 중첩 구조가 된 만큼 pool 공유, prefetch, scroll state 저장 같은 관리 포인트가 생긴다.

이제 아래 포인트들을 하나씩 보면 된다.

## 1. RecycledViewPool 공유하기

먼저 볼 부분은 `RecycledViewPool`이다.

예제에서는 `Activity`에서 pool을 하나 만들고, 모든 섹션의 가로 RecyclerView가 이 pool을 공유하게 한다.

```kotlin
val sharedPool = RecyclerView.RecycledViewPool()

sectionAdapter = SectionAdapter(
    sharedPool = sharedPool,
    onCardClick = ::toggleSelected,
)
```

그리고 `SectionViewHolder` 안에서 자식 RecyclerView에 같은 pool을 연결한다.

```kotlin
row.cardsRecyclerView.apply {
    layoutManager = horizontalLayoutManager
    adapter = cardAdapter
    setRecycledViewPool(sharedPool)
    setHasFixedSize(true)
    itemAnimator = null
}
```

이 구조의 의미는 단순하다.

```text
여러 섹션의 가로 카드 UI가 같은 모양이라면
섹션마다 ViewHolder 저장소를 따로 쓰지 말고
같은 pool에서 재사용하게 한다.
```

예를 들어 "추천 상품" 섹션의 카드와 "최근 본 상품" 섹션의 카드가 같은 item view를 쓴다면, 이전 섹션에서 벗어난 카드 ViewHolder를 다음 섹션에서 재사용할 수 있다.

물론 모든 상황에서 무조건 pool을 공유해야 하는 것은 아니다. 가로 목록마다 item view type이 완전히 다르거나, 섹션마다 카드 크기와 구성이 크게 다르면 효과가 줄어든다.

하지만 같은 형태의 카드가 여러 섹션에 반복되는 홈 화면이라면 먼저 검토할 만하다.

여기서 조금 더 안쪽을 보면, RecyclerView는 사용이 끝난 ViewHolder를 pool에 넣어두었다가 같은 viewType이 필요할 때 다시 꺼내 쓴다.

```text
화면 밖으로 나간 카드 ViewHolder
-> RecycledViewPool에 들어감
-> 같은 viewType 카드가 필요할 때 다시 꺼냄
-> onCreateViewHolder 비용을 줄임
-> onBindViewHolder로 새 데이터만 입힘
```

기본적으로 RecyclerView마다 자기 pool을 갖는다. 가로 RecyclerView가 섹션마다 하나씩 있다면, 아무 설정을 하지 않았을 때는 각 섹션이 자기 pool 안에서만 ViewHolder를 재사용하기 쉽다.

```text
섹션 A의 가로 RecyclerView pool
섹션 B의 가로 RecyclerView pool
섹션 C의 가로 RecyclerView pool
```

이 예제처럼 카드 UI가 반복된다면 pool을 하나로 묶어 재사용 범위를 넓힌다.

```text
섹션 A/B/C의 카드 ViewHolder
-> sharedPool 하나에서 viewType별로 재사용
```

다만 pool 공유가 모든 비용을 없애지는 않는다. ViewHolder를 새로 만드는 비용은 줄일 수 있지만, 화면에 맞는 데이터는 여전히 bind해야 한다. 그래서 pool 공유는 DiffUtil, payload, prefetch와 함께 봐야 한다.

코드를 설명할 때는 이런 질문에 답할 수 있으면 좋다.

```text
Q. RecycledViewPool을 공유하면 무엇이 줄어드는가?
A. 같은 viewType의 ViewHolder를 섹션 간에 재사용할 수 있어 onCreateViewHolder 빈도를 줄인다.

Q. 그래도 onBindViewHolder는 왜 계속 필요한가?
A. ViewHolder 껍데기는 재사용해도, 그 안에 들어갈 데이터는 현재 position의 item으로 다시 입혀야 하기 때문이다.
```

## 2. 다른 카드 UI는 viewType으로 분리하기

예제에는 일반 카드 외에 강조 카드 UI가 하나 섞여 있다. 추천 서비스 섹션의 첫 번째 카드를 더 넓고 진한 배경의 `FEATURED` 카드로 보여주는 식이다.

데이터에는 카드의 모양을 나타내는 값을 둔다.

```kotlin
private data class DemoCard(
    val id: Long,
    val title: String,
    val subtitle: String,
    val style: CardStyle = CardStyle.NORMAL,
    val isSelected: Boolean = false,
)

private enum class CardStyle {
    NORMAL,
    FEATURED,
}
```

그리고 adapter에서는 `style`에 따라 viewType을 나눈다.

```kotlin
private const val VIEW_TYPE_NORMAL_CARD = 1
private const val VIEW_TYPE_FEATURED_CARD = 2

override fun getItemViewType(position: Int): Int {
    return when (getItem(position).style) {
        CardStyle.NORMAL -> VIEW_TYPE_NORMAL_CARD
        CardStyle.FEATURED -> VIEW_TYPE_FEATURED_CARD
    }
}
```

ViewHolder 생성도 viewType 기준으로 갈라진다.

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
```

이렇게 분리하는 이유는 ViewHolder 재사용이 viewType 단위로 일어나기 때문이다.

```text
NORMAL 카드
= 일반 카드 ViewHolder끼리 재사용

FEATURED 카드
= 강조 카드 ViewHolder끼리 재사용
```

같은 `RecycledViewPool`을 공유하더라도 pool 안에서는 viewType별로 ViewHolder가 따로 관리된다. 그래서 여러 child RecyclerView가 같은 pool을 공유하는 화면에서는 viewType 숫자의 의미를 일관되게 맞춰야 한다.

예를 들어 어떤 가로 목록에서는 `2`가 강조 카드인데, 다른 가로 목록에서는 완전히 다른 배너 UI를 뜻하게 만들면 재사용 흐름을 이해하기 어려워진다. 같은 pool을 공유한다면 같은 viewType은 같은 ViewHolder 구조를 의미하도록 맞추는 편이 안전하다.

여기서 `BaseCardViewHolder`를 둔 이유도 자연스럽다. 일반 카드와 강조 카드는 view는 다르지만, adapter 입장에서는 둘 다 "카드를 bind하고 선택 상태를 반영할 수 있는 ViewHolder"다.

```kotlin
private abstract class BaseCardViewHolder(
    itemView: View,
) : RecyclerView.ViewHolder(itemView) {
    abstract fun bind(card: DemoCard, onCardClick: (DemoCard) -> Unit)
    abstract fun bindSelection(isSelected: Boolean)
}
```

이렇게 공통 계약을 잡아두면 payload 부분 갱신도 일반 카드와 강조 카드에 같은 방식으로 적용할 수 있다.

여기서 자주 놓치는 부분은 viewType이 "디자인 이름"이 아니라 "재사용 가능한 ViewHolder 구조의 구분값"이라는 점이다.

일반 카드와 강조 카드는 폭, 배경, 뷰 구성, badge 유무가 다르다. 이런 item을 같은 ViewHolder로 처리하려고 하면 bind 안에 조건문이 늘어난다.

```text
if featured면 badge 보이기
else badge 숨기기

if featured면 width 바꾸기
else width 되돌리기

if featured면 색 바꾸기
else 색 되돌리기
```

이런 방식은 재사용 버그를 만들기 쉽다. 이전에 강조 카드였던 ViewHolder가 일반 카드로 재사용될 때, 숨겨야 할 뷰나 되돌려야 할 layout 값이 남을 수 있기 때문이다.

그래서 구조가 다른 item은 viewType과 ViewHolder를 분리한다.

```text
모양이 조금 다른 정도
-> 같은 ViewHolder에서 상태를 확실히 초기화해도 된다.

뷰 구조나 크기가 다름
-> viewType을 분리하는 편이 안전하다.
```

이 예제에서 `style`을 payload 비교에 넣은 이유도 여기에 있다.

```kotlin
oldItem.style == newItem.style
```

선택 상태만 바뀐 경우에는 payload로 색만 바꾸면 된다. 하지만 `NORMAL` 카드가 `FEATURED` 카드로 바뀌는 것은 단순한 색 변경이 아니다. ViewHolder 타입 자체가 달라져야 한다. 그래서 `style`이 바뀌면 payload 부분 갱신이 아니라 전체 변경으로 처리되게 둔다.

설명할 때는 이렇게 정리할 수 있다.

```text
Q. viewType은 언제 나누는가?
A. 같은 bind 로직으로 안전하게 되돌릴 수 없는 구조 차이가 있을 때 나눈다.

Q. sharedPool을 쓰면 viewType은 왜 더 중요해지는가?
A. pool이 viewType별로 ViewHolder를 보관하므로, 같은 viewType 값은 같은 ViewHolder 구조를 뜻해야 하기 때문이다.
```

## 3. initialPrefetchItemCount로 다음 카드를 미리 준비하기

중첩 RecyclerView에서는 세로 스크롤을 하다가 새 섹션이 화면에 들어오는 순간, 그 섹션 안의 가로 카드들도 같이 준비되어야 한다.

이때 `LinearLayoutManager`의 `initialPrefetchItemCount`를 설정할 수 있다.

```kotlin
private val horizontalLayoutManager = LinearLayoutManager(
    row.context,
    RecyclerView.HORIZONTAL,
    false,
).apply {
    initialPrefetchItemCount = 4
}
```

뜻은 이렇다.

```text
부모 RecyclerView가 다음 섹션을 화면에 가져올 때
자식 가로 RecyclerView의 앞쪽 item 몇 개도 미리 준비한다.
```

예제에서는 `4`로 두었다. 숫자는 정답이 아니다. 화면에 동시에 보이는 카드 개수, 카드 bind 비용, 이미지 로딩 여부에 따라 달라진다.

중요한 건 "많이 미리 만들수록 항상 좋다"가 아니라는 점이다. 너무 크게 잡으면 스크롤 전에 할 일이 늘어난다. 보통은 한 화면에 보이는 카드 개수 근처에서 시작해서 실제 화면을 보며 조정하는 편이 낫다.

내부 원리로 보면 prefetch는 "나중에 필요할 가능성이 높은 ViewHolder 준비 작업을 스크롤 중 빈 시간에 앞당겨 하는 것"에 가깝다.

혼합 구조에서는 부모 세로 RecyclerView가 다음 row를 화면에 붙이려고 할 때, 자식 가로 RecyclerView의 첫 카드들도 곧 필요해진다.

```text
부모가 다음 섹션 row를 준비한다.
-> 그 row 안에는 가로 RecyclerView가 있다.
-> 가로 RecyclerView의 앞쪽 카드들도 곧 보여야 한다.
-> initialPrefetchItemCount만큼 미리 create/bind 후보가 된다.
```

이 설정이 특히 의미 있는 경우는 카드 bind가 가볍지 않을 때다. 카드에 이미지, 가격 포맷, 상태 뱃지, 접근성 텍스트 같은 준비 작업이 붙으면 첫 진입 순간에 체감이 생길 수 있다.

하지만 prefetch는 만능이 아니다.

```text
이미지 네트워크 로딩 자체를 해결하지 않는다.
너무 큰 값은 오히려 미리 할 일을 늘린다.
실제 효과는 item 크기, 화면 밀도, bind 비용에 따라 달라진다.
```

그래서 숫자를 설명할 때는 "4가 정답"이 아니라 "화면에 보이는 카드 수와 bind 비용을 기준으로 조정하는 값"이라고 말하는 편이 정확하다.

```text
Q. initialPrefetchItemCount는 왜 필요한가?
A. 부모 세로 스크롤 중 자식 가로 목록의 앞쪽 item을 미리 준비해 새 row 진입 시 버벅임을 줄이기 위해서다.

Q. 값을 크게 잡으면 항상 좋은가?
A. 아니다. 미리 bind할 item이 늘어나면 현재 스크롤 프레임에서 해야 할 일도 늘 수 있다.
```

## 4. ListAdapter와 DiffUtil로 변경된 item만 갱신하기

카드를 누르면 선택 상태만 바뀐다.

이때 전체 목록을 `notifyDataSetChanged()`로 다시 그리면 바뀌지 않은 카드까지 모두 bind될 수 있다. 예제는 `ListAdapter`와 `DiffUtil.ItemCallback`을 사용한다.

```kotlin
private class CardAdapter(
    private val onCardClick: (DemoCard) -> Unit,
) : ListAdapter<DemoCard, BaseCardViewHolder>(CardDiffCallback) {

    init {
        setHasStableIds(true)
        stateRestorationPolicy = StateRestorationPolicy.PREVENT_WHEN_EMPTY
    }

    override fun getItemId(position: Int): Long = getItem(position).id
}
```

`DiffUtil`은 이전 리스트와 새 리스트를 비교해서 어떤 item이 바뀌었는지 계산한다.

```kotlin
private object CardDiffCallback : DiffUtil.ItemCallback<DemoCard>() {
    override fun areItemsTheSame(oldItem: DemoCard, newItem: DemoCard): Boolean {
        return oldItem.id == newItem.id
    }

    override fun areContentsTheSame(oldItem: DemoCard, newItem: DemoCard): Boolean {
        return oldItem == newItem
    }
}
```

여기서 기준은 두 가지다.

```text
areItemsTheSame
= 같은 카드인지 확인한다.

areContentsTheSame
= 같은 카드의 내용이 바뀌었는지 확인한다.
```

샘플에서는 `id`가 같으면 같은 카드로 보고, 전체 data class 값이 같으면 내용도 같다고 본다.

상태 변경도 불변 리스트를 새로 만들어 전달한다.

```kotlin
private fun toggleSelected(clicked: DemoCard) {
    sections = sections.map { section ->
        section.copy(
            cards = section.cards.map { card ->
                if (card.id == clicked.id) {
                    card.copy(isSelected = !card.isSelected)
                } else {
                    card
                }
            },
        )
    }
    sectionAdapter.submitList(sections)
}
```

이렇게 하면 "어떤 값이 바뀌었는지"를 RecyclerView 쪽에서 추적하기 쉬워진다.

여기서 중요한 전제는 "새 리스트를 만들어 submitList에 넘긴다"는 점이다.

```kotlin
sections = sections.map { section ->
    section.copy(
        cards = section.cards.map { card ->
            if (card.id == clicked.id) {
                card.copy(isSelected = !card.isSelected)
            } else {
                card
            }
        },
    )
}
sectionAdapter.submitList(sections)
```

기존 리스트나 기존 item 객체를 제자리에서 바꿔버리면 DiffUtil이 이전 상태와 새 상태를 비교하기 어려워진다. 이 예제는 `data class`와 `copy`를 사용해서 바뀐 값이 새 객체로 드러나게 만든다.

DiffUtil의 두 질문도 분리해서 이해해야 한다.

```text
areItemsTheSame
= 같은 대상을 가리키는가?
= 보통 id로 판단한다.

areContentsTheSame
= 같은 대상의 표시 내용이 같은가?
= title, subtitle, style, isSelected 같은 화면 값으로 판단한다.
```

`areItemsTheSame`을 position으로 처리하면 정렬, 삽입, 삭제가 생겼을 때 같은 item을 잘못 판단할 수 있다. 이 예제처럼 `DemoCard.id`를 쓰면 item 위치가 바뀌어도 같은 카드인지 판단할 수 있다.

`ListAdapter`는 내부적으로 리스트 변경을 diff로 계산하고, adapter에는 필요한 변경 이벤트만 전달한다. 그래서 전체를 다시 그리는 `notifyDataSetChanged()`보다 변경 범위가 좁아진다.

```text
Q. notifyDataSetChanged 대신 DiffUtil을 쓰는 이유는?
A. 전체 갱신이 아니라 어떤 item이 추가, 삭제, 변경됐는지 계산해 필요한 범위만 갱신하기 위해서다.

Q. DiffUtil에서 id 비교와 내용 비교를 왜 나누는가?
A. 같은 item인지 판단하는 기준과, 같은 item의 표시 내용이 바뀌었는지 판단하는 기준이 다르기 때문이다.
```

## 5. payload로 선택 상태만 부분 갱신하기

DiffUtil을 쓰더라도 기본 bind는 item 전체를 다시 그리는 방향으로 흐르기 쉽다.

하지만 카드 선택 상태만 바뀐 경우에는 제목과 부제까지 다시 넣을 필요가 없다. 배경색과 텍스트 색만 바꾸면 된다.

이때 `getChangePayload`를 사용할 수 있다.

```kotlin
override fun getChangePayload(oldItem: DemoCard, newItem: DemoCard): Any? {
    val onlySelectionChanged = oldItem.title == newItem.title &&
        oldItem.subtitle == newItem.subtitle &&
        oldItem.style == newItem.style &&
        oldItem.isSelected != newItem.isSelected

    return if (onlySelectionChanged) SelectionChangedPayload else null
}
```

그리고 adapter에서 payload가 들어온 경우 부분 bind만 수행한다.

```kotlin
override fun onBindViewHolder(
    holder: BaseCardViewHolder,
    position: Int,
    payloads: MutableList<Any>,
) {
    if (SelectionChangedPayload in payloads) {
        holder.bindSelection(getItem(position).isSelected)
    } else {
        super.onBindViewHolder(holder, position, payloads)
    }
}
```

ViewHolder 쪽도 전체 bind와 선택 bind를 나눈다.

```kotlin
fun bind(card: DemoCard, onCardClick: (DemoCard) -> Unit) {
    cardView.titleView.text = card.title
    cardView.subtitleView.text = card.subtitle
    cardView.setOnClickListener { onCardClick(card) }
    bindSelection(card.isSelected)
}

fun bindSelection(isSelected: Boolean) {
    cardView.isSelected = isSelected
    cardView.titleView.setTextColor(
        if (isSelected) Color.WHITE else Color.rgb(29, 37, 50)
    )
    cardView.subtitleView.setTextColor(
        if (isSelected) Color.rgb(225, 235, 255) else Color.rgb(100, 116, 139)
    )
}
```

작은 화면에서는 차이가 크게 안 느껴질 수 있다. 하지만 item bind에서 이미지 요청, 텍스트 가공, 복잡한 view 상태 계산이 들어가면 payload의 효과가 커진다.

요점은 이렇다.

```text
내용 전체가 바뀐 것과
선택 표시만 바뀐 것을
같은 비용으로 처리하지 않는다.
```

payload 흐름은 DiffUtil의 `areItemsTheSame`이 true이고, `areContentsTheSame`이 false일 때 의미가 생긴다. 즉 "같은 카드인데 내용 일부가 바뀐 상황"에서 어떤 부분만 바뀌었는지 알려주는 추가 힌트다.

이 예제에서는 title, subtitle, style은 그대로이고 `isSelected`만 바뀐 경우에만 `SelectionChangedPayload`를 돌려준다.

```text
같은 카드인가?
-> id가 같으므로 yes

내용이 완전히 같은가?
-> isSelected가 바뀌었으므로 no

바뀐 내용이 선택 상태뿐인가?
-> payload로 부분 갱신
```

payload가 들어오면 adapter는 전체 `bind` 대신 `bindSelection`만 호출한다.

```text
전체 bind
-> title 설정
-> subtitle 설정
-> click listener 설정
-> 선택 색상 설정

payload bind
-> 선택 색상만 설정
```

하지만 payload만 믿고 전체 bind를 없애면 안 된다. RecyclerView는 상황에 따라 payload 없이 전체 bind를 요청할 수 있다. 예를 들어 ViewHolder가 새로 만들어졌거나, 화면 밖에 있다가 다시 붙는 경우에는 전체 상태를 다시 채워야 한다.

그래서 이 패턴이 중요하다.

```kotlin
if (SelectionChangedPayload in payloads) {
    holder.bindSelection(getItem(position).isSelected)
} else {
    super.onBindViewHolder(holder, position, payloads)
}
```

부분 갱신을 할 수 있을 때만 부분 갱신하고, 나머지는 전체 bind로 돌려보낸다.

```text
Q. payload는 성능을 어떻게 개선하는가?
A. 작은 상태 변경에서 전체 bind 대신 필요한 UI만 바꾸게 해 bind 비용과 깜빡임을 줄인다.

Q. payload bind만 구현하면 왜 위험한가?
A. payload가 비어 있는 전체 bind 상황에서는 모든 UI 상태를 다시 채워야 하기 때문이다.
```

## 6. 가로 스크롤 위치 저장하기

혼합 RecyclerView에서 자주 보이는 문제 중 하나는 스크롤 위치다.

사용자가 첫 번째 섹션의 가로 목록을 오른쪽으로 넘겨둔 뒤, 아래로 스크롤했다가 다시 올라왔다고 해보자. 이때 가로 위치가 처음으로 돌아가면 사용자는 화면이 리셋된 것처럼 느낀다.

예제에서는 섹션 id를 기준으로 자식 RecyclerView의 scroll state를 저장한다.

```kotlin
private val horizontalScrollStates = mutableMapOf<Long, Parcelable?>()
```

부모 ViewHolder가 재활용될 때 현재 가로 위치를 저장한다.

```kotlin
override fun onViewRecycled(holder: SectionViewHolder) {
    holder.boundSectionId?.let { sectionId ->
        horizontalScrollStates[sectionId] = holder.saveHorizontalScrollState()
    }
    super.onViewRecycled(holder)
}
```

`SectionViewHolder`는 내부 `LinearLayoutManager`에서 상태를 꺼낸다.

```kotlin
fun saveHorizontalScrollState(): Parcelable? {
    return horizontalLayoutManager.onSaveInstanceState()
}
```

다시 bind될 때는 저장된 상태를 복원한다.

```kotlin
fun bind(section: DemoSection, savedScrollState: Parcelable?) {
    boundSectionId = section.id
    row.titleView.text = section.title

    cardAdapter.submitList(section.cards) {
        row.cardsRecyclerView.post {
            if (savedScrollState != null) {
                horizontalLayoutManager.onRestoreInstanceState(savedScrollState)
            } else {
                horizontalLayoutManager.scrollToPosition(0)
            }
        }
    }
}
```

여기서 `submitList` 콜백 뒤에 복원하는 점도 중요하다. 자식 adapter에 리스트가 반영되기 전에 스크롤 위치를 복원하려고 하면 기대한 위치로 이동하지 못할 수 있다.

이 예제의 scroll state 저장은 부모 ViewHolder 재사용과 직접 연결된다.

```text
부모 세로 RecyclerView를 아래로 스크롤한다.
-> 위쪽 SectionViewHolder가 화면 밖으로 나간다.
-> RecyclerView가 그 SectionViewHolder를 재활용한다.
-> onViewRecycled에서 현재 자식 가로 위치를 저장한다.
-> 나중에 같은 section id가 다시 bind된다.
-> 저장해 둔 horizontal LayoutManager state를 복원한다.
```

`boundSectionId`가 필요한 이유도 여기에 있다. ViewHolder는 재사용되므로 현재 holder가 어떤 section을 보여주고 있었는지 알아야 map에 정확한 key로 저장할 수 있다.

```kotlin
var boundSectionId: Long? = null
    private set
```

저장 key를 position이 아니라 section id로 잡은 것도 중요하다. position은 삽입, 삭제, 정렬에 따라 달라질 수 있지만 section id는 같은 섹션을 가리키는 안정적인 값이어야 한다.

다만 이 방식은 화면이 살아 있는 동안의 in-memory 상태 저장이다. 프로세스가 죽었다가 복원되는 수준까지 다루려면 `Bundle`, `SavedStateHandle`, ViewModel 상태 등 더 바깥 계층으로 올려야 한다.

```text
Q. 왜 가로 스크롤 위치가 초기화되는가?
A. 부모 SectionViewHolder가 재활용되면서 안에 있던 자식 RecyclerView와 LayoutManager도 다른 섹션 bind에 재사용되기 때문이다.

Q. 왜 position이 아니라 section id로 저장하는가?
A. position은 데이터 변경에 따라 바뀔 수 있지만 id는 같은 섹션을 안정적으로 식별하기 때문이다.
```

## 7. stable id와 stateRestorationPolicy

예제에서는 섹션 adapter와 카드 adapter 모두 stable id를 켠다.

```kotlin
init {
    setHasStableIds(true)
    stateRestorationPolicy = StateRestorationPolicy.PREVENT_WHEN_EMPTY
}

override fun getItemId(position: Int): Long = getItem(position).id
```

stable id는 RecyclerView가 item을 위치가 아니라 고유 id 기준으로 더 안정적으로 이해하는 데 도움을 준다.

`PREVENT_WHEN_EMPTY`는 adapter가 아직 비어 있을 때 상태 복원을 미루는 설정이다. 데이터가 들어오기 전부터 스크롤 상태를 복원하려고 하면 의미 없는 위치로 복원될 수 있다.

단순한 정적 샘플에서는 티가 덜 나지만, 실제 앱처럼 데이터가 비동기로 들어오는 화면에서는 이런 설정이 꽤 중요해진다.

stable id를 켜면 RecyclerView는 item을 단순 position보다 item id 기준으로 더 안정적으로 추적할 수 있다.

```text
position 0에 있던 item
-> 데이터 변경 뒤 position 1로 이동
-> id가 같으면 같은 item으로 이해할 여지가 생긴다.
```

하지만 stable id는 약속이 강하다. `getItemId(position)`이 진짜 안정적인 id를 돌려줘야 한다. position을 그대로 id로 쓰면 item 이동이나 삽입이 생겼을 때 오히려 잘못된 상태 복원의 원인이 될 수 있다.

`StateRestorationPolicy.PREVENT_WHEN_EMPTY`는 adapter가 비어 있을 때 RecyclerView가 스크롤 상태를 성급하게 복원하지 않도록 막는다.

```text
데이터가 아직 없음
-> 복원할 position이 의미 없음
-> 리스트가 들어온 뒤 복원해야 함
```

이 예제는 정적 데이터라 차이가 작지만, 실제 화면에서는 서버 응답이나 로컬 DB 관찰 결과가 늦게 들어올 수 있다. 그때 빈 adapter 상태에서 복원해버리면 원래 보던 위치로 돌아가지 못할 수 있다.

```text
Q. stable id를 켜면 무엇을 조심해야 하는가?
A. id가 item의 생명주기 동안 변하지 않아야 한다. position을 id처럼 쓰면 안 된다.

Q. PREVENT_WHEN_EMPTY는 어떤 문제를 막는가?
A. 데이터가 들어오기 전에 스크롤 상태를 복원해 잘못된 위치가 되는 문제를 막는다.
```

## 8. itemAnimator를 끄는 선택

예제에서는 자식 RecyclerView에 `itemAnimator = null`을 둔다.

```kotlin
row.cardsRecyclerView.apply {
    itemAnimator = null
}
```

선택 상태처럼 작은 UI 변화가 자주 발생하는 목록에서는 기본 change animation이 오히려 깜빡임처럼 느껴질 수 있다.

payload로 부분 갱신을 하고, 선택 배경만 바로 바꾸는 UI라면 애니메이션을 끄는 편이 더 안정적으로 보일 때가 있다.

물론 삭제, 삽입, 이동 애니메이션이 중요한 화면이라면 다르게 판단해야 한다. 여기서는 카드 선택 상태를 빠르게 반영하는 샘플이기 때문에 끄는 쪽이 자연스럽다.

기본 item animator는 item 변경을 애니메이션으로 보여주려고 한다. 선택 상태처럼 배경색과 텍스트 색이 즉시 바뀌어야 하는 UI에서는 이 change animation이 깜빡임이나 잔상처럼 보일 수 있다.

이 예제는 선택 상태 변경을 payload로 직접 처리한다.

```text
선택됨
-> 배경색 변경
-> 텍스트 색 변경

선택 해제
-> 배경색 원복
-> 텍스트 색 원복
```

이런 경우에는 animator보다 명시적인 상태 bind가 더 예측 가능하다. 반대로 삽입, 삭제, 순서 변경을 사용자에게 자연스럽게 보여줘야 하는 목록이라면 animator를 끄는 것이 손해일 수 있다.

```text
Q. itemAnimator를 끄는 이유는?
A. 작은 상태 변경에서 기본 change animation이 깜빡임처럼 보일 수 있어, payload bind로 직접 상태를 반영하기 위해서다.

Q. 항상 꺼야 하는가?
A. 아니다. 삽입/삭제/이동 애니메이션이 중요한 화면이면 유지하는 편이 낫다.
```

## 이 구조를 설명할 때의 핵심 질문

마지막으로 이 예제를 보고 스스로 답해볼 질문을 정리해보자. 단순히 API 이름을 아는 것보다, 아래 질문에 코드 기준으로 답할 수 있어야 한다.

```text
Q. 부모 RecyclerView와 자식 RecyclerView의 재사용 단위는 무엇인가?
A. 부모는 섹션 row를 재사용하고, 자식은 카드 item을 재사용한다.

Q. RecycledViewPool 공유는 어떤 비용을 줄이는가?
A. 같은 viewType의 카드 ViewHolder 생성 비용을 섹션 간에 줄인다.

Q. viewType은 왜 필요한가?
A. 서로 다른 ViewHolder 구조를 안전하게 분리하고, pool 재사용 단위를 명확히 하기 위해 필요하다.

Q. DiffUtil과 payload의 역할은 어떻게 다른가?
A. DiffUtil은 어떤 item이 바뀌었는지 찾고, payload는 같은 item 안에서 무엇만 바뀌었는지 알려준다.

Q. 가로 스크롤 상태는 왜 따로 저장해야 하는가?
A. 부모 row가 재활용될 때 자식 LayoutManager 상태가 다른 섹션에 섞이거나 초기화될 수 있기 때문이다.

Q. initialPrefetchItemCount는 어떤 체감 문제를 줄이려는가?
A. 새 섹션이 들어올 때 자식 가로 카드의 첫 bind가 늦어져 생기는 버벅임을 줄이려는 설정이다.

Q. setHasFixedSize(true)는 언제 안전한가?
A. adapter 내용이 바뀌어도 RecyclerView 자체 크기가 변하지 않는 구조일 때 안전하다.
```

## 전체 흐름 다시 보기

이 예제를 한 줄로 정리하면 이렇게 볼 수 있다.

```text
세로 RecyclerView가 섹션을 재사용하고,
각 섹션 안의 가로 RecyclerView는 같은 pool을 공유하며,
다른 카드 UI는 viewType과 ViewHolder를 분리하고,
카드 변경은 DiffUtil과 payload로 작게 갱신하고,
가로 스크롤 위치는 section id 기준으로 저장한다.
```

조금 더 실전적인 체크리스트로 바꾸면 이렇다.

```text
같은 카드 UI가 여러 섹션에 반복되는가?
-> RecycledViewPool 공유를 검토한다.

일반 카드와 강조 카드처럼 UI가 다른 item이 섞이는가?
-> viewType과 ViewHolder를 분리한다.

새 섹션이 들어올 때 첫 가로 카드들이 늦게 보이는가?
-> initialPrefetchItemCount를 조정한다.

작은 상태 변경에도 전체 item bind가 도는가?
-> DiffUtil payload를 분리한다.

아래로 갔다가 돌아오면 가로 위치가 초기화되는가?
-> section id 기준으로 scroll state를 저장한다.

데이터가 늦게 들어오는 화면인가?
-> stable id와 stateRestorationPolicy를 확인한다.
```

RecyclerView는 오래된 API처럼 느껴질 때도 있지만, 여전히 복잡한 목록 UI에서는 배울 게 많다. 특히 가로/세로가 섞인 화면은 단순한 adapter 구현을 넘어, 재사용과 상태 복원을 어디까지 설계할지 생각하게 만든다.

Compose로 화면을 만들더라도 LazyColumn 안에 LazyRow를 넣는 구조에서는 비슷한 고민이 반복된다. 목록이 중첩되면 결국 같은 질문으로 돌아온다.

```text
무엇을 재사용할 것인가?
무엇만 다시 그릴 것인가?
사용자가 보던 위치를 어떻게 유지할 것인가?
```

이 세 가지를 놓치지 않으면, 혼합형 목록 UI도 훨씬 안정적으로 다룰 수 있다.
