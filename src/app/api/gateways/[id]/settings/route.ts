import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Gateway 설정 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gateway = await prisma.gateway.findUnique({
      where: { gatewayId: id },
      select: {
        gatewayId: true,
        name: true,
        proximityThreshold: true,
        autoVibration: true
      }
    });

    if (!gateway) {
      return NextResponse.json(
        { success: false, error: "Gateway를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, gateway });
  } catch (error) {
    console.error("Gateway 설정 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "Gateway 설정을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

// Gateway 설정 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { proximityThreshold, autoVibration } = body;

    // 유효성 검증
    if (proximityThreshold !== undefined && (proximityThreshold < 0.1 || proximityThreshold > 100)) {
      return NextResponse.json(
        { success: false, error: "근접 경고 거리는 0.1m ~ 100m 사이여야 합니다." },
        { status: 400 }
      );
    }

    const gateway = await prisma.gateway.update({
      where: { gatewayId: id },
      data: {
        ...(proximityThreshold !== undefined && { proximityThreshold }),
        ...(autoVibration !== undefined && { autoVibration })
      },
      select: {
        gatewayId: true,
        name: true,
        proximityThreshold: true,
        autoVibration: true
      }
    });

    return NextResponse.json({ success: true, gateway });
  } catch (error) {
    console.error("Gateway 설정 업데이트 실패:", error);
    return NextResponse.json(
      { success: false, error: "Gateway 설정을 업데이트할 수 없습니다." },
      { status: 500 }
    );
  }
}
