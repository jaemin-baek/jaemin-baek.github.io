---
title: "Android UI 성능 저하 요인: Frame Skipping, Jank, GPU Overdraw"
date: 2025-05-29
tags: ["android", "performance", "jank", "gpu-overdraw", "frame-skipping"]
description: "Android UI에서 발생할 수 있는 성능 저하 요소인 프레임 스킵, 잔커(Jank), GPU 오버드로우(Overdraw)에 대해 개념과 원인, 해결 방법을 소개합니다."
---

# Android UI 성능 저하 요인: Frame Skipping, Jank, GPU Overdraw

Android에서 부드러운 UI와 애니메이션을 구현하기 위해서는 **60FPS(또는 그 이상)**의 일정한 프레임 유지가 중요합니다. 하지만 다양한 원인으로 인해 **프레임이 건너뛰거나 끊기는 현상**이 발생할 수 있습니다.

이 글에서는 UI 렌더링 성능을 저하시킬 수 있는 대표적인 요인인 **Frame Skipping**, **Jank**, **GPU Overdraw**를 살펴봅니다.

---

## 1. Frame Skipping (프레임 스킵)

- **Frame Skipping**은 VSync 타이밍(예: 16.6ms)을 넘겨 GPU가 프레임을 제때 제출하지 못할 때 발생합니다.
- 결과적으로 해당 프레임은 건너뛰어지고, 애니메이션이 순간적으로 끊긴 것처럼 보입니다.

### 원인

- 레이아웃 연산 과다 (`onLayout`, `onMeasure`)
- 복잡한 View 계층 또는 ConstraintLayout 오용
- 무거운 이미지 디코딩, 비효율적 메모리 사용

---

## 2. Jank (잭 or 잔커)

- **Jank**는 프레임 간 시간 간격이 일정하지 않아서 눈에 띄게 화면이 **끊기는 듯한 현상**
- Frame Skipping이 누적되면 발생
- Jank는 UX에서 매우 민감하게 인식됨

### 지표로 확인

- `FrameTime > 16.6ms` → 하나의 Jank
- 연속된 프레임 지연 → 체감 끊김이 심해짐

### 해결 방법

- **메인 스레드에서의 무거운 연산 제거**
- **레이아웃 단순화**
- Glide, Coil 등 **비동기 이미지 로딩 라이브러리 사용**

---

## 3. GPU Overdraw

- GPU가 동일한 픽셀을 여러 번 그리는 현상
- 예: 배경 → 반투명 패널 → 버튼 → 텍스트 → 그림자 등 같은 위치 픽셀을 반복 렌더링

### Overdraw 레벨

| 색상 (디버깅 모드) | 의미 |
|--------------------|------|
| 파란색 | 1회 |
| 초록색 | 2회 |
| 분홍색 | 3회 |
| 빨간색 | 4회 이상 (심각) |

### 해결 방법

- 배경 중복 제거 (e.g. `android:background` 대신 테마 활용)
- 겹치는 View 계층 최소화
- `ConstraintLayout`에서 투명한 View 중복 피하기

---

## 4. 디버깅 도구 요약

| 도구 | 설명 |
|------|------|
| `adb shell dumpsys gfxinfo` | 프레임 시간, Jank 통계 |
| Android Studio Profiler | CPU, GPU, 메모리 분석 |
| `GPU Overdraw` (개발자 옵션) | 픽셀 과다 그리기 시각화 |
| `Layout Inspector` | 뷰 계층 구조 분석 |

---

## 결론

| 성능 저하 요소 | 설명 | 해결 전략 |
|----------------|------|------------|
| Frame Skipping | 프레임 제출 실패 | 렌더링 병목 제거 |
| Jank | 불규칙한 프레임 타이밍 | View 최적화, 스레드 분리 |
| GPU Overdraw | 중복 픽셀 렌더링 | View 계층 간소화 |

안드로이드 UI 성능은 단순히 코드를 잘 짜는 것만으로는 부족합니다. **눈에 보이지 않는 렌더링 비용을 인식하고 최적화하는 시야가 중요**합니다.

다음 글에서는 `Display Refresh Rate`, `Adaptive Sync`, `Frame Pacing`과 같은 **고주사율 디스플레이 대응 전략**을 다뤄보겠습니다.
