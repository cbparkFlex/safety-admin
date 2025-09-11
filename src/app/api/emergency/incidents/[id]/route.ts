import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 개별 비상 상황 기록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const incidentId = parseInt(resolvedParams.id);

    const incident = await prisma.emergencyIncident.findUnique({
      where: { id: incidentId },
      include: {
        sop: {
          select: { name: true, type: true }
        },
        executions: {
          include: {
            step: {
              select: { title: true, stepNumber: true }
            }
          },
          orderBy: { stepNumber: 'asc' }
        }
      }
    });

    if (!incident) {
      return NextResponse.json(
        { error: "비상 상황 기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: incident
    });
  } catch (error) {
    console.error("비상 상황 기록 조회 실패:", error);
    return NextResponse.json(
      { error: "비상 상황 기록 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 비상 상황 기록 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const incidentId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { status, completedAt } = body;

    const incident = await prisma.emergencyIncident.update({
      where: { id: incidentId },
      data: {
        status,
        completedAt: completedAt ? new Date(completedAt) : null
      },
      include: {
        sop: {
          select: { name: true, type: true }
        },
        executions: {
          include: {
            step: {
              select: { title: true, stepNumber: true }
            }
          },
          orderBy: { stepNumber: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "비상 상황 기록이 업데이트되었습니다.",
      data: incident
    });
  } catch (error) {
    console.error("비상 상황 기록 수정 실패:", error);
    return NextResponse.json(
      { error: "비상 상황 기록 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}