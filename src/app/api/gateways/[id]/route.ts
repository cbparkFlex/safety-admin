import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log("Gateway API 호출:", resolvedParams.id);
    
    const id = resolvedParams.id;
    console.log("Gateway ID 또는 GatewayId:", id);

    // ID가 숫자인지 확인 (데이터베이스 ID)
    const numericId = parseInt(id);
    let gateway;

    if (!isNaN(numericId)) {
      // 숫자 ID로 조회 (데이터베이스 ID)
      console.log("데이터베이스 ID로 조회:", numericId);
      gateway = await prisma.gateway.findUnique({
        where: { id: numericId }
      });
    } else {
      // 문자열 ID로 조회 (gatewayId)
      console.log("GatewayId로 조회:", id);
      gateway = await prisma.gateway.findUnique({
        where: { gatewayId: id }
      });
    }

    if (!gateway) {
      console.log("Gateway를 찾을 수 없습니다.");
      return NextResponse.json(
        { error: "Gateway를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    console.log("찾은 Gateway:", gateway);

    // proximityAlerts 초기화 (빈 배열로 설정)
    gateway.proximityAlerts = gateway.proximityAlerts || [];

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

// Gateway 정보 수정 (PUT)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // ID가 숫자인지 확인 (데이터베이스 ID)
    const numericId = parseInt(id);
    let whereClause;

    if (!isNaN(numericId)) {
      // 숫자 ID로 조회 (데이터베이스 ID)
      whereClause = { id: numericId };
    } else {
      // 문자열 ID로 조회 (gatewayId)
      whereClause = { gatewayId: id };
    }

    const body = await request.json();
    const { name, location, ipAddress, mqttTopic } = body;

    console.log("업데이트 요청 데이터:", body);

    // 필수 필드 검증
    if (!name || !location) {
      return NextResponse.json(
        { error: "이름과 위치는 필수 필드입니다." },
        { status: 400 }
      );
    }

    // 업데이트할 데이터 준비
    const updateData: any = {
      name,
      location,
      updatedAt: new Date(),
    };

    // 선택적 필드들 추가 (값이 있으면 업데이트, 빈 문자열은 null로 처리)
    if (ipAddress !== undefined) {
      updateData.ipAddress = ipAddress === "" ? null : ipAddress;
    }
    if (mqttTopic !== undefined) {
      updateData.mqttTopic = mqttTopic === "" ? null : mqttTopic;
    }

    console.log("업데이트할 데이터:", updateData);

    // Gateway 업데이트
    const updatedGateway = await prisma.gateway.update({
      where: whereClause,
      data: updateData,
    });

    console.log("업데이트된 Gateway:", updatedGateway);

    return NextResponse.json({
      success: true,
      message: "Gateway 정보가 성공적으로 수정되었습니다.",
      data: updatedGateway,
    });

  } catch (error) {
    console.error("Gateway 수정 실패:", error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Gateway를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "서버 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}

// Gateway 삭제 (DELETE)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // ID가 숫자인지 확인 (데이터베이스 ID)
    const numericId = parseInt(id);
    let whereClause;

    if (!isNaN(numericId)) {
      // 숫자 ID로 조회 (데이터베이스 ID)
      whereClause = { id: numericId };
    } else {
      // 문자열 ID로 조회 (gatewayId)
      whereClause = { gatewayId: id };
    }

    // Gateway 존재 여부 확인
    const existingGateway = await prisma.gateway.findUnique({
      where: whereClause,
    });

    if (!existingGateway) {
      return NextResponse.json(
        { error: "Gateway를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 관련 데이터 확인 (ProximityAlert, RssiCalibration)
    const [proximityAlerts, rssiCalibrations] = await Promise.all([
      prisma.proximityAlert.count({
        where: { gatewayId: existingGateway.gatewayId }
      }),
      prisma.rssiCalibration.count({
        where: { gatewayId: existingGateway.gatewayId }
      })
    ]);

    if (proximityAlerts > 0 || rssiCalibrations > 0) {
      return NextResponse.json(
        { 
          error: "이 Gateway와 연결된 데이터가 있습니다. 먼저 관련 데이터를 삭제해주세요.",
          details: {
            proximityAlerts,
            rssiCalibrations
          }
        },
        { status: 400 }
      );
    }

    // Gateway 삭제
    await prisma.gateway.delete({
      where: whereClause,
    });

    return NextResponse.json({
      success: true,
      message: "Gateway가 성공적으로 삭제되었습니다.",
    });

  } catch (error) {
    console.error("Gateway 삭제 실패:", error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Gateway를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "서버 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}