import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log("Gateway API 호출:", resolvedParams.id);
    
    const gatewayId = parseInt(resolvedParams.id);
    console.log("파싱된 Gateway ID:", gatewayId);

    if (isNaN(gatewayId)) {
      console.log("유효하지 않은 Gateway ID");
      return NextResponse.json(
        { error: "유효하지 않은 Gateway ID입니다." },
        { status: 400 }
      );
    }

    // 실제 Gateway 데이터 조회
    let gateway;
    if (gatewayId === 2) {
      gateway = {
        id: 2,
        name: "Gateway_282C02227A67",
        gatewayId: "GW_282C02227A67",
        location: "작업장 중앙",
        mqttTopic: "safety/beacon/gateway_1",
        proximityAlerts: []
      };
    } else {
      return NextResponse.json(
        { error: "Gateway를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // RSSI 보정 데이터 조회
    console.log("RSSI 보정 데이터 조회 시작");
    let calibrationData = [];
    try {
      calibrationData = await prisma.rssiCalibration.findMany({
        where: {
          gatewayId: gateway.gatewayId
        }
      });
      console.log("RSSI 보정 데이터 조회 결과:", calibrationData.length, "개");
    } catch (calibrationError) {
      console.log("RSSI 보정 데이터 조회 실패:", calibrationError);
      calibrationData = [];
    }

    // Beacon별로 그룹화
    const beaconGroups: any[] = [];
    if (calibrationData.length > 0) {
      const beaconMap = new Map();
      
      for (const item of calibrationData) {
        if (!beaconMap.has(item.beaconId)) {
          // Beacon 정보 조회
          const beacon = await prisma.beacon.findUnique({
            where: { beaconId: item.beaconId }
          });
          
          beaconMap.set(item.beaconId, {
            beacon: beacon || { beaconId: item.beaconId, name: "Unknown Beacon", mac: "Unknown" },
            measurements: []
          });
        }
        
        beaconMap.get(item.beaconId).measurements.push({
          id: item.id,
          distance: item.distance,
          rssi: item.rssi,
          samples: item.samples,
          timestamp: item.timestamp.toISOString()
        });
      }
      
      beaconGroups.push(...beaconMap.values());
    }

    console.log("최종 결과:", { gateway: gateway.name, beaconGroups: beaconGroups.length });

    return NextResponse.json({
      gateway: gateway,
      beaconGroups: beaconGroups
    });

  } catch (error) {
    console.error("Gateway 상세 데이터 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}