/**
 * ARGON OPTICS // Ar-18 Tactical Night Vision Engine v4.0
 * [Real Low-Light Night Vision ISP & Astro Long Exposure Edition]
 *
 * 1. 진짜 저조도 야간 투시 엔진 (Real Low-Light Night Vision ISP):
 *    - 하드웨어 수광량 부스트(Exposure Compensation EV+) 자동 최적화
 *    - 백화(White Blowout) 없는 고정 비선형 암부 감마 리프트 LUT (gamma: 0.24 ~ 0.48)
 *    - 모션 적응형 시간축 노이즈 적분 (Temporal DNR): 정지 배경 노이즈 제거 & 동체 잔상 방지
 * 2. 6종 전술 광학 스펙트럼 필터:
 *    - 트루컬러(선명 색상 보존), P43 그린, Ar-18 시안, 윤곽 강조(Mono), Ironbow 열화상 LUT, 주간/자동
 * 3. 3대 전술 모드:
 *    - [01 실시간 야간투시]: 고정 감마 증폭 + 터치 4X/8X 정밀 돋보기 + 실시간 히스토그램
 *    - [02 야간 동체 레이더]: 어둠 속 미세 움직임 포착, 배경 엣지 제거, 소나 경보음 + 햅틱 진동
 *    - [03 초저조도 장노출]: 1.5s~5.0s 다중 프레임 빛 누적 합성 (HDR / MAX / AVG) + 라이브 프리뷰
 * 4. 카메라 하드웨어 연동 & 암실 시뮬레이션 데모 내장
 */

'use strict';

class ArgonNightVisionApp {
  constructor() {
    // -------------------------------------------------------------
    // DOM 엘리먼트 참조
    // -------------------------------------------------------------
    this.viewportStage = document.getElementById('viewportStage');
    this.video = document.getElementById('cameraVideo');
    this.nvCanvas = document.getElementById('nightVisionCanvas');
    this.nvCtx = this.nvCanvas.getContext('2d', { willReadFrequently: true });
    this.overlayCanvas = document.getElementById('detectionCanvas');
    this.overlayCtx = this.overlayCanvas.getContext('2d');
    this.histCanvas = document.getElementById('histCanvas');
    this.histCtx = this.histCanvas.getContext('2d');

    this.scanlineSweep = document.getElementById('scanlineSweep');
    this.screenTorchRing = document.getElementById('screenTorchRing');
    this.compareBanner = document.getElementById('compareBanner');
    this.alarmBanner = document.getElementById('alarmBanner');
    this.alarmTitle = document.getElementById('alarmTitle');
    this.alarmSub = document.getElementById('alarmSub');
    this.reticle = document.getElementById('reticle');

    // 돋보기 (Loupe) DOM
    this.magCard = document.getElementById('magnifierCard');
    this.magCanvas = document.getElementById('magnifierCanvas');
    this.magCtx = this.magCanvas.getContext('2d');
    this.magCaption = document.getElementById('magCaption');
    this.loupeCoord = document.getElementById('loupeCoord');
    this.loupeModeBadge = document.getElementById('loupeModeBadge');
    this.loupePowerBtn = document.getElementById('loupePowerBtn');
    this.resetPinBtn = document.getElementById('resetPinBtn');
    this.restoreMagBtn = document.getElementById('restoreMagBtn');

    // 텔레메트리 DOM
    this.statusBadge = document.getElementById('statusBadge');
    this.statusText = document.getElementById('statusText');
    this.luxValue = document.getElementById('luxValue');
    this.stabBarFill = document.getElementById('stabBarFill');
    this.fpsCounter = document.getElementById('fpsCounter');
    this.targetPill = document.getElementById('targetPill');
    this.targetCount = document.getElementById('targetCount');
    this.evBadge = document.getElementById('evBadge');

    // 장노출 합성 DOM
    this.lxLiveBanner = document.getElementById('lxLiveBanner');
    this.lxProgressTitle = document.getElementById('lxProgressTitle');
    this.lxProgressSub = document.getElementById('lxProgressSub');
    this.liveParamRow = document.getElementById('liveParamRow');
    this.astroParamRow = document.getElementById('astroParamRow');

    // 슬라이더 및 버튼 DOM
    this.subGainSlider = document.getElementById('subGainSlider');
    this.subGainVal = document.getElementById('subGainVal');
    this.autoLuxBtn = document.getElementById('autoLuxBtn');
    this.startScanBtn = document.getElementById('startScanBtn');
    this.scanBtnText = document.getElementById('scanBtnText');
    this.scanSvgIcon = document.getElementById('scanSvgIcon');
    this.torchBtn = document.getElementById('torchBtn');
    this.soundBtn = document.getElementById('soundBtn');
    this.soundWavePath = document.getElementById('soundWavePath');
    this.compareHoldBtn = document.getElementById('compareHoldBtn');
    this.switchCamBtn = document.getElementById('switchCamBtn');
    this.snapshotBtn = document.getElementById('snapshotBtn');
    this.dnrToggleBtn = document.getElementById('dnrToggleBtn');
    this.peakingToggleBtn = document.getElementById('peakingToggleBtn');
    this.reticleToggleBtn = document.getElementById('reticleToggleBtn');

    // -------------------------------------------------------------
    // 광학 해상도 및 사전 할당 버퍼 (Zero-Allocation 60fps)
    // -------------------------------------------------------------
    this.procWidth = 480;
    this.procHeight = 360;
    this.nvCanvas.width = this.procWidth;
    this.nvCanvas.height = this.procHeight;

    this.nvAccumBuffer = null; // Float32Array 다중 프레임 시간축 적분 버퍼 (w * h * 3)
    this.nvLut = new Uint8Array(256); // 256단계 비선형 감마 리프트 룩업 테이블
    this.thermalLUT = new Uint8Array(256 * 3); // 256단계 의사 열화상 RGB 룩업 테이블
    this.histBins = new Uint32Array(32); // 32-bin 휘도 히스토그램

    // 고해상도 돋보기 및 스냅샷 추출용 캔버스
    this.hiResCanvas = document.createElement('canvas');
    this.hiResCanvas.width = 640;
    this.hiResCanvas.height = 480;
    this.hiResCtx = this.hiResCanvas.getContext('2d');

    // 시뮬레이션 데모용 암실 캔버스
    this.simCanvas = document.createElement('canvas');
    this.simCanvas.width = 640;
    this.simCanvas.height = 480;
    this.simCtx = this.simCanvas.getContext('2d');
    this.isSimulation = false;
    this.simEntities = [];

    // -------------------------------------------------------------
    // 광학 파이프라인 제어 상태
    // -------------------------------------------------------------
    this.currentMode = 'live'; // 'live' | 'radar' | 'astro'
    this.currentFilter = 'truecolor'; // 'truecolor' | 'emerald' | 'argon' | 'mono' | 'thermal' | 'standard'
    this.nightGainLevel = 'max'; // 'mid' (γ=0.48) | 'max' (γ=0.34) | 'ultra' (γ=0.24)
    this.subGainMultiplier = 1.25; // 0.8 ~ 2.5 미세 부스트
    this.currentZoom = 1.0;
    this.loupeZoom = 4;
    this.useDnr = true; // Temporal DNR 활성화 여부
    this.useEdgePeaking = false; // 암부 윤곽선 강조 여부
    this.showReticle = true;
    this.isComparing = false; // 원본 비교 플래그 (HOLD)

    // 장노출 합성 파라미터
    this.lxMode = 'hdr'; // 'hdr' | 'max' | 'avg'
    this.lxDurationMs = 3000; // 1500 | 3000 | 5000
    this.isCapturingLX = false;

    // 조도 및 프레임 상태
    this.ambientBrightness = 16; // 평균 밝기 (0~255)
    this.estimatedLux = 12;
    this.stabilityScore = 95;
    this.cameraHoldingSteadyFrames = 0;
    this.prevBlurGray = null;
    this.bgFloatGray = null;

    // 표적 추적기 (레이더 모드)
    this.activeTracks = [];
    this.nextTrackId = 1;

    // 돋보기 포커스 좌표
    this.loupeFocusX = 0.5;
    this.loupeFocusY = 0.5;
    this.pinnedPoint = null;

    // 하드웨어 및 런타임 제어
    this.stream = null;
    this.facingMode = 'environment';
    this.isTorchOn = false;
    this.soundEnabled = true;
    this.audioCtx = null;
    this.lastAlarmTime = 0;
    this.isActive = true;
    this.rafId = null;

    // FPS 텔레메트리
    this.frameCount = 0;
    this.lastFpsTs = performance.now();
    this.currentFps = 60;

    // -------------------------------------------------------------
    // 초기화 루틴
    // -------------------------------------------------------------
    this.buildThermalLUT();
    this.buildNightLUT();
    this.initSimulationEntities();
    this.bindEvents();
    this.handleResize();
  }

