# ARGON OPTICS // Ar-18 전술 야간 투시경 (Night Vision Web App)

모바일 및 PC 브라우저에서 외부 라이브러리 설치나 빌드 과정 없이 즉시 실행 가능한 고성능 광학 야간 투시(Tactical Night Vision) PWA 웹 애플리케이션 및 Windows 단일 실행파일(.exe)입니다.

- **현재 버전**: v4.2 (High-Fidelity Normal & Zero-Blowout Night Vision ISP)
- **최종 업데이트**: 2026-11-20
- **GitHub 저장소**: [https://github.com/kiuza1004/NightVision_anti](https://github.com/kiuza1004/NightVision_anti)
- **온라인 실행 (GitHub Pages)**: [https://kiuza1004.github.io/NightVision_anti/](https://kiuza1004.github.io/NightVision_anti/)

---

## 📦 Windows 단일 실행 파일 (.exe) 빌드 및 다운로드

별도의 Python 설치 없이 **더블 클릭 한 번으로 실행되는 단일 파일(`NightVision_Ar18.exe`)**을 다음과 같이 만들거나 다운로드할 수 있습니다:

### 방법 1: GitHub Actions 클라우드 자동 빌드 및 다운로드 (추천)
1. GitHub 저장소 상단 메뉴의 **[Actions]** 탭으로 이동합니다.
2. 좌측 워크플로우 목록에서 **[Build Windows Executable (NightVision_Ar18.exe)]**를 클릭합니다.
3. 우측의 **[Run workflow]** 버튼을 클릭하여 빌드를 시작합니다 (커밋 푸시 시에도 자동 빌드).
4. 빌드가 완료되면 결과 상세 페이지 하단의 **Artifacts** 섹션에서 `NightVision_Ar18_Windows_x64`를 다운로드하여 압축을 해제합니다.
5. 생성된 `NightVision_Ar18.exe`를 더블 클릭하면 즉시 실행됩니다!

### 방법 2: 로컬 환경에서 1클릭 빌드
- Windows 탐색기에서 `build_exe.bat`를 더블 클릭하면 자동으로 PyInstaller 패키징이 수행되어 `dist\NightVision_Ar18.exe`가 생성됩니다.

---

## 🌟 주요 핵심 기술 및 기능

### 1. 평상시 일반 고화질 카메라 & 선택적 야간투시 엔진
- **평상시 일반 카메라 (Normal Cam - 기본값)**:
  - 실행 즉시 인위적인 왜곡이나 과노출(White-out) 없이 카메라 센서 본연의 맑고 선명한 1080p/720p HD 화질 출력
  - 상단 퀵버튼(`[야간투시 OFF/ON]`) 및 하단 탭으로 즉시 야간투시 모드 전환
- **선택적 야간투시 ISP (Night Vision Mode)**:
  - 암부 선택적 톤 매핑 LUT: 칠흑 같은 암부는 확실하게 밝혀주고 실내 조명/전등 등 밝은 영역은 원본을 100% 보존하여 **백화(White-out/Clipping) 현상 완전 차단**
  - **화질 극대화 샤프닝 (Edge Clarity Engine)**: 1-pass 인라인 라플라시안 샤프닝으로 사물 경계선과 텍스처를 칼같이 선명하게 복원
  - 스마트 하드웨어 수광 제어: 실제 저조도 환경에서만 안전한 수광 보정 인가 (과노출 원천 방지)
  - 모션 적응형 시간축 노이즈 적분 (Temporal DNR)으로 잔상 없는 노이즈 상쇄

### 2. 6종 전술 광학 스펙트럼 필터
1. **일반 카메라 (Standard / Original)**: 왜곡 없는 원본 고화질 자연 색감
2. **트루컬러 야간 (TrueColor NV)**: 원본 색상 왜곡 없이 어두운 곳만 선명하게 복원
3. **P43 그린 (Emerald Phosphor)**: 군용 전술 야간투시경 특유의 녹색 형광체 톤
4. **Ar-18 시안 (Cyan High-Contrast)**: 차가운 아이스 시안 계열의 고대비 투시
5. **윤곽 강조 (Mono High-Pass)**: 어둠 속 물체 윤곽선 식별 극대화 모노크롬
6. **열화상 LUT (Thermal Ironbow)**: 256단계 사전 계산 컬러 테이블 기반 의사 열화상 스펙트럼

### 3. 4대 전술 운용 모드
- **00 일반 카메라 (Normal Cam)**: 1080p 고화질 원본 카메라 (평상시 기본값)
- **01 실시간 야간투시 (Live NV)**: 암부 선택적 복원, 샤프닝 화질 특화, 돋보기(4X/8X), 원본 비교(HOLD)
- **02 야간 동체 레이더 (Night Radar)**: 어둠 속 미세 모션 감지, 표적 락온 브래킷, 소나음 & 햅틱 알림
- **03 초저조도 장노출 합성 (Astro Long Exposure)**: 1.5s/3.0s/5.0s 다중 프레임 실시간 빛 누적 합성 (HDR/MAX/AVG)

### 4. 편의 기능 & 시뮬레이션 데모
- **온디바이스 100% 처리**: 서버 통신 없이 기기 내부에서 실시간 60fps 연산 (개인정보 보호, 비용 0원)
- **암실 시뮬레이션 데모**: PC나 웹캠이 없는 환경에서도 암실 시뮬레이션으로 성능 실증 가능
- **하드웨어 토치 & 화면 백라이트 링**: 후면 플래시가 없거나 전면 카메라일 때 화면 고휘도 조명 링 가동
- **고해상도 캡처**: 광학 메타데이터 워터마크가 포함된 고화질 스냅샷 즉시 저장

---

## 🚀 로컬 실행 방법

Python 3만 설치되어 있다면 별도의 패키지 설치 없이 즉시 실행할 수 있습니다.

### Windows:
`start_server.bat` 더블 클릭

### CLI (터미널):
```bash
python server.py
```
브라우저에서 `http://localhost:8080`에 접속합니다.

---

## 📱 스마트폰 모바일 접속 팁
- PC와 스마트폰을 같은 Wi-Fi에 연결한 후 터미널에 표시된 `http://[PC_IP]:8080` 주소로 스마트폰에서 접속합니다.
- 모바일 크롬 브라우저에서 카메라 권한 허용을 위해 `chrome://flags` -> `unsafely-treat-insecure-origin-as-secure` 항목에 접속 IP를 등록하면 스마트폰 브라우저에서도 실제 카메라로 원활히 실행됩니다.
