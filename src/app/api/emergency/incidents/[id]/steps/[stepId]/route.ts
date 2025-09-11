import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 단계 실행 상태 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const resolvedParams = await params;
    const incidentId = parseInt(resolvedParams.id);
    const stepExecutionId = parseInt(resolvedParams.stepId);
    const body = await request.json();
    const { status, notes } = body;

    // 단계 실행 기록 업데이트
    const stepExecution = await prisma.emergencyStepExecution.update({
      where: { id: stepExecutionId },
      data: {
        status,
        notes,
        executedAt: status === 'completed' || status === 'skipped' ? new Date() : null
      },
      include: {
        step: {
          select: { title: true, stepNumber: true }
        }
      }
    });

    // 비상 상황의 전체 진행 상태 확인
    const incident = await prisma.emergencyIncident.findUnique({
      where: { id: incidentId },
      include: {
        executions: true
      }
    });

    if (incident) {
      const allStepsCompleted = incident.executions.every(exec => 
        exec.status === 'completed' || exec.status === 'skipped'
      );

      // 모든 단계가 완료되면 비상 상황 상태를 'in_progress'로 변경
      if (allStepsCompleted && incident.status === 'active') {
        await prisma.emergencyIncident.update({
          where: { id: incidentId },
          data: { status: 'in_progress' }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "단계 실행 상태가 업데이트되었습니다.",
      data: stepExecution
    });
  } catch (error) {
    console.error("단계 실행 상태 수정 실패:", error);
    return NextResponse.json(
      { error: "단계 실행 상태 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}
