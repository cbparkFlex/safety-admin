import mqtt from 'mqtt';
import { prisma } from './prisma';
import { calculateAccurateDistance, shouldAlert, getDangerLevel } from './distanceCalculator';
import { rssiSmoother } from './rssiSmoother';
import { initializeScheduler } from './initScheduler';

// 실시간 측정을 위한 RSSI 데이터 저장소 (전역 변수)
export const latestRSSIData = new Map<string, { rssi: number; timestamp: number }>();

// 중복 메시지 방지를 위한 처리된 메시지 추적
const processedMessages = new Map<string, number>();
const MESSAGE_DEDUP_WINDOW = 1000; // 1초 내 중복 메시지 무시

// MQTT 클라이언트 설정
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';

let mqttClient: mqtt.MqttClient | null = null;

// mqttClient export
export { mqttClient };

// 비콘 명령 전송 함수
export async function sendBeaconCommand(beaconId: string, command: any): Promise<boolean> {
  if (!mqttClient || !mqttClient.connected) {
    console.error('MQTT 클라이언트가 연결되지 않았습니다.');
    return false;
  }

  try {
    // Gateway의 subaction topic으로 명령 전송 (KBeacon configuration message용)
    const subactionTopic = 'safety/beacon/gateway_1/subaction';
    
    // KBeacon 문서에 따른 올바른 메시지 형식 구성
    const gatewayMessage = {
      msg: "dData",                    // Gateway Message Head
      mac: command.mac,                // 비콘 MAC 주소
      seq: Math.floor(Date.now() / 1000) % 1000000,  // 시퀀스 번호 (6자리)
      auth1: "0000000000000000",       // 기본 비밀번호
      dType: "json",                   // 다운로드 메시지 타입
      data: {                          // Message Body (비콘으로 전달)
        msg: command.msg,              // "ring"
        ringType: command.ringType,    // 4 (vibration)
        ringTime: command.ringTime,    // 1000 (1초)
        ledOn: command.ledOn,          // 500 (LED 켜짐 시간)
        ledOff: command.ledOff         // 1500 (LED 꺼짐 시간)
      }
    };
    
    console.log(`📤 비콘 명령 전송: ${beaconId}`, gatewayMessage);
    
    mqttClient.publish(subactionTopic, JSON.stringify(gatewayMessage), (error) => {
      if (error) {
        console.error(`비콘 명령 전송 실패: ${beaconId}`, error);
      } else {
        console.log(`✅ 비콘 명령 전송 성공: ${beaconId}`);
      }
    });

    return true;
  } catch (error) {
    console.error('비콘 명령 전송 중 오류:', error);
    return false;
  }
}

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
  // 중복 메시지 방지를 위한 간단한 로그
  console.log(`📨 MQTT 메시지 수신: ${topic}`);
  
  // 응답 토픽에 대한 특별한 로그
  if (topic.includes('/response')) {
    console.log(`🔔 Gateway 응답 토픽 수신: ${topic}`);
    console.log(`📄 응답 메시지 내용:`, message.toString());
  }
  
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
    const responseTopic = 'safety/beacon/gateway_1/response'; // Gateway 응답 토픽
    const subactionTopic = 'safety/beacon/gateway_1/subaction'; // KBeacon configuration message 토픽

    const allTopics = [...topics, wildcardTopic, responseTopic, subactionTopic];
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

    // 비콘 명령 메시지인지 확인 (subaction 토픽)
    if (topic.includes('/subaction') && (rawMessage.msg === 'dData' || rawMessage.msg === 'cfg')) {
      console.log(`📤 비콘 명령 메시지 수신: ${topic}`, rawMessage);
      console.log(`🔍 Gateway가 명령을 받았습니다. 응답을 기다리는 중...`);
      return; // 명령 메시지는 처리하지 않고 종료
    }

    // Gateway 응답 메시지인지 확인 (dAck 메시지)
    if (rawMessage.msg === 'dAck') {
      console.log(`📥 Gateway 응답 수신: ${topic}`, {
        mac: rawMessage.mac,
        seq: rawMessage.seq,
        rslt: rawMessage.rslt,
        cause: rawMessage.cause,
        gmac: rawMessage.gmac
      });
      
      if (rawMessage.rslt === 'succ') {
        console.log(`✅ 비콘 명령 성공: ${rawMessage.mac}`);
      } else {
        console.log(`❌ 비콘 명령 실패: ${rawMessage.mac} - ${rawMessage.cause}`);
      }
      return; // 응답 메시지는 처리하지 않고 종료
    }

    // Gateway 응답 메시지인지 확인 (비콘 명령 응답)
    if (topic.includes('/response') && rawMessage.ack !== undefined) {
      console.log(`📥 Gateway 응답 수신: ${topic}`, {
        targetBeacon: rawMessage.targetBeacon,
        command: rawMessage.command,
        ack: rawMessage.ack,
        message: rawMessage.message
      });
      
      if (rawMessage.ack === 0) {
        console.log(`✅ 비콘 명령 성공: ${rawMessage.targetBeacon}`);
      } else {
        console.log(`❌ 비콘 명령 실패: ${rawMessage.targetBeacon} - ${rawMessage.message}`);
      }
      return; // 응답 메시지는 처리하지 않고 종료
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
  // Gateway 메시지 처리 로그 간소화
  console.log(`📡 Gateway 처리: ${gatewayMessage.obj.length}개 Beacon`);
  
  for (const beaconData of gatewayMessage.obj) {
    // MAC 주소를 Beacon ID로 변환
    const beaconId = `BEACON_${beaconData.dmac.toUpperCase()}`;
    const gatewayId = `GW_${gatewayMessage.gmac}`;
    
    const messageData: BeaconMessage = {
      beaconId,
      gatewayId,
      rssi: beaconData.rssi,
      timestamp: new Date(beaconData.time).getTime(),
      uuid: beaconData.uuid,
      major: beaconData.majorID,
      minor: beaconData.minorID
    };
    await processBeaconMessage(messageData);
  }
}

