---
title: "안드로이드에서의 GPU 렌더링 구조: Vertex Buffer와 Index Buffer 이해하기"
date: 2025-03-15
tags: ["android", "graphics", "opengl-es", "vulkan", "gpu"]
description: "Android에서 View가 어떻게 GPU에 의해 렌더링되는지, 그리고 OpenGL ES/Vulkan에서 사용하는 정점 버퍼(Vertex Buffer)와 인덱스 버퍼(Index Buffer)에 대해 설명합니다."
---

# 안드로이드에서의 GPU 렌더링 구조: Vertex Buffer와 Index Buffer 이해하기

Android 앱을 개발하면서 UI를 구성할 때 우리는 보통 XML로 `TextView`, `ImageView`, `Button` 등을 배치합니다. 그러나 이러한 UI 요소들은 실제로 화면에 표시될 때 **GPU(Graphics Processing Unit)**를 통해 렌더링됩니다. 이 렌더링은 내부적으로 어떻게 동작할까요?

이 글에서는 Android의 GPU 렌더링 구조를 이해하기 위해 **Vertex Buffer**와 **Index Buffer**를 중심으로 살펴보겠습니다.

---

## 1. GPU는 삼각형을 그리는 기계

GPU는 기본적으로 **삼각형(triangle)** 단위로 모든 그래픽을 처리합니다. 원, 사각형, 글자 등 모든 형태는 결국 **삼각형의 집합**으로 변환되어 GPU에 전달됩니다.

이를 위해 필요한 것이 바로 다음 두 가지입니다:

- **Vertex Buffer (정점 버퍼)**: 위치, 색상, 텍스처 좌표 등의 정점 데이터
- **Index Buffer (인덱스 버퍼)**: 어떤 정점들을 연결해 삼각형을 만들지에 대한 순서 정보

---

## 2. OpenGL ES / Vulkan에서의 구조

Android에서 직접 OpenGL ES나 Vulkan을 사용하는 경우, 아래와 같은 방식으로 데이터를 GPU에 전달합니다.

### 🔹 Vertex Buffer

```c
GLfloat vertices[] = {
    // x, y, r, g, b
    0.0f,  0.5f, 1.0f, 0.0f, 0.0f,  // 정점 0
   -0.5f, -0.5f, 0.0f, 1.0f, 0.0f,  // 정점 1
    0.5f, -0.5f, 0.0f, 0.0f, 1.0f   // 정점 2
};
```

정점 데이터에는 **위치 정보**와 함께 **색상, 텍스처 좌표, 법선벡터** 등이 포함될 수 있습니다.

### 🔹 Index Buffer

```c
GLuint indices[] = {
    0, 1, 2
};
```

위 예시는 정점 0-1-2를 연결하여 **삼각형 하나**를 만드는 구조입니다.

---

## 3. Android 뷰 시스템은 어떻게 렌더링할까?

일반적인 Android UI(`View`, `TextView`, `LinearLayout` 등)는 개발자가 직접 GPU 명령을 다루지는 않지만, 내부에서는 아래와 같은 과정을 거칩니다:

1. **View → DisplayList 생성**  
   View가 자신의 그리기 명령을 `DisplayList`라는 객체에 기록합니다.

2. **RenderThread → Skia → GPU 호출**  
   Android는 `Skia`라는 2D 그래픽 엔진을 사용하여 이 명령들을 GPU 친화적인 형태로 변환하고, OpenGL ES 또는 Vulkan API를 통해 GPU에 전달합니다.

3. **GPU는 결국 정점과 삼각형으로 처리**  
   사각형 버튼 하나도 두 개의 삼각형으로 분할되어 렌더링됩니다.

---

## 4. 왜 Index Buffer를 쓸까?

Index Buffer는 중복된 정점 데이터를 재사용할 수 있게 해줍니다. 예를 들어 사각형을 두 개의 삼각형으로 만들 때:

```text
정점: 0, 1, 2, 3
삼각형 1: 0, 1, 2
삼각형 2: 2, 3, 0
```

이렇게 하면 정점 2는 두 삼각형에 공유되어 메모리 사용이 효율적이고, 성능이 향상됩니다.

---

## 5. Android에서 직접 사용하는 예: OpenGL ES 예제

```c
glGenBuffers(1, &vbo);
glBindBuffer(GL_ARRAY_BUFFER, vbo);
glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

glGenBuffers(1, &ebo);
glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, ebo);
glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);

glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);
```

이 코드는 정점 버퍼와 인덱스 버퍼를 생성하고, 삼각형을 그리는 명령입니다.

---

## 6. 결론: 안드로이드에서의 GPU 렌더링 핵심 요약

| 개념 | 역할 |
|------|------|
| **Vertex Buffer** | 정점 데이터 (위치, 색상, UV 등)를 GPU에 전달 |
| **Index Buffer** | 삼각형을 구성할 정점 순서 정의 |
| **Draw Call** | 정점 + 인덱스를 이용해 삼각형을 GPU가 그림 |
| **View 시스템** | Skia와 RenderThread를 통해 내부적으로 이 구조 사용 |

즉, Android 앱에서 버튼 하나를 그리더라도, 내부적으로는 **삼각형 메쉬를 GPU가 렌더링**하고 있다는 점을 이해하면 성능 최적화나 커스텀 렌더링 구현에 큰 도움이 됩니다.

---

👉 향후에는 `HardwareRenderer`, `SurfaceFlinger`, `Skia` 등을 통해 Android의 렌더링 파이프라인을 더 깊이 있게 알아보겠습니다.
