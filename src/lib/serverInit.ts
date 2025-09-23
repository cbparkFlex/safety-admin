import { initializeMQTTClient, disconnectMQTTClient } from './mqttClient';
import { rssiCalibration } from './rssiCalibration';
import { Scheduler } from './scheduler';
import { stopMemoryCleanupScheduler } from './initScheduler';

let isInitialized = false;

export async function initializeServer() {
  if (isInitialized) return;
  
  try {
    console.log('서버 초기화 중...');
    
    // RSSI 보정 데이터 로드
    await rssiCalibration.loadCalibrationDataFromDatabase();
    
    // MQTT 클라이언트 초기화
    await initializeMQTTClient();
    
    // 로그 정리 스케줄러 시작 (서버 시작 시 + 매일 밤 12시)
    Scheduler.startDailyLogCleanup();
    
    // 서버 종료 시 정리 작업 등록
    setupGracefulShutdown();
    
    isInitialized = true;
    console.log('서버 초기화 완료');
  } catch (error) {
    console.error('서버 초기화 실패:', error);
    // MQTT 연결 실패해도 서버는 계속 실행
  }
}

/**
 * 서버 종료 시 정리 작업 설정
 */
function setupGracefulShutdown() {
  const cleanup = () => {
    console.log('🔄 서버 종료 중... 정리 작업 수행');
    
    try {
      // 메모리 정리 스케줄러 중지
      stopMemoryCleanupScheduler();
      
      // MQTT 클라이언트 종료
      disconnectMQTTClient();
      
      // 스케줄러 중지
      Scheduler.stopAllSchedulers();
      
      console.log('✅ 서버 정리 작업 완료');
    } catch (error) {
      console.error('❌ 서버 정리 작업 중 오류:', error);
    }
  };
  
  // SIGTERM, SIGINT 신호 처리
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  
  // 예상치 못한 오류 처리
  process.on('uncaughtException', (error) => {
    console.error('❌ 예상치 못한 오류:', error);
    cleanup();
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 처리되지 않은 Promise 거부:', reason);
    console.error('Promise:', promise);
  });
  
  console.log('🛡️ 서버 종료 시 정리 작업 설정 완료');
}
