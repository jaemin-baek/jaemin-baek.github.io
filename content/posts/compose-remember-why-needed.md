---
title: "Compose remember, 왜 필요한 걸까"
date: "2025-05-28"
category: "Android"
tags: ["jetpack-compose", "remember", "recomposition", "state", "android"]
description: "Jetpack Compose에서 remember가 왜 필요한지, Composable 재실행과 Composition 기억 공간 관점에서 차근차근 정리합니다."
---

![Compose remember, 왜 필요한 걸까](/images/compose-remember-cover.png)

앞 글에서 recomposition을 정리하면서 이런 이야기를 했다.

```text
State가 바뀌면
-> 그 State를 읽던 Composable이 다시 실행되고
-> 새 UI 결과가 화면에 반영된다
```

여기까지 이해하고 나면 자연스럽게 다음 질문이 나온다.

**Composable이 다시 실행되면, 함수 안에서 만들었던 값은 어떻게 되지?**

예를 들어 화면 안에 검색어, 선택된 탭, 스크롤에 필요한 보조 객체, formatter, focus requester 같은 값이 있다고 하자. 화면 함수가 다시 실행될 때마다 이 값들이 매번 새로 만들어지면 곤란할 때가 있다.

이때 등장하는 게 `remember`다.

이번 글은 `remember`만 집중해서 보려고 한다. `mutableStateOf`는 다음 글에서 따로 볼 생각이라, 여기서는 깊게 들어가지 않는다. 지금은 `remember`가 왜 필요한지, 어떤 값을 기억하는지, 언제 다시 계산되는지, 언제 사라지는지만 잡아보자.

## 먼저 한 줄로 보기

`remember`는 Composable이 recomposition되어도 값을 유지하게 해주는 장치다.

```kotlin
val formatter = remember {
    DateTimeFormatter.ofPattern("yyyy.MM.dd")
}
```

이 코드는 매번 `DateTimeFormatter`를 새로 만들지 않는다. 처음 composition에서 만들고, 같은 위치의 recomposition에서는 이전에 만든 값을 다시 돌려준다.

조금 더 쉽게 말하면 이렇다.

```text
remember = Composable 함수가 다시 실행되어도
           같은 위치에서 이전 값을 꺼내 쓰게 해주는 기억 공간
```

여기서 "같은 위치"라는 표현이 중요하다. `remember`는 단순한 전역 캐시가 아니다. Composable이 Composition 안에 들어와 있는 동안, 특정 호출 위치에 연결된 값을 기억한다.

## 왜 그냥 지역 변수로는 안 될까

일반 Kotlin 함수라면 지역 변수는 함수가 호출될 때 만들어지고, 함수가 끝나면 사라진다.

```kotlin
fun greeting() {
    val message = "hello"
}
```

Composable도 함수다. 게다가 Compose에서는 Composable이 여러 번 다시 실행될 수 있다.

```kotlin
@Composable
fun SearchBox() {
    var query = ""

    TextField(
        value = query,
        onValueChange = { query = it }
    )
}
```

이 코드는 보기에는 자연스럽지만 Compose 화면 코드로는 원하는 대로 동작하지 않는다.

`query`는 `SearchBox()`가 실행될 때마다 다시 `""`로 만들어진다. 사용자가 글자를 입력해도 다음 recomposition에서 다시 빈 문자열이 될 수 있다. 더 큰 문제는 일반 지역 변수 변경만으로는 Compose가 화면을 다시 계산해야 한다는 사실을 알 수도 없다.

이번 글에서는 두 문제 중 첫 번째, **값을 어디에 보관할 것인가**에 집중하자. 두 번째 문제인 **값이 바뀌었을 때 Compose가 어떻게 알아차리는가**는 `mutableStateOf` 쪽 이야기다.

![지역 변수와 remember 비교](/images/compose-remember-local-vs-remember.svg)

`remember`를 쓰면 함수가 다시 실행되어도 값을 유지할 수 있다. 입력값처럼 계속 바뀌는 상태를 다루는 예시는 다음 글에서 보려고 하니, 여기서는 "같은 객체를 다시 쓰고 싶다"는 상황으로 보자.

```kotlin
@Composable
fun FocusableInput() {
    val requester = remember {
        FocusRequester()
    }

    TextField(
        value = "",
        onValueChange = {},
        modifier = Modifier.focusRequester(requester)
    )
}
```