  // -------------------------------------------------------------
  // 의사 열화상(Ironbow) 256단계 RGB 룩업 테이블 생성
  // -------------------------------------------------------------
  buildThermalLUT() {
    const stops = [
      [0, 5, 4, 30],
      [42, 60, 10, 120],
      [95, 160, 15, 95],
      [150, 235, 75, 15],
      [205, 255, 190, 20],
      [255, 255, 255, 245]
    ];
    for (let i = 0; i < 256; i++) {
      let s0 = stops[0], s1 = stops[stops.length - 1];
      for (let k = 0; k < stops.length - 1; k++) {
        if (i >= stops[k][0] && i <= stops[k + 1][0]) {
          s0 = stops[k];
          s1 = stops[k + 1];
          break;
        }
      }
      const span = Math.max(1, s1[0] - s0[0]);
      const t = (i - s0[0]) / span;
      this.thermalLUT[i * 3]     = (s0[1] + (s1[1] - s0[1]) * t) | 0;
      this.thermalLUT[i * 3 + 1] = (s0[2] + (s1[2] - s0[2]) * t) | 0;
      this.thermalLUT[i * 3 + 2] = (s0[3] + (s1[3] - s0[3]) * t) | 0;
    }
  }

  // -------------------------------------------------------------
  // [핵심 ISP] 비선형 암부 감마 리프트 룩업 테이블 (백화 방지 전구간 보존)
  // -------------------------------------------------------------
  buildNightLUT() {
    let gamma = 0.34; // 기본 2단: 칠흑 속 암부를 약 4.5배 부스트
    if (this.nightGainLevel === 'mid') {
      gamma = 0.48; // 1단 표준: 암부 약 2.5배 부스트
    } else if (this.nightGainLevel === 'ultra') {
      gamma = 0.24; // 3단 극강: 육안 식별 불가한 극저조도 8배 부스트
    }

    const mult = this.subGainMultiplier;
    for (let v = 0; v < 256; v++) {
      const norm = v / 255.0;
      // 비선형 거듭제곱으로 암부를 강하게 끌어올리고, Reinhard 소프트-니 압축으로 255 클리핑 방지
      const lifted = Math.pow(norm, gamma) * 255.0 * mult;
      // 소프트-니 압축: (255 * x) / (x + knee) 결합
      const safeVal = Math.min(255, Math.round((255 * lifted) / (lifted + 18) * 1.07));
      this.nvLut[v] = Math.max(0, Math.min(255, safeVal));
    }

    if (this.evBadge) {
      this.evBadge.textContent = `γ ${gamma.toFixed(2)} · ${this.nightGainLevel.toUpperCase()} (×${(1 / gamma * mult).toFixed(1)})`;
    }
  }

  // -------------------------------------------------------------
  // 시뮬레이션 엔티티 (데모 모드용 어둠 속 동체)
  // -------------------------------------------------------------
  initSimulationEntities() {
    this.simEntities = [
      { x: 0.35, y: 0.45, vx: 0.003, vy: -0.002, size: 4.5, phase: 0 },
      { x: 0.65, y: 0.55, vx: -0.0025, vy: 0.0035, size: 5.0, phase: 1.5 }
    ];
  }

