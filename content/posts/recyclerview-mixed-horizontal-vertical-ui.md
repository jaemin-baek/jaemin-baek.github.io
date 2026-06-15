---
title: "가로/세로 혼합 RecyclerView UI 예제로 최적화 포인트 정리하기"
date: "2024-05-20"
category: "Android"
group: "Android UI"
series: "Android UI"
tags: ["android", "recyclerview", "diffutil", "listadapter", "ui-performance"]
description: "세로 RecyclerView 안에 가로 RecyclerView를 넣는 혼합형 UI 예제를 보면서 RecycledViewPool, prefetch, DiffUtil, payload, 스크롤 상태 저장을 정리합니다."
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
    val isSelected: Boolean = false,
)
```

`DemoSection`은 세로 목록의 한 줄이고, `DemoCard`는 각 섹션 안에 들어가는 가로 카드다.

화면에서 사용자는 세로로 섹션을 넘기고, 각 섹션 안에서는 가로로 카드를 넘긴다. 카드를 누르면 선택 상태가 바뀐다.

이 작은 기능만으로도 아래 요소를 같이 볼 수 있다.

```text
ViewHolder 재사용
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
아래로 갔다가 돌아오면 가로 스크롤 위치가 처음으로 돌아간다.
```

혼합 RecyclerView에서는 "목록을 보여준다"보다 "재활용되는 시점에 무엇을 유지하고 무엇을 다시 만들지"가 더 중요해진다.

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

## 2. initialPrefetchItemCount로 다음 카드를 미리 준비하기

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

## 3. ListAdapter와 DiffUtil로 변경된 item만 갱신하기

카드를 누르면 선택 상태만 바뀐다.

이때 전체 목록을 `notifyDataSetChanged()`로 다시 그리면 바뀌지 않은 카드까지 모두 bind될 수 있다. 예제는 `ListAdapter`와 `DiffUtil.ItemCallback`을 사용한다.

```kotlin
private class CardAdapter(
    private val onCardClick: (DemoCard) -> Unit,
) : ListAdapter<DemoCard, CardViewHolder>(CardDiffCallback) {

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

## 4. payload로 선택 상태만 부분 갱신하기

DiffUtil을 쓰더라도 기본 bind는 item 전체를 다시 그리는 방향으로 흐르기 쉽다.

하지만 카드 선택 상태만 바뀐 경우에는 제목과 부제까지 다시 넣을 필요가 없다. 배경색과 텍스트 색만 바꾸면 된다.

이때 `getChangePayload`를 사용할 수 있다.

```kotlin
override fun getChangePayload(oldItem: DemoCard, newItem: DemoCard): Any? {
    val onlySelectionChanged = oldItem.title == newItem.title &&
        oldItem.subtitle == newItem.subtitle &&
        oldItem.isSelected != newItem.isSelected

    return if (onlySelectionChanged) SelectionChangedPayload else null
}
```

그리고 adapter에서 payload가 들어온 경우 부분 bind만 수행한다.

```kotlin
override fun onBindViewHolder(
    holder: CardViewHolder,
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

## 5. 가로 스크롤 위치 저장하기

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

## 6. stable id와 stateRestorationPolicy

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

## 7. itemAnimator를 끄는 선택

예제에서는 자식 RecyclerView에 `itemAnimator = null`을 둔다.

```kotlin
row.cardsRecyclerView.apply {
    itemAnimator = null
}
```

선택 상태처럼 작은 UI 변화가 자주 발생하는 목록에서는 기본 change animation이 오히려 깜빡임처럼 느껴질 수 있다.

payload로 부분 갱신을 하고, 선택 배경만 바로 바꾸는 UI라면 애니메이션을 끄는 편이 더 안정적으로 보일 때가 있다.

물론 삭제, 삽입, 이동 애니메이션이 중요한 화면이라면 다르게 판단해야 한다. 여기서는 카드 선택 상태를 빠르게 반영하는 샘플이기 때문에 끄는 쪽이 자연스럽다.

## 전체 흐름 다시 보기

이 예제를 한 줄로 정리하면 이렇게 볼 수 있다.

```text
세로 RecyclerView가 섹션을 재사용하고,
각 섹션 안의 가로 RecyclerView는 같은 pool을 공유하며,
카드 변경은 DiffUtil과 payload로 작게 갱신하고,
가로 스크롤 위치는 section id 기준으로 저장한다.
```

조금 더 실전적인 체크리스트로 바꾸면 이렇다.

```text
같은 카드 UI가 여러 섹션에 반복되는가?
-> RecycledViewPool 공유를 검토한다.

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
