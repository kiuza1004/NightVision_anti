# ARGON OPTICS // Ar-18 전술 야간 투시경 앱 개발 명세서 (Project Specification)

본 문서는 **NightVision_anti (ARGON OPTICS Ar-18)** 웹 애플리케이션의 아키텍처, 광학 ISP 파이프라인, 알고리즘 구현, UI/UX 구조, 하드웨어 제어 및 배포 체계를 상세하게 기록한 종합 기술 문서입니다.

---

## 1. 프로젝트 개요

| 항목 | 상세 내용 |
| :--- | :--- |
| **프로젝트명** | ARGON OPTICS // Ar-18 Tactical Night Vision Web App |
| **버전** | v4.3 (Credibility Hybrid HD Low-Light ISP Edition) |
| **최종 업데이트** | 2026-11-20 |
| **실행 환경** | Windows Standalone 단일 실행파일(.exe), 모바일 및 PC 모던 브라우저 |
| **기술 스택** | HTML5, CSS3, Vanilla JavaScript (ES6+), Canvas 2D API, Web Audio API, MediaDevices API |
| **의존성** | 외부 서드파티 라이브러리 0개 (Zero External Dependency, Zero Build Tool) |
| **연산 방식** | 100% 온디바이스(On-Device) 실시간 60fps 클라이언트 연산 (비용 0원, 개인정보 유출 위험 없음) |
| **배포 환경** | GitHub Pages 자동 배포, GitHub Actions Windows 실행파일(.exe) 자동 빌드, 로컬 웹 서버 |

---

## 2. 파일 및 디렉토리 구조

```
NightVision_anti/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # GitHub Pages 자동 배포 워크플로우
│       └── build-exe.yml       # GitHub Actions Windows 단일 실행파일(.exe) 자동 빌드
├── __pycache__/                # 파이썬 캐시 디렉토리
├── .gitignore                  # Git 제외 설정
├── app.js                      # 차세대 HD 야간 투시 광학 ISP, 레이더, 장노출 등 핵심 로직
├── build_exe.bat               # Windows 로컬 1클릭 .exe 실행파일 빌드 배치 스크립트
├── icon.ico                    # Windows 실행파일 및 데스크톱 고해상도 아이콘
├── icon.png                    # 앱 및 PWA 전술 아이콘 (512x512)
├── index.html                  # 전술 HUD 뷰포트 및 통합 컨트롤 데크 마크업
├── manifest.json               # PWA 설치 매니페스트 설정
├── PROJECT_SPECIFICATION.md    # [본 문서] 시스템 종합 개발 명세서
├── README.md                   # 기본 소개 및 실행 가이드
├── server.py                   # Python 3 표준 모듈 로컬 서버 & PyInstaller 엔트리포인트
├── start_server.bat            # Windows 1클릭 실행 배치 파일
├── style.css                   # 전술 사이버옵틱스 UI 테마 및 반응형 스타일시트
└── sw.js                       # PWA 오프라인 캐싱 서비스 워커
```

---

## 3. 핵심 광학 ISP 파이프라인 (bug_search 검증 하이브리드 엔진)

본 애플리케이션의 핵심은 `bug_search` 프로젝트에서 실증된 고성능 저조도 ISP 파이프라인을 계승·발전시킨 실시간 영상 복원 엔진입니다.

### 3.1 듀얼 뷰포트 아키텍처 (Native Video & Off-Canvas)
- **일반 모드 (평상시)**: 야간투시 캔버스(`#nightVisionCanvas`)를 숨기고 브라우저 네이티브 비디오(`#cameraVideo`)를 뷰포트에 1:1 직접 출력하여, 지연시간 0 및 1080p 원본 그대로의 크리스탈 화질 제공.
- **야간투시 모드**: 캔버스를 활성화하고 하드웨어 수광 보정을 가동하여 초저조도 복원 파이프라인 연결.

### 3.2 S-Curve 하이브리드 고정 LUT & 노이즈 플로어 억제
- 거듭제곱 감마 리프트 시 발생하는 어두운 노이즈가 자글자글 하얗게 뜨는 현상을 원천 차단:
  - $v < 8$ (센서 열잡음 플로어): $\text{val} \times \frac{v}{8.0}$로 완만하게 억제하여 순수 블랙 안정화.
  - $8 \le v < 80$ (사물 암점): $1.08\times$ 콘트라스트 기울기 부여로 식별력 극대화.
- 단계별 감마: 1단 표준($\gamma = 0.44$, 3배) / 2단 강력($\gamma = 0.32$, 4.5배) / 3단 극강($\gamma = 0.24$, 8배).

