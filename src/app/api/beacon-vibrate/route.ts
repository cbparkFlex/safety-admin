import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBeaconCommand } from "@/lib/mqttClient";

export async function POST(request: NextRequest) {
  try {
    const { beaconId, ringType, ringTime } = await request.json();

    if (!beaconId) {
      return NextResponse.json({
        message: "beaconId가 필요합니다",
        error: "MISSING_BEACON_ID"
      }, { status: 400 });
    }

    // 비콘 존재 여부 확인 (MAC 주소 포함)
    const beacon = await prisma.beacon.findUnique({
      where: { beaconId: beaconId },
      select: {
        beaconId: true,
        name: true,
        macAddress: true,
        status: true
      }
    });

    if (!beacon) {
      return NextResponse.json({
        message: "비콘을 찾을 수 없습니다",
        error: "BEACON_NOT_FOUND"
      }, { status: 404 });
    }

    if (!beacon.macAddress) {
      return NextResponse.json({
        message: "비콘의 MAC 주소가 설정되지 않았습니다",
        error: "MAC_ADDRESS_NOT_SET"
      }, { status: 400 });
    }

    // 비콘의 Gateway 정보 조회
    const gateway = await prisma.gateway.findFirst({
      where: { status: 'active' }
    });

    if (!gateway) {
      return NextResponse.json({
        message: "활성 Gateway를 찾을 수 없습니다",
        error: "NO_ACTIVE_GATEWAY"
      }, { status: 404 });
    }

    // KBeacon Ring 명령 구성 (문서에 따른 5개 파라미터)
    const ringCommand = {
      msg: "ring",
      mac: beacon.macAddress.replace(/:/g, ''), // KBeacon MAC 주소 (콜론 제거)
      ringType: ringType || 4, // 기본값: 0x4 (vibration)
      ringTime: ringTime || 4000, // 기본값: 1초 (밀리초)
      ledOn: 500,
      ledOff: 1500,
      // ledOn과 ledOff는 vibration에는 필요하지 않음
    };

    console.log(`📳 비콘 진동 명령 전송: ${beaconId}`, ringCommand);

    // MQTT를 통해 Gateway로 비콘 명령 전송
    const commandSent = await sendBeaconCommand(beaconId, ringCommand);
    
    if (!commandSent) {
      return NextResponse.json({
        message: "MQTT 클라이언트가 연결되지 않아 명령을 전송할 수 없습니다",
        error: "MQTT_NOT_CONNECTED"
      }, { status: 503 });
    }

    return NextResponse.json({
      message: "비콘 진동 명령이 Gateway로 전송되었습니다",
      beaconId: beaconId,
      beaconName: beacon.name,
      macAddress: beacon.macAddress,
      command: ringCommand,
      gatewayId: gateway.gatewayId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("비콘 진동 명령 전송 실패:", error);
    return NextResponse.json({
      message: "비콘 진동 명령 전송 실패",
      error: error.message
    }, { status: 500 });
  }
}
