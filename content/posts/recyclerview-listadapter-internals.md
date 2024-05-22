---
title: "ListAdapter 내부 구조와 submitList 흐름 정리"
date: "2024-05-22"
category: "Android"
group: "RecyclerView"
series: "RecyclerView"
tags: ["android", "recyclerview", "listadapter", "diffutil", "asynclistdiffer", "viewpager2"]
description: "RecyclerView.ListAdapter가 AsyncListDiffer, DiffUtil, AdapterListUpdateCallback을 통해 새 리스트를 어떻게 비교하고 RecyclerView에 최소 변경만 반영하는지 KakaoSearch의 DetailPagerAdapter 예시로 정리합니다."
---

![ListAdapter로 RecyclerView 목록 갱신 이해하기](/images/recyclerview-listadapter-cover.png)

앞 글에서 [[recyclerview-recycledviewpool-deep-dive|RecycledViewPool]]을 보면서 RecyclerView가 ViewHolder 생성 비용을 어떻게 줄이는지 정리했다. 이번에는 "데이터가 바뀌었을 때 RecyclerView를 어떻게 갱신할 것인가"를 다루는 `ListAdapter`를 보려고 한다.

한 줄로 말하면 이렇다.

```text
ListAdapter는 RecyclerView.Adapter 위에
AsyncListDiffer를 얹어 둔 편의 클래스다.
```

그래서 `ListAdapter`를 이해할 때는 단순히 `submitList()`만 외우면 조금 아쉽다. 내부적으로는 아래 역할들이 같이 움직인다.

```text
ListAdapter
-> AsyncListDiffer
-> DiffUtil.ItemCallback
-> AdapterListUpdateCallback
-> RecyclerView.Adapter notifyItem... 호출
```

이 글은 [[recyclerview-series|RecyclerView 시리즈]]의 세 번째 글이다. 앞 글들이 ViewHolder 재사용과 pool을 다뤘다면, 이번 글은 리스트 변경을 어떻게 작고 정확하게 반영하는지에 초점을 맞춘다.

## 먼저 ListAdapter가 필요한 이유

RecyclerView에서 목록을 갱신하는 가장 단순한 방법은 데이터를 바꾼 뒤 `notifyDataSetChanged()`를 호출하는 것이다.

```kotlin
items = newItems
notifyDataSetChanged()
```

동작은 한다. 하지만 RecyclerView 입장에서는 어떤 item이 추가됐는지, 삭제됐는지, 내용만 바뀌었는지 알 수 없다.

```text
notifyDataSetChanged()
-> 전체가 바뀐 것처럼 처리
-> 필요한 애니메이션과 부분 갱신을 놓치기 쉬움
-> bind 범위가 넓어질 수 있음
```

목록 갱신에서 알고 싶은 것은 사실 더 구체적이다.

```text
같은 item인가?
같은 item인데 내용만 바뀌었나?
새 item이 들어왔나?
기존 item이 사라졌나?
위치가 이동했나?
```

`ListAdapter`는 이 질문을 `DiffUtil.ItemCallback`으로 표현하게 하고, 새 리스트가 들어올 때 이전 리스트와 비교해서 필요한 변경만 RecyclerView에 전달한다.

## KakaoSearch에서는 어디에 쓰였나

KakaoSearch 프로젝트의 검색 결과 화면은 Compose로 구성되어 있지만, 상세 화면은 `ViewPager2`를 사용한다. `ViewPager2`는 내부적으로 RecyclerView 기반으로 동작하므로, 페이지 하나하나를 RecyclerView item처럼 다룰 수 있다.

상세 화면의 adapter는 이렇게 선언되어 있다.

```kotlin
class DetailPagerAdapter :
    ListAdapter<MediaItem, DetailPagerAdapter.DetailViewHolder>(DIFF_CALLBACK) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DetailViewHolder {
        val binding = ItemDetailPageBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false,
        )
        return DetailViewHolder(binding)
    }

    override fun onBindViewHolder(holder: DetailViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
}
```