### 3.3 8x6 그리드 국소 동적 영역 제어 (Local Dynamic Range Booster)
- 전체 화면을 8x6(48블록)으로 나누어 각 블록의 평균 휘도($b_{\text{avg}}$) 측정:
  - $b_{\text{avg}} < 30$ (칠흑 같은 암부 블록): 국소 게인 $1.20\times$ 확장.
  - $b_{\text{avg}} < 65$ (그늘진 영역 블록): 국소 게인 $1.10\times$ 확장.
  - $b_{\text{avg}} \ge 65$ (밝은 조명/배경 블록): 국소 게인 $1.0\times$ 유지 (**백화 100% 원천 차단**).

### 3.4 모션 적응형 안티-고스팅 시간축 노이즈 제거 (Anti-Ghosting Motion Temporal DNR)
- 프레임 간 모션 시프트 감지:
  - 카메라 빠른 회전/패닝 시 ($\Delta \text{shift} > 4.5$): $\alpha = 0.22$로 잔상(Ghosting) 완전 배제.
  - 카메라 정지 안정 시: $\alpha = 0.74$로 열잡음을 완벽하게 평활화.
  - 픽셀 차이 $\Delta G < 26$인 정지 영역만 가중 적분하고, 움직이는 객체는 즉각 반응.

### 3.5 엣지 적응형 4방향 고주파 언샤프 샤프닝 (Edge-Adaptive High-Boost Sharpening Pass)
- 4방향 라플라시안 고주파 성분 추출:
  $$\text{lap} = 4 \times c - (l + r + u + d)$$
- 평탄한 암부 센서 노이즈($|\text{lap}| < 6$)는 건너뛰고, 유효 엣지($|\text{lap}| \ge 6$)에만 샤프닝 게인을 인가하여 어둠 속에서도 글씨와 사물 윤곽선을 칼같이 선명하게 복원.
저조도 센서 증폭 시 발생하는 극심한 열잡음(Thermal/Chroma Noise)을 제거하기 위해 프레임 간 시간축 적분을 수행합니다.
- 사전 할당된 `Float32Array(width * height * 3)` 버퍼(`nvAccumBuffer`)를 활용해 가비지 컬렉션(GC) 발생을 제거.
- **모션 적응형 적분 계수 ($\alpha$)**:
  - 정지 배경 (픽셀 변화 $|\text{finalG} - \text{prevG}| < 26$): $\alpha = 0.72$ 적용 (이전 프레임 72% + 현재 프레임 28% 적분하여 센서 노이즈 완전 평활)
  - 움직이는 동체 (픽셀 변화 $\ge 26$): $\alpha = 0.22$ 적용 (현재 프레임 78% 반영하여 동체 번짐 및 잔상 원천 억제)

### 3.4 윤곽선 피킹 (Edge Peaking)
- 라플라시안/소벨 기반 수평/수직 밝기 경사도 측정:
  $$\text{edge} = |G_{x+1, y} - G_{x-1, y}| + |G_{x, y+1} - G_{x, y-1}|$$
- 임계값 42를 초과하는 윤곽 픽셀에 네온 시안 컬러(`RGB: 0, 240, 255`)를 직접 주입하여 암부 사물 윤곽을 실시간 강조.

---

## 4. 6종 전술 광학 스펙트럼 필터

1. **트루컬러 야간 (TrueColor NV - 기본값)**:
   - 원본 RGB 채널의 채도를 보존하면서 휘도 성분과 감마 리프트를 블렌딩 ($R \times 0.6 + L \times 0.4$)하여 대낮처럼 자연스러운 색감 복원.
2. **P43 그린 (Emerald Phosphor)**:
   - 군용 야간 투시경에 사용되는 P43 형광체 에메랄드 녹색 파장 대역 재현 ($R: L \times 0.12, G: L \times 1.0, B: L \times 0.22$).
3. **Ar-18 시안 (Cyan High-Contrast)**:
   - 아르곤(Ar) 플라즈마 특유의 아이스 시안 고대비 모노크롬 투시 ($R: L \times 0.18, G: L \times 0.95, B: L \times 1.0$).
4. **윤곽 강조 (Mono High-Pass)**:
   - 어둠 속 명암 대비를 극대화하는 순수 모노크롬 ($R = G = B = L$).
5. **열화상 LUT (Thermal Ironbow)**:
   - 6개 주요 파장 구간(블랙보라 $\to$ 딥바이올렛 $\to$ 마젠타레드 $\to$ 앰버오렌지 $\to$ 옐로우 $\to$ 화이트)을 선형 보간한 256단계 RGB 룩업 테이블(`thermalLUT`) 기반 의사 열화상 스펙트럼.
