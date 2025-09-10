/**
 * RSSI 값 스무딩을 위한 클래스
 * 이동 평균 필터와 이동 거리 제한을 적용
 * 현장 보정 데이터를 통한 정확한 거리 계산 지원
 */

import { rssiCalibration, CalibratedDistance } from './rssiCalibration';

// 히스토리 관련 인터페이스들 제거됨 (스무딩 제거로 불필요)

export class RSSISmoother {
  // 히스토리 관련 변수들 제거됨 (스무딩 제거로 불필요)

  /**
   * RSSI 값을 그대로 반환 (스무딩 제거, 보정 데이터만 적용)
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
    
    // 스무딩 제거: 원본 RSSI 값 그대로 사용
    return {
      smoothedRSSI: rssi, // 원본 RSSI 값 그대로
      smoothedDistance: currentDistance,
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

  // cleanupHistory 메서드 제거됨 (스무딩 제거로 불필요)

  // isValidMovement 메서드 제거됨 (스무딩 제거로 불필요)

  // calculateSmoothedValue 메서드 제거됨 (스무딩 제거로 불필요)

  // getLastValidResult 메서드 제거됨 (스무딩 제거로 불필요)

  // 히스토리 관련 메서드들 제거됨 (스무딩 제거로 불필요)
}

// 전역 인스턴스
export const rssiSmoother = new RSSISmoother();
