import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 자동 진동 알림 처리
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { beaconId, gatewayId, distance, rssi } = body;

    // 필수 필드 검증
    if (!beaconId || !gatewayId || distance === undefined) {
      return NextResponse.json(
        { success: false, error: "필수 필드가 누락되었습니다. (beaconId, gatewayId, distance)" },
        { status: 400 }
      );
    }

    // Gateway 설정 조회
    const gateway = await prisma.gateway.findUnique({
      where: { gatewayId },
      select: {
        proximityThreshold: true,
        autoVibration: true,
        name: true
      }
    });

    if (!gateway) {
      return NextResponse.json(
        { success: false, error: "Gateway를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 자동 진동이 비활성화된 경우
    if (!gateway.autoVibration) {
      return NextResponse.json({
        success: true,
        message: "자동 진동이 비활성화되어 있습니다.",
        vibrationSent: false
      });
    }

    // 근접 경고 거리 확인
    if (distance > gateway.proximityThreshold) {
      return NextResponse.json({
        success: true,
        message: "근접 경고 거리보다 멀어서 진동을 보내지 않습니다.",
        vibrationSent: false,
        threshold: gateway.proximityThreshold,
        currentDistance: distance
      });
    }

    // 비콘 정보 조회
    const beacon = await prisma.beacon.findUnique({
      where: { beaconId },
      select: {
        name: true,
        macAddress: true
      }
    });

    if (!beacon) {
      return NextResponse.json(
        { success: false, error: "비콘을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 진동 명령 전송 (테스트용 - 로그만 기록)
    console.log(`자동 진동 알림: ${beacon.name} (${gateway.name}, ${distance.toFixed(2)}m)`);

    // 근접 알림 기록 생성
    await prisma.proximityAlert.create({
      data: {
        beaconId,
        gatewayId,
        distance,
        rssi: rssi || null,
        alertType: 'auto_vibration',
        message: `자동 진동 알림 - ${beacon.name}이 ${gateway.name}에서 ${distance.toFixed(2)}m 거리에 접근`,
        isAlert: true,
        alertTime: new Date()
      }
    });

    // 모니터링 로그 기록
    await prisma.monitoringLog.create({
      data: {
        type: 'auto_vibration',
        sourceId: beaconId,
        message: `자동 진동 알림 전송: ${beacon.name} (${gateway.name}, ${distance.toFixed(2)}m)`,
        severity: 'info'
      }
    });

    return NextResponse.json({
      success: true,
      message: "자동 진동 알림이 전송되었습니다.",
      vibrationSent: true,
      beaconName: beacon.name,
      gatewayName: gateway.name,
      distance: distance,
      threshold: gateway.proximityThreshold
    });

  } catch (error) {
    console.error("자동 진동 알림 처리 실패:", error);
    return NextResponse.json(
      { success: false, error: "자동 진동 알림을 처리할 수 없습니다." },
      { status: 500 }
    );
  }
}