async function processBeaconMessage(messageData: BeaconMessage) {
  try {
    // 중복 메시지 방지: 같은 beacon+gateway+rssi 조합이 1초 내에 처리되었는지 확인
    const messageKey = `${messageData.beaconId}_${messageData.gatewayId}_${messageData.rssi}`;
    const now = Date.now();
    const lastProcessed = processedMessages.get(messageKey);
    
    if (lastProcessed && (now - lastProcessed) < MESSAGE_DEDUP_WINDOW) {
      // 중복 메시지 무시
      return;
    }
    
    // 메시지 처리 시간 기록
    processedMessages.set(messageKey, now);
    
    // 오래된 메시지 키 정리 (메모리 누수 방지)
    if (processedMessages.size > 1000) {
      const cutoff = now - MESSAGE_DEDUP_WINDOW * 10;
      for (const [key, timestamp] of processedMessages.entries()) {
        if (timestamp < cutoff) {
          processedMessages.delete(key);
        }
      }
    }

    // Beacon 정보 조회 (먼저 등록된 Beacon인지 확인)
    const beacon = await prisma.beacon.findUnique({
      where: { beaconId: messageData.beaconId }
    });

    if (!beacon) {
      // 등록되지 않은 Beacon은 데이터 저장하지 않고 조용히 무시
      return;
    }
    
    // console.log(`Beacon 찾음: ${beacon.name} (TX Power: ${beacon.txPower})`);

    // Gateway 정보 조회
    // console.log(`Gateway 조회 시도: ${messageData.gatewayId}`);
    const gateway = await prisma.gateway.findUnique({
      where: { gatewayId: messageData.gatewayId }
    });

    if (!gateway) {
      // 등록되지 않은 Gateway는 데이터 저장하지 않고 조용히 무시
      return;
    }
    
    // 등록된 Beacon과 Gateway인 경우에만 실시간 RSSI 데이터 저장
    const dataKey = `${messageData.beaconId}_${messageData.gatewayId}`;
    latestRSSIData.set(dataKey, {
      rssi: messageData.rssi,
      timestamp: Date.now()
    });
    // RSSI 저장 로그 간소화 (중복 제거)
    console.log(`💾 RSSI 저장: ${messageData.beaconId} = ${messageData.rssi}dBm`);
    
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

    // 히스토리 상태 로그 제거됨 (스무딩 제거로 불필요)
    
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
 * 등록되지 않은 Beacon 데이터 정리
 */
export async function cleanupUnregisteredBeaconData() {
  try {
    console.log('등록되지 않은 Beacon 데이터 정리 시작...');
    
    // 등록된 Beacon과 Gateway 목록 조회
    const [registeredBeacons, registeredGateways] = await Promise.all([
      prisma.beacon.findMany({ select: { beaconId: true } }),
      prisma.gateway.findMany({ select: { gatewayId: true } })
    ]);
    
    const beaconIds = new Set(registeredBeacons.map(b => b.beaconId));
    const gatewayIds = new Set(registeredGateways.map(g => g.gatewayId));
    
    // 등록되지 않은 데이터 키 찾기
    const keysToDelete: string[] = [];
    for (const [key, data] of latestRSSIData.entries()) {
      const [beaconId, gatewayId] = key.split('_');
      const fullBeaconId = `BEACON_${beaconId}`;
      const fullGatewayId = `GW_${gatewayId}`;
      
      if (!beaconIds.has(fullBeaconId) || !gatewayIds.has(fullGatewayId)) {
        keysToDelete.push(key);
      }
    }
    
    // 등록되지 않은 데이터 삭제
    for (const key of keysToDelete) {
      latestRSSIData.delete(key);
    }
    
    console.log(`등록되지 않은 Beacon 데이터 정리 완료: ${keysToDelete.length}개 삭제`);
    console.log(`현재 저장된 데이터: ${latestRSSIData.size}개`);
    
    return keysToDelete.length;
  } catch (error) {
    console.error('등록되지 않은 Beacon 데이터 정리 실패:', error);
    return 0;
  }
}

/**
 * 실시간 측정을 위한 최신 RSSI 데이터 조회
 */
export function getLatestRSSI(beaconId: string, gatewayId: string): number | null {
  const dataKey = `${beaconId}_${gatewayId}`;
  const data = latestRSSIData.get(dataKey);
  
  if (!data) {
    return null;
  }
  
  // 5초 이내의 데이터만 유효
  const now = Date.now();
  const timeDiff = now - data.timestamp;
  
  if (timeDiff > 5000) {
    latestRSSIData.delete(dataKey);
    return null;
  }
  
  return data.rssi;
}