`FocusRequester`는 화면이 다시 계산될 때마다 매번 새로 만들기보다, 같은 입력 컴포넌트에 붙어 있는 동안 같은 인스턴스를 유지하는 편이 자연스럽다. 이런 값은 `remember`로 Composition 안에 묶어둘 수 있다.

하지만 지금 핵심은 이것이다.

```text
지역 변수는 함수 실행에 붙어 있다.
remember 값은 Composition에 붙어 있다.
```

Composable은 다시 실행될 수 있기 때문에, recomposition 사이에서 유지해야 하는 값은 함수의 지역 변수만으로는 부족하다.

## remember는 어디에 기억할까

`remember`라는 이름 때문에 처음에는 객체가 자기 자신을 기억하는 것처럼 느껴질 수 있다. 하지만 더 정확히는 Compose Runtime이 기억한다.

Composable이 처음 Composition에 들어오면 Compose는 UI tree를 만들면서 내부적으로 호출 위치를 추적한다. 그리고 `remember`를 만나면 그 위치에 값을 저장한다.

```kotlin
@Composable
fun DateLabel(date: LocalDate) {
    val formatter = remember {
        DateTimeFormatter.ofPattern("yyyy.MM.dd")
    }

    Text(formatter.format(date))
}
```

처음 실행될 때는 `remember` 블록이 실행된다.

```kotlin
DateTimeFormatter.ofPattern("yyyy.MM.dd")
```

그 결과가 Composition 안의 기억 공간에 저장된다.

나중에 `DateLabel`이 recomposition되면, 같은 위치의 `remember`는 블록을 다시 실행하지 않고 이전 값을 꺼내준다.

![remember가 Composition에 값을 저장하는 방식](/images/compose-remember-composition-memory.svg)

이걸 내부 용어에 조금 가깝게 말하면 positional memoization에 가깝다. 값이 변수 이름으로 저장된다기보다, Composition 안에서의 위치와 순서에 연결되어 저장된다고 볼 수 있다.

그래서 `remember`는 아래처럼 이해하면 좋다.

```text
remember 블록은 값을 만드는 코드다.
Compose는 그 결과를 Composition의 특정 위치에 저장한다.
같은 위치가 다시 실행되면 저장된 값을 돌려준다.
```

## remember는 매번 실행되지 않는다

`remember`를 처음 볼 때 많이 헷갈리는 부분이 있다.

```kotlin
val user = remember {
    createUser()
}
```

이 코드를 보고 `createUser()`가 recomposition마다 실행된다고 생각할 수 있다. 하지만 그렇지 않다.

`remember` 안의 블록은 기본적으로 처음 값을 만들 때 실행된다. 이후 같은 위치의 recomposition에서는 이전 값을 반환한다.

이 차이를 의식하지 않으면 다음과 같은 실수를 할 수 있다.

```kotlin
@Composable
fun UserName(userId: String) {
    val userName = remember {
        loadName(userId)
    }

    Text(userName)
}
```

처음 `userId`가 `"A"`였다면 `loadName("A")` 결과가 저장된다. 그런데 나중에 `userId`가 `"B"`로 바뀌어도 `remember` 블록은 다시 실행되지 않을 수 있다. 그러면 화면은 여전히 `"A"`의 이름을 보여줄 수 있다.

이럴 때는 key가 필요하다.

```kotlin
@Composable
fun UserName(userId: String) {
    val userName = remember(userId) {
        loadName(userId)
    }

    Text(userName)
}
```

`remember(userId)`는 `userId`가 같으면 이전 값을 쓰고, `userId`가 바뀌면 블록을 다시 실행한다.

![remember key 설명](/images/compose-remember-key.svg)

이렇게 읽으면 된다.

```text
remember { ... }
= 같은 위치면 계속 기억한다.

remember(key) { ... }
= 같은 위치이고 key도 같으면 기억한다.
  key가 바뀌면 다시 만든다.
```

## key는 의존성 목록에 가깝다

`remember`의 key는 "이 값이 무엇에 의존하는가"를 표현한다.

```kotlin
val fullName = remember(firstName, lastName) {
    "$firstName $lastName"
}
```

`fullName`은 `firstName`과 `lastName`에 의존한다. 둘 중 하나가 바뀌면 새로 계산되어야 한다. 그래서 key에 둘 다 넣는다.