  // -------------------------------------------------------------
  // 이벤트 바인딩
  // -------------------------------------------------------------
  bindEvents() {
    // 온보딩 모달
    document.getElementById('initCamBtn').addEventListener('click', async () => {
      document.getElementById('startModal').classList.add('hidden');
      this.initAudioContext();
      await this.startCamera();
      this.setActive(true);
    });

    document.getElementById('simModeBtn').addEventListener('click', () => {
      document.getElementById('startModal').classList.add('hidden');
      this.initAudioContext();
      this.startSimulationMode();
      this.setActive(true);
    });

    // 메인 코어 액티브 버튼
    this.startScanBtn.addEventListener('click', () => {
      this.initAudioContext();
      if (this.currentMode === 'astro') {
        this.startLongExposureCapture();
      } else {
        this.setActive(!this.isActive);
      }
    });

    // 3대 운용 모드 전환
    document.querySelectorAll('.mode-card').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchMode(btn.dataset.mode);
      });
    });

    // 광학 필터 칩 선택
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.setOpticalFilter(chip.dataset.filter);
      });
    });

    // 감마 리프트 단계 버튼
    document.querySelectorAll('[data-ngain]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-ngain]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.nightGainLevel = btn.dataset.ngain;
        this.buildNightLUT();
      });
    });

    // 미세 밝기 슬라이더
    this.subGainSlider.addEventListener('input', () => {
      this.subGainMultiplier = parseFloat(this.subGainSlider.value);
      this.subGainVal.textContent = `×${(this.subGainMultiplier * 3.6).toFixed(1)}`;
      this.buildNightLUT();
    });

    // AUTO 조도 최적화 버튼
    this.autoLuxBtn.addEventListener('click', () => {
      this.applyAutoLuxGain();
    });

    // 디지털 줌 세그먼트
    document.querySelectorAll('[data-zoom]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-zoom]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setZoom(parseFloat(btn.dataset.zoom));
      });
    });

    // 장노출 합성 모드 & 시간 선택
    document.querySelectorAll('#lxModeGroup .seg-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#lxModeGroup .seg-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.lxMode = btn.dataset.lx;
      });
    });

    document.querySelectorAll('#lxTimeGroup .seg-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#lxTimeGroup .seg-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.lxDurationMs = parseFloat(btn.dataset.sec) * 1000;
      });
    });

    // 상단 퀵 토글
    this.dnrToggleBtn.addEventListener('click', () => {
      this.useDnr = !this.useDnr;
      this.dnrToggleBtn.classList.toggle('active', this.useDnr);
      this.dnrToggleBtn.textContent = this.useDnr ? 'DNR ON' : 'DNR OFF';
      if (!this.useDnr) this.nvAccumBuffer = null;
    });

    this.peakingToggleBtn.addEventListener('click', () => {
      this.useEdgePeaking = !this.useEdgePeaking;
      this.peakingToggleBtn.classList.toggle('active', this.useEdgePeaking);
    });

    this.reticleToggleBtn.addEventListener('click', () => {
      this.showReticle = !this.showReticle;
      this.reticleToggleBtn.classList.toggle('active', this.showReticle);
      this.reticle.style.opacity = this.showReticle ? '0.38' : '0';
    });

    // 원본 비교 (HOLD)
    const onCompareStart = () => {
      this.isComparing = true;
      this.compareHoldBtn.classList.add('active');
      this.compareBanner.classList.remove('hidden');
    };
    const onCompareEnd = () => {
      this.isComparing = false;
      this.compareHoldBtn.classList.remove('active');
      this.compareBanner.classList.add('hidden');
    };

    this.compareHoldBtn.addEventListener('mousedown', onCompareStart);
    this.compareHoldBtn.addEventListener('mouseup', onCompareEnd);
    this.compareHoldBtn.addEventListener('mouseleave', onCompareEnd);
    this.compareHoldBtn.addEventListener('touchstart', (e) => { e.preventDefault(); onCompareStart(); }, { passive: false });
    this.compareHoldBtn.addEventListener('touchend', onCompareEnd);
    this.compareHoldBtn.addEventListener('touchcancel', onCompareEnd);

    // 뷰포트 터치 시 해당 좌표 정밀 돋보기 확대
    this.viewportStage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || e.target.closest('aside') || e.target.closest('header') || e.target.closest('.snapshot-toast')) {
        return;
      }
      const rect = this.viewportStage.getBoundingClientRect();
      const nx = Math.max(0.06, Math.min(0.94, (e.clientX - rect.left) / rect.width));
      const ny = Math.max(0.06, Math.min(0.94, (e.clientY - rect.top) / rect.height));
      this.setPinnedLoupePoint(nx, ny);
    });

    this.loupePowerBtn.addEventListener('click', () => {
      this.loupeZoom = this.loupeZoom === 4 ? 8 : 4;
      this.loupePowerBtn.textContent = `${this.loupeZoom}X`;
    });

    this.resetPinBtn.addEventListener('click', () => this.clearPinnedLoupePoint());

    document.getElementById('closeMagBtn').addEventListener('click', () => {
      this.magCard.classList.add('hidden');
      this.restoreMagBtn.classList.remove('hidden');
    });

    this.restoreMagBtn.addEventListener('click', () => {
      this.magCard.classList.remove('hidden');
      this.restoreMagBtn.classList.add('hidden');
    });

    // 액션 독 버튼
    this.torchBtn.addEventListener('click', () => this.toggleTorch());
    this.soundBtn.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      this.soundBtn.classList.toggle('active', this.soundEnabled);
      this.soundWavePath.style.opacity = this.soundEnabled ? '1' : '0.2';
    });

    this.switchCamBtn.addEventListener('click', () => this.switchCamera());
    this.snapshotBtn.addEventListener('click', () => this.takeSnapshot());

    document.getElementById('closeSnapToast').addEventListener('click', () => {
      document.getElementById('snapshotToast').classList.add('hidden');
    });

    window.addEventListener('resize', () => this.handleResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.rafId) cancelAnimationFrame(this.rafId);
      } else if (this.isActive) {
        this.requestLoop();
      }
    });
  }

  // -------------------------------------------------------------
  // 오디오 시스템
  // -------------------------------------------------------------
  initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playSonarPing(freq = 1100, duration = 0.1) {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + duration * 0.7);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (_) {}
  }

  triggerHaptic() {
    if (!navigator.vibrate) return;
    try { navigator.vibrate(45); } catch (_) {}
  }

  // -------------------------------------------------------------
  // 카메라 초기화 & 하드웨어 저조도 수광 부스트 (EV+)
  // -------------------------------------------------------------
  async startCamera() {
    this.updateStatus('카메라 센서 연결 중...', 'normal');
    this.isSimulation = false;
    this.nvAccumBuffer = null;

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.startSimulationMode();
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: this.facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      this.video.srcObject = this.stream;
      await this.video.play();

      this.handleResize();
      this.updateStatus('야간 광학 ISP 가동 중', 'active');
      this.applyHardwareLowLightExposure(true);
      this.applyHardwareZoom(this.currentZoom);
    } catch (err) {
      console.warn('Camera access failed, falling back to simulation:', err);
      this.startSimulationMode();
    }
  }

  async applyHardwareLowLightExposure(enableBoost) {
    if (!this.stream) return;
    const track = this.stream.getVideoTracks()[0];
    if (!track || !track.getCapabilities) return;

    try {
      const caps = track.getCapabilities();
      const adv = {};
      if (caps.exposureCompensation) {
        adv.exposureCompensation = enableBoost
          ? caps.exposureCompensation.max
          : (caps.exposureCompensation.min + caps.exposureCompensation.max) * 0.5;
      }
      if (caps.exposureMode && caps.exposureMode.includes('continuous')) {
        adv.exposureMode = 'continuous';
      }
      if (Object.keys(adv).length > 0) {
        await track.applyConstraints({ advanced: [adv] });
      }
    } catch (_) {}
  }

  async applyHardwareZoom(factor) {
    if (!this.stream) return;
    const track = this.stream.getVideoTracks()[0];
    if (!track || !track.getCapabilities) return;
    try {
      const caps = track.getCapabilities();
      if (caps.zoom) {
        const z = Math.min(Math.max(factor, caps.zoom.min), caps.zoom.max);
        await track.applyConstraints({ advanced: [{ zoom: z }] });
      }
    } catch (_) {}
  }

  startSimulationMode() {
    this.isSimulation = true;
    this.nvAccumBuffer = null;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.video.srcObject = null;
    this.updateStatus('암실 시뮬레이션 데모 가동 중', 'active');
  }

  switchCamera() {
    if (this.isSimulation) {
      this.startCamera();
      return;
    }
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    this.startCamera();
  }

  async toggleTorch() {
    this.isTorchOn = !this.isTorchOn;
    this.torchBtn.classList.toggle('active', this.isTorchOn);

    if (this.stream) {
      const track = this.stream.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        try {
          const caps = track.getCapabilities();
          if (caps.torch) {
            await track.applyConstraints({ advanced: [{ torch: this.isTorchOn }] });
            return;
          }
        } catch (_) {}
      }
    }
    this.screenTorchRing.classList.toggle('hidden', !this.isTorchOn);
  }

  setZoom(factor) {
    this.currentZoom = factor;
    this.applyHardwareZoom(factor);
    this.nvCanvas.style.transform = `scale(${factor})`;
  }

  setOpticalFilter(filter) {
    this.currentFilter = filter;
    this.nvAccumBuffer = null;
  }

  applyAutoLuxGain() {
    // 평균 휘도 기반 최적 감마 단계 및 부스트 자동 인가
    if (this.ambientBrightness < 12) {
      this.nightGainLevel = 'ultra';
      this.subGainMultiplier = 1.45;
    } else if (this.ambientBrightness < 28) {
      this.nightGainLevel = 'max';
      this.subGainMultiplier = 1.25;
    } else {
      this.nightGainLevel = 'mid';
      this.subGainMultiplier = 1.0;
    }

    document.querySelectorAll('[data-ngain]').forEach(b => {
      b.classList.toggle('active', b.dataset.ngain === this.nightGainLevel);
    });
    this.subGainSlider.value = this.subGainMultiplier;
    this.subGainVal.textContent = `×${(this.subGainMultiplier * 3.6).toFixed(1)}`;
    this.buildNightLUT();
    this.playSonarPing(1350, 0.08);
  }

  setPinnedLoupePoint(nx, ny) {
    this.pinnedPoint = { x: nx, y: ny };
    this.loupeFocusX = nx;
    this.loupeFocusY = ny;
    this.loupeModeBadge.textContent = '수동고정';
    this.loupeModeBadge.classList.add('pinned');
    this.resetPinBtn.classList.remove('hidden');
    this.magCard.classList.remove('hidden');
    this.restoreMagBtn.classList.add('hidden');
  }

  clearPinnedLoupePoint() {
    this.pinnedPoint = null;
    this.loupeModeBadge.textContent = '중앙조준';
    this.loupeModeBadge.classList.remove('pinned');
    this.resetPinBtn.classList.add('hidden');
  }

  handleResize() {
    const rect = this.viewportStage.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.overlayCanvas.width = Math.floor(w * dpr);
    this.overlayCanvas.height = Math.floor(h * dpr);
    this.overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssWidth = w;
    this.cssHeight = h;
  }

  switchMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.mode-card').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    if (mode === 'astro') {
      this.liveParamRow.classList.add('hidden');
      this.astroParamRow.classList.remove('hidden');
      this.startScanBtn.classList.add('astro-btn');
      this.scanBtnText.textContent = 'SHOOT';
      this.scanSvgIcon.innerHTML = '<circle cx="12" cy="12" r="6"/>';
      this.targetPill.classList.add('hidden');
      this.magCard.classList.add('hidden');
      this.restoreMagBtn.classList.remove('hidden');
    } else {
      this.liveParamRow.classList.remove('hidden');
      this.astroParamRow.classList.add('hidden');
      this.startScanBtn.classList.remove('astro-btn');
      this.scanBtnText.textContent = 'ACTIVE';
      this.scanSvgIcon.innerHTML = '<rect x="6" y="6" width="12" height="12" rx="2"/>';
      if (mode === 'radar') {
        this.targetPill.classList.remove('hidden');
      } else {
        this.targetPill.classList.add('hidden');
      }
    }
  }

  setActive(active) {
    this.isActive = active;
    if (this.isActive) {
      this.startScanBtn.classList.remove('paused');
      this.scanlineSweep.classList.add('scanning');
      this.updateStatus('야간 광학 ISP 가동 중', 'active');
      this.requestLoop();
    } else {
      this.startScanBtn.classList.add('paused');
      this.scanlineSweep.classList.remove('scanning');
      this.updateStatus('야간 ISP 일시정지', 'normal');
      if (this.rafId) cancelAnimationFrame(this.rafId);
    }
  }

  updateStatus(text, state = 'normal') {
    this.statusText.textContent = text;
    this.statusBadge.className = 'argon-status-pill';
    if (state === 'active') this.statusBadge.classList.add('active');
    if (state === 'alert') this.statusBadge.classList.add('alert');
  }

  // -------------------------------------------------------------
  // 메인 비전 루프
  // -------------------------------------------------------------
  requestLoop() {
    if (!this.isActive) return;
    this.processFrame();
    this.rafId = requestAnimationFrame(() => this.requestLoop());
  }

  renderSimulationFrame() {
    const ctx = this.simCtx;
    const w = this.simCanvas.width;
    const h = this.simCanvas.height;
    const now = performance.now() * 0.001;

    // 칠흑 같은 어두운 방(극저조도 2~14 lx) 시뮬레이션
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, w * 0.7);
    grad.addColorStop(0, '#101720');
    grad.addColorStop(1, '#05080c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 어둠 속 희미한 배경 구조물 (테이블 및 벽 모서리)
    ctx.strokeStyle = '#182434';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w * 0.15, h * 0.25, w * 0.7, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.25); ctx.lineTo(0, 0);
    ctx.moveTo(w * 0.85, h * 0.25); ctx.lineTo(w, 0);
    ctx.stroke();

    // 어둠 속에서 움직이는 객체
    for (const ent of this.simEntities) {
      ent.vx += Math.sin(now * 3.5 + ent.phase) * 0.0003;
      ent.vy += Math.cos(now * 2.8 + ent.phase) * 0.0003;
      const spd = Math.hypot(ent.vx, ent.vy);
      if (spd > 0.004) {
        ent.vx = (ent.vx / spd) * 0.004;
        ent.vy = (ent.vy / spd) * 0.004;
      }
      ent.x += ent.vx;
      ent.y += ent.vy;

      if (ent.x < 0.2 || ent.x > 0.8) ent.vx *= -1;
      if (ent.y < 0.2 || ent.y > 0.8) ent.vy *= -1;

      const ex = ent.x * w;
      const ey = ent.y * h;

      ctx.save();
      ctx.translate(ex, ey);
      ctx.fillStyle = '#060a10';
      ctx.beginPath();
      ctx.ellipse(0, 0, ent.size * 1.2, ent.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  processFrame() {
    if (this.isCapturingLX) return;

    const rawSource = this.isSimulation ? this.simCanvas : this.video;
    if (this.isSimulation) {
      this.renderSimulationFrame();
    } else if (this.video.readyState < 2) {
      return;
    }

    const nw = this.procWidth;
    const nh = this.procHeight;

    // 원본 프레임 캡처
    this.nvCtx.drawImage(rawSource, 0, 0, nw, nh);
    this.hiResCtx.drawImage(rawSource, 0, 0, this.hiResCanvas.width, this.hiResCanvas.height);

    const imgData = this.nvCtx.getImageData(0, 0, nw, nh);
    const data = imgData.data;
    const totalPixels = nw * nh;

    // 원본 비교(HOLD) 모드인 경우 필터 적용을 바이패스하고 히스토그램만 갱신
    if (this.isComparing) {
      this.measureLuminanceAndHist(data);
      this.renderMiniHistogram();
      this.updateFpsAndTelemetry();
      this.clearOverlay();
      return;
    }

    // 1단계: 조도 측정 및 자동 야간 활성화 판별
    this.measureLuminanceAndHist(data);

    // 2단계: 야간 투시 ISP 파이프라인 (비선형 감마 리프트 + 모션 적응형 시간축 적분)
    this.runNightVisionISP(data, totalPixels);
    this.nvCtx.putImageData(imgData, 0, 0);

    // 3단계: 모드별 비전 처리 (레이더 모드 동체 감지)
    if (this.currentMode === 'radar') {
      this.detectAndTrackMotion(data, nw, nh);
    } else {
      this.clearOverlay();
    }

    // 4단계: 정밀 돋보기 갱신
    this.updateSmoothLoupe();

    // 5단계: 텔레메트리 및 히스토그램 렌더링
    this.renderMiniHistogram();
    this.updateFpsAndTelemetry();
  }

  // -------------------------------------------------------------
  // 평균 휘도 측정 및 히스토그램 샘플링
  // -------------------------------------------------------------
  measureLuminanceAndHist(data) {
    this.histBins.fill(0);
    let lumSum = 0;
    const step = 24;
    let count = 0;

    for (let i = 0; i < data.length; i += step) {
      const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
      lumSum += lum;
      this.histBins[(lum >> 3) & 31]++;
      count++;
    }

    const curBright = lumSum / Math.max(1, count);
    this.ambientBrightness = Math.round(this.ambientBrightness * 0.85 + curBright * 0.15);
    this.estimatedLux = Math.max(1, Math.round(Math.pow(this.ambientBrightness / 11, 2.05)));
    this.luxValue.textContent = `${this.estimatedLux} lx`;
  }

  // -------------------------------------------------------------
  // [핵심 ISP 실행] 고정 LUT + Temporal DNR + 6종 컬러 매핑
  // -------------------------------------------------------------
  runNightVisionISP(data, totalPixels) {
    // 다중 프레임 적분 버퍼 초기화
    if (!this.nvAccumBuffer || this.nvAccumBuffer.length !== totalPixels * 3) {
      this.nvAccumBuffer = new Float32Array(totalPixels * 3);
      for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
        this.nvAccumBuffer[j]     = data[i];
        this.nvAccumBuffer[j + 1] = data[i + 1];
        this.nvAccumBuffer[j + 2] = data[i + 2];
      }
    }

    const lut = this.nvLut;
    const accum = this.nvAccumBuffer;
    const filter = this.currentFilter;
    const thermal = this.thermalLUT;
    const useDnr = this.useDnr;

    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const lum = (r * 77 + g * 150 + b * 29) >> 8;
      const liftedLum = lut[lum];

      // Temporal DNR (시간축 노이즈 평활): 픽셀 변화가 작으면 0.72 가중치로 노이즈 억제
      let finalR, finalG, finalB;

      if (filter === 'emerald') {
        // P43 전술 녹색 형광체
        finalR = liftedLum * 0.12;
        finalG = liftedLum;
        finalB = liftedLum * 0.22;
      } else if (filter === 'argon') {
        // Ar-18 고대비 아이스 시안
        finalR = liftedLum * 0.18;
        finalG = liftedLum * 0.95;
        finalB = liftedLum;
      } else if (filter === 'mono') {
        // 윤곽 모노크롬
        finalR = liftedLum;
        finalG = liftedLum;
        finalB = liftedLum;
      } else if (filter === 'thermal') {
        // 의사 열화상 LUT
        const tIdx = liftedLum * 3;
        finalR = thermal[tIdx];
        finalG = thermal[tIdx + 1];
        finalB = thermal[tIdx + 2];
      } else {
        // 트루컬러 (truecolor & standard)
        finalR = lut[r] * 0.6 + liftedLum * 0.4;
        finalG = lut[g] * 0.7 + liftedLum * 0.3;
        finalB = lut[b] * 0.6 + liftedLum * 0.4;
      }

      if (useDnr) {
        const prevG = accum[j + 1];
        const alpha = Math.abs(finalG - prevG) < 26 ? 0.72 : 0.22;
        const invAlpha = 1 - alpha;

        const ar = accum[j] * alpha + finalR * invAlpha;
        const ag = prevG * alpha + finalG * invAlpha;
        const ab = accum[j + 2] * alpha + finalB * invAlpha;

        accum[j]     = ar;
        accum[j + 1] = ag;
        accum[j + 2] = ab;

        data[i]     = ar;
        data[i + 1] = ag;
        data[i + 2] = ab;
      } else {
        data[i]     = finalR;
        data[i + 1] = finalG;
        data[i + 2] = finalB;
      }
    }

    // 윤곽선 피킹(Edge Peaking) 하이라이트 인가
    if (this.useEdgePeaking) {
      this.applyEdgePeaking(data, this.procWidth, this.procHeight);
    }
  }

  // -------------------------------------------------------------
  // 윤곽선 피킹 (Edge Peaking: 암부 사물 테두리 시안 네온 강조)
  // -------------------------------------------------------------
  applyEdgePeaking(data, w, h) {
    for (let y = 1; y < h - 1; y += 2) {
      const row = y * w;
      for (let x = 1; x < w - 1; x += 2) {
        const idx = (row + x) * 4;
        const lIdx = (row + x - 1) * 4;
        const rIdx = (row + x + 1) * 4;
        const uIdx = (row - w + x) * 4;
        const dIdx = (row + w + x) * 4;

        const gx = Math.abs(data[rIdx + 1] - data[lIdx + 1]);
        const gy = Math.abs(data[dIdx + 1] - data[uIdx + 1]);
        const edge = gx + gy;

        if (edge > 42) {
          data[idx]     = 0;
          data[idx + 1] = 240;
          data[idx + 2] = 255;
        }
      }
    }
  }

  // -------------------------------------------------------------
  // [모드 02] 야간 동체 레이더 (어둠 속 모션 검출 & 추적)
  // -------------------------------------------------------------
  detectAndTrackMotion(rgba, w, h) {
    const rawGray = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
      rawGray[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
    }

    if (!this.prevBlurGray || !this.bgFloatGray) {
      this.prevBlurGray = new Uint8Array(rawGray);
      this.bgFloatGray = new Float32Array(rawGray);
      return;
    }

    // 카메라 안정도 측정
    let diffSum = 0;
    let shiftCount = 0;
    let sampleCount = 0;
    for (let y = 10; y < h - 10; y += 6) {
      for (let x = 10; x < w - 10; x += 6) {
        const idx = y * w + x;
        const diff = Math.abs(rawGray[idx] - this.prevBlurGray[idx]);
        diffSum += diff;
        if (diff > 16) shiftCount++;
        sampleCount++;
      }
    }

    const avgDiff = diffSum / Math.max(1, sampleCount);
    const shiftRatio = shiftCount / Math.max(1, sampleCount);
    const rawStab = Math.max(0, Math.min(100, Math.round((1 - shiftRatio * 8) * 100)));
    this.stabilityScore = Math.round(this.stabilityScore * 0.7 + rawStab * 0.3);
    this.stabBarFill.style.width = `${this.stabilityScore}%`;

    const isSteady = this.stabilityScore >= 70 && avgDiff < 7.0;
    if (isSteady) {
      this.cameraHoldingSteadyFrames = Math.min(45, this.cameraHoldingSteadyFrames + 1);
    } else {
      this.cameraHoldingSteadyFrames = 0;
    }

    const motionPixels = [];
    if (this.cameraHoldingSteadyFrames >= 4) {
      const step = 3;
      for (let y = 8; y < h - 8; y += step) {
        for (let x = 8; x < w - 8; x += step) {
          const idx = y * w + x;
          const cur = rawGray[idx];
          const prev = this.prevBlurGray[idx];
          const bg = this.bgFloatGray[idx];

          this.bgFloatGray[idx] = bg * 0.92 + cur * 0.08;

          const fDiff = Math.abs(cur - prev);
          const bDiff = Math.abs(cur - bg);
          const motion = Math.min(fDiff, bDiff);

          if (motion > 20) {
            motionPixels.push({ x, y, score: motion });
          }
        }
      }
    } else {
      for (let i = 0; i < rawGray.length; i++) {
        this.bgFloatGray[i] = rawGray[i];
      }
    }

    this.prevBlurGray.set(rawGray);

    // 모션 클러스터링 및 트랙 갱신
    this.updateMotionTracks(motionPixels, w, h);
    this.renderRadarOverlay();
  }

  updateMotionTracks(motionPixels, w, h) {
    const now = performance.now();
    const candidates = [];

    if (motionPixels.length >= 2 && motionPixels.length <= 120) {
      // 15px 반경 클러스터링
      const clusters = [];
      const visited = new Uint8Array(motionPixels.length);

      for (let i = 0; i < motionPixels.length; i++) {
        if (visited[i]) continue;
        visited[i] = 1;
        const cl = { minX: motionPixels[i].x, maxX: motionPixels[i].x, minY: motionPixels[i].y, maxY: motionPixels[i].y };
        const stack = [motionPixels[i]];

        while (stack.length > 0) {
          const p = stack.pop();
          for (let j = 0; j < motionPixels.length; j++) {
            if (!visited[j]) {
              const q = motionPixels[j];
              if (Math.abs(p.x - q.x) <= 15 && Math.abs(p.y - q.y) <= 15) {
                visited[j] = 1;
                stack.push(q);
                if (q.x < cl.minX) cl.minX = q.x;
                if (q.x > cl.maxX) cl.maxX = q.x;
                if (q.y < cl.minY) cl.minY = q.y;
                if (q.y > cl.maxY) cl.maxY = q.y;
              }
            }
          }
        }
        clusters.push(cl);
      }

      for (const cl of clusters) {
        const bw = cl.maxX - cl.minX + 3;
        const bh = cl.maxY - cl.minY + 3;
        if (bw >= 3 && bw <= 35 && bh >= 3 && bh <= 35) {
          candidates.push({
            x: ((cl.minX + cl.maxX) * 0.5) / w,
            y: ((cl.minY + cl.maxY) * 0.5) / h,
            w: bw / w,
            h: bh / h
          });
        }
      }
    }

    // 다중 프레임 매칭
    const matched = new Set();
    for (const track of this.activeTracks) {
      let bestIdx = -1;
      let bestDist = 0.12;
      for (let i = 0; i < candidates.length; i++) {
        if (matched.has(i)) continue;
        const d = Math.hypot(candidates[i].x - track.x, candidates[i].y - track.y);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }

      if (bestIdx !== -1) {
        matched.add(bestIdx);
        const c = candidates[bestIdx];
        track.x = track.x * 0.7 + c.x * 0.3;
        track.y = track.y * 0.7 + c.y * 0.3;
        track.hitCount = Math.min(18, track.hitCount + 1);
        track.missCount = 0;
        track.trail.push({ x: track.x, y: track.y, time: now });
        if (track.hitCount >= 5) track.confirmed = true;
      } else {
        track.missCount++;
        track.hitCount = Math.max(0, track.hitCount - 1);
      }
      track.trail = track.trail.filter(pt => now - pt.time < 1800);
    }

    for (let i = 0; i < candidates.length; i++) {
      if (!matched.has(i) && this.activeTracks.length < 5) {
        const c = candidates[i];
        this.activeTracks.push({
          id: this.nextTrackId++,
          x: c.x,
          y: c.y,
          hitCount: 1,
          missCount: 0,
          confirmed: false,
          trail: [{ x: c.x, y: c.y, time: now }]
        });
      }
    }

    this.activeTracks = this.activeTracks.filter(t => t.missCount <= (t.confirmed ? 8 : 2) && t.hitCount > 0);

    const confirmedCount = this.activeTracks.filter(t => t.confirmed).length;
    this.targetCount.textContent = `${confirmedCount}`;
    this.targetPill.classList.toggle('locked', confirmedCount > 0);

    if (confirmedCount > 0) {
      this.alarmBanner.classList.add('show');
      if (now - this.lastAlarmTime > 750) {
        this.playSonarPing(1200, 0.12);
        this.triggerHaptic();
        this.lastAlarmTime = now;
      }
    } else {
      this.alarmBanner.classList.remove('show');
    }
  }

  renderRadarOverlay() {
    const ctx = this.overlayCtx;
    const w = this.cssWidth;
    const h = this.cssHeight;
    ctx.clearRect(0, 0, w, h);

    for (const track of this.activeTracks) {
      if (track.hitCount < 3) continue;
      const tx = track.x * w;
      const ty = track.y * h;

      // 궤적 라인
      if (track.trail.length > 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(track.trail[0].x * w, track.trail[0].y * h);
        for (let i = 1; i < track.trail.length; i++) {
          ctx.lineTo(track.trail[i].x * w, track.trail[i].y * h);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 락온 브래킷
      const r = 22;
      const color = track.confirmed ? '#ff2a6d' : '#00f0ff';
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(tx - r, ty - r + 8); ctx.lineTo(tx - r, ty - r); ctx.lineTo(tx - r + 8, ty - r);
      ctx.moveTo(tx + r - 8, ty - r); ctx.lineTo(tx + r, ty - r); ctx.lineTo(tx + r, ty - r + 8);
      ctx.moveTo(tx - r, ty + r - 8); ctx.lineTo(tx - r, ty + r); ctx.lineTo(tx - r + 8, ty + r);
      ctx.moveTo(tx + r - 8, ty + r); ctx.lineTo(tx + r, ty + r); ctx.lineTo(tx + r, ty + r - 8);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.fillStyle = color;
      ctx.font = '700 10px monospace';
      ctx.fillText(`TGT #${track.id} ${track.confirmed ? 'LOCK' : 'TRK'}`, tx + r + 6, ty + 3);
      ctx.restore();
    }
  }

  clearOverlay() {
    this.overlayCtx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    this.alarmBanner.classList.remove('show');
  }

  // -------------------------------------------------------------
  // [모드 03] 초저조도 장노출 다중 프레임 빛 누적 합성 (Astro Long Exposure)
  // -------------------------------------------------------------
  async startLongExposureCapture() {
    if (this.isCapturingLX) return;
    this.isCapturingLX = true;
    this.lxLiveBanner.classList.remove('hidden');

    const duration = this.lxDurationMs;
    const mode = this.lxMode;
    const startTs = performance.now();

    const nw = this.procWidth;
    const nh = this.procHeight;
    const totalPixels = nw * nh;
    const acc = new Float32Array(totalPixels * 3);
    let frames = 0;

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = nw;
    tmpCanvas.height = nh;
    const tCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });

    const liveOut = this.nvCtx.createImageData(nw, nh);
    const od = liveOut.data;

    await new Promise(resolve => {
      const step = () => {
        const elapsed = performance.now() - startTs;
        const rawSource = this.isSimulation ? this.simCanvas : this.video;
        if (this.isSimulation) this.renderSimulationFrame();

        tCtx.drawImage(rawSource, 0, 0, nw, nh);
        const fData = tCtx.getImageData(0, 0, nw, nh).data;
        frames++;

        const divisor = (mode === 'max') ? 1 : frames;
        const useHdr = (mode === 'hdr');
        const gain = 1.35 * this.subGainMultiplier;

        for (let i = 0, j = 0; i < fData.length; i += 4, j += 3) {
          if (mode === 'max') {
            if (fData[i]     > acc[j])     acc[j]     = fData[i];
            if (fData[i + 1] > acc[j + 1]) acc[j + 1] = fData[i + 1];
            if (fData[i + 2] > acc[j + 2]) acc[j + 2] = fData[i + 2];
          } else {
            acc[j]     += fData[i];
            acc[j + 1] += fData[i + 1];
            acc[j + 2] += fData[i + 2];
          }

          const rRaw = (acc[j]     / divisor) * gain;
          const gRaw = (acc[j + 1] / divisor) * gain;
          const bRaw = (acc[j + 2] / divisor) * gain;

          if (useHdr) {
            od[i]     = (255 * rRaw) / (rRaw + 75);
            od[i + 1] = (255 * gRaw) / (gRaw + 75);
            od[i + 2] = (255 * bRaw) / (bRaw + 75);
          } else {
            od[i]     = Math.min(255, rRaw);
            od[i + 1] = Math.min(255, gRaw);
            od[i + 2] = Math.min(255, bRaw);
          }
          od[i + 3] = 255;
        }

        // 메인 캔버스에 실시간 누적 과정 렌더링
        this.nvCtx.putImageData(liveOut, 0, 0);

        const pct = Math.min(100, Math.round((elapsed / duration) * 100));
        this.lxProgressTitle.textContent = `초저조도 장노출 합성 중 (${mode.toUpperCase()})... ${pct}%`;
        this.lxProgressSub.textContent = `${frames} 프레임 누적 · ${(elapsed / 1000).toFixed(1)}s / ${(duration / 1000).toFixed(1)}s`;

        if (elapsed >= duration) return resolve();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

    this.lxLiveBanner.classList.add('hidden');
    this.playSonarPing(880, 0.2);

    // 완성된 장노출 결과 스냅샷 생성
    const dataUrl = this.nvCanvas.toDataURL('image/png');
    this.showSnapshotToast(dataUrl, `장노출 (${mode.toUpperCase()}) ${(duration / 1000).toFixed(1)}s`);

    this.isCapturingLX = false;
  }

  // -------------------------------------------------------------
  // 정밀 돋보기 (루페) 렌더링
  // -------------------------------------------------------------
  updateSmoothLoupe() {
    if (!this.pinnedPoint) {
      const lockedTracks = this.activeTracks.filter(t => t.confirmed);
      if (lockedTracks.length > 0) {
        this.loupeFocusX = this.loupeFocusX * 0.85 + lockedTracks[0].x * 0.15;
        this.loupeFocusY = this.loupeFocusY * 0.85 + lockedTracks[0].y * 0.15;
        this.loupeModeBadge.textContent = '표적락온';
      } else {
        this.loupeFocusX = this.loupeFocusX * 0.9 + 0.5 * 0.1;
        this.loupeFocusY = this.loupeFocusY * 0.9 + 0.5 * 0.1;
        this.loupeModeBadge.textContent = '중앙조준';
      }
    }

    const mw = this.magCanvas.width;
    const mh = this.magCanvas.height;
    const srcW = this.nvCanvas.width;
    const srcH = this.nvCanvas.height;

    const cropW = this.loupeZoom === 8 ? 40 : 80;
    const cropH = this.loupeZoom === 8 ? 40 : 80;

    const sx = Math.max(0, Math.min(srcW - cropW, this.loupeFocusX * srcW - cropW * 0.5));
    const sy = Math.max(0, Math.min(srcH - cropH, this.loupeFocusY * srcH - cropH * 0.5));

    this.magCtx.clearRect(0, 0, mw, mh);
    this.magCtx.imageSmoothingEnabled = true;
    this.magCtx.imageSmoothingQuality = 'high';
    this.magCtx.drawImage(this.nvCanvas, sx, sy, cropW, cropH, 0, 0, mw, mh);

    this.loupeCoord.textContent = `${Math.round(this.loupeFocusX * 100)}%, ${Math.round(this.loupeFocusY * 100)}%`;
  }

  // -------------------------------------------------------------
  // 미니 히스토그램 및 FPS 텔레메트리
  // -------------------------------------------------------------
  renderMiniHistogram() {
    const hw = this.histCanvas.width;
    const hh = this.histCanvas.height;
    this.histCtx.clearRect(0, 0, hw, hh);

    let maxBin = 1;
    for (let i = 0; i < 32; i++) {
      if (this.histBins[i] > maxBin) maxBin = this.histBins[i];
    }

    const barW = hw / 32;
    this.histCtx.fillStyle = 'rgba(0, 240, 255, 0.78)';
    for (let i = 0; i < 32; i++) {
      const h = Math.max(1, (this.histBins[i] / maxBin) * (hh - 2));
      this.histCtx.fillRect(i * barW, hh - h, Math.max(1, barW - 0.8), h);
    }
  }

  updateFpsAndTelemetry() {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTs >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTs));
      this.fpsCounter.textContent = `${this.currentFps} FPS`;
      this.frameCount = 0;
      this.lastFpsTs = now;
    }
  }

  // -------------------------------------------------------------
  // 고해상도 스냅샷 캡처
  // -------------------------------------------------------------
  takeSnapshot() {
    const snapCanvas = document.createElement('canvas');
    const sw = this.nvCanvas.width;
    const sh = this.nvCanvas.height;
    snapCanvas.width = sw;
    snapCanvas.height = sh;
    const sCtx = snapCanvas.getContext('2d');

    // 야간 투시 ISP 렌더링 화면
    sCtx.drawImage(this.nvCanvas, 0, 0, sw, sh);
    sCtx.drawImage(this.overlayCanvas, 0, 0, sw, sh);

    // 하단 전술 워터마크
    sCtx.fillStyle = 'rgba(5, 7, 12, 0.82)';
    sCtx.fillRect(0, sh - 34, sw, 34);
    sCtx.fillStyle = '#00f0ff';
    sCtx.font = 'bold 11px monospace';
    const stamp = new Date().toLocaleString('ko-KR');
    sCtx.fillText(`ARGON NV [Ar-18] // FILTER: ${this.currentFilter.toUpperCase()} // ${this.estimatedLux} lx // ${stamp}`, 12, sh - 13);

    const dataUrl = snapCanvas.toDataURL('image/png');
    this.showSnapshotToast(dataUrl, '야간 캡처 완료');
    this.playSonarPing(1450, 0.08);

    const link = document.createElement('a');
    link.download = `argon_nv_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  showSnapshotToast(dataUrl, title) {
    const toast = document.getElementById('snapshotToast');
    const thumb = document.getElementById('snapshotThumb');
    const dlLink = document.getElementById('snapshotDownloadLink');
    const titleEl = document.getElementById('snapToastTitle');

    thumb.src = dataUrl;
    dlLink.href = dataUrl;
    dlLink.download = `argon_nv_${Date.now()}.png`;
    titleEl.textContent = title;
    toast.classList.remove('hidden');
  }
}

// -------------------------------------------------------------
// 앱 부트스트랩
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  window.argonApp = new ArgonNightVisionApp();
});
