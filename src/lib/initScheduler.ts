import { Scheduler } from './scheduler';
import { cleanupMemory } from './mqttClient';
import { rssiCalibration } from './rssiCalibration';

let isInitialized = false;
let memoryCleanupInterval: NodeJS.Timeout | null = null;
let calibrationReloadInterval: NodeJS.Timeout | null = null;

export function initializeScheduler(): void {
  if (isInitialized) {
    console.log('⚠️ 스케줄러가 이미 초기화되었습니다.');
    return;
  }

  try {
    // 개발 환경에서는 테스트 스케줄러 사용 (1분마다)
    // 프로덕션 환경에서는 24시간마다 실행
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 개발 환경: 테스트 로그 정리 스케줄러 시작');
      Scheduler.startTestCleanup();
    } else {
      console.log('🚀 프로덕션 환경: 로그 정리 스케줄러 시작 (24시간마다)');
      Scheduler.startLogCleanup(24);
    }
    
    // 메모리 정리 스케줄러 시작 (5분마다)
    startMemoryCleanupScheduler();
    
    // RSSI 보정 데이터 주기 재로드 (1분마다) - UI에서 추가한 보정값이 MQTT 근접 판단에 반영되도록
    startCalibrationReloadScheduler();
    
    isInitialized = true;
    console.log('✅ 스케줄러 초기화 완료');
  } catch (error) {
    console.error('❌ 스케줄러 초기화 실패:', error);
  }
}

/**
 * RSSI 보정 데이터 주기 재로드 (Gateway 관리에서 추가한 보정값이 진동 알람에 반영되도록)
 */
function startCalibrationReloadScheduler(): void {
  if (calibrationReloadInterval) {
    clearInterval(calibrationReloadInterval);
  }
  calibrationReloadInterval = setInterval(() => {
    try {
      rssiCalibration.loadCalibrationDataFromDatabase(true); // silent: 주기 재로드 시 로그 생략
    } catch (error) {
      console.error('❌ RSSI 보정 데이터 재로드 실패:', error);
    }
  }, 60 * 1000); // 1분마다
  console.log('📐 RSSI 보정 데이터 재로드 스케줄러 시작 (1분마다)');
}

/**
 * 메모리 정리 스케줄러 시작
 */
function startMemoryCleanupScheduler(): void {
  if (memoryCleanupInterval) {
    clearInterval(memoryCleanupInterval);
  }
  
  // 5분마다 메모리 정리
  memoryCleanupInterval = setInterval(() => {
    try {
      cleanupMemory();
    } catch (error) {
      console.error('❌ 메모리 정리 중 오류:', error);
    }
  }, 5 * 60 * 1000); // 5분
  
  console.log('🧹 메모리 정리 스케줄러 시작 (5분마다)');
}

/**
 * 메모리 정리 스케줄러 중지
 */
export function stopMemoryCleanupScheduler(): void {
  if (memoryCleanupInterval) {
    clearInterval(memoryCleanupInterval);
    memoryCleanupInterval = null;
    console.log('🧹 메모리 정리 스케줄러 중지');
  }
  if (calibrationReloadInterval) {
    clearInterval(calibrationReloadInterval);
    calibrationReloadInterval = null;
    console.log('📐 RSSI 보정 데이터 재로드 스케줄러 중지');
  }
}

export function getSchedulerStatus(): { isRunning: boolean; isInitialized: boolean } {
  return {
    isRunning: Scheduler.isSchedulerRunning(),
    isInitialized
  };
}