반대로 의존하지 않는 값을 key에 넣으면 불필요하게 다시 계산된다.

```kotlin
val formatter = remember(currentTimeMillis) {
    DateTimeFormatter.ofPattern("yyyy.MM.dd")
}
```

`formatter`는 현재 시간에 의존하지 않는다. 그런데 `currentTimeMillis`가 자주 바뀐다면 `formatter`도 계속 다시 만들어질 수 있다.

key를 너무 적게 넣으면 오래된 값을 계속 쓰는 문제가 생긴다. key를 너무 많이 넣으면 기억의 의미가 줄어든다.

좋은 기준은 단순하다.

```text
remember 안에서 만드는 값이 어떤 입력에 의존하는가?
그 입력만 key로 넣는다.
```

## remember는 값의 생명주기를 Composable에 맞춘다

`remember`는 영원히 기억하지 않는다.

Composable이 Composition에 남아 있는 동안만 기억한다. 해당 Composable이 Composition에서 빠지면 그 안의 `remember` 값도 잊힌다.

예를 들어 다이얼로그를 보자.

```kotlin
@Composable
fun Screen(showDialog: Boolean) {
    if (showDialog) {
        EditDialog()
    }
}

@Composable
fun EditDialog() {
    val draft = remember { DraftText() }

    Text(draft.value)
}
```

`showDialog`가 `true`이면 `EditDialog`가 Composition에 들어온다. 이때 `remember` 값이 만들어진다.

`showDialog`가 `false`가 되면 `EditDialog`는 Composition에서 빠진다. 이때 `EditDialog` 안의 `remember` 값도 함께 사라진다.

나중에 다시 `showDialog`가 `true`가 되면 `EditDialog`는 새로 들어온다. 그러면 `remember`도 새 값을 만든다.

![remember 생명주기](/images/compose-remember-lifetime.svg)

이 점이 중요하다.

```text
remember는 Composable이 살아 있는 동안의 기억이다.
화면에서 사라진 뒤에도 계속 보관해야 하는 데이터에는 맞지 않는다.
```

## remember와 화면 회전

`remember`는 Composition 안에서 값을 기억한다. 그래서 일반적인 recomposition에는 유지된다.

하지만 화면 회전 같은 configuration change가 발생하면 Activity가 재생성될 수 있다. 그러면 기존 Composition도 새로 만들어진다. 이 경우 단순 `remember` 값은 사라질 수 있다.

사용자가 입력하던 텍스트처럼 화면 회전 후에도 유지해야 하는 값이라면 `rememberSaveable`을 검토한다.

```kotlin
var query by rememberSaveable {
    mutableStateOf("")
}
```

여기서도 `mutableStateOf`는 다음 글의 주제라 자세히 보지는 않겠다. 지금은 `rememberSaveable`이 `remember`보다 더 오래 살아남을 수 있게 저장 가능한 값을 Bundle 기반으로 보존한다는 정도만 잡으면 된다.

더 오래 살아야 하는 데이터는 ViewModel이나 SavedStateHandle 쪽으로 올라가는 편이 맞을 수 있다.

대략 이렇게 나눌 수 있다.

```text
recomposition 사이에서만 유지하면 된다 -> remember
화면 회전 후에도 유지해야 한다 -> rememberSaveable
비즈니스 흐름이나 화면 상태의 기준이다 -> ViewModel / State holder
프로세스 종료 후 복원까지 고려한다 -> SavedStateHandle / persistence
```

## remember는 캐시지만, 아무거나 넣는 캐시는 아니다

`remember`는 값 재사용이라는 점에서 캐시처럼 느껴진다. 하지만 일반적인 전역 캐시와는 다르다.

`remember`는 Composable의 생명주기에 묶여 있다. 그래서 UI와 함께 살고, UI가 사라지면 같이 사라지는 값에 적합하다.

좋은 예시는 이런 것들이다.

- recomposition마다 새로 만들 필요가 없는 formatter
- Composable 생명주기 안에서 유지할 helper object
- animation, interaction, focus처럼 UI에 가까운 상태 객체
- 계산 비용이 조금 있고 입력이 명확한 파생 값

예를 들면 formatter는 괜찮다.

```kotlin
@Composable
fun DateText(date: LocalDate) {
    val formatter = remember {
        DateTimeFormatter.ofPattern("yyyy년 M월 d일")
    }

    Text(formatter.format(date))
}
```

