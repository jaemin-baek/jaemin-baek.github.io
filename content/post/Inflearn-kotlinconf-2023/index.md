---
title: 인프런 퇴근길 밋업 with KotlinConf'23 Global
# description: desc
date: 2023-04-25
slug: conference-inflearn-kotlinconf-2023
# image: helena-hertz-wWZzXlDpMog-unsplash.jpg
categories:
    - conference 
    - kotlin
draft: false
tags: 
    - 인프런퇴근길밋업
    - KotlinConf
---

# 인프런 퇴근길 밋업 with KotlinConf'23 Global

![인프런](1.png)
link: https://www.inflearn.com/course/kotlinconf-2023-global#program 

당일날 몸이 안좋은 상태로 참여하느라 사진이 없다..

입장시 서브웨이(치킨) + 기념품 스티커를 받았다. 

이번 세미나는 추첨방식으로 진행되었는데 경쟁률 5:1 이라고한다 (운이좋았다..)

총 2개의 세션으로 구성되어있으며 40분간 진행되었다.

인프런측에서 영상도 녹화한것 같은데 아쉽게도 아직 PPT 자료는 올라오지 않았다.

사진을 찍어둘걸하는 아쉬움이 살짝남는다



## 발표 #1 KotlinConf is back! (부제: after the party)

```
발표자: 박용권 (당근마켓)

오랜만에 열리는 KotlinConf에서는 Kotlin 프로그래밍의 최신 동향, 
발전 사항 및 모범 사례에 대해 논의하는 시간이 될 것 같습니다. 
특히 멀티플랫폼 개발, 코루틴, 컴파일러 및 메타-프로그래밍 그리고 
웹 및 클라우드 개발에 중점을 둔 인상적인 발표와 워크숍이 눈에 띄었습니다. 
이 세션에서는 KotlinConf의 기조연설을 보여 코틀린 프로그래밍의 미래를 슬그머니 짚어보려 합니다.
```

아직 PPT 자료가 없는데 아래 KotlinConf 자료를 참고하면 된다.
https://blog.jetbrains.com/ko/kotlin/2023/04/kotlinconf-2023-opening-keynote/


크게 아래 내용들로 진행되었다.

- 코틀린 버전 2.x 에 추가될 기능
- Android Studio의 디폴트 빌드 언어로 채택된 Kotlin DSL
- Kotlin Multiplatform


### 코틀린 버전 2.x 에 추가될 기능

#### Static Extensions

