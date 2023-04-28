---
title: About
description: 
date: '2023-04-10'
aliases:
  - about-us
  - about-hugo
  - contact
license: CC BY-NC-ND
lastmod: '2023-04-10'
draft: false
menu:
    main: 
        weight: -90
        params:
            icon: user
---


# 백재민 - 총 개발 경력 9년

## 개발 경험
1) 중국 상하이 소재 IT 기업에서의 미디어 관련 앱 개발 및 글로벌 이슈 경험
2) 5천만 MAU 및 5억 다운로드를 기록한 안드로이드 키네마스터 앱 개발
3) 2019년 구글플레이 ‘올해를 빛낸 자기계발 앱’ 우수상 수상 (키네마스터)
4) 여러 안드로이드 폼팩터에 대한 적용과 코드 베이스 개선, 레거시 코드 리팩토링
5) AAC 및 MVVM 아키텍처를 활용한 모던한 앱개발 및 경험
6) 안드로이드, iOS, 백엔드 등 전체 서비스 개발에 대한 경험
7) Jenkins, Github Actions 를 통한 CI/CD 구축 경험

## 보유 기술
1) Kotlin, Java 언어
2) Android View 및 Compose 로 UI 구현 가능
3) Canvas 사용하여 커스텀 뷰 개발 가능
4) SurfaceView, TextureView 활용한 카메라 및 동영상 프리뷰 개발 가능 
5) Retrofit 라이브러리를 활용한 JWT 토큰 갱신 및 RESTFul API 호출
6) Android AAC - Hilt, ViewModel, WorkManager, LiveData 사용 가능
7) 코루틴, Flow 등 비동기 코드 작성
8) 멀티 모듈 구성 가능
9) MVP , MVVM 설계 가능
10) LeakCanary, Memory 프로파일링 도구를 활용한 성능 분석 
11) JUnit4, Mokito, ktLint 등 테스트 도구 사용

## 경력

### 키네마스터 2017.06 ~ 2023.03
#### 동영상 편집 기능 Kinemaster 앱 개발 (안드로이드)
1. 기존 MVC 아키텍처에서 MVP 로 전환, 최종 MVVM 으로 설계하는 전 리팩토링 과정 참여
2. AAC 라이브러리에 기반한 설계 
    + LiveData, ViewModel, Navigation, Hilt, WorkManager 등
3. Retrofit, okhttp3 를 활용한 네트워크 비동기 처리 개발 경험
    + cache, etag 등 http 표준 스펙에 대한 이해 및 네트워크 성능 최적화
    + chalres 도구를 활용한 http 디버깅
    + 포스트맨을 활용한 자사 백엔드 RESTful API 자동화 테스트
4. LeakCanary 등을 활용한 메모리 프로파일링
5. SVN 에서 Github 으로 마이그레이션 및 팀내 코드리뷰 도입 
6. 다양한 폼팩터 대응을 위한 멀티 모듈 도입 및 Gradle 빌드 환경 재설계
7. 자사 동영상 Player 유지 보수 
    + 네이티브로 구현된 자사동영상 Player 를 JNI 로 포팅
    + Surface, OpenGL 등 그래픽스 관련 처리 업무 보조
    + Android Media Framework , ExoPlayer, FFMpeg 활용 경험
8. 구독 및 결제 라이브러리 적용
9. Jenkins 및 Github Actions 을 활용한 CI/CD 구축
10. 애드몹 구글 광고 라이브러리 추가
11. Java 에서 Kotlin 으로 컨버팅  
12. Firebase 를 활용한 A/B 테스트 구현
13. Canvas 를 활용한 편집 도구 UI control 개발 

### 시어스랩(Seerslab) 2016.12 ~ 2017.04
#### 얼굴 인식 카메라앱 - 롤리캠 개발 (안드로이드)
1. 레거시 코드 리팩토링 및 MVP 아키텍처로 전환
2. Firebase Realtime DB 및 Realm 을 활용한 비디오 메세징 기능 개발
3. retrofit2 활용한 에셋 다운로드 기능 구현
4. TextureView 활용한 카메라 프리뷰 개발

### Shanghai Yingsui Technology 2015.04 - 2016.09
#### 얼굴 인식 카메라앱 - Milo 개발 (안드로이드)
1. 자체 개발한 Face Detection 엔진을 Java 에서 사용할 수 있도록 JNI 로 포팅
2. TextureView 활용한 카메라 프리뷰 개발
    + 3D Rajawali 오픈소스를 활용한 3d 스티커 레이어 구현
    + Android-GPUimage 라이브러리를 활용한 카메라 필터 구현
3. 뮤직 플레이어 개발
4. 컨테이너로부터 비디오와 오디오 스트림을 분리하는 Demuxing 기능 구현
5. 배경음악과 비디오에 포함된 오디오를 Mixing 하는 기능 구현
6. Video(H.264), Audio(AAC) 를 MediaCodec, MediaMuxer 를 활용하여 최종 인코딩 및 MP4 컨테이너로 생성
7. 최종 생성된 mp4 파일을 중국 Weibo, WeChat 으로 공유하는 Share 기능 및 UI 구현
8. Share 된 동영상의 데이터를 분석할 수 있도록 데이터를 트래킹하는 모듈 구현
9. 영상편집에 사용하는 에셋을 결제하거나 다운로드 받을 수 있는 스토어 구현
10. 스토어 기능 구현에 필요한 RESTful API 설계 및 구현
11. 스토어에 등록되는 에셋들을 관리하는 웹 CMS 도구 구현
12. 중국 WeChat Pay 를 연동하여 스토어에서 결제하는 기능을 구현
13. 중국 SenseTime 회사에 최종 Face Detection 기술 엑시트

### 누스코 2014.04 ~ 2015.03
#### 안드로이드 스마트워치용 헬스케어 앱 개발
1. 심박수, 심전도, 암진단 기기 Bluetooth HDP(ISO/IEEE 11073) 기반 연동
2. 측정결과를 모니터링 할 수 있는 안드로이드 워치 및 모바일 앱 UI 구현
3. ARM Trust Zone 에 개인 의료 정보 저장 (삼성전자에서 개발한 TA-Trusted Application 의 연동)
4. 삼성SDS, 삼성전자와 협업을 통하여 삼성 IoT 기술전 공동 참가

#### OpenStack 을 활용한 데스크탑 가상화(VDI) 솔루션 구축 및 운영
1. OpenStack, Ovirt 등 오픈소스를 활용한 가상 데스크탑 호스팅 서버 구축
2. 사용자 인증 서버 구축 (AD, LDAP)
3. VDI 접속 웹 클라이언트 개발 (SPICE-html5 오픈소스 활용)
4. 외부 연구기관 (주)신테카바이오 에 50대 이상 자사 솔루션 구축

#### 사내 인프라 구축 및 운영
1. Git, Gerrit, Redmine 등 사내 개발 인프라 구축 및 운영
2. DNS 및 메일서버 (Sendmail, pop3) 구축
3. 서버 이중화 및 Network Bonding 작업  (CentOS, OpenStack 클라우드 사용)
4. 안드로이드 출퇴근앱 개발


## 외부 활동
- 2021.07 삼성 청년 SW 아카데미 게임 코딩 강사 - 2021 SSAFY 6기 스타트캠프
- 2019.12  구글플레이 ‘올해를 빛낸 자기계발 앱’ 우수상 - 키네마스터
- 2019.05 미국 구글 I/O 2019 컨퍼런스 참가
- 2019.3 네이버 커넥트 부스트코스 코드리뷰어 - 학생들이 제출한 프로젝트에 대해서 코드 리뷰 진행