반대로 repository, database, network client처럼 화면보다 오래 살아야 하는 객체를 `remember`로 만드는 것은 보통 좋은 방향이 아니다.

```kotlin
@Composable
fun UserScreen() {
    val repository = remember {
        UserRepository()
    }
}
```

이런 객체는 DI, ViewModel, application scope 등 더 적절한 생명주기에서 관리하는 편이 낫다.

## remember 안에서 부작용을 실행하지 않기

`remember` 블록은 값을 만드는 곳이다. 네트워크 요청, 로그 전송, 화면 이동 같은 부작용을 넣는 곳이 아니다.

아래 코드는 피하는 편이 좋다.

```kotlin
val profile = remember(userId) {
    blockingProfileApi.fetch(userId)
}
```

이 코드는 단순해 보이지만 `remember`가 부작용의 실행 시점을 관리하는 도구처럼 쓰이고 있다. `userId`가 바뀌면 다시 실행될 수 있고, Composable이 Composition에서 빠졌다 들어오면 다시 실행될 수 있다. 에러 처리, 취소, 로딩 상태도 애매해진다.

비동기 작업은 보통 `LaunchedEffect`, ViewModel, repository layer 같은 위치가 더 적절하다.

```kotlin
LaunchedEffect(userId) {
    viewModel.loadProfile(userId)
}
```

`remember`는 "값을 기억"하는 도구이지, "작업을 실행"하는 도구가 아니다.

이 차이를 분리해두면 Compose 코드가 훨씬 예측 가능해진다.

## rememberUpdatedState는 왜 따로 있을까

`remember`를 공부하다 보면 `rememberUpdatedState`도 곧 마주친다.

이름이 비슷해서 헷갈릴 수 있지만 목적이 다르다.

`remember`는 값을 기억한다.

`rememberUpdatedState`는 오래 실행되는 effect 안에서 최신 값을 참조하고 싶을 때 쓴다.

예를 들어 `LaunchedEffect(Unit)` 안에서 시간이 지난 뒤 콜백을 호출해야 한다고 해보자.

```kotlin
@Composable
fun SplashScreen(onTimeout: () -> Unit) {
    val currentOnTimeout by rememberUpdatedState(onTimeout)

    LaunchedEffect(Unit) {
        delay(2000)
        currentOnTimeout()
    }
}
```

`LaunchedEffect(Unit)`은 key가 바뀌지 않으면 재시작되지 않는다. 하지만 `onTimeout` lambda는 recomposition으로 바뀔 수 있다. 이때 effect는 재시작하지 않으면서 최신 lambda를 보고 싶다. 그럴 때 `rememberUpdatedState`가 필요하다.

처음부터 이걸 깊게 알 필요는 없다. 다만 `remember`가 익숙해진 다음에는 side effect 문서에서 `rememberUpdatedState`를 이어서 보면 좋다.

## 내부적으로는 위치가 중요하다

조금 더 깊게 들어가 보자.

Compose Compiler는 `@Composable` 함수를 일반 함수처럼만 보지 않는다. Composition을 관리하기 위해 내부적으로 Composer를 전달하고, 호출 위치를 그룹처럼 기록한다.

우리가 이런 코드를 쓰면:

```kotlin
@Composable
fun ProfileCard(user: User) {
    val formatter = remember {
        DateTimeFormatter.ofPattern("yyyy.MM.dd")
    }

    Text(formatter.format(user.createdAt))
}
```

Compose Runtime은 대략 이런 일을 한다고 볼 수 있다.

```text
ProfileCard 그룹 시작
-> remember 호출 위치 확인
-> 저장된 값이 없으면 block 실행 후 저장
-> 저장된 값이 있으면 그 값을 반환
-> Text 구성
ProfileCard 그룹 종료
```

이때 remember 값은 변수 이름 `formatter`에 저장되는 것이 아니다. Composition 안의 해당 위치에 저장된다.

그래서 조건문이나 리스트에서 위치가 바뀌는 경우에는 주의가 필요하다.

```kotlin
@Composable
fun UserList(users: List<User>) {
    Column {
        users.forEach { user ->
            UserRow(user)
        }
    }
}
```

리스트 중간에 아이템이 추가되거나 삭제되면 각 item의 위치가 달라질 수 있다. Compose는 call site와 실행 순서를 기준으로 Composition을 추적하기 때문에, 이런 상황에서는 안정적인 key를 제공하는 것이 중요해진다.