타입을 풀어 쓰면 이런 뜻이다.

```text
ListAdapter<MediaItem, DetailViewHolder>

MediaItem
= 이 adapter가 표시할 데이터 타입

DetailViewHolder
= MediaItem 하나를 화면에 그릴 ViewHolder 타입
```

여기서 `DetailPagerAdapter`가 관리하는 것은 "상세 페이지 목록"이다. 사용자가 검색 결과나 보관 목록에서 어떤 항목을 열면, 상세 화면은 현재 항목 주변의 `MediaItem`들을 페이지처럼 넘겨 보여준다.

`DetailFragment` 쪽 흐름은 이렇게 볼 수 있다.

```kotlin
private val pagerAdapter = DetailPagerAdapter()

override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    binding.detailViewPager.adapter = pagerAdapter
}
```

상태가 바뀌면 새 리스트를 만들어 adapter에 넣는다.

```kotlin
private fun render(state: DetailUiState) {
    val nextItems = state.items.toList()

    if (pagerAdapter.currentList != nextItems) {
        pagerAdapter.submitList(nextItems) {
            syncPagerPosition(viewModel.state.value)
        }
    } else {
        syncPagerPosition(state)
    }
}
```

여기에는 중요한 선택이 몇 개 들어 있다.

```text
state.items.toList()
-> 새 리스트 인스턴스를 만들어 submitList에 전달한다.

pagerAdapter.currentList != nextItems
-> 현재 adapter가 가진 리스트와 내용이 같으면 불필요한 submit을 피한다.

submitList(nextItems) { ... }
-> 새 리스트 반영이 끝난 뒤 ViewPager 위치를 맞춘다.
```

특히 `toList()`가 눈에 띈다. `ListAdapter`는 같은 리스트 객체가 다시 들어오면 "같은 리스트"로 보고 diff 계산을 하지 않을 수 있다. 그래서 목록 상태를 갱신할 때는 기존 리스트를 제자리에서 수정하기보다, 새 리스트를 만들어 넘기는 방식이 안전하다.

## DetailViewHolder가 하는 일

ViewHolder는 `MediaItem` 하나를 상세 페이지 UI에 바인딩한다.

```kotlin
class DetailViewHolder(
    private val binding: ItemDetailPageBinding,
) : RecyclerView.ViewHolder(binding.root) {

    fun bind(item: MediaItem) = with(binding) {
        val context = root.context
        root.scrollTo(0, 0)

        Glide.with(thumbnailImageView)
            .load(item.thumbnailUrl)
            .fitCenter()
            .into(thumbnailImageView)

        typeTextView.text = context.getString(
            if (item.type == MediaType.IMAGE) {
                R.string.media_type_image
            } else {
                R.string.media_type_video
            },
        )

        itemTitleTextView.text = item.title
        urlTextView.text = item.contentUrl
        dateTextView.text = DateTimeFormatters.formatFull(item.datetime)

        val category = item.collection
            ?.takeIf { item.type == MediaType.IMAGE && it.isNotBlank() }
        categoryTextView.isVisible = category != null
        categoryTextView.text = category
            ?.let { context.getString(R.string.detail_category_format, it) }
            .orEmpty()
    }
}
```

여기서 `ListAdapter`가 대신해주는 일과 ViewHolder가 직접 해야 하는 일을 나눠야 한다.

```text
ListAdapter가 하는 일
= 어떤 position이 추가/삭제/변경됐는지 계산한다.

ViewHolder가 하는 일
= getItem(position)으로 받은 현재 item을 실제 View에 반영한다.
```

`root.scrollTo(0, 0)`도 상세 페이지 맥락에서는 의미가 있다. ViewHolder는 재사용될 수 있으므로, 이전 페이지에서 사용자가 스크롤해 둔 내부 scroll 위치가 다음 item에 남지 않도록 bind 시점에 초기화한다.

## DiffUtil.ItemCallback 읽기

