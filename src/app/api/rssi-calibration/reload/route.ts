import { NextRequest, NextResponse } from "next/server";
import { rssiCalibration } from "@/lib/rssiCalibration";

export async function POST(request: NextRequest) {
  try {
    console.log("RSSI 보정 데이터 재로드 요청 받음");
    
    // 기존 보정 데이터 초기화
    const allData = rssiCalibration.getAllCalibrationData();
    console.log(`기존 보정 데이터 ${allData.length}개 조합 초기화`);
    
    // 데이터베이스에서 보정 데이터 다시 로드
    await rssiCalibration.loadCalibrationDataFromDatabase();
    
    // 로드된 데이터 확인
    const loadedData = rssiCalibration.getAllCalibrationData();
    const loadedCombinations = loadedData.length;
    
    console.log(`보정 데이터 재로드 완료: ${loadedCombinations}개 조합`);
    
    // 각 조합의 상세 정보 로그
    for (const data of loadedData) {
      console.log(`- ${data.beaconId}_${data.gatewayId}: ${data.measurements.length}개 측정값`);
      data.measurements.forEach(measurement => {
        console.log(`  * ${measurement.distance}m = ${measurement.rssi}dBm (${measurement.samples}회 측정)`);
      });
    }
    
    return NextResponse.json({
      message: "RSSI 보정 데이터가 성공적으로 재로드되었습니다.",
      loadedCombinations,
      details: loadedData.map(data => ({
        beaconId: data.beaconId,
        gatewayId: data.gatewayId,
        measurementCount: data.measurements.length,
        measurements: data.measurements.map(m => ({
          distance: m.distance,
          rssi: m.rssi,
          samples: m.samples
        }))
      }))
    });
    
  } catch (error) {
    console.error("RSSI 보정 데이터 재로드 실패:", error);
    return NextResponse.json(
      { 
        error: "RSSI 보정 데이터를 재로드할 수 없습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const allData = rssiCalibration.getAllCalibrationData();
    
    return NextResponse.json({
      message: "현재 메모리에 로드된 RSSI 보정 데이터",
      loadedCombinations: allData.length,
      details: allData.map(data => ({
        beaconId: data.beaconId,
        gatewayId: data.gatewayId,
        measurementCount: data.measurements.length,
        measurements: data.measurements.map(m => ({
          distance: m.distance,
          rssi: m.rssi,
          samples: m.samples,
          timestamp: m.timestamp
        })),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }))
    });
    
  } catch (error) {
    console.error("RSSI 보정 데이터 조회 실패:", error);
    return NextResponse.json(
      { 
        error: "RSSI 보정 데이터를 조회할 수 없습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}
