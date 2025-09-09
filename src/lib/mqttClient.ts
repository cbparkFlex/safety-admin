import mqtt from 'mqtt';
import { prisma } from './prisma';
import { calculateAccurateDistance, shouldAlert, getDangerLevel } from './distanceCalculator';
import { rssiSmoother } from './rssiSmoother';
import { initializeScheduler } from './initScheduler';

// 실시간 측정을 위한 RSSI 데이터 저장소
const latestRSSIData = new Map<string, { rssi: number; timestamp: number }>();

// MQTT 클라이언트 설정
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';

let mqttClient: mqtt.MqttClient | null = null;

// mqttClient export
export { mqttClient };

export interface BeaconMessage {
  beaconId: string;
  gatewayId: string;
  rssi: number;
  timestamp: number;
  uuid?: string;
  major?: number;
  minor?: number;
  angle?: number; // AoA 각도 (선택적)
}

export interface GatewayMessage {
  msg: string;
  gmac: string;
  obj: Array<{
    type: number;
    dmac: string;
    uuid: string;
    majorID: number;
    minorID: number;
    refpower: number;
    rssi: number;
    time: string;
  }>;
}

export interface ProximityAlertData {
  beaconId: string;
  gatewayId: string;
  workerId?: number;
  rssi: number;
  distance: number;
  threshold: number;
  isAlert: boolean;
  dangerLevel: 'safe' | 'warning' | 'danger';
  timestamp: Date;
}

/**
 * MQTT 클라이언트 초기화
 */