`DetailPagerAdapter`의 diff 기준은 아래처럼 작성되어 있다.

```kotlin
private val DIFF_CALLBACK = object : DiffUtil.ItemCallback<MediaItem>() {
    override fun areItemsTheSame(oldItem: MediaItem, newItem: MediaItem): Boolean {
        return oldItem.id == newItem.id
    }

    override fun areContentsTheSame(oldItem: MediaItem, newItem: MediaItem): Boolean {
        return oldItem == newItem
    }
}
```

`areItemsTheSame`은 "두 객체가 같은 항목을 가리키는가"를 판단한다.

```text
oldItem.id == newItem.id
```

즉 제목, 썸네일, 날짜 같은 내용이 바뀌어도 `id`가 같으면 같은 항목이다. 같은 항목이라고 판단된 다음에야 "내용이 바뀌었는가"를 다시 볼 수 있다.

`areContentsTheSame`은 "화면에 그릴 내용까지 같은가"를 판단한다.

```text
oldItem == newItem
```

`MediaItem`이 data class라면 `==`는 주요 프로퍼티 비교로 이어진다. 그래서 id는 같지만 title, thumbnailUrl, collection 같은 값이 달라졌다면 내용 변경으로 볼 수 있다.

이 둘을 헷갈리면 갱신이 이상해진다.

```text
areItemsTheSame을 너무 넓게 잡음
-> 서로 다른 항목을 같은 항목처럼 취급할 수 있다.

areItemsTheSame을 너무 좁게 잡음
-> 같은 항목인데 삭제 후 추가처럼 처리될 수 있다.

areContentsTheSame을 항상 false로 둠
-> 변경이 없어도 bind와 애니메이션이 자주 발생한다.

areContentsTheSame을 항상 true로 둠
-> 실제 내용 변경이 화면에 반영되지 않을 수 있다.
```

KakaoSearch의 상세 페이지에서는 `id`를 identity로, `MediaItem` 전체 equality를 content로 보는 구성이 자연스럽다.

## 내부 구조는 이렇게 생겼다

![ListAdapter 내부 구조](/images/recyclerview-listadapter-internals-handdrawn.png)

AndroidX의 `ListAdapter` 소스 구조를 단순화하면 아래와 같다.

```java
public abstract class ListAdapter<T, VH extends RecyclerView.ViewHolder>
        extends RecyclerView.Adapter<VH> {

    final AsyncListDiffer<T> mDiffer;

    protected ListAdapter(DiffUtil.ItemCallback<T> diffCallback) {
        mDiffer = new AsyncListDiffer<>(
            new AdapterListUpdateCallback(this),
            new AsyncDifferConfig.Builder<>(diffCallback).build()
        );
    }

    public void submitList(List<T> list) {
        mDiffer.submitList(list);
    }

    protected T getItem(int position) {
        return mDiffer.getCurrentList().get(position);
    }

    @Override
    public int getItemCount() {
        return mDiffer.getCurrentList().size();
    }
}
```

핵심은 `ListAdapter`가 직접 diff를 계산하지 않는다는 점이다.

```text
ListAdapter
= RecyclerView.Adapter 형태를 제공한다.

AsyncListDiffer
= 현재 리스트를 보관하고 새 리스트와 diff를 계산한다.

DiffUtil.ItemCallback
= 같은 item인지, 내용이 같은지 판단하는 기준이다.

AdapterListUpdateCallback
= diff 결과를 adapter.notifyItem... 호출로 바꿔 준다.
```

그래서 `onBindViewHolder` 안에서 `getItem(position)`을 호출하면, 실제로는 `AsyncListDiffer`가 들고 있는 현재 리스트에서 item을 꺼내오는 것이다.

```kotlin
override fun onBindViewHolder(holder: DetailViewHolder, position: Int) {
    holder.bind(getItem(position))
}
```

