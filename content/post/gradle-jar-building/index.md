---
title: Building Java Archive(JAR) using Gradle
date: 2023-04-10
slug: Building-Java-Archive(JAR)-using-Gradle
categories:
    - gradle
draft: false
---

# Building Java Archive(JAR) using Gradle

# Ref.

- https://docs.gradle.org/current/samples/sample_building_java_libraries.html 
- https://docs.gradle.org/current/userguide/java_library_plugin.html


```
sun@sunui-MacBookAir ~ % mkdir demo
sun@sunui-MacBookAir ~ % cd demo 
sun@sunui-MacBookAir demo % ls
sun@sunui-MacBookAir demo % clear

sun@sunui-MacBookAir demo % gradle init

Select type of project to generate:
  1: basic
  2: application
  3: library
  4: Gradle plugin
Enter selection (default: basic) [1..4] 3

Select implementation language:
  1: C++
  2: Groovy
  3: Java
  4: Kotlin
  5: Scala
  6: Swift
Enter selection (default: Java) [1..6] 4

Select build script DSL:
  1: Groovy
  2: Kotlin
Enter selection (default: Kotlin) [1..2] 1

Project name (default: demo): 
Source package (default: demo): 
Enter target version of Java (min. 7) (default: 11): 
Generate build using new APIs and behavior (some features may change in the next

> Task :init
Get more help with your project: https://docs.gradle.org/8.1/samples/sample_building_kotlin_libraries.html

BUILD SUCCESSFUL in 1m 43s
2 actionable tasks: 2 executed
sun@sunui-MacBookAir demo % ls
gradle      gradlew     gradlew.bat lib     settings.gradle


```


Structures:

```
├── gradle 
│   └── wrapper
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
├── gradlew 
├── gradlew.bat 
├── settings.gradle 
└── lib
    ├── build.gradle 
    └── src
        ├── main
        │   └── java 
        │       └── demo
        │           └── Library.java
        └── test
            └── java 
                └── demo
                    └── LibraryTest.java
```