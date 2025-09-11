import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// SOP 단계 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const sopId = parseInt(resolvedParams.id);

    const steps = await prisma.emergencySOPStep.findMany({
      where: { sopId },
      orderBy: { stepNumber: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: steps
    });
  } catch (error) {
    console.error("SOP 단계 조회 실패:", error);
    return NextResponse.json(
      { error: "SOP 단계 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 새 SOP 단계 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const sopId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { stepNumber, title, description, action, isRequired } = body;

    // 필수 필드 검증
    if (!stepNumber || !title || !description) {
      return NextResponse.json(
        { error: "단계 번호, 제목, 설명은 필수 필드입니다." },
        { status: 400 }
      );
    }

    // SOP 존재 확인
    const sop = await prisma.emergencySOP.findUnique({
      where: { id: sopId }
    });

    if (!sop) {
      return NextResponse.json(
        { error: "SOP를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const step = await prisma.emergencySOPStep.create({
      data: {
        sopId,
        stepNumber,
        title,
        description,
        action,
        isRequired: isRequired !== false
      }
    });

    return NextResponse.json({
      success: true,
      message: "SOP 단계가 성공적으로 생성되었습니다.",
      data: step
    });
  } catch (error) {
    console.error("SOP 단계 생성 실패:", error);
    return NextResponse.json(
      { error: "SOP 단계 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