이 구조 덕분에 adapter 구현자는 `getItemCount()`를 직접 관리하지 않아도 된다. 리스트 크기는 `currentList.size`에서 나오고, 변경 통지는 diff 결과를 통해 자동으로 전달된다.

## submitList 호출 시 흐름

![submitList 호출 흐름](/images/recyclerview-listadapter-submitlist-flow-handdrawn.png)

`submitList(newList)`를 호출하면 내부 흐름은 크게 네 단계다.

```text
1. 새 리스트가 들어온다.
2. 기존 리스트와 새 리스트를 비교한다.
3. 비교 결과를 main thread로 가져온다.
4. RecyclerView.Adapter에 변경 이벤트를 전달한다.
```

조금 더 자세히 보면 이렇다.

```text
submitList(newList)
-> AsyncListDiffer.submitList(newList)
-> 현재 리스트와 같은 객체인지 확인
-> 첫 리스트면 전체 inserted 처리
-> 기존 리스트가 있으면 background thread에서 DiffUtil.calculateDiff
-> 계산이 끝나면 main thread에서 최신 요청인지 확인
-> 새 리스트를 currentList로 교체
-> diffResult.dispatchUpdatesTo(updateCallback)
-> AdapterListUpdateCallback이 notifyItem... 호출
```

여기서 `AdapterListUpdateCallback`은 diff 결과를 RecyclerView adapter 이벤트로 바꾼다.

```text
onInserted
-> notifyItemRangeInserted

onRemoved
-> notifyItemRangeRemoved

onMoved
-> notifyItemMoved

onChanged
-> notifyItemRangeChanged
```

즉 `ListAdapter`는 마법처럼 화면을 바꾸는 클래스가 아니다. 내부적으로는 RecyclerView가 이미 알고 있는 `notifyItem...` 계열 호출을 더 안전하게 만들어 주는 래퍼에 가깝다.

## 왜 비동기 diff가 중요한가

Diff 계산은 리스트 크기와 변경 패턴에 따라 비용이 생길 수 있다. UI thread에서 무거운 비교를 하면 스크롤이나 터치 반응이 끊길 수 있다.

`AsyncListDiffer`는 기존 리스트가 있는 상태에서 새 리스트가 들어오면 background executor에서 `DiffUtil.calculateDiff`를 수행한다.

```text
UI thread
-> submitList 호출

background thread
-> oldList / newList 비교

main thread
-> 계산된 변경 결과 반영
```

그래서 사용자는 UI를 계속 만질 수 있고, 계산이 끝난 뒤 필요한 변경만 main thread에서 반영된다.

또 하나 중요한 장치가 있다. `AsyncListDiffer`는 내부적으로 generation 값을 증가시킨다.

```text
submitList(A)
-> diff A 계산 시작

submitList(B)
-> diff B 계산 시작
-> 최신 generation은 B가 됨

A 계산이 늦게 끝남
-> 최신 generation이 아니므로 버림
```

이 덕분에 검색어가 빠르게 바뀌거나 상태가 연속으로 들어오는 상황에서도 오래된 diff 결과가 최신 화면을 덮어쓰지 않는다.

## commit callback은 언제 쓰나

KakaoSearch의 `DetailFragment`는 `submitList`의 commit callback을 사용한다.

```kotlin
pagerAdapter.submitList(nextItems) {
    syncPagerPosition(viewModel.state.value)
}
```

이 코드는 새 목록이 adapter에 반영된 뒤 `ViewPager2`의 현재 페이지를 맞추려는 의도다.

```text
새 리스트 제출
-> diff 계산
-> adapter currentList 교체
-> RecyclerView 변경 이벤트 전달
-> 그 다음 currentIndex에 맞춰 ViewPager 위치 동기화
```

이 순서가 중요하다. 아직 adapter가 새 item count를 모르는 상태에서 `setCurrentItem()`을 먼저 호출하면, target index가 범위를 벗어나거나 기대한 페이지로 이동하지 않을 수 있다.

다만 commit callback에는 주의점이 있다.

```text
submitList(A, callbackA)
submitList(B, callbackB)
```

