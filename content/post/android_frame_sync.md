---
title: "Android 프레임 동기화 기술: BufferQueue, VSync, Triple Buffering"
date: 2025-05-29
draft: false
categories: ["graphics"]
tags: ["android", "graphics", "vsync", "bufferqueue", "triple-buffering"]
description: "Android의 프레임 동기화 기술인 VSync, BufferQueue, Triple Buffering에 대해 구조적으로 설명하고, 각 기술이 어떻게 렌더링 지연과 티어링을 방지하는지 알아봅니다."
---

# Android 프레임 동기화 기술: BufferQueue, VSync, Triple Buffering

Android에서 프레임 렌더링은 단순히 GPU에서 그리는 작업으로 끝나지 않습니다. **디스플레이와 GPU 사이의 타이밍을 맞추는 동기화 기술**이 반드시 필요합니다. 이를 담당하는 핵심 기술이 **VSync**, **BufferQueue**, **Triple Buffering**입니다.

이 글에서는 이 세 가지 기술이 어떻게 Android의 부드러운 화면 출력과 성능 최적화를 돕는지 알아보겠습니다.

---

## 1. VSync (Vertical Synchronization)

- 디스플레이는 보통 초당 60번(60Hz) 화면을 갱신합니다.
- VSync는 GPU가 **디스플레이의 새로고침 주기**에 맞춰 프레임을 보내도록 강제하는 기술입니다.
- 목적: **티어링(tearing)** 현상 방지

> Tearing: GPU가 프레임을 디스플레이에 보내는 도중, 디스플레이가 화면을 갱신하면 생기는 찢어진 이미지 현상

### VSync 타이밍 흐름

```text
GPU: 프레임 준비 완료
       ↓ (대기)
Display: VSync 신호 발생
       ↓
GPU: 프레임 제출
```

---

## 2. BufferQueue

- Android에서 GPU와 디스플레이 시스템(SurfaceFlinger) 사이의 **프레임 버퍼 교환 메커니즘**
- **생산자-소비자 모델**로 작동:
  - 생산자: 앱 (예: RenderThread, GPU)
  - 소비자: SurfaceFlinger

### 구성 요소

| 구성 요소 | 역할 |
|-----------|------|
| GraphicBuffer | 실제 픽셀 데이터를 담는 버퍼 |
| BufferSlot | 버퍼들을 순환 처리하는 슬롯 (일반적으로 3개) |
| Queue/Dequeue | 버퍼를 예약하거나 소비하는 단계 |

> 앱이 프레임을 그리면 `dequeueBuffer` → GPU가 작성 → `queueBuffer` → SurfaceFlinger가 읽음

---

## 3. Triple Buffering

- 프레임 버퍼를 **3개 유지**하여 GPU와 디스플레이 간의 동기화 지연을 줄이는 기법
- Double Buffering보다 한 단계 더 유연함

### 버퍼 상태 예시

```text
[Front Buffer]   → 디스플레이가 읽는 중
[Middle Buffer]  → 다음 프레임 준비 대기 중
[Back Buffer]    → GPU가 현재 그리고 있는 중
```

이 구조 덕분에:

- GPU가 VSync를 기다리지 않고 계속 작업 가능
- 디스플레이는 가장 마지막으로 완료된 프레임을 안정적으로 표시
- 단점: 메모리 사용량 증가

---

## 4. 전체 동작 흐름 요약

```text
[App GPU Rendering]
    ↓   (dequeueBuffer)
[Back Buffer에서 그림]
    ↓   (queueBuffer)
[BufferQueue에 제출]
    ↓   (VSync 타이밍에 따라)
[SurfaceFlinger가 Middle Buffer를 Front로 전환]
    ↓
[디스플레이 출력]
```

---

## 5. 성능 디버깅 도구

| 도구 | 설명 |
|------|------|
| `dumpsys SurfaceFlinger --latency` | 프레임 시간 분석 |
| `systrace` 또는 `perfetto` | GPU / VSync 타이밍 시각화 |
| `gfxinfo` | 프레임 드롭/지연 통계 제공 |

---

## 결론

- **VSync**는 디스플레이와 GPU 타이밍 동기화
- **BufferQueue**는 프레임 전달의 중계자
- **Triple Buffering**은 지연 없이 렌더링을 이어가기 위한 메커니즘

이러한 동기화 기술 덕분에 Android는 티어링 없는 부드러운 애니메이션을 유지하면서, GPU와 디스플레이 간 효율적인 작업 분할을 수행할 수 있습니다.

다음 글에서는 `Frame Skipping`, `Jank`, `GPU Overdraw`과 같은 성능 저하 요인에 대해 다뤄보겠습니다.
