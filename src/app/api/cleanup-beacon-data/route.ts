import { NextRequest, NextResponse } from "next/server";
import { cleanupUnregisteredBeaconData } from "@/lib/mqttClient";

export async function POST(request: NextRequest) {
  try {
    console.log("등록되지 않은 Beacon 데이터 정리 요청 수신");
    const deletedCount = await cleanupUnregisteredBeaconData();
    
    return NextResponse.json({
      message: "등록되지 않은 Beacon 데이터 정리가 완료되었습니다.",
      deletedCount: deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Beacon 데이터 정리 실패:", error);
    return NextResponse.json(
      { error: "Beacon 데이터 정리에 실패했습니다.", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const deletedCount = await cleanupUnregisteredBeaconData();
    
    return NextResponse.json({
      message: "등록되지 않은 Beacon 데이터 정리가 완료되었습니다.",
      deletedCount: deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Beacon 데이터 정리 실패:", error);
    return NextResponse.json(
      { error: "Beacon 데이터 정리에 실패했습니다.", details: error.message },
      { status: 500 }
    );
  }
}
