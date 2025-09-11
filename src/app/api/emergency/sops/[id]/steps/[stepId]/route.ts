import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 특정 SOP 단계 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const resolvedParams = await params;
    const sopId = parseInt(resolvedParams.id);
    const stepId = parseInt(resolvedParams.stepId);

    const step = await prisma.emergencySOPStep.findFirst({
      where: {
        id: stepId,
        sopId: sopId
      }
    });

    if (!step) {
      return NextResponse.json(
        { error: "SOP 단계를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: step
    });
  } catch (error) {
    console.error("SOP 단계 조회 실패:", error);
    return NextResponse.json(
      { error: "SOP 단계 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// SOP 단계 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const resolvedParams = await params;
    const sopId = parseInt(resolvedParams.id);
    const stepId = parseInt(resolvedParams.stepId);
    const body = await request.json();
    const { stepNumber, title, description, action, isRequired } = body;

    // 필수 필드 검증
    if (!stepNumber || !title || !description) {
      return NextResponse.json(
        { error: "단계 번호, 제목, 설명은 필수 필드입니다." },
        { status: 400 }
      );
    }

    // SOP 단계 존재 확인
    const existingStep = await prisma.emergencySOPStep.findFirst({
      where: {
        id: stepId,
        sopId: sopId
      }
    });

    if (!existingStep) {
      return NextResponse.json(
        { error: "SOP 단계를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const step = await prisma.emergencySOPStep.update({
      where: { id: stepId },
      data: {
        stepNumber,
        title,
        description,
        action,
        isRequired: isRequired !== false
      }
    });

    return NextResponse.json({
      success: true,
      message: "SOP 단계가 성공적으로 수정되었습니다.",
      data: step
    });
  } catch (error) {
    console.error("SOP 단계 수정 실패:", error);
    return NextResponse.json(
      { error: "SOP 단계 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// SOP 단계 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const resolvedParams = await params;
    const sopId = parseInt(resolvedParams.id);
    const stepId = parseInt(resolvedParams.stepId);

    // SOP 단계 존재 확인
    const existingStep = await prisma.emergencySOPStep.findFirst({
      where: {
        id: stepId,
        sopId: sopId
      }
    });

    if (!existingStep) {
      return NextResponse.json(
        { error: "SOP 단계를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 관련 실행 기록들도 함께 삭제 (CASCADE)
    await prisma.emergencySOPStep.delete({
      where: { id: stepId }
    });

    return NextResponse.json({
      success: true,
      message: "SOP 단계가 성공적으로 삭제되었습니다."
    });
  } catch (error) {
    console.error("SOP 단계 삭제 실패:", error);
    return NextResponse.json(
      { error: "SOP 단계 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