KT-11968 (https://youtrack.jetbrains.com/issue/KT-11968/Research-and-prototype-namespace-based-solution-for-statics-and-static-extensions)

코틀린에서 static 확장함수를 사용할 수 있는데 그것보다 이러한 토론내용들이 

youtrack 에서 어떻게 채택되고 진행되는지를 확인하는게 재밌었다. 

이런거 볼때마다 영어 학습에 대한 필요성을 느끼게 해준다.

```kotlin
fun File.static.open(name: String)
```




#### Name-based destructuring

KT-19627 (https://youtrack.jetbrains.com/issue/KT-19627)

코틀린은 구조 분해(destructuring) 라는 기능이 있다. 

클래스 내부의 변수를 순서대로 꺼내서 변수로 선언하는 기능인데

최근에 Http 통신하면서도 사용한적이있는데 기존에는 아래 예시에서 firstName 과 lastName 순서를 바꿔도 둘의 값이 변경되지 않지만

2.0 부터는 변수명에 의존해서 순서도 변경해준다. 자칫 위험할 수 있는 코드였는데 변경된다니 매우 다행..

```kotlin
data class Person(
    val firstName: String,
    val lastName: String
)

val person = Person("Jason", "Baek")
val (firstName, lastName) = person
```


#### Explicit fields

KT-14663 (https://youtrack.jetbrains.com/issue/KT-14663)


2.0 에서 가장 마음에 드는 변경점이다.

livedata 나 StateFlow 처럼 ViewModel 에서 사용할때 

사실상 같은 변수지만 변경 가능한 타입은 변수명을 언더바로 선언해서 해당 클래스 내부에서만 사용하고 

외부로 노출시킬때는 변경 불가능한 타입으로 클래스 외부에 노출시키도록 하는데 매우 번거롭고 가독성이 떨어진다.

아래와같이 매번 이렇게 똑같은 변수를 두번씩 선언하는게 여간 번거로운 작업이 아니다.

```kotlin
private val _applicationState = MutableStateFlow(State())
val applicationState: StateFlow<State>
    get() = _applicationState
```

이를 2.0 부터는 아래의 코드처럼 단순하게 선언할 수 있다.

```kotlin
val applicationState: StateFlow<State>
    field = MutableStateFlow(State())
```


#### Kotlin Notebook
이제는 파이썬뿐만 아니라 코틀린에서 노트북을 지원한다. 컨퍼런스나 온라인 코딩강의할때 매우 유용할 것 같다
https://plugins.jetbrains.com/plugin/16340-kotlin-notebook


#### Kotlin DSL
Koltin DSL 이 이제 안드로이드 스튜디오에서 gradle 기본 언어로 채택된다 (android studio giraffe 버전 부터)

매번 새프로젝트 만들때마다 kts 를 사용해야하는지 고민했는데 이제는 마음놓고 kts 로 변환해서 사용해야겠다


#### Kotlin Multiplatform
멀티플랫폼에 대해서는 필요성을 매번 느끼고 시도도 해봤지만 이런 멀티 플랫폼 프레임워크를 실무에서 사용하려면

회사차원에서도 많은 노력과 지원이 필요하다. 특히나 디바이스 스펙에 영향을 받는 미디어쪽이나 센서기능들을 이용할때 문제가 많이 발생하는데

정말 간단한 소개앱이 아니라면 아직은 시기상조이지 않을까 싶다.

해당 내용은 아래 네이버 데뷰 2023 을 참고하면 도움이 될 것 같다.

https://deview.kr/2023/sessions/564


## 발표 #2 함수형 코틀린
```
발표자: 김용욱 (달리나음)

비동기 처리에 대해 관심이 높아지며 함수형 언어에 대한 관심이 높아지고 있습니다. 
동시성 프로그래밍이나 표현력에서 함수형 프로그래밍이 장점이 있습니다. 
이번에 글로벌 컨퍼런스에서 발표되는 내용을 빠르게 팔로잉해 리캡 세션(Recap Session)을 진행합니다. 

```

이번 KotlinConf'23  에서 발표한 Urs Peter 의 자료는 못찾았지만 작년 12월달에 발표한 영상은 아래에서 찾을 수 있었다.

https://www.youtube.com/watch?v=Zz8zl4v2XXs


모나드 개념은 예전에 스쳐지나가듯이 들었던 기억이있는데 발표자분께서 코틀린의 flatMap 으로 생각하면 된다고 하셔서 어느정도 이해할 수 있었다.

그 외 객체지향에서 함수형으로 변경되었을때 어떠한 점이 좋은지 대략적으로 알 수 있었다.

물론 실무에서도 고차함수를 써가며 공통코드를 최대한 함수로 빼는 작업을 하고 있는데 

확실히 OOP 에서 함수형 프로그래밍으로 코드를 짰을때 코드의 유연함이 증가되는것을 느낄 수 있다. 

강의에서는 단순히 고차함수를 쓰는것에 멈추지않고 Arrow 사용하여 코틀린의 제한적인 기능에서 

좀 더 진보된 함수형 프로그래밍으로 짜는 방법을 알려주고있다.

그 밖에 세미나에서는 나오지 않았지만 질문자분 덕분에 Elixir 라는 함수형 라이브러리도 알 수 있었다.

아래는 if(kakao)dev2022 | 그럼에도 불구하고 Elixir: 카카오워크 서버팀의 Elixir 실용주의 프로그래밍 영상

https://www.youtube.com/watch?v=Zccv8cBzqSw



## Ref.
- https://www.youtube.com/watch?v=c4f4SCEYA5Q
- [코틀린 컨퍼런스 23 키노트 정리 (KotlinConf’23)](https://jaeyeong951.medium.com/%EC%BD%94%ED%8B%80%EB%A6%B0-%EC%BB%A8%ED%8D%BC%EB%9F%B0%EC%8A%A4-23-%ED%82%A4%EB%85%B8%ED%8A%B8-%EC%A0%95%EB%A6%AC-kotlinconf23-531a930644bf)
- [그 외 컨퍼런스 내용 링크](https://appmattus.medium.com/kotlinconf23-d03fe60af719)