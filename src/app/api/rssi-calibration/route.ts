import { NextRequest, NextResponse } from "next/server";
import { rssiCalibration } from "@/lib/rssiCalibration";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const beaconId = searchParams.get('beaconId');
    const gatewayId = searchParams.get('gatewayId');

    if (beaconId && gatewayId) {
      // 특정 Beacon-Gateway 조합의 보정 데이터 조회
      const data = rssiCalibration.getCalibrationData(beaconId, gatewayId);
      const status = rssiCalibration.getCalibrationStatus(beaconId, gatewayId);
      const quality = rssiCalibration.evaluateCalibrationQuality(beaconId, gatewayId);
      
      return NextResponse.json({
        data,
        status,
        quality
      });
    } else {
      // 모든 보정 데이터 조회
      const allData = rssiCalibration.getAllCalibrationData();
      return NextResponse.json(allData);
    }
  } catch (error) {
    console.error("RSSI 보정 데이터 조회 실패:", error);
    return NextResponse.json(
      { error: "RSSI 보정 데이터를 조회할 수 없습니다." },
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

    // 보정 데이터 추가
    rssiCalibration.addCalibrationData(beaconId, gatewayId, distance, rssi);
    
    // 업데이트된 상태 반환
    const status = rssiCalibration.getCalibrationStatus(beaconId, gatewayId);
    const quality = rssiCalibration.evaluateCalibrationQuality(beaconId, gatewayId);
    
    return NextResponse.json({
      message: "RSSI 보정 데이터가 추가되었습니다.",
      status,
      quality
    });
  } catch (error) {
    console.error("RSSI 보정 데이터 추가 실패:", error);
    return NextResponse.json(
      { error: "RSSI 보정 데이터를 추가할 수 없습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const beaconId = searchParams.get('beaconId');
    const gatewayId = searchParams.get('gatewayId');

    if (!beaconId || !gatewayId) {
      return NextResponse.json(
        { error: "beaconId와 gatewayId가 필요합니다." },
        { status: 400 }
      );
    }

    const success = rssiCalibration.removeCalibrationData(beaconId, gatewayId);
    
    if (success) {
      return NextResponse.json({
        message: "RSSI 보정 데이터가 삭제되었습니다."
      });
    } else {
      return NextResponse.json(
        { error: "보정 데이터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("RSSI 보정 데이터 삭제 실패:", error);
    return NextResponse.json(
      { error: "RSSI 보정 데이터를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
