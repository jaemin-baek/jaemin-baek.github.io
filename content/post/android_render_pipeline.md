---
title: "Android 렌더링 파이프라인 심화: Skia, HardwareRenderer, SurfaceFlinger"
date: 2025-03-15
draft: false
categories: ["graphics"]
tags: ["android", "graphics", "skia", "surfaceflinger", "hardwareRenderer"]
description: "Android 시스템이 View를 실제 화면에 그리기까지의 전체 렌더링 파이프라인 과정을 Skia, RenderThread, HardwareRenderer, SurfaceFlinger를 중심으로 정리합니다."
---

# Android 렌더링 파이프라인 심화: Skia, HardwareRenderer, SurfaceFlinger

이 글에서는 Android 시스템이 UI를 어떻게 실제 화면에 렌더링하는지, 그 과정에 참여하는 핵심 구성 요소인 **Skia**, **RenderThread**, **HardwareRenderer**, **SurfaceFlinger**에 대해 구조적으로 살펴봅니다.

---

## 1. Android 렌더링 전체 흐름

```text
[앱의 View 계층]
      ↓
[DisplayList 생성]
      ↓
[RenderThread]
      ↓
[HardwareRenderer (Skia 활용)]
      ↓
[SurfaceFlinger]
      ↓
[Surface (Framebuffer) → 디스플레이]
```

---

## 2. Skia란?

- **Skia**는 Google에서 만든 고성능 2D 그래픽 라이브러리입니다.
- Android의 `Canvas` API는 내부적으로 Skia를 사용합니다.
- 포인트, 선, 텍스트, 곡선 등을 GPU 또는 CPU 기반으로 그릴 수 있습니다.

> 예: `canvas.drawText(...)` → Skia가 실제 텍스트 패스를 폴리곤화하여 GPU에 전달

---

## 3. RenderThread

- Android 5.0(Lollipop) 이후 도입
- View의 그리기 연산을 메인 스레드에서 분리하여 처리
- **DisplayList를 수집하고, Skia를 통해 그리기 명령을 GPU에 전달**

> 메인 스레드는 UI 이벤트와 로직 처리, RenderThread는 GPU 렌더링 전용

---

## 4. HardwareRenderer

- Skia를 통해 실제 그리기를 수행하는 핵심 클래스
- `HardwareRenderer`는 각 Window에 대한 렌더링 컨텍스트를 관리
- GPU 백엔드(OpenGL ES 또는 Vulkan)에 맞춰 최적화된 렌더링 명령 생성

> `ViewRootImpl`이 이 Renderer를 호출하여 `Surface`에 그려줌

---

## 5. SurfaceFlinger

- 안드로이드 시스템의 **디스플레이 합성 관리자**
- 앱들이 그린 Surface들을 모아서 화면에 보여주는 역할
- 각 앱은 독립된 Surface에 그림 → SurfaceFlinger가 하나의 프레임으로 합성하여 디스플레이로 전송

> **WMS(WindowManagerService)**와 통신하며, `BufferQueue` 기반으로 동작

---

## 6. 렌더링 파이프라인 전체 요약

| 단계 | 설명 |
|------|------|
| View → DisplayList | UI 계층의 그리기 명령 수집 |
| RenderThread | 메인 스레드 분리 렌더링 |
| HardwareRenderer | Skia로 GPU 명령 생성 |
| SurfaceFlinger | 여러 Surface 합성 후 화면 출력 |

---

## 7. 디버깅 팁

- `adb shell dumpsys SurfaceFlinger` → 현재 화면 레이어 구조 확인
- `GPU Rendering Profile` (개발자 옵션) → 프레임 시간 시각화
- `systrace` / `perfetto` → 전체 프레임 렌더링 타임라인 분석

---

## 마무리

Android는 단순한 View 그리기뿐 아니라, 실제로 매우 정교한 **GPU 기반 렌더링 파이프라인**을 갖추고 있습니다. 특히 Skia, HardwareRenderer, SurfaceFlinger를 이해하면 **UI 성능 최적화, 커스텀 뷰, 하드웨어 가속**에 대해 깊은 인사이트를 얻을 수 있습니다.

다음 글에서는 `BufferQueue`, `VSync`, `Triple Buffering` 같은 프레임 동기화 기술에 대해 다뤄보겠습니다.
