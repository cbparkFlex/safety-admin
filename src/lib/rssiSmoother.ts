/**
 * RSSI 값 스무딩을 위한 클래스
 * 이동 평균 필터와 이동 거리 제한을 적용
 * 현장 보정 데이터를 통한 정확한 거리 계산 지원
 */

import { rssiCalibration, CalibratedDistance } from './rssiCalibration';

interface RSSIHistory {
  timestamp: number;
  rssi: number;
  distance: number;
}

interface BeaconHistory {
  [beaconId: string]: RSSIHistory[];
}

export class RSSISmoother {
  private history: BeaconHistory = {};
  private readonly MAX_HISTORY_SIZE = 10; // 최대 히스토리 개수
  private readonly TIME_WINDOW_MS = 3000; // 3초 윈도우
  private readonly MAX_MOVEMENT_M = 1.0; // 1초당 최대 이동 거리 (미터)
  private readonly MIN_SAMPLES = 2; // 최소 샘플 수

  /**
   * RSSI 값을 스무딩하여 반환 (보정 데이터 적용)
   */
  public smoothRSSI(beaconId: string, rssi: number, txPower: number, gatewayId?: string): {
    smoothedRSSI: number;
    smoothedDistance: number;
    isValid: boolean;
    calibrationInfo?: {
      method: string;
      confidence: string;
      isCalibrated: boolean;
    };
  } {
    const now = Date.now();
    
    // 보정된 거리 계산 (Gateway ID가 있는 경우)
    let currentDistance: number;
    let calibrationInfo: any = undefined;
    
    if (gatewayId) {
      const calibratedResult = rssiCalibration.getCalibratedDistance(beaconId, gatewayId, rssi);
      currentDistance = calibratedResult.distance;
      calibrationInfo = {
        method: calibratedResult.method,
        confidence: calibratedResult.confidence,
        isCalibrated: calibratedResult.method !== 'fallback'
      };
    } else {
      currentDistance = this.calculateDistance(rssi, txPower);
    }
    
    // 히스토리 초기화
    if (!this.history[beaconId]) {
      this.history[beaconId] = [];
    }

    // 새로운 측정값 추가
    this.history[beaconId].push({
      timestamp: now,
      rssi: rssi,
      distance: currentDistance
    });

    // 오래된 데이터 제거
    this.cleanupHistory(beaconId, now);

    // 이동 거리 검증
    if (!this.isValidMovement(beaconId, currentDistance)) {
      console.log(`Beacon ${beaconId}: 이동 거리 제한으로 인한 측정값 무시 (${currentDistance.toFixed(2)}m)`);
      return this.getLastValidResult(beaconId);
    }

    // 스무딩된 값 계산
    const smoothedResult = this.calculateSmoothedValue(beaconId);
    
    return {
      smoothedRSSI: smoothedResult.rssi,
      smoothedDistance: smoothedResult.distance,
      isValid: true,
      calibrationInfo
    };
  }

  /**
   * 거리 계산 (Path Loss Model)
   */
  private calculateDistance(rssi: number, txPower: number): number {
    if (rssi === 0) return -1.0;
    
    const ratio = rssi * 1.0 / txPower;
    let distance: number;
    
    if (ratio < 1.0) {
      distance = Math.pow(ratio, 10);
    } else {
      distance = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
    }
    
    return Math.max(0.1, Math.min(distance, 100.0)); // 0.1m ~ 100m 범위 제한
  }

  /**
   * 오래된 히스토리 데이터 정리
   */
  private cleanupHistory(beaconId: string, now: number): void {
    const history = this.history[beaconId];
    
    // 시간 윈도우 밖의 데이터 제거
    this.history[beaconId] = history.filter(
      entry => (now - entry.timestamp) <= this.TIME_WINDOW_MS
    );
    
    // 최대 개수 제한
    if (this.history[beaconId].length > this.MAX_HISTORY_SIZE) {
      this.history[beaconId] = this.history[beaconId].slice(-this.MAX_HISTORY_SIZE);
    }
  }

  /**
   * 이동 거리 검증
   */
  private isValidMovement(beaconId: string, currentDistance: number): boolean {
    const history = this.history[beaconId];
    
    if (history.length < 2) return true; // 첫 번째 측정값은 항상 유효
    
    const lastEntry = history[history.length - 2]; // 이전 측정값
    const timeDiff = (Date.now() - lastEntry.timestamp) / 1000; // 초 단위
    
    if (timeDiff <= 0) return true;
    
    const distanceDiff = Math.abs(currentDistance - lastEntry.distance);
    const maxAllowedMovement = this.MAX_MOVEMENT_M * timeDiff;
    
    return distanceDiff <= maxAllowedMovement;
  }

  /**
   * 스무딩된 값 계산 (가중 이동 평균)
   */
  private calculateSmoothedValue(beaconId: string): { rssi: number; distance: number } {
    const history = this.history[beaconId];
    
    if (history.length < this.MIN_SAMPLES) {
      // 샘플이 부족하면 최신 값 반환
      const latest = history[history.length - 1];
      return { rssi: latest.rssi, distance: latest.distance };
    }

    // 가중치 계산 (최신 값일수록 높은 가중치)
    let totalWeight = 0;
    let weightedRSSI = 0;
    let weightedDistance = 0;
    
    const now = Date.now();
    
    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const age = (now - entry.timestamp) / 1000; // 초 단위
      const weight = Math.exp(-age / 2.0); // 지수 감소 가중치
      
      totalWeight += weight;
      weightedRSSI += entry.rssi * weight;
      weightedDistance += entry.distance * weight;
    }
    
    return {
      rssi: Math.round(weightedRSSI / totalWeight),
      distance: weightedDistance / totalWeight
    };
  }

  /**
   * 마지막 유효한 결과 반환
   */
  private getLastValidResult(beaconId: string): {
    smoothedRSSI: number;
    smoothedDistance: number;
    isValid: boolean;
  } {
    const history = this.history[beaconId];
    
    if (history.length === 0) {
      return { smoothedRSSI: 0, smoothedDistance: 0, isValid: false };
    }
    
    const latest = history[history.length - 1];
    return {
      smoothedRSSI: latest.rssi,
      smoothedDistance: latest.distance,
      isValid: false // 무효한 측정값
    };
  }

  /**
   * 특정 Beacon의 히스토리 초기화
   */
  public clearHistory(beaconId: string): void {
    delete this.history[beaconId];
  }

  /**
   * 모든 히스토리 초기화
   */
  public clearAllHistory(): void {
    this.history = {};
  }

  /**
   * 히스토리 상태 조회 (디버깅용)
   */
  public getHistoryStatus(beaconId: string): {
    count: number;
    timeSpan: number;
    rssiRange: { min: number; max: number };
    distanceRange: { min: number; max: number };
  } {
    const history = this.history[beaconId] || [];
    
    if (history.length === 0) {
      return { count: 0, timeSpan: 0, rssiRange: { min: 0, max: 0 }, distanceRange: { min: 0, max: 0 } };
    }
    
    const rssiValues = history.map(h => h.rssi);
    const distanceValues = history.map(h => h.distance);
    const timeSpan = (history[history.length - 1].timestamp - history[0].timestamp) / 1000;
    
    return {
      count: history.length,
      timeSpan,
      rssiRange: { min: Math.min(...rssiValues), max: Math.max(...rssiValues) },
      distanceRange: { min: Math.min(...distanceValues), max: Math.max(...distanceValues) }
    };
  }
}

// 전역 인스턴스
export const rssiSmoother = new RSSISmoother();
