import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 가스 센서 매칭 목록 조회
export async function GET() {
  try {
    const sensorMappings = await prisma.gasSensorMapping.findMany({
      orderBy: [
        { building: 'asc' },
        { sensorId: 'asc' }
      ]
    });
    
    return NextResponse.json({
      success: true,
      data: sensorMappings
    });
  } catch (error) {
    console.error("가스 센서 매칭 목록 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "가스 센서 매칭 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

// 가스 센서 매칭 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sensorId, building, isActive = true } = body;

    // 필수 필드 검증
    if (!sensorId || !building) {
      return NextResponse.json(
        { success: false, error: "센서 ID, 건물은 필수입니다." },
        { status: 400 }
      );
    }

    // 센서 ID 중복 확인
    const existingMapping = await prisma.gasSensorMapping.findUnique({
      where: { sensorId }
    });

    if (existingMapping) {
      return NextResponse.json(
        { success: false, error: "이미 등록된 센서 ID입니다." },
        { status: 400 }
      );
    }

    const sensorMapping = await prisma.gasSensorMapping.create({
      data: {
        sensorId,
        building,
        isActive
      }
    });

    return NextResponse.json({
      success: true,
      data: sensorMapping
    }, { status: 201 });
  } catch (error) {
    console.error("가스 센서 매칭 생성 실패:", error);
    return NextResponse.json(
      { success: false, error: "가스 센서 매칭을 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
