import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 특정 SOP 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    const sop = await prisma.emergencySOP.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    });

    if (!sop) {
      return NextResponse.json(
        { error: "SOP를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sop
    });
  } catch (error) {
    console.error("SOP 조회 실패:", error);
    return NextResponse.json(
      { error: "SOP 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// SOP 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();
    const { type, name, description, isActive } = body;

    const sop = await prisma.emergencySOP.update({
      where: { id },
      data: {
        type,
        name,
        description,
        isActive
      },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "SOP가 성공적으로 수정되었습니다.",
      data: sop
    });
  } catch (error) {
    console.error("SOP 수정 실패:", error);
    return NextResponse.json(
      { error: "SOP 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// SOP 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    // 관련 단계들도 함께 삭제 (CASCADE)
    await prisma.emergencySOP.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "SOP가 성공적으로 삭제되었습니다."
    });
  } catch (error) {
    console.error("SOP 삭제 실패:", error);
    return NextResponse.json(
      { error: "SOP 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