export function initializeMQTTClient(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const options: mqtt.IClientOptions = {
        clientId: `safety-admin-${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30 * 1000,
      };

      if (MQTT_USERNAME && MQTT_PASSWORD) {
        options.username = MQTT_USERNAME;
        options.password = MQTT_PASSWORD;
      }

      mqttClient = mqtt.connect(MQTT_BROKER_URL, options);

      mqttClient.on('connect', () => {
        console.log('MQTT 클라이언트가 연결되었습니다.');
        console.log('토픽 구독 시작...');
        subscribeToBeaconTopics();
        
        // 스케줄러 초기화
        initializeScheduler();
        
        resolve(true);
      });

      mqttClient.on('error', (error) => {
        console.error('MQTT 연결 오류:', error);
        reject(error);
      });

      mqttClient.on('message', (topic, message) => {
        // console.log(`MQTT 메시지 수신됨: ${topic}, 크기: ${message.length} bytes`);
        handleBeaconMessage(topic, message);
      });

      mqttClient.on('reconnect', () => {
        console.log('MQTT 재연결 시도 중...');
      });

      mqttClient.on('close', () => {
        console.log('MQTT 연결이 종료되었습니다.');
      });

    } catch (error) {
      console.error('MQTT 클라이언트 초기화 실패:', error);
      reject(error);
    }
  });
}

/**
 * Beacon 관련 MQTT 토픽 구독
 */
async function subscribeToBeaconTopics() {
  if (!mqttClient) {
    console.error('MQTT 클라이언트가 없습니다.');
    return;
  }

  try {
    console.log('Gateway 목록 조회 중...');
    // 모든 게이트웨이의 beacon 토픽 구독
    const gateways = await prisma.gateway.findMany({
      where: { status: 'active' },
      select: { mqttTopic: true }
    });

    console.log(`등록된 Gateway 개수: ${gateways.length}`);
    gateways.forEach(gw => console.log(`- Topic: ${gw.mqttTopic}`));

    const topics = gateways.map(gw => `${gw.mqttTopic}/+`); // +는 모든 하위 토픽
    const wildcardTopic = 'safety/beacon/+'; // 전체 beacon 토픽

    const allTopics = [...topics, wildcardTopic];
    console.log(`구독할 토픽 목록: ${allTopics.join(', ')}`);
    
    for (const topic of allTopics) {
      mqttClient.subscribe(topic, (error) => {
        if (error) {
          console.error(`토픽 구독 실패 (${topic}):`, error);
        } else {
          console.log(`토픽 구독 성공: ${topic}`);
        }
      });
    }
  } catch (error) {
    console.error('토픽 구독 설정 실패:', error);
  }
}

/**
 * Beacon 메시지 처리
 */
async function handleBeaconMessage(topic: string, message: Buffer) {
  try {
    const rawMessage = JSON.parse(message.toString());
    
    // Gateway alive 메시지인지 확인
    if (rawMessage.msg === 'alive') {
      console.log(`Gateway alive 메시지 수신: ${topic}`, {
        gmac: rawMessage.gmac,
        ver: rawMessage.ver,
        wanIP: rawMessage.wanIP,
        temp: rawMessage.temp,
        uptime: rawMessage.uptime
      });
      return; // alive 메시지는 처리하지 않고 종료
    }
    
    // Gateway 메시지 형식인지 확인
    if (rawMessage.msg === 'advData' && rawMessage.obj) {
      // Gateway 메시지 형식 처리
      await handleGatewayMessage(topic, rawMessage);
    } else {
      // 기존 Beacon 메시지 형식 처리
      const messageData: BeaconMessage = rawMessage;
      console.log(`Beacon 메시지 수신: ${topic}`, messageData);
      console.log(`메시지 파싱 성공: beaconId=${messageData.beaconId}, gatewayId=${messageData.gatewayId}, rssi=${messageData.rssi}`);
      await processBeaconMessage(messageData);
    }
  } catch (error) {
    console.error('메시지 처리 실패:', error);
  }
}

async function handleGatewayMessage(topic: string, gatewayMessage: GatewayMessage) {
//   console.log(`Gateway 메시지 처리: ${topic}, Beacon 개수: ${gatewayMessage.obj.length}`);
  
  for (const beaconData of gatewayMessage.obj) {
    // MAC 주소를 Beacon ID로 변환
    const beaconId = `BEACON_${beaconData.dmac.toUpperCase()}`;
    const gatewayId = `GW_${gatewayMessage.gmac}`;
    
    // console.log(`변환된 ID: Beacon=${beaconId}, Gateway=${gatewayId}`);
    
    const messageData: BeaconMessage = {
      beaconId,
      gatewayId,
      rssi: beaconData.rssi,
      timestamp: new Date(beaconData.time).getTime(),
      uuid: beaconData.uuid,
      major: beaconData.majorID,
      minor: beaconData.minorID
    };
    
    // console.log(`Beacon 데이터 변환: ${beaconId}, RSSI: ${beaconData.rssi}dBm`);
    await processBeaconMessage(messageData);
  }
}

async function processBeaconMessage(messageData: BeaconMessage) {
  try {
    // 실시간 측정을 위한 RSSI 데이터 저장
    const dataKey = `${messageData.beaconId}_${messageData.gatewayId}`;
    latestRSSIData.set(dataKey, {
      rssi: messageData.rssi,
      timestamp: Date.now()
    });
    console.log(`RSSI 데이터 저장: ${dataKey} = ${messageData.rssi}dBm`);

    // Beacon 정보 조회
    // console.log(`Beacon 조회 시도: ${messageData.beaconId}`);
    const beacon = await prisma.beacon.findUnique({
      where: { beaconId: messageData.beaconId }
    });

    if (!beacon) {
      console.warn(`알 수 없는 Beacon ID: ${messageData.beaconId}`);
      console.log('등록된 모든 Beacon ID 확인 중...');
      const allBeacons = await prisma.beacon.findMany({ select: { beaconId: true } });
      console.log('등록된 Beacon IDs:', allBeacons.map(b => b.beaconId));
      return;
    }
    
    // console.log(`Beacon 찾음: ${beacon.name} (TX Power: ${beacon.txPower})`);

    // Gateway 정보 조회
    // console.log(`Gateway 조회 시도: ${messageData.gatewayId}`);
    const gateway = await prisma.gateway.findUnique({
      where: { gatewayId: messageData.gatewayId }
    });

    if (!gateway) {
      console.warn(`알 수 없는 Gateway ID: ${messageData.gatewayId}`);
      console.log('등록된 모든 Gateway ID 확인 중...');
      const allGateways = await prisma.gateway.findMany({ select: { gatewayId: true } });
      console.log('등록된 Gateway IDs:', allGateways.map(g => g.gatewayId));
      return;
    }
    
    // console.log(`Gateway 찾음: ${gateway.name} (Topic: ${gateway.mqttTopic})`);

    // RSSI 스무딩 적용 (보정 데이터 포함)
    const smoothingResult = rssiSmoother.smoothRSSI(
      messageData.beaconId, 
      messageData.rssi, 
      beacon.txPower, 
      messageData.gatewayId
    );
    
    if (!smoothingResult.isValid) {
      console.log(`Beacon ${messageData.beaconId}: 스무딩 결과 무효 - 측정값 무시`);
      return;
    }

    const smoothedRSSI = smoothingResult.smoothedRSSI;
    const smoothedDistance = smoothingResult.smoothedDistance;
    const calibrationInfo = smoothingResult.calibrationInfo;
    
    // 보정 정보 로그
    if (calibrationInfo?.isCalibrated) {
      console.log(`RSSI 보정 적용: 원본=${messageData.rssi}dBm → 스무딩=${smoothedRSSI}dBm, 거리=${smoothedDistance.toFixed(2)}m (${calibrationInfo.method}, ${calibrationInfo.confidence})`);
    } else {
      console.log(`RSSI 스무딩: 원본=${messageData.rssi}dBm → 스무딩=${smoothedRSSI}dBm, 거리=${smoothedDistance.toFixed(2)}m (기본 모델)`);
    }

    // 히스토리 상태 로그 (디버깅용)
    const historyStatus = rssiSmoother.getHistoryStatus(messageData.beaconId);
    if (historyStatus.count > 1) {
      console.log(`히스토리: ${historyStatus.count}개 샘플, ${historyStatus.timeSpan.toFixed(1)}초, RSSI 범위: ${historyStatus.rssiRange.min}~${historyStatus.rssiRange.max}dBm`);
    }
    
    // 근접 알림 여부 판단
    const isAlert = shouldAlert(smoothedDistance, 5.0); // 5m 임계값
    const dangerLevel = getDangerLevel(smoothedDistance);
    
    console.log(`알림 판단: 거리=${smoothedDistance.toFixed(2)}m, 임계값=5.0m, 알림=${isAlert}, 위험도=${dangerLevel}`);

    // ProximityAlert 데이터 생성
    const alertData: ProximityAlertData = {
      beaconId: messageData.beaconId,
      gatewayId: messageData.gatewayId,
      rssi: smoothedRSSI, // 스무딩된 RSSI 사용
      distance: smoothedDistance, // 스무딩된 거리 사용
      threshold: 5.0,
      isAlert,
      dangerLevel,
      timestamp: new Date(messageData.timestamp)
    };

    // 데이터베이스에 저장
    await saveProximityAlert(alertData);

    // 알림이 필요한 경우 추가 처리
    if (isAlert) {
      await handleProximityAlert(alertData);
    }

  } catch (error) {
    console.error('Beacon 메시지 처리 실패:', error);
  }
}

/**
 * 근접 알림 데이터 저장
 */
async function saveProximityAlert(alertData: ProximityAlertData) {
  try {
    await prisma.proximityAlert.create({
      data: {
        beaconId: alertData.beaconId,
        gatewayId: alertData.gatewayId,
        workerId: alertData.workerId,
        rssi: alertData.rssi,
        distance: alertData.distance,
        threshold: alertData.threshold,
        isAlert: alertData.isAlert,
        alertTime: alertData.isAlert ? alertData.timestamp : null,
      }
    });
  } catch (error) {
    console.error('근접 알림 데이터 저장 실패:', error);
  }
}

/**
 * 근접 알림 처리
 */
async function handleProximityAlert(alertData: ProximityAlertData) {
  try {
    // 모니터링 로그에 기록
    await prisma.monitoringLog.create({
      data: {
        type: 'proximity_alert',
        sourceId: alertData.beaconId,
        message: `근접 알림: Beacon ${alertData.beaconId}이 ${alertData.distance.toFixed(2)}m 거리에 있습니다.`,
        severity: alertData.dangerLevel === 'danger' ? 'error' : 'warning'
      }
    });

    // WebSocket을 통한 실시간 알림 (향후 구현)
    // broadcastProximityAlert(alertData);

    console.log(`근접 알림 발생: ${alertData.beaconId} - ${alertData.distance}m`);
  } catch (error) {
    console.error('근접 알림 처리 실패:', error);
  }
}

/**
 * MQTT 클라이언트 종료
 */
export function disconnectMQTTClient() {
  if (mqttClient) {
    mqttClient.end();
    mqttClient = null;
  }
}

/**
 * MQTT 연결 상태 확인
 */
export function isMQTTConnected(): boolean {
  return mqttClient ? mqttClient.connected : false;
}

/**
 * 테스트 메시지 발송
 */
export function publishTestMessage(topic: string, message: any) {
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(topic, JSON.stringify(message));
  } else {
    console.error('MQTT 클라이언트가 연결되지 않았습니다.');
  }
}

/**
 * 실시간 측정을 위한 최신 RSSI 데이터 조회
 */
export function getLatestRSSI(beaconId: string, gatewayId: string): number | null {
  const dataKey = `${beaconId}_${gatewayId}`;
  const data = latestRSSIData.get(dataKey);
  
  console.log(`RSSI 조회 요청: ${dataKey}`);
  console.log(`저장된 데이터:`, data);
  console.log(`전체 저장된 키들:`, Array.from(latestRSSIData.keys()));
  
  if (!data) {
    console.log(`RSSI 데이터 없음: ${dataKey}`);
    return null;
  }
  
  // 5초 이내의 데이터만 유효
  const now = Date.now();
  if (now - data.timestamp > 5000) {
    console.log(`RSSI 데이터 만료: ${dataKey}, ${now - data.timestamp}ms 경과`);
    latestRSSIData.delete(dataKey);
    return null;
  }
  
  console.log(`RSSI 데이터 반환: ${dataKey} = ${data.rssi}dBm`);
  return data.rssi;
}
