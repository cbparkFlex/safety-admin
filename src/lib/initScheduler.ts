import { Scheduler } from './scheduler';
import { cleanupMemory } from './mqttClient';

let isInitialized = false;
let memoryCleanupInterval: NodeJS.Timeout | null = null;

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
    
    isInitialized = true;
    console.log('✅ 스케줄러 초기화 완료');
  } catch (error) {
    console.error('❌ 스케줄러 초기화 실패:', error);
  }
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
}

export function getSchedulerStatus(): { isRunning: boolean; isInitialized: boolean } {
  return {
    isRunning: Scheduler.isSchedulerRunning(),
    isInitialized
  };
}
