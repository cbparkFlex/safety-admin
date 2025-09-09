import { initializeMQTTClient } from './mqttClient';
import { rssiCalibration } from './rssiCalibration';

let isInitialized = false;

export async function initializeServer() {
  if (isInitialized) return;
  
  try {
    console.log('서버 초기화 중...');
    
    // RSSI 보정 데이터 로드
    await rssiCalibration.loadCalibrationDataFromDatabase();
    
    // MQTT 클라이언트 초기화
    await initializeMQTTClient();
    
    isInitialized = true;
    console.log('서버 초기화 완료');
  } catch (error) {
    console.error('서버 초기화 실패:', error);
    // MQTT 연결 실패해도 서버는 계속 실행
  }
}
