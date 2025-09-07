/**
 * RSSI 기반 거리 계산 유틸리티
 * BLE Beacon의 RSSI 값을 이용하여 거리를 추정합니다.
 */

export interface BeaconData {
  beaconId: string;
  rssi: number;
  txPower: number;
  uuid: string;
  major: number;
  minor: number;
}

export interface DistanceResult {
  distance: number; // 미터 단위
  accuracy: 'high' | 'medium' | 'low';
  confidence: number; // 0-1 사이의 신뢰도
}

/**
 * RSSI를 거리로 변환하는 함수
 * @param rssi 수신 신호 강도 (dBm)
 * @param txPower 전송 전력 (dBm)
 * @returns 거리 (미터)
 */
export function calculateDistanceFromRSSI(rssi: number, txPower: number): number {
  // Path Loss Model 사용
  // 거리 = 10^((txPower - rssi) / (10 * n))
  // n은 경로 손실 지수 (일반적으로 2-4, 실내에서는 2-3)
  
  const pathLossExponent = 2.0; // 실내 환경에 적합한 값
  const distance = Math.pow(10, (txPower - rssi) / (10 * pathLossExponent));
  
  return Math.max(0.1, Math.min(100, distance)); // 0.1m ~ 100m 범위로 제한
}

/**
 * 여러 RSSI 측정값을 이용한 정확한 거리 계산
 * @param measurements RSSI 측정값 배열
 * @param txPower 전송 전력
 * @returns 거리 계산 결과
 */
export function calculateAccurateDistance(
  measurements: number[],
  txPower: number
): DistanceResult {
  if (measurements.length === 0) {
    return { distance: 0, accuracy: 'low', confidence: 0 };
  }

  // 이상치 제거 (IQR 방법)
  const sortedMeasurements = [...measurements].sort((a, b) => a - b);
  const q1 = sortedMeasurements[Math.floor(sortedMeasurements.length * 0.25)];
  const q3 = sortedMeasurements[Math.floor(sortedMeasurements.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const filteredMeasurements = measurements.filter(
    rssi => rssi >= lowerBound && rssi <= upperBound
  );

  // 평균 RSSI 계산
  const avgRssi = filteredMeasurements.reduce((sum, rssi) => sum + rssi, 0) / filteredMeasurements.length;
  
  // 거리 계산
  const distance = calculateDistanceFromRSSI(avgRssi, txPower);
  
  // 정확도 및 신뢰도 계산
  const variance = filteredMeasurements.reduce(
    (sum, rssi) => sum + Math.pow(rssi - avgRssi, 2), 0
  ) / filteredMeasurements.length;
  
  const standardDeviation = Math.sqrt(variance);
  
  let accuracy: 'high' | 'medium' | 'low';
  let confidence: number;
  
  if (standardDeviation < 3) {
    accuracy = 'high';
    confidence = 0.9;
  } else if (standardDeviation < 6) {
    accuracy = 'medium';
    confidence = 0.7;
  } else {
    accuracy = 'low';
    confidence = 0.5;
  }

  // 측정값이 적으면 신뢰도 감소
  if (filteredMeasurements.length < 3) {
    confidence *= 0.8;
  }

  return {
    distance: Math.round(distance * 100) / 100, // 소수점 둘째 자리까지
    accuracy,
    confidence: Math.round(confidence * 100) / 100
  };
}

/**
 * AoA (Angle of Arrival) 기반 거리 계산
 * @param rssi RSSI 값
 * @param angle AoA 각도 (도)
 * @param txPower 전송 전력
 * @returns 거리 계산 결과
 */
export function calculateDistanceWithAoA(
  rssi: number,
  angle: number,
  txPower: number
): DistanceResult {
  // 기본 RSSI 거리 계산
  const baseDistance = calculateDistanceFromRSSI(rssi, txPower);
  
  // AoA 보정 (각도에 따른 거리 보정)
  const angleRad = (angle * Math.PI) / 180;
  const angleCorrection = Math.cos(angleRad);
  
  // 각도가 90도에 가까울수록 거리가 더 멀어짐
  const correctedDistance = baseDistance / Math.max(0.1, Math.abs(angleCorrection));
  
  // 신뢰도 계산 (각도가 0도에 가까울수록 높음)
  const angleConfidence = Math.abs(angleCorrection);
  
  return {
    distance: Math.round(correctedDistance * 100) / 100,
    accuracy: angleConfidence > 0.8 ? 'high' : angleConfidence > 0.5 ? 'medium' : 'low',
    confidence: Math.round(angleConfidence * 100) / 100
  };
}

/**
 * 근접 알림 여부 판단
 * @param distance 계산된 거리
 * @param threshold 임계값 (미터)
 * @returns 알림 여부
 */
export function shouldAlert(distance: number, threshold: number = 5.0): boolean {
  return distance <= threshold;
}

/**
 * 거리별 위험도 계산
 * @param distance 거리 (미터)
 * @returns 위험도 레벨
 */
export function getDangerLevel(distance: number): 'safe' | 'warning' | 'danger' {
  if (distance > 5) return 'safe';
  if (distance > 2) return 'warning';
  return 'danger';
}

/**
 * Kalman Filter를 이용한 거리 추적 (선택적)
 * 노이즈가 많은 환경에서 더 정확한 거리 추정을 위해 사용
 */
export class KalmanFilter {
  private x: number; // 상태 (거리)
  private P: number; // 오차 공분산
  private Q: number; // 프로세스 노이즈
  private R: number; // 측정 노이즈

  constructor(initialDistance: number = 0) {
    this.x = initialDistance;
    this.P = 1.0;
    this.Q = 0.1; // 프로세스 노이즈
    this.R = 1.0; // 측정 노이즈
  }

  update(measurement: number): number {
    // 예측 단계
    const x_pred = this.x;
    const P_pred = this.P + this.Q;

    // 업데이트 단계
    const K = P_pred / (P_pred + this.R); // 칼만 게인
    this.x = x_pred + K * (measurement - x_pred);
    this.P = (1 - K) * P_pred;

    return this.x;
  }

  getCurrentEstimate(): number {
    return this.x;
  }
}
