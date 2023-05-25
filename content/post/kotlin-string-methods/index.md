---
title: kotlin 에서 알고리즘 풀이할때 유용한 String Methods 모음
date: 2023-01-01
slug: kotlin-string-methods
categories:
    - kotlin
draft: false
---

해당 내용은 계속 업데이트할 예정입니다.


- length: 문자열의 길이를 반환합니다. (공백도 포함)
```kotlin
val str = "Hello"
val length = str.length // 5
```

- isEmpty: 문자열이 비어 있는지 확인합니다.
```kotlin
val str = ""
val isEmpty = str.isEmpty() // true
```

- isNullOrEmpty: 문자열이 null 또는 비어 있는지 확인합니다.
```kotlin
val str1: String? = null
val str2 = ""
val isNullOrEmpty1 = str1.isNullOrEmpty() // true
val isNullOrEmpty2 = str2.isNullOrEmpty() // true
```

- substring: 문자열의 일부분을 추출합니다.
```kotlin
val str = "Hello, World!"
val substring = str.substring(0, 5) // "Hello"
```

- split: 문자열을 특정 구분자를 기준으로 분할하여 배열로 반환합니다.
```kotlin
val str = "apple,banana,orange"
val fruits = str.split(",") // ["apple", "banana", "orange"]
```


- replace: 문자열에서 특정 문자 또는 패턴을 다른 문자열로 대체합니다.
```kotlin
val str = "Hello, World!"
val replaced = str.replace("World", "Kotlin") // "Hello, Kotlin!"
```

- trim: 문자열의 앞뒤에 있는 공백을 제거합니다.
```kotlin
val str = "   Hello, World!   "
val trimmed = str.trim() // "Hello, World!"
```

- toCharArray: 문자열을 문자 배열로 변환합니다.
```kotlin
val str = "Hello"
val charArray = str.toCharArray() // ['H', 'e', 'l', 'l', 'o']
```

- startsWith / endsWith: 문자열이 특정 접두사 또는 접미사로 시작하는지 또는 끝나는지 확인합니다
```kotlin
val str = "Hello, World!"
val startsWithHello = str.startsWith("Hello") // true
val endsWithWorld = str.endsWith("World") // true
```

- indexOf / lastIndexOf: 문자열에서 특정 문자 또는 문자열의 첫 번째 또는 마지막 인덱스를 반환합니다.
```kotlin
val str = "Hello, World!"
val firstIndex = str.indexOf("o") // 4
val lastIndex = str.lastIndexOf("o") // 8
```