6. **주간/자동 (Standard Auto)**:
   - 일반 조도에서는 자연스러운 표준 영상을 유지하다가 평균 조도 저하 시 자동으로 ISP가 단계별 개입.

---

## 5. 4대 전술 운용 모드

### [모드 00] 일반 카메라 모드 (Normal Cam - 평상시 기본값)
- **주요 기능**: GPU 가속 1:1 고화질 네이티브 렌더링, 카메라 기본 자동 노출(Auto Exposure) 유지.
- **화질 특화**: 인위적인 감마 왜곡이나 하얗게 타는 현상(White-out)이 전혀 없으며, 카메라 센서 본연의 맑고 선명한 1080p/720p HD 화질을 원본 그대로 출력.
- **전환 편의성**: 상단 원클릭 퀵 토글(`[야간투시 OFF/ON]`) 및 하단 모드 탭을 통해 언제든 즉시 야간투시 모드와 상호 전환 가능.

### [모드 01] 실시간 야간투시 (Live NV)
- **주요 기능**: 실시간 암부 선택적 ISP 렌더링, 라플라시안 샤프닝 선명도 강화, 32-bin 미니 휘도 히스토그램, 전술 HUD 조준선, AUTO 조도 최적화.
- **터치 4X / 8X 정밀 돋보기 (Precision Loupe)**:
  - 뷰포트 터치 지점의 정규화 좌표($(n_x, n_y)$)를 핀으로 고정하거나 타깃을 자동 추적.
  - 별도 캔버스(`magnifierCanvas`)에 고배율 보간 렌더링(크롭 크기: 4X는 $80 \times 80$, 8X는 $40 \times 40$).
  - 정밀 십자선 및 실시간 좌표 퍼센티지 오버레이 표시.
- **원본 비교 (Compare HOLD)**:
  - 버튼을 누르고 있는 동안 감마 증폭 및 필터를 즉시 바이패스하여 원래의 어두운 카메라 영상과 즉각 비교 가능.

### [모드 02] 야간 동체 레이더 (Night Radar)
- **카메라 안정도(Stability Score) 필터링**:
  - 프레임 간 격자 샘플링 차분값을 기반으로 카메라 흔들림을 0~100% 점수화.
  - 안정도 70% 이상 및 평균 차분 7.0 미만으로 4프레임 이상 유지될 때만 이동 동체 감지 활성화 (기기 흔들림으로 인한 오탐지 원천 차단).
- **이중 차분 및 적응형 배경 모델링**:
  - 이전 프레임과의 차분($|cur - prev|$) 및 적응형 배경 버퍼와의 차분($|cur - bg|$)의 최솟값을 산출.
- **DBSCAN 기반 15px 모션 클러스터링**:
  - 반경 15px 내의 움직임 픽셀들을 그룹화하여 유효 바운딩 박스 후보군 추출.
- **다중 프레임 트랙 매칭 (Track Confirmation)**:
  - 유클리드 거리 0.12 이내의 이전 트랙과 매칭하여 히트 카운트 누적. 5회 이상 연속 포착 시 'LOCK' 확정.
  - 궤적 라인(Trail line), 락온 코너 브래킷, 타깃 ID 라벨 실시간 렌더링.
  - 표적 확정 시 경보 배너, 소나 핑 사운드(1200Hz), 모바일 햅틱 진동(45ms) 동시 트리거.

### [모드 03] 초저조도 장노출 (Astro Long Exposure)
- **노출 시간 옵션**: 1.5초 / 3.0초 / 5.0초
- **3종 누적 합성 알고리즘**:
  1. `HDR 합성 (기본값)`: 다중 프레임 평균값에 게인을 인가한 후 Reinhard 톤매핑 수식 $\frac{255 \times v}{v + 75}$을 통해 고광역 다이내믹 레인지 구현.
  2. `MAX 빛모음`: 각 픽셀 채널별 최댓값($acc = \max(acc, pixel)$)을 누적하여 별빛, 반사광, 불빛의 궤적과 미세 광원 극대화.
  3. `AVG 정밀`: 다중 프레임 산술 평균으로 랜덤 센서 노이즈를 완벽하게 제거하여 매끄러운 고화질 영상 생성.
- **프로그레시브 라이브 프리뷰**:
  - 합성 진행 중 메인 캔버스에 누적 과정을 실시간 피드백하고 퍼센티지 및 프레임 카운트 표시.
  - 합성 완료 후 즉시 고화질 스냅샷 프리뷰 토스트 노출.

---

## 6. 보조 유틸리티 및 하드웨어 연동