```kotlin
@Composable
fun UserList(users: List<User>) {
    Column {
        users.forEach { user ->
            key(user.id) {
                UserRow(user)
            }
        }
    }
}
```

LazyColumn이라면 `items`의 `key` 파라미터를 쓰는 편이 일반적이다.

```kotlin
LazyColumn {
    items(
        items = users,
        key = { user -> user.id }
    ) { user ->
        UserRow(user)
    }
}
```

이 이야기는 `remember`를 이해하는 데 중요하다. remember는 "이 Composable의 이 위치에 저장된 값"이라는 성격이 있기 때문이다. 위치가 흔들리는 UI에서는 key로 정체성을 알려줘야 한다.

## remember가 필요 없는 경우도 많다

`remember`를 배우면 모든 값에 붙이고 싶어진다. 하지만 그럴 필요는 없다.

아래 코드는 굳이 remember가 필요 없다.

```kotlin
@Composable
fun Greeting(name: String) {
    val message = "안녕하세요, $name"

    Text(message)
}
```

문자열 하나 만드는 비용은 매우 작다. recomposition 때 다시 계산되어도 큰 문제가 없다. 오히려 `remember(name)`을 붙이면 코드가 더 무거워진다.

```kotlin
val message = remember(name) {
    "안녕하세요, $name"
}
```

이런 코드는 대개 과하다.

`remember`는 아래 조건 중 하나가 있을 때 검토하면 좋다.

- recomposition 사이에서 같은 인스턴스를 유지해야 한다.
- 객체 생성 비용이 의미 있게 크다.
- 입력이 같을 때 계산 결과를 재사용하고 싶다.
- UI 생명주기 안에서만 유지되는 상태가 필요하다.

반대로 단순한 문자열 조합, 가벼운 조건문, 간단한 숫자 계산에는 보통 필요 없다.

## remember를 쓰면 안심해도 되는 걸까

아니다. `remember`는 값을 기억하게 해주지만, 그 값이 올바른 생명주기에 있는지는 여전히 개발자가 판단해야 한다.

예를 들어 화면에 보이는 임시 필터 선택값은 `remember`에 어울릴 수 있다.

```kotlin
var selectedTab by remember { mutableStateOf(0) }
```

하지만 서버에서 받아온 상품 목록 자체를 화면 함수 안에서 `remember`로 들고 있는 것은 애매하다. 그 데이터는 화면보다 긴 생명주기를 가질 수 있고, 로딩, 에러, 재시도, 캐싱 정책과 연결된다. 그런 값은 ViewModel이나 data layer에서 관리하는 편이 자연스럽다.

`remember`는 UI 가까이에 있는 짧은 기억을 담당한다.

```text
화면이 살아 있는 동안 잠깐 기억할 값인가?
recomposition 사이에서만 유지되면 충분한가?
그 값의 생성과 폐기가 UI 생명주기와 맞는가?
```

이 질문에 "그렇다"라고 답할 수 있으면 `remember`가 좋은 후보가 된다.

## MVI와 연결해서 보면

MVI 글에서 이런 코드가 나왔다.

```kotlin
var state by remember { mutableStateOf(CounterState()) }
```

이제 이 줄을 조금 나눠서 볼 수 있다.

`CounterState()`는 화면의 초기 상태다.

`mutableStateOf`는 값이 바뀌었을 때 Compose가 관찰할 수 있게 만드는 상태 상자다. 이건 다음 글에서 더 볼 것이다.

`remember`는 그 상태 상자 자체를 recomposition 사이에서 유지한다.

만약 `remember`가 없다면, Composable이 다시 실행될 때마다 상태 상자를 새로 만들 수 있다. 그러면 사용자가 `+1`을 눌러도 화면이 다시 그려지는 과정에서 상태가 초기값으로 돌아가는 흐름이 생길 수 있다.

그래서 이 줄에서 `remember`의 역할은 꽤 분명하다.

```text
CounterState를 담는 상태 상자를
Composable이 다시 실행되어도 잃어버리지 않게 붙잡아 둔다.
```

MVI 관점에서도 중요하다. MVI는 `State`를 기준으로 화면을 설명한다. 그런데 그 `State`를 담는 상자를 recomposition마다 새로 만들면 흐름이 유지되지 않는다.

