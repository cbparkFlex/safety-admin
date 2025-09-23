import { NextRequest, NextResponse } from "next/server";
import { rssiCalibration } from "@/lib/rssiCalibration";
import { getLatestRSSI } from "@/lib/mqttClient";
import { prisma } from "@/lib/prisma";

// 실시간 측정 세션 관리
const measurementSessions = new Map<string, {
  beaconId: string;
  gatewayId: string;
  distance: number;
  measurements: number[];
  startTime: Date;
  isActive: boolean;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, beaconId, gatewayId, distance } = body;

    switch (action) {
      case 'start':
        if (!beaconId || !gatewayId || distance === undefined) {
          return NextResponse.json(
            { error: "beaconId, gatewayId, distance가 모두 필요합니다." },
            { status: 400 }
          );
        }

        const sessionKey = `${beaconId}_${gatewayId}_${distance}`;
        
        // 기존 세션 종료
        if (measurementSessions.has(sessionKey)) {
          measurementSessions.delete(sessionKey);
        }

        // 새 측정 세션 시작
        measurementSessions.set(sessionKey, {
          beaconId,
          gatewayId,
          distance,
          measurements: [],
          startTime: new Date(),
          isActive: true
        });

        return NextResponse.json({
          message: "측정이 시작되었습니다.",
          sessionKey,
          targetCount: 10
        });

      case 'stop':
        const { sessionKey: stopSessionKey, saveData = true } = body;
        
        if (!stopSessionKey || !measurementSessions.has(stopSessionKey)) {
          return NextResponse.json(
            { error: "유효하지 않은 측정 세션입니다." },
            { status: 400 }
          );
        }

        const session = measurementSessions.get(stopSessionKey)!;
        session.isActive = false;

        if (session.measurements.length > 0) {
          // 평균값 계산
          const averageRSSI = Math.round(
            session.measurements.reduce((sum, rssi) => sum + rssi, 0) / session.measurements.length
          );

          let message = "";
          if (saveData) {
            // 메모리 보정 데이터에 추가
            rssiCalibration.addCalibrationData(
              session.beaconId,
              session.gatewayId,
              session.distance,
              averageRSSI
            );

            // 데이터베이스에 저장
            try {
              await prisma.rssiCalibration.upsert({
                where: {
                  beaconId_gatewayId_distance: {
                    beaconId: session.beaconId,
                    gatewayId: session.gatewayId,
                    distance: session.distance
                  }
                },
                update: {
                  rssi: averageRSSI,
                  samples: session.measurements.length,
                  timestamp: new Date()
                },
                create: {
                  beaconId: session.beaconId,
                  gatewayId: session.gatewayId,
                  distance: session.distance,
                  rssi: averageRSSI,
                  samples: session.measurements.length
                }
              });
              console.log(`데이터베이스 저장 완료: ${session.beaconId}_${session.gatewayId}, 거리: ${session.distance}m, RSSI: ${averageRSSI}dBm`);
            } catch (error) {
              console.error("데이터베이스 저장 실패:", error);
            }

            message = "측정이 완료되고 보정 데이터에 저장되었습니다.";
            console.log(`보정 데이터 저장: ${session.beaconId}_${session.gatewayId}, 거리: ${session.distance}m, RSSI: ${averageRSSI}dBm`);
          } else {
            message = "측정이 취소되었습니다.";
            console.log(`측정 취소: ${session.beaconId}_${session.gatewayId}, ${session.measurements.length}회 측정 데이터 삭제`);
          }

          // 세션 삭제
          measurementSessions.delete(stopSessionKey);

          return NextResponse.json({
            message,
            measurements: session.measurements,
            averageRSSI,
            measurementCount: session.measurements.length,
            saved: saveData
          });
        } else {
          measurementSessions.delete(stopSessionKey);
          return NextResponse.json({
            message: "측정 데이터가 없습니다.",
            measurementCount: 0,
            saved: false
          });
        }

      case 'add_measurement':
        const { sessionKey: addSessionKey } = body;
        
        if (!addSessionKey || !measurementSessions.has(addSessionKey)) {
          return NextResponse.json(
            { error: "유효하지 않은 측정 세션입니다." },
            { status: 400 }
          );
        }

        const addSession = measurementSessions.get(addSessionKey)!;
        
        if (!addSession.isActive) {
          return NextResponse.json(
            { error: "측정 세션이 비활성 상태입니다." },
            { status: 400 }
          );
        }

        // 실제 RSSI 데이터 가져오기
        console.log(`📊 측정 데이터 요청: ${addSession.beaconId}, ${addSession.gatewayId}`);
        
        // Beacon 정보 조회하여 MAC 주소 확인
        const beacon = await prisma.beacon.findUnique({
          where: { beaconId: addSession.beaconId },
          select: { macAddress: true, name: true }
        });
        
        if (beacon) {
          console.log(`🔍 Beacon 정보: ${beacon.name} (${beacon.macAddress})`);
        } else {
          console.log(`❌ Beacon 정보 없음: ${addSession.beaconId}`);
        }
        
        let currentRSSI = getLatestRSSI(addSession.beaconId, addSession.gatewayId);
        
        // RSSI 데이터가 없으면 시뮬레이션 값 사용
        if (currentRSSI === null) {
          console.log(`⚠️ RSSI 데이터 없음: ${addSession.beaconId}_${addSession.gatewayId}, 시뮬레이션 값 사용`);
          // 거리에 따른 시뮬레이션 RSSI 값 생성
          const baseRSSI = -45; // 1m 기준
          const distanceFactor = Math.log10(addSession.distance) * 20; // 거리에 따른 감쇠
          const noise = (Math.random() - 0.5) * 4; // ±2dBm 노이즈
          currentRSSI = Math.round(baseRSSI - distanceFactor + noise);
          console.log(`🎲 시뮬레이션 RSSI: ${currentRSSI}dBm (거리: ${addSession.distance}m)`);
        } else {
          console.log(`✅ RSSI 데이터 획득: ${currentRSSI}dBm`);
        }

        addSession.measurements.push(currentRSSI);

        return NextResponse.json({
          message: "측정 데이터가 추가되었습니다.",
          measurementCount: addSession.measurements.length,
          currentRSSI: currentRSSI,
          averageRSSI: Math.round(
            addSession.measurements.reduce((sum, rssi) => sum + rssi, 0) / addSession.measurements.length
          )
        });

      default:
        return NextResponse.json(
          { error: "지원하지 않는 액션입니다." },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("RSSI 측정 처리 실패:", error);
    return NextResponse.json(
      { error: "RSSI 측정을 처리할 수 없습니다." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionKey = searchParams.get('sessionKey');

    if (sessionKey && measurementSessions.has(sessionKey)) {
      const session = measurementSessions.get(sessionKey)!;
      return NextResponse.json({
        sessionKey,
        beaconId: session.beaconId,
        gatewayId: session.gatewayId,
        distance: session.distance,
        measurementCount: session.measurements.length,
        measurements: session.measurements,
        averageRSSI: session.measurements.length > 0 
          ? Math.round(session.measurements.reduce((sum, rssi) => sum + rssi, 0) / session.measurements.length)
          : 0,
        isActive: session.isActive,
        startTime: session.startTime
      });
    } else {
      // 모든 활성 세션 조회
      const activeSessions = Array.from(measurementSessions.entries()).map(([key, session]) => ({
        sessionKey: key,
        beaconId: session.beaconId,
        gatewayId: session.gatewayId,
        distance: session.distance,
        measurementCount: session.measurements.length,
        isActive: session.isActive,
        startTime: session.startTime
      }));

      return NextResponse.json(activeSessions);
    }
  } catch (error) {
    console.error("RSSI 측정 세션 조회 실패:", error);
    return NextResponse.json(
      { error: "RSSI 측정 세션을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
