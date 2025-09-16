import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Beacon과 Gateway 초기 데이터 시드 API
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Beacon과 Gateway 초기 데이터 시드 API 시작...');

    // Beacon 초기 데이터
    const beaconData = {
      beaconId: 'KBPro_444721',
      name: 'KBPro_444721',
      macAddress: 'BC5729055F5A',
      uuid: '7777772E-6B6B-6D63-6E2E-636F6D0000001',
      major: 6,
      minor: 51531,
      txPower: -59, // 기본 TX Power 값
      location: 'A동',
      status: 'active'
    };

    // Gateway 초기 데이터
    const gatewayData = {
      gatewayId: 'GW_282C02227A67',
      name: 'GW_282C02227A67',
      location: 'A',
      ipAddress: '192.168.1.100',
      mqttTopic: 'safety/beacon/gateway_1',
      status: 'active',
      proximityThreshold: 5.0,
      autoVibration: false
    };

    // 기존 데이터 확인 및 생성
    let beacon = await prisma.beacon.findUnique({
      where: { beaconId: beaconData.beaconId }
    });

    if (!beacon) {
      console.log('📡 Beacon 데이터 생성 중...');
      beacon = await prisma.beacon.create({
        data: beaconData
      });
      console.log(`✅ Beacon 생성 완료: ${beacon.name} (${beacon.beaconId})`);
    } else {
      console.log(`ℹ️ Beacon 이미 존재: ${beacon.name} (${beacon.beaconId})`);
    }

    let gateway = await prisma.gateway.findUnique({
      where: { gatewayId: gatewayData.gatewayId }
    });

    if (!gateway) {
      console.log('🌐 Gateway 데이터 생성 중...');
      gateway = await prisma.gateway.create({
        data: gatewayData
      });
      console.log(`✅ Gateway 생성 완료: ${gateway.name} (${gateway.gatewayId})`);
    } else {
      console.log(`ℹ️ Gateway 이미 존재: ${gateway.name} (${gateway.gatewayId})`);
    }

    // Beacon과 Gateway 연결 (Beacon의 gatewayId 업데이트)
    if (beacon.gatewayId !== gateway.gatewayId) {
      console.log('🔗 Beacon과 Gateway 연결 중...');
      beacon = await prisma.beacon.update({
        where: { beaconId: beacon.beaconId },
        data: { gatewayId: gateway.gatewayId }
      });
      console.log(`✅ Beacon과 Gateway 연결 완료: ${beacon.name} ↔ ${gateway.name}`);
    } else {
      console.log(`ℹ️ Beacon과 Gateway 이미 연결됨: ${beacon.name} ↔ ${gateway.name}`);
    }

    console.log('🎉 Beacon과 Gateway 초기 데이터 시드 완료!');

    return NextResponse.json({
      success: true,
      message: "Beacon과 Gateway 초기 데이터가 성공적으로 설정되었습니다.",
      data: {
        beacon: {
          id: beacon.id,
          beaconId: beacon.beaconId,
          name: beacon.name,
          macAddress: beacon.macAddress,
          uuid: beacon.uuid,
          major: beacon.major,
          minor: beacon.minor,
          txPower: beacon.txPower,
          location: beacon.location,
          gatewayId: beacon.gatewayId
        },
        gateway: {
          id: gateway.id,
          gatewayId: gateway.gatewayId,
          name: gateway.name,
          location: gateway.location,
          ipAddress: gateway.ipAddress,
          mqttTopic: gateway.mqttTopic,
          proximityThreshold: gateway.proximityThreshold,
          autoVibration: gateway.autoVibration
        }
      }
    });

  } catch (error) {
    console.error('❌ Beacon과 Gateway 시드 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Beacon과 Gateway 초기 데이터 설정에 실패했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}

// 현재 Beacon과 Gateway 데이터 조회
export async function GET() {
  try {
    const beacons = await prisma.beacon.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const gateways = await prisma.gateway.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        beacons,
        gateways
      }
    });

  } catch (error) {
    console.error('Beacon과 Gateway 데이터 조회 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Beacon과 Gateway 데이터를 조회할 수 없습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}