- **조명 제어 (Hardware Torch & Screen Backlight Ring)**:
  - 후면 카메라 플래시(`torch` 제약 조건) 지원 시 하드웨어 LED 점등.
  - 플래시가 없거나 전면 카메라일 경우 화면 가장자리에 고휘도 원형 백라이트 링(`screenTorchRing`)을 표시하여 피사체 조명 확보.
- **렌즈 전환 (Switch Camera)**:
  - 후면(`environment`)과 전면(`user`) 카메라 스트림 즉각 전환.
- **광학 디지털 줌 (Hardware & Canvas Zoom)**:
  - 카메라 하드웨어 줌(`caps.zoom`) 지원 시 우선 제어, 미지원 시 CSS 캔버스 하드웨어 가속 스케일링($1.0\times, 2.0\times, 3.0\times, 4.0\times$) 적용.
- **워터마크 스냅샷 (Tactical Snapshot)**:
  - ISP 처리된 메인 캔버스와 오버레이 HUD를 결합하고, 하단에 기기 모델, 적용 필터, 측정 조도(Lux), 타임스탬프가 각인된 전술 워터마크 바를 합성하여 PNG 자동 저장.
- **암실 시뮬레이션 데모 모드 (Simulation Mode)**:
  - 웹캠이나 스마트폰 카메라가 없는 PC 환경에서도 모든 기능을 시험할 수 있도록 인공 저조도 룸(2~14 lx) 및 랜덤 이동 엔티티를 렌더링하는 자체 가상 센서 탑재.

---

## 7. 성능 최적화 및 안정성 설계

1. **Zero-Allocation 60fps 렌더링**:
   - 프레임 루프 내부에서 `new Array`나 객체 생성을 철저히 지양하고, `Float32Array`, `Uint8Array`, `Uint32Array` 버퍼를 재사용하여 가비지 컬렉션(GC) 랙 스파이크 원천 차단.
2. **연산 해상도 분리**:
   - 모바일 기기의 발열과 배터리 소모를 방지하기 위해 ISP 연산 캔버스는 $480 \times 360$으로 최적화 운용하고, 디스플레이는 CSS/GPU 하드웨어 가속으로 화면 크기에 맞추어 업스케일링.
3. **오프스크린 캔버스 분리**:
   - 고해상도 처리용(`hiResCanvas`), 시뮬레이션용(`simCanvas`), 장노출 누적용 임시 캔버스를 메모리상에 별도 분리하여 렌더 파이프라인 간섭 배제.
4. **절전 및 백그라운드 탭 처리**:
   - `document.visibilitychange` 이벤트를 감지하여 브라우저 탭 비활성화 시 `requestAnimationFrame`을 즉시 중단하고 복귀 시 자동 재개.

---

## 8. 로컬 서버 및 네트워크 아키텍처

- **server.py**:
  - Python 3 표준 라이브러리(`http.server`, `socket`, `webbrowser`, `threading`)만 사용하여 추가 `pip install` 없이 즉시 구동.
  - `get_local_ip()` 함수를 통해 사설 IP 자동 감출 (예: `http://192.168.0.x:8080`).
  - 스마트폰 카메라 접속을 위해 브라우저 보안 플래그(`unsafely-treat-insecure-origin-as-secure`) 설정 가이드 콘솔 자동 출력.
  - 브라우저 자동 오픈 기능 및 8080 포트 점유 시 8081 포트 폴백(Fallback) 처리.
- **start_server.bat**:
  - 윈도우 환경에서 배치 파일을 더블 클릭하는 것만으로 서버 실행 및 브라우저 열기를 지원.

---

## 9. PWA (Progressive Web App) 오프라인 지원

- **manifest.json**:
  - `standalone` 디스플레이 모드, 다크 테마 컬러(`#05070c`), 전술 아이콘(`icon.png`) 등록.
- **sw.js**:
  - 핵심 애셋(`./`, `index.html`, `style.css`, `app.js`, `manifest.json`, `icon.png`)에 대한 Cache First + Network Update 전략 적용으로 오프라인 및 불완전한 네트워크 환경에서도 단독 동작 보장.

---

## 10. 결론 및 향후 확장 제언

현재 구축된 **NightVision_anti (ARGON OPTICS Ar-18)**는 순수 웹 표준 기술만으로 하드웨어 센서 제어, 비선형 톤 매핑, 다중 프레임 적분, 컴퓨터 비전 동체 추적을 매끄럽게 결합한 완성도 높은 시스템입니다. 향후 WebGL/WebGPU 셰이더 기반 파이프라인으로 전환 시 $1080\text{p} \sim 4\text{K}$ 해상도에서도 60fps 연산이 가능하도록 아키텍처가 모듈화되어 설계되었습니다.
