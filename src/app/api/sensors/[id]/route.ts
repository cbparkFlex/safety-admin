import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 특정 센서 매칭 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    const sensorMapping = await prisma.gasSensorMapping.findUnique({
      where: { id }
    });

    if (!sensorMapping) {
      return NextResponse.json(
        { success: false, error: "센서 매칭을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sensorMapping
    });
  } catch (error) {
    console.error("센서 매칭 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "센서 매칭을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

// 센서 매칭 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();
    const { sensorId, building, isActive } = body;

    // 센서 매칭 존재 확인
    const existingMapping = await prisma.gasSensorMapping.findUnique({
      where: { id }
    });

    if (!existingMapping) {
      return NextResponse.json(
        { success: false, error: "센서 매칭을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 센서 ID 중복 확인 (자기 자신 제외)
    if (sensorId && sensorId !== existingMapping.sensorId) {
      const duplicateMapping = await prisma.gasSensorMapping.findUnique({
        where: { sensorId }
      });

      if (duplicateMapping) {
        return NextResponse.json(
          { success: false, error: "이미 등록된 센서 ID입니다." },
          { status: 400 }
        );
      }
    }

    const sensorMapping = await prisma.gasSensorMapping.update({
      where: { id },
      data: {
        sensorId: sensorId || existingMapping.sensorId,
        building: building || existingMapping.building,
        isActive: isActive !== undefined ? isActive : existingMapping.isActive
      }
    });

    return NextResponse.json({
      success: true,
      data: sensorMapping
    });
  } catch (error) {
    console.error("센서 매칭 수정 실패:", error);
    return NextResponse.json(
      { success: false, error: "센서 매칭을 수정할 수 없습니다." },
      { status: 500 }
    );
  }
}

// 센서 매칭 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    // 센서 매칭 존재 확인
    const existingMapping = await prisma.gasSensorMapping.findUnique({
      where: { id }
    });

    if (!existingMapping) {
      return NextResponse.json(
        { success: false, error: "센서 매칭을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.gasSensorMapping.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "센서 매칭이 삭제되었습니다."
    });
  } catch (error) {
    console.error("센서 매칭 삭제 실패:", error);
    return NextResponse.json(
      { success: false, error: "센서 매칭을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}