즉 `remember`는 작은 샘플에서 "로컬 상태 저장소" 역할을 한다. 실무에서는 이 역할이 ViewModel의 StateFlow나 state holder로 올라갈 수 있지만, 원리는 같다.

```text
화면은 다시 실행될 수 있다.
그래도 화면 상태의 기준점은 유지되어야 한다.
remember는 그 기준점을 Composition 안에 묶어준다.
```

## 자주 헷갈리는 질문

`remember`는 recomposition을 막아주는 도구일까?

아니다. `remember`는 값을 기억하는 도구다. recomposition 자체를 막는 도구가 아니다. 값이 바뀌어서 recomposition이 필요하면 UI는 다시 실행될 수 있다.

`remember` 안의 값은 화면 회전 후에도 남을까?

일반적으로 보장되지 않는다. 화면 회전처럼 Activity가 재생성되는 상황까지 보존하려면 `rememberSaveable`, ViewModel, SavedStateHandle 등을 고려한다.

`remember`는 ViewModel을 대체할까?

아니다. `remember`는 Composition 생명주기에 묶인 기억이다. 화면의 비즈니스 상태나 여러 화면에서 공유되는 상태는 ViewModel이나 별도 state holder가 더 적절할 수 있다.

`remember` 안에서 suspend 함수를 호출해도 될까?

일반적으로 아니다. 비동기 작업은 `LaunchedEffect`나 ViewModel 쪽에서 다루는 편이 좋다. `remember`는 값을 만들고 기억하는 용도로 두는 것이 안전하다.

key는 언제 넣어야 할까?

remember 안에서 만드는 값이 외부 입력에 의존하고, 그 입력이 바뀌면 값도 다시 만들어져야 할 때 넣는다.

## 공부할 때 같이 보면 좋은 글

이번 글을 쓰면서 다시 볼 만한 자료를 공식 문서 중심으로 골라봤다.

- [Thinking in Compose](https://developer.android.com/develop/ui/compose/mental-model)
- [State and Jetpack Compose](https://developer.android.com/develop/ui/compose/state)
- [Lifecycle of composables](https://developer.android.com/develop/ui/compose/lifecycle)
- [Side-effects in Compose](https://developer.android.com/develop/ui/compose/side-effects)
- [Save UI state in Compose](https://developer.android.com/develop/ui/compose/state-saving)
- [Jetpack Compose state codelab](https://developer.android.com/codelabs/jetpack-compose-state)

처음에는 `State and Jetpack Compose`와 `Lifecycle of composables`를 먼저 보는 편이 좋다. `remember`가 왜 필요한지, Composable이 Composition에 들어오고 나가는 것이 어떤 의미인지 같이 잡히기 때문이다.

그 다음 `Side-effects in Compose`를 보면 `rememberUpdatedState`, `LaunchedEffect`, `DisposableEffect` 같은 API가 왜 따로 존재하는지 조금 더 자연스럽게 이어진다.

## 정리

`remember`는 Compose를 처음 볼 때 작아 보이지만, 사실 꽤 중요한 API다.

Composable은 다시 실행될 수 있다. 일반 지역 변수는 다시 실행될 때 새로 만들어진다. 그래서 recomposition 사이에서 유지해야 하는 값은 함수 안 어딘가가 아니라 Composition의 기억 공간에 남겨야 한다.

그 일을 하는 도구가 `remember`다.

```kotlin
val value = remember {
    createValue()
}
```

이 코드는 단순히 값을 만드는 코드가 아니다.

```text
처음에는 값을 만들고,
같은 위치가 다시 실행되면 이전 값을 돌려받고,
Composition에서 빠지면 그 기억도 사라진다.
```

`remember`를 이해하면 `mutableStateOf`, `rememberSaveable`, `LaunchedEffect`, 그리고 MVI 샘플의 상태 보관 코드가 훨씬 덜 낯설어진다.

오늘은 여기까지만 잡아도 충분하다.

```text
remember는 다시 그려지는 화면 안에서
잃어버리면 안 되는 짧은 기억을 Composition에 붙잡아두는 도구다.
```

## 함께 읽기

- [[compose-recomposition-understanding|Compose Recomposition, 화면은 왜 다시 그려질까]]
- [[mvi-basic-counter-sample|MVI Counter 샘플로 상태 흐름 이해하기]]
- [[ui-layer-state-holder-saving-state|State Holder와 저장 가능한 상태를 구분하기]]
