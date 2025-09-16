import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestRSSI, latestRSSIData } from "@/lib/mqttClient";
import { rssiCalibration } from "@/lib/rssiCalibration";

interface BeaconStatus {
  beaconId: string;
  beaconName: string;
  beaconLocation?: string;
  currentRSSI: number | null;
  currentDistance: number | null;
  lastUpdate: Date | null;
  isAlert: boolean;
  dangerLevel: 'safe' | 'warning' | 'danger';
  calibrationInfo?: {
    method: string;
    confidence: string;
    isCalibrated: boolean;
  };
}

interface GatewayBeaconStatus {
  gatewayId: string;
  gatewayName: string;
  gatewayLocation: string;
  beacons: BeaconStatus[];
  lastUpdate: Date;
}

export async function GET(request: NextRequest) {
  try {
    console.log("📊 Gateway별 Beacon 상태 조회 시작");
    
    // 모든 활성 Gateway 조회
    const gateways = await prisma.gateway.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' }
    });

    const gatewayStatuses: GatewayBeaconStatus[] = [];

    for (const gateway of gateways) {
      // Gateway 처리 (로그 간소화)
      
      // 해당 Gateway와 관련된 모든 활성 Beacon 조회
      const beacons = await prisma.beacon.findMany({
        where: { status: 'active' },
        orderBy: { name: 'asc' }
      });

      const beaconStatuses: BeaconStatus[] = [];

      for (const beacon of beacons) {
        // 최신 RSSI 데이터 조회
        // RSSI 조회 (로그 간소화)
        
        const latestRSSI = getLatestRSSI(beacon.beaconId, gateway.gatewayId);
        
        let currentDistance: number | null = null;
        let calibrationInfo: any = undefined;
        
        if (latestRSSI !== null) {
          // 보정된 거리 계산
          const calibratedResult = rssiCalibration.getCalibratedDistance(
            beacon.beaconId, 
            gateway.gatewayId, 
            latestRSSI
          );
          
          currentDistance = calibratedResult.distance;
          calibrationInfo = {
            method: calibratedResult.method,
            confidence: calibratedResult.confidence,
            isCalibrated: calibratedResult.method !== 'fallback'
          };
        }

        // Gateway별 근접 경고 거리 가져오기
        const proximityThreshold = gateway.proximityThreshold || 5.0;
        
        // 위험도 판단
        const dangerLevel = getDangerLevel(currentDistance || 999);
        const isAlert = shouldAlert(currentDistance || 999, proximityThreshold);

        // 자동 진동 알림 처리
        if (currentDistance !== null && isAlert && gateway.autoVibration) {
          try {
            // 자동 진동 알림 API 호출 (비동기로 처리하여 메인 로직에 영향 없도록)
            fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auto-vibration`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                beaconId: beacon.beaconId,
                gatewayId: gateway.gatewayId,
                distance: currentDistance,
                rssi: latestRSSI
              }),
            }).catch(error => {
              console.error(`자동 진동 알림 처리 실패 (${beacon.beaconId}):`, error);
            });
          } catch (error) {
            console.error(`자동 진동 알림 처리 실패 (${beacon.beaconId}):`, error);
          }
        }

        beaconStatuses.push({
          beaconId: beacon.beaconId,
          beaconName: beacon.name,
          beaconLocation: beacon.location || undefined,
          currentRSSI: latestRSSI,
          currentDistance: currentDistance,
          lastUpdate: latestRSSI !== null ? new Date() : null,
          isAlert,
          dangerLevel,
          calibrationInfo
        });
      }

      gatewayStatuses.push({
        gatewayId: gateway.gatewayId,
        gatewayName: gateway.name,
        gatewayLocation: gateway.location,
        beacons: beaconStatuses,
        lastUpdate: new Date()
      });
    }

    console.log(`✅ Gateway별 Beacon 상태 조회 완료: ${gatewayStatuses.length}개 Gateway`);

    return NextResponse.json({
      message: "Gateway별 Beacon 상태 조회 완료",
      data: gatewayStatuses,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Gateway별 Beacon 상태 조회 실패:", error);
    return NextResponse.json(
      { 
        error: "Gateway별 Beacon 상태를 조회할 수 없습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}

/**
 * 위험도 판단
 */
function getDangerLevel(distance: number): 'safe' | 'warning' | 'danger' {
  if (distance > 5) return 'safe';
  if (distance > 0.5) return 'warning';
  return 'danger';
}

/**
 * 알림 여부 판단
 */
function shouldAlert(distance: number, threshold: number): boolean {
  return distance <= threshold;
}
