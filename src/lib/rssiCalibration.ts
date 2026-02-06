/**
 * RSSI 보정을 위한 거리별 매핑 테이블
 * 현장 측정을 통해 구축된 실제 데이터 기반
 */

export interface RSSICalibrationData {
  beaconId: string;
  gatewayId: string;
  measurements: {
    distance: number; // 미터
    rssi: number;     // dBm
    samples: number;  // 측정 샘플 수
    timestamp: Date;  // 측정 시간
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CalibratedDistance {
  distance: number;
  confidence: 'high' | 'medium' | 'low';
  method: 'calibrated' | 'interpolated' | 'extrapolated' | 'fallback';
}

class RSSICalibrationManager {
  private calibrationData: Map<string, RSSICalibrationData> = new Map();

  /**
   * 보정 데이터 추가/업데이트
   */
  public addCalibrationData(
    beaconId: string, 
    gatewayId: string, 
    distance: number, 
    rssi: number
  ): void {
    const key = `${beaconId}_${gatewayId}`;
    
    if (!this.calibrationData.has(key)) {
      this.calibrationData.set(key, {
        beaconId,
        gatewayId,
        measurements: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    const data = this.calibrationData.get(key)!;
    
    // 기존 측정값이 있는지 확인
    const existingIndex = data.measurements.findIndex(m => m.distance === distance);
    
    if (existingIndex >= 0) {
      // 기존 측정값 업데이트 (평균 계산)
      const existing = data.measurements[existingIndex];
      const newRSSI = (existing.rssi * existing.samples + rssi) / (existing.samples + 1);
      data.measurements[existingIndex] = {
        distance,
        rssi: Math.round(newRSSI),
        samples: existing.samples + 1,
        timestamp: new Date()
      };
    } else {
      // 새로운 측정값 추가
      data.measurements.push({
        distance,
        rssi,
        samples: 1,
        timestamp: new Date()
      });
    }

    // 거리순으로 정렬
    data.measurements.sort((a, b) => a.distance - b.distance);
    data.updatedAt = new Date();
  }

  /**
   * 보정된 거리 계산
   */
  public getCalibratedDistance(
    beaconId: string, 
    gatewayId: string, 
    rssi: number
  ): CalibratedDistance {
    const key = `${beaconId}_${gatewayId}`;
    const data = this.calibrationData.get(key);

    if (!data || data.measurements.length === 0) {
      // 보정 데이터가 없으면 기본 Path Loss Model 사용
      return {
        distance: this.calculateDefaultDistance(rssi),
        confidence: 'low',
        method: 'fallback'
      };
    }

    // 정확한 매칭 찾기
    const exactMatch = data.measurements.find(m => m.rssi === rssi);
    if (exactMatch) {
      return {
        distance: exactMatch.distance,
        confidence: 'high',
        method: 'calibrated'
      };
    }

    // 보간법으로 거리 계산
    return this.interpolateDistance(data.measurements, rssi);
  }

  /**
   * 보간법을 사용한 거리 계산
   */
  private interpolateDistance(
    measurements: RSSICalibrationData['measurements'], 
    rssi: number
  ): CalibratedDistance {
    // RSSI 값으로 정렬
    const sorted = [...measurements].sort((a, b) => a.rssi - b.rssi);
    
    // 범위 밖의 값들 처리
    if (rssi <= sorted[0].rssi) {
      return {
        distance: sorted[0].distance,
        confidence: 'medium',
        method: 'extrapolated'
      };
    }
    
    if (rssi >= sorted[sorted.length - 1].rssi) {
      return {
        distance: sorted[sorted.length - 1].distance,
        confidence: 'medium',
        method: 'extrapolated'
      };
    }

    // 선형 보간
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      
      if (rssi >= current.rssi && rssi <= next.rssi) {
        const ratio = (rssi - current.rssi) / (next.rssi - current.rssi);
        const distance = current.distance + ratio * (next.distance - current.distance);
        
        return {
          distance: Math.round(distance * 100) / 100, // 소수점 2자리
          confidence: 'high',
          method: 'interpolated'
        };
      }
    }

    // 기본값 반환
    return {
      distance: this.calculateDefaultDistance(rssi),
      confidence: 'low',
      method: 'fallback'
    };
  }

  /**
   * 기본 Path Loss Model 거리 계산
   */
  private calculateDefaultDistance(rssi: number): number {
    // 기본 TX Power -59dBm 가정
    const txPower = -59;
    
    if (rssi === 0) return -1.0;
    
    const ratio = rssi * 1.0 / txPower;
    let distance: number;
    
    if (ratio < 1.0) {
      distance = Math.pow(ratio, 10);
    } else {
      distance = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
    }
    
    return Math.max(0.1, Math.min(distance, 100.0));
  }

  /**
   * 보정 데이터 조회
   */
  public getCalibrationData(beaconId: string, gatewayId: string): RSSICalibrationData | null {
    const key = `${beaconId}_${gatewayId}`;
    return this.calibrationData.get(key) || null;
  }

  /**
   * 모든 보정 데이터 조회
   */
  public getAllCalibrationData(): RSSICalibrationData[] {
    return Array.from(this.calibrationData.values());
  }

  /**
   * 보정 데이터 삭제
   */
  public removeCalibrationData(beaconId: string, gatewayId: string): boolean {
    const key = `${beaconId}_${gatewayId}`;
    return this.calibrationData.delete(key);
  }

  /**
   * 데이터베이스에서 보정 데이터 로드
   * @param silent true면 주기 재로드 시 로그 생략
   */
  public async loadCalibrationDataFromDatabase(silent = false): Promise<void> {
    try {
      const { prisma } = await import('@/lib/prisma');
      const calibrationRecords = await prisma.rssiCalibration.findMany();
      
      if (!silent) {
        console.log(`데이터베이스에서 ${calibrationRecords.length}개의 보정 데이터 로드 중...`);
      }
      
      for (const record of calibrationRecords) {
        this.addCalibrationData(
          record.beaconId,
          record.gatewayId,
          record.distance,
          record.rssi
        );
      }
      
      if (!silent) {
        console.log(`보정 데이터 로드 완료: ${this.calibrationData.size}개 조합`);
      }
    } catch (error) {
      console.error('보정 데이터 로드 실패:', error);
    }
  }

  /**
   * 보정 상태 확인
   */
  public getCalibrationStatus(beaconId: string, gatewayId: string): {
    isCalibrated: boolean;
    measurementCount: number;
    distanceRange: { min: number; max: number };
    rssiRange: { min: number; max: number };
    lastUpdated: Date | null;
  } {
    const data = this.getCalibrationData(beaconId, gatewayId);
    
    if (!data) {
      return {
        isCalibrated: false,
        measurementCount: 0,
        distanceRange: { min: 0, max: 0 },
        rssiRange: { min: 0, max: 0 },
        lastUpdated: null
      };
    }

    const distances = data.measurements.map(m => m.distance);
    const rssis = data.measurements.map(m => m.rssi);

    return {
      isCalibrated: true,
      measurementCount: data.measurements.length,
      distanceRange: { min: Math.min(...distances), max: Math.max(...distances) },
      rssiRange: { min: Math.min(...rssis), max: Math.max(...rssis) },
      lastUpdated: data.updatedAt
    };
  }

  /**
   * 권장 측정 거리 목록
   */
  public getRecommendedDistances(): number[] {
    return [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
  }

  /**
   * 보정 품질 평가
   */
  public evaluateCalibrationQuality(beaconId: string, gatewayId: string): {
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
  } {
    const data = this.getCalibrationData(beaconId, gatewayId);
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 0;

    if (!data || data.measurements.length === 0) {
      return {
        score: 0,
        issues: ['보정 데이터가 없습니다'],
        recommendations: ['1m, 2m, 3m, 4m, 5m 거리에서 RSSI 측정을 수행하세요']
      };
    }

    // 측정 개수 평가
    if (data.measurements.length >= 5) {
      score += 30;
    } else if (data.measurements.length >= 3) {
      score += 20;
      issues.push('측정 지점이 부족합니다');
      recommendations.push('더 많은 거리에서 측정하세요');
    } else {
      score += 10;
      issues.push('측정 지점이 매우 부족합니다');
      recommendations.push('최소 5개 거리에서 측정하세요');
    }

    // 거리 범위 평가
    const distances = data.measurements.map(m => m.distance);
    const minDist = Math.min(...distances);
    const maxDist = Math.max(...distances);
    
    if (minDist <= 1.0 && maxDist >= 5.0) {
      score += 30;
    } else if (minDist <= 2.0 && maxDist >= 4.0) {
      score += 20;
      issues.push('거리 범위가 제한적입니다');
      recommendations.push('1m 이하와 5m 이상에서도 측정하세요');
    } else {
      score += 10;
      issues.push('거리 범위가 매우 제한적입니다');
      recommendations.push('1m~5m 전체 범위에서 측정하세요');
    }

    // 샘플 수 평가
    const avgSamples = data.measurements.reduce((sum, m) => sum + m.samples, 0) / data.measurements.length;
    if (avgSamples >= 10) {
      score += 20;
    } else if (avgSamples >= 5) {
      score += 15;
      issues.push('측정 샘플이 부족합니다');
      recommendations.push('각 거리에서 더 많은 측정을 수행하세요');
    } else {
      score += 10;
      issues.push('측정 샘플이 매우 부족합니다');
      recommendations.push('각 거리에서 최소 10회 이상 측정하세요');
    }

    // 최신성 평가
    const daysSinceUpdate = (Date.now() - data.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate <= 7) {
      score += 20;
    } else if (daysSinceUpdate <= 30) {
      score += 15;
      issues.push('보정 데이터가 오래되었습니다');
      recommendations.push('정기적으로 보정을 업데이트하세요');
    } else {
      score += 5;
      issues.push('보정 데이터가 매우 오래되었습니다');
      recommendations.push('보정을 다시 수행하세요');
    }

    return { score, issues, recommendations };
  }
}

// 전역 인스턴스
export const rssiCalibration = new RSSICalibrationManager();