이렇게 새 리스트가 연속으로 들어오면, A가 실제로 반영되지 않고 B가 최신 리스트로 바로 반영될 수 있다. 이 경우 A의 callback은 실행되지 않을 수 있다. 그래서 commit callback에는 "반드시 한 번 실행되어야 하는 비즈니스 로직"보다 "그 리스트가 실제 반영됐을 때만 필요한 UI 후처리"를 넣는 편이 낫다.

KakaoSearch의 `syncPagerPosition`은 이 용도에 잘 맞는다.

## currentList를 직접 수정하면 안 된다

`ListAdapter.currentList`는 현재 표시 중인 리스트를 읽기 위한 값이다. AndroidX 소스에서도 current list는 읽기 전용 리스트로 노출된다.

그래서 이런 식으로 접근하면 안 된다.

```kotlin
adapter.currentList.add(newItem) // 이런 방향은 피하기
adapter.notifyItemInserted(...)
```

대신 새 리스트를 만들어 제출한다.

```kotlin
val nextItems = adapter.currentList + newItem
adapter.submitList(nextItems)
```

KakaoSearch의 `render`에서 `state.items.toList()`를 호출하는 것도 같은 방향이다.

```kotlin
val nextItems = state.items.toList()
pagerAdapter.submitList(nextItems)
```

목록 상태는 바깥에서 immutable하게 만들고, adapter에는 완성된 새 스냅샷을 넘긴다. `ListAdapter`는 그 스냅샷들 사이의 차이를 계산한다.

## payload를 쓰면 더 세밀해진다

현재 `DetailPagerAdapter`는 `getChangePayload`를 따로 구현하지 않는다. 그래서 같은 item의 내용이 달라지면 일반적인 `onBindViewHolder(holder, position)` 흐름으로 다시 bind된다.

상세 페이지처럼 한 화면에 큰 item을 보여주고, 변경 빈도가 높지 않은 구조라면 이 정도로 충분할 수 있다.

하지만 좋아요 상태, 다운로드 상태, 재생 상태처럼 item의 작은 일부만 자주 바뀐다면 payload를 고려할 수 있다.

```kotlin
override fun getChangePayload(oldItem: MediaItem, newItem: MediaItem): Any? {
    return when {
        oldItem.isFavorite != newItem.isFavorite -> FavoritePayload(newItem.isFavorite)
        else -> null
    }
}
```

그리고 payload bind를 받을 수 있다.

```kotlin
override fun onBindViewHolder(
    holder: DetailViewHolder,
    position: Int,
    payloads: MutableList<Any>,
) {
    if (payloads.isEmpty()) {
        holder.bind(getItem(position))
    } else {
        holder.bindPayload(payloads)
    }
}
```

이렇게 하면 썸네일을 다시 로드하거나 전체 텍스트를 다시 세팅하지 않고, 바뀐 작은 부분만 업데이트할 수 있다.

```text
DiffUtil
-> 어떤 item이 바뀌었는지 찾는다.

payload
-> 그 item 안에서 무엇만 바뀌었는지 알려준다.
```

둘은 같은 기능이 아니라 단계가 다르다.

## ListAdapter와 ViewHolder 재사용은 다른 문제다

앞 글의 `RecycledViewPool`과 이번 글의 `ListAdapter`는 서로 다른 문제를 해결한다.

```text
RecycledViewPool
= ViewHolder 생성 비용을 줄인다.

ListAdapter
= 리스트 변경 범위를 계산한다.
```

ListAdapter를 쓴다고 ViewHolder 재사용이 사라지는 것은 아니다. RecyclerView는 여전히 화면 밖으로 나간 ViewHolder를 재사용한다.

반대로 RecycledViewPool을 잘 써도 데이터 변경을 전부 `notifyDataSetChanged()`로 처리하면 부분 갱신의 장점을 잃을 수 있다.

둘을 같이 보면 RecyclerView의 두 축이 보인다.

