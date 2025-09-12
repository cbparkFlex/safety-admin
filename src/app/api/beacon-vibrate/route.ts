import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBeaconCommand } from "@/lib/mqttClient";

export async function POST(request: NextRequest) {
  try {
    const { beaconId, equipmentId, ringType, ringTime } = await request.json();

    // beaconId 또는 equipmentId 중 하나는 필요
    const targetBeaconId = beaconId || equipmentId;
    
    if (!targetBeaconId) {
      return NextResponse.json({
        message: "beaconId 또는 equipmentId가 필요합니다",
        error: "MISSING_BEACON_ID"
      }, { status: 400 });
    }

    // 비콘 존재 여부 확인 (MAC 주소 포함)
    const beacon = await prisma.beacon.findUnique({
      where: { beaconId: targetBeaconId },
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
    const beaconWithGateway = await prisma.beacon.findUnique({
      where: { beaconId: targetBeaconId },
      include: {
        gateway: true
      }
    });

    if (!beaconWithGateway?.gateway) {
      return NextResponse.json({
        message: "비콘에 연결된 Gateway를 찾을 수 없습니다",
        error: "NO_GATEWAY_FOR_BEACON"
      }, { status: 404 });
    }

    const gateway = beaconWithGateway.gateway;

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

    console.log(`📳 비콘 진동 명령 전송: ${targetBeaconId}`, ringCommand);

    // MQTT를 통해 Gateway로 비콘 명령 전송
    const commandSent = await sendBeaconCommand(targetBeaconId, ringCommand, gateway.gatewayId);
    
    if (!commandSent) {
      return NextResponse.json({
        success: false,
        message: "비콘 진동 명령 전송에 실패했습니다",
        error: "COMMAND_SEND_FAILED",
        beaconId: targetBeaconId,
        beaconName: beacon.name,
        macAddress: beacon.macAddress,
        gatewayId: gateway.gatewayId
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "비콘 진동 명령이 성공적으로 전송되었습니다",
      beaconId: targetBeaconId,
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
