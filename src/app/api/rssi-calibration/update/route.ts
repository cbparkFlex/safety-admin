import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rssiCalibration } from "@/lib/rssiCalibration";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { beaconId, gatewayId, distance, newRssi } = body;

    if (!beaconId || !gatewayId || distance === undefined || newRssi === undefined) {
      return NextResponse.json(
        { error: "beaconId, gatewayId, distance, newRssi가 모두 필요합니다." },
        { status: 400 }
      );
    }

    console.log(`RSSI 보정 데이터 수정 요청: ${beaconId}_${gatewayId}, 거리: ${distance}m, 새 RSSI: ${newRssi}dBm`);

    // 데이터베이스에서 해당 보정 데이터 업데이트
    const updatedRecord = await prisma.rssiCalibration.update({
      where: {
        beaconId_gatewayId_distance: {
          beaconId,
          gatewayId,
          distance
        }
      },
      data: {
        rssi: newRssi,
        timestamp: new Date()
      }
    });

    // 메모리의 보정 데이터도 업데이트
    rssiCalibration.addCalibrationData(beaconId, gatewayId, distance, newRssi);

    console.log(`RSSI 보정 데이터 수정 완료: ID ${updatedRecord.id}`);

    return NextResponse.json({
      message: "RSSI 보정 데이터가 성공적으로 수정되었습니다.",
      data: {
        id: updatedRecord.id,
        beaconId: updatedRecord.beaconId,
        gatewayId: updatedRecord.gatewayId,
        distance: updatedRecord.distance,
        rssi: updatedRecord.rssi,
        samples: updatedRecord.samples,
        timestamp: updatedRecord.timestamp
      }
    });

  } catch (error) {
    console.error("RSSI 보정 데이터 수정 실패:", error);
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: "해당 거리의 보정 데이터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: "RSSI 보정 데이터를 수정할 수 없습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { beaconId, gatewayId, distance, rssi } = body;

    if (!beaconId || !gatewayId || distance === undefined || rssi === undefined) {
      return NextResponse.json(
        { error: "beaconId, gatewayId, distance, rssi가 모두 필요합니다." },
        { status: 400 }
      );
    }

    console.log(`RSSI 보정 데이터 추가 요청: ${beaconId}_${gatewayId}, 거리: ${distance}m, RSSI: ${rssi}dBm`);

    // 데이터베이스에 새로운 보정 데이터 추가
    const newRecord = await prisma.rssiCalibration.create({
      data: {
        beaconId,
        gatewayId,
        distance,
        rssi,
        samples: 1
      }
    });

    // 메모리의 보정 데이터도 추가
    rssiCalibration.addCalibrationData(beaconId, gatewayId, distance, rssi);

    console.log(`RSSI 보정 데이터 추가 완료: ID ${newRecord.id}`);

    return NextResponse.json({
      message: "RSSI 보정 데이터가 성공적으로 추가되었습니다.",
      data: {
        id: newRecord.id,
        beaconId: newRecord.beaconId,
        gatewayId: newRecord.gatewayId,
        distance: newRecord.distance,
        rssi: newRecord.rssi,
        samples: newRecord.samples,
        timestamp: newRecord.timestamp
      }
    });

  } catch (error) {
    console.error("RSSI 보정 데이터 추가 실패:", error);
    
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: "해당 거리의 보정 데이터가 이미 존재합니다. 수정하려면 PUT 메서드를 사용하세요." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        error: "RSSI 보정 데이터를 추가할 수 없습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}
