import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// SOP 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    const where: any = {};
    if (type) where.type = type;

    const sops = await prisma.emergencySOP.findMany({
      where,
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: sops
    });
  } catch (error) {
    console.error("SOP 조회 실패:", error);
    return NextResponse.json(
      { error: "SOP 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 새 SOP 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name, description, isActive } = body;

    // 필수 필드 검증
    if (!type || !name) {
      return NextResponse.json(
        { error: "유형과 이름은 필수 필드입니다." },
        { status: 400 }
      );
    }

    const sop = await prisma.emergencySOP.create({
      data: {
        type,
        name,
        description,
        isActive: isActive !== false
      },
      include: {
        steps: true
      }
    });

    return NextResponse.json({
      success: true,
      message: "SOP가 성공적으로 생성되었습니다.",
      data: sop
    });
  } catch (error) {
    console.error("SOP 생성 실패:", error);
    return NextResponse.json(
      { error: "SOP 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