```text
화면 구조 재사용
-> ViewHolder, viewType, RecycledViewPool

데이터 변경 반영
-> ListAdapter, AsyncListDiffer, DiffUtil, payload
```

KakaoSearch의 `DetailPagerAdapter`는 ViewPager2 페이지를 보여주는 구조라 ViewHolder 생성과 bind도 중요하지만, `ListAdapter`를 통해 "현재 상세 화면이 들고 있는 MediaItem 목록"을 안전하게 바꾸는 쪽이 핵심이다.

## 자주 헷갈리는 질문

```text
Q. ListAdapter를 쓰면 notifyItemInserted를 직접 호출하지 않아도 되나?
A. 보통은 그렇다. 새 리스트를 submitList로 넘기면 diff 결과가 notifyItem... 호출로 변환된다.

Q. areItemsTheSame과 areContentsTheSame은 무엇이 다른가?
A. areItemsTheSame은 같은 항목인지, areContentsTheSame은 그 항목의 표시 내용이 같은지 본다.

Q. 같은 MutableList를 수정해서 다시 submitList하면 되나?
A. 피하는 편이 좋다. 같은 리스트 객체면 diff가 생략될 수 있고, 이전 스냅샷과 새 스냅샷의 경계도 흐려진다.

Q. submitList callback은 항상 실행되나?
A. 아니다. 더 최신 리스트가 바로 반영되면 이전 리스트의 callback은 실행되지 않을 수 있다.

Q. DiffUtil을 쓰면 bind 비용도 사라지나?
A. 아니다. 변경된 item은 여전히 bind가 필요하다. DiffUtil은 변경 범위를 줄여 주는 도구다.
```

## 설명할 때 잡아야 할 핵심

`ListAdapter`를 설명할 때는 아래 순서가 가장 깔끔하다.

```text
1. ListAdapter는 RecyclerView.Adapter의 하위 클래스다.
2. 내부에 AsyncListDiffer를 갖고 있다.
3. submitList로 새 리스트 스냅샷을 받는다.
4. AsyncListDiffer가 기존 리스트와 새 리스트를 비교한다.
5. 비교 기준은 DiffUtil.ItemCallback이 제공한다.
6. diff 계산은 background thread에서 수행될 수 있다.
7. 결과는 main thread에서 AdapterListUpdateCallback을 통해 notifyItem... 이벤트로 전달된다.
8. RecyclerView는 그 이벤트를 바탕으로 필요한 ViewHolder만 갱신한다.
```

짧게 정리하면 이렇다.

```text
ListAdapter는 리스트 변경을 직접 notify하는 대신,
새 리스트 스냅샷을 제출하면 내부 AsyncListDiffer가 차이를 계산하고
RecyclerView에 최소 변경 이벤트를 전달하게 해주는 Adapter다.
```

KakaoSearch의 `DetailPagerAdapter`에서는 이 구조 덕분에 상세 페이지 목록을 새 상태에 맞게 교체하면서도, `ViewPager2`의 현재 위치 동기화 같은 후처리를 안전한 시점에 붙일 수 있다.

## 참고

- [Android Developers - ListAdapter](https://developer.android.com/reference/androidx/recyclerview/widget/ListAdapter)
- [AndroidX source - ListAdapter.java](https://android.googlesource.com/platform/frameworks/support/+/refs/heads/androidx-main/recyclerview/recyclerview/src/main/java/androidx/recyclerview/widget/ListAdapter.java)
- [AndroidX source - AsyncListDiffer.java](https://android.googlesource.com/platform/frameworks/support/+/refs/heads/androidx-main/recyclerview/recyclerview/src/main/java/androidx/recyclerview/widget/AsyncListDiffer.java)
- [AndroidX source - AdapterListUpdateCallback.java](https://android.googlesource.com/platform/frameworks/support/+/refs/heads/androidx-main/recyclerview/recyclerview/src/main/java/androidx/recyclerview/widget/AdapterListUpdateCallback.java